import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { format, isSameDay, isTomorrow } from 'date-fns';

import { bubbleColors, palette } from '../../../constants/colors';
import { Reminder } from '../types/reminder';

type ReminderBubbleProps = {
  reminder: Reminder;
  index: number;
  size: number;
  style?: ViewStyle;
  isBursting?: boolean;
  onPress?: (reminder: Reminder) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatTargetLabel(targetAt: string) {
  const target = new Date(targetAt);

  if (isSameDay(target, new Date())) {
    return `今日 ${format(target, 'HH:mm')}`;
  }

  if (isTomorrow(target)) {
    return `明日 ${format(target, 'HH:mm')}`;
  }

  return `${format(target, 'M/d')} ${format(target, 'HH:mm')}`;
}

export const ReminderBubble = memo(function ReminderBubble({
  reminder,
  index,
  size,
  style,
  isBursting,
  onPress,
}: ReminderBubbleProps) {
  const color = bubbleColors[index % bubbleColors.length];
  const gradient = color.gradient as [string, string, string];
  const titleFontSize = size >= 150 ? 24 : size >= 135 ? 22 : 21;
  const timeFontSize = size >= 150 ? 16 : size >= 135 ? 15 : 14;
  const radius = size / 2;
  const burstProgress = useSharedValue(0);

  useEffect(() => {
    if (isBursting) {
      burstProgress.value = 0;
      burstProgress.value = withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    burstProgress.value = 0;
  }, [burstProgress, isBursting]);

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - burstProgress.value,
    transform: [{ scale: 1 - burstProgress.value * 0.18 }],
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
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: 'rgba(255,255,255,0.28)',
          borderColor: color.border,
        },
        style,
        bubbleAnimatedStyle,
      ]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.92)', gradient[1], 'rgba(255,255,255,0.42)']}
        locations={[0, 0.58, 1]}
        start={{ x: 0.22, y: 0.06 }}
        end={{ x: 0.84, y: 0.96 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)', gradient[2]]}
        locations={[0, 0.44, 1]}
        start={{ x: 0.05, y: 0.02 }}
        end={{ x: 0.98, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View style={[styles.centerGlow, { borderRadius: radius * 0.72 }]} />
      <View style={[styles.outerGlassRing, { borderRadius: radius }]} />
      <View style={[styles.innerGlassRing, { borderRadius: radius - 7 }]} />
      <View style={[styles.innerColorRim, { borderRadius: radius - 14, borderColor: color.border }]} />
      <View style={[styles.highlightLarge, { borderRadius: size * 0.18 }]} />
      <View style={styles.highlightSmall} />
      <View style={styles.highlightTiny} />
      <View style={styles.topLightArc} />
      <View style={styles.bottomReflection} />
      {isBursting ? (
        <>
          <Animated.View
            style={[styles.burstRing, { borderRadius: radius - 6 }, burstRingStyle]}
          />
          <Animated.View style={[styles.burstParticle, styles.burstParticleOne, particleOneStyle]} />
          <Animated.View style={[styles.burstParticle, styles.burstParticleTwo, particleTwoStyle]} />
          <Animated.View
            style={[styles.burstParticle, styles.burstParticleThree, particleThreeStyle]}
          />
        </>
      ) : null}
      <View style={styles.textLayer}>
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[
            styles.title,
            {
              color: color.accent,
              fontSize: titleFontSize,
              lineHeight: titleFontSize + 5,
            },
          ]}
        >
          {reminder.title}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.time, { fontSize: timeFontSize, lineHeight: timeFontSize + 4 }]}
        >
          {formatTargetLabel(reminder.targetAt)}
        </Text>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    borderWidth: 1,
    shadowColor: '#8ECDF5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 2,
    overflow: 'hidden',
  },
  centerGlow: {
    position: 'absolute',
    top: '19%',
    left: '18%',
    width: '64%',
    height: '62%',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  outerGlassRing: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  innerGlassRing: {
    position: 'absolute',
    top: 7,
    right: 7,
    bottom: 7,
    left: 7,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  innerColorRim: {
    position: 'absolute',
    top: 14,
    right: 14,
    bottom: 14,
    left: 14,
    borderWidth: 0.7,
    opacity: 0.34,
  },
  highlightLarge: {
    position: 'absolute',
    top: '15%',
    left: '18%',
    width: '34%',
    height: '22%',
    backgroundColor: 'rgba(255,255,255,0.62)',
    transform: [{ rotate: '-24deg' }],
  },
  highlightSmall: {
    position: 'absolute',
    top: '13%',
    left: '54%',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  highlightTiny: {
    position: 'absolute',
    top: '24%',
    left: '62%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  topLightArc: {
    position: 'absolute',
    top: 12,
    left: '18%',
    width: '64%',
    height: '28%',
    borderTopWidth: 2,
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 999,
    opacity: 0.78,
    transform: [{ rotate: '-8deg' }],
  },
  bottomReflection: {
    position: 'absolute',
    bottom: '16%',
    left: '26%',
    width: '48%',
    height: '18%',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    opacity: 0.66,
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
    color: palette.ink,
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 8,
    textShadowColor: 'rgba(255,255,255,0.62)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 7,
  },
});
