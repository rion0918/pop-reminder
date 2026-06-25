import { addDays, format, startOfDay } from 'date-fns';

export type ReminderDatePreset =
  | 'today'
  | 'tomorrow'
  | 'dayAfterTomorrow'
  | 'weekend'
  | 'nextWeek'
  | 'custom';

export type ComputedReminderDatePreset = 'weekend' | 'nextWeek';

export function getReminderDatePresetTarget(
  preset: ComputedReminderDatePreset,
  now = new Date(),
) {
  const today = startOfDay(now);

  if (preset === 'nextWeek') {
    return addDays(today, 7);
  }

  const dayOfWeek = today.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return today;
  }

  return addDays(today, 6 - dayOfWeek);
}

export function formatLocalDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}
