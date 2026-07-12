import { addDays, isSameDay, startOfDay } from 'date-fns';

import type { Reminder } from './reminder';

export type SearchFilter = 'all' | 'today' | 'tomorrow' | 'week';

function matchesDateFilter(reminder: Reminder, filter: SearchFilter, now: Date) {
  const target = new Date(reminder.targetAt);
  if (filter === 'today') return isSameDay(target, now);
  if (filter === 'tomorrow') return isSameDay(target, addDays(now, 1));
  if (filter === 'week') {
    const targetTime = target.getTime();
    const rangeStart = startOfDay(now).getTime();
    return targetTime >= rangeStart && targetTime <= addDays(rangeStart, 7).getTime();
  }
  return true;
}

export function filterReminders(
  reminders: Reminder[],
  query: string,
  filter: SearchFilter,
  now = new Date(),
) {
  const normalizedQuery = query.trim().toLowerCase();
  return reminders.filter(
    (reminder) =>
      (normalizedQuery.length === 0 || reminder.title.toLowerCase().includes(normalizedQuery)) &&
      matchesDateFilter(reminder, filter, now),
  );
}
