import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getWidgetSkyPeriod } from './widgetSky';

function dateAt(hour: number, minute = 0) {
  return new Date(2026, 6, 13, hour, minute, 0, 0);
}

test('widget sky period follows the local time boundaries', () => {
  const cases = [
    { date: dateAt(4, 59), expected: 'night' },
    { date: dateAt(5), expected: 'morning' },
    { date: dateAt(9, 59), expected: 'morning' },
    { date: dateAt(10), expected: 'day' },
    { date: dateAt(15, 59), expected: 'day' },
    { date: dateAt(16), expected: 'sunset' },
    { date: dateAt(18, 59), expected: 'sunset' },
    { date: dateAt(19), expected: 'night' },
  ] as const;

  for (const { date, expected } of cases) {
    assert.equal(getWidgetSkyPeriod(date), expected);
  }
});
