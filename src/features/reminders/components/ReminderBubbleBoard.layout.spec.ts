import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';
import {
  DENSE_FLOATING_SLOTS,
  FLOATING_SLOTS,
  getEdgeClearance,
  getTemporalYRatio,
  getVerticalEdgeClearance,
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
  assert.equal(getTemporalYRatio(0, 4, 'homeTimeline'), 0.3);
  assert.equal(getTemporalYRatio(3, 4, 'homeTimeline'), 0.67);
  assert.equal(getTemporalYRatio(0, 5, 'homeTimeline'), 0.206);
  assert.equal(getTemporalYRatio(4, 5, 'homeTimeline'), 0.76);
  assert.equal(getTemporalYRatio(0, 6, 'homeTimeline'), 0.125);
  assert.equal(getTemporalYRatio(5, 6, 'homeTimeline'), 0.84);
  assert.equal(getTemporalYRatio(0, 7, 'homeTimeline'), 0.056);
  assert.equal(getTemporalYRatio(6, 7, 'homeTimeline'), 0.92);
  assert.equal(getTemporalYRatio(0, 8, 'homeTimeline'), 0);
  assert.equal(getTemporalYRatio(7, 8, 'homeTimeline'), 1);
  assert.equal(getTemporalYRatio(0, 12, 'homeTimeline'), 0);
  assert.equal(getTemporalYRatio(11, 12, 'homeTimeline'), 1);
  assert.equal(getTemporalYRatio(0, 13, 'homeTimeline'), 0);
  assert.equal(getTemporalYRatio(12, 13, 'homeTimeline'), 1);

  for (const count of [2, 5, 6, 7, 8, 12, 13]) {
    const ratios = Array.from({ length: count }, (_, index) =>
      getTemporalYRatio(index, count, 'homeTimeline'),
    );

    for (let index = 1; index < ratios.length; index += 1) {
      assert.ok(ratios[index] >= ratios[index - 1]);
    }
  }
});

