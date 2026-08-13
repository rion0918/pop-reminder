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

export const WIDGET_SURFACE_PADDING = 12;
export const WIDGET_MAX_VISIBLE_REMINDERS = 8;
export const WIDGET_QUEUE_ROW_HEIGHT = 40;

const WIDGET_COMPACT_SURFACE_PADDING = 8;
const WIDGET_HEADER_HEIGHT = 40;
const WIDGET_COMPACT_HEADER_HEIGHT = 34;
const WIDGET_HEADER_GAP = 8;
const WIDGET_COMPACT_HEADER_GAP = 6;
const WIDGET_HEADER_ACTION_GAP = 8;
const WIDGET_COMPACT_HEADER_ACTION_GAP = 6;
const WIDGET_ADD_BUTTON_SIZE = 40;
const WIDGET_COMPACT_ADD_BUTTON_SIZE = 34;
const WIDGET_HERO_HEIGHT = 68;
const WIDGET_LIST_HERO_HEIGHT = 64;
const WIDGET_COMPACT_HERO_HEIGHT = 56;
const WIDGET_HERO_QUEUE_GAP = 8;
const WIDGET_COMPACT_HERO_QUEUE_GAP = 6;
const WIDGET_QUEUE_GAP = 4;

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

export function getWidgetDisplayMode(widgetWidth: number, widgetHeight: number): WidgetDisplayMode {
  if (widgetWidth >= 340 && widgetHeight >= 300) {
    return 'expanded';
  }

  if (widgetWidth >= 300 && widgetHeight >= 250) {
    return 'list';
  }

  return 'compact';
}

function getQueueCapacity(queueHeight: number) {
  return clamp(
    Math.floor((queueHeight + WIDGET_QUEUE_GAP) / (WIDGET_QUEUE_ROW_HEIGHT + WIDGET_QUEUE_GAP)),
    0,
    WIDGET_MAX_VISIBLE_REMINDERS - 1,
  );
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
  const isCompact = mode === 'compact';
  const surfacePadding = isCompact ? WIDGET_COMPACT_SURFACE_PADDING : WIDGET_SURFACE_PADDING;
  const headerHeight = isCompact ? WIDGET_COMPACT_HEADER_HEIGHT : WIDGET_HEADER_HEIGHT;
  const headerGap = isCompact ? WIDGET_COMPACT_HEADER_GAP : WIDGET_HEADER_GAP;
  const headerActionGap = isCompact ? WIDGET_COMPACT_HEADER_ACTION_GAP : WIDGET_HEADER_ACTION_GAP;
  const addButtonSize = isCompact ? WIDGET_COMPACT_ADD_BUTTON_SIZE : WIDGET_ADD_BUTTON_SIZE;
  const heroHeight =
    mode === 'compact'
      ? WIDGET_COMPACT_HERO_HEIGHT
      : mode === 'list'
        ? WIDGET_LIST_HERO_HEIGHT
        : WIDGET_HERO_HEIGHT;
  const heroQueueGap = isCompact ? WIDGET_COMPACT_HERO_QUEUE_GAP : WIDGET_HERO_QUEUE_GAP;
  const addButton = makeRect(
    Math.max(surfacePadding, widgetWidth - surfacePadding - addButtonSize),
    surfacePadding,
    addButtonSize,
    headerHeight,
  );
  const header = makeRect(
    surfacePadding,
    surfacePadding,
    Math.max(0, addButton.left - headerActionGap - surfacePadding),
    headerHeight,
  );
  const contentTop = header.bottom + headerGap;
  const contentHeight = Math.max(0, widgetHeight - surfacePadding - contentTop);

  if (reminders.length === 0) {
    return {
      mode,
      visibleReminderCount: 0,
      visibleReminderIds: [],
      overflowCount: 0,
      header: makeRect(
        surfacePadding,
        surfacePadding,
        Math.max(0, widgetWidth - surfacePadding * 2),
        headerHeight,
      ),
      addButton,
      hero: null,
      queueBounds: makeRect(
        surfacePadding,
        contentTop,
        Math.max(0, widgetWidth - surfacePadding * 2),
        contentHeight,
      ),
      queueRows: [],
    };
  }

  const resolvedHeroHeight = Math.min(heroHeight, contentHeight);
  const hero = {
    ...makeRect(
      surfacePadding,
      contentTop,
      Math.max(0, widgetWidth - surfacePadding * 2),
      resolvedHeroHeight,
    ),
    reminderId: reminders[0].id,
  };
  const queueTop = Math.min(widgetHeight - surfacePadding, hero.bottom + heroQueueGap);
  const queueBounds = makeRect(
    surfacePadding,
    queueTop,
    Math.max(0, widgetWidth - surfacePadding * 2),
    Math.max(0, widgetHeight - surfacePadding - queueTop),
  );
  const visibleReminders = reminders.slice(
    0,
    Math.min(WIDGET_MAX_VISIBLE_REMINDERS, 1 + getQueueCapacity(queueBounds.height)),
  );
  const visibleReminderIds = visibleReminders.map((reminder) => reminder.id);

  return {
    mode,
    visibleReminderCount: visibleReminders.length,
    visibleReminderIds,
    overflowCount: Math.max(0, reminders.length - visibleReminders.length),
    header,
    addButton,
    hero,
    queueBounds,
    queueRows: makeQueueRows(visibleReminderIds.slice(1), queueBounds),
  };
}
