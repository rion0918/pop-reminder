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
  headerText: 'rgba(255,255,255,0.90)',
  mutedText: 'rgba(255,255,255,0.72)',
  cloudSurfaceBackground: 'rgba(239,248,255,0.24)',
  cloudSurfaceBorder: 'rgba(255,255,255,0.28)',
  cloudMistHighlight: 'rgba(255,255,255,0.18)',
  cloudMistShade: 'rgba(38,49,81,0.10)',
  glassRefractionA: 'rgba(223,243,255,0.24)',
  glassRefractionB: 'rgba(237,230,255,0.18)',
  glassRefractionC: 'rgba(255,241,216,0.16)',
  glassInnerShadow: 'rgba(38,49,81,0.12)',
  glassEdgeHighlight: 'rgba(255,255,255,0.46)',
  plusIconText: palette.white,
  textHalo: 'rgba(38,49,81,0.50)',
} as const;
