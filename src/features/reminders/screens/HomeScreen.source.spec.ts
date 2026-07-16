import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './HomeScreen.tsx');

test('home presents the fuwatto name and catchphrase as a responsive brand lockup', () => {
  const brandLockup = source.slice(
    source.indexOf('<Image source={appIcon}'),
    source.indexOf('accessibilityLabel="設定を開く"'),
  );

  assertSourceContract(brandLockup, {
    includes: [
      />\s*ふわっと。\s*<\/Text>/,
      />\s*忘れる前に、数秒だけ。\s*<\/Text>/,
      /adjustsFontSizeToFit/,
      /minimumFontScale=\{0\.72\}/,
    ],
    excludes: [/ポップ・リマインダー/, /ふわっと残す/],
  });
});

test('home add button is visually disabled only while saving', () => {
  assertSourceContract(source, {
    includes: [
      /const isAddButtonDisabled = isSaving;/,
      /if \(isQuickAddOpenRef\.current \|\| isSaving\)/,
    ],
    excludes: [/const isAddButtonDisabled = isQuickAddOpen \|\| isSaving;/],
  });
});

test('home replaces bottom controls with the add bubble only for a settled empty query', () => {
  assertSourceIncludes(source, [
    /const isEmptyHome = !loading && !error && reminders\.length === 0;/,
    /styles\.bubbleBoardContainer,[\s\S]*isEmptyHome \? styles\.bubbleBoardContainerEmpty : null/,
    /onEmptyPress=\{handlePressAdd\}/,
    /emptyDisabled=\{isAddButtonDisabled\}/,
    /\{!isEmptyHome \? \([\s\S]*styles\.bottomControls[\s\S]*\) : null\}/,
    /bubbleBoardContainerEmpty: \{[\s\S]*marginBottom: 0/,
  ]);
});

test('home keeps the selected theme background without a fixed atmospheric overlay', () => {
  assertSourceContract(source, {
    includes: [/<AppScreen theme=\{settings\?\.theme \?\? 'sky'\}>/, /ambientThree: \{/],
    excludes: [/HOME_BACKGROUND_COLORS/, /ambientBubble:/, /ambientSparkle:/],
  });
});

test('home keeps non-deleted reminder bubbles floating during burst delete work', () => {
  const idleDisabledBlock = source.slice(
    source.indexOf('const isBubbleIdleDisabled ='),
    source.indexOf('const nextReminder ='),
  );

  assert.equal(idleDisabledBlock.includes('Boolean(burstingReminderId)'), false);
  assert.equal(idleDisabledBlock.includes('isQuickAddOpen'), false);
  assert.equal(idleDisabledBlock.includes('selectedReminder'), false);
  assertSourceIncludes(idleDisabledBlock, [/const isBubbleIdleDisabled = isSaving;/]);
  assertSourceIncludes(source, [/deleteMotion=\{deleteMotion\}/]);
});

test('opening quick add keeps reminder bubble positions pinned', () => {
  assertSourceIncludes(source, [/<ReminderBubbleBoard/, /freezeLayout=\{isQuickAddOpen\}/]);
});

test('home presents the next reminder as a compact bubble card that opens its detail', () => {
  const nextReminderStart = source.indexOf('{nextReminder ? (');
  const nextReminderBlock = source.slice(
    nextReminderStart,
    source.indexOf('<View className="mb-[104px]', nextReminderStart),
  );
  const nextReminderStyles = source.slice(
    source.indexOf('nextReminderCard: {'),
    source.indexOf('bottomControls: {'),
  );

  assertSourceIncludes(source, [
    /const reminderDetailBubbles = require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/assets\/reminder-detail-bubbles\.png['"]\);/,
    /const nextReminder = reminders\[0\] \?\? null;/,
    /const nextReminderLabel = nextReminder[\s\S]*formatReminderBubbleDateTime\(nextReminder\.targetAt\)/,
    /const nextReminderAccessibilityLabel = nextReminder[\s\S]*formatReminderDetailAccessibilityDateTime\(nextReminder\.targetAt\)/,
  ]);
  assertSourceContract(nextReminderBlock, {
    includes: [
      /<Pressable/,
      /accessibilityRole="button"/,
      /accessibilityLabel=\{nextReminderAccessibilityLabel\}/,
      /accessibilityHint="詳細を開きます"/,
      /onPress=\{\(\) => setSelectedReminderId\(nextReminder\.id\)\}/,
      /styles\.nextReminderCard/,
      /styles\.nextReminderCardPressed/,
      /<ImageBackground/,
      /source=\{reminderDetailBubbles\}/,
      /resizeMode="cover"/,
      /name="notifications-outline"/,
      />次のリマインド<\/Text>/,
      /numberOfLines=\{1\}[\s\S]*ellipsizeMode="tail"[\s\S]*\{nextReminder\.title\}/,
      /numberOfLines=\{1\}[\s\S]*\{nextReminderLabel\}/,
    ],
    excludes: [/完璧！/, /忘れたくないことはありません/, /name="time-outline"/],
  });
  assertSourceIncludes(nextReminderStyles, [
    /nextReminderCard: \{[\s\S]*minHeight: 68,[\s\S]*borderRadius: 24,[\s\S]*borderWidth: 1/,
    /nextReminderIcon: \{[\s\S]*width: 40,[\s\S]*height: 40,[\s\S]*borderRadius: 20/,
    /nextReminderContent: \{[\s\S]*minWidth: 0,[\s\S]*flex: 1/,
    /nextReminderKicker: \{[\s\S]*fontSize: 11/,
    /nextReminderTitle: \{[\s\S]*fontSize: 15/,
    /nextReminderDateTime: \{[\s\S]*flexShrink: 0,[\s\S]*fontSize: 12/,
    /nextReminderCardPressed: \{[\s\S]*opacity: 0\.88,[\s\S]*transform: \[\{ scale: 0\.99 \}\]/,
  ]);
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
      /className="[^"]*h-\[64px\][^"]*"/,
      /className="[^"]*w-\[64px\][^"]*"/,
      /className="[^"]*shrink-0[^"]*"/,
      /className="[^"]*items-center[^"]*"/,
      /className="[^"]*justify-center[^"]*"/,
      /className="[^"]*rounded-\[32px\][^"]*"/,
      /<LinearGradient[\s\S]*colors=\{\[addButtonVisualTokens\.gradientFrom, addButtonVisualTokens\.gradientTo\]\}/,
      /styles\.addButtonSurface/,
      /styles\.addButton/,
      /<Ionicons name="add" size=\{30\} color=\{addButtonVisualTokens\.text\} \/>/,
    ],
    excludes: [/>追加<\/Text>/, /bg-app-ink/, /border-\[2px\]/],
  });
  assertSourceContract(addButtonStyleBlock, {
    includes: [
      /borderWidth: 1/,
      /borderColor: addButtonVisualTokens\.border/,
      /overflow: 'hidden'/,
      /shadowColor: palette\.ink/,
      /shadowOffset: \{ width: 0, height: 12 \}/,
      /shadowOpacity: 0\.24/,
      /shadowRadius: 18/,
      /elevation: 6/,
    ],
    excludes: [
      /position: 'absolute'/,
      /right: 24/,
      /bottom: 28/,
      /backgroundColor: palette\.skyDeep/,
    ],
  });

  assertSourceIncludes(source, [
    /addButtonSurface: \{[\s\S]*borderRadius: 32/,
    /addButtonVisualTokens\.gradientFrom/,
    /addButtonVisualTokens\.gradientTo/,
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

test('home refreshes app settings when returning to focus', () => {
  assertSourceIncludes(source, [
    /const \{ settings, refresh: refreshSettings \} = useAppSettings\(\);/,
    /useFocusEffect\(\s*useCallback\(\(\) => \{\s*void refreshSettings\(\);\s*\}, \[refreshSettings\]\),\s*\);/,
  ]);
});

test('home picks the next future quick-add preset for the initial time', () => {
  assertSourceIncludes(source, [
    /const quickAddPresets = useMemo\(/,
    /settings\.defaultTargetTime/,
    /settings\.noonTargetTime/,
    /settings\.eveningTargetTime/,
    /settings\.nightTargetTime/,
    /getNextAvailableTimeForToday\(new Date\(\), quickAddPresets\)/,
    /openQuickAdd\(getQuickAddDefaultTime\(\)/,
    /<ReminderInputSheet[\s\S]*defaultTargetTime=\{getQuickAddDefaultTime\(\)\}[\s\S]*presets=\{quickAddPresets\}/,
  ]);
  assertSourceContract(source, {
    excludes: [/openQuickAdd\(quickAddPresets\[0\]\.time/],
  });
});

test('home warns when a reminder is saved without a target notification', () => {
  assertSourceIncludes(source, [
    /result\.notification\.status/,
    /リマインダーは保存しましたが、通知を予約できませんでした/,
    /設定を確認/,
    /router\.push\('\/settings'\)/,
  ]);
});

test('home removes deleted reminders locally before the silent database refresh', () => {
  assertSourceContract(source, {
    includes: [
      /removeReminder,/,
      /removeReminder\(reminder\.id\);[\s\S]*void refresh\(\{ silent: true \}\);/,
    ],
    excludes: [/await refresh\(\);/],
  });
});

test('home reflects an edited reminder title without waiting for a refresh', () => {
  assertSourceIncludes(source, [
    /updateReminderTitle,/,
    /const handleUpdateReminderTitle = useCallback\(/,
    /const updatedReminder = await updateReminderTitle\(reminder\.id, title\);/,
    /onUpdateTitle=\{handleUpdateReminderTitle\}/,
  ]);
});

test('home waits for the reported bubble motion instead of a fixed timer', () => {
  assertSourceContract(source, {
    includes: [
      /BubbleDeleteMotionPhase/,
      /const \[deleteMotion, setDeleteMotion\] = useState<BubbleDeleteMotion \| null>\(null\);/,
      /waitForDeleteMotion/,
      /handleDeleteMotionComplete/,
      /Promise\.allSettled\(\[/,
      /deleteReminder\(reminder\.id, \{ deferCache: true \}\)/,
      /waitForDeleteMotion\(reminder\.id, 'bursting'\)/,
      /onDeleteMotionComplete=\{handleDeleteMotionComplete\}/,
    ],
    excludes: [/REMINDER_BUBBLE_BURST_MS/, /deleteTimeoutRef/, /setTimeout\(\s*resolve/],
  });
});

test('home restores a burst bubble before propagating delete failures', () => {
  assertSourceIncludes(source, [
    /setDeleteMotion\(\{ reminderId: reminder\.id, phase: 'restoring' \}\);/,
    /await waitForDeleteMotion\(reminder\.id, 'restoring'\);/,
    /throw deleteError;/,
  ]);
});

test('home ignores stale detail sheet dismisses after another reminder is selected', () => {
  assertSourceIncludes(source, [
    /const selectedReminderIdRef = useRef<string \| null>\(null\);/,
    /selectedReminderIdRef\.current = selectedReminderId;/,
    /const handleCloseReminderDetail = useCallback\(\s*\(closedReminderId: string \| null\) => \{/,
    /if \(selectedReminderIdRef\.current === closedReminderId\) \{[\s\S]*setSelectedReminderId\(null\);[\s\S]*\}/,
    /onClose=\{handleCloseReminderDetail\}/,
  ]);
});

test('android hardware back closes reminder sheets before leaving home', () => {
  assertSourceIncludes(source, [
    /BackHandler/,
    /Platform/,
    /const selectedReminderRef = useRef<Reminder \| null>\(null\);/,
    /selectedReminderRef\.current = selectedReminder;/,
    /const isReminderDeletionInProgressRef = useRef\(false\);/,
    /const closeQuickAdd = useReminderUiStore\(\(state\) => state\.closeQuickAdd\);/,
    /Platform\.OS !== ['"]android['"]/,
    /BackHandler\.addEventListener\(['"]hardwareBackPress['"]/,
    /if \(isReminderDeletionInProgressRef\.current\) \{\s*return true;\s*\}/,
    /if \(selectedReminderRef\.current\) \{/,
    /setSelectedReminderId\(null\);/,
    /if \(isQuickAddOpenRef\.current\) \{/,
    /closeQuickAdd\(\);/,
    /subscription\.remove\(\);/,
  ]);
});

test('home keeps Android back handling active until reminder deletion settles', () => {
  assertSourceIncludes(source, [
    /isReminderDeletionInProgressRef\.current = true;/,
    /finally \{\s*isReminderDeletionInProgressRef\.current = false;\s*\}/,
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
