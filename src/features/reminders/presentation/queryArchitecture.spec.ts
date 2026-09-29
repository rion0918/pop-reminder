import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const querySource = readSource(import.meta.url, './useRemindersQuery.ts');
const queryMutationsSource = readSource(import.meta.url, './reminderQueryMutations.ts');
const providersSource = readSource(import.meta.url, '../../../bootstrap/AppProviders.tsx');
const storeSource = readSource(import.meta.url, '../stores/reminderUiStore.ts');
const settingsQuerySource = readSource(
  import.meta.url,
  '../../settings/presentation/useAppSettingsQuery.ts',
);
const screenSources = [
  readSource(import.meta.url, '../screens/HomeScreen.tsx'),
  readSource(import.meta.url, '../screens/ReminderListScreen.tsx'),
];
const screensSource = screenSources.join('\n');

test('all reminder screens share the active reminders query cache', () => {
  assertSourceIncludes(querySource, [
    /activeRemindersQueryKey/,
    /retry: false/,
    /queryClient\.setQueryData<Reminder\[]>/,
    /queryClient\.invalidateQueries\(\{ queryKey: activeRemindersQueryKey \}\)/,
  ]);
  assertSourceIncludes(queryMutationsSource, [/\['reminders', 'active'\] as const/]);
  for (const screenSource of screenSources) {
    assertSourceIncludes(screenSource, [/useRemindersQuery as useReminders/]);
  }
});

test('app focus and target time both trigger SQLite reconciliation', () => {
  assertSourceIncludes(providersSource, [
    /const isActive = state === 'active'/,
    /appServices\.reminders\.cleanup\(\)[\s\S]*focusManager\.setFocused\(true\)[\s\S]*invalidateQueries\(\{ queryKey: activeRemindersQueryKey \}\)/,
  ]);
  assertSourceIncludes(querySource, [
    /const reconcileExpiredReminders = useCallback\(async \(\) => \{[\s\S]*await services\.reminders\.cleanup\(\);[\s\S]*await refetch\(\);/,
    /const scheduleRefresh = \(\) => \{/,
    /Math\.max\(0, nextTarget - Date\.now\(\)\)/,
    /Math\.min\(remainingMs, MAX_REFRESH_TIMER_MS\)/,
    /scheduleRefresh\(\);/,
    /void reconcileExpiredReminders\(\);/,
  ]);
  assertSourceContract(querySource, { excludes: [/nextTarget \+ 1000/] });
});

test('changing auto-delete refreshes the shared reminder cache', () => {
  assertSourceIncludes(settingsQuerySource, [
    /activeRemindersQueryKey/,
    /autoDeleteEnabled[\s\S]*invalidateQueries\(\{ queryKey: activeRemindersQueryKey \}\)/,
  ]);
});

test('Zustand owns only the quick-add draft and development settings', () => {
  assertSourceContract(storeSource, {
    includes: [/isQuickAddOpen/, /title: string/, /dateOffset/, /timeDigits/],
    excludes: [/isSaving/, /selectedReminderId/],
  });
});

test('schedule updates flow through the shared query cache on every reminder screen', () => {
  assertSourceIncludes(querySource, [
    /const updateScheduleMutation = useMutation/,
    /services\.reminders\.updateSchedule/,
    /updateReminderSchedule:/,
  ]);
  assertSourceIncludes(screensSource, [/updateReminderSchedule/, /onUpdateSchedule=/]);
});

test('deferred deletes keep the active query stable until the owner finishes its motion', () => {
  const deleteMutationSource = querySource.slice(
    querySource.indexOf('const deleteMutation ='),
    querySource.indexOf('const updateTitleMutation ='),
  );

  assertSourceContract(deleteMutationSource, {
    includes: [
      /onSuccess: \(deleted, \{ id, deferCache \}\) => \{[\s\S]*if \(deferCache\) \{\s*return;\s*\}[\s\S]*if \(deleted\) removeReminder\(id\);[\s\S]*void reconcile\(\);/,
    ],
    excludes: [/if \(deleted && !deferCache\) removeReminder\(id\);/],
  });
});
