import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderInputSheet.tsx');
const dateChipsSource = readSource(import.meta.url, './DateChips.tsx');
const rootLayoutSource = readSource(import.meta.url, '../../../app/_layout.tsx');
const timeSelectorSource = readSource(
  import.meta.url,
  '../../../shared/components/TimeSelector.tsx',
);

test('successful quick add does not focus the title input again', () => {
  const saveSuccessBlock = source.slice(
    source.indexOf('await onSave?.(normalizedTitle);'),
    source.indexOf('} catch {'),
  );

  assert.equal(saveSuccessBlock.includes('focus()'), false);
});

test('widget quick add focuses the title input when the sheet opens', () => {
  const openBlock = source.slice(
    source.indexOf('if (!isPresentedRef.current && !isClosingRef.current) {'),
    source.indexOf('const requestClose = useCallback'),
  );

  assertSourceIncludes(source, [
    /const shouldFocusTitleOnOpen = useReminderUiStore\(\(state\) => state\.shouldFocusTitleOnOpen\);/,
  ]);
  assertSourceIncludes(openBlock, [
    /sheetRef\.current\?\.present\(\);[\s\S]*if \(shouldFocusTitleOnOpen\) \{[\s\S]*titleInputRef\.current\?\.focus\(\);/,
  ]);
});

test('quick add sheet uses the compact one-screen layout', () => {
  assertSourceContract(source, {
    includes: [
      /topInset=\{sheetTopInset\}/,
      /styles\.inputHeader/,
      /variant="compact"/,
      /styles\.actionRow/,
    ],
    excludes: [/styles\.sheetTitle/],
  });
});

test('quick add sheet sizes to content instead of leaving keyboard gap', () => {
  assertSourceContract(source, {
    includes: [
      /BottomSheetScrollView/,
      /enableDynamicSizing/,
      /useWindowDimensions/,
      /const quickAddMaxDynamicContentSize = useMemo/,
      /windowHeight - sheetTopInset - safeAreaInsets\.bottom - QUICK_ADD_BOTTOM_CLEARANCE/,
      /const quickAddContentBottomPadding = useMemo/,
      /18 \+ safeAreaInsets\.bottom/,
      /maxDynamicContentSize=\{quickAddMaxDynamicContentSize\}/,
      /bottomInset=\{safeAreaInsets\.bottom\}/,
      /keyboardBehavior="interactive"/,
      /android_keyboardInputMode="adjustPan"/,
      /contentContainerStyle=\{\[styles\.content, \{ paddingBottom: quickAddContentBottomPadding \}\]\}/,
      /keyboardShouldPersistTaps="handled"/,
    ],
    excludes: [
      /BottomSheetKeyboardAwareScrollView/,
      /KeyboardAwareScrollView/,
      /quickAddKeyboardBottomOffset/,
      /bottomOffset=\{/,
      /QUICK_ADD_MAX_DYNAMIC_CONTENT_SIZE = 360/,
      /keyboardBehavior=\{Platform\.OS === 'ios' \? 'interactive' : 'fillParent'\}/,
      /android_keyboardInputMode="adjustResize"/,
      /fillParent/,
      /contentContainerStyle=\{styles\.content\}/,
      /snapPoints=\{snapPoints\}/,
      /const snapPoints = useMemo/,
    ],
  });
});

test('keyboard controller is not mounted around bottom sheet content', () => {
  assertSourceContract(rootLayoutSource, {
    includes: [/<BottomSheetModalProvider>[\s\S]*<\/BottomSheetModalProvider>/],
    excludes: [/KeyboardProvider/, /react-native-keyboard-controller/],
  });
});

test('custom date chip shows the selected date after picking one', () => {
  assertSourceIncludes(dateChipsSource, [
    /formatCustomDate\(customDate\)/,
    /customActive \? formatCustomDate\(customDate\) : '日付'/,
    /numberOfLines=\{1\}/,
  ]);
});

test('compact custom time chip shows the selected time after picking one', () => {
  assertSourceIncludes(timeSelectorSource, [
    /const customTimeLabel = isCompact && !isPresetTime \? value : '時刻';/,
    /isCompact \? customTimeLabel : '時刻を選ぶ'/,
    /numberOfLines=\{1\}/,
  ]);
});

test('custom date picker uses platform native display styles', () => {
  assertSourceIncludes(source, [
    /import \{[\s\S]*Modal,[\s\S]*Platform,[\s\S]*Pressable,[\s\S]*StyleSheet,[\s\S]*Text,[\s\S]*View,[\s\S]*useWindowDimensions,[\s\S]*\} from 'react-native';/,
    /const datePickerDisplay = Platform\.select/,
    /ios: 'spinner'/,
    /android: 'default'/,
    /display=\{datePickerDisplay\}/,
  ]);
});
