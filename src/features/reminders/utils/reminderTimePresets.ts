import { addMinutes, format, isSameDay, set } from 'date-fns';

import { DEFAULT_TIME_PRESETS, type TimePreset } from '../../../shared/utils/timePresets';

function buildTargetDateTime(targetDate: Date, time: string) {
  const [hoursText, minutesText] = time.split(':');

  return set(targetDate, {
    hours: Number(hoursText),
    minutes: Number(minutesText),
    seconds: 0,
    milliseconds: 0,
  });
}

export function getNextAvailableTimeForToday(
  targetDate: Date,
  presets: TimePreset[] = DEFAULT_TIME_PRESETS,
  now = new Date(),
) {
  if (!isSameDay(targetDate, now)) {
    return null;
  }

  const nextPreset = presets.find(
    (preset) => buildTargetDateTime(targetDate, preset.time).getTime() > now.getTime(),
  );

  if (nextPreset) {
    return nextPreset.time;
  }

  const nextTime = addMinutes(now, 5);

  return isSameDay(nextTime, targetDate) ? format(nextTime, 'HH:mm') : null;
}
