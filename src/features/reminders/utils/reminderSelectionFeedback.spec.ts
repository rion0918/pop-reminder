import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './reminderSelectionFeedback.ts');

test('selection feedback is subtle, platform-native, and safely optional', () => {
  assertSourceIncludes(source, [
    /Haptics\.AndroidHaptics\.Segment_Tick/,
    /Haptics\.selectionAsync\(\)/,
    /catch \{[\s\S]*Haptics can be unavailable/,
  ]);
});
