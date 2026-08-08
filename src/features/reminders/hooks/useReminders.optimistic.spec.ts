import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';

import type { Reminder } from '../domain/reminder';
import {
  activeRemindersQueryKey,
  deleteRemindersAndSyncCache,
  removeRemindersFromQueryCache,
} from '../presentation/reminderQueryMutations';

function makeReminder(id: string): Reminder {
  return {
    id,
    title: id,
    targetAt: '2026-08-08T09:00:00.000Z',
    previousNotifyAt: '2026-08-08T08:00:00.000Z',
    targetNotifyAt: '2026-08-08T09:00:00.000Z',
    expiresAt: '2026-08-09T09:00:00.000Z',
    previousNotificationId: null,
    targetNotificationId: null,
    status: 'active',
    createdAt: '2026-08-08T08:00:00.000Z',
    updatedAt: '2026-08-08T08:00:00.000Z',
  };
}

test('bulk cache removal removes only the requested reminders', () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(activeRemindersQueryKey, [makeReminder('keep'), makeReminder('remove')]);

  removeRemindersFromQueryCache(queryClient, ['remove']);

  assert.deepEqual(
    queryClient.getQueryData<Reminder[]>(activeRemindersQueryKey)?.map((reminder) => reminder.id),
    ['keep'],
  );
});

test('deleteReminders passes ids, updates shared cache once, and revalidates once', async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(activeRemindersQueryKey, [makeReminder('keep'), makeReminder('remove')]);
  let receivedIds: string[] = [];
  let cacheUpdates = 0;
  let revalidations = 0;

  const deletedIds = await deleteRemindersAndSyncCache(
    ['remove', 'missing'],
    {},
    {
      deleteMany: async (ids) => {
        receivedIds = ids;
        return ['remove'];
      },
      removeReminders: (ids) => {
        cacheUpdates += 1;
        removeRemindersFromQueryCache(queryClient, ids);
      },
      reconcile: async () => {
        revalidations += 1;
      },
    },
  );

  assert.deepEqual(receivedIds, ['remove', 'missing']);
  assert.deepEqual(deletedIds, ['remove']);
  assert.equal(cacheUpdates, 1);
  assert.equal(revalidations, 1);
  assert.deepEqual(
    queryClient.getQueryData<Reminder[]>(activeRemindersQueryKey)?.map((reminder) => reminder.id),
    ['keep'],
  );
});

test('deferred delete keeps shared cache and revalidation untouched until the owner finishes', async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(activeRemindersQueryKey, [makeReminder('remove')]);
  let cacheUpdates = 0;
  let revalidations = 0;

  await deleteRemindersAndSyncCache(
    ['remove'],
    { deferCache: true },
    {
      deleteMany: async () => ['remove'],
      removeReminders: (ids) => {
        cacheUpdates += ids.length;
        removeRemindersFromQueryCache(queryClient, ids);
      },
      reconcile: async () => {
        revalidations += 1;
      },
    },
  );

  assert.equal(cacheUpdates, 0);
  assert.equal(revalidations, 0);
  assert.deepEqual(queryClient.getQueryData<Reminder[]>(activeRemindersQueryKey)?.length, 1);
});
