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

export type WidgetListRowLayout = WidgetRect & {
  reminderId: string;
};

export type WidgetDisplayMode = 'compact' | 'list' | 'expanded';

export type WidgetLayoutPlan = {
  mode: WidgetDisplayMode;
  visibleReminderCount: number;
  visibleReminderIds: string[];
  header: WidgetRect;
  listBounds: WidgetRect;
  listRows: WidgetListRowLayout[];
  addButton: WidgetRect;
};

export const WIDGET_SURFACE_PADDING = 12;
export const WIDGET_PLUS_TOUCH_HEIGHT = 44;
export const WIDGET_MAX_VISIBLE_REMINDERS = 8;
export const WIDGET_LIST_ROW_MIN_HEIGHT = 39;

const WIDGET_COMPACT_SURFACE_PADDING = 8;
const WIDGET_HEADER_HEIGHT = 26;
const WIDGET_COMPACT_HEADER_HEIGHT = 22;
const WIDGET_HEADER_GAP = 6;
const WIDGET_COMPACT_HEADER_GAP = 4;
const WIDGET_LIST_GAP = 4;
const WIDGET_COMPACT_LIST_GAP = 4;
const WIDGET_ADD_BUTTON_GAP = 8;
const WIDGET_COMPACT_ADD_BUTTON_GAP = 6;

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

function getVisibleCapacity(listHeight: number, rowGap: number) {
  return clamp(
    Math.floor((listHeight + rowGap) / (WIDGET_LIST_ROW_MIN_HEIGHT + rowGap)),
    1,
    WIDGET_MAX_VISIBLE_REMINDERS,
  );
}

function getListRows(
  reminderIds: string[],
  listBounds: WidgetRect,
  rowGap: number,
): WidgetListRowLayout[] {
  if (reminderIds.length === 0) {
    return [];
  }

  return reminderIds.map((reminderId, index) => ({
    ...makeRect(
      listBounds.left,
      listBounds.top + index * (WIDGET_LIST_ROW_MIN_HEIGHT + rowGap),
      listBounds.width,
      WIDGET_LIST_ROW_MIN_HEIGHT,
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
  const rowGap = isCompact ? WIDGET_COMPACT_LIST_GAP : WIDGET_LIST_GAP;
  const addButtonGap = isCompact ? WIDGET_COMPACT_ADD_BUTTON_GAP : WIDGET_ADD_BUTTON_GAP;
  const header = makeRect(
    surfacePadding,
    surfacePadding,
    Math.max(0, widgetWidth - surfacePadding * 2),
    headerHeight,
  );
  const addButton = makeRect(
    widgetWidth - surfacePadding - WIDGET_PLUS_TOUCH_HEIGHT,
    widgetHeight - surfacePadding - WIDGET_PLUS_TOUCH_HEIGHT,
    WIDGET_PLUS_TOUCH_HEIGHT,
    WIDGET_PLUS_TOUCH_HEIGHT,
  );
  const listTop = header.bottom + headerGap;
  const listBounds = makeRect(
    surfacePadding,
    listTop,
    Math.max(0, widgetWidth - surfacePadding * 2),
    Math.max(0, addButton.top - addButtonGap - listTop),
  );
  const capacity = getVisibleCapacity(listBounds.height, rowGap);
  const visibleReminders = reminders.slice(0, capacity);
  const visibleReminderIds = visibleReminders.map((reminder) => reminder.id);

  return {
    mode,
    visibleReminderCount: visibleReminders.length,
    visibleReminderIds,
    header,
    listBounds,
    listRows: getListRows(visibleReminderIds, listBounds, rowGap),
    addButton,
  };
}
