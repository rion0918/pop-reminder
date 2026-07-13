export type WidgetSkyPeriod = 'morning' | 'day' | 'sunset' | 'night';

export function getWidgetSkyPeriod(currentDate = new Date()): WidgetSkyPeriod {
  const hour = currentDate.getHours();

  if (hour < 5) {
    return 'night';
  }

  if (hour < 10) {
    return 'morning';
  }

  if (hour < 16) {
    return 'day';
  }

  if (hour < 19) {
    return 'sunset';
  }

  return 'night';
}
