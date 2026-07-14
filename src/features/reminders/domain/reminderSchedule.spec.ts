import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPreviousNotifyAt, replaceReminderTargetTime } from './reminderSchedule';

test('target time replacement preserves the local target date', () => {
  const target = new Date(2030, 4, 10, 8, 15, 30, 400);
  const updated = replaceReminderTargetTime(target, '18:45');

  assert.equal(updated.getFullYear(), target.getFullYear());
  assert.equal(updated.getMonth(), target.getMonth());
  assert.equal(updated.getDate(), target.getDate());
  assert.equal(updated.getHours(), 18);
  assert.equal(updated.getMinutes(), 45);
  assert.equal(updated.getSeconds(), 0);
  assert.equal(updated.getMilliseconds(), 0);
});

test('previous notification uses the day before the target and the shared time', () => {
  const target = new Date(2030, 4, 10, 8, 15);
  const previous = buildPreviousNotifyAt(target, '20:30');

  assert.equal(previous.getFullYear(), 2030);
  assert.equal(previous.getMonth(), 4);
  assert.equal(previous.getDate(), 9);
  assert.equal(previous.getHours(), 20);
  assert.equal(previous.getMinutes(), 30);
});

test('schedule editing rejects invalid time strings', () => {
  const target = new Date(2030, 4, 10, 8, 15);

  assert.throws(() => replaceReminderTargetTime(target, '24:00'));
  assert.throws(() => buildPreviousNotifyAt(target, '9:00'));
});
