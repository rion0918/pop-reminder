import { normalizeReminderTitle } from '../domain/reminder';
import { buildReminderSchedule, validateReminderScheduleInput } from '../domain/reminderSchedule';
import type { ReminderApplicationDependencies } from './ports';

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

export function createReminderUseCases(dependencies: ReminderApplicationDependencies) {
  const { reminders, notifications, settings, widget } = dependencies;

  return {
    listActive: (now?: Date) => reminders.listActive(now),

    async create(input: CreateReminderInput, options?: CreateReminderOptions) {
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

      try {
        const notificationIds = options?.useTestNotifications
          ? await notifications.scheduleTest(reminder, {
              soundEnabled: currentSettings.notificationSoundEnabled,
            })
          : await notifications.schedule(reminder, {
              soundEnabled: currentSettings.notificationSoundEnabled,
            });
        const updated = await reminders.updateNotificationIds(reminder.id, notificationIds);
        await widget.sync();
        return updated ?? reminder;
      } catch (error) {
        console.warn('Failed to schedule reminder notifications', error);
        await widget.sync();
        return reminder;
      }
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
        const notificationIds = await notifications.schedule(updatedReminder, {
          soundEnabled: currentSettings.notificationSoundEnabled,
        });
        const hasReplacement =
          notificationIds.previousNotificationId !== null ||
          notificationIds.targetNotificationId !== null;

        if (hasReplacement) {
          await notifications.cancel(reminder);
          return (
            (await reminders.updateNotificationIds(updatedReminder.id, notificationIds)) ??
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
      return expiredReminders.length;
    },
  };
}
