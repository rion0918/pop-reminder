import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './reminderRepository.ts');
const insertReminderSource =
  source.match(
    /export async function insertReminder[\s\S]*?export async function updateReminderNotificationIds/,
  )?.[0] ?? '';
const insertRowSource =
  insertReminderSource.match(/const row: NewReminderRow = \{[\s\S]*?\n {2}\};/)?.[0] ?? '';
const updateNotificationIdsSource =
  source.match(
    /export async function updateReminderNotificationIds[\s\S]*?export async function markReminderExpired/,
  )?.[0] ?? '';

test('initial reminder insert avoids binding null notification ids through expo sqlite', () => {
  assert.notEqual(insertReminderSource, '');
  assert.notEqual(insertRowSource, '');

  assertSourceContract(insertReminderSource, {
    includes: [
      /const reminder: Reminder =/,
      /previousNotificationId: null/,
      /targetNotificationId: null/,
    ],
  });
  assertSourceContract(insertRowSource, {
    excludes: [/previousNotificationId: null,/, /targetNotificationId: null,/],
  });
});

test('notification id update skips sqlite writes when both ids are null', () => {
  assert.notEqual(updateNotificationIdsSource, '');

  assertSourceIncludes(updateNotificationIdsSource, [
    /notificationIds\.previousNotificationId === null/,
    /notificationIds\.targetNotificationId === null/,
    /return getReminderById\(id\);/,
  ]);
});
