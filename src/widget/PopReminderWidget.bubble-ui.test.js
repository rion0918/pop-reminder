/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('android widget bubbles reuse the in-app bubble visual system', () => {
  const source = readFileSync(__dirname + '/PopReminderWidget.tsx', 'utf8');

  assert.match(source, /OverlapWidget/);
  assert.match(source, /SvgWidget/);
  assert.match(source, /formatReminderBubbleDateTime/);
  assert.match(source, /function makeBubbleSvg/);
  assert.match(source, /getWidgetBubbleTypography/);
  assert.match(source, /homeVisualTokens\.bubbleTintMistOpacity/);
  assert.match(source, /homeVisualTokens\.bubbleInnerColorRimOpacity/);
  assert.match(source, /outerGlassRing/);
  assert.match(source, /highlightLarge/);
  assert.match(source, /textShadowColor: 'rgba\(255,255,255,0\.58\)'/);
  assert.doesNotMatch(source, /function truncateTitle/);
  assert.doesNotMatch(source, /const displayTitle = truncateTitle/);
});

test('android widget due colors come from the app bubble tokens', () => {
  const colorsSource = readFileSync(__dirname + '/widgetColors.ts', 'utf8');

  assert.match(colorsSource, /bubbleDueColors/);
  assert.match(colorsSource, /homeVisualTokens/);
  assert.match(colorsSource, /return bubbleDueColors\.today/);
  assert.match(colorsSource, /return bubbleDueColors\.tomorrow/);
  assert.match(colorsSource, /return bubbleDueColors\.soon/);
  assert.match(colorsSource, /return bubbleDueColors\.later/);
  assert.doesNotMatch(colorsSource, /background: '#FEE2E2'/);
  assert.doesNotMatch(colorsSource, /background: '#EFF6FF'/);
});

test('manual widget refresh keeps using the actual widget size', () => {
  const source = readFileSync(__dirname + '/widgetUpdateService.tsx', 'utf8');

  assert.match(source, /renderWidget: \(\{ width, height \}\) =>/);
  assert.match(source, /widgetWidth=\{width\}/);
  assert.match(source, /widgetHeight=\{height\}/);
});

test('widget refresh paths share the same optimized reminder snapshot', () => {
  const updateSource = readFileSync(__dirname + '/widgetUpdateService.tsx', 'utf8');
  const taskHandlerSource = readFileSync(__dirname + '/widgetTaskHandler.tsx', 'utf8');

  assert.match(updateSource, /import \{ getWidgetReminders \} from '\.\/widgetReminderSnapshot';/);
  assert.match(taskHandlerSource, /import \{ getWidgetReminders \} from '\.\/widgetReminderSnapshot';/);
  assert.match(updateSource, /let widgetUpdateQueue: Promise<void> = Promise\.resolve\(\);/);
  assert.match(updateSource, /widgetUpdateQueue = widgetUpdateQueue\.then\(runWidgetUpdate, runWidgetUpdate\);/);
  assert.doesNotMatch(updateSource, /expo-sqlite/);
  assert.doesNotMatch(updateSource, /expo-file-system/);
  assert.doesNotMatch(taskHandlerSource, /function getActiveReminders/);
  assert.doesNotMatch(taskHandlerSource, /SELECT id, title, target_at/);
});

test('android widget bubbles reuse the app idle motion shape on each render', () => {
  const source = readFileSync(__dirname + '/PopReminderWidget.tsx', 'utf8');

  assert.match(source, /type WidgetIdleMotionConfig/);
  assert.match(source, /function makeWidgetIdleMotionConfig/);
  assert.match(source, /function getWidgetMotionFrame/);
  assert.match(source, /Math\.sin\(phase \* Math\.PI \* 2\) \* motion\.amplitudeX/);
  assert.match(source, /Math\.cos\(phase \* Math\.PI \* 2\) \* motion\.amplitudeY/);
  assert.match(source, /rotation: motionFrame\.rotation/);
  assert.match(source, /marginLeft: motionFrame\.translateX/);
  assert.match(source, /`overflow-\$\{count\}`/);
  assert.match(source, /empty-state/);
});
