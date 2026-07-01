/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('reminder detail sheet sizes to content and keeps delete action reachable', () => {
  const source = readFileSync(__dirname + '/ReminderDetailSheet.tsx', 'utf8');

  assert.match(source, /BottomSheetScrollView/);
  assert.match(source, /useWindowDimensions/);
  assert.match(source, /useSafeAreaInsets/);
  assert.match(source, /const detailMaxDynamicContentSize = useMemo/);
  assert.match(
    source,
    /windowHeight - sheetTopInset - safeAreaInsets\.bottom - DETAIL_SHEET_BOTTOM_CLEARANCE/,
  );
  assert.match(source, /const detailContentBottomPadding = useMemo/);
  assert.match(source, /enableDynamicSizing/);
  assert.match(source, /maxDynamicContentSize=\{detailMaxDynamicContentSize\}/);
  assert.match(source, /topInset=\{sheetTopInset\}/);
  assert.match(source, /bottomInset=\{safeAreaInsets\.bottom\}/);
  assert.match(
    source,
    /contentContainerStyle=\{\[styles\.content, \{ paddingBottom: detailContentBottomPadding \}\]\}/,
  );
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.doesNotMatch(source, /snapPoints=\{snapPoints\}/);
  assert.doesNotMatch(source, /const snapPoints = useMemo/);
  assert.doesNotMatch(source, /\['48%', '68%'\]/);
});
