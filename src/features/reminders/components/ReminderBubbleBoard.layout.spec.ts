import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';
import {
  DENSE_FLOATING_SLOTS,
  FLOATING_SLOTS,
  getTemporalYRatio,
  makeGridSlots,
  makeLayoutForItem,
} from './reminderBubbleLayout';

const boardSource = readSource(import.meta.url, './ReminderBubbleBoard.tsx');
const layoutSource = readSource(import.meta.url, './reminderBubbleLayout.ts');

test('bubble layout algorithm keeps target vertical ratio within safe upper-middle bounds', () => {
  // Test actual getTemporalYRatio results across count scenarios
  assert.equal(getTemporalYRatio(0, 1), 0.36);

  // Small count scenario (count = 2)
  const ratioSmallNear = getTemporalYRatio(0, 2);
  const ratioSmallFar = getTemporalYRatio(1, 2);
  assert.equal(ratioSmallNear, 0.22);
  assert.equal(ratioSmallFar, 0.5);
  assert.ok(ratioSmallFar <= 0.68, `Far ratio ${ratioSmallFar} must be <= 0.68`);

  // Dense count scenario (count = 12)
  for (let index = 0; index < 12; index += 1) {
    const ratio = getTemporalYRatio(index, 12);
    assert.ok(
      ratio >= 0.18 && ratio <= 0.68,
      `Ratio ${ratio} at index ${index} must stay within safe bounds [0.18, 0.68]`,
    );
  }

  // Test makeGridSlots Y values and their upper bound
  const sparseGrid = makeGridSlots(false);
  for (const slot of sparseGrid) {
    assert.ok(slot.y <= 0.68, `Sparse grid slot y ${slot.y} must be <= 0.68`);
  }

  const denseGrid = makeGridSlots(true);
  for (const slot of denseGrid) {
    assert.ok(slot.y <= 0.68, `Dense grid slot y ${slot.y} must be <= 0.68`);
  }

  // Test jittered centerY ratios and candidate selection under the bottom-edge penalty
  const boardSize = { width: 390, height: 600 };
  const dimensions = { width: 120, height: 120, collisionSize: 120 };
  const placedBubbles: { size: number; centerX: number; centerY: number }[] = [];

  const layoutFar = makeLayoutForItem(
    'reminder-far-1',
    dimensions,
    boardSize,
    placedBubbles,
    1,
    1,
    2,
  );

  const centerYRatio = layoutFar.centerY / boardSize.height;
  assert.ok(
    centerYRatio <= 0.68,
    `Selected candidate centerY ratio ${centerYRatio} must be <= 0.68`,
  );
  assert.ok(
    layoutFar.top + dimensions.height <= boardSize.height * 0.76,
    `Bubble bottom edge ${layoutFar.top + dimensions.height} must stay comfortably above bottom controls`,
  );

  // Supplementary source-contract assertions
  assertSourceIncludes(boardSource, [/getTemporalYRatio/, /makeGridSlots/, /makeLayoutForItem/]);
  assertSourceIncludes(layoutSource, [
    /export function getTemporalYRatio/,
    /export const FLOATING_SLOTS/,
    /export const DENSE_FLOATING_SLOTS/,
    /export function makeGridSlots/,
  ]);
});

test('bubble layout slots do not place bubbles below y ratio 0.70', () => {
  for (const slot of FLOATING_SLOTS) {
    assert.ok(slot.y <= 0.7, `FLOATING_SLOTS y value ${slot.y} exceeds maximum allowed ratio 0.70`);
  }

  for (const slot of DENSE_FLOATING_SLOTS) {
    assert.ok(
      slot.y <= 0.7,
      `DENSE_FLOATING_SLOTS y value ${slot.y} exceeds maximum allowed ratio 0.70`,
    );
  }
});

test('temporal Y ratio stays strictly bounded for distant reminders', () => {
  assertSourceIncludes(layoutSource, [
    /clamp\(temporalYRatio \+ verticalNudge,\s*0\.14,\s*0\.68\)/,
  ]);
});
