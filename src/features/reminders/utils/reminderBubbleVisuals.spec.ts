import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getReminderBubbleTypography, getReminderTitleVisualLength } from './reminderBubbleVisuals';

test('shared reminder bubble visuals measure Japanese and English titles consistently', () => {
  assert.equal(getReminderTitleVisualLength('ABC あ'), 3.21);
  assert.equal(getReminderTitleVisualLength('ななよ'), 3);
});

test('shared reminder bubble typography keeps short titles large and centered in one line', () => {
  const typography = getReminderBubbleTypography(116, 116, 3);

  assert.equal(typography.titleFontSize, 16);
  assert.equal(typography.titleLineCount, 1);
  assert.equal(typography.titleAdjustsFontSizeToFit, false);
  assert.equal(typography.timeFontSize, 12);
});

test('shared reminder bubble typography gives long titles more lines without tail truncation', () => {
  const typography = getReminderBubbleTypography(181, 116, 30);

  assert.equal(typography.titleLineCount, 4);
  assert.equal(typography.titleAdjustsFontSizeToFit, true);
  assert.equal(typography.titleEllipsizeMode, 'clip');
  assert.ok(typography.bubblePadding >= 10);
});
