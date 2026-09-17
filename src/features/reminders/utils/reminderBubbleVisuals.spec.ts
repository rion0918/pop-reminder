import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getReminderBubbleDimensions,
  getReminderBubbleTypography,
  getReminderTitleVisualLength,
} from './reminderBubbleVisuals';

test('shared reminder bubble visuals measure Japanese and English titles consistently', () => {
  assert.equal(getReminderTitleVisualLength('ABC あ'), 3.21);
  assert.equal(getReminderTitleVisualLength('ななよ'), 3);
});

test('shared reminder bubble typography keeps short titles large and centered in one line', () => {
  const typography = getReminderBubbleTypography(116, 116, 3);

  assert.equal(typography.titleFontSize, 20);
  assert.equal(typography.titleLineCount, 1);
  assert.equal(typography.titleAdjustsFontSizeToFit, false);
  assert.equal(typography.timeFontSize, 12);
});

test('shared reminder bubble typography keeps long titles readable without shrinking', () => {
  const typography = getReminderBubbleTypography(181, 116, 30);

  assert.equal(typography.titleFontSize, 16);
  assert.equal(typography.titleLineCount, 5);
  assert.equal(typography.titleAdjustsFontSizeToFit, false);
  assert.equal(typography.titleMinFontScale, 1);
  assert.equal(typography.titleEllipsizeMode, 'clip');
  assert.ok(typography.bubblePadding >= 10);
});

test('long bubbles stay close to round while preserving a readable minimum size', () => {
  const dimensions = getReminderBubbleDimensions(38, 390, 622);

  assert.ok(dimensions.height >= 148);
  assert.ok(dimensions.width / dimensions.height <= 1.15);
  assert.ok(dimensions.width / dimensions.height >= 1);
});

test('title length boundaries keep the minimum readable font size', () => {
  const boundaries: [number, number][] = [
    [1, 20],
    [4, 20],
    [5, 18],
    [12, 18],
    [13, 16],
    [24, 16],
    [25, 16],
    [39, 16],
    [40, 16],
  ];

  for (const [visualLength, expectedFontSize] of boundaries) {
    const typography = getReminderBubbleTypography(148, 148, visualLength);
    const dimensions = getReminderBubbleDimensions(visualLength, 390, 622);

    assert.equal(typography.titleFontSize, expectedFontSize);
    assert.equal(typography.titleMinFontScale, 1);
    assert.equal(typography.titleAdjustsFontSizeToFit, false);
    assert.ok(dimensions.width / dimensions.height <= 1.15);
  }
});
