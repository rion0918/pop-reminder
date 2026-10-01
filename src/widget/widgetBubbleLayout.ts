import { isSameLocalDay } from '../features/reminders/domain/localDate';

export type WidgetLayoutReminder = {
  id: string;
  title: string;
  targetAt?: string;
  allDay?: boolean;
  isExpired?: boolean;
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
  allDaySummary: (WidgetRect & { text: string }) | null;
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
  now = new Date(),
): WidgetLayoutPlan {
  const todayReminders = reminders.filter(
    (reminder) =>
      !reminder.isExpired && reminder.targetAt && isSameLocalDay(new Date(reminder.targetAt), now),
  );
  const todayAllDay = todayReminders.filter((reminder) => reminder.allDay);
  const nextTimed = todayReminders
    .filter((reminder) => !reminder.allDay && new Date(reminder.targetAt ?? '') > now)
    .sort((first, second) => (first.targetAt ?? '').localeCompare(second.targetAt ?? ''))[0];
  const heroReminder = nextTimed ?? todayAllDay[0] ?? reminders[0];
  const summarizeAllDay = Boolean(nextTimed && todayAllDay.length);
  const todayAllDayIds = new Set(todayAllDay.map((reminder) => reminder.id));
  const orderedReminders = heroReminder
    ? [
        heroReminder,
        ...reminders.filter(
          (reminder) =>
            reminder.id !== heroReminder.id &&
            !(summarizeAllDay && todayAllDayIds.has(reminder.id)),
        ),
      ]
    : [];
  const mode = getWidgetDisplayMode(widgetWidth, widgetHeight);
  const compact = mode === 'compact';
  const padding = compact ? 12 : WIDGET_SURFACE_PADDING;
  const width = Math.max(0, widgetWidth - padding * 2);
  const header = makeRect(padding, padding, width, compact ? 18 : 24);
  const addHeight = compact ? 48 : 54;
  const addButton = makeRect(padding, widgetHeight - padding - addHeight, width, addHeight);
  const contentTop = header.bottom + (compact ? (summarizeAllDay ? 0 : 6) : 10);
  const contentBottom = addButton.top - 8;
  const hero = heroReminder
    ? {
        ...makeRect(padding, contentTop, width, compact ? 64 : 92),
        reminderId: heroReminder.id,
      }
    : null;
  const allDaySummary =
    summarizeAllDay && hero
      ? {
          ...makeRect(padding, hero.bottom + (compact ? 0 : 8), width, compact ? 18 : 24),
          text: `今日の終日：${todayAllDay[0].title}${todayAllDay.length > 1 ? ` ほか${todayAllDay.length - 1}件` : ''}`,
        }
      : null;
  const contentEnd = allDaySummary ?? hero;
  const queueTop = contentEnd
    ? Math.min(contentBottom, contentEnd.bottom + (compact ? 4 : 8))
    : contentTop;
  const queueBounds = makeRect(padding, queueTop, width, Math.max(0, contentBottom - queueTop));
  const capacity = Math.max(
    0,
    Math.floor(
      (queueBounds.height + WIDGET_QUEUE_GAP) / (WIDGET_QUEUE_ROW_HEIGHT + WIDGET_QUEUE_GAP),
    ),
  );
  const visibleReminderIds = orderedReminders
    .slice(0, Math.min(WIDGET_MAX_VISIBLE_REMINDERS, 1 + capacity))
    .map((reminder) => reminder.id);

  return {
    mode,
    visibleReminderCount: visibleReminderIds.length,
    visibleReminderIds,
    overflowCount: Math.max(0, orderedReminders.length - visibleReminderIds.length),
    header,
    addButton,
    hero,
    allDaySummary,
    queueBounds,
    queueRows: makeQueueRows(visibleReminderIds.slice(1), queueBounds),
  };
}
