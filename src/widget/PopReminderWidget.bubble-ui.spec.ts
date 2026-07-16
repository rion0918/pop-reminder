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
const nativeWidgetConfigSource = readSource(
  import.meta.url,
  '../../android/app/src/main/res/xml/widgetprovider_popreminderwidget.xml',
);
const updateSource = readSource(import.meta.url, './widgetUpdateService.tsx');
const taskHandlerSource = readSource(import.meta.url, './widgetTaskHandler.tsx');

test('android widget renders reminders as rounded glass list rows', () => {
  const reminderListRowSource = source.slice(
    source.indexOf('function ReminderListRow'),
    source.indexOf('function EmptyState'),
  );
  const overlapOpeningTag = reminderListRowSource.slice(
    reminderListRowSource.indexOf('<OverlapWidget'),
    reminderListRowSource.indexOf('>', reminderListRowSource.indexOf('<OverlapWidget')) + 1,
  );

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
  assert.doesNotMatch(overlapOpeningTag, /clickAction/);
  assert.match(
    reminderListRowSource,
    /backgroundColor: widgetTheme\.cardSurface as ColorProp,[\s\S]*?clickAction="OPEN_URI"[\s\S]*?action=view&id=\$\{reminder\.id\}/,
  );
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

test('android widget exposes a per-reminder trash control on the right', () => {
  const reminderListRowSource = source.slice(
    source.indexOf('function ReminderListRow'),
    source.indexOf('function EmptyState'),
  );

  assertSourceIncludes(reminderListRowSource, [
    /text="🗑"/,
    /accessibilityLabel=\{`「\$\{reminder\.title\}」を削除`\}/,
    /clickAction=\{WIDGET_DELETE_REMINDER_ACTION\}/,
    /clickActionData=\{\{ id: reminder\.id \}\}/,
  ]);
});

test('android widget keeps the selected app-name header and bottom add action', () => {
  assertSourceContract(source, {
    includes: [
      /function WidgetHeader/,
      /text="ふわっと。"/,
      /function AddReminderButton/,
      /text="＋"/,
      /accessibilityLabel="リマインダーを追加"/,
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
    /from: addButtonVisualTokens\.gradientFrom/,
    /to: addButtonVisualTokens\.gradientTo/,
    /orientation: 'TOP_BOTTOM'/,
    /plusButtonBorder: addButtonVisualTokens\.border/,
    /plusButtonText: addButtonVisualTokens\.text/,
  ]);
});

test('android widget uses rounded heavy type without a redundant bottom-right guide', () => {
  assertSourceContract(source, {
    includes: [
      /const WIDGET_FONT_FAMILY = 'sans-serif-rounded'/,
      /fontFamily: WIDGET_FONT_FAMILY/,
      /text="ふわっと。"[\s\S]*?fontWeight: '900'/,
      /text=\{reminder\.title\}[\s\S]*?fontWeight: '900'/,
      /text=\{timeText\}[\s\S]*?fontWeight: '800'/,
      /text="＋"[\s\S]*?fontSize: 22/,
    ],
    excludes: [/text="右下から"/, /text="↓"/],
  });
});

test('android widget add button keeps a restrained pearl finish without embossed text', () => {
  const addButtonSource = source.slice(
    source.indexOf('function AddReminderButton'),
    source.indexOf('export function PopReminderWidget'),
  );

  assertSourceContract(addButtonSource, {
    includes: [
      /backgroundGradient: widgetTheme\.plusButtonGradient/,
      /borderColor: widgetTheme\.plusButtonBorder as ColorProp/,
      /color: widgetTheme\.plusButtonText as ColorProp/,
    ],
    excludes: [/textShadowColor/, /textShadowOffset/, /textShadowRadius/],
  });
});

test('android widget clips native click feedback to rounded controls', () => {
  const nativeClickableLayoutSource = readSource(
    import.meta.url,
    '../../android/app/src/main/res/layout/rn_widget_clickable.xml',
  );
  const nativeClickableRippleSource = readSource(
    import.meta.url,
    '../../android/app/src/main/res/drawable/widget_clickable_ripple.xml',
  );

  assertSourceContract(nativeClickableLayoutSource, {
    includes: [
      /android:id="@\+id\/rn_widget_clickable_positioner"/,
      /android:id="@\+id\/rn_widget_clickable_area"/,
      /android:background="@drawable\/widget_clickable_ripple"/,
    ],
    excludes: [/selectableItemBackground/],
  });
  assertSourceIncludes(nativeClickableRippleSource, [
    /<ripple/,
    /<item android:id="@android:id\/mask">/,
    /<corners android:radius="999dp"/,
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
  assertSourceIncludes(nativeWidgetConfigSource, [/android:updatePeriodMillis="1800000"/]);
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
    /import \{ appServices \} from '\.\.\/bootstrap\/appServices';/,
    /WIDGET_DELETE_REMINDER_ACTION/,
    /appServices\.reminders\.delete\(reminderId\)/,
  ]);
  assertSourceContract(updateSource, {
    excludes: [/expo-sqlite/, /expo-file-system/],
  });
  assertSourceContract(taskHandlerSource, {
    excludes: [/function getActiveReminders/, /SELECT id, title, target_at/, /action=delete/],
  });
});

test('widget empty state matches the app copy without extra add-button guidance', () => {
  assertSourceContract(source, {
    includes: [
      /text="まだ泡はひとつも浮いていません"/,
      /text="忘れたくないこと、右下からふわっとどうぞ"/,
      /<EmptyState listBounds=\{plan\.listBounds\} \/>/,
    ],
    excludes: [/text="右下から"/, /text="↓"/],
  });
});
