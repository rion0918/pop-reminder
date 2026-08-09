export function addLocalDays(value: Date, amount: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

export function startOfLocalDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function setLocalTime(
  value: Date,
  hours: number,
  minutes: number,
  seconds = 0,
  milliseconds = 0,
) {
  const result = new Date(value);
  result.setHours(hours, minutes, seconds, milliseconds);
  return result;
}

export function isSameLocalDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
