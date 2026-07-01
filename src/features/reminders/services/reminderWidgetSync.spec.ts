import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const createReminderSource = readSource(import.meta.url, './createReminderService.ts');
const deleteReminderSource = readSource(import.meta.url, './deleteReminderService.ts');

test('creating a reminder waits for the widget to render the latest database snapshot', () => {
  assert.equal((createReminderSource.match(/await updateWidget\(\);/g) ?? []).length, 2);
  assertSourceContract(createReminderSource, {
    excludes: [/void updateWidget\(\);/],
  });
});

test('deleting a reminder waits for the widget to remove the reminder', () => {
  assertSourceIncludes(deleteReminderSource, [
    /await deleteReminderById\(id\);[\s\S]*await updateWidget\(\);/,
  ]);
  assertSourceContract(deleteReminderSource, {
    excludes: [/void updateWidget\(\);/],
  });
});
