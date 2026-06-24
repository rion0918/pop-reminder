import { AppTheme, themeOptions } from '../constants/colors';

export function isTimeString(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(-4).padStart(4, '0');

  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

export function validateTimeInput(value: string) {
  const formatted = value.includes(':') ? value : formatTimeInput(value);
  const [hourText, minuteText] = formatted.split(':');
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  return (
    /^\d{2}:\d{2}$/.test(formatted) &&
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

export function normalizeTimeInput(value: string, fallback: string) {
  if (!validateTimeInput(value)) {
    return fallback;
  }

  return value.includes(':') ? value : formatTimeInput(value);
}

export function timeToDigits(value: string) {
  return normalizeTimeInput(value, '08:00').replace(':', '');
}

export function digitsToTime(value: string) {
  return formatTimeInput(value);
}

export function coerceTheme(value: string): AppTheme {
  return themeOptions.includes(value as AppTheme) ? (value as AppTheme) : 'sky';
}
