import { addDays, set, startOfDay, subDays } from 'date-fns';

type BuildReminderScheduleInput = {
  dateOffset: 0 | 1 | 2;
  customTargetDate?: string | null;
  targetTime: string;
  previousNotifyTime: string;
  now?: Date;
};

function parseTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);

  return {
    hours,
    minutes,
  };
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
}: BuildReminderScheduleInput) {
  const targetDay = startOfDay(customTargetDate ? parseLocalDate(customTargetDate) : addDays(now, dateOffset));
  const target = parseTime(targetTime);
  const previous = parseTime(previousNotifyTime);

  const targetAt = set(targetDay, {
    hours: target.hours,
    minutes: target.minutes,
    seconds: 0,
    milliseconds: 0,
  });
  const previousNotifyAt = set(subDays(targetDay, 1), {
    hours: previous.hours,
    minutes: previous.minutes,
    seconds: 0,
    milliseconds: 0,
  });
  const expiresAt = set(targetDay, {
    hours: 23,
    minutes: 59,
    seconds: 59,
    milliseconds: 999,
  });

  return {
    targetAt,
    previousNotifyAt,
    targetNotifyAt: targetAt,
    expiresAt,
  };
}
