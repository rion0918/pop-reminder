import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';
import {
  DENSE_FLOATING_SLOTS,
  FLOATING_SLOTS,
  getEdgeClearance,
  getTemporalYRatio,
  makeGridSlots,
  makeLayoutForItem,
  resolveBoardSizeMeasurement,
} from './reminderBubbleLayout';

const boardSource = readSource(import.meta.url, './ReminderBubbleBoard.tsx');
const layoutSource = readSource(import.meta.url, './reminderBubbleLayout.ts');

test('frozen board measurement accepts empty-to-populated resize but pins the same mode', () => {
  const emptyBoardSize = { width: 350, height: 620 };
  const populatedBoardSize = { width: 350, height: 516 };

  assert.deepEqual(
    resolveBoardSizeMeasurement(emptyBoardSize, populatedBoardSize, {
      freezeLayout: true,
      contentModeChanged: true,
    }),
    populatedBoardSize,
  );
  assert.deepEqual(
    resolveBoardSizeMeasurement(emptyBoardSize, populatedBoardSize, {
      freezeLayout: true,
      contentModeChanged: false,
    }),
    emptyBoardSize,
  );
  assert.deepEqual(
    resolveBoardSizeMeasurement(emptyBoardSize, populatedBoardSize, {
      freezeLayout: false,
      contentModeChanged: false,
    }),
    populatedBoardSize,
  );
});

test('home timeline centers the first bubble and expands from near to distant deadlines', () => {
  assert.equal(getTemporalYRatio(0, 1, 'homeTimeline'), 0.5);
  assert.equal(getTemporalYRatio(0, 2, 'homeTimeline'), 0.35);
  assert.equal(getTemporalYRatio(1, 2, 'homeTimeline'), 0.65);
  assert.equal(getTemporalYRatio(0, 6, 'homeTimeline'), 0.25);
  assert.equal(getTemporalYRatio(5, 6, 'homeTimeline'), 0.68);
  assert.equal(getTemporalYRatio(0, 12, 'homeTimeline'), 0.18);
  assert.equal(getTemporalYRatio(11, 12, 'homeTimeline'), 0.68);

  for (const count of [2, 6, 12]) {
    const ratios = Array.from({ length: count }, (_, index) =>
      getTemporalYRatio(index, count, 'homeTimeline'),
    );

    for (let index = 1; index < ratios.length; index += 1) {
      assert.ok(ratios[index] >= ratios[index - 1]);
    }
  }
});

test('natural search layout remains unchanged while home layouts stay inside the measured board', () => {
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

  const scenarios = [
    { boardSize: { width: 288, height: 258 }, count: 1, itemSize: 98 },
    { boardSize: { width: 350, height: 534 }, count: 2, itemSize: 110 },
    { boardSize: { width: 350, height: 534 }, count: 6, itemSize: 98 },
    { boardSize: { width: 390, height: 622 }, count: 12, itemSize: 90 },
  ];

  for (const { boardSize, count, itemSize } of scenarios) {
    const placedBubbles: { size: number; centerX: number; centerY: number }[] = [];
    const itemLayouts: { centerX: number; centerY: number; top: number }[] = [];
    const edgeClearance = getEdgeClearance(boardSize);

    for (let index = 0; index < count; index += 1) {
      const layout = makeLayoutForItem(
        `reminder-${count}-${index}`,
        { width: itemSize, height: itemSize, collisionSize: itemSize },
        boardSize,
        placedBubbles,
        index,
        index,
        count,
        'homeTimeline',
      );

      assert.ok(layout.top >= edgeClearance);
      assert.ok(layout.top + itemSize <= boardSize.height - edgeClearance);
      itemLayouts.push(layout);
    }

    for (let index = 1; index < itemLayouts.length; index += 1) {
      assert.ok(itemLayouts[index].centerY >= itemLayouts[index - 1].centerY);
    }

    for (let firstIndex = 0; firstIndex < itemLayouts.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < itemLayouts.length; secondIndex += 1) {
        const distance = Math.hypot(
          itemLayouts[firstIndex].centerX - itemLayouts[secondIndex].centerX,
          itemLayouts[firstIndex].centerY - itemLayouts[secondIndex].centerY,
        );

        assert.ok(distance >= itemSize * 0.28);
      }
    }

    if (count === 12) {
      const overflowSize = 90;
      const overflowLayout = makeLayoutForItem(
        'overflow-4',
        { width: overflowSize, height: overflowSize, collisionSize: overflowSize },
        boardSize,
        placedBubbles,
        count,
        count,
        count + 1,
        'homeTimeline',
      );
      const lastItemLayout = itemLayouts[itemLayouts.length - 1];

      assert.ok(lastItemLayout);
      assert.ok(overflowLayout.centerY >= lastItemLayout.centerY);
      assert.ok(overflowLayout.top >= edgeClearance);
      assert.ok(overflowLayout.top + overflowSize <= boardSize.height - edgeClearance);
    }
  }

  assertSourceIncludes(boardSource, [
    /verticalLayoutMode\?: BubbleVerticalLayoutMode/,
    /verticalLayoutMode = 'natural'/,
    /verticalLayoutMode/,
    /resolveBoardSizeMeasurement/,
  ]);
  assert.equal(boardSource.includes('alignToBottom'), false);
  assert.equal(boardSource.includes('getBottomAlignmentOffset'), false);
  assertSourceIncludes(layoutSource, [/export function resolveBoardSizeMeasurement/]);
});

test('bubble layout grid slots remain bounded for sparse and dense boards', () => {
  for (const slots of [makeGridSlots(false), makeGridSlots(true)]) {
    for (const slot of slots) {
      assert.ok(slot.y >= 0.14 && slot.y <= 0.8);
    }
  }
});
