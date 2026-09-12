import { addDays, format, isSameDay, isSameYear } from 'date-fns';
import { ja } from 'date-fns/locale';

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatReminderDate(value: Date | string) {
  return format(toDate(value), 'yyyy/M/d');
}

export function formatReminderInputDate(value: Date | string) {
  return format(toDate(value), 'yyyy/M/d（EEE）', { locale: ja });
}

export function formatReminderDateTime(value: Date | string, allDay = false) {
  const date = toDate(value);

  return allDay
    ? `${formatReminderDate(date)} 終日`
    : `${formatReminderDate(date)} ${format(date, 'HH:mm')}`;
}

export function formatReminderDetailDate(value: Date | string, now = new Date()) {
  const date = toDate(value);
  const pattern = isSameYear(date, now) ? 'M月d日（EEE）' : 'yyyy年M月d日（EEE）';

  return format(date, pattern, { locale: ja });
}

export function formatReminderDetailTime(value: Date | string, allDay = false) {
  return allDay ? '終日' : format(toDate(value), 'HH:mm');
}

export function formatReminderDetailAccessibilityDateTime(
  value: Date | string,
  now = new Date(),
  allDay = false,
) {
  const date = toDate(value);
  const datePattern = isSameYear(date, now) ? 'M月d日EEEE' : 'yyyy年M月d日EEEE';
  if (allDay) return `${format(date, datePattern, { locale: ja })}、終日`;
  const timePattern = date.getMinutes() === 0 ? 'H時' : 'H時m分';

  return `${format(date, datePattern, { locale: ja })}、${format(date, timePattern)}`;
}

export function shouldShowPreviousNotification(value: Date | string, now = new Date()) {
  return toDate(value).getTime() > now.getTime();
}

export function formatReminderBubbleDateTime(
  value: Date | string,
  now = new Date(),
  allDay = false,
) {
  const target = toDate(value);
  if (allDay) {
    if (isSameDay(target, now)) return '今日 終日';
    if (isSameDay(target, addDays(now, 1))) return '明日 終日';
    if (isSameDay(target, addDays(now, 2))) return '明後日 終日';
    const dateFormat =
      target.getFullYear() === now.getFullYear() ? 'M/d（EEE）' : 'yyyy/M/d（EEE）';
    return `${format(target, dateFormat, { locale: ja })} 終日`;
  }
  const time = format(target, 'HH:mm');

  if (isSameDay(target, now)) {
    return `今日 ${time}`;
  }

  if (isSameDay(target, addDays(now, 1))) {
    return `明日 ${time}`;
  }

  if (isSameDay(target, addDays(now, 2))) {
    return `明後日 ${time}`;
  }

  const dateFormat = target.getFullYear() === now.getFullYear() ? 'M/d（EEE）' : 'yyyy/M/d（EEE）';

  return `${format(target, dateFormat, { locale: ja })} ${time}`;
}
