import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getWidgetBubbleCapacity,
  getWidgetBubbleLayouts,
  WIDGET_DUE_LEGEND_HEIGHT,
  WIDGET_PLUS_TOUCH_HEIGHT,
  WIDGET_PLUS_TOUCH_WIDTH,
  WIDGET_SURFACE_PADDING,
  type WidgetBubbleLayout,
  type WidgetLayoutReminder,
} from './widgetBubbleLayout';

const reminderTitles = [
  '水やり',
  'long reminder title',
  '買い物',
  '薬',
  'meeting',
  '書類提出',
  '予約',
  'long long long title',
  '散歩',
  'email follow up',
];

function makeReminders(count = reminderTitles.length): WidgetLayoutReminder[] {
  return reminderTitles.slice(0, count).map((title, index) => ({
    id: `reminder-${index + 1}`,
    title,
    targetAt: new Date(2026, 6, index + 1, 9).toISOString(),
  }));
}

function getLayoutMetrics(
  layouts: WidgetBubbleLayout[],
  widgetWidth: number,
  widgetHeight: number,
) {
  const minLeft = Math.min(...layouts.map((layout) => layout.left));
  const maxRight = Math.max(...layouts.map((layout) => layout.left + layout.width));
  const minTop = Math.min(...layouts.map((layout) => layout.top));
  const maxBottom = Math.max(...layouts.map((layout) => layout.top + layout.height));
  const centerBandCount = layouts.filter((layout) => {
    const centerX = (layout.left + layout.width / 2) / widgetWidth;
    const centerY = (layout.top + layout.height / 2) / widgetHeight;

    return centerX >= 0.35 && centerX <= 0.65 && centerY >= 0.28 && centerY <= 0.72;
  }).length;
  const centerDistances = layouts.flatMap((layout, index) => {
    const centerX = layout.left + layout.width / 2;
    const centerY = layout.top + layout.height / 2;

    return layouts.slice(index + 1).map((otherLayout) => {
      const otherCenterX = otherLayout.left + otherLayout.width / 2;
      const otherCenterY = otherLayout.top + otherLayout.height / 2;

      return Math.hypot(centerX - otherCenterX, centerY - otherCenterY);
    });
  });

  return {
    horizontalCoverage: (maxRight - minLeft) / widgetWidth,
    verticalCoverage:
      (maxBottom - minTop) / (widgetHeight - WIDGET_DUE_LEGEND_HEIGHT - WIDGET_SURFACE_PADDING),
    centerBandCount,
    minCenterDistance: Math.min(...centerDistances),
  };
}

function assertDistributedLayout(
  widgetWidth: number,
  widgetHeight: number,
  minCenterDistance: number,
) {
  const layouts = getWidgetBubbleLayouts(makeReminders(), widgetWidth, widgetHeight);
  const metrics = getLayoutMetrics(layouts, widgetWidth, widgetHeight);

  assert.equal(layouts.length, 10);
  assert.ok(
    metrics.horizontalCoverage >= 0.85,
    `expected horizontal coverage >= 0.85, got ${metrics.horizontalCoverage}`,
  );
  assert.ok(
    metrics.verticalCoverage >= 0.8,
    `expected vertical coverage >= 0.8, got ${metrics.verticalCoverage}`,
  );
  assert.ok(
    metrics.centerBandCount <= 2,
    `expected at most 2 central bubbles, got ${metrics.centerBandCount}`,
  );
  assert.ok(
    metrics.minCenterDistance >= minCenterDistance,
    `expected min center distance >= ${minCenterDistance}, got ${metrics.minCenterDistance}`,
  );
}

function rectanglesIntersect(
  first: { left: number; top: number; right: number; bottom: number },
  second: { left: number; top: number; right: number; bottom: number },
) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

test('android widget capacity shows ten reminders on practical widget sizes', () => {
  assert.equal(getWidgetBubbleCapacity(250, 180), 3);
  assert.equal(getWidgetBubbleCapacity(320, 220), 5);
  assert.equal(getWidgetBubbleCapacity(360, 280), 10);
  assert.equal(getWidgetBubbleCapacity(480, 320), 10);
});

test('android widget layout spreads ten reminders across medium and large surfaces', () => {
  assertDistributedLayout(360, 280, 32);
  assertDistributedLayout(480, 320, 48);
});

test('android widget layout keeps ten reminders clear of the add button and legend', () => {
  const widgetWidth = 250;
  const widgetHeight = 180;
  const layouts = getWidgetBubbleLayouts(makeReminders(10), widgetWidth, widgetHeight);
  const addButtonRect = {
    left: widgetWidth - WIDGET_SURFACE_PADDING - WIDGET_PLUS_TOUCH_WIDTH,
    top: WIDGET_SURFACE_PADDING,
    right: widgetWidth - WIDGET_SURFACE_PADDING,
    bottom: WIDGET_SURFACE_PADDING + WIDGET_PLUS_TOUCH_HEIGHT,
  };
  const legendTop = widgetHeight - WIDGET_SURFACE_PADDING - WIDGET_DUE_LEGEND_HEIGHT;

  for (const layout of layouts) {
    const bubbleRect = {
      left: layout.left,
      top: layout.top,
      right: layout.left + layout.width,
      bottom: layout.top + layout.height,
    };

    assert.ok(bubbleRect.left >= WIDGET_SURFACE_PADDING);
    assert.ok(bubbleRect.right <= widgetWidth - WIDGET_SURFACE_PADDING);
    assert.ok(bubbleRect.top >= WIDGET_SURFACE_PADDING);
    assert.ok(bubbleRect.bottom <= legendTop);
    assert.equal(rectanglesIntersect(bubbleRect, addButtonRect), false);
  }
});
