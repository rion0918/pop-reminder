import { test } from 'node:test';

import { assertSourceContract, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ImeSafeReminderTitleInput.tsx');
const titleInputStylesSource = readSource(import.meta.url, './reminderTitleInputStyles.ts');

test('IME-safe reminder title input keeps native text uncontrolled during manual typing', () => {
  assertSourceContract(source, {
    includes: [
      /BottomSheetTextInput/,
      /defaultValue=\{nativeTextRef\.current\}/,
      /onChangeText=\{handleChangeText\}/,
      /const \[titleLength, setTitleLength\] = useState/,
      /const \[isFocused, setIsFocused\] = useState/,
      /submitBehavior="blurAndSubmit"/,
      /REMINDER_TITLE_MAX_LENGTH/,
    ],
    excludes: [/value=\{/, /maxLength=\{REMINDER_TITLE_MAX_LENGTH\}/],
  });
  assertSourceContract(titleInputStylesSource, {
    includes: [/fontVariant: \['tabular-nums'\]/, /count: \{[\s\S]*position: 'absolute'/],
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
      /replaceTextAndFocus: \(text: string\) => void;/,
      /isFocused: \(\) => boolean;/,
      /useImperativeHandle\(/,
      /const \[nativeRevision, setNativeRevision\] = useState\(0\);/,
      /const focusAfterReplacementRef = useRef\(false\);/,
      /useEffect\(\(\) => \{[\s\S]*focusAfterReplacementRef\.current[\s\S]*inputRef\.current\?\.focus\(\);[\s\S]*\}, \[nativeRevision\]\);/,
      /setNativeRevision\(\(revision\) => revision \+ 1\)/,
      /key=\{nativeRevision\}/,
      /onEndEditing\?\.\(text\)/,
    ],
  });
});
