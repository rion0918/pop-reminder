import { memo, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { ReminderBubbleBurstFallback } from './ReminderBubbleBurstFallback';
import {
  REMINDER_BUBBLE_RUPTURE_MS,
  type ReminderBubbleBurstProps,
} from './ReminderBubbleBurst.types';

async function triggerAndroidBubbleBurstHaptic() {
  try {
    await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End);
  } catch {
    // Haptics can be unavailable because of device or system settings.
  }
}

export const ReminderBubbleBurst = memo(function ReminderBubbleBurst(
  props: ReminderBubbleBurstProps,
) {
  const reduceMotion = useReducedMotion();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (props.phase !== 'bursting' || !(props.hapticsEnabled ?? true)) {
      return;
    }

    const delay = reduceMotion ? 0 : (props.delayMs ?? 0) + REMINDER_BUBBLE_RUPTURE_MS;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      void triggerAndroidBubbleBurstHaptic();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [props.delayMs, props.hapticsEnabled, props.phase, reduceMotion]);

  return <ReminderBubbleBurstFallback {...props} />;
});
