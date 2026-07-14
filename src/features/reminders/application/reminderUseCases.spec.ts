import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Reminder } from '../domain/reminder';
import type { ReminderApplicationDependencies } from './ports';
import { createReminderUseCases } from './reminderUseCases';

const reminder: Reminder = {
  id: 'reminder-1',
  title: 'Pay rent',
  targetAt: new Date(2026, 6, 14, 8).toISOString(),
  previousNotifyAt: new Date(2026, 6, 13, 20).toISOString(),
  targetNotifyAt: new Date(2026, 6, 14, 8).toISOString(),
  expiresAt: new Date(2026, 6, 14, 23, 59, 59, 999).toISOString(),
  previousNotificationId: null,
  targetNotificationId: null,
  status: 'active',
  createdAt: '2026-07-12T00:00:00.000Z',
  updatedAt: '2026-07-12T00:00:00.000Z',
};

const scheduledNotification = {
  status: 'scheduled' as const,
  ids: { previousNotificationId: 'previous', targetNotificationId: 'target' },
};

const scheduledSingleNotification = {
  status: 'scheduled' as const,
  notificationId: 'replacement',
};

function notScheduledNotification(
  reason:
    | 'notification-permission-denied'
    | 'exact-alarm-permission-required'
    | 'target-time-passed'
    | 'scheduling-failed',
) {
  return {
    status: 'not-scheduled' as const,
    reason,
    ids: { previousNotificationId: null, targetNotificationId: null },
  };
}

function makeDependencies(events: string[]): ReminderApplicationDependencies {
  let current: Reminder | null = reminder;
  let previousNotifyTime = '20:00';

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
      updateTargetSchedule: async (_id, update) => {
        events.push(`update-target:${update.targetNotificationId ?? 'null'}`);
        current = current ? { ...current, ...update } : null;
        return current;
      },
      updatePreviousSchedule: async (_id, update) => {
        events.push(`update-previous:${update.previousNotificationId ?? 'null'}`);
        current = current ? { ...current, ...update } : null;
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
        previousNotifyTime,
        defaultTargetTime: '08:00',
        noonTargetTime: '12:00',
        eveningTargetTime: '18:00',
        nightTargetTime: '20:00',
        autoDeleteEnabled: true,
        notificationSoundEnabled: true,
        theme: 'sky',
      }),
      updatePreviousNotifyTime: async (nextPreviousNotifyTime) => {
        events.push(`settings:${nextPreviousNotifyTime}`);
        previousNotifyTime = nextPreviousNotifyTime;
        return {
          id: 'default',
          previousNotifyTime: nextPreviousNotifyTime,
          defaultTargetTime: '08:00',
          noonTargetTime: '12:00',
          eveningTargetTime: '18:00',
          nightTargetTime: '20:00',
          autoDeleteEnabled: true,
          notificationSoundEnabled: true,
          theme: 'sky',
        };
      },
    },
    notifications: {
      schedule: async () => {
        events.push('schedule');
        return scheduledNotification;
      },
      scheduleTest: async () => ({
        status: 'scheduled',
        ids: {
          previousNotificationId: 'test-previous',
          targetNotificationId: 'test-target',
        },
      }),
      cancel: async () => {
        events.push('cancel');
      },
      scheduleTarget: async () => {
        events.push('schedule-target');
        return scheduledSingleNotification;
      },
      schedulePrevious: async () => {
        events.push('schedule-previous');
        return scheduledSingleNotification;
      },
      cancelOne: async (notificationId) => {
        events.push(`cancel-one:${notificationId ?? 'null'}`);
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

  assert.equal(result.reminder.title, 'Pay rent');
  assert.deepEqual(result.notification, scheduledNotification);
  assert.deepEqual(events, ['insert', 'schedule', 'notification-ids', 'widget']);
});

