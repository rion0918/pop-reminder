import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderInputSheet.tsx');
const imeSafeTitleInputSource = readSource(import.meta.url, './ImeSafeReminderTitleInput.tsx');
const dateChipsSource = readSource(import.meta.url, './DateChips.tsx');
const rootLayoutSource = readSource(import.meta.url, '../../../app/_layout.tsx');
const timeSelectorSource = readSource(
  import.meta.url,
  '../../../shared/components/TimeSelector.tsx',
);
const reminderSchemaSource = readSource(import.meta.url, '../schemas/reminderSchema.ts');

test('quick add shows a live accessible title character count from the validation limit', () => {
  assertSourceIncludes(reminderSchemaSource, [
    /export const REMINDER_TITLE_MAX_LENGTH = 40;/,
    /\.max\(REMINDER_TITLE_MAX_LENGTH, 'タイトルは40文字以内で保存できます'\)/,
  ]);
  assertSourceIncludes(imeSafeTitleInputSource, [
    /import \{ REMINDER_TITLE_MAX_LENGTH \} from '\.\.\/schemas\/reminderSchema';/,
    /const \[titleLength, setTitleLength\] = useState/,
    /setTitleLength\(text\.length\);/,
    /const isTitleOverLimit = titleLength > REMINDER_TITLE_MAX_LENGTH;/,
    /const titleCountAccessibilityLabel = isTitleOverLimit/,
    /accessibilityLabel=\{titleCountAccessibilityLabel\}/,
    /\{titleLength\} \/ \{REMINDER_TITLE_MAX_LENGTH\}/,
  ]);
  assertSourceIncludes(source, [
    /normalizedTitle\.length > REMINDER_TITLE_MAX_LENGTH/,
    /<ImeSafeReminderTitleInput/,
  ]);
});

test('quick add keeps the title input at the standard body text size', () => {
  assertSourceIncludes(source, [
    /input: \{[\s\S]*?fontSize: 14,[\s\S]*?lineHeight: 22,[\s\S]*?fontWeight: '700',/,
  ]);
});

test('quick add keeps the character count visible while the title input is focused', () => {
  const focusedInputStyle = source.slice(
    source.indexOf('  inputFocused: {'),
    source.indexOf('  titleCountText: {'),
  );

  assert.equal(focusedInputStyle.includes('elevation:'), false);
});

test('quick add supports cancellable on-device voice input without truncating the draft', () => {
  assertSourceIncludes(source, [
    /voiceStatus === 'idle' \? '音声入力を開始' : '音声入力を終了'/,
    /voiceInput\.start\(\)/,
    /voiceInput\.stop\(\)/,
    /voiceInput\.abort\(\)/,
    /voiceBaselineTitleRef\.current/,
    /replaceDraftTitle\(voiceBaselineTitleRef\.current\)/,
    /joinVoiceText\(voiceBaselineTitleRef\.current, currentTranscript\)/,
    /const pendingVoiceStartAfterEndEditingRef = useRef\(false\);/,
    /if \(titleInputRef\.current\?\.isFocused\(\)\) \{[\s\S]*pendingVoiceStartAfterEndEditingRef\.current = true;[\s\S]*titleInputRef\.current\.blur\(\);[\s\S]*return;/,
    /if \(pendingVoiceStartAfterEndEditingRef\.current\) \{[\s\S]*beginVoiceInputRef\.current\(\);[\s\S]*return;/,
    /AccessibilityInfo\.isReduceMotionEnabled\(\)/,
    /reduceMotionEnabled \? 1 :/,
    /音声入力を開始しました/,
    /内容を確認してください/,
  ]);
  assertSourceIncludes(source, [
    /await voiceInput\.downloadJapaneseModel\(\);\s*if \(voiceOperationIdRef\.current !== operationId\) return;/,
  ]);
  assertSourceContract(source, {
    excludes: [
      /slice\(0, REMINDER_TITLE_MAX_LENGTH\)/,
      /substring\(0, REMINDER_TITLE_MAX_LENGTH\)/,
    ],
  });
});

test('voice input always exposes a labeled finish action and escapes a stuck native stop', () => {
  assertSourceIncludes(source, [
    /const VOICE_STOP_FALLBACK_MS = 1_500;/,
    /const voiceStopFallbackRef = useRef<ReturnType<typeof setTimeout> \| null>\(null\);/,
    /voiceStopFallbackRef\.current = setTimeout\(/,
    /voiceStatusRef\.current !== 'stopping'/,
    /voiceInput\.abort\(\);/,
    /AccessibilityInfo\.announceForAccessibility\(\s*'音声入力を終了しました。内容を確認してください'/,
    /accessibilityLabel="音声入力を完了"/,
    />完了</,
  ]);
  assertSourceContract(source, {
    excludes: [/<View\s+accessible\s+accessibilityLiveRegion="polite"/],
  });
});

test('successful quick add does not focus the title input again', () => {
  const saveSuccessBlock = source.slice(
    source.indexOf('await onSave?.(normalizedTitle);'),
    source.indexOf('} catch {'),
  );

  assert.equal(saveSuccessBlock.includes('focus()'), false);
});

test('quick add waits for native end editing before saving an active IME session', () => {
  assertSourceContract(source, {
    includes: [
      /const pendingSaveAfterEndEditingRef = useRef\(false\);/,
      /if \(titleInputRef\.current\?\.isFocused\(\)\) \{[\s\S]*pendingSaveAfterEndEditingRef\.current = true;[\s\S]*titleInputRef\.current\.blur\(\);[\s\S]*return;/,
      /const handleTitleEndEditing = useCallback\([\s\S]*pendingSaveAfterEndEditingRef\.current[\s\S]*void commitSave\(text\);/,
      /onEndEditing=\{handleTitleEndEditing\}/,
    ],
    excludes: [/value=\{draftTitle\}/, /const \[draftTitle, setDraftTitleText\]/],
  });
  assertSourceIncludes(imeSafeTitleInputSource, [/submitBehavior="blurAndSubmit"/]);
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
  assert.equal(openBlock.includes('setTimeout'), false);
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
    /const openDatePicker = useCallback\(\(\) => \{[\s\S]*invalidateTitleFocusRequest\(\);[\s\S]*Keyboard\.dismiss\(\);[\s\S]*setQuickAddPickerOpen\(true\);[\s\S]*setIsDatePickerOpen\(true\);/,
    /const openTimePicker = useCallback\(\(\) => \{[\s\S]*invalidateTitleFocusRequest\(\);[\s\S]*Keyboard\.dismiss\(\);[\s\S]*setQuickAddPickerOpen\(true\);[\s\S]*setIsTimePickerOpen\(true\);/,
    /const closeDatePicker = useCallback\(\(\) => \{[\s\S]*setQuickAddPickerOpen\(false\);/,
    /const closeTimePicker = useCallback\(\(\) => \{[\s\S]*setQuickAddPickerOpen\(false\);/,
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
