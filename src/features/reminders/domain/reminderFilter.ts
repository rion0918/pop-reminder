import { addLocalDays, isSameLocalDay, startOfLocalDay } from './localDate';
import type { Reminder } from './reminder';

export type SearchFilter = 'all' | 'today' | 'tomorrow' | 'week';

function matchesDateFilter(reminder: Reminder, filter: SearchFilter, now: Date) {
  const target = new Date(reminder.targetAt);
  if (filter === 'today') return isSameLocalDay(target, now);
  if (filter === 'tomorrow') return isSameLocalDay(target, addLocalDays(now, 1));
  if (filter === 'week') {
    const targetTime = target.getTime();
    const rangeStart = startOfLocalDay(now);
    return (
      targetTime >= rangeStart.getTime() && targetTime <= addLocalDays(rangeStart, 7).getTime()
    );
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
