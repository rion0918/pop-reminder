import { useEffect, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import type { BubbleDeleteMotionPhase } from './ReminderBubble';
import {
  REMINDER_BUBBLE_BURST_MS,
  REMINDER_BUBBLE_RESTORE_MS,
  REMINDER_BUBBLE_RUPTURE_MS,
} from './ReminderBubbleBurst.types';

export function useReminderBubbleBurstMotion({
  reminderId,
  phase,
  delayMs,
  reduceMotion,
  onMotionComplete,
}: {
  reminderId: string;
  phase?: BubbleDeleteMotionPhase;
  delayMs: number;
  reduceMotion: boolean;
  onMotionComplete?: (id: string, phase: BubbleDeleteMotionPhase) => void;
}) {
  const progress = useSharedValue(0);
  const snapshotReady = useSharedValue(false);
  // -1: pending, 0: no capture, 1: captured membrane. Locked on the UI thread at rupture.
  const membraneMode = useSharedValue(-1);
  const activePhase = useSharedValue<BubbleDeleteMotionPhase | undefined>(undefined);
  const callbackRef = useRef(onMotionComplete);
  const generationRef = useRef(0);
  callbackRef.current = onMotionComplete;

  useAnimatedReaction(
    () =>
      activePhase.value === 'bursting' &&
      progress.value >= REMINDER_BUBBLE_RUPTURE_MS / REMINDER_BUBBLE_BURST_MS,
    (ruptured) => {
      if (ruptured && membraneMode.value === -1) membraneMode.value = snapshotReady.value ? 1 : 0;
    },
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    let completed = false;
    cancelAnimation(progress);
    activePhase.value = undefined;
    progress.value = 0;
    membraneMode.value = -1;
    activePhase.value = phase;

    const complete = () => {
      if (!phase || completed || generationRef.current !== generation) return;
      completed = true;
      callbackRef.current?.(reminderId, phase);
    };
    if (phase) {
      if (reduceMotion) {
        progress.value = 1;
        void Promise.resolve().then(complete);
      } else {
        progress.value = withDelay(
          delayMs,
          withTiming(
            1,
            {
              duration:
                phase === 'bursting' ? REMINDER_BUBBLE_BURST_MS : REMINDER_BUBBLE_RESTORE_MS,
              easing: Easing.linear,
            },
            (finished) => {
              if (finished) runOnJS(complete)();
            },
          ),
        );
      }
    }
    return () => {
      generationRef.current += 1;
      cancelAnimation(progress);
      activePhase.value = undefined;
    };
  }, [activePhase, delayMs, membraneMode, phase, progress, reduceMotion, reminderId]);

  return { progress, snapshotReady, membraneMode, activePhase };
}
