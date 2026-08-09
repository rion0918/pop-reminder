import { format } from 'date-fns';

import type { Reminder } from '../domain/reminder';
import { buildReminderSchedule } from '../domain/reminderSchedule';

export type ReminderScheduleDraft = {
  targetDate: string;
  targetTime: string;
};

export function createReminderScheduleDraft(reminder: Pick<Reminder, 'targetAt'>) {
  const target = new Date(reminder.targetAt);
  return {
    targetDate: format(target, 'yyyy-MM-dd'),
    targetTime: format(target, 'HH:mm'),
  } satisfies ReminderScheduleDraft;
}

export function evaluateReminderScheduleDraft(
  draft: ReminderScheduleDraft,
  previousNotifyTime: string,
  now = new Date(),
) {
  try {
    const schedule = buildReminderSchedule({
      dateOffset: 0,
      customTargetDate: draft.targetDate,
      targetTime: draft.targetTime,
      previousNotifyTime,
      now,
    });

    return {
      schedule,
      isTargetFuture: schedule.targetAt.getTime() > now.getTime(),
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
