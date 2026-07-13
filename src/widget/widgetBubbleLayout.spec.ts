import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getWidgetLayoutPlan,
  WIDGET_PLUS_TOUCH_HEIGHT,
  WIDGET_PLUS_TOUCH_WIDTH,
  WIDGET_PRIORITY_BUBBLE_MAX_HEIGHT,
  WIDGET_PRIORITY_BUBBLE_MIN_HEIGHT,
  WIDGET_SURFACE_PADDING,
  type WidgetBubbleLayout,
  type WidgetLayoutReminder,
} from './widgetBubbleLayout';

const reminderTitles = [
  '最短期限',
  '次の予定',
  '明日の予定',
  '英語の長い reminder title',
  '買い物をする',
  '薬',
  '書類提出',
];

function makeReminders(count = reminderTitles.length): WidgetLayoutReminder[] {
  return reminderTitles.slice(0, count).map((title, index) => ({
    id: `reminder-${index + 1}`,
    title,
    targetAt: new Date(2026, 6, index + 1, 9).toISOString(),
  }));
}

function assertInside(
  rect: { left: number; top: number; right: number; bottom: number },
  bounds: { left: number; top: number; right: number; bottom: number },
) {
  assert.ok(rect.left >= bounds.left, `left ${rect.left} < ${bounds.left}`);
  assert.ok(rect.top >= bounds.top, `top ${rect.top} < ${bounds.top}`);
  assert.ok(rect.right <= bounds.right, `right ${rect.right} > ${bounds.right}`);
  assert.ok(rect.bottom <= bounds.bottom, `bottom ${rect.bottom} > ${bounds.bottom}`);
}

function assertBubblesDoNotOverlap(bubbles: WidgetBubbleLayout[]) {
  for (let index = 0; index < bubbles.length; index += 1) {
    const first = bubbles[index];
    const firstCenterX = first.left + first.width / 2;
    const firstCenterY = first.top + first.height / 2;

    for (const second of bubbles.slice(index + 1)) {
      const secondCenterX = second.left + second.width / 2;
      const secondCenterY = second.top + second.height / 2;
      const distance = Math.hypot(firstCenterX - secondCenterX, firstCenterY - secondCenterY);

      assert.ok(
        distance >= first.width / 2 + second.width / 2,
        `bubble ${index} overlaps another bubble`,
      );
    }
  }
}

test('android widget chooses deterministic bubble-only capacities by size', () => {
  const cases = [
    { width: 250, height: 180, mode: 'compact', visible: 2, bubbleSize: 76 },
    { width: 320, height: 220, mode: 'list', visible: 3, bubbleSize: 96 },
    { width: 360, height: 280, mode: 'two-column', visible: 5, bubbleSize: 128 },
    { width: 480, height: 320, mode: 'two-column', visible: 5, bubbleSize: 144 },
  ] as const;

  for (const expected of cases) {
    const plan = getWidgetLayoutPlan(
      makeReminders(expected.visible),
      expected.width,
      expected.height,
    );

    assert.equal(plan.mode, expected.mode);
    assert.equal(plan.visibleReminderCount, expected.visible);
    assert.equal(plan.reminderBubbles.length, expected.visible);
    assert.equal(plan.overflowBubble, undefined);
    assert.equal(plan.reminderBubbles[0].width, expected.bubbleSize);
    assert.equal(plan.reminderBubbles[0].height, expected.bubbleSize);
  }
});

test('android widget keeps all reminder layouts circular and in DB order', () => {
  const plan = getWidgetLayoutPlan(makeReminders(5), 360, 280);

  assert.deepEqual(
    plan.reminderBubbles.map((bubble) => bubble.reminderId),
    ['reminder-1', 'reminder-2', 'reminder-3', 'reminder-4', 'reminder-5'],
  );
  assert.ok(plan.reminderBubbles[0].height >= WIDGET_PRIORITY_BUBBLE_MIN_HEIGHT);
  assert.ok(plan.reminderBubbles[0].height <= WIDGET_PRIORITY_BUBBLE_MAX_HEIGHT);
  for (const bubble of plan.reminderBubbles) {
    assert.equal(bubble.width, bubble.height);
  }
});

test('android widget reserves its final circular slot for an overflow bubble', () => {
  const cases = [
    { width: 250, height: 180, visible: 1, overflow: 6 },
    { width: 320, height: 220, visible: 2, overflow: 5 },
    { width: 360, height: 280, visible: 4, overflow: 3 },
  ] as const;

  for (const expected of cases) {
    const plan = getWidgetLayoutPlan(makeReminders(7), expected.width, expected.height);

    assert.equal(plan.visibleReminderCount, expected.visible);
    assert.equal(plan.overflowCount, expected.overflow);
    assert.ok(plan.overflowBubble);
    assert.equal(plan.overflowBubble.width, plan.overflowBubble.height);
    assert.equal(plan.reminderBubbles.length + 1, plan.bubbleSlots.length);
  }
});

test('android widget keeps bubble-only content inside the surface without overlap', () => {
  for (const { width, height } of [
    { width: 250, height: 180 },
    { width: 320, height: 220 },
    { width: 360, height: 280 },
    { width: 480, height: 320 },
  ]) {
    const plan = getWidgetLayoutPlan(makeReminders(7), width, height);
    const surfaceBounds = { left: 0, top: 0, right: width, bottom: height };
    const renderedBubbles = [
      ...plan.reminderBubbles,
      ...(plan.overflowBubble ? [plan.overflowBubble] : []),
    ];

    for (const bubble of renderedBubbles) {
      assertInside(bubble, plan.contentBounds);
      assert.equal(bubble.width, bubble.height);
    }
    assertBubblesDoNotOverlap(renderedBubbles);
    assertInside(plan.addButton, surfaceBounds);
    assert.ok(plan.addButton.width >= WIDGET_PLUS_TOUCH_WIDTH);
    assert.ok(plan.addButton.height >= WIDGET_PLUS_TOUCH_HEIGHT);
    assert.equal(plan.addButton.left, width - WIDGET_SURFACE_PADDING - plan.addButton.width);
  }
});

test('android widget bubble layout is stable when the same size and DB order are rendered again', () => {
  const first = getWidgetLayoutPlan(makeReminders(), 480, 320);
  const second = getWidgetLayoutPlan(makeReminders(), 480, 320);

  assert.deepEqual(second, first);
});
