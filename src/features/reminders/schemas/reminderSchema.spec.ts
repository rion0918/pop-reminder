import assert from 'node:assert/strict';
import { test } from 'node:test';

import { reminderTitleSchema } from './reminderSchema';

test('reminder title trims leading and trailing whitespace', () => {
  assert.equal(reminderTitleSchema.parse('  牛乳を買う  '), '牛乳を買う');
});

test('reminder title requires one to forty characters after trimming', () => {
  assert.throws(() => reminderTitleSchema.parse('   '));
  assert.equal(reminderTitleSchema.parse('あ'.repeat(40)), 'あ'.repeat(40));
  assert.throws(() => reminderTitleSchema.parse('あ'.repeat(41)));
});
