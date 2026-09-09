import type { WidgetDisplayMode } from './widgetBubbleLayout';

export const WIDGET_DEFAULT_WIDTH = 250;
export const WIDGET_DEFAULT_HEIGHT = 180;
export const WIDGET_ROW_ACTION_SIZE = 48;
export const WIDGET_FONT_FAMILY = 'sans-serif-rounded';

export function getWidgetTypography(mode: WidgetDisplayMode) {
  return {
    headerFontSize: 16,
    countFontSize: 12,
    titleFontSize: mode === 'compact' ? 14 : 16,
    timeFontSize: 12,
    bubbleSize: 12,
  };
}

export function makeWidgetTrashSvg(color: string) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
  <path d="M8 8v10m4-10v10m4-10v10M5 6h14M9 6V4h6v2m-9 0 1 15h10l1-15" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}
