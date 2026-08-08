import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REMINDER_BUBBLE_BURST_MS } from './ReminderBubbleBurst.types';
import { BULK_DELETE_BURST_STAGGER_MS, makeBulkDeleteMotions } from './reminderBulkDeleteMotion';

test('bulk deletion overlaps bubble bursts into a short ordered cascade', () => {
  const ids = Array.from({ length: 12 }, (_, index) => `reminder-${index}`);
  const motions = makeBulkDeleteMotions(ids);

  assert.deepEqual(
    motions.map(({ reminderId, delayMs }) => ({ reminderId, delayMs })),
    ids.map((reminderId, index) => ({
      reminderId,
      delayMs: index * BULK_DELETE_BURST_STAGGER_MS,
    })),
  );
  assert.equal(motions.filter((motion) => motion.hapticsEnabled).length, 1);
  assert.equal(motions[0]?.hapticsEnabled, true);
  assert.ok((motions.at(-1)?.delayMs ?? 0) + REMINDER_BUBBLE_BURST_MS <= 1200);
});
