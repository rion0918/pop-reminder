import { normalizeReminderTitle, type Reminder } from '../domain/reminder';
import { buildReminderSchedule, validateReminderScheduleInput } from '../domain/reminderSchedule';
import type { ReminderApplicationDependencies, ReminderNotificationScheduleResult } from './ports';

export type CreateReminderInput = {
  title: string;
  dateOffset: 0 | 1 | 2;
  customTargetDate?: string | null;
  targetTime: string;
};

type CreateReminderOptions = {
  useTestNotifications?: boolean;
  now?: Date;
};

export type CreateReminderResult = {
  reminder: Reminder;
  notification: ReminderNotificationScheduleResult;
};

const schedulingFailedResult: ReminderNotificationScheduleResult = {
  status: 'not-scheduled',
  reason: 'scheduling-failed',
  ids: {
    previousNotificationId: null,
    targetNotificationId: null,
  },
};

export function createReminderUseCases(dependencies: ReminderApplicationDependencies) {
  const { reminders, notifications, settings, widget } = dependencies;

  return {
    listActive: (now?: Date) => reminders.listActive(now),

    async create(
      input: CreateReminderInput,
      options?: CreateReminderOptions,
    ): Promise<CreateReminderResult> {
      const title = normalizeReminderTitle(input.title);
      validateReminderScheduleInput({ ...input, previousNotifyTime: '00:00', now: options?.now });
      const currentSettings = await settings.get();
      const schedule = buildReminderSchedule({
        dateOffset: input.dateOffset,
        customTargetDate: input.customTargetDate,
        targetTime: input.targetTime,
        previousNotifyTime: currentSettings.previousNotifyTime,
        now: options?.now,
      });
      const reminder = await reminders.insert({
        title,
        targetAt: schedule.targetAt.toISOString(),
        previousNotifyAt: schedule.previousNotifyAt.toISOString(),
        targetNotifyAt: schedule.targetNotifyAt.toISOString(),
        expiresAt: schedule.expiresAt.toISOString(),
      });

      let notification = schedulingFailedResult;
      let persistedReminder = reminder;

      try {
        notification = options?.useTestNotifications
          ? await notifications.scheduleTest(reminder, {
              soundEnabled: currentSettings.notificationSoundEnabled,
            })
          : await notifications.schedule(reminder, {
              soundEnabled: currentSettings.notificationSoundEnabled,
            });

        if (
          notification.ids.previousNotificationId !== null ||
          notification.ids.targetNotificationId !== null
        ) {
          persistedReminder =
            (await reminders.updateNotificationIds(reminder.id, notification.ids)) ?? reminder;
        }
      } catch (error) {
        console.warn('Failed to schedule reminder notifications', error);
      }

      await widget.sync();
      return { reminder: persistedReminder, notification };
    },

    async retryPendingNotifications() {
      const activeReminders = await reminders.listActive();
      const pendingReminders = activeReminders.filter(
        (reminder) => reminder.targetNotificationId === null,
      );
      if (pendingReminders.length === 0) {
        return { scheduled: 0, remaining: 0 };
      }

      const currentSettings = await settings.get();
      let scheduled = 0;

      for (const reminder of pendingReminders) {
        try {
          const notification = await notifications.schedule(reminder, {
            soundEnabled: currentSettings.notificationSoundEnabled,
            permissionMode: 'check-only',
          });
          if (notification.ids.targetNotificationId === null) {
            continue;
          }

          if (reminder.previousNotificationId !== null) {
            await notifications.cancel(reminder);
          }
          const updated = await reminders.updateNotificationIds(reminder.id, notification.ids);
          if (updated) {
            scheduled += 1;
          }
        } catch (error) {
          console.warn('Failed to retry reminder notifications', error);
        }
      }

      return {
        scheduled,
        remaining: pendingReminders.length - scheduled,
      };
    },

    async delete(id: string) {
      const reminder = await reminders.getById(id);
      if (!reminder) return false;

      await notifications.cancel(reminder);
      await reminders.deleteById(id);
      await widget.sync();
      return true;
    },

    async updateTitle(id: string, title: string) {
      const normalizedTitle = normalizeReminderTitle(title);
      const reminder = await reminders.getById(id);
      if (!reminder) return null;

      const updatedReminder = await reminders.updateTitle(id, normalizedTitle);
      if (!updatedReminder) return null;

      try {
        const currentSettings = await settings.get();
        const notification = await notifications.schedule(updatedReminder, {
          soundEnabled: currentSettings.notificationSoundEnabled,
        });
        const hasReplacement =
          notification.ids.previousNotificationId !== null ||
          notification.ids.targetNotificationId !== null;

        if (hasReplacement) {
          await notifications.cancel(reminder);
          return (
            (await reminders.updateNotificationIds(updatedReminder.id, notification.ids)) ??
            updatedReminder
          );
        }
      } catch (error) {
        console.warn('Failed to refresh reminder notifications after title update', error);
      } finally {
        await widget.sync();
      }

      return updatedReminder;
    },

    async cleanup(now = new Date()) {
      const [currentSettings, expiredReminders] = await Promise.all([
        settings.get(),
        reminders.listExpired(now),
      ]);
      if (expiredReminders.length === 0) return 0;

      await Promise.all(expiredReminders.map((reminder) => notifications.cancel(reminder)));
      if (currentSettings.autoDeleteEnabled) {
        await reminders.deleteMany(expiredReminders.map((reminder) => reminder.id));
      } else {
        await Promise.all(expiredReminders.map((reminder) => reminders.markExpired(reminder.id)));
      }
      await widget.sync();
      return expiredReminders.length;
    },
  };
}
