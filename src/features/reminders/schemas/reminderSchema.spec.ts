import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REMINDER_TITLE_MAX_LENGTH, reminderTitleSchema } from './reminderSchema';

test('reminder title trims leading and trailing whitespace', () => {
  assert.equal(reminderTitleSchema.parse('  牛乳を買う  '), '牛乳を買う');
});

test('reminder title requires one to forty characters after trimming', () => {
  assert.throws(() => reminderTitleSchema.parse('   '));
  assert.equal(
    reminderTitleSchema.parse('あ'.repeat(REMINDER_TITLE_MAX_LENGTH)),
    'あ'.repeat(REMINDER_TITLE_MAX_LENGTH),
  );
  assert.throws(() => reminderTitleSchema.parse('あ'.repeat(REMINDER_TITLE_MAX_LENGTH + 1)));
});
