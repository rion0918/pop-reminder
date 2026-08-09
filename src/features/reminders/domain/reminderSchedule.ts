import { addLocalDays, setLocalTime, startOfLocalDay } from './localDate';

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
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error('Reminder time is invalid');
  }

  const [hours, minutes] = value.split(':').map(Number);
  return { hours, minutes };
}

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Reminder target date is invalid');
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('Reminder target date is invalid');
  }

  return date;
}

export function buildReminderSchedule({
  dateOffset,
  customTargetDate,
  targetTime,
  previousNotifyTime,
  now = new Date(),
}: ReminderScheduleInput) {
  const targetDay = startOfLocalDay(
    customTargetDate ? parseLocalDate(customTargetDate) : addLocalDays(now, dateOffset),
  );
  const target = parseTime(targetTime);
  const previous = parseTime(previousNotifyTime);
  const targetAt = setLocalTime(targetDay, target.hours, target.minutes);

  return {
    targetAt,
    previousNotifyAt: setLocalTime(addLocalDays(targetDay, -1), previous.hours, previous.minutes),
    targetNotifyAt: targetAt,
    expiresAt: setLocalTime(targetDay, 23, 59, 59, 999),
  };
}

export function replaceReminderTargetTime(value: Date | string, targetTime: string) {
  const target = value instanceof Date ? value : new Date(value);
  const time = parseTime(targetTime);

  return setLocalTime(target, time.hours, time.minutes);
}

export function buildPreviousNotifyAt(value: Date | string, previousNotifyTime: string) {
  const target = value instanceof Date ? value : new Date(value);
  const previous = parseTime(previousNotifyTime);

  return setLocalTime(addLocalDays(startOfLocalDay(target), -1), previous.hours, previous.minutes);
}
