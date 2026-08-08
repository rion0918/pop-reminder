import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';
import {
  executeReminderBulkDelete,
  retainVisibleReminderSelection,
  startReminderSelection,
  toggleAllReminderSelection,
  toggleReminderSelection,
} from './reminderListSelection';

const source = readSource(import.meta.url, './ReminderListScreen.tsx');

test('reminder list summary keeps count inside narrow Android widths', () => {
  assertSourceIncludes(source, [
    /<View className="min-w-0 flex-1">/,
    /<Text numberOfLines=\{1\} className="text-\[12px\] font-extrabold text-app-muted">/,
    /<Text[\s\S]*className="mt-\[5px\] text-\[22px\] font-black leading-\[29px\] text-app-ink"[\s\S]*numberOfLines=\{2\}/,
    /<View className="min-h-\[42px\] min-w-\[58px\] max-w-\[34%\] shrink-0/,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*style=\{styles\.noFontPadding\}/,
    /noFontPadding: \{[\s\S]*includeFontPadding: false,/,
  ]);
});

test('reminder list reflects edited titles without leaving the list', () => {
  assertSourceIncludes(source, [
    /import \{ useRemindersQuery as useReminders \} from '..\/presentation\/useRemindersQuery';/,
    /deleteReminder,/,
    /updateReminderTitle,/,
    /const \[selectedReminderId, setSelectedReminderId\] = useState<string \| null>\(null\);/,
    /const selectedReminder = reminders\.find\(\(reminder\) => reminder\.id === selectedReminderId\) \?\? null;/,
    /const handleUpdateReminderTitle = useCallback\(/,
    /const updatedReminder = await updateReminderTitle\(reminder\.id, title\);/,
    /setSelectedReminderId\(reminder\.id\)/,
    /onUpdateTitle=\{handleUpdateReminderTitle\}/,
  ]);
});

test('reminder list supports accessible long-press selection and bulk deletion', () => {
  assertSourceIncludes(source, [
    /BackHandler\.addEventListener\('hardwareBackPress'/,
    /const \[isSelectionMode, setIsSelectionMode\] = useState\(false\)/,
    /const \[selectedReminderIds, setSelectedReminderIds\] = useState/,
    /const longPressTriggeredIdRef = useRef<string \| null>\(null\);/,
    /deleteReminders,/,
    /onLongPress=\{\(\) =>/,
    /longPressTriggeredIdRef\.current = reminder\.id;/,
    /if \(longPressTriggeredIdRef\.current === reminder\.id\)/,
    /longPressTriggeredIdRef\.current = null;/,
    /triggerReminderSelectionHaptic\(\)/,
    /checked: isSelected/,
    /\$\{selectedCount\}件選択中/,
    /allSelected=\{allRemindersSelected\}/,
    /Alert\.alert\(\s*'選択したリマインドを削除しますか？'/,
    /`\$\{selectedCount\}件のリマインドを削除します。/,
    /`\$\{selectedCount\}件を削除`/,
    /isDeletingReminders/,
    /setSelectedReminderIds\(new Set\(\)\)/,
    /長押しで複数選択できます/,
    /<ReminderSelectionBar/,
  ]);
});

test('reminder list selection transitions and bulk-delete outcomes are observable', async () => {
  const started = startReminderSelection('first');
  assert.deepEqual([...started], ['first']);
  assert.deepEqual([...toggleReminderSelection(started, 'second')], ['first', 'second']);
  assert.deepEqual([...toggleReminderSelection(new Set(['first', 'second']), 'first')], ['second']);

  const selectedAll = toggleAllReminderSelection(new Set(['first']), ['first', 'second']);
  assert.deepEqual([...selectedAll], ['first', 'second']);
  assert.deepEqual([...toggleAllReminderSelection(selectedAll, ['first', 'second'])], []);
  assert.deepEqual(
    [...retainVisibleReminderSelection(new Set(['first', 'missing']), ['first'])],
    ['first'],
  );

  let receivedIds: string[] = [];
  const success = await executeReminderBulkDelete(['first', 'second'], async (ids) => {
    receivedIds = ids;
    return ['first', 'second'];
  });
  assert.deepEqual(receivedIds, ['first', 'second']);
  assert.equal(success.ok, true);
  if (success.ok) assert.deepEqual(success.remainingSelectedIds, new Set());

  const failure = await executeReminderBulkDelete(['first', 'second'], async () => {
    throw new Error('delete failed');
  });
  assert.equal(failure.ok, false);
  if (!failure.ok) assert.deepEqual(failure.remainingSelectedIds, new Set(['first', 'second']));
});
