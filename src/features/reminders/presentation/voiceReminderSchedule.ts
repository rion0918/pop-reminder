import { differenceInCalendarDays, startOfDay } from 'date-fns';

import type { ParsedReminder } from '../domain/voiceReminderParser';

export type VoiceReminderSchedulePatch = {
  dateOffset: 0 | 1 | 2 | null;
  customTargetDate: string | null;
  targetTime: string | null;
};

function parseLocalDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(2000, 0, 1);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

export function getVoiceReminderSchedulePatch(
  parsed: ParsedReminder,
  now: Date,
): VoiceReminderSchedulePatch {
  const patch: VoiceReminderSchedulePatch = {
    dateOffset: null,
    customTargetDate: null,
    targetTime: parsed.time.status === 'parsed' ? parsed.time.value : null,
  };

  if (parsed.date.status !== 'parsed' || !parsed.date.value) return patch;
  const parsedDate = parseLocalDateValue(parsed.date.value);
  if (!parsedDate) return patch;

  const dateOffset = differenceInCalendarDays(parsedDate, startOfDay(now));
  if (dateOffset >= 0 && dateOffset <= 2) {
    patch.dateOffset = dateOffset as 0 | 1 | 2;
  } else {
    patch.customTargetDate = parsed.date.value;
  }
  return patch;
}
