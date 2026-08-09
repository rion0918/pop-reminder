import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bubbleDueColors } from '../constants/colors';
import { getReminderDueColor } from '../features/reminders/utils/reminderDueColor';
import { widgetTheme } from './widgetColors';

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

test('widget visual hierarchy uses opaque neutral surfaces without decorative scenery', () => {
  assert.deepEqual(
    {
      surface: widgetTheme.surface,
      surfaceBorder: widgetTheme.surfaceBorder,
      cardSurface: widgetTheme.cardSurface,
      cardBorder: widgetTheme.cardBorder,
      cardShadow: widgetTheme.cardShadow,
      rowActionSurface: widgetTheme.rowActionSurface,
      plusButtonSurface: widgetTheme.plusButtonSurface,
    },
    {
      surface: '#F6F7FA',
      surfaceBorder: 'rgba(38,49,81,0.06)',
      cardSurface: '#FFFFFF',
      cardBorder: 'rgba(38,49,81,0.07)',
      cardShadow: 'rgba(38,49,81,0.07)',
      rowActionSurface: '#F2F4F8',
      plusButtonSurface: '#E7EEF8',
    },
  );
});
