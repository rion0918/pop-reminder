import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './PopReminderWidget.tsx');
const layoutSource = readSource(import.meta.url, './widgetBubbleLayout.ts');
const colorsSource = readSource(import.meta.url, './widgetColors.ts');
const appConfigSource = readSource(import.meta.url, '../../app.json');
const updateSource = readSource(import.meta.url, './widgetUpdateService.tsx');
const taskHandlerSource = readSource(import.meta.url, './widgetTaskHandler.tsx');

test('android widget renders every reminder representation as a circular bubble', () => {
  assertSourceContract(source, {
    includes: [
      /function WidgetReminderBubble/,
      /function OverflowBubble/,
      /borderRadius: Math\.round\(layout\.width \/ 2\)/,
      /svg=\{makeBubbleSvg\(reminder\.id, layout\.width, layout\.height, color\)\}/,
      /text=\{`\+\$\{count\}`\}/,
      /action=view&id=\$\{reminder\.id\}/,
      /clickAction="OPEN_APP"/,
    ],
    excludes: [
      /function ReminderListRow/,
      /function PriorityBubble/,
      /function OverflowRow/,
      /WIDGET_LIST_ROW_MIN_HEIGHT/,
      /truncate="END"/,
      /text=\{`ほか\$\{count\}件`\}/,
    ],
  });
});

test('android widget keeps the shared bubble visuals and header actions', () => {
  assertSourceContract(source, {
    includes: [
      /OverlapWidget/,
      /SvgWidget/,
      /formatReminderBubbleDateTime/,
      /function makeBubbleSvg/,
      /getReminderBubbleTypography/,
      /getReminderTitleVisualLength/,
      /homeVisualTokens\.bubbleTintMistOpacity/,
      /homeVisualTokens\.bubbleInnerColorRimOpacity/,
      /text="次の予定"/,
      /text="＋ 追加"/,
      /popreminder:\/\/\?action=add/,
    ],
    excludes: [/function truncateTitle/, /const displayTitle = truncateTitle/],
  });
  assertSourceIncludes(colorsSource, [
    /cloudSurfaceBackground: '#A8D1F0'/,
    /cloudSurfaceOverlay: 'rgba\(247,251,255,0\.42\)'/,
    /plusButtonBackground: palette\.ink/,
  ]);
});

test('android widget uses local time-based sky assets behind the glass layer', () => {
  assertSourceContract(source, {
    includes: [
      /ImageWidget/,
      /import \{ getWidgetSkyPeriod(?:, type WidgetSkyPeriod)? \} from '\.\/widgetSky';/,
      /const widgetSkyAssets(?:\s*:\s*Record<WidgetSkyPeriod, ImageRequireSource>)? = \{/,
      /morning: require\('\.\.\/\.\.\/assets\/widget-sky-morning\.png'\)/,
      /day: require\('\.\.\/\.\.\/assets\/widget-sky-day\.png'\)/,
      /sunset: require\('\.\.\/\.\.\/assets\/widget-sky-sunset\.png'\)/,
      /night: require\('\.\.\/\.\.\/assets\/widget-sky-night\.png'\)/,
      /image=\{getWidgetSkyAsset\(\)\}/,
      /imageWidth=\{widgetWidth\}/,
      /imageHeight=\{widgetHeight\}/,
      /svg=\{makeFrostedGlassSurfaceSvg\(widgetWidth, widgetHeight\)\}/,
    ],
  });

  const skyAssetBlock = source.slice(
    source.indexOf('const widgetSkyAssets'),
    source.indexOf('function makeBubbleSvg'),
  );
  assert.equal(/https?:\/\//.test(skyAssetBlock), false);
});

test('widget sky changes are refreshed by the native periodic widget update', () => {
  assertSourceIncludes(appConfigSource, [
    /"name": "PopReminderWidget"[\s\S]*"updatePeriodMillis": 1800000/,
  ]);
});

test('android widget layout source has bubble slots and no row layout contract', () => {
  assertSourceContract(layoutSource, {
    includes: [
      /export type WidgetReminderBubbleLayout/,
      /reminderBubbles:/,
      /bubbleSlots:/,
      /overflowBubble\?/,
      /getWidgetLayoutPlan/,
      /getBubbleSlots/,
    ],
    excludes: [
      /WidgetListRowLayout/,
      /listRows:/,
      /priorityReminderId/,
      /getListRowHeight/,
      /makeListRows/,
    ],
  });
});

test('widget refresh paths keep the actual widget size, snapshot, and contracts', () => {
  assertSourceIncludes(updateSource, [
    /renderWidget: \(\{ width, height \}\) =>/,
    /widgetWidth=\{width\}/,
    /widgetHeight=\{height\}/,
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

test('widget source keeps explicit empty-state copy and light surface decoration', () => {
  assertSourceContract(source, {
    includes: [
      /text="予定はありません"/,
      /text="＋から泡を浮かべよう"/,
      /id="glassRefractionA"/,
      /id="glassRefractionB"/,
      /id="glassRefractionC"/,
      /id="highlightLarge"/,
      /id="highlightSmall"/,
    ],
    excludes: [/id="glassFrostGrain"/, /glassLeftDepth/, /glassBottomDepth/],
  });
});
