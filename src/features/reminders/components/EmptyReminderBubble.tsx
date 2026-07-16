import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type EmptyReminderBubbleProps = {
  size: number;
  disabled?: boolean;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function EmptyReminderBubble({ size, disabled = false, onPress }: EmptyReminderBubbleProps) {
  const reduceMotion = useReducedMotion();
  const idleProgress = useSharedValue(0.5);
  const pressProgress = useSharedValue(0);
  const isDisabled = disabled || !onPress;

  useEffect(() => {
    cancelAnimation(idleProgress);

    if (reduceMotion) {
      idleProgress.value = 0.5;
      return;
    }

    idleProgress.value = 0.5;
    idleProgress.value = withRepeat(
      withTiming(1, {
        duration: 5200,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );

    return () => cancelAnimation(idleProgress);
  }, [idleProgress, reduceMotion]);

  const handlePressIn = () => {
    if (isDisabled) return;
    pressProgress.value = withTiming(1, { duration: 120 });
  };

  const handlePressOut = () => {
    pressProgress.value = withTiming(0, { duration: 160 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressProgress.value * 0.1,
    transform: [
      { translateY: reduceMotion ? 0 : idleProgress.value * 6 - 3 },
      { scale: 1 - pressProgress.value * 0.03 },
    ],
  }));

  const radius = size / 2;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="リマインダーを追加"
      accessibilityHint="入力シートを開きます"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.bubble,
        { width: size, height: size, borderRadius: radius },
        isDisabled ? styles.disabled : null,
        animatedStyle,
      ]}
    >
      <View style={[styles.surface, { borderRadius: radius }]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.84)',
            'rgba(182,218,255,0.28)',
            'rgba(218,203,255,0.22)',
            'rgba(255,225,211,0.16)',
          ]}
          locations={[0, 0.44, 0.76, 1]}
          start={{ x: 0.16, y: 0.08 }}
          end={{ x: 0.86, y: 0.96 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.36)', 'rgba(255,255,255,0)', 'rgba(63,87,145,0.08)']}
          locations={[0, 0.54, 1]}
          start={{ x: 0.08, y: 0.04 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.outerGlassRing, { borderRadius: radius }]} />
        <View style={[styles.innerGlassRing, { borderRadius: radius - 7 }]} />
        <View style={[styles.leftLightArc, { borderRadius: radius }]} />
        <View style={[styles.colorRim, { borderRadius: radius - 11 }]} />
        <View style={[styles.highlightLarge, { borderRadius: size * 0.2 }]} />
        <View style={[styles.highlightSmall, { borderRadius: size * 0.05 }]} />
        <View style={[styles.bottomReflection, { borderRadius: size * 0.16 }]} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#89A9E2',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.17,
    shadowRadius: 28,
    elevation: 3,
  },
  surface: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.84)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  disabled: {
    opacity: 0.5,
  },
  outerGlassRing: {
    position: 'absolute',
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderWidth: 2.2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  innerGlassRing: {
    position: 'absolute',
    top: 7,
    right: 7,
    bottom: 7,
    left: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  leftLightArc: {
    position: 'absolute',
    top: '5%',
    left: '6%',
    width: '77%',
    height: '75%',
    borderTopWidth: 3,
    borderLeftWidth: 2.2,
    borderColor: 'rgba(255,255,255,0.76)',
    opacity: 0.84,
    transform: [{ rotate: '-14deg' }],
  },
  colorRim: {
    position: 'absolute',
    top: 10,
    right: 9,
    bottom: 9,
    left: 10,
    borderTopWidth: 2,
    borderRightWidth: 2.4,
    borderBottomWidth: 1.8,
    borderTopColor: 'rgba(199,172,255,0.34)',
    borderRightColor: 'rgba(102,203,255,0.38)',
    borderBottomColor: 'rgba(255,188,220,0.34)',
  },
  highlightLarge: {
    position: 'absolute',
    top: '13%',
    left: '16%',
    width: '34%',
    height: '18%',
    backgroundColor: 'rgba(255,255,255,0.72)',
    opacity: 0.86,
    transform: [{ rotate: '-28deg' }],
  },
  highlightSmall: {
    position: 'absolute',
    top: '29%',
    left: '13%',
    width: '10%',
    height: '16%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    opacity: 0.78,
    transform: [{ rotate: '16deg' }],
  },
  bottomReflection: {
    position: 'absolute',
    right: '16%',
    bottom: '15%',
    width: '22%',
    height: '10%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    opacity: 0.7,
    transform: [{ rotate: '-36deg' }],
  },
});
