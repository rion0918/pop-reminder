import { format } from 'date-fns';

import type { Reminder } from '../domain/reminder';
import { buildReminderSchedule } from '../domain/reminderSchedule';

export type ReminderScheduleDraft = {
  targetDate: string;
  targetTime: string;
  allDay?: boolean;
};

export function createReminderScheduleDraft(reminder: Pick<Reminder, 'targetAt' | 'allDay'>) {
  const target = new Date(reminder.targetAt);
  return {
    targetDate: format(target, 'yyyy-MM-dd'),
    targetTime: format(target, 'HH:mm'),
    ...(reminder.allDay ? { allDay: true } : {}),
  } satisfies ReminderScheduleDraft;
}

export function evaluateReminderScheduleDraft(
  draft: ReminderScheduleDraft,
  previousNotifyTime: string,
  now = new Date(),
  allDayNotifyTime = '09:00',
) {
  try {
    const schedule = buildReminderSchedule({
      dateOffset: 0,
      customTargetDate: draft.targetDate,
      targetTime: draft.targetTime,
      allDay: draft.allDay ?? false,
      allDayNotifyTime,
      previousNotifyTime,
      now,
    });

    return {
      schedule,
      isTargetFuture: draft.allDay
        ? schedule.expiresAt.getTime() > now.getTime()
        : schedule.targetAt.getTime() > now.getTime(),
      isPreviousFuture: schedule.previousNotifyAt.getTime() > now.getTime(),
      isValid: true,
    };
  } catch {
    return {
      schedule: null,
      isTargetFuture: false,
      isPreviousFuture: false,
      isValid: false,
    };
  }
}
