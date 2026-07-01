import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './useReminders.ts');

test('useReminders exposes an immediate local removal helper', () => {
  assertSourceIncludes(source, [
    /const removeReminder = useCallback\(\(id: string\) => \{/,
    /setReminders\(\(current\) => current\.filter\(\(item\) => item\.id !== id\)\);/,
    /removeReminder,/,
  ]);
});
