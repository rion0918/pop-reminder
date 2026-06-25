import { addDays, format, isSameDay, isTomorrow } from 'date-fns';

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatReminderDate(value: Date | string) {
  return format(toDate(value), 'yyyy/M/d');
}

export function formatReminderDateTime(value: Date | string) {
  const date = toDate(value);

  return `${formatReminderDate(date)} ${format(date, 'HH:mm')}`;
}

export function formatReminderBubbleDateTime(value: Date | string) {
  const target = toDate(value);
  const now = new Date();
  const time = format(target, 'HH:mm');

  if (isSameDay(target, now)) {
    return `今日 ${time}`;
  }

  if (isTomorrow(target)) {
    return `明日 ${time}`;
  }

  if (isSameDay(target, addDays(now, 2))) {
    return `明後日 ${time}`;
  }

  const dateFormat = target.getFullYear() === now.getFullYear() ? 'M/d' : 'yyyy/M/d';

  return `${format(target, dateFormat)} ${time}`;
}
