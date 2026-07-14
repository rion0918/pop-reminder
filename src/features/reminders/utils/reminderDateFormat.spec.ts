import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatReminderDetailAccessibilityDateTime,
  formatReminderDetailDate,
  formatReminderDetailTime,
  formatReminderInputDate,
  shouldShowPreviousNotification,
} from './reminderDateFormat';

const now = new Date(2026, 6, 12, 10, 0);

test('detail date separates a Japanese calendar date, weekday, and time', () => {
  const value = new Date(2026, 6, 13, 8, 0);

  assert.equal(formatReminderDetailDate(value, now), '7月13日（月）');
  assert.equal(formatReminderDetailTime(value), '08:00');
  assert.equal(formatReminderDetailAccessibilityDateTime(value, now), '7月13日月曜日、8時');
});

test('detail date includes the year when the reminder crosses into another year', () => {
  const value = new Date(2027, 0, 1, 20, 30);

  assert.equal(formatReminderDetailDate(value, now), '2027年1月1日（金）');
  assert.equal(
    formatReminderDetailAccessibilityDateTime(value, now),
    '2027年1月1日金曜日、20時30分',
  );
});

test('quick add summary date includes the Japanese weekday', () => {
  const value = new Date(2026, 6, 15, 8, 0);

  assert.equal(formatReminderInputDate(value), '2026/7/15（水）');
});

test('previous notification is shown only while it is still upcoming', () => {
  assert.equal(shouldShowPreviousNotification(new Date(2026, 6, 12, 10, 1), now), true);
  assert.equal(shouldShowPreviousNotification(new Date(2026, 6, 12, 10, 0), now), false);
  assert.equal(shouldShowPreviousNotification(new Date(2026, 6, 12, 9, 59), now), false);
});
