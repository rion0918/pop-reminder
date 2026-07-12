import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Reminder } from './reminder';
import { filterReminders } from './reminderFilter';

const baseReminder: Reminder = {
  id: '1',
  title: 'Pay Rent',
  targetAt: '2026-07-13T08:00:00+09:00',
  previousNotifyAt: '2026-07-12T20:00:00+09:00',
  targetNotifyAt: '2026-07-13T08:00:00+09:00',
  expiresAt: '2026-07-13T23:59:59+09:00',
  previousNotificationId: null,
  targetNotificationId: null,
  status: 'active',
  createdAt: '2026-07-12T00:00:00+09:00',
  updatedAt: '2026-07-12T00:00:00+09:00',
};

test('search filter normalizes title text and applies the selected date range', () => {
  const now = new Date('2026-07-12T12:00:00+09:00');
  assert.deepEqual(filterReminders([baseReminder], ' rent ', 'tomorrow', now), [baseReminder]);
  assert.deepEqual(filterReminders([baseReminder], 'missing', 'tomorrow', now), []);
  assert.deepEqual(filterReminders([baseReminder], '', 'today', now), []);
  assert.deepEqual(filterReminders([baseReminder], '', 'week', now), [baseReminder]);
});
