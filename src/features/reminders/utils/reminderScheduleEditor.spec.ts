import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Reminder } from '../domain/reminder';
import {
  createReminderScheduleDraft,
  evaluateReminderScheduleDraft,
} from './reminderScheduleEditor';

const reminder = {
  targetAt: new Date(2030, 4, 12, 8, 15).toISOString(),
} satisfies Pick<Reminder, 'targetAt'>;

test('schedule editor creates a local date and time draft', () => {
  assert.deepEqual(createReminderScheduleDraft(reminder), {
    targetDate: '2030-05-12',
    targetTime: '08:15',
  });
});

test('schedule editor identifies future target and past previous notification', () => {
  const evaluated = evaluateReminderScheduleDraft(
    { targetDate: '2030-05-15', targetTime: '08:15' },
    '20:00',
    new Date(2030, 4, 14, 21),
  );

  assert.equal(evaluated.isValid, true);
  assert.equal(evaluated.isTargetFuture, true);
  assert.equal(evaluated.isPreviousFuture, false);
  assert.equal(evaluated.schedule?.previousNotifyAt.getDate(), 14);
});

test('schedule editor rejects a past target and malformed draft', () => {
  const past = evaluateReminderScheduleDraft(
    { targetDate: '2030-05-14', targetTime: '08:15' },
    '20:00',
    new Date(2030, 4, 14, 9),
  );
  const malformed = evaluateReminderScheduleDraft(
    { targetDate: '2030-02-31', targetTime: '08:15' },
    '20:00',
    new Date(2030, 4, 14, 9),
  );

  assert.equal(past.isValid, true);
  assert.equal(past.isTargetFuture, false);
  assert.equal(malformed.isValid, false);
});
