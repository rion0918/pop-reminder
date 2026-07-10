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
      /<View style=\{styles\.deleteButtonSpacer\}>[\s\S]*<PrimaryButton[\s\S]*style=\{styles\.deleteButton\}[\s\S]*<\/View>/,
      /deleteButtonSpacer: \{[\s\S]*marginTop: 26,/,
    ],
    excludes: [/snapPoints=\{snapPoints\}/, /const snapPoints = useMemo/, /\['48%', '68%'\]/],
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
