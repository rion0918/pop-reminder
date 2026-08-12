import { test } from 'node:test';

import { assertSourceContract, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ImeSafeReminderTitleInput.tsx');

test('IME-safe reminder title input keeps native text uncontrolled during manual typing', () => {
  assertSourceContract(source, {
    includes: [
      /BottomSheetTextInput/,
      /defaultValue=\{nativeTextRef\.current\}/,
      /onChangeText=\{handleChangeText\}/,
      /const \[titleLength, setTitleLength\] = useState/,
      /const \[isFocused, setIsFocused\] = useState/,
      /submitBehavior="blurAndSubmit"/,
      /fontVariant: \['tabular-nums'\]/,
      /REMINDER_TITLE_MAX_LENGTH/,
    ],
    excludes: [/value=\{/, /maxLength=\{REMINDER_TITLE_MAX_LENGTH\}/],
  });
});

test('IME-safe reminder title input exposes only explicit programmatic replacement controls', () => {
  assertSourceContract(source, {
    includes: [
      /export type ImeSafeReminderTitleInputHandle = \{/,
      /focus: \(\) => void;/,
      /blur: \(\) => void;/,
      /clear: \(\) => void;/,
      /replaceText: \(text: string\) => void;/,
      /isFocused: \(\) => boolean;/,
      /useImperativeHandle\(/,
      /setNativeRevision\(\(revision\) => revision \+ 1\)/,
      /key=\{nativeRevision\}/,
      /onEndEditing\?\.\(text\)/,
    ],
  });
});
