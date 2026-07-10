import { memo, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  createBubbleBurstGeometry,
  type BubbleBurstDroplet,
  type BubbleMembraneFragment,
} from './ReminderBubbleBurstGeometry';
import {
  REMINDER_BUBBLE_BURST_MS,
  REMINDER_BUBBLE_RESTORE_MS,
  type ReminderBubbleBurstProps,
} from './ReminderBubbleBurst.types';

function clamp01(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number) {
  'worklet';
  return 1 - (1 - value) ** 3;
}

function WebMembraneFragment({
  fragment,
  progress,
  color,
}: {
  fragment: BubbleMembraneFragment;
  progress: SharedValue<number>;
  color: string;
}) {
  const outerStart = fragment.points[0];
  const outerEnd = fragment.points[1];
  const width = Math.max(4, Math.hypot(outerEnd.x - outerStart.x, outerEnd.y - outerStart.y));
  const animatedStyle = useAnimatedStyle(() => {
    const travel = easeOutCubic(clamp01((progress.value - fragment.delay) / 0.55));
    const fade = clamp01((progress.value - 0.68) / 0.32);

    return {
      opacity: (1 - fade) * Math.min(1, travel * 3.2),
      transform: [
        { translateX: fragment.travelX * travel },
        { translateY: fragment.travelY * travel },
        { rotate: `${fragment.rotation * travel}rad` },
        { scaleX: 1 - travel * 0.44 },
        { scaleY: 1 - travel * 0.7 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.webFragment,
        {
          left: fragment.origin.x - width / 2,
          top: fragment.origin.y - 2,
          width,
          borderColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

function WebDroplet({
  droplet,
  progress,
}: {
  droplet: BubbleBurstDroplet;
  progress: SharedValue<number>;
}) {
  const diameter = Math.max(2, droplet.radius * 2);
  const animatedStyle = useAnimatedStyle(() => {
    const travel = easeOutCubic(clamp01((progress.value - droplet.delay) / 0.48));
    const fade = clamp01((progress.value - 0.7) / 0.3);

    return {
      opacity: (1 - fade) * Math.min(0.86, travel * 3),
      transform: [
        { translateX: droplet.travelX * travel },
        { translateY: droplet.travelY * travel + droplet.gravity * travel * travel },
        { scale: 1 - travel * 0.62 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.webDroplet,
        {
          left: droplet.origin.x - diameter / 2,
          top: droplet.origin.y - diameter / 2,
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export const ReminderBubbleBurstFallback = memo(function ReminderBubbleBurstFallback({
  reminderId,
  width,
  height,
  color,
  phase,
  onMotionComplete,
}: ReminderBubbleBurstProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const geometry = useMemo(
    () => createBubbleBurstGeometry(reminderId, width, height),
    [height, reminderId, width],
  );
  const completeMotion = useCallback(
    (completedPhase: NonNullable<typeof phase>) => {
      onMotionComplete?.(reminderId, completedPhase);
    },
    [onMotionComplete, reminderId],
  );

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;

    if (!phase) {
      return;
    }

    if (reduceMotion) {
      progress.value = 1;
      void Promise.resolve().then(() => completeMotion(phase));
      return;
    }

    progress.value = withTiming(
      1,
      {
        duration: phase === 'bursting' ? REMINDER_BUBBLE_BURST_MS : REMINDER_BUBBLE_RESTORE_MS,
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) {
          runOnJS(completeMotion)(phase);
        }
      },
    );

    return () => cancelAnimation(progress);
  }, [completeMotion, phase, progress, reduceMotion]);

  const restoreRingStyle = useAnimatedStyle(() => {
    const eased = easeOutCubic(progress.value);
    return {
      opacity: phase === 'restoring' ? (1 - eased) * 0.72 : 0,
      transform: [{ scale: 1.45 - eased * 0.45 }],
    };
  });

  if (!phase || reduceMotion) {
    return null;
  }

  const visualSize = Math.min(width, height);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.webCanvas,
        {
          left: -geometry.overscan,
          top: -geometry.overscan,
          width: geometry.canvasWidth,
          height: geometry.canvasHeight,
        },
      ]}
    >
      {phase === 'bursting'
        ? geometry.membraneFragments.map((fragment) => (
            <WebMembraneFragment
              key={fragment.id}
              fragment={fragment}
              progress={progress}
              color={color.border}
            />
          ))
        : null}
      {phase === 'bursting'
        ? geometry.droplets.map((droplet) => (
            <WebDroplet key={droplet.id} droplet={droplet} progress={progress} />
          ))
        : null}
      {phase === 'restoring' ? (
        <Animated.View
          style={[
            styles.webRestoreRing,
            {
              left: geometry.bubbleCenter.x - visualSize / 2,
              top: geometry.bubbleCenter.y - visualSize / 2,
              width: visualSize,
              height: visualSize,
              borderRadius: visualSize / 2,
              borderColor: color.border,
            },
            restoreRingStyle,
          ]}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  webCanvas: {
    position: 'absolute',
    zIndex: 8,
    overflow: 'visible',
  },
  webFragment: {
    position: 'absolute',
    height: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.36,
    shadowRadius: 5,
  },
  webDroplet: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.76)',
    shadowColor: '#9FE9FF',
    shadowOpacity: 0.42,
    shadowRadius: 4,
  },
  webRestoreRing: {
    position: 'absolute',
    borderWidth: 2,
    shadowColor: '#BDB2FF',
    shadowOpacity: 0.42,
    shadowRadius: 8,
  },
});