test('dense home timeline narrows only vertical clearance within the selected safe gap', () => {
  const scenarios = [
    { boardSize: { width: 288, height: 258 }, expectedVerticalClearance: 6 },
    { boardSize: { width: 350, height: 534 }, expectedVerticalClearance: 9 },
    { boardSize: { width: 390, height: 622 }, expectedVerticalClearance: 10 },
  ];

  for (const { boardSize, expectedVerticalClearance } of scenarios) {
    const standardClearance = getEdgeClearance(boardSize);

    assert.equal(getVerticalEdgeClearance(boardSize, 'natural', 12), standardClearance);
    assert.equal(getVerticalEdgeClearance(boardSize, 'homeTimeline', 4), standardClearance);
    assert.equal(getVerticalEdgeClearance(boardSize, 'homeTimeline', 5), expectedVerticalClearance);
    assert.ok(14 + expectedVerticalClearance >= 20);
    assert.ok(14 + expectedVerticalClearance <= 28);
    assert.ok(12 + expectedVerticalClearance >= 18);
    assert.ok(12 + expectedVerticalClearance <= 26);
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
    { boardSize: { width: 350, height: 534 }, count: 5, itemSize: 90 },
    { boardSize: { width: 350, height: 534 }, count: 6, itemSize: 98 },
    { boardSize: { width: 350, height: 534 }, count: 7, itemSize: 90 },
    { boardSize: { width: 350, height: 534 }, count: 8, itemSize: 90 },
    { boardSize: { width: 390, height: 622 }, count: 12, itemSize: 90 },
  ];

  for (const { boardSize, count, itemSize } of scenarios) {
    const placedBubbles: { size: number; centerX: number; centerY: number }[] = [];
    const itemLayouts: { centerX: number; centerY: number; top: number }[] = [];
    const horizontalClearance = getEdgeClearance(boardSize);
    const verticalClearance = getVerticalEdgeClearance(boardSize, 'homeTimeline', count);

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

      assert.ok(layout.left >= horizontalClearance);
      assert.ok(layout.left + itemSize <= boardSize.width - horizontalClearance);
      assert.ok(layout.top >= verticalClearance);
      assert.ok(layout.top + itemSize <= boardSize.height - verticalClearance);
      itemLayouts.push(layout);
    }

    if (count >= 8) {
      assert.equal(itemLayouts[0]?.top, verticalClearance);
      assert.equal(
        (itemLayouts[itemLayouts.length - 1]?.top ?? 0) + itemSize,
        boardSize.height - verticalClearance,
      );
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
      assert.ok(overflowLayout.top >= verticalClearance);
      assert.ok(overflowLayout.top + overflowSize <= boardSize.height - verticalClearance);
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

test('overflow joins the home timeline as its final item and invalidates cached reminder layouts', () => {
  const boardSize = { width: 390, height: 622 };
  const itemSize = 90;
  const timelineItemCount = 13;
  const placedBubbles: { size: number; centerX: number; centerY: number }[] = [];
  const reminderLayouts = Array.from({ length: 12 }, (_, index) =>
    makeLayoutForItem(
      `reminder-overflow-${index}`,
      { width: itemSize, height: itemSize, collisionSize: itemSize },
      boardSize,
      placedBubbles,
      index,
      index,
      timelineItemCount,
      'homeTimeline',
    ),
  );
  const overflowLayout = makeLayoutForItem(
    'overflow-4',
    { width: itemSize, height: itemSize, collisionSize: itemSize },
    boardSize,
    placedBubbles,
    12,
    12,
    timelineItemCount,
    'homeTimeline',
  );
  const verticalClearance = getVerticalEdgeClearance(boardSize, 'homeTimeline', timelineItemCount);

  assert.ok(overflowLayout.centerY >= (reminderLayouts[11]?.centerY ?? 0));
  assert.equal(overflowLayout.top + itemSize, boardSize.height - verticalClearance);
  assertSourceIncludes(boardSource, [
    /const timelineItemCount =\s*visibleReminders\.length \+\s*\(verticalLayoutMode === 'homeTimeline' && overflowCount > 0 \? 1 : 0\);/,
    /const boardKey = `\$\{LAYOUT_VERSION\}:[^`]*\$\{timelineItemCount\}`;/,
    /reminderIndex,\s*timelineItemCount,\s*verticalLayoutMode/,
    /visibleReminders\.length,\s*visibleReminders\.length \+ 1,\s*verticalLayoutMode/,
  ]);
});

test('dense home timeline fills representative safe corridors without changing deadline order', () => {
  const boardSizes = [
    { width: 288, height: 258 },
    { width: 350, height: 534 },
    { width: 390, height: 622 },
  ];

  for (const boardSize of boardSizes) {
    for (const count of [5, 6, 7, 8, 12]) {
      const itemSize = 90;
      const placedBubbles: { size: number; centerX: number; centerY: number }[] = [];
      const layouts = Array.from({ length: count }, (_, index) =>
        makeLayoutForItem(
          `representative-${boardSize.width}-${count}-${index}`,
          { width: itemSize, height: itemSize, collisionSize: itemSize },
          boardSize,
          placedBubbles,
          index,
          index,
          count,
          'homeTimeline',
        ),
      );
      const horizontalClearance = getEdgeClearance(boardSize);
      const verticalClearance = getVerticalEdgeClearance(boardSize, 'homeTimeline', count);

      for (const layout of layouts) {
        assert.ok(layout.left >= horizontalClearance);
        assert.ok(layout.left + itemSize <= boardSize.width - horizontalClearance);
        assert.ok(layout.top >= verticalClearance);
        assert.ok(layout.top + itemSize <= boardSize.height - verticalClearance);
      }

      for (let index = 1; index < layouts.length; index += 1) {
        assert.ok(layouts[index].centerY >= layouts[index - 1].centerY);
      }

      if (count >= 8) {
        assert.equal(layouts[0]?.top, verticalClearance);
        assert.equal(
          (layouts[layouts.length - 1]?.top ?? 0) + itemSize,
          boardSize.height - verticalClearance,
        );
      }
    }
  }
});

test('bubble layout grid slots remain bounded for sparse and dense boards', () => {
  for (const slots of [makeGridSlots(false), makeGridSlots(true)]) {
    for (const slot of slots) {
      assert.ok(slot.y >= 0.14 && slot.y <= 0.8);
    }
  }
});
