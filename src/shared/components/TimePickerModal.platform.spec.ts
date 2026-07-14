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

test('time picker commits once from its local draft', () => {
  assertSourceIncludes(source, [
    /onConfirm: \(value: string\) => void;/,
    /const \[draftTime, setDraftTime\] = useState\(value\);/,
    /setDraftTime\(format\(selectedTime, 'HH:mm'\)\);/,
    /onConfirm\(draftTime\);/,
    /label="この時刻にする"/,
  ]);
});
