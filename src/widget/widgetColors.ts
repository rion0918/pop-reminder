import { differenceInCalendarDays } from 'date-fns';

/**
 * Widget-friendly due colors.
 * Android widgets require fully opaque colors (no rgba transparency),
 * so these are solid equivalents of the bubble due colors used in-app.
 */

type WidgetDueColor = {
  background: string;
  text: string;
  accent: string;
  border: string;
};

export function getWidgetDueColor(targetAt: string | Date, currentDate = new Date()): WidgetDueColor {
  const daysUntilTarget = differenceInCalendarDays(new Date(targetAt), currentDate);

  if (daysUntilTarget <= 0) {
    return widgetDueColors.today;
  }

  if (daysUntilTarget === 1) {
    return widgetDueColors.tomorrow;
  }

  if (daysUntilTarget <= 3) {
    return widgetDueColors.soon;
  }

  return widgetDueColors.later;
}

export const widgetDueColors = {
  today: {
    background: '#FEE2E2',
    text: '#991B1B',
    accent: '#DC2626',
    border: '#FECACA',
  },
  tomorrow: {
    background: '#FFF7ED',
    text: '#9A3412',
    accent: '#EA580C',
    border: '#FED7AA',
  },
  soon: {
    background: '#FEFCE8',
    text: '#854D0E',
    accent: '#CA8A04',
    border: '#FEF08A',
  },
  later: {
    background: '#EFF6FF',
    text: '#1E40AF',
    accent: '#3B82F6',
    border: '#BFDBFE',
  },
} as const;

export const widgetTheme = {
  background: '#EFF8FF',
  surface: '#FFFFFF',
  headerText: '#263151',
  mutedText: '#7280A3',
  addButtonBackground: '#74BDF6',
  addButtonText: '#FFFFFF',
  borderColor: '#DCE9F7',
} as const;
