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

test('android widget prioritizes readable rows while promoting the first reminder to hero', () => {
  const cases = [
    { width: 250, height: 180, mode: 'compact', visible: 1 },
    { width: 320, height: 220, mode: 'compact', visible: 2 },
    { width: 360, height: 280, mode: 'list', visible: 2 },
    { width: 360, height: 320, mode: 'expanded', visible: 2 },
    { width: 480, height: 320, mode: 'expanded', visible: 2 },
    { width: 360, height: 380, mode: 'expanded', visible: 3 },
    { width: 360, height: 420, mode: 'expanded', visible: 4 },
    { width: 360, height: 460, mode: 'expanded', visible: 5 },
    { width: 360, height: 840, mode: 'expanded', visible: 8 },
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
  const plan = getWidgetLayoutPlan(makeReminders(10), 360, 840);

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
    assert.equal(plan.addButton.width, plan.header.width);
    assert.ok(plan.addButton.height >= 48);
    assert.ok(plan.hero);
    assertInside(plan.hero, surfaceBounds);
    assert.ok(plan.hero.height >= 64);
    assertInside(plan.queueBounds, surfaceBounds);
    assert.ok(plan.header.bottom <= plan.hero.top);
    assert.ok(plan.queueBounds.bottom < plan.addButton.top);
    assert.equal(plan.addButton.left, plan.header.left);
    assert.ok(plan.hero.bottom <= plan.queueBounds.top);
    assertRowsDoNotOverlap(plan.queueRows);

    for (const row of plan.queueRows) {
      assertInside(row, plan.queueBounds);
      assert.equal(row.height, 48);
      assert.equal(row.left, plan.queueBounds.left);
      assert.equal(row.width, plan.queueBounds.width);
    }
  }
});

test('empty widget reserves the complete content area for its add state', () => {
  const plan = getWidgetLayoutPlan([], 250, 180);

  assert.equal(plan.hero, null);
  assert.deepEqual(plan.queueRows, []);
  assert.equal(plan.queueBounds.left, 12);
  assert.equal(plan.queueBounds.right, 238);
  assert.ok(plan.queueBounds.bottom < plan.addButton.top);
  assert.equal(plan.header.right, 238);
});

test('hero and queue layout stays deterministic for the same size and reminder order', () => {
  const first = getWidgetLayoutPlan(makeReminders(), 480, 320);
  const second = getWidgetLayoutPlan(makeReminders(), 480, 320);

  assert.deepEqual(second, first);
});

const today = new Date(2030, 4, 12, 10);
const allDayReminder = {
  id: 'all-day',
  title: '書類を提出',
  targetAt: new Date(2030, 4, 12).toISOString(),
  allDay: true,
  isExpired: false,
};
const timedReminder = {
  id: 'timed',
  title: '歯医者',
  targetAt: new Date(2030, 4, 12, 14).toISOString(),
  isExpired: false,
};
const tomorrowReminder = {
  id: 'tomorrow',
  title: '明日の予定',
  targetAt: new Date(2030, 4, 13, 9).toISOString(),
  isExpired: false,
};

test('today timed reminders take the hero while all-day reminders remain in a summary', () => {
  const plan = getWidgetLayoutPlan(
    [allDayReminder, { ...allDayReminder, id: 'second-all-day' }, timedReminder, tomorrowReminder],
    250,
    180,
    today,
  );

  assert.equal(plan.hero?.reminderId, 'timed');
  assert.equal(plan.allDaySummary?.text, '今日の終日：書類を提出 ほか1件');
  assert.deepEqual(plan.queueRows, []);
});

test('all-day summary, timed hero, queue, and add action never overlap at supported sizes', () => {
  for (const { width, height } of [
    { width: 250, height: 180 },
    { width: 320, height: 220 },
    { width: 360, height: 280 },
    { width: 360, height: 320 },
    { width: 480, height: 320 },
    { width: 360, height: 420 },
    { width: 360, height: 840 },
  ]) {
    const plan = getWidgetLayoutPlan(
      [allDayReminder, timedReminder, tomorrowReminder],
      width,
      height,
      today,
    );
    assert.ok(plan.hero);
    assert.ok(plan.allDaySummary);
    const bounds = { left: 0, top: 0, right: width, bottom: height, width, height };
    assertInside(plan.hero, bounds);
    assertInside(plan.allDaySummary, bounds);
    assert.ok(plan.hero.height >= 48);
    assert.ok(plan.hero.bottom <= plan.allDaySummary.top);
    assert.ok(plan.allDaySummary.bottom <= plan.queueBounds.top);
    assert.ok(plan.queueBounds.bottom < plan.addButton.top);
    for (const row of plan.queueRows) assertInside(row, plan.queueBounds);
    assert.ok(!plan.queueRows.some((row) => row.reminderId === allDayReminder.id));
  }
});

test('today all-day stays ahead of tomorrow when no upcoming timed reminder remains today', () => {
  const plan = getWidgetLayoutPlan(
    [allDayReminder, tomorrowReminder, { ...timedReminder, isExpired: true }],
    360,
    320,
    new Date(2030, 4, 12, 15),
  );
  assert.equal(plan.hero?.reminderId, 'all-day');
  assert.equal(plan.allDaySummary, null);
  assert.equal(plan.queueRows[0]?.reminderId, 'tomorrow');
});

test('the earliest upcoming time wins and expired all-day reminders are not summarized', () => {
  const plan = getWidgetLayoutPlan(
    [
      { ...allDayReminder, isExpired: true },
      { ...timedReminder, id: 'later', targetAt: new Date(2030, 4, 12, 18).toISOString() },
      timedReminder,
    ],
    250,
    180,
    today,
  );
  assert.equal(plan.hero?.reminderId, 'timed');
  assert.equal(plan.allDaySummary, null);
});

test('tomorrow all-day is the next reminder when today has no plans', () => {
  const plan = getWidgetLayoutPlan(
    [{ ...allDayReminder, targetAt: new Date(2030, 4, 13).toISOString() }, tomorrowReminder],
    250,
    180,
    today,
  );
  assert.equal(plan.hero?.reminderId, 'all-day');
  assert.equal(plan.allDaySummary, null);
});

test('all-day grouping follows local midnight rather than the UTC date', () => {
  const plan = getWidgetLayoutPlan(
    [
      allDayReminder,
      { ...timedReminder, targetAt: new Date(2030, 4, 12, 1).toISOString() },
      tomorrowReminder,
    ],
    250,
    180,
    new Date(2030, 4, 12, 0, 30),
  );
  assert.equal(plan.hero?.reminderId, 'timed');
  assert.equal(plan.allDaySummary?.text, '今日の終日：書類を提出');
});
