import type { WidgetDisplayMode } from './widgetBubbleLayout';
import type { WidgetThemeTokens } from './widgetColors';

export const WIDGET_DEFAULT_WIDTH = 250;
export const WIDGET_DEFAULT_HEIGHT = 180;
export const WIDGET_ROW_ACTION_SIZE = 32;
export const WIDGET_FONT_FAMILY = 'sans-serif-rounded';

export function getWidgetTypography(mode: WidgetDisplayMode) {
  if (mode === 'compact') {
    return {
      headerFontSize: 15,
      countFontSize: 10,
      heroKickerFontSize: 9,
      heroTitleFontSize: 14,
      heroTimeFontSize: 9,
      queueTitleFontSize: 12,
      queueTimeFontSize: 9,
      heroBubbleSize: 30,
      queueBubbleSize: 12,
      heroHorizontalPadding: 9,
      queueHorizontalPadding: 8,
      timeWidth: 66,
    };
  }

  return {
    headerFontSize: 17,
    countFontSize: 11,
    heroKickerFontSize: 10,
    heroTitleFontSize: 16,
    heroTimeFontSize: 10,
    queueTitleFontSize: 13,
    queueTimeFontSize: 10,
    heroBubbleSize: 36,
    queueBubbleSize: 14,
    heroHorizontalPadding: 11,
    queueHorizontalPadding: 10,
    timeWidth: 80,
  };
}

export function makeWidgetBackdropSvg(width: number, height: number, theme: WidgetThemeTokens) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}" preserveAspectRatio="none">
  <defs>
    <radialGradient id="ambient-a" cx="24%" cy="16%" r="72%">
      <stop offset="0%" stop-color="${theme.ambientPrimary}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${theme.ambientPrimary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ambient-b" cx="82%" cy="28%" r="68%">
      <stop offset="0%" stop-color="${theme.ambientSecondary}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${theme.ambientSecondary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ambient-c" cx="62%" cy="100%" r="72%">
      <stop offset="0%" stop-color="${theme.ambientTertiary}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${theme.ambientTertiary}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${safeWidth * 0.16}" cy="${safeHeight * 0.06}" rx="${safeWidth * 0.58}" ry="${safeHeight * 0.56}" fill="url(#ambient-a)"/>
  <ellipse cx="${safeWidth * 0.94}" cy="${safeHeight * 0.26}" rx="${safeWidth * 0.52}" ry="${safeHeight * 0.48}" fill="url(#ambient-b)"/>
  <ellipse cx="${safeWidth * 0.62}" cy="${safeHeight * 1.06}" rx="${safeWidth * 0.72}" ry="${safeHeight * 0.42}" fill="url(#ambient-c)"/>
  <circle cx="${safeWidth * 0.86}" cy="${safeHeight * 0.78}" r="${Math.max(15, Math.min(safeWidth, safeHeight) * 0.13)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.34" stroke-width="1"/>
</svg>`;
}

export function makeWidgetTrashSvg(color: string) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
  <path d="M8 8v10m4-10v10m4-10v10M5 6h14M9 6V4h6v2m-9 0 1 15h10l1-15" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}