test('create returns the persisted reminder and reason when notification permission is denied', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  dependencies.notifications.schedule = async () => {
    events.push('schedule');
    return notScheduledNotification('notification-permission-denied');
  };
  const result = await createReminderUseCases(dependencies).create(
    { title: 'Pay rent', dateOffset: 2, targetTime: '08:00' },
    { now: new Date('2026-07-12T09:00:00+09:00') },
  );

  assert.equal(result.reminder.id, reminder.id);
  assert.equal(result.reminder.targetNotificationId, null);
  assert.equal(result.notification.status, 'not-scheduled');
  assert.equal(result.notification.reason, 'notification-permission-denied');
  assert.deepEqual(events, ['insert', 'schedule', 'widget']);
});

test('create reports that Android exact alarm permission is required without losing the reminder', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  dependencies.notifications.schedule = async () => {
    events.push('schedule');
    return notScheduledNotification('exact-alarm-permission-required');
  };
  const result = await createReminderUseCases(dependencies).create(
    { title: 'Pay rent', dateOffset: 2, targetTime: '08:00' },
    { now: new Date('2026-07-12T09:00:00+09:00') },
  );

  assert.equal(result.reminder.id, reminder.id);
  assert.equal(result.notification.status, 'not-scheduled');
  assert.equal(result.notification.reason, 'exact-alarm-permission-required');
  assert.deepEqual(events, ['insert', 'schedule', 'widget']);
});

test('create converts an unexpected notification scheduling exception into an observable result', async () => {
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

  assert.equal(result.reminder.id, reminder.id);
  assert.equal(result.notification.status, 'not-scheduled');
  assert.equal(result.notification.reason, 'scheduling-failed');
  assert.deepEqual(events, ['insert', 'schedule', 'widget']);
});

test('create persists target notification id when only the previous notification fails', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  dependencies.notifications.schedule = async () => {
    events.push('schedule');
    return {
      status: 'partial',
      reason: 'previous-scheduling-failed',
      ids: { previousNotificationId: null, targetNotificationId: 'target' },
    };
  };
  const result = await createReminderUseCases(dependencies).create(
    { title: 'Pay rent', dateOffset: 2, targetTime: '08:00' },
    { now: new Date('2026-07-12T09:00:00+09:00') },
  );

  assert.equal(result.reminder.targetNotificationId, 'target');
  assert.equal(result.notification.status, 'partial');
  assert.deepEqual(events, ['insert', 'schedule', 'notification-ids', 'widget']);
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

test('target time update changes only the target schedule and replaces only its notification', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  const scheduledReminder: Reminder = {
    ...reminder,
    previousNotificationId: 'old-previous',
    targetNotificationId: 'old-target',
  };
  let current = scheduledReminder;
  dependencies.reminders.getById = async () => current;
  dependencies.reminders.updateTargetSchedule = async (_id, update) => {
    events.push(`update-target:${update.targetNotificationId ?? 'null'}`);
    current = { ...current, ...update };
    return current;
  };

  const result = await createReminderUseCases(dependencies).updateTargetTime(reminder.id, '18:30', {
    now: new Date(new Date(reminder.targetAt).getTime() - 60 * 60 * 1000),
  });

  assert.equal(result?.reminder.targetAt, result?.reminder.targetNotifyAt);
  assert.equal(new Date(result?.reminder.targetAt ?? 0).getHours(), 18);
  assert.equal(new Date(result?.reminder.targetAt ?? 0).getMinutes(), 30);
  assert.equal(result?.reminder.previousNotifyAt, reminder.previousNotifyAt);
  assert.equal(result?.reminder.expiresAt, reminder.expiresAt);
  assert.equal(result?.reminder.previousNotificationId, 'old-previous');
  assert.equal(result?.reminder.targetNotificationId, 'replacement');
  assert.equal(result?.notification.status, 'scheduled');
  assert.deepEqual(events, [
    'update-target:null',
    'cancel-one:old-target',
    'schedule-target',
    'update-target:replacement',
    'widget',
  ]);
});

