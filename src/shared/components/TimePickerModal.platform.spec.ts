import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './TimePickerModal.tsx');

test('time picker uses platform native display styles', () => {
  assertSourceIncludes(source, [
    /import \{ Modal, Platform, Pressable, StyleSheet, Text, View \}/,
    /const timePickerDisplay = Platform\.select/,
    /ios: 'spinner'/,
    /android: 'default'/,
    /display=\{timePickerDisplay\}/,
  ]);
});
