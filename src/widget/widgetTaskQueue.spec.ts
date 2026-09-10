import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enqueueWidgetTask } from './widgetTaskQueue';

test('application updates wait behind events and queue recovers after failure', async () => {
  const order: string[] = [];
  let release!: () => void;
  const first = enqueueWidgetTask(async () => {
    order.push('event');
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    throw new Error('render failed');
  });
  const failed = assert.rejects(first, /render failed/);
  const next = enqueueWidgetTask(async () => {
    order.push('application update');
  });
  await Promise.resolve();
  assert.deepEqual(order, ['event']);
  release();
  await Promise.all([failed, next]);
  assert.deepEqual(order, ['event', 'application update']);
});
