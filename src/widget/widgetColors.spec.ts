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

function luminance(hex: string) {
  const channels = [1, 3, 5].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('glass widget keeps opaque reading surfaces and at least 4.5:1 text contrast in every theme', () => {
  for (const theme of Object.values(widgetThemes)) {
    for (const background of [theme.surfaceGradient.from, theme.surfaceGradient.to]) {
      assert.match(background, /^#[\da-f]{6}$/i);
      assert.ok(contrast(theme.primaryText, background) >= 4.5);
      assert.ok(contrast(theme.secondaryText, background) >= 4.5);
    }
    for (const background of [theme.addButtonGradient.from, theme.addButtonGradient.to]) {
      assert.ok(contrast(theme.addButtonText, background) >= 4.5);
    }
  }
});
