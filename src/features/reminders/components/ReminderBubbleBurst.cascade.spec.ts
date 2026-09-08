import { test } from 'node:test';
import { assertSourceContract, readSource } from '../../../test-utils/sourceAssertions';

const clock = readSource(import.meta.url, './useReminderBubbleBurstMotion.ts');
const skia = readSource(import.meta.url, './ReminderBubbleBurstSkia.tsx');
const fallback = readSource(import.meta.url, './ReminderBubbleBurstFallback.tsx');

test('one clock owns staggered completion and both renderers respect reduced motion', () => {
  assertSourceContract(clock, {
    includes: [
      /withDelay\(/,
      /delayMs/,
      /withTiming\(/,
      /if \(reduceMotion\)/,
      /generationRef/,
      /snapshotReady/,
      /membraneMode/,
    ],
  });
  assertSourceContract(skia, {
    includes: [
      /hapticsEnabled/,
      /ruptured && !previous && hapticsEnabled/,
      /\(!phase && !isSelected\) \|\| reduceMotion/,
    ],
    excludes: [/withTiming/, /onMotionComplete/],
  });
  assertSourceContract(fallback, {
    includes: [/const \{ progress \} = motion;/, /!phase \|\| reduceMotion/],
    excludes: [/withTiming/, /onMotionComplete/],
  });
});
