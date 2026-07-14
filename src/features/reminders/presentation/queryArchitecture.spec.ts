import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const querySource = readSource(import.meta.url, './useRemindersQuery.ts');
const providersSource = readSource(import.meta.url, '../../../bootstrap/AppProviders.tsx');
const storeSource = readSource(import.meta.url, '../stores/reminderUiStore.ts');
const screensSource = [
  readSource(import.meta.url, '../screens/HomeScreen.tsx'),
  readSource(import.meta.url, '../screens/ReminderListScreen.tsx'),
  readSource(import.meta.url, '../screens/SearchScreen.tsx'),
].join('\n');

test('all reminder screens share the active reminders query cache', () => {
  assertSourceIncludes(querySource, [
    /\['reminders', 'active'\] as const/,
    /retry: false/,
    /queryClient\.setQueryData<Reminder\[]>/,
    /queryClient\.invalidateQueries\(\{ queryKey: activeRemindersQueryKey \}\)/,
  ]);
  assertSourceIncludes(screensSource, [
    /useRemindersQuery as useReminders/,
    /useRemindersQuery as useReminders/,
    /useRemindersQuery as useReminders/,
  ]);
});

test('app focus and target time both trigger SQLite reconciliation', () => {
  assertSourceIncludes(providersSource, [
    /const isActive = state === 'active'/,
    /focusManager\.setFocused\(isActive\)/,
    /Platform\.OS === 'web'/,
  ]);
  assertSourceIncludes(querySource, [
    /const reconcileExpiredReminders = useCallback\(async \(\) => \{[\s\S]*await services\.reminders\.cleanup\(\);[\s\S]*await refetch\(\);/,
    /const scheduleRefresh = \(\) => \{/,
    /Math\.min\(remainingMs, MAX_REFRESH_TIMER_MS\)/,
    /scheduleRefresh\(\);/,
    /void reconcileExpiredReminders\(\);/,
  ]);
});

test('Zustand owns only the quick-add draft and development settings', () => {
  assertSourceContract(storeSource, {
    includes: [/isQuickAddOpen/, /title: string/, /dateOffset/, /timeDigits/],
    excludes: [/isSaving/, /selectedReminderId/],
  });
});

test('target time updates flow through the shared query cache on every reminder screen', () => {
  assertSourceIncludes(querySource, [
    /const updateTargetTimeMutation = useMutation/,
    /services\.reminders\.updateTargetTime/,
    /updateReminderTargetTime:/,
  ]);
  assertSourceIncludes(screensSource, [/updateReminderTargetTime/, /onUpdateTargetTime=/]);
});
