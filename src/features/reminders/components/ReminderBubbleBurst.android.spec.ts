import { test } from 'node:test';
import { assertSourceContract, readSource } from '../../../test-utils/sourceAssertions';

const android = readSource(import.meta.url, './ReminderBubbleBurst.android.tsx');
const native = readSource(import.meta.url, './ReminderBubbleBurst.native.tsx');
const fallback = readSource(import.meta.url, './ReminderBubbleBurstFallback.tsx');
const skia = readSource(import.meta.url, './ReminderBubbleBurstSkia.tsx');

test('Android uses the crash-safe Reanimated fallback and keeps haptics', () => {
  assertSourceContract(android, {
    includes: [
      /ReminderBubbleBurstFallback/,
      /performAndroidHapticsAsync/,
      /AndroidHaptics\.Gesture_End/,
      /REMINDER_BUBBLE_RUPTURE_MS/,
      /setTimeout\(/,
      /clearTimeout\(/,
      /useReducedMotion/,
    ],
    excludes: [/ReminderBubbleBurstSkia/],
  });
  assertSourceContract(native, { includes: [/ReminderBubbleBurstSkia/] });
  assertSourceContract(fallback, { includes: [/const \{ progress \} = motion;/] });
});

test('quadratic paths return the path object, not the native quadTo result', () => {
  assertSourceContract(skia, {
    includes: [/path\.quadTo\(control\.x, control\.y, end\.x, end\.y\);\s*return path;/],
  });
});
