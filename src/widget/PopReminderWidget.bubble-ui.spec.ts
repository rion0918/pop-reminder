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
      /function HeroReminder/,
      /reminder\.isExpired \? '期限済み' : '次のリマインド'/,
      /function QueueReminderRow/,
      /plan\.hero\.reminderId/,
      /plan\.queueRows\.map/,
      /formatReminderBubbleDateTime/,
      /truncate="END"/,
      /action=view&id=\$\{reminder\.id\}/,
    ],
    excludes: [/function OverflowBubble/, /getReminderTitleVisualLength/, /getWidgetMotionFrame/],
  });
});

test('hero and queue reuse the app deadline color contract as glass bubbles', () => {
  assertSourceIncludes(source, [
    /import \{ getReminderDueColor \} from '\.\.\/features\/reminders\/utils\/reminderDueColor';/,
    /const dueColor = getReminderDueColor\(reminder\.targetAt\)/,
    /backgroundGradient: \{[\s\S]*?from: dueColor\.gradient\[0\]/,
    /borderColor: dueColor\.border as ColorProp/,
  ]);
  assertSourceContract(colorsSource, {
    excludes: [/differenceInCalendarDays/, /getWidgetDueColor/],
  });
});

test('android widget keeps a dedicated low-noise delete target on every reminder', () => {
  const deleteButtonSource = source.slice(
    source.indexOf('function DeleteReminderButton'),
    source.indexOf('function HeroReminder'),
  );

  assertSourceIncludes(`${deleteButtonSource}\n${visualsSource}`, [
    /WIDGET_ROW_ACTION_SIZE = 32/,
    /makeWidgetTrashSvg/,
    /clickAction=\{WIDGET_DELETE_REMINDER_ACTION\}/,
    /clickActionData=\{\{ id: reminder\.id \}\}/,
    /accessibilityLabel=\{`「\$\{reminder\.title\}」を削除`\}/,
  ]);
  assert.doesNotMatch(deleteButtonSource, /text="🗑"/);
});

test('header groups the brand, count chip, and top-right add action', () => {
  assertSourceIncludes(source, [
    /function WidgetHeader/,
    /text="ふわっと。"/,
    /text=\{`\$\{totalCount\}件`\}/,
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
      /SvgWidget/,
      /makeWidgetBackdropSvg/,
      /radialGradient/,
    ],
    excludes: [
      /ImageWidget/,
      /ImageRequireSource/,
      /widgetSky/,
      /widget-sky-/,
      /getWidgetSkyPeriod/,
    ],
  });
});

test('empty widget offers a clear full-surface quick-add state', () => {
  assertSourceIncludes(source, [
    /function EmptyState/,
    /text="最初のリマインドを残そう"/,
    /text="タップして追加"/,
    /accessibilityLabel="最初のリマインダーを追加"/,
    /<EmptyState bounds=\{plan\.queueBounds\} theme=\{theme\} \/>/,
    /reminders\.length > 0 \?\s*<AddReminderButton[\s\S]*?: null/,
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
      /WIDGET_QUEUE_ROW_HEIGHT = 40/,
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
    /return \{ reminders: \[\], theme: 'lavender' \}/,
  ]);
  assertSourceIncludes(updateSource, [
    /import \{ getWidgetSnapshot \} from '\.\/widgetReminderSnapshot';/,
    /const snapshot = await getWidgetSnapshot\(\)/,
    /reminders=\{snapshot\.reminders\}/,
    /theme=\{snapshot\.theme\}/,
    /renderWidget: \(\{ width, height \}\) =>/,
    /widgetWidth=\{width\}/,
    /widgetHeight=\{height\}/,
    /let widgetUpdateQueue: Promise<void> = Promise\.resolve\(\);/,
  ]);
  assertSourceIncludes(taskHandlerSource, [
    /import \{ getWidgetSnapshot \} from '\.\/widgetReminderSnapshot';/,
    /theme=\{snapshot\.theme\}/,
    /WIDGET_DELETE_REMINDER_ACTION/,
    /appServices\.reminders\.delete\(reminderId\)/,
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
    /target_notify_at <= \?/,
    /ORDER BY/,
  ]);
});
