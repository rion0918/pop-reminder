import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bubbleDueColors } from '../constants/colors';
import { getReminderDueColor } from '../features/reminders/utils/reminderDueColor';

const currentDate = new Date(2026, 6, 13, 9);

test('widget list uses the shared app deadline color mapping', () => {
  assert.equal(getReminderDueColor(new Date(2026, 6, 13, 18), currentDate), bubbleDueColors.today);
  assert.equal(
    getReminderDueColor(new Date(2026, 6, 14, 10, 30), currentDate),
    bubbleDueColors.tomorrow,
  );
  assert.equal(getReminderDueColor(new Date(2026, 6, 16, 19), currentDate), bubbleDueColors.soon);
  assert.equal(getReminderDueColor(new Date(2026, 6, 17, 20), currentDate), bubbleDueColors.later);
});
