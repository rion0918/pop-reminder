import type { WidgetDisplayMode } from './widgetBubbleLayout';

export const WIDGET_DEFAULT_WIDTH = 250;
export const WIDGET_DEFAULT_HEIGHT = 180;
export const WIDGET_FONT_FAMILY = 'sans-serif-rounded';
export const WIDGET_GLASS_BUBBLE = require('../../assets/widget-glass-bubble.png');

export function getWidgetTypography(mode: WidgetDisplayMode) {
  const compact = mode === 'compact';
  return {
    headerFontSize: compact ? 13 : 15,
    labelFontSize: compact ? 10 : 12,
    titleFontSize: compact ? 20 : 34,
    timeFontSize: compact ? 16 : 24,
    titleLines: 1,
    queueTitleFontSize: 14,
    queueTimeFontSize: 12,
    bubbleSize: compact ? 0 : 48,
    addFontSize: compact ? 16 : 17,
  };
}
