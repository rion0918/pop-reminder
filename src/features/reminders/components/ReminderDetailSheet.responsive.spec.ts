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
      /deleteActionSpacer: \{[\s\S]*marginTop: 28,/,
      /deleteActionSpacer: \{[\s\S]*alignItems: 'flex-end',/,
      /deleteAction: \{[\s\S]*minWidth: 132,[\s\S]*minHeight: 52,[\s\S]*borderRadius: 18,/,
      /deleteActionContent: \{[\s\S]*flexDirection: 'row',/,
      /deleteActionPressed: \{[\s\S]*transform: \[\{ scale: 0\.98 \}\],[\s\S]*backgroundColor: '#FFE4B8',/,
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

test('reminder detail sheet presents notification timing as an accessible timeline', () => {
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
      /accessibilityLabel=\{`当日のお知らせ、\$\{targetAccessibilityDateTime\}`\}/,
      /<View style=\{styles\.timelineLine\} \/>/,
      /name="notifications-outline"/,
      /name="notifications"/,
      /closeButton: \{[\s\S]*width: 44,[\s\S]*height: 44,[\s\S]*borderRadius: 22,/,
    ],
    excludes: [/function DetailRow/, />お知らせ予定<\/Text>/],
  });
});

test('reminder detail sheet edits and saves the title when its field loses focus', () => {
  assertSourceContract(source, {
    includes: [
      /BottomSheetTextInput/,
      /onUpdateTitle: \(reminder: Reminder, title: string\) => Promise<Reminder>;/,
      /isTitleEditing \? \(/,
      /accessibilityLabel="タイトルを編集"/,
      /accessibilityLabel="リマインダーのタイトル"/,
      /onBlur=\{handleTitleBlur\}/,
      /onSubmitEditing=\{\(\) => titleInputRef\.current\?\.blur\(\)\}/,
      /reminderTitleSchema\.safeParse\(normalizedTitle\)/,
      /requestAnimationFrame\(\(\) => \{/,
      /discardTitleEdit\(\);/,
      /onAnimate=\{handleSheetAnimate\}/,
    ],
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

test('reminder detail sheet confirms deletion in a custom bubble card', () => {
  assertSourceContract(source, {
    includes: [
      /Modal/,
      /const \[isDeleteConfirmationVisible, setIsDeleteConfirmationVisible\] = useState\(false\);/,
      /setIsDeleteConfirmationVisible\(true\);/,
      /const handleCancelDelete = useCallback\(/,
      /const handleConfirmDelete = useCallback\(/,
      /<Modal[\s\S]*visible=\{isDeleteConfirmationVisible\}[\s\S]*onRequestClose=\{handleCancelDelete\}/,
      /accessibilityLabel="削除確認を閉じる"/,
      />\s*この泡を手放しますか？\s*<\/Text>/,
      />\s*予約したお知らせも、いっしょに消えます。\s*<\/Text>/,
      />\s*残しておく\s*<\/Text>/,
      /accessibilityLabel="このシャボン玉を削除する"/,
      />\s*手放す\s*<\/Text>/,
      /deleteConfirmCard: \{[\s\S]*borderRadius: 28,/,
      /deleteConfirmActions: \{[\s\S]*justifyContent: 'flex-end',/,
      /deleteConfirmActionPressed: \{[\s\S]*transform: \[\{ scale: 0\.98 \}\]/,
    ],
    excludes: [/Alert\.alert\(\s*'このシャボン玉を消しますか？'/],
  });
});
