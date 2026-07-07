import { memo, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Reminder } from '../types/reminder';
import { formatReminderBubbleDateTime } from '../utils/reminderDateFormat';
import { getReminderDueColor } from '../utils/reminderDueColor';
import { homeVisualTokens } from '../../../constants/colors';

type ReminderBubbleProps = {
  reminder: Reminder;
  index: number;
  size: number;
  width?: number;
  height?: number;
  currentDate: Date;
  style?: ViewStyle;
  isBursting?: boolean;
  idleDisabled?: boolean;
  onPress?: (reminder: Reminder) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type IdleMotionConfig = {
  delay: number;
  duration: number;
  amplitudeX: number;
  amplitudeY: number;
  rotateDeg: number;
};

type BubbleTypography = {
  titleFontSize: number;
  titleLineCount: number;
  titleLineHeight: number;
  titleMinFontScale: number;
  titleAdjustsFontSizeToFit: boolean;
  titleEllipsizeMode: 'clip';
  timeFontSize: number;
  timeMarginTop: number;
  bubblePadding: number;
};

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function unitFromHash(seed: number, salt: number) {
  let hash = seed ^ Math.imul(salt + 1, 0x9e3779b9);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTitleVisualLength(title: string) {
  return Array.from(title.trim()).reduce((length, character) => {
    if (character.trim().length === 0) {
      return length + 0.35;
    }

    return length + (character.charCodeAt(0) <= 0x007f ? 0.62 : 1);
  }, 0);
}

function getBubbleTypography(
  width: number,
  height: number,
  titleVisualLength: number,
): BubbleTypography {
  const isShortTitle = titleVisualLength <= 8;
  const isMediumTitle = titleVisualLength <= 16;
  const isLongTitle = titleVisualLength > 24;
  const textMeasure = Math.min(height, width / 1.45);
  const titleLineCount = isShortTitle ? 1 : isMediumTitle ? 2 : isLongTitle ? 4 : 3;
  const titleFontSize = isShortTitle
    ? clamp(textMeasure * 0.16, 16, 24)
    : isMediumTitle
      ? clamp(textMeasure * 0.13, 14, 21)
      : isLongTitle
        ? clamp(textMeasure * 0.082, 11, 14)
        : clamp(textMeasure * 0.108, 13, 18);
  const timeFontSize = isShortTitle
    ? clamp(textMeasure * 0.095, 12, 16)
    : isLongTitle
      ? clamp(textMeasure * 0.072, 10, 12)
      : clamp(textMeasure * 0.085, 11, 14);
  const baseBubblePadding = clamp(textMeasure * 0.14, 12, 23);

  return {
    titleFontSize: Math.round(titleFontSize),
    titleLineCount,
    titleLineHeight: Math.round(titleFontSize + (isShortTitle ? 5 : isLongTitle ? 2 : 4)),
    titleMinFontScale: isShortTitle ? 1 : isLongTitle ? 0.72 : 0.9,
    titleAdjustsFontSizeToFit: !isShortTitle,
    titleEllipsizeMode: 'clip',
    timeFontSize: Math.round(timeFontSize),
    timeMarginTop: isShortTitle
      ? Math.round(clamp(textMeasure * 0.045, 5, 9))
      : isLongTitle
        ? 2
        : 4,
    bubblePadding: Math.round(
      isShortTitle ? baseBubblePadding : Math.max(10, baseBubblePadding - (isLongTitle ? 5 : 3)),
    ),
  };
}

function makeIdleMotionConfig(id: string, index: number): IdleMotionConfig {
  const seed = hashString(`${id}-${index}`);

  return {
    delay: Math.round(unitFromHash(seed, 1) * 1200),
    duration: Math.round(4600 + unitFromHash(seed, 2) * 2600),
    amplitudeX: unitFromHash(seed, 3) * 2.4,
    amplitudeY: 2.2 + unitFromHash(seed, 4) * 2.2,
    rotateDeg: 0.35 + unitFromHash(seed, 5) * 0.35,
  };
}

export const ReminderBubble = memo(function ReminderBubble({
  reminder,
  index,
  size,
  width,
  height,
  currentDate,
  style,
  isBursting,
  idleDisabled,
  onPress,
}: ReminderBubbleProps) {
  const color = getReminderDueColor(reminder.targetAt, currentDate);
  const gradient = color.gradient as [string, string, string];
  const titleVisualLength = getTitleVisualLength(reminder.title);
  const bubbleWidth = width ?? size;
  const bubbleHeight = height ?? size;
  const visualSize = Math.min(bubbleWidth, bubbleHeight);
  const typography = getBubbleTypography(bubbleWidth, bubbleHeight, titleVisualLength);
  const radius = visualSize / 2;
  const reduceMotion = useReducedMotion();
  const idleMotion = useMemo(() => makeIdleMotionConfig(reminder.id, index), [index, reminder.id]);
  const entryProgress = useSharedValue(0);
  const birthProgress = useSharedValue(0);
  const idleProgress = useSharedValue(0);
  const burstProgress = useSharedValue(0);

  useEffect(() => {
    entryProgress.value = 0;
    birthProgress.value = 0;
    entryProgress.value = withTiming(1, {
      duration: reduceMotion ? 1 : 360,
      easing: Easing.out(Easing.cubic),
    });
    birthProgress.value = reduceMotion
      ? 0
      : withSequence(
          withTiming(1, {
            duration: 260,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0, {
            duration: 180,
            easing: Easing.inOut(Easing.cubic),
          }),
        );
  }, [birthProgress, entryProgress, reduceMotion]);

  useEffect(() => {
    cancelAnimation(idleProgress);

    if (reduceMotion || idleDisabled || isBursting) {
      idleProgress.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    idleProgress.value = 0;
    idleProgress.value = withDelay(
      idleMotion.delay,
      withRepeat(
        withTiming(1, {
          duration: idleMotion.duration,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      ),
    );

    return () => {
      cancelAnimation(idleProgress);
    };
  }, [idleDisabled, idleMotion.delay, idleMotion.duration, idleProgress, isBursting, reduceMotion]);

  useEffect(() => {
    if (isBursting) {
      burstProgress.value = 0;
      burstProgress.value = withTiming(1, {
        duration: reduceMotion ? 1 : 260,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    burstProgress.value = 0;
  }, [burstProgress, isBursting, reduceMotion]);

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: entryProgress.value * (1 - burstProgress.value),
    transform: [
      {
        translateX:
          Math.sin(idleProgress.value * Math.PI * 2) *
          idleMotion.amplitudeX *
          (1 - burstProgress.value),
      },
      {
        translateY:
          (1 - entryProgress.value) * 8 +
          Math.cos(idleProgress.value * Math.PI * 2) *
            idleMotion.amplitudeY *
            (1 - burstProgress.value),
      },
      {
        rotate: `${
          Math.sin(idleProgress.value * Math.PI * 2) *
          idleMotion.rotateDeg *
          (1 - burstProgress.value)
        }deg`,
      },
      {
        scale:
          (0.98 + entryProgress.value * 0.02 + birthProgress.value * 0.01) *
          (1 - burstProgress.value * 0.18),
      },
    ],
  }));

  const burstRingStyle = useAnimatedStyle(() => ({
    opacity: (1 - burstProgress.value) * 0.75,
    transform: [{ scale: 1 + burstProgress.value * 0.32 }],
  }));

  const particleOneStyle = useAnimatedStyle(() => ({
    opacity: (1 - burstProgress.value) * 0.72,
    transform: [
      { translateX: -18 * burstProgress.value },
      { translateY: -18 * burstProgress.value },
      { scale: 1 - burstProgress.value * 0.3 },
    ],
  }));

  const particleTwoStyle = useAnimatedStyle(() => ({
    opacity: (1 - burstProgress.value) * 0.58,
    transform: [
      { translateX: 20 * burstProgress.value },
      { translateY: -12 * burstProgress.value },
      { scale: 1 - burstProgress.value * 0.32 },
    ],
  }));

  const particleThreeStyle = useAnimatedStyle(() => ({
    opacity: (1 - burstProgress.value) * 0.48,
    transform: [
      { translateX: 14 * burstProgress.value },
      { translateY: 18 * burstProgress.value },
      { scale: 1 - burstProgress.value * 0.35 },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${reminder.title}の詳細を開く`}
      disabled={isBursting}
      onPress={() => onPress?.(reminder)}
      style={[
        styles.bubble,
        {
          width: bubbleWidth,
          height: bubbleHeight,
          borderRadius: radius,
        },
        style,
        bubbleAnimatedStyle,
      ]}
    >
      <View
        style={[
          styles.bubbleSurface,
          {
            borderRadius: radius,
            padding: typography.bubblePadding,
            borderColor: 'rgba(255,255,255,0.72)',
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.78)', gradient[2], 'rgba(255,255,255,0.08)']}
          locations={[0, 0.52, 1]}
          start={{ x: 0.16, y: 0.08 }}
          end={{ x: 0.86, y: 0.96 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)', 'rgba(39,48,76,0.07)']}
          locations={[0, 0.52, 1]}
          start={{ x: 0.1, y: 0.04 }}
          end={{ x: 0.9, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
        <View
          style={[
            styles.tintMist,
            {
              borderRadius: radius * 0.72,
              backgroundColor: color.background,
              opacity: homeVisualTokens.bubbleTintMistOpacity,
            },
          ]}
        />
        <View style={[styles.lowerDepth, { borderRadius: radius * 0.76 }]} />
        <View style={[styles.centerGlow, { borderRadius: radius * 0.7 }]} />
        <View style={[styles.outerGlassRing, { borderRadius: radius }]} />
        <View style={[styles.innerGlassRing, { borderRadius: radius - 6 }]} />
        <View style={[styles.leftLightArc, { borderRadius: radius }]} />
        <View
          style={[
            styles.innerColorRim,
            {
              borderRadius: radius - 12,
              borderColor: color.border,
              opacity: homeVisualTokens.bubbleInnerColorRimOpacity,
            },
          ]}
        />
        <View style={[styles.highlightLarge, { borderRadius: visualSize * 0.2 }]} />
        <View style={styles.highlightSmall} />
        <View style={styles.highlightTiny} />
        <View style={styles.topLightArc} />
        <View style={styles.bottomReflection} />
        <View style={styles.textLayer}>
          <Text
            adjustsFontSizeToFit={typography.titleAdjustsFontSizeToFit}
            ellipsizeMode={typography.titleEllipsizeMode}
            minimumFontScale={typography.titleMinFontScale}
            numberOfLines={typography.titleLineCount}
            style={[
              styles.title,
              {
                color: color.accent,
                fontSize: typography.titleFontSize,
                lineHeight: typography.titleLineHeight,
              },
            ]}
          >
            {reminder.title}
          </Text>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            ellipsizeMode="tail"
            minimumFontScale={0.82}
            style={[
              styles.time,
              {
                fontSize: typography.timeFontSize,
                lineHeight: typography.timeFontSize + 4,
                marginTop: typography.timeMarginTop,
              },
            ]}
          >
            {formatReminderBubbleDateTime(reminder.targetAt)}
          </Text>
        </View>
      </View>
      {isBursting ? (
        <>
          <Animated.View style={[styles.burstRing, { borderRadius: radius - 6 }, burstRingStyle]} />
          <Animated.View
            style={[styles.burstParticle, styles.burstParticleOne, particleOneStyle]}
          />
          <Animated.View
            style={[styles.burstParticle, styles.burstParticleTwo, particleTwoStyle]}
          />
          <Animated.View
            style={[styles.burstParticle, styles.burstParticleThree, particleThreeStyle]}
          />
        </>
      ) : null}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleSurface: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#9EB9EA',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: homeVisualTokens.bubbleSurfaceElevation,
    overflow: 'hidden',
  },
  tintMist: {
    position: 'absolute',
    top: '20%',
    left: '16%',
    width: '68%',
    height: '60%',
  },
  lowerDepth: {
    position: 'absolute',
    right: '-7%',
    bottom: '-6%',
    width: '75%',
    height: '58%',
    backgroundColor: 'rgba(84,91,132,0.07)',
    opacity: 0.44,
  },
  centerGlow: {
    position: 'absolute',
    top: '18%',
    left: '16%',
    width: '66%',
    height: '58%',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  outerGlassRing: {
    position: 'absolute',
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.58)',
  },
  innerGlassRing: {
    position: 'absolute',
    top: 6,
    right: 6,
    bottom: 6,
    left: 6,
    borderWidth: 0.9,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  leftLightArc: {
    position: 'absolute',
    top: 6,
    left: 7,
    width: '78%',
    height: '76%',
    borderTopWidth: 2.5,
    borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.68)',
    opacity: 0.78,
    transform: [{ rotate: '-16deg' }],
  },
  innerColorRim: {
    position: 'absolute',
    top: 11,
    right: 10,
    bottom: 10,
    left: 11,
    borderRightWidth: 2.2,
    borderBottomWidth: 1.4,
  },
  highlightLarge: {
    position: 'absolute',
    top: '12%',
    left: '17%',
    width: '33%',
    height: '18%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    opacity: 0.82,
    transform: [{ rotate: '-28deg' }],
  },
  highlightSmall: {
    position: 'absolute',
    top: '12%',
    left: '55%',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  highlightTiny: {
    position: 'absolute',
    top: '24%',
    left: '63%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.52)',
  },
  topLightArc: {
    position: 'absolute',
    top: 10,
    left: '19%',
    width: '62%',
    height: '27%',
    borderTopWidth: 2,
    borderColor: 'rgba(255,255,255,0.48)',
    borderRadius: 999,
    opacity: 0.78,
    transform: [{ rotate: '-10deg' }],
  },
  bottomReflection: {
    position: 'absolute',
    bottom: '14%',
    left: '24%',
    width: '52%',
    height: '18%',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    opacity: 0.72,
  },
  burstRing: {
    position: 'absolute',
    top: 6,
    right: 6,
    bottom: 6,
    left: 6,
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  burstParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.74)',
  },
  burstParticleOne: {
    top: '24%',
    left: '25%',
  },
  burstParticleTwo: {
    top: '23%',
    right: '24%',
  },
  burstParticleThree: {
    right: '30%',
    bottom: '25%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  textLayer: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    textShadowColor: 'rgba(255,255,255,0.58)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  time: {
    color: 'rgba(38,49,81,0.76)',
    textAlign: 'center',
    fontWeight: '800',
    textShadowColor: 'rgba(255,255,255,0.62)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 7,
  },
});
