import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, '../presentation/useRemindersQuery.ts');

test('useReminders exposes an immediate local removal helper', () => {
  assertSourceIncludes(source, [
    /const removeReminder = useCallback\(\s*\(id: string\) => \{/,
    /queryClient\.setQueryData<Reminder\[]>\(activeRemindersQueryKey/,
    /current\.filter\(\(item\) => item\.id !== id\)/,
    /removeReminder,/,
  ]);
});
