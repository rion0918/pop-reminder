import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isValidQuickAddPresetTimes,
  resolveQuickAddPresetTimes,
  type QuickAddPresetTimes,
} from './appSettings';

const validTimes: QuickAddPresetTimes = {
  defaultTargetTime: '08:00',
  noonTargetTime: '12:00',
  eveningTargetTime: '18:00',
  nightTargetTime: '20:00',
};

test('quick-add preset validation accepts strictly increasing times', () => {
  assert.equal(isValidQuickAddPresetTimes(validTimes), true);
});

test('quick-add preset validation rejects equal times', () => {
  assert.equal(
    isValidQuickAddPresetTimes({ ...validTimes, noonTargetTime: validTimes.defaultTargetTime }),
    false,
  );
});

test('quick-add preset validation rejects reversed times', () => {
  assert.equal(isValidQuickAddPresetTimes({ ...validTimes, eveningTargetTime: '11:00' }), false);
});

test('quick-add preset validation accepts midnight and the latest valid time at the boundaries', () => {
  assert.equal(
    isValidQuickAddPresetTimes({
      defaultTargetTime: '00:00',
      noonTargetTime: '00:01',
      eveningTargetTime: '23:58',
      nightTargetTime: '23:59',
    }),
    true,
  );
});

test('quick-add preset validation rejects malformed time strings', () => {
  assert.equal(isValidQuickAddPresetTimes({ ...validTimes, nightTargetTime: '8:00' }), false);
});

test('invalid quick-add preset updates keep the current preset set', () => {
  assert.deepEqual(
    resolveQuickAddPresetTimes(validTimes, {
      ...validTimes,
      eveningTargetTime: '11:00',
    }),
    validTimes,
  );
});
