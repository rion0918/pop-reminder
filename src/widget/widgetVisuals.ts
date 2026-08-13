import type { WidgetDisplayMode } from './widgetBubbleLayout';

export const WIDGET_DEFAULT_WIDTH = 250;
export const WIDGET_DEFAULT_HEIGHT = 180;
export const WIDGET_STATUS_DOT_SIZE = 12;
export const WIDGET_COMPACT_STATUS_DOT_SIZE = 10;
export const WIDGET_ROW_ACTION_SIZE = 36;
export const WIDGET_FONT_FAMILY = 'sans-serif-rounded';

export function getWidgetTypography(mode: WidgetDisplayMode) {
  if (mode === 'compact') {
    return {
      headerFontSize: 13,
      titleFontSize: 13,
      timeFontSize: 10,
      rowHorizontalPadding: 10,
      statusDotSize: WIDGET_COMPACT_STATUS_DOT_SIZE,
      statusDotGap: 9,
      timeWidth: 76,
    };
  }

  return {
    headerFontSize: 15,
    titleFontSize: 14,
    timeFontSize: 10,
    rowHorizontalPadding: 12,
    statusDotSize: WIDGET_STATUS_DOT_SIZE,
    statusDotGap: 10,
    timeWidth: 84,
  };
}
