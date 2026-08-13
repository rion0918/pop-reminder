import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getWidgetLayoutPlan,
  type WidgetLayoutReminder,
  type WidgetRect,
} from './widgetBubbleLayout';

const reminderTitles = [
  '最短期限',
  '次の予定',
  '明日の予定',
  '英語の長い reminder title',
  '買い物をする',
  '薬',
  '書類提出',
  '洗濯物を取り込む',
  '本を返す',
  '週報をまとめる',
];

function makeReminders(count = reminderTitles.length): WidgetLayoutReminder[] {
  return reminderTitles.slice(0, count).map((title, index) => ({
    id: `reminder-${index + 1}`,
    title,
    targetAt: new Date(2026, 6, index + 1, 9).toISOString(),
  }));
}

function assertInside(rect: WidgetRect, bounds: WidgetRect) {
  assert.ok(rect.left >= bounds.left, `left ${rect.left} < ${bounds.left}`);
  assert.ok(rect.top >= bounds.top, `top ${rect.top} < ${bounds.top}`);
  assert.ok(rect.right <= bounds.right, `right ${rect.right} > ${bounds.right}`);
  assert.ok(rect.bottom <= bounds.bottom, `bottom ${rect.bottom} > ${bounds.bottom}`);
}

function assertRowsDoNotOverlap(rows: WidgetRect[]) {
  for (let index = 0; index < rows.length - 1; index += 1) {
    assert.ok(rows[index].bottom <= rows[index + 1].top);
  }
}

test('android widget preserves capacity while promoting the first reminder to hero', () => {
  const cases = [
    { width: 250, height: 180, mode: 'compact', visible: 2 },
    { width: 320, height: 220, mode: 'compact', visible: 3 },
    { width: 360, height: 280, mode: 'list', visible: 4 },
    { width: 360, height: 320, mode: 'expanded', visible: 5 },
    { width: 480, height: 320, mode: 'expanded', visible: 5 },
    { width: 360, height: 380, mode: 'expanded', visible: 6 },
    { width: 360, height: 420, mode: 'expanded', visible: 7 },
    { width: 360, height: 460, mode: 'expanded', visible: 8 },
  ] as const;

  for (const expected of cases) {
    const plan = getWidgetLayoutPlan(makeReminders(), expected.width, expected.height);

    assert.equal(plan.mode, expected.mode);
    assert.equal(plan.visibleReminderCount, expected.visible);
    assert.equal(plan.hero?.reminderId, 'reminder-1');
    assert.equal(plan.queueRows.length, expected.visible - 1);
    assert.deepEqual(
      plan.queueRows.map((row) => row.reminderId),
      plan.visibleReminderIds.slice(1),
    );
  }
});

test('android widget reports overflow after the nearest eight reminders', () => {
  const plan = getWidgetLayoutPlan(makeReminders(10), 360, 460);

  assert.equal(plan.visibleReminderCount, 8);
  assert.equal(plan.overflowCount, 2);
  assert.deepEqual(plan.visibleReminderIds, [
    'reminder-1',
    'reminder-2',
    'reminder-3',
    'reminder-4',
    'reminder-5',
    'reminder-6',
    'reminder-7',
    'reminder-8',
  ]);
});

test('android widget keeps header, add action, hero, and queue inside every surface', () => {
  for (const { width, height } of [
    { width: 250, height: 180 },
    { width: 320, height: 220 },
    { width: 360, height: 280 },
    { width: 360, height: 320 },
    { width: 480, height: 320 },
    { width: 360, height: 380 },
    { width: 360, height: 420 },
    { width: 360, height: 460 },
  ]) {
    const plan = getWidgetLayoutPlan(makeReminders(), width, height);
    const surfaceBounds = { left: 0, top: 0, right: width, bottom: height, width, height };

    assertInside(plan.header, surfaceBounds);
    assertInside(plan.addButton, surfaceBounds);
    assert.ok(plan.hero);
    assertInside(plan.hero, surfaceBounds);
    assertInside(plan.queueBounds, surfaceBounds);
    assert.equal(plan.addButton.top, plan.header.top);
    assert.equal(plan.addButton.bottom, plan.header.bottom);
    assert.ok(plan.header.right < plan.addButton.left);
    assert.ok(plan.hero.bottom <= plan.queueBounds.top);
    assertRowsDoNotOverlap(plan.queueRows);

    for (const row of plan.queueRows) {
      assertInside(row, plan.queueBounds);
      assert.equal(row.left, plan.queueBounds.left);
      assert.equal(row.width, plan.queueBounds.width);
    }
  }
});

test('empty widget reserves the complete content area for its add state', () => {
  const plan = getWidgetLayoutPlan([], 250, 180);

  assert.equal(plan.hero, null);
  assert.deepEqual(plan.queueRows, []);
  assert.equal(plan.queueBounds.left, 8);
  assert.equal(plan.queueBounds.right, 242);
  assert.equal(plan.queueBounds.bottom, 172);
  assert.equal(plan.header.right, 242);
});

test('hero and queue layout stays deterministic for the same size and reminder order', () => {
  const first = getWidgetLayoutPlan(makeReminders(), 480, 320);
  const second = getWidgetLayoutPlan(makeReminders(), 480, 320);

  assert.deepEqual(second, first);
});
