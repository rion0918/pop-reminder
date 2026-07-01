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
    ],
    excludes: [/snapPoints=\{snapPoints\}/, /const snapPoints = useMemo/, /\['48%', '68%'\]/],
  });
});
