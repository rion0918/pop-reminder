import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getNextAvailableTimeForToday } from './reminderTimePresets';

const presets = [
  { label: '朝', time: '07:30' },
  { label: '昼', time: '11:45' },
  { label: '夕', time: '17:15' },
  { label: '夜', time: '21:00' },
];

test('today correction selects the first configured preset after now', () => {
  assert.equal(
    getNextAvailableTimeForToday(
      new Date('2026-07-14T00:00:00'),
      presets,
      new Date('2026-07-14T12:00:00'),
    ),
    '17:15',
  );
});

test('today correction uses five minutes after now after the last preset', () => {
  assert.equal(
    getNextAvailableTimeForToday(
      new Date('2026-07-14T00:00:00'),
      presets,
      new Date('2026-07-14T22:00:00'),
    ),
    '22:05',
  );
});

test('today correction does not change a different date', () => {
  assert.equal(
    getNextAvailableTimeForToday(
      new Date('2026-07-15T00:00:00'),
      presets,
      new Date('2026-07-14T22:00:00'),
    ),
    null,
  );
});
