import { differenceInCalendarDays } from 'date-fns';

import { bubbleDueColors, homeVisualTokens, palette } from '../constants/colors';

export type WidgetDueColor = (typeof bubbleDueColors)[keyof typeof bubbleDueColors];

export { homeVisualTokens };

export function getWidgetDueColor(
  targetAt: string | Date,
  currentDate = new Date(),
): WidgetDueColor {
  const daysUntilTarget = differenceInCalendarDays(new Date(targetAt), currentDate);

  if (daysUntilTarget <= 0) {
    return bubbleDueColors.today;
  }

  if (daysUntilTarget === 1) {
    return bubbleDueColors.tomorrow;
  }

  if (daysUntilTarget <= 3) {
    return bubbleDueColors.soon;
  }

  return bubbleDueColors.later;
}

export const widgetTheme = {
  headerBackground: palette.ink,
  headerText: palette.white,
  primaryText: palette.ink,
  secondaryText: 'rgba(38,49,81,0.84)',
  cloudSurfaceBackground: '#A8D1F0',
  cloudSurfaceOverlay: 'rgba(247,251,255,0.42)',
  cloudSurfaceBorder: 'rgba(38,49,81,0.14)',
  cloudMistHighlight: 'rgba(255,255,255,0.44)',
  cloudMistShade: 'rgba(38,49,81,0.08)',
  glassRefractionA: 'rgba(223,243,255,0.42)',
  glassRefractionB: 'rgba(237,230,255,0.36)',
  glassRefractionC: 'rgba(255,241,216,0.32)',
  glassInnerShadow: 'rgba(38,49,81,0.12)',
  glassEdgeHighlight: 'rgba(255,255,255,0.78)',
  plusButtonBackground: palette.ink,
  plusButtonText: palette.white,
  textHalo: 'rgba(255,255,255,0.72)',
} as const;
