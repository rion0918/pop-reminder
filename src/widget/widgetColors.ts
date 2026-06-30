import { differenceInCalendarDays } from 'date-fns';

import { appThemes, bubbleDueColors, homeVisualTokens, palette } from '../constants/colors';

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
  background: appThemes.sky.background,
  surface: palette.white,
  headerText: palette.ink,
  mutedText: palette.muted,
  addButtonBackground: appThemes.sky.accent,
  addButtonText: palette.white,
  borderColor: palette.line,
} as const;
