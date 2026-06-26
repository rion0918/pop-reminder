import { differenceInCalendarDays } from 'date-fns';

import { bubbleDueColors } from '../../../constants/colors';

export function getReminderDueColor(targetAt: string | Date, currentDate = new Date()) {
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

export function getMsUntilNextDay(now = new Date()) {
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 1, 0);

  return Math.max(1000, nextDay.getTime() - now.getTime());
}
