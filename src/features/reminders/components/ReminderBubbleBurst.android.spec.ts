import { test } from 'node:test';

import { assertSourceContract, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderBubbleBurst.android.tsx');

test('Android uses the Reanimated fallback and keeps burst completion behavior', () => {
  assertSourceContract(source, {
    includes: [
      /ReminderBubbleBurstFallback/,
      /\{\.\.\.props\}/,
      /performAndroidHapticsAsync/,
      /AndroidHaptics\.Gesture_End/,
      /REMINDER_BUBBLE_RUPTURE_MS/,
      /setTimeout\(/,
      /clearTimeout\(/,
      /useReducedMotion/,
      /if \(reduceMotion\)/,
      /ReminderBubbleBurstProps/,
    ],
    excludes: [/@shopify\/react-native-skia/, /makeImageFromView/, /<Canvas/],
  });
});
