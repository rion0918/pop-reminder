/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('initial reminder insert avoids binding null notification ids through expo sqlite', () => {
  const source = readFileSync(__dirname + '/reminderRepository.ts', 'utf8');
  const insertReminderSource = source.match(
    /export async function insertReminder[\s\S]*?export async function updateReminderNotificationIds/,
  )?.[0] ?? '';
  const insertRowSource = insertReminderSource.match(
    /const row: NewReminderRow = \{[\s\S]*?\n  \};/,
  )?.[0] ?? '';

  assert.match(insertReminderSource, /const reminder: Reminder =/);
  assert.doesNotMatch(insertRowSource, /previousNotificationId: null,/);
  assert.doesNotMatch(insertRowSource, /targetNotificationId: null,/);
  assert.match(insertReminderSource, /previousNotificationId: null/);
  assert.match(insertReminderSource, /targetNotificationId: null/);
});

test('notification id update skips sqlite writes when both ids are null', () => {
  const source = readFileSync(__dirname + '/reminderRepository.ts', 'utf8');
  const updateSource = source.match(
    /export async function updateReminderNotificationIds[\s\S]*?export async function markReminderExpired/,
  )?.[0] ?? '';

  assert.match(updateSource, /notificationIds\.previousNotificationId === null/);
  assert.match(updateSource, /notificationIds\.targetNotificationId === null/);
  assert.match(updateSource, /return getReminderById\(id\);/);
});
