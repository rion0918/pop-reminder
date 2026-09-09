import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBubbleBurstGeometry } from './ReminderBubbleBurstGeometry';

function assertFiniteGeometry(value: unknown): void {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  else if (Array.isArray(value)) value.forEach(assertFiniteGeometry);
  else if (value && typeof value === 'object') Object.values(value).forEach(assertFiniteGeometry);
}

test('burst geometry is repeatable, slightly larger, and varies between reminders', () => {
  const first = createBubbleBurstGeometry('one', 160, 140);
  assert.deepEqual(first, createBubbleBurstGeometry('one', 160, 140));
  assert.notDeepEqual(first.rupturePoint, createBubbleBurstGeometry('two', 160, 140).rupturePoint);
  for (let index = 0; index < 50; index += 1) {
    const geometry = createBubbleBurstGeometry(String(index), 160, 140);
    assert.ok(geometry.membraneFragments.length >= 6 && geometry.membraneFragments.length <= 8);
    assert.ok(geometry.droplets.length >= 8 && geometry.droplets.length <= 12);
    for (const droplet of geometry.droplets) {
      assert.ok(droplet.radius >= 0.6 && droplet.radius <= 1.7);
      const travel = Math.hypot(droplet.travelX, droplet.travelY);
      assert.ok(travel >= 140 * 0.09 && travel <= 140 * 0.23);
      assert.ok(droplet.delay >= 110 / 380 && droplet.delay <= 180 / 380);
    }
    for (const fragment of geometry.membraneFragments) {
      assert.ok(Math.hypot(fragment.travelX, fragment.travelY) <= 140 * 0.09);
      assert.ok(fragment.delay >= 90 / 380 && fragment.delay <= 130 / 380);
      assert.equal(fragment.points.length, 3, 'open quadratic curves, not polygon shards');
    }
  }
});

test('wide bubbles use the actual capsule outline, not an ellipse', () => {
  const geometry = createBubbleBurstGeometry('wide', 240, 72);
  assert.equal(geometry.cornerRadius, 36);
  for (const fragment of geometry.membraneFragments) {
    for (const point of [fragment.points[0], fragment.points[2]]) {
      const x = point.x - geometry.overscan;
      const y = point.y - geometry.overscan;
      const nearestX = Math.max(36, Math.min(204, x));
      assert.ok(Math.abs(Math.hypot(x - nearestX, y - 36) - 35) < 0.01);
    }
  }
});

test('geometry and droplet trajectories fit within the overlay for small and wide bubbles', () => {
  for (const [width, height] of [
    [28, 28],
    [240, 72],
    [72, 240],
    [160, 160],
  ]) {
    const geometry = createBubbleBurstGeometry('bounds', width, height);
    assertFiniteGeometry(geometry);
    for (const droplet of geometry.droplets) {
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const x = droplet.origin.x + droplet.travelX * t;
        const y = droplet.origin.y + droplet.travelY * t + droplet.gravity * t * t;
        assert.ok(x - droplet.radius >= 0 && x + droplet.radius <= geometry.canvasWidth);
        assert.ok(y - droplet.radius >= 0 && y + droplet.radius <= geometry.canvasHeight);
      }
    }
  }
});
