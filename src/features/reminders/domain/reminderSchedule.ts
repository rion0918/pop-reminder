import { addDays, set, startOfDay, subDays } from 'date-fns';

export type ReminderScheduleInput = {
  dateOffset: 0 | 1 | 2;
  customTargetDate?: string | null;
  targetTime: string;
  previousNotifyTime: string;
  now?: Date;
};

export function validateReminderScheduleInput(input: ReminderScheduleInput) {
  if (![0, 1, 2].includes(input.dateOffset)) {
    throw new Error('Reminder date offset is invalid');
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.targetTime)) {
    throw new Error('Reminder target time is invalid');
  }
  if (input.customTargetDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.customTargetDate)) {
    throw new Error('Reminder target date is invalid');
  }
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return { hours, minutes };
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function buildReminderSchedule({
  dateOffset,
  customTargetDate,
  targetTime,
  previousNotifyTime,
  now = new Date(),
}: ReminderScheduleInput) {
  const targetDay = startOfDay(
    customTargetDate ? parseLocalDate(customTargetDate) : addDays(now, dateOffset),
  );
  const target = parseTime(targetTime);
  const previous = parseTime(previousNotifyTime);
  const targetAt = set(targetDay, { ...target, seconds: 0, milliseconds: 0 });

  return {
    targetAt,
    previousNotifyAt: set(subDays(targetDay, 1), {
      ...previous,
      seconds: 0,
      milliseconds: 0,
    }),
    targetNotifyAt: targetAt,
    expiresAt: set(targetDay, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 }),
  };
}
