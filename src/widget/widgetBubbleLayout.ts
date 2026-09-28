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

export type WidgetReminderLayout = WidgetRect & {
  reminderId: string;
};

export type WidgetDisplayMode = 'compact' | 'list' | 'expanded';

export type WidgetLayoutPlan = {
  mode: WidgetDisplayMode;
  visibleReminderCount: number;
  visibleReminderIds: string[];
  overflowCount: number;
  header: WidgetRect;
  addButton: WidgetRect;
  hero: WidgetReminderLayout | null;
  queueBounds: WidgetRect;
  queueRows: WidgetReminderLayout[];
};

export const WIDGET_SURFACE_PADDING = 18;
export const WIDGET_MAX_VISIBLE_REMINDERS = 8;
export const WIDGET_QUEUE_ROW_HEIGHT = 48;
const WIDGET_QUEUE_GAP = 4;

function makeRect(left: number, top: number, width: number, height: number): WidgetRect {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

export function getWidgetDisplayMode(widgetWidth: number, widgetHeight: number): WidgetDisplayMode {
  if (widgetWidth >= 340 && widgetHeight >= 300) return 'expanded';
  if (widgetWidth >= 300 && widgetHeight >= 250) return 'list';
  return 'compact';
}

function makeQueueRows(reminderIds: string[], bounds: WidgetRect): WidgetReminderLayout[] {
  return reminderIds.map((reminderId, index) => ({
    ...makeRect(
      bounds.left,
      bounds.top + index * (WIDGET_QUEUE_ROW_HEIGHT + WIDGET_QUEUE_GAP),
      bounds.width,
      WIDGET_QUEUE_ROW_HEIGHT,
    ),
    reminderId,
  }));
}

export function getWidgetLayoutPlan(
  reminders: WidgetLayoutReminder[],
  widgetWidth: number,
  widgetHeight: number,
): WidgetLayoutPlan {
  const mode = getWidgetDisplayMode(widgetWidth, widgetHeight);
  const compact = mode === 'compact';
  const padding = compact ? 12 : WIDGET_SURFACE_PADDING;
  const width = Math.max(0, widgetWidth - padding * 2);
  const header = makeRect(padding, padding, width, compact ? 18 : 24);
  const addHeight = compact ? 48 : 54;
  const addButton = makeRect(padding, widgetHeight - padding - addHeight, width, addHeight);
  const contentTop = header.bottom + (compact ? 6 : 10);
  const contentBottom = addButton.top - 8;
  const hero = reminders.length
    ? {
        ...makeRect(padding, contentTop, width, compact ? 64 : 92),
        reminderId: reminders[0].id,
      }
    : null;
  const queueTop = hero ? Math.min(contentBottom, hero.bottom + (compact ? 4 : 8)) : contentTop;
  const queueBounds = makeRect(padding, queueTop, width, Math.max(0, contentBottom - queueTop));
  const capacity = Math.max(
    0,
    Math.floor(
      (queueBounds.height + WIDGET_QUEUE_GAP) / (WIDGET_QUEUE_ROW_HEIGHT + WIDGET_QUEUE_GAP),
    ),
  );
  const visibleReminderIds = reminders
    .slice(0, Math.min(WIDGET_MAX_VISIBLE_REMINDERS, 1 + capacity))
    .map((reminder) => reminder.id);

  return {
    mode,
    visibleReminderCount: visibleReminderIds.length,
    visibleReminderIds,
    overflowCount: Math.max(0, reminders.length - visibleReminderIds.length),
    header,
    addButton,
    hero,
    queueBounds,
    queueRows: makeQueueRows(visibleReminderIds.slice(1), queueBounds),
  };
}
