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

test('android widget floats on a clouded glass surface with a bare top-right add icon', () => {
  const source = readFileSync(__dirname + '/PopReminderWidget.tsx', 'utf8');
  const colorsSource = readFileSync(__dirname + '/widgetColors.ts', 'utf8');

  assert.match(colorsSource, /cloudSurfaceBackground: 'rgba\(255,255,255,0\.44\)'/);
  assert.match(colorsSource, /cloudSurfaceBorder: 'rgba\(255,255,255,0\.24\)'/);
  assert.match(colorsSource, /cloudMistHighlight/);
  assert.match(colorsSource, /cloudMistShade/);
  assert.match(colorsSource, /plusIconText/);
  assert.match(colorsSource, /textHalo/);
  assert.match(source, /function makeCloudSurfaceSvg/);
  assert.match(source, /<SvgWidget\s+svg=\{makeCloudSurfaceSvg\(widgetWidth, widgetHeight\)\}/);
  assert.doesNotMatch(source, /backgroundColor: widgetTheme\.background/);
  assert.doesNotMatch(source, /borderColor: widgetTheme\.borderColor/);
  assert.match(source, /backgroundColor: widgetTheme\.cloudSurfaceBackground as ColorProp/);
  assert.match(source, /borderColor: widgetTheme\.cloudSurfaceBorder as ColorProp/);
  assert.match(source, /color: widgetTheme\.plusIconText as ColorProp/);
  assert.match(source, /textShadowColor: widgetTheme\.textHalo as ColorProp/);
  assert.match(source, /text="\+"/);
  assert.match(source, /popreminder:\/\/\?action=add/);
  assert.doesNotMatch(source, /text="ポップ・リマインダー"/);
  assert.doesNotMatch(source, /text="追加"/);
  assert.doesNotMatch(source, /plusButtonBackground/);
  assert.doesNotMatch(source, /plusButtonBorder/);
});

test('android widget scatters bubbles across the available glass surface', () => {
  const source = readFileSync(__dirname + '/PopReminderWidget.tsx', 'utf8');

  assert.doesNotMatch(source, /const MAX_VISIBLE = 3/);
  assert.match(source, /const WIDGET_MAX_VISIBLE_BUBBLES = 8/);
  assert.match(source, /type WidgetBubbleLayout/);
  assert.match(
    source,
    /function getWidgetBubbleCapacity\(widgetWidth: number, widgetHeight: number\)/,
  );
  assert.match(source, /const area = widgetWidth \* widgetHeight/);
  assert.match(source, /function getWidgetBubbleLayout/);
  assert.match(source, /const BUBBLE_LAYOUT_ANCHORS/);
  assert.match(source, /rightReserve/);
  assert.match(source, /layout=\{bubbleLayouts\.get\(reminder\.id\)!\}/);
  assert.match(source, /marginLeft: layout\.left \+ motionFrame\.translateX/);
  assert.match(source, /marginTop: layout\.top \+ motionFrame\.translateY/);
  assert.match(
    source,
    /const visibleCapacity = getWidgetBubbleCapacity\(widgetWidth, widgetHeight\)/,
  );
  assert.match(source, /const visibleReminders = reminders\.slice\(0, visibleReminderLimit\)/);
  assert.doesNotMatch(source, /flexGap: WIDGET_BUBBLE_GAP/);
  assert.doesNotMatch(source, /visibleCount=\{bubbleCount\}/);
});

test('android widget bubble capacity scales from small to large widgets', () => {
  const source = readFileSync(__dirname + '/PopReminderWidget.tsx', 'utf8');

  assert.match(source, /if \(area < 38000\) \{\s*return 2;\s*\}/);
  assert.match(source, /if \(area < 62000\) \{\s*return 3;\s*\}/);
  assert.match(source, /if \(area < 90000\) \{\s*return 5;\s*\}/);
  assert.match(source, /return WIDGET_MAX_VISIBLE_BUBBLES/);
});

test('android widget shows a bottom due color legend without overlapping scattered bubbles', () => {
  const source = readFileSync(__dirname + '/PopReminderWidget.tsx', 'utf8');

  assert.match(source, /const WIDGET_DUE_LEGEND_HEIGHT = 42/);
  assert.match(source, /const WIDGET_DUE_LEGEND_ITEMS = \[/);
  assert.match(source, /label: '今日'[\s\S]*bubbleDueColors\.today/);
  assert.match(source, /label: '明日'[\s\S]*bubbleDueColors\.tomorrow/);
  assert.match(source, /label: '2-3日'[\s\S]*bubbleDueColors\.soon/);
  assert.match(source, /label: '4日\+'[\s\S]*bubbleDueColors\.later/);
  assert.match(source, /function WidgetDueLegend/);
  assert.match(source, /WIDGET_DUE_LEGEND_ITEMS\.map/);
  assert.match(source, /text=\{item\.label\}/);
  assert.match(source, /svg=\{makeLegendBubbleSvg\(item\.id, item\.color\)\}/);
  assert.match(source, /const legendReserve = WIDGET_DUE_LEGEND_HEIGHT \+ WIDGET_SURFACE_PADDING/);
  assert.match(source, /widgetHeight - edgePadding \* 2 - legendReserve - dimensions\.height/);
  assert.match(
    source,
    /marginTop: Math\.max\(0, widgetHeight - WIDGET_SURFACE_PADDING - WIDGET_DUE_LEGEND_HEIGHT\)/,
  );
  assert.match(
    source,
    /<WidgetDueLegend widgetWidth=\{widgetWidth\} widgetHeight=\{widgetHeight\} \/>/,
  );
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
  assert.match(
    taskHandlerSource,
    /import \{ getWidgetReminders \} from '\.\/widgetReminderSnapshot';/,
  );
  assert.match(updateSource, /let widgetUpdateQueue: Promise<void> = Promise\.resolve\(\);/);
  assert.match(
    updateSource,
    /widgetUpdateQueue = widgetUpdateQueue\.then\(runWidgetUpdate, runWidgetUpdate\);/,
  );
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
  assert.match(source, /marginLeft: layout\.left \+ motionFrame\.translateX/);
  assert.match(source, /`overflow-\$\{count\}`/);
  assert.match(source, /empty-state/);
});
