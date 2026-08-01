import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { EmptyReminderBubbleMembrane } from './EmptyReminderBubbleMembrane';
import { makeReminderBubbleIdleMotionConfig } from './reminderBubbleIdleMotion';
import {
  REMINDER_BUBBLE_PRESS_SCALE,
  REMINDER_BUBBLE_PRESS_SPRING,
} from './reminderBubblePressMotion';

type EmptyReminderBubbleProps = {
  size: number;
  disabled?: boolean;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function EmptyReminderBubble({ size, disabled = false, onPress }: EmptyReminderBubbleProps) {
  const reduceMotion = useReducedMotion();
  const idleMotion = useMemo(() => makeReminderBubbleIdleMotionConfig('empty-reminder', 0), []);
  const idleProgress = useSharedValue(0);
  const pressProgress = useSharedValue(0);
  const isDisabled = disabled || !onPress;

  useEffect(() => {
    cancelAnimation(idleProgress);

    if (reduceMotion) {
      idleProgress.value = 0;
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

    return () => cancelAnimation(idleProgress);
  }, [idleMotion.delay, idleMotion.duration, idleProgress, reduceMotion]);

  const handlePressIn = () => {
    if (isDisabled) return;

    pressProgress.value = reduceMotion ? 1 : withSpring(1, REMINDER_BUBBLE_PRESS_SPRING);
  };

  const handlePressOut = () => {
    pressProgress.value = reduceMotion ? 0 : withSpring(0, REMINDER_BUBBLE_PRESS_SPRING);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressProgress.value * 0.1,
    transform: [
      {
        translateX: Math.sin(idleProgress.value * Math.PI * 2) * idleMotion.amplitudeX,
      },
      {
        translateY: Math.cos(idleProgress.value * Math.PI * 2) * idleMotion.amplitudeY,
      },
      {
        rotate: `${Math.sin(idleProgress.value * Math.PI * 2) * idleMotion.rotateDeg}deg`,
      },
      {
        scale: 1 - pressProgress.value * (1 - REMINDER_BUBBLE_PRESS_SCALE),
      },
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
