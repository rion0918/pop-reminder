import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { EmptyReminderBubbleMembrane } from './EmptyReminderBubbleMembrane';

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
        duration: 7200,
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
      { translateX: reduceMotion ? 0 : idleProgress.value * 3 - 1.5 },
      { rotate: reduceMotion ? '0deg' : `${idleProgress.value * 1.2 - 0.6}deg` },
      { scaleX: reduceMotion ? 1 : 0.994 + idleProgress.value * 0.012 },
      { scaleY: reduceMotion ? 1 : 1.006 - idleProgress.value * 0.012 },
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
      <EmptyReminderBubbleMembrane size={size} motionProgress={idleProgress} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  disabled: {
    opacity: 0.5,
  },
});
