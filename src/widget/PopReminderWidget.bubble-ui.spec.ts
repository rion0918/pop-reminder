import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './PopReminderWidget.tsx');
const layoutSource = readSource(import.meta.url, './widgetBubbleLayout.ts');
const colorsSource = readSource(import.meta.url, './widgetColors.ts');
const updateSource = readSource(import.meta.url, './widgetUpdateService.tsx');
const taskHandlerSource = readSource(import.meta.url, './widgetTaskHandler.tsx');

test('android widget bubbles reuse the in-app bubble visual system', () => {
  assertSourceContract(source, {
    includes: [
      /OverlapWidget/,
      /SvgWidget/,
      /formatReminderBubbleDateTime/,
      /function makeBubbleSvg/,
      /getWidgetBubbleTypography/,
      /homeVisualTokens\.bubbleTintMistOpacity/,
      /homeVisualTokens\.bubbleInnerColorRimOpacity/,
      /outerGlassRing/,
      /highlightLarge/,
      /textShadowColor: 'rgba\(255,255,255,0\.58\)'/,
    ],
    excludes: [/function truncateTitle/, /const displayTitle = truncateTitle/],
  });
});

test('android widget due colors come from the app bubble tokens', () => {
  assertSourceContract(colorsSource, {
    includes: [
      /bubbleDueColors/,
      /homeVisualTokens/,
      /return bubbleDueColors\.today/,
      /return bubbleDueColors\.tomorrow/,
      /return bubbleDueColors\.soon/,
      /return bubbleDueColors\.later/,
    ],
    excludes: [/background: '#FEE2E2'/, /background: '#EFF6FF'/],
  });
});

test('android widget floats on a frosted glass surface with a bare top-right add icon', () => {
  assertSourceIncludes(colorsSource, [
    /headerText: 'rgba\(255,255,255,0\.90\)'/,
    /mutedText: 'rgba\(255,255,255,0\.72\)'/,
    /cloudSurfaceBackground: 'rgba\(247,251,255,0\.46\)'/,
    /cloudSurfaceBorder: 'rgba\(255,255,255,0\.62\)'/,
    /cloudMistHighlight: 'rgba\(255,255,255,0\.44\)'/,
    /cloudMistShade: 'rgba\(38,49,81,0\.16\)'/,
    /glassRefractionA: 'rgba\(223,243,255,0\.42\)'/,
    /glassRefractionB: 'rgba\(237,230,255,0\.36\)'/,
    /glassRefractionC: 'rgba\(255,241,216,0\.32\)'/,
    /glassInnerShadow: 'rgba\(38,49,81,0\.18\)'/,
    /glassEdgeHighlight: 'rgba\(255,255,255,0\.78\)'/,
    /plusIconText: palette\.white/,
    /textHalo: 'rgba\(38,49,81,0\.58\)'/,
  ]);
  assertSourceContract(source, {
    includes: [
      /function makeFrostedGlassSurfaceSvg/,
      /<SvgWidget\s+svg=\{makeFrostedGlassSurfaceSvg\(widgetWidth, widgetHeight\)\}/,
      /backgroundColor: widgetTheme\.cloudSurfaceBackground as ColorProp/,
      /borderColor: widgetTheme\.cloudSurfaceBorder as ColorProp/,
      /color: widgetTheme\.plusIconText as ColorProp/,
      /textShadowColor: widgetTheme\.textHalo as ColorProp/,
      /id="glassVeil"/,
      /id="glassRefractionA"/,
      /id="glassRefractionB"/,
      /id="glassRefractionC"/,
      /id="glassInnerShadow"/,
      /id="glassFrostGrain"/,
      /id="glassLeftDepth"/,
      /id="glassBottomDepth"/,
      /id="glassTopEdge"/,
      /id="glassBottomEdge"/,
      /text="\+"/,
      /popreminder:\/\/\?action=add/,
    ],
    excludes: [
      /function makeCloudSurfaceSvg/,
      /feGaussianBlur/,
      /filter="url/,
      /cloudSurfaceBackground: 'rgba\(239,248,255,0\.24\)'/,
      /cloudSurfaceBackground: 'rgba\(14,18,30,0\.22\)'/,
      /backgroundColor: widgetTheme\.background/,
      /borderColor: widgetTheme\.borderColor/,
      /text="ポップ・リマインダー"/,
      /text="追加"/,
      /plusButtonBackground/,
      /plusButtonBorder/,
    ],
  });
});

