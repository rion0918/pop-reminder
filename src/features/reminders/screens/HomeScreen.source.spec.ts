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

test('home add button stays a compact floating action button', () => {
  const addButtonStart = source.indexOf('accessibilityLabel="リマインダーを追加"');
  const addButtonBlock = source.slice(
    addButtonStart,
    source.indexOf('</Pressable>', addButtonStart),
  );
  const addButtonStyleBlock = source.slice(
    source.indexOf('addButton: {'),
    source.indexOf('addButtonDisabled:'),
  );

  assertSourceContract(addButtonBlock, {
    includes: [
      /styles\.addButton/,
      /<Ionicons name="add" size=\{30\} color=\{palette\.white\} \/>/,
    ],
    excludes: [/className=/, />追加<\/Text>/],
  });
  assertSourceContract(addButtonStyleBlock, {
    includes: [
      /width: 64/,
      /height: 64/,
      /borderRadius: 32/,
      /alignItems: 'center'/,
      /justifyContent: 'center'/,
      /backgroundColor: palette\.skyDeep/,
      /flexShrink: 0/,
    ],
    excludes: [/position: 'absolute'/, /right: 24/, /bottom: 28/],
  });
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
  const bottomControlsBlock = source.slice(
    source.indexOf('bottomControls:'),
    source.indexOf('bottomControlsCompact:'),
  );
  const bottomControlsCompactBlock = source.slice(
    source.indexOf('bottomControlsCompact:'),
    source.indexOf('dueLegend:'),
  );
  const dueLegendBlock = source.slice(
    source.indexOf('dueLegend:'),
    source.indexOf('dueLegendCompact:'),
  );
  const dueLegendCompactBlock = source.slice(
    source.indexOf('dueLegendCompact:'),
    source.indexOf('dueLegendBubble:'),
  );

  assertSourceIncludes(source, [
    /useWindowDimensions/,
    /const isCompactPhoneWidth = windowWidth <= 360;/,
    /style=\{\[styles\.bottomControls, isCompactPhoneWidth \? styles\.bottomControlsCompact : null\]\}/,
    /style=\{\[styles\.dueLegend, isCompactPhoneWidth \? styles\.dueLegendCompact : null\]\}/,
    /styles\.addButton,[\s\S]*pressed && !isAddButtonDisabled \? styles\.addButtonPressed : null,/,
  ]);
  assertSourceIncludes(bottomControlsBlock, [
    /position: 'absolute'/,
    /left: 24/,
    /right: 24/,
    /bottom: 28/,
    /flexDirection: 'row'/,
    /alignItems: 'center'/,
    /gap: 12/,
  ]);
  assertSourceIncludes(bottomControlsCompactBlock, [/left: 16/, /right: 16/]);
  assertSourceContract(dueLegendBlock, {
    includes: [/flex: 1/, /minWidth: 0/],
    excludes: [/position: 'absolute'/, /left: 24/, /right: 136/, /bottom: 34/],
  });
  assertSourceContract(dueLegendCompactBlock, {
    includes: [/paddingHorizontal: 8/],
    excludes: [/left: 16/, /right: 116/],
  });
});
