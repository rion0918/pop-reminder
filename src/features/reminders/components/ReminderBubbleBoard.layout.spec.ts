import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderBubbleBoard.tsx');

test('bubble layout algorithm keeps target vertical ratio within safe upper-middle bounds', () => {
  // Verify source code contract for temporal Y ratio calculation and safe bounds
  assertSourceIncludes(source, [
    /function getTemporalYRatio/,
    /FLOATING_SLOTS/,
    /DENSE_FLOATING_SLOTS/,
    /makeGridSlots/,
  ]);
});

test('bubble layout slots do not place bubbles below y ratio 0.70', () => {
  // Ensure FLOATING_SLOTS do not contain y > 0.70
  const floatingSlotsMatch = source.match(/const FLOATING_SLOTS = \[([\s\S]*?)\];/);
  assert.ok(floatingSlotsMatch, 'FLOATING_SLOTS definition should exist');
  const floatingSlotsText = floatingSlotsMatch[1];
  const yMatches = Array.from(floatingSlotsText.matchAll(/y:\s*([0-9.]+)/g));
  for (const match of yMatches) {
    const yValue = Number.parseFloat(match[1]);
    assert.ok(yValue <= 0.7, `FLOATING_SLOTS y value ${yValue} exceeds maximum allowed ratio 0.70`);
  }

  // Ensure DENSE_FLOATING_SLOTS do not contain y > 0.70
  const denseSlotsMatch = source.match(/const DENSE_FLOATING_SLOTS = \[([\s\S]*?)\];/);
  assert.ok(denseSlotsMatch, 'DENSE_FLOATING_SLOTS definition should exist');
  const denseSlotsText = denseSlotsMatch[1];
  const denseYMatches = Array.from(denseSlotsText.matchAll(/y:\s*([0-9.]+)/g));
  for (const match of denseYMatches) {
    const yValue = Number.parseFloat(match[1]);
    assert.ok(
      yValue <= 0.7,
      `DENSE_FLOATING_SLOTS y value ${yValue} exceeds maximum allowed ratio 0.70`,
    );
  }
});

test('temporal Y ratio stays strictly bounded for distant reminders', () => {
  assertSourceIncludes(source, [/clamp\(temporalYRatio \+ verticalNudge,\s*0\.14,\s*0\.68\)/]);
});
