import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBubbleBurstGeometry } from './ReminderBubbleBurstGeometry';

function assertFiniteGeometry(value: unknown): void {
  if (typeof value === 'number') {
    assert.equal(Number.isFinite(value), true);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(assertFiniteGeometry);
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach(assertFiniteGeometry);
  }
}

test('bubble burst geometry is deterministic and varied by reminder id', () => {
  const first = createBubbleBurstGeometry('reminder-one', 160, 140);
  const same = createBubbleBurstGeometry('reminder-one', 160, 140);
  const different = createBubbleBurstGeometry('reminder-two', 160, 140);

  assert.deepEqual(first, same);
  assert.notDeepEqual(first.rupturePoint, different.rupturePoint);
  assert.ok(first.membraneFragments.length >= 7 && first.membraneFragments.length <= 9);
  assert.ok(first.droplets.length >= 12 && first.droplets.length <= 18);
});

test('bubble burst geometry scales with the bubble dimensions', () => {
  const original = createBubbleBurstGeometry('scale-me', 120, 80);
  const doubled = createBubbleBurstGeometry('scale-me', 240, 160);

  assert.equal(doubled.canvasWidth, original.canvasWidth * 2);
  assert.equal(doubled.canvasHeight, original.canvasHeight * 2);
  assert.equal(doubled.rupturePoint.x, original.rupturePoint.x * 2);
  assert.equal(doubled.rupturePoint.y, original.rupturePoint.y * 2);
  assert.equal(doubled.droplets[0]?.radius, (original.droplets[0]?.radius ?? 0) * 2);
});

test('bubble burst geometry remains finite for small and wide bubbles', () => {
  assertFiniteGeometry(createBubbleBurstGeometry('tiny', 28, 28));
  assertFiniteGeometry(createBubbleBurstGeometry('wide', 240, 72));
});
