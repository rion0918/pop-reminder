import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getBurstSurfaceFrame, getRuptureProgress } from './reminderBubbleBurstMotion';

test('the original surface is unchanged until motion and never shrinks away as a circle', () => {
  assert.deepEqual(getBurstSurfaceFrame(0, false), { opacity: 1, scaleX: 1, scaleY: 1 });
  for (const ms of [55, 80, 130, 230, 380]) {
    const frame = getBurstSurfaceFrame(ms / 380, true);
    assert.equal(frame.opacity, 0);
    assert.equal(frame.scaleX, 1);
    assert.equal(frame.scaleY, 1);
  }
});

test('a brief asymmetric tremor settles exactly at rupture', () => {
  const frame = getBurstSurfaceFrame(15 / 380, false);
  assert.notEqual(frame.scaleX, frame.scaleY);
  assert.ok(Math.abs(frame.scaleX - 1) <= 0.008);
  assert.ok(Math.abs(frame.scaleY - 1) <= 0.008);
});

test('the membrane opens between 55 and 130ms and missing capture never holds completion', () => {
  assert.equal(getRuptureProgress(54 / 380), 0);
  assert.ok(getRuptureProgress(90 / 380) > 0);
  assert.equal(getRuptureProgress(130 / 380), 1);
  assert.equal(getBurstSurfaceFrame(55 / 380, false).opacity, 1);
  assert.equal(getBurstSurfaceFrame(80 / 380, false).opacity, 0);
  assert.equal(getBurstSurfaceFrame(1, false).opacity, 0);
});
