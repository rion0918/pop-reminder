import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatReminderDetailAccessibilityDateTime,
  formatReminderDetailDate,
  formatReminderDetailTime,
  formatReminderBubbleDateTime,
  formatHomeReminderBubbleDateTime,
  formatReminderDateTime,
  formatReminderInputDate,
  shouldShowPreviousNotification,
} from './reminderDateFormat';

const now = new Date(2026, 6, 12, 10, 0);

test('widget date labels include weekdays after the day after tomorrow', () => {
  assert.equal(formatReminderBubbleDateTime(new Date(2026, 6, 12, 18, 0), now), '今日 18:00');
  assert.equal(formatReminderBubbleDateTime(new Date(2026, 6, 13, 18, 0), now), '明日 18:00');
  assert.equal(formatReminderBubbleDateTime(new Date(2026, 6, 14, 18, 0), now), '明後日 18:00');
  assert.equal(formatReminderBubbleDateTime(new Date(2026, 6, 15, 18, 0), now), '7/15（水） 18:00');
  assert.equal(
    formatReminderBubbleDateTime(new Date(2027, 0, 1, 18, 0), now),
    '2027/1/1（金） 18:00',
  );
});

test('all-day date labels omit a clock time', () => {
  const now = new Date(2026, 6, 12, 10);
  assert.equal(formatReminderBubbleDateTime(new Date(2026, 6, 13), now, true), '明日 終日');
  assert.equal(formatReminderDateTime(new Date(2026, 6, 13), true), '2026/7/13 終日');
});

test('home bubbles shorten dates outside the current month', () => {
  assert.equal(
    formatHomeReminderBubbleDateTime(new Date(2026, 6, 31, 18), now),
    '7/31（金） 18:00',
  );
  assert.equal(formatHomeReminderBubbleDateTime(new Date(2026, 7, 1, 18), now), '8月');
  assert.equal(formatHomeReminderBubbleDateTime(new Date(2026, 7, 1), now, true), '8月');
  assert.equal(formatHomeReminderBubbleDateTime(new Date(2027, 0, 1, 18), now), '2027年');
  assert.equal(formatHomeReminderBubbleDateTime(new Date(2027, 0, 1), now, true), '2027年');
});

test('home bubble shortening handles the year boundary', () => {
  const yearEnd = new Date(2026, 11, 31, 10);
  assert.equal(formatHomeReminderBubbleDateTime(new Date(2026, 11, 31, 18), yearEnd), '今日 18:00');
  assert.equal(formatHomeReminderBubbleDateTime(new Date(2027, 0, 1, 18), yearEnd), '2027年');
});

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
