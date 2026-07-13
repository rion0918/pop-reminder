export type WidgetLayoutReminder = {
  id: string;
  title: string;
  targetAt?: string;
};

export type WidgetRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type WidgetBubbleLayout = WidgetRect;

export type WidgetReminderBubbleLayout = WidgetBubbleLayout & {
  reminderId: string;
};

export type WidgetDisplayMode = 'compact' | 'list' | 'two-column';

export type WidgetLayoutPlan = {
  mode: WidgetDisplayMode;
  visibleReminderCount: number;
  visibleReminderIds: string[];
  reminderBubbles: WidgetReminderBubbleLayout[];
  bubbleSlots: WidgetBubbleLayout[];
  overflowCount: number;
  overflowBubble?: WidgetBubbleLayout;
  contentBounds: WidgetRect;
  addButton: WidgetRect;
};

export const WIDGET_SURFACE_PADDING = 12;
export const WIDGET_HEADER_HEIGHT = 44;
export const WIDGET_PLUS_TOUCH_WIDTH = 84;
export const WIDGET_PLUS_TOUCH_HEIGHT = 44;
export const WIDGET_PRIORITY_BUBBLE_MIN_HEIGHT = 72;
export const WIDGET_PRIORITY_BUBBLE_MAX_HEIGHT = 144;
export const WIDGET_MAX_VISIBLE_REMINDERS = 5;

const WIDGET_HEADER_GAP = 8;
const WIDGET_BUBBLE_GAP = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function makeRect(left: number, top: number, width: number, height: number): WidgetRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

function makeBubble(left: number, top: number, size: number) {
  return makeRect(left, top, size, size);
}

export function getWidgetDisplayMode(widgetWidth: number, widgetHeight: number): WidgetDisplayMode {
  if (widgetWidth >= 360 && widgetHeight >= 280) {
    return 'two-column';
  }

  if (widgetWidth >= 320 && widgetHeight >= 220) {
    return 'list';
  }

  return 'compact';
}

function getBubbleCapacity(mode: WidgetDisplayMode) {
  if (mode === 'compact') {
    return 2;
  }

  if (mode === 'list') {
    return 3;
  }

  return WIDGET_MAX_VISIBLE_REMINDERS;
}

function getPriorityBubbleSize(mode: WidgetDisplayMode, contentBounds: WidgetRect) {
  if (mode === 'compact') {
    return Math.round(clamp(contentBounds.height * 0.74, 72, 76));
  }

  if (mode === 'list') {
    return Math.round(clamp(contentBounds.width * 0.32, 96, 104));
  }

  return Math.round(
    clamp(
      Math.min(contentBounds.width * 0.38, contentBounds.height * 0.7),
      128,
      WIDGET_PRIORITY_BUBBLE_MAX_HEIGHT,
    ),
  );
}

function getBubbleSlots(mode: WidgetDisplayMode, contentBounds: WidgetRect): WidgetBubbleLayout[] {
  const prioritySize = getPriorityBubbleSize(mode, contentBounds);
  const priorityTop = contentBounds.top + Math.floor((contentBounds.height - prioritySize) / 2);
  const priority = makeBubble(contentBounds.left, priorityTop, prioritySize);

  if (mode === 'compact') {
    const secondarySize = Math.min(
      64,
      contentBounds.height,
      Math.max(0, contentBounds.width - prioritySize - WIDGET_BUBBLE_GAP * 2),
    );

    return [
      priority,
      makeBubble(
        contentBounds.right - secondarySize,
        contentBounds.bottom - secondarySize,
        secondarySize,
      ),
    ];
  }

  if (mode === 'list') {
    const secondarySize = Math.min(
      64,
      Math.floor((contentBounds.height - WIDGET_BUBBLE_GAP) / 2),
      Math.max(0, contentBounds.width - prioritySize - WIDGET_BUBBLE_GAP * 2),
    );
    const secondaryLeft = contentBounds.right - secondarySize;

    return [
      priority,
      makeBubble(secondaryLeft, contentBounds.top, secondarySize),
      makeBubble(secondaryLeft, contentBounds.bottom - secondarySize, secondarySize),
    ];
  }

  const secondaryLeft = priority.right + WIDGET_BUBBLE_GAP;
  const secondarySize = Math.min(
    96,
    Math.floor((contentBounds.right - secondaryLeft - WIDGET_BUBBLE_GAP) / 2),
    Math.floor((contentBounds.height - WIDGET_BUBBLE_GAP) / 2),
  );
  const secondaryRight = contentBounds.right - secondarySize;
  const secondaryBottom = contentBounds.bottom - secondarySize;

  return [
    priority,
    makeBubble(secondaryLeft, contentBounds.top, secondarySize),
    makeBubble(secondaryRight, contentBounds.top, secondarySize),
    makeBubble(secondaryLeft, secondaryBottom, secondarySize),
    makeBubble(secondaryRight, secondaryBottom, secondarySize),
  ];
}

export function getWidgetLayoutPlan(
  reminders: WidgetLayoutReminder[],
  widgetWidth: number,
  widgetHeight: number,
): WidgetLayoutPlan {
  const mode = getWidgetDisplayMode(widgetWidth, widgetHeight);
  const contentTop = WIDGET_SURFACE_PADDING + WIDGET_HEADER_HEIGHT + WIDGET_HEADER_GAP;
  const contentBounds = makeRect(
    WIDGET_SURFACE_PADDING,
    contentTop,
    Math.max(0, widgetWidth - WIDGET_SURFACE_PADDING * 2),
    Math.max(0, widgetHeight - contentTop - WIDGET_SURFACE_PADDING),
  );
  const addButton = makeRect(
    widgetWidth - WIDGET_SURFACE_PADDING - WIDGET_PLUS_TOUCH_WIDTH,
    WIDGET_SURFACE_PADDING,
    WIDGET_PLUS_TOUCH_WIDTH,
    WIDGET_PLUS_TOUCH_HEIGHT,
  );
  const bubbleSlots = getBubbleSlots(mode, contentBounds);
  const capacity = getBubbleCapacity(mode);
  const visibleReminderCount =
    reminders.length > capacity ? Math.max(1, capacity - 1) : Math.min(reminders.length, capacity);
  const visibleReminders = reminders.slice(0, visibleReminderCount);
  const visibleReminderIds = visibleReminders.map((reminder) => reminder.id);
  const overflowCount = Math.max(0, reminders.length - visibleReminderCount);

  return {
    mode,
    visibleReminderCount,
    visibleReminderIds,
    reminderBubbles: visibleReminderIds.map((reminderId, index) => ({
      ...bubbleSlots[index],
      reminderId,
    })),
    bubbleSlots,
    overflowCount,
    overflowBubble: overflowCount > 0 ? bubbleSlots[visibleReminderCount] : undefined,
    contentBounds,
    addButton,
  };
}
