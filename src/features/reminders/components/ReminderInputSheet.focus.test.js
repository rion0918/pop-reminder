/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('successful quick add does not focus the title input again', () => {
  const source = readFileSync(__dirname + '/ReminderInputSheet.tsx', 'utf8');

  const saveSuccessBlock = source.slice(
    source.indexOf('await onSave?.(normalizedTitle);'),
    source.indexOf('} catch {'),
  );

  assert.equal(saveSuccessBlock.includes('focus()'), false);
});

test('quick add sheet uses the compact one-screen layout', () => {
  const source = readFileSync(__dirname + '/ReminderInputSheet.tsx', 'utf8');

  assert.match(source, /topInset=\{sheetTopInset\}/);
  assert.match(source, /styles\.inputHeader/);
  assert.match(source, /variant="compact"/);
  assert.match(source, /styles\.actionRow/);
  assert.doesNotMatch(source, /styles\.sheetTitle/);
});

test('quick add sheet sizes to content instead of leaving keyboard gap', () => {
  const source = readFileSync(__dirname + '/ReminderInputSheet.tsx', 'utf8');

  assert.match(source, /BottomSheetScrollView/);
  assert.match(source, /enableDynamicSizing/);
  assert.match(source, /useWindowDimensions/);
  assert.match(source, /const quickAddMaxDynamicContentSize = useMemo/);
  assert.match(source, /windowHeight - sheetTopInset - QUICK_ADD_BOTTOM_CLEARANCE/);
  assert.match(source, /maxDynamicContentSize=\{quickAddMaxDynamicContentSize\}/);
  assert.match(source, /contentContainerStyle=\{styles\.content\}/);
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.doesNotMatch(source, /QUICK_ADD_MAX_DYNAMIC_CONTENT_SIZE = 360/);
  assert.doesNotMatch(source, /snapPoints=\{snapPoints\}/);
  assert.doesNotMatch(source, /const snapPoints = useMemo/);
});

test('custom date chip shows the selected date after picking one', () => {
  const source = readFileSync(__dirname + '/DateChips.tsx', 'utf8');

  assert.match(source, /formatCustomDate\(customDate\)/);
  assert.match(source, /customActive \? formatCustomDate\(customDate\) : '日付'/);
  assert.match(source, /numberOfLines=\{1\}/);
});

test('compact custom time chip shows the selected time after picking one', () => {
  const source = readFileSync(__dirname + '/../../../shared/components/TimeSelector.tsx', 'utf8');

  assert.match(source, /const customTimeLabel = isCompact && !isPresetTime \? value : '時刻';/);
  assert.match(source, /isCompact \? customTimeLabel : '時刻を選ぶ'/);
  assert.match(source, /numberOfLines=\{1\}/);
});
