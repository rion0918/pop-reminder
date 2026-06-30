import { differenceInCalendarDays } from 'date-fns';

import { bubbleDueColors, homeVisualTokens, palette } from '../constants/colors';

export type WidgetDueColor = typeof bubbleDueColors[keyof typeof bubbleDueColors];

export { homeVisualTokens };

export function getWidgetDueColor(targetAt: string | Date, currentDate = new Date()): WidgetDueColor {
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
  headerText: palette.ink,
  mutedText: palette.muted,
  cloudSurfaceBackground: 'rgba(255,255,255,0.44)',
  cloudSurfaceBorder: 'rgba(255,255,255,0.24)',
  cloudMistHighlight: 'rgba(255,255,255,0.30)',
  cloudMistShade: 'rgba(38,49,81,0.10)',
  plusIconText: palette.white,
  textHalo: 'rgba(255,255,255,0.72)',
} as const;
