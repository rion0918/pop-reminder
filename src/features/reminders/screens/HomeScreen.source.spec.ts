import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './HomeScreen.tsx');

test('home add button is visually disabled only while saving', () => {
  assertSourceContract(source, {
    includes: [
      /const isAddButtonDisabled = isSaving;/,
      /if \(isQuickAddOpenRef\.current \|\| isSaving\)/,
    ],
    excludes: [/const isAddButtonDisabled = isQuickAddOpen \|\| isSaving;/],
  });
});

test('opening quick add keeps reminder bubbles floating', () => {
  const idleDisabledBlock = source.slice(
    source.indexOf('const isBubbleIdleDisabled ='),
    source.indexOf('const nextReminderLabel ='),
  );

  assert.equal(idleDisabledBlock.includes('isQuickAddOpen'), false);
  assertSourceIncludes(idleDisabledBlock, [
    /isSaving/,
    /Boolean\(selectedReminder\)/,
    /Boolean\(burstingReminderId\)/,
  ]);
});

test('opening quick add keeps reminder bubble positions pinned', () => {
  assertSourceIncludes(source, [/<ReminderBubbleBoard/, /freezeLayout=\{isQuickAddOpen\}/]);
});

test('home add button gives immediate pressed feedback', () => {
  assertSourceIncludes(source, [
    /style=\{\(\{ pressed \}\) => \[/,
    /pressed && !isAddButtonDisabled \? styles\.addButtonPressed : null/,
    /addButtonPressed: \{/,
    /transform: \[\{ translateY: 2 \}, \{ scale: 0\.97 \}\]/,
  ]);
});

test('settings button gives immediate pressed feedback', () => {
  assertSourceContract(source, {
    includes: [
      /SETTINGS_BUTTON_FEEDBACK_MS/,
      /const \[isSettingsButtonPressed, setIsSettingsButtonPressed\] = useState\(false\);/,
      /setTimeout\(\(\) => \{/,
      /router\.push\(['"]\/settings['"]\);/,
      /pressed \|\| isSettingsButtonPressed \? styles\.iconButtonPressed : null/,
      /iconButtonPressed: \{/,
      /transform: \[\{ translateY: 1 \}, \{ scale: 0\.94 \}\]/,
    ],
    excludes: [/<Link href="\/settings" asChild>/],
  });
});

test('home removes deleted reminders locally before the silent database refresh', () => {
  assertSourceContract(source, {
    includes: [
      /const \{ reminders, loading, error, refresh, upsertReminder, removeReminder \} = useReminders\(\);/,
      /removeReminder\(reminder\.id\);[\s\S]*void refresh\(\{ silent: true \}\);/,
    ],
    excludes: [/await refresh\(\);/],
  });
});

test('android hardware back closes reminder sheets before leaving home', () => {
  assertSourceIncludes(source, [
    /BackHandler/,
    /Platform/,
    /const selectedReminderRef = useRef<Reminder \| null>\(null\);/,
    /selectedReminderRef\.current = selectedReminder;/,
    /const closeQuickAdd = useReminderUiStore\(\(state\) => state\.closeQuickAdd\);/,
    /Platform\.OS !== ['"]android['"]/,
    /BackHandler\.addEventListener\(['"]hardwareBackPress['"]/,
    /if \(selectedReminderRef\.current\) \{/,
    /setSelectedReminderId\(null\);/,
    /if \(isQuickAddOpenRef\.current\) \{/,
    /closeQuickAdd\(\);/,
    /subscription\.remove\(\);/,
  ]);
});

test('home bottom controls use compact spacing on narrow Android widths', () => {
  assertSourceIncludes(source, [
    /useWindowDimensions/,
    /const isCompactPhoneWidth = windowWidth <= 360;/,
    /style=\{\[styles\.dueLegend, isCompactPhoneWidth \? styles\.dueLegendCompact : null\]\}/,
    /styles\.addButton,[\s\S]*isCompactPhoneWidth \? styles\.addButtonCompact : null,/,
    /dueLegendCompact: \{[\s\S]*left: 16,[\s\S]*right: 116,[\s\S]*paddingHorizontal: 8,/,
    /addButtonCompact: \{[\s\S]*right: 16,[\s\S]*minWidth: 88,[\s\S]*paddingHorizontal: 18,/,
  ]);
});
