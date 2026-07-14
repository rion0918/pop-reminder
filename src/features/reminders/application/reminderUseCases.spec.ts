import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Reminder } from '../domain/reminder';
import type { ReminderApplicationDependencies } from './ports';
import { createReminderUseCases } from './reminderUseCases';

const reminder: Reminder = {
  id: 'reminder-1',
  title: 'Pay rent',
  targetAt: '2026-07-14T08:00:00.000Z',
  previousNotifyAt: '2026-07-13T20:00:00.000Z',
  targetNotifyAt: '2026-07-14T08:00:00.000Z',
  expiresAt: '2026-07-14T23:59:59.999Z',
  previousNotificationId: null,
  targetNotificationId: null,
  status: 'active',
  createdAt: '2026-07-12T00:00:00.000Z',
  updatedAt: '2026-07-12T00:00:00.000Z',
};

function makeDependencies(events: string[]): ReminderApplicationDependencies {
  let current: Reminder | null = reminder;

  return {
    reminders: {
      listActive: async () => (current ? [current] : []),
      listExpired: async () => (current ? [current] : []),
      getById: async () => current,
      insert: async (draft) => {
        events.push('insert');
        current = { ...reminder, ...draft };
        return current;
      },
      updateNotificationIds: async (_id, ids) => {
        events.push('notification-ids');
        current = current ? { ...current, ...ids } : null;
        return current;
      },
      updateTitle: async (_id, title) => {
        events.push('update-title');
        current = current ? { ...current, title } : null;
        return current;
      },
      markExpired: async () => {
        events.push('mark-expired');
      },
      deleteMany: async () => {
        events.push('delete-many');
        current = null;
      },
      deleteById: async () => {
        events.push('delete');
        current = null;
      },
    },
    settings: {
      get: async () => ({
        id: 'default',
        previousNotifyTime: '20:00',
        defaultTargetTime: '08:00',
        noonTargetTime: '12:00',
        eveningTargetTime: '18:00',
        nightTargetTime: '20:00',
        autoDeleteEnabled: true,
        notificationSoundEnabled: true,
        theme: 'sky',
      }),
    },
    notifications: {
      schedule: async () => {
        events.push('schedule');
        return { previousNotificationId: 'previous', targetNotificationId: 'target' };
      },
      scheduleTest: async () => ({
        previousNotificationId: 'test-previous',
        targetNotificationId: 'test-target',
      }),
      cancel: async () => {
        events.push('cancel');
      },
    },
    widget: {
      sync: async () => {
        events.push('widget');
      },
    },
  };
}

test('create persists before notification scheduling and widget sync', async () => {
  const events: string[] = [];
  const useCases = createReminderUseCases(makeDependencies(events));
  const result = await useCases.create(
    { title: ' Pay rent ', dateOffset: 2, targetTime: '08:00' },
    { now: new Date('2026-07-12T09:00:00+09:00') },
  );

  assert.equal(result.title, 'Pay rent');
  assert.deepEqual(events, ['insert', 'schedule', 'notification-ids', 'widget']);
});

test('create returns the persisted reminder when notification scheduling fails', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  dependencies.notifications.schedule = async () => {
    events.push('schedule');
    throw new Error('notifications unavailable');
  };
  const result = await createReminderUseCases(dependencies).create(
    { title: 'Pay rent', dateOffset: 2, targetTime: '08:00' },
    { now: new Date('2026-07-12T09:00:00+09:00') },
  );

  assert.equal(result.id, reminder.id);
  assert.deepEqual(events, ['insert', 'schedule', 'widget']);
});

test('create rejects invalid runtime schedule input before reading adapters', async () => {
  const events: string[] = [];
  const useCases = createReminderUseCases(makeDependencies(events));
  await assert.rejects(
    useCases.create({ title: 'Pay rent', dateOffset: 4 as 0, targetTime: '08:00' }),
  );
  assert.deepEqual(events, []);
});

test('delete returns false for a missing reminder and never calls gateways', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  dependencies.reminders.getById = async () => null;

  assert.equal(await createReminderUseCases(dependencies).delete(reminder.id), false);
  assert.deepEqual(events, []);
});

test('delete cancels before deleting and does not delete when cancellation fails', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  dependencies.notifications.cancel = async () => {
    events.push('cancel');
    throw new Error('cancel failed');
  };

  await assert.rejects(createReminderUseCases(dependencies).delete(reminder.id));
  assert.deepEqual(events, ['cancel']);
});

test('title update returns persisted update when replacement scheduling fails', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  dependencies.notifications.schedule = async () => {
    events.push('schedule');
    throw new Error('schedule failed');
  };

  const result = await createReminderUseCases(dependencies).updateTitle(reminder.id, ' New title ');
  assert.equal(result?.title, 'New title');
  assert.deepEqual(events, ['update-title', 'schedule', 'widget']);
});

test('cleanup cancels expired reminders before deleting them', async () => {
  const events: string[] = [];
  const result = await createReminderUseCases(makeDependencies(events)).cleanup(
    new Date('2026-07-15T00:00:00.000Z'),
  );

  assert.equal(result, 1);
  assert.deepEqual(events, ['cancel', 'delete-many']);
});
