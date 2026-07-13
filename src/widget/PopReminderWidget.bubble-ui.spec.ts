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

test('android widget renders reminders as rounded glass list rows', () => {
  assertSourceContract(source, {
    includes: [
      /function ReminderListRow/,
      /WIDGET_STATUS_DOT_SIZE/,
      /backgroundColor: color\.background as ColorProp/,
      /borderColor: color\.border as ColorProp/,
      /formatReminderBubbleDateTime/,
      /truncate="END"/,
      /action=view&id=\$\{reminder\.id\}/,
      /plan\.listRows\.map/,
    ],
    excludes: [
      /function WidgetReminderBubble/,
      /function OverflowBubble/,
      /makeBubbleSvg/,
      /getReminderBubbleTypography/,
      /getReminderTitleVisualLength/,
      /text=\{`\+\$\{count\}`\}/,
    ],
  });
});

test('android widget reuses the app deadline color contract for its status dots', () => {
  assertSourceIncludes(source, [
    /import \{ getReminderDueColor \} from '\.\.\/features\/reminders\/utils\/reminderDueColor';/,
    /const color = getReminderDueColor\(reminder\.targetAt\)/,
  ]);
  assertSourceContract(colorsSource, {
    excludes: [/differenceInCalendarDays/, /widgetDueColors/, /getWidgetDueColor/],
  });
});

test('android widget aligns each notification date at the right edge of its card', () => {
  const reminderListRowSource = source.slice(
    source.indexOf('function ReminderListRow'),
    source.indexOf('function EmptyState'),
  );

  assertSourceIncludes(reminderListRowSource, [
    /width: typography\.timeWidth/,
    /textAlign: 'right'/,
  ]);
  assert.equal(/marginTop: mode === 'compact' \? 0 : 1/.test(reminderListRowSource), false);
});

test('android widget keeps the selected app-name header and bottom add action', () => {
  assertSourceContract(source, {
    includes: [
      /function WidgetHeader/,
      /text="ポップ・リマインダー"/,
      /function AddReminderButton/,
      /text="＋ 追加"/,
      /backgroundGradient: widgetTheme\.plusButtonGradient/,
      /popreminder:\/\/\?action=add/,
      /plan\.addButton/,
    ],
    excludes: [/text="次の予定"/, /checkbox/i, /checkmark/i, /チェック/],
  });
  assertSourceIncludes(colorsSource, [
    /glassVeil: 'rgba\(247,251,255,0\.38\)'/,
    /cardSurface: 'rgba\(255,255,255,0\.58\)'/,
    /cardBorder: 'rgba\(255,255,255,0\.78\)'/,
    /cardShadow: 'rgba\(38,49,81,0\.10\)'/,
    /plusButtonGradient: \{/,
    /from: '#9ED8FF'/,
    /to: '#C4E8FF'/,
  ]);
});

test('android widget uses local time-based sky assets behind a lightweight glass veil', () => {
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
      /backgroundColor: widgetTheme\.glassVeil as ColorProp/,
    ],
    excludes: [/SvgWidget/, /makeFrostedGlassSurfaceSvg/],
  });

  const skyAssetBlock = source.slice(
    source.indexOf('const widgetSkyAssets'),
    source.indexOf('function WidgetHeader'),
  );
  assert.equal(/https?:\/\//.test(skyAssetBlock), false);
});

test('widget sky changes are refreshed by the native periodic widget update', () => {
  assertSourceIncludes(appConfigSource, [
    /"name": "PopReminderWidget"[\s\S]*"updatePeriodMillis": 1800000/,
  ]);
});

test('android widget layout source defines dense rows with a maximum of eight reminders', () => {
  assertSourceContract(layoutSource, {
    includes: [
      /export type WidgetListRowLayout/,
      /listRows:/,
      /listBounds:/,
      /header:/,
      /addButton:/,
      /WIDGET_MAX_VISIBLE_REMINDERS = 8/,
      /WIDGET_LIST_ROW_MIN_HEIGHT = 39/,
      /getListRows/,
    ],
    excludes: [
      /WidgetReminderBubbleLayout/,
      /reminderBubbles:/,
      /bubbleSlots:/,
      /overflowBubble/,
      /getBubbleSlots/,
    ],
  });
  assertSourceIncludes(source, [/paddingVertical: 2/]);
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

test('widget source keeps a bubble-free empty state', () => {
  assertSourceContract(source, {
    includes: [/text="予定はありません"/, /text="＋ 追加から予定を登録"/],
    excludes: [/泡/],
  });
});
