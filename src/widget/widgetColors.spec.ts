import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appThemes, bubbleDueColors } from '../constants/colors';
import { getReminderDueColor } from '../features/reminders/utils/reminderDueColor';
import { getWidgetTheme, widgetThemes } from './widgetColors';

const currentDate = new Date(2026, 6, 13, 9);

test('widget hero and queue reuse the shared app deadline color mapping', () => {
  assert.equal(getReminderDueColor(new Date(2026, 6, 13, 18), currentDate), bubbleDueColors.today);
  assert.equal(
    getReminderDueColor(new Date(2026, 6, 14, 10, 30), currentDate),
    bubbleDueColors.tomorrow,
  );
  assert.equal(getReminderDueColor(new Date(2026, 6, 16, 19), currentDate), bubbleDueColors.soon);
  assert.equal(getReminderDueColor(new Date(2026, 6, 17, 20), currentDate), bubbleDueColors.later);
});

test('widget themes mirror all persisted app theme accents', () => {
  for (const theme of ['sky', 'lavender', 'mint'] as const) {
    assert.equal(widgetThemes[theme].accent, appThemes[theme].accent);
    assert.equal(widgetThemes[theme].accentSoft, appThemes[theme].accentSoft);
    assert.equal(widgetThemes[theme].surfaceGradient.from.startsWith('#'), true);
    assert.equal(widgetThemes[theme].surfaceGradient.to.startsWith('#'), true);
    assert.notEqual(widgetThemes[theme].ambientPrimary, widgetThemes[theme].ambientSecondary);
  }
});

test('widget theme resolver falls back to lavender for missing or invalid persisted values', () => {
  assert.equal(getWidgetTheme('sky'), widgetThemes.sky);
  assert.equal(getWidgetTheme('mint'), widgetThemes.mint);
  assert.equal(getWidgetTheme('lavender'), widgetThemes.lavender);
  assert.equal(getWidgetTheme('unknown'), widgetThemes.lavender);
  assert.equal(getWidgetTheme(undefined), widgetThemes.lavender);
});