test('android widget scatters bubbles across the available glass surface', () => {
  assertSourceContract(source, {
    includes: [
      /getWidgetBubbleCapacity/,
      /getWidgetBubbleLayouts/,
      /type WidgetBubbleLayout/,
      /const visibleReminderItems = visibleReminders\.flatMap/,
      /const layout = bubbleLayouts\.get\(reminder\.id\)/,
      /layout=\{layout\}/,
      /marginLeft: layout\.left \+ motionFrame\.translateX/,
      /marginTop: layout\.top \+ motionFrame\.translateY/,
      /const visibleCapacity = getWidgetBubbleCapacity\(widgetWidth, widgetHeight\)/,
      /const visibleReminders = reminders\.slice\(0, visibleReminderLimit\)/,
      /getWidgetBubbleLayouts\(layoutItems, widgetWidth, widgetHeight\)\.map/,
    ],
    excludes: [
      /const MAX_VISIBLE = 3/,
      /flexGap: WIDGET_BUBBLE_GAP/,
      /visibleCount=\{bubbleCount\}/,
      /const BUBBLE_LAYOUT_ANCHORS/,
      /rightReserve/,
    ],
  });
  assertSourceIncludes(layoutSource, [
    /export const WIDGET_MAX_VISIBLE_BUBBLES = 10/,
    /export type WidgetBubbleLayout/,
    /function getWidgetBubbleCapacity\(widgetWidth: number, widgetHeight: number\)/,
    /const area = widgetWidth \* widgetHeight/,
    /function getWidgetBubbleLayout/,
    /function getWidgetBubbleLayouts/,
    /const WIDGET_LAYOUT_CANDIDATE_SLOTS/,
    /function getPreferredSlotDistance/,
    /function getOverlapPenalty/,
    /function getCenterBandPenalty/,
    /function getAddButtonRect/,
  ]);
});

test('android widget bubble capacity scales from small to large widgets', () => {
  assertSourceIncludes(layoutSource, [
    /if \(area < 38000\) \{\s*return 2;\s*\}/,
    /if \(area < 62000\) \{\s*return 3;\s*\}/,
    /if \(area < 90000\) \{\s*return 5;\s*\}/,
    /return WIDGET_MAX_VISIBLE_BUBBLES/,
  ]);
  assertSourceContract(layoutSource, {
    excludes: [/if \(area < 125000\)/, /if \(area < 165000\)/],
  });
});

test('android widget reserves one of ten slots for overflow when needed', () => {
  assertSourceIncludes(source, [
    /const visibleCapacity = getWidgetBubbleCapacity\(widgetWidth, widgetHeight\)/,
    /reminders\.length > visibleCapacity \? Math\.max\(1, visibleCapacity - 1\) : visibleCapacity/,
    /const visibleReminders = reminders\.slice\(0, visibleReminderLimit\)/,
    /const overflowCount = Math\.max\(0, reminders\.length - visibleReminderLimit\)/,
    /overflowCount > 0 \? \[\.\.\.visibleReminders, overflowReminder\] : visibleReminders/,
  ]);
});

test('android widget shows a bottom due color legend without overlapping scattered bubbles', () => {
  assertSourceIncludes(source, [
    /const WIDGET_DUE_LEGEND_ITEMS = \[/,
    /label: '今日'[\s\S]*bubbleDueColors\.today/,
    /label: '明日'[\s\S]*bubbleDueColors\.tomorrow/,
    /label: '2-3日'[\s\S]*bubbleDueColors\.soon/,
    /label: '4日\+'[\s\S]*bubbleDueColors\.later/,
    /function WidgetDueLegend/,
    /WIDGET_DUE_LEGEND_ITEMS\.map/,
    /text=\{item\.label\}/,
    /svg=\{makeLegendBubbleSvg\(item\.id, item\.color\)\}/,
    /marginTop: Math\.max\(0, widgetHeight - WIDGET_SURFACE_PADDING - WIDGET_DUE_LEGEND_HEIGHT\)/,
    /<WidgetDueLegend widgetWidth=\{widgetWidth\} widgetHeight=\{widgetHeight\} \/>/,
  ]);
  assertSourceIncludes(layoutSource, [
    /export const WIDGET_DUE_LEGEND_HEIGHT = 42/,
    /function getLegendReserve/,
    /return WIDGET_DUE_LEGEND_HEIGHT \+ WIDGET_SURFACE_PADDING/,
    /widgetHeight - edgePadding - legendReserve - dimensions\.height/,
  ]);
});

test('manual widget refresh keeps using the actual widget size', () => {
  assertSourceIncludes(updateSource, [
    /renderWidget: \(\{ width, height \}\) =>/,
    /widgetWidth=\{width\}/,
    /widgetHeight=\{height\}/,
  ]);
});

test('widget refresh paths share the same optimized reminder snapshot', () => {
  assertSourceIncludes(updateSource, [
    /import \{ getWidgetReminders \} from '\.\/widgetReminderSnapshot';/,
    /let widgetUpdateQueue: Promise<void> = Promise\.resolve\(\);/,
    /widgetUpdateQueue = widgetUpdateQueue\.then\(runWidgetUpdate, runWidgetUpdate\);/,
  ]);
  assertSourceIncludes(taskHandlerSource, [
    /import \{ getWidgetReminders \} from '\.\/widgetReminderSnapshot';/,
  ]);
  assertSourceContract(updateSource, {
    excludes: [/expo-sqlite/, /expo-file-system/],
  });
  assertSourceContract(taskHandlerSource, {
    excludes: [/function getActiveReminders/, /SELECT id, title, target_at/],
  });
});

test('android widget bubbles reuse the app idle motion shape on each render', () => {
  assertSourceIncludes(source, [
    /type WidgetIdleMotionConfig/,
    /function makeWidgetIdleMotionConfig/,
    /function getWidgetMotionFrame/,
    /Math\.sin\(phase \* Math\.PI \* 2\) \* motion\.amplitudeX/,
    /Math\.cos\(phase \* Math\.PI \* 2\) \* motion\.amplitudeY/,
    /rotation: motionFrame\.rotation/,
    /marginLeft: layout\.left \+ motionFrame\.translateX/,
    /`overflow-\$\{count\}`/,
    /empty-state/,
  ]);
});
