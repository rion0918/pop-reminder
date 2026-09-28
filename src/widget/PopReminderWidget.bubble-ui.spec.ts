import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './PopReminderWidget.tsx');
const layoutSource = readSource(import.meta.url, './widgetBubbleLayout.ts');
const colorsSource = readSource(import.meta.url, './widgetColors.ts');
const visualsSource = readSource(import.meta.url, './widgetVisuals.ts');
const snapshotSource = readSource(import.meta.url, './widgetReminderSnapshot.ts');
const appConfigSource = readSource(import.meta.url, '../../app.json');
const nativeWidgetConfigSource = readSource(
  import.meta.url,
  '../../android/app/src/main/res/xml/widgetprovider_popreminderwidget.xml',
);
const updateSource = readSource(import.meta.url, './widgetUpdateService.tsx');
const taskHandlerSource = readSource(import.meta.url, './widgetTaskHandler.tsx');

test('android widget promotes the nearest reminder and renders the rest as a queue', () => {
  assertSourceContract(source, {
    includes: [
      /function ReminderRow/,
      /reminder\.isExpired \? '期限済み · ' : ''/,
      /layout\.reminderId/,
      /rows\.map/,
      /formatReminderBubbleDateTime/,
      /truncate="END"/,
      /action=view&id=\$\{encodeURIComponent\(reminder\.id\)\}/,
    ],
    excludes: [/function OverflowBubble/, /getReminderTitleVisualLength/, /getWidgetMotionFrame/],
  });
});

test('widget uses a small decorative glass asset and keeps deletion in the detail screen', () => {
  assertSourceIncludes(source, [/ImageWidget/, /WIDGET_GLASS_BUBBLE/]);
  assertSourceContract(source, {
    excludes: [/function DeleteReminderButton/, /makeWidgetTrashSvg/],
  });
});

test('header remains quiet and the bottom action opens quick add', () => {
  assertSourceIncludes(source, [
    /function WidgetHeader/,
    /text="ふわっと。"/,
    /text="次のリマインド"/,
    /function AddReminderButton/,
    /backgroundGradient: widgetGradient\(theme\.addButtonGradient\)/,
    /accessibilityLabel="リマインダーを追加"/,
    /popreminder:\/\/\?action=add/,
    /layout=\{plan\.addButton\}/,
  ]);
});

test('widget uses theme-aware lightweight material without bitmap scenery', () => {
  assertSourceContract(`${source}\n${colorsSource}\n${visualsSource}`, {
    includes: [
      /theme\?: AppTheme/,
      /getWidgetTheme\(theme\)/,
      /widgetThemes: Record<AppTheme, WidgetThemeTokens>/,
      /surfaceGradient/,
      /heroGradient/,
      /ImageWidget/,
    ],
    excludes: [
      /makeWidgetBackdropSvg/,
      /adjustsFontSizeToFit/,
      /ImageRequireSource/,
      /widgetSky/,
      /widget-sky-/,
      /getWidgetSkyPeriod/,
    ],
  });
});

test('empty widget keeps the same persistent quick-add action', () => {
  assertSourceIncludes(source, [
    /function EmptyState/,
    /text="リマインダーはありません"/,
    /text="追加する"/,
    /accessibilityLabel="リマインダーを追加"/,
    /<EmptyState bounds=\{plan\.queueBounds\} theme=\{colors\} \/>/,
    /<AddReminderButton layout=\{plan\.addButton\} mode=\{plan\.mode\} theme=\{colors\} \/>/,
  ]);
});

test('android widget layout contract defines hero, queue, overflow, and eight-item maximum', () => {
  assertSourceContract(layoutSource, {
    includes: [
      /hero: WidgetReminderLayout \| null/,
      /queueBounds: WidgetRect/,
      /queueRows: WidgetReminderLayout\[\]/,
      /overflowCount: number/,
      /WIDGET_MAX_VISIBLE_REMINDERS = 8/,
      /WIDGET_QUEUE_ROW_HEIGHT = 48/,
      /makeQueueRows/,
    ],
    excludes: [/reminderBubbles:/, /bubbleSlots:/, /getBubbleSlots/],
  });
});

test('widget snapshot carries persisted theme through every refresh path', () => {
  assertSourceIncludes(snapshotSource, [
    /export type WidgetSnapshot/,
    /reminders: WidgetReminder\[\]/,
    /theme: AppTheme/,
    /SELECT theme/,
    /FROM app_settings/,
    /coerceAppTheme\(row\?\.theme \?\? 'lavender'\)/,
    /await initializeDatabase\(\);/,
    /throw error;/,
  ]);
  assertSourceIncludes(updateSource, [
    /import \{ getWidgetSnapshot \} from '\.\/widgetReminderSnapshot';/,
    /const snapshot = await getWidgetSnapshot\(\)/,
    /reminders=\{snapshot\.reminders\}/,
    /theme=\{snapshot\.theme\}/,
    /renderWidget: \(\{ width, height \}\) =>/,
    /widgetWidth=\{width\}/,
    /widgetHeight=\{height\}/,
    /await enqueueWidgetTask\(runWidgetUpdate\);/,
  ]);
  assertSourceIncludes(taskHandlerSource, [
    /import \{ getWidgetSnapshot \} from '\.\/widgetReminderSnapshot';/,
    /theme=\{snapshot\.theme\}/,
    /WIDGET_DELETE_REMINDER_ACTION/,
    /widgetServices\.reminders\.delete\(reminderId\)/,
  ]);
  assertSourceContract(updateSource, { excludes: [/expo-sqlite/, /expo-file-system/] });
});

test('android widget retains rounded native click feedback', () => {
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

test('native periodic updates respect auto-delete while the app is closed', () => {
  assertSourceIncludes(appConfigSource, [
    /"name": "PopReminderWidget"[\s\S]*"updatePeriodMillis": 1800000/,
  ]);
  assertSourceIncludes(nativeWidgetConfigSource, [/android:updatePeriodMillis="1800000"/]);
  assertSourceIncludes(snapshotSource, [
    /autoDeleteEnabled/,
    /auto_delete_enabled/,
    /includeExpired/,
    /status = 'expired'/,
    /expires_at <= \?/,
    /ORDER BY/,
  ]);
});
