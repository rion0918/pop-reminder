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

test('widget quick add waits for the sheet to open before focusing the title input', () => {
  const openBlock = source.slice(
    source.indexOf('if (!isPresentedRef.current && !isClosingRef.current) {'),
    source.indexOf('const requestClose = useCallback'),
  );

  assertSourceIncludes(source, [
    /const shouldFocusTitleOnOpen = useReminderUiStore\(\(state\) => state\.shouldFocusTitleOnOpen\);/,
    /const titleFocusRequestIdRef = useRef\(0\);/,
    /const pendingTitleFocusRequestIdRef = useRef<number \| null>\(null\);/,
    /const handleSheetChange = useCallback\(\s*\(index: number\) => \{[\s\S]*pendingTitleFocusRequestIdRef\.current[\s\S]*titleInputRef\.current\?\.focus\(\);/,
    /onChange=\{handleSheetChange\}/,
  ]);
  assertSourceIncludes(openBlock, [
    /const focusRequestId = titleFocusRequestIdRef\.current \+ 1;[\s\S]*pendingTitleFocusRequestIdRef\.current = shouldFocusTitleOnOpen \? focusRequestId : null;[\s\S]*sheetRef\.current\?\.present\(\);/,
  ]);
  assert.equal(openBlock.includes('titleInputRef.current?.focus()'), false);
  assert.equal(source.includes('setTimeout'), false);
  assert.equal(source.includes('requestAnimationFrame'), false);
});

test('quick add sheet stays compact above the keyboard on every platform', () => {
  assertSourceContract(source, {
    includes: [/keyboardBehavior="interactive"/, /android_keyboardInputMode="adjustPan"/],
    excludes: [
      /keyboardBehavior=\{Platform\.OS/,
      /'fillParent'/,
      /android_keyboardInputMode="adjustResize"/,
    ],
  });
});

test('quick add sheet keeps compact dynamic sizing while bounding the resized safe area', () => {
  assertSourceContract(source, {
    includes: [
      /topInset=\{sheetTopInset\}/,
      /styles\.inputHeader/,
      /variant="compact"/,
      /styles\.actionRow/,
      /BottomSheetScrollView/,
      /enableDynamicSizing/,
      /useWindowDimensions/,
      /const quickAddMaxDynamicContentSize = useMemo/,
      /windowHeight - sheetTopInset - safeAreaInsets\.bottom - QUICK_ADD_BOTTOM_CLEARANCE/,
      /const quickAddContentBottomPadding = useMemo/,
      /18 \+ safeAreaInsets\.bottom/,
      /maxDynamicContentSize=\{quickAddMaxDynamicContentSize\}/,
      /bottomInset=\{safeAreaInsets\.bottom\}/,
      /contentContainerStyle=\{\[styles\.content, \{ paddingBottom: quickAddContentBottomPadding \}\]\}/,
      /keyboardShouldPersistTaps="handled"/,
    ],
    excludes: [
      /BottomSheetKeyboardAwareScrollView/,
      /KeyboardAwareScrollView/,
      /quickAddKeyboardBottomOffset/,
      /bottomOffset=\{/,
      /contentContainerStyle=\{styles\.content\}/,
      /snapPoints=\{snapPoints\}/,
      /const snapPoints = useMemo/,
    ],
  });
});

test('pending focus is invalidated and keyboard is dismissed on every competing close path', () => {
  assertSourceIncludes(source, [
    /const invalidateTitleFocusRequest = useCallback\(\(\) => \{[\s\S]*titleFocusRequestIdRef\.current \+= 1;[\s\S]*pendingTitleFocusRequestIdRef\.current = null;/,
    /const requestClose = useCallback\(\(\) => \{[\s\S]*invalidateTitleFocusRequest\(\);[\s\S]*Keyboard\.dismiss\(\);/,
    /const handleDismiss = useCallback\(\(\) => \{[\s\S]*invalidateTitleFocusRequest\(\);[\s\S]*Keyboard\.dismiss\(\);/,
    /return \(\) => \{[\s\S]*invalidateTitleFocusRequest\(\);/,
  ]);
});

test('date and time pickers dismiss the keyboard before opening', () => {
  assertSourceIncludes(source, [
    /const openDatePicker = useCallback\(\(\) => \{[\s\S]*invalidateTitleFocusRequest\(\);[\s\S]*Keyboard\.dismiss\(\);[\s\S]*setIsDatePickerOpen\(true\);/,
    /const openTimePicker = useCallback\(\(\) => \{[\s\S]*invalidateTitleFocusRequest\(\);[\s\S]*Keyboard\.dismiss\(\);[\s\S]*setIsTimePickerOpen\(true\);/,
    /onSelectCustomDate=\{openDatePicker\}/,
    /onSelectCustomTime=\{openTimePicker\}/,
  ]);
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
  const compactTimeSource = timeSelectorSource.slice(
    timeSelectorSource.indexOf('{isCompact ? ('),
    timeSelectorSource.indexOf(') : (') + 5,
  );

  assertSourceIncludes(compactTimeSource, [
    /name="time-outline"/,
    /color=\{!isPresetTime \? palette\.white : palette\.ink\}/,
  ]);
  assertSourceIncludes(timeSelectorSource, [
    /const customTimeLabel = isCompact && !isPresetTime \? value : '時刻';/,
    /isCompact \? customTimeLabel : '時刻を選ぶ'/,
    /numberOfLines=\{1\}/,
  ]);
});

test('quick add accepts configured presets for display and today correction', () => {
  assertSourceContract(source, {
    includes: [
      /presets\?: TimePreset\[\]/,
      /getNextAvailableTimeForToday\([^\n]*presets/,
      /<TimeSelector[\s\S]*presets=\{presets\}/,
    ],
    excludes: [/function getNextAvailableTimeForToday/],
  });
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
