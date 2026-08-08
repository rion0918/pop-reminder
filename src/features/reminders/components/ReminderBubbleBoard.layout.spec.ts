import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';
import {
  DENSE_FLOATING_SLOTS,
  FLOATING_SLOTS,
  getBottomAlignmentOffset,
  getEdgeClearance,
  getTemporalYRatio,
  makeGridSlots,
  makeLayoutForItem,
} from './reminderBubbleLayout';

const boardSource = readSource(import.meta.url, './ReminderBubbleBoard.tsx');
const layoutSource = readSource(import.meta.url, './reminderBubbleLayout.ts');

test('bottom alignment anchors the bubble group across representative board sizes and counts', () => {
  const scenarios = [
    { boardSize: { width: 320, height: 360 }, count: 1 },
    { boardSize: { width: 390, height: 600 }, count: 2 },
    { boardSize: { width: 390, height: 700 }, count: 6 },
    { boardSize: { width: 430, height: 760 }, count: 12 },
  ];

  for (const { boardSize, count } of scenarios) {
    const targetBottom = boardSize.height - getEdgeClearance(boardSize);
    const itemHeight = Math.max(20, Math.floor((targetBottom - 48) / count) - 2);
    const gap = 2;
    const lowestBottom = targetBottom - 24;
    const totalHeight = count * itemHeight + (count - 1) * gap;
    const firstTop = lowestBottom - totalHeight;
    const itemBounds = Array.from({ length: count }, (_, index) => ({
      top: firstTop + index * (itemHeight + gap),
      height: itemHeight,
    }));

    const offset = getBottomAlignmentOffset(boardSize, itemBounds);
    const alignedBottoms = itemBounds.map(({ top, height }) => top + height + offset);

    assert.equal(Math.max(...alignedBottoms), targetBottom);
    assert.equal(offset, 24);
  }
});

test('bottom alignment preserves relative positions and never shifts an already-safe group upward', () => {
  const boardSize = { width: 390, height: 600 };
  const itemBounds = [
    { top: 100, height: 96 },
    { top: 244, height: 112 },
    { top: 388, height: 104 },
  ];
  const offset = getBottomAlignmentOffset(boardSize, itemBounds);
  const targetBottom = boardSize.height - getEdgeClearance(boardSize);

  assert.equal(
    Math.max(...itemBounds.map(({ top, height }) => top + height + offset)),
    targetBottom,
  );
  assert.equal(itemBounds[1].top + offset - (itemBounds[0].top + offset), 144);
  assert.equal(getBottomAlignmentOffset(boardSize, [{ top: targetBottom - 80, height: 80 }]), 0);
});

test('bubble layout keeps temporal ordering and bounded normalized slots before bottom alignment', () => {
  assert.equal(getTemporalYRatio(0, 1), 0.36);
  assert.equal(getTemporalYRatio(0, 2), 0.22);
  assert.equal(getTemporalYRatio(1, 2), 0.5);

  for (let index = 0; index < 12; index += 1) {
    const ratio = getTemporalYRatio(index, 12);
    assert.ok(ratio >= 0.18 && ratio <= 0.68);
  }

  for (const slot of [...FLOATING_SLOTS, ...DENSE_FLOATING_SLOTS]) {
    assert.ok(slot.y >= 0.14 && slot.y <= 0.8);
  }

  const boardSize = { width: 390, height: 600 };
  const dimensions = { width: 120, height: 120, collisionSize: 120 };
  const placedBubbles: { size: number; centerX: number; centerY: number }[] = [];
  const first = makeLayoutForItem('reminder-near-1', dimensions, boardSize, placedBubbles, 1, 0, 2);
  const second = makeLayoutForItem('reminder-far-1', dimensions, boardSize, placedBubbles, 1, 1, 2);

  assert.ok(second.centerY > first.centerY);
  assert.ok(second.top + dimensions.height <= boardSize.height - getEdgeClearance(boardSize));
  assertSourceIncludes(boardSource, [
    /alignToBottom/,
    /getBottomAlignmentOffset/,
    /alignToBottom \? 'bottom' : 'natural'/,
  ]);
  assertSourceIncludes(layoutSource, [
    /export function getBottomAlignmentOffset/,
    /getEdgeClearance\(boardSize\)/,
  ]);
});

test('bubble layout grid slots remain bounded for sparse and dense boards', () => {
  for (const slots of [makeGridSlots(false), makeGridSlots(true)]) {
    for (const slot of slots) {
      assert.ok(slot.y >= 0.14 && slot.y <= 0.8);
    }
  }
});
