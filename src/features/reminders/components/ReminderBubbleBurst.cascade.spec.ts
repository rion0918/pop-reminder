import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const typesSource = readSource(import.meta.url, './ReminderBubbleBurst.types.ts');
const fallbackSource = readSource(import.meta.url, './ReminderBubbleBurstFallback.tsx');
const nativeSource = readSource(import.meta.url, './ReminderBubbleBurst.native.tsx');
const androidSource = readSource(import.meta.url, './ReminderBubbleBurst.android.tsx');

test('bubble burst supports staggered motion while respecting reduced motion and haptic restraint', () => {
  assertSourceIncludes(typesSource, [/delayMs\?: number;/, /hapticsEnabled\?: boolean;/]);
  assertSourceIncludes(fallbackSource, [
    /const motionDelayMs = reduceMotion \? 0 : delayMs;/,
    /withDelay\(\s*motionDelayMs,\s*withTiming/,
  ]);
  assertSourceIncludes(nativeSource, [
    /const motionDelayMs = reduceMotion \? 0 : delayMs;/,
    /if \(phase === 'bursting' && hapticsEnabled\)/,
    /withDelay\(\s*motionDelayMs,\s*withTiming/,
  ]);
  assertSourceIncludes(androidSource, [
    /if \(props\.phase !== 'bursting' \|\| !hapticsEnabled\)/,
    /motionDelayMs \+ REMINDER_BUBBLE_RUPTURE_MS/,
  ]);
});
