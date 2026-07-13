import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getWidgetLayoutPlan,
  WIDGET_PLUS_TOUCH_HEIGHT,
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

type ExpectedListPlan = ReturnType<typeof getWidgetLayoutPlan> & {
  header: WidgetRect;
  listBounds: WidgetRect;
  listRows: (WidgetRect & { reminderId: string })[];
};

function makeReminders(count = reminderTitles.length): WidgetLayoutReminder[] {
  return reminderTitles.slice(0, count).map((title, index) => ({
    id: `reminder-${index + 1}`,
    title,
    targetAt: new Date(2026, 6, index + 1, 9).toISOString(),
  }));
}

function asListPlan(plan: ReturnType<typeof getWidgetLayoutPlan>): ExpectedListPlan {
  return plan as ExpectedListPlan;
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

function assertRowsDoNotOverlap(rows: WidgetRect[]) {
  for (let index = 0; index < rows.length - 1; index += 1) {
    assert.ok(rows[index].bottom <= rows[index + 1].top);
  }
}

test('android widget chooses deterministic list capacities by available size', () => {
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
    const plan = asListPlan(
      getWidgetLayoutPlan(makeReminders(expected.visible), expected.width, expected.height),
    );

    assert.equal(plan.mode, expected.mode);
    assert.equal(plan.visibleReminderCount, expected.visible);
    assert.equal(plan.listRows.length, expected.visible);
  }
});

test('android widget shows only the nearest eight reminders in DB order', () => {
  const plan = asListPlan(getWidgetLayoutPlan(makeReminders(10), 360, 460));

  assert.equal(plan.visibleReminderCount, 8);
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
  assert.deepEqual(
    plan.listRows.map((row) => row.reminderId),
    plan.visibleReminderIds,
  );
});

test('android widget keeps rows, header, and centered add button inside the surface', () => {
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
    const plan = asListPlan(getWidgetLayoutPlan(makeReminders(), width, height));
    const surfaceBounds = { left: 0, top: 0, right: width, bottom: height };

    assertInside(plan.header, surfaceBounds);
    assertInside(plan.listBounds, surfaceBounds);
    assertInside(plan.addButton, surfaceBounds);
    assertRowsDoNotOverlap(plan.listRows);
    assert.equal(plan.addButton.height, WIDGET_PLUS_TOUCH_HEIGHT);
    assert.ok(plan.addButton.width >= 180);
    assert.ok(Math.abs(plan.addButton.left + plan.addButton.width / 2 - width / 2) <= 0.5);

    for (const row of plan.listRows) {
      assertInside(row, plan.listBounds);
      assert.equal(row.left, plan.listBounds.left);
      assert.equal(row.width, plan.listBounds.width);
      assert.equal(row.height, 39);
    }
  }
});

test('android widget list layout is stable for the same size and reminder order', () => {
  const first = getWidgetLayoutPlan(makeReminders(), 480, 320);
  const second = getWidgetLayoutPlan(makeReminders(), 480, 320);

  assert.deepEqual(second, first);
});
