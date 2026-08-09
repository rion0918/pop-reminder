import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import { isSameLocalDay, setLocalTime, startOfLocalDay } from './localDate';

test('addLocalDays advances the local calendar date across a DST boundary', () => {
  const moduleUrl = new URL('./localDate.ts', import.meta.url).href;
  const script = `
    import assert from 'node:assert/strict';
    import { addLocalDays } from ${JSON.stringify(moduleUrl)};

    const before = new Date(2026, 2, 7, 12, 30);
    const after = addLocalDays(before, 1);

    assert.equal(after.getFullYear(), 2026);
    assert.equal(after.getMonth(), 2);
    assert.equal(after.getDate(), 8);
    assert.equal(after.getHours(), 12);
    assert.equal(after.getMinutes(), 30);
    assert.equal(after.getTime() - before.getTime(), 23 * 60 * 60 * 1000);
  `;
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '--eval', script],
    {
      encoding: 'utf8',
      env: { ...process.env, TZ: 'America/New_York' },
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('local time helpers return new dates with the requested local time', () => {
  const input = new Date(2030, 4, 10, 12, 34, 56, 789);
  const start = startOfLocalDay(input);
  const updated = setLocalTime(input, 18, 45, 30, 400);

  assert.deepEqual(
    [start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()],
    [2030, 4, 10, 0, 0],
  );
  assert.deepEqual(
    [updated.getHours(), updated.getMinutes(), updated.getSeconds(), updated.getMilliseconds()],
    [18, 45, 30, 400],
  );
  assert.equal(input.getHours(), 12);
});

test('isSameLocalDay ignores time but rejects the next local date', () => {
  assert.equal(isSameLocalDay(new Date(2030, 4, 10, 0), new Date(2030, 4, 10, 23, 59)), true);
  assert.equal(isSameLocalDay(new Date(2030, 4, 10, 23, 59), new Date(2030, 4, 11, 0)), false);
});