test('target time update keeps the new time when notification scheduling is blocked', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  dependencies.notifications.scheduleTarget = async () => {
    events.push('schedule-target');
    return {
      status: 'not-scheduled',
      reason: 'notification-permission-denied',
      notificationId: null,
    };
  };

  const result = await createReminderUseCases(dependencies).updateTargetTime(reminder.id, '18:30', {
    now: new Date(new Date(reminder.targetAt).getTime() - 60 * 60 * 1000),
  });

  assert.equal(new Date(result?.reminder.targetAt ?? 0).getHours(), 18);
  assert.equal(result?.reminder.targetNotificationId, null);
  assert.equal(result?.notification.status, 'not-scheduled');
  assert.deepEqual(events, ['update-target:null', 'cancel-one:null', 'schedule-target', 'widget']);
});

test('target time update rejects a past time and skips unchanged or missing reminders', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  const target = new Date(reminder.targetAt);
  const currentTime = `${String(target.getHours()).padStart(2, '0')}:${String(
    target.getMinutes(),
  ).padStart(2, '0')}`;
  const useCases = createReminderUseCases(dependencies);

  const unchanged = await useCases.updateTargetTime(reminder.id, currentTime, {
    now: new Date(target.getTime() - 1000),
  });
  assert.equal(unchanged?.notification.status, 'unchanged');
  assert.deepEqual(events, []);

  await assert.rejects(
    useCases.updateTargetTime(reminder.id, '00:00', {
      now: new Date(target.getFullYear(), target.getMonth(), target.getDate(), 12),
    }),
    /future/,
  );
  assert.deepEqual(events, []);

  dependencies.reminders.getById = async () => null;
  assert.equal(await useCases.updateTargetTime('missing', '18:30'), null);
  assert.deepEqual(events, []);
});

test('shared previous time updates every active reminder without touching target notifications', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  const now = new Date(2030, 0, 1, 10);
  const first: Reminder = {
    ...reminder,
    id: 'first',
    targetAt: new Date(2030, 0, 3, 8).toISOString(),
    targetNotifyAt: new Date(2030, 0, 3, 8).toISOString(),
    previousNotifyAt: new Date(2030, 0, 2, 20).toISOString(),
    previousNotificationId: 'first-previous',
    targetNotificationId: 'first-target',
  };
  const second: Reminder = {
    ...first,
    id: 'second',
    targetAt: new Date(2030, 0, 4, 12).toISOString(),
    targetNotifyAt: new Date(2030, 0, 4, 12).toISOString(),
    previousNotifyAt: new Date(2030, 0, 3, 20).toISOString(),
    previousNotificationId: 'second-previous',
    targetNotificationId: 'second-target',
  };
  dependencies.reminders.listActive = async () => [first, second];
  dependencies.reminders.updatePreviousSchedule = async (id, update) => {
    events.push(`update-previous:${id}:${update.previousNotificationId ?? 'null'}`);
    const candidate = id === first.id ? first : second;
    return { ...candidate, ...update };
  };
  dependencies.notifications.schedulePrevious = async (candidate) => {
    events.push(`schedule-previous:${candidate.id}`);
    return { status: 'scheduled', notificationId: `new-${candidate.id}` };
  };

  const result = await createReminderUseCases(dependencies).updatePreviousNotifyTime('18:00', {
    now,
  });

  assert.deepEqual(result, {
    settings: { ...result.settings, previousNotifyTime: '18:00' },
    changedReminderCount: 2,
    skippedPastCount: 0,
    failedReminderCount: 0,
  });
  assert.deepEqual(events, [
    'settings:18:00',
    'update-previous:first:null',
    'cancel-one:first-previous',
    'schedule-previous:first',
    'update-previous:first:new-first',
    'update-previous:second:null',
    'cancel-one:second-previous',
    'schedule-previous:second',
    'update-previous:second:new-second',
  ]);
});

test('shared previous time cancels an upcoming old notification when the new time passed', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  const now = new Date(2030, 0, 1, 19);
  const candidate: Reminder = {
    ...reminder,
    targetAt: new Date(2030, 0, 2, 8).toISOString(),
    targetNotifyAt: new Date(2030, 0, 2, 8).toISOString(),
    previousNotifyAt: new Date(2030, 0, 1, 20).toISOString(),
    previousNotificationId: 'old-previous',
    targetNotificationId: 'untouched-target',
  };
  dependencies.reminders.listActive = async () => [candidate];
  dependencies.reminders.updatePreviousSchedule = async (_id, update) => {
    events.push(`update-previous:${update.previousNotificationId ?? 'null'}`);
    return { ...candidate, ...update };
  };

  const result = await createReminderUseCases(dependencies).updatePreviousNotifyTime('18:00', {
    now,
  });

  assert.equal(result.changedReminderCount, 1);
  assert.equal(result.skippedPastCount, 1);
  assert.equal(result.failedReminderCount, 0);
  assert.deepEqual(events, ['settings:18:00', 'update-previous:null', 'cancel-one:old-previous']);
});

