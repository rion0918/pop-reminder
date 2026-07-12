import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const createReminderSource = readSource(import.meta.url, './createReminderService.ts');
const deleteReminderSource = readSource(import.meta.url, './deleteReminderService.ts');
const updateReminderTitleSource = readSource(import.meta.url, './updateReminderTitleService.ts');

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

test('editing a reminder title waits for the widget to render the latest snapshot', () => {
  assertSourceIncludes(updateReminderTitleSource, [/await updateWidget\(\);/]);
  assertSourceContract(updateReminderTitleSource, {
    excludes: [/void updateWidget\(\);/],
  });
});
