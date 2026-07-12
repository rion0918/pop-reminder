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
  const hapticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hapticTimeoutRef.current) {
      clearTimeout(hapticTimeoutRef.current);
      hapticTimeoutRef.current = null;
    }

    if (props.phase !== 'bursting') {
      return;
    }

    if (reduceMotion) {
      void triggerAndroidBubbleBurstHaptic();
      return;
    }

    hapticTimeoutRef.current = setTimeout(() => {
      hapticTimeoutRef.current = null;
      void triggerAndroidBubbleBurstHaptic();
    }, REMINDER_BUBBLE_RUPTURE_MS);

    return () => {
      if (hapticTimeoutRef.current) {
        clearTimeout(hapticTimeoutRef.current);
        hapticTimeoutRef.current = null;
      }
    };
  }, [props.phase, reduceMotion]);

  return <ReminderBubbleBurstFallback {...props} />;
});