test('shared previous time reports a blocked notification and startup retry repairs it', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  const now = new Date(2030, 0, 1, 10);
  let current: Reminder = {
    ...reminder,
    targetAt: new Date(2030, 0, 3, 8).toISOString(),
    targetNotifyAt: new Date(2030, 0, 3, 8).toISOString(),
    previousNotifyAt: new Date(2030, 0, 2, 20).toISOString(),
    previousNotificationId: 'old-previous',
    targetNotificationId: 'untouched-target',
  };
  dependencies.reminders.listActive = async () => [current];
  dependencies.reminders.updatePreviousSchedule = async (_id, update) => {
    events.push(`update-previous:${update.previousNotificationId ?? 'null'}`);
    current = { ...current, ...update };
    return current;
  };
  dependencies.notifications.schedulePrevious = async () => {
    events.push('schedule-previous-blocked');
    return {
      status: 'not-scheduled',
      reason: 'notification-permission-denied',
      notificationId: null,
    };
  };
  const useCases = createReminderUseCases(dependencies);

  const updateResult = await useCases.updatePreviousNotifyTime('18:00', { now });
  assert.equal(updateResult.failedReminderCount, 1);
  assert.equal(current.previousNotificationId, null);
  assert.equal(current.targetNotificationId, 'untouched-target');

  events.length = 0;
  dependencies.notifications.schedulePrevious = async (_candidate, options) => {
    events.push(`schedule-previous-retry:${options.permissionMode}`);
    return { status: 'scheduled', notificationId: 'new-previous' };
  };

  const retryResult = await useCases.retryPendingNotifications(now);
  assert.deepEqual(retryResult, { scheduled: 1, remaining: 0 });
  assert.equal(current.previousNotificationId, 'new-previous');
  assert.deepEqual(events, ['schedule-previous-retry:check-only', 'update-previous:new-previous']);
});

test('retryPendingNotifications only schedules active reminders without a target notification id', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  const alreadyScheduled: Reminder = {
    ...reminder,
    id: 'reminder-2',
    targetNotificationId: 'existing-target',
  };
  dependencies.reminders.listActive = async () => [reminder, alreadyScheduled];
  dependencies.notifications.scheduleTarget = async (candidate, options) => {
    events.push(`schedule-target:${candidate.id}:${options.permissionMode}`);
    return { status: 'scheduled', notificationId: 'target' };
  };

  const result = await createReminderUseCases(dependencies).retryPendingNotifications();

  assert.deepEqual(result, { scheduled: 1, remaining: 0 });
  assert.deepEqual(events, ['schedule-target:reminder-1:check-only', 'update-target:target']);
});

test('retryPendingNotifications leaves blocked reminders pending', async () => {
  const events: string[] = [];
  const dependencies = makeDependencies(events);
  dependencies.notifications.scheduleTarget = async () => {
    events.push('schedule-target');
    return {
      status: 'not-scheduled',
      reason: 'exact-alarm-permission-required',
      notificationId: null,
    };
  };

  const result = await createReminderUseCases(dependencies).retryPendingNotifications();

  assert.deepEqual(result, { scheduled: 0, remaining: 1 });
  assert.deepEqual(events, ['schedule-target']);
});

test('cleanup cancels expired reminders before deleting them', async () => {
  const events: string[] = [];
  const result = await createReminderUseCases(makeDependencies(events)).cleanup(
    new Date('2026-07-15T00:00:00.000Z'),
  );

  assert.equal(result, 1);
  assert.deepEqual(events, ['cancel', 'delete-many', 'widget']);
});
