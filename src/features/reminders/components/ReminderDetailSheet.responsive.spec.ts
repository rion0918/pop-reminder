import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceContract, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderDetailSheet.tsx');

test('reminder detail sheet sizes to content and keeps delete action reachable', () => {
  assertSourceContract(source, {
    includes: [
      /BottomSheetScrollView/,
      /useWindowDimensions/,
      /useSafeAreaInsets/,
      /const detailMaxDynamicContentSize = useMemo/,
      /windowHeight - sheetTopInset - safeAreaInsets\.bottom - DETAIL_SHEET_BOTTOM_CLEARANCE/,
      /const detailContentBottomPadding = useMemo/,
      /enableDynamicSizing/,
      /maxDynamicContentSize=\{detailMaxDynamicContentSize\}/,
      /topInset=\{sheetTopInset\}/,
      /bottomInset=\{safeAreaInsets\.bottom\}/,
      /contentContainerStyle=\{\[styles\.content, \{ paddingBottom: detailContentBottomPadding \}\]\}/,
      /keyboardShouldPersistTaps="handled"/,
      /<View style=\{styles\.deleteActionSpacer\}>[\s\S]*accessibilityLabel="このシャボン玉を削除する"[\s\S]*<View style=\{styles\.deleteActionContent\}>[\s\S]*name="trash-outline"[\s\S]*<Text style=\{styles\.deleteActionText\}>削除する<\/Text>[\s\S]*<\/View>[\s\S]*<\/View>/,
      /deleteActionSpacer: \{[\s\S]*marginTop: 34,/,
      /deleteActionSpacer: \{[\s\S]*alignItems: 'center',[\s\S]*borderTopWidth: 1,/,
      /deleteAction: \{[\s\S]*minWidth: 124,[\s\S]*minHeight: 44,[\s\S]*borderRadius: 16,/,
      /deleteActionContent: \{[\s\S]*flexDirection: 'row',/,
      /deleteActionPressed: \{[\s\S]*transform: \[\{ scale: 0\.98 \}\],[\s\S]*backgroundColor: 'rgba\(255,228,184,0\.46\)',/,
    ],
    excludes: [
      /snapPoints=\{snapPoints\}/,
      /const snapPoints = useMemo/,
      /\['48%', '68%'\]/,
      /<PrimaryButton/,
      /backgroundColor: palette\.peachDeep/,
    ],
  });
});

test('reminder detail sheet presents the editable target before the shared previous notification', () => {
  const targetLabelIndex = source.indexOf('当日にもう一度お知らせ');
  const previousLabelIndex = source.indexOf('まず、前日にお知らせ');

  assert.notEqual(targetLabelIndex, -1);
  assert.notEqual(previousLabelIndex, -1);
  assert.ok(targetLabelIndex < previousLabelIndex);

  assertSourceContract(source, {
    includes: [
      />ふわっと思い出す予定<\/Text>/,
      /numberOfLines=\{2\}/,
      /まず、前日にお知らせ/,
      /当日にもう一度お知らせ/,
      /formatReminderDetailDate/,
      /formatReminderDetailTime/,
      /formatReminderDetailAccessibilityDateTime/,
      /accessibilityLabel=\{`前日のお知らせ、\$\{previousAccessibilityDateTime\}`\}/,
      /accessibilityLabel="当日のお知らせ時刻を編集"/,
      /accessibilityHint=\{targetAccessibilityDateTime\}/,
      /ImageBackground/,
      /reminder-detail-bubbles\.png/,
      /styles\.targetScheduleCard/,
      /styles\.targetTimeHint/,
      /styles\.scheduleDivider/,
      /styles\.previousScheduleRow/,
      /name="notifications-outline"/,
      /closeButton: \{[\s\S]*width: 48,[\s\S]*height: 48,[\s\S]*borderRadius: 24,/,
    ],
    excludes: [
      /function DetailRow/,
      />お知らせ予定<\/Text>/,
      /name="notifications"/,
      /styles\.timelineCard/,
      /styles\.timelineLine/,
    ],
  });
});

test('reminder detail sheet edits only the target time and labels the shared previous time', () => {
  assertSourceContract(source, {
    includes: [
      /すべての泡に共通/,
      /accessibilityLabel="当日のお知らせ時刻を編集"/,
      /onUpdateTargetTime:/,
      /const handleTargetTimeConfirm = useCallback/,
      /<TimePickerModal/,
      /onConfirm=\{handleTargetTimeConfirm\}/,
      /過去の時刻には変更できません/,
      /時刻は変更しましたが、通知を予約できませんでした/,
    ],
    excludes: [
      /accessibilityLabel="前日のお知らせ時刻を編集"/,
      /name="create-outline"/,
      /targetEditIcon/,
    ],
  });
});

test('reminder detail sheet edits and saves the title when its field loses focus', () => {
  assertSourceContract(source, {
    includes: [
      /BottomSheetTextInput/,
      /const draftTitleRef = useRef\(reminder\?\.title \?\? ''\);/,
      /onUpdateTitle: \(reminder: Reminder, title: string\) => Promise<Reminder>;/,
      /isTitleEditing \? \(/,
      /accessibilityLabel="タイトルを編集"/,
      /accessibilityLabel="リマインダーのタイトル"/,
      /defaultValue=\{draftTitleRef\.current\}/,
      /onChangeText=\{\(text\) => \{\s*draftTitleRef\.current = text;\s*\}\}/,
      /keyboardType="default"/,
      /autoCorrect/,
      /spellCheck=\{false\}/,
      /autoCapitalize="none"/,
      /onBlur=\{handleTitleBlur\}/,
      /onSubmitEditing=\{\(\) => titleInputRef\.current\?\.blur\(\)\}/,
      /const normalizedTitle = draftTitleRef\.current\.trim\(\);/,
      /reminderTitleSchema\.safeParse\(normalizedTitle\)/,
      /requestAnimationFrame\(\(\) => \{/,
      /discardTitleEdit\(\);/,
      /onAnimate=\{handleSheetAnimate\}/,
    ],
    excludes: [/value=\{draftTitle\}/, /onChangeText=\{setDraftTitle\}/],
  });
});

test('reminder detail sheet closes only the reminder that was dismissed', () => {
  assertSourceContract(source, {
    includes: [
      /onClose: \(closedReminderId: string \| null\) => void;/,
      /const displayedReminderIdRef = useRef<string \| null>\(null\);/,
      /const closingReminderIdRef = useRef<string \| null>\(null\);/,
      /const latestReminderIdRef = useRef<string \| null>\(null\);/,
      /const closedReminderId = closingReminderIdRef\.current \?\? displayedReminderIdRef\.current;/,
      /const pendingReminderId = latestReminderIdRef\.current;/,
      /onClose\(closedReminderId\);/,
      /if \(pendingReminderId && pendingReminderId !== closedReminderId\) \{/,
    ],
    excludes: [/onClose: \(\) => void;/],
  });
});

test('reminder detail sheet can present a new reminder after stale closing state', () => {
  assertSourceContract(source, {
    includes: [
      /displayedReminderIdRef\.current = reminder\.id;/,
      /if \(!isPresentedRef\.current\) \{\s*isClosingRef\.current = false;[\s\S]*sheetRef\.current\?\.present\(\);/,
      /closingReminderIdRef\.current = displayedReminderIdRef\.current;/,
    ],
    excludes: [/if \(!isPresentedRef\.current && !isClosingRef\.current\) \{/],
  });
});

test('reminder detail sheet starts deletion after the sheet actually dismisses', () => {
  assertSourceContract(source, {
    includes: [
      /const pendingDeleteReminderRef = useRef<Reminder \| null>\(null\);/,
      /const pendingDeleteReminder = pendingDeleteReminderRef\.current;/,
      /pendingDeleteReminderRef\.current = null;/,
      /void onDelete\(pendingDeleteReminder\)/,
      /pendingDeleteReminderRef\.current = reminder;/,
      /sheetRef\.current\?\.dismiss\(\);/,
    ],
    excludes: [/setTimeout\(\(\) => \{[\s\S]*void onDelete\(reminder\)/, /\}, 160\);/],
  });
});

test('reminder detail sheet starts deletion directly from the delete action', () => {
  assertSourceContract(source, {
    includes: [
      /const handleDeletePress = useCallback\(/,
      /isDeleteRequestedRef\.current = true;/,
      /setIsDeleting\(true\);/,
      /pendingDeleteReminderRef\.current = reminder;/,
      /closingReminderIdRef\.current = displayedReminderIdRef\.current;/,
      /sheetRef\.current\?\.dismiss\(\);/,
      /accessibilityLabel="このシャボン玉を削除する"/,
      /onPress=\{handleDeletePress\}/,
    ],
    excludes: [
      /<Modal/,
      /isDeleteConfirmationVisible/,
      /handleCancelDelete/,
      /handleConfirmDelete/,
      /この泡を手放しますか？/,
      /残しておく/,
      /deleteConfirmCard/,
    ],
  });
});
