import { normalizeReminderTitle, type Reminder } from '../domain/reminder';
import {
  buildPreviousNotifyAt,
  buildReminderSchedule,
  replaceReminderTargetTime,
  validateReminderScheduleInput,
} from '../domain/reminderSchedule';
import type {
  ReminderApplicationDependencies,
  ReminderNotificationScheduleResult,
  ReminderSingleNotificationScheduleResult,
} from './ports';

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

type ScheduleUpdateOptions = {
  now?: Date;
};

export type UpdateReminderTargetTimeResult = {
  reminder: Reminder;
  notification: ReminderSingleNotificationScheduleResult | { status: 'unchanged' };
};

export type UpdatePreviousNotifyTimeResult = {
  settings: Awaited<ReturnType<ReminderApplicationDependencies['settings']['get']>>;
  changedReminderCount: number;
  skippedPastCount: number;
  failedReminderCount: number;
};

const schedulingFailedResult: ReminderNotificationScheduleResult = {
  status: 'not-scheduled',
  reason: 'scheduling-failed',
  ids: {
    previousNotificationId: null,
    targetNotificationId: null,
  },
};

const singleSchedulingFailedResult: ReminderSingleNotificationScheduleResult = {
  status: 'not-scheduled',
  reason: 'scheduling-failed',
  notificationId: null,
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

    async retryPendingNotifications(now = new Date()) {
      const activeReminders = await reminders.listActive(now);
      const currentSettings = await settings.get();
      let scheduled = 0;
      let remaining = 0;

      for (const activeReminder of activeReminders) {
        let reminder = activeReminder;
        try {
          const expectedPreviousNotifyAt = buildPreviousNotifyAt(
            reminder.targetAt,
            currentSettings.previousNotifyTime,
          ).toISOString();

          if (reminder.previousNotifyAt !== expectedPreviousNotifyAt) {
            const oldPreviousNotificationId = reminder.previousNotificationId;
            const reconciled = await reminders.updatePreviousSchedule(reminder.id, {
              previousNotifyAt: expectedPreviousNotifyAt,
              previousNotificationId: null,
            });
            if (!reconciled) {
              remaining += 1;
              continue;
            }
            reminder = reconciled;
            await notifications.cancelOne(oldPreviousNotificationId);
          }

          if (reminder.targetNotificationId === null) {
            const targetResult = await notifications.scheduleTarget(reminder, {
              soundEnabled: currentSettings.notificationSoundEnabled,
              permissionMode: 'check-only',
            });
            if (targetResult.status === 'scheduled') {
              const updated = await reminders.updateTargetSchedule(reminder.id, {
                targetAt: reminder.targetAt,
                targetNotifyAt: reminder.targetNotifyAt,
                targetNotificationId: targetResult.notificationId,
              });
              if (updated) {
                reminder = updated;
                scheduled += 1;
              } else {
                await notifications.cancelOne(targetResult.notificationId);
                remaining += 1;
              }
            } else {
              remaining += 1;
            }
          }

          if (
            reminder.previousNotificationId === null &&
            new Date(reminder.previousNotifyAt).getTime() > now.getTime()
          ) {
            const previousResult = await notifications.schedulePrevious(reminder, {
              soundEnabled: currentSettings.notificationSoundEnabled,
              permissionMode: 'check-only',
            });
            if (previousResult.status === 'scheduled') {
              const updated = await reminders.updatePreviousSchedule(reminder.id, {
                previousNotifyAt: reminder.previousNotifyAt,
                previousNotificationId: previousResult.notificationId,
              });
              if (updated) {
                scheduled += 1;
              } else {
                await notifications.cancelOne(previousResult.notificationId);
                remaining += 1;
              }
            } else {
              remaining += 1;
            }
          }
        } catch (error) {
          console.warn('Failed to retry reminder notifications', error);
          remaining += 1;
        }
      }

      return { scheduled, remaining };
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

    async updateTargetTime(
      id: string,
      targetTime: string,
      options?: ScheduleUpdateOptions,
    ): Promise<UpdateReminderTargetTimeResult | null> {
      const reminder = await reminders.getById(id);
      if (!reminder) return null;

      const nextTarget = replaceReminderTargetTime(reminder.targetAt, targetTime);
      const nextTargetAt = nextTarget.toISOString();
      if (nextTarget.getTime() <= (options?.now ?? new Date()).getTime()) {
        throw new Error('Reminder target time must be in the future');
      }
      if (nextTargetAt === reminder.targetAt) {
        return { reminder, notification: { status: 'unchanged' } };
      }

      let persistedReminder = await reminders.updateTargetSchedule(id, {
        targetAt: nextTargetAt,
        targetNotifyAt: nextTargetAt,
        targetNotificationId: null,
      });
      if (!persistedReminder) return null;

      await notifications.cancelOne(reminder.targetNotificationId);

      let notification = singleSchedulingFailedResult;
      try {
        const currentSettings = await settings.get();
        notification = await notifications.scheduleTarget(persistedReminder, {
          soundEnabled: currentSettings.notificationSoundEnabled,
        });
        if (notification.status === 'scheduled') {
          const reminderWithNotification = await reminders.updateTargetSchedule(id, {
            targetAt: nextTargetAt,
            targetNotifyAt: nextTargetAt,
            targetNotificationId: notification.notificationId,
          });
          if (reminderWithNotification) {
            persistedReminder = reminderWithNotification;
          } else {
            await notifications.cancelOne(notification.notificationId);
            notification = singleSchedulingFailedResult;
          }
        }
      } catch (error) {
        console.warn('Failed to schedule target notification after time update', error);
      }

      await widget.sync();
      return { reminder: persistedReminder, notification };
    },

    async updatePreviousNotifyTime(
      previousNotifyTime: string,
      options?: ScheduleUpdateOptions,
    ): Promise<UpdatePreviousNotifyTimeResult> {
      const now = options?.now ?? new Date();
      buildPreviousNotifyAt(now, previousNotifyTime);
      const currentSettings = await settings.get();
      if (currentSettings.previousNotifyTime === previousNotifyTime) {
        return {
          settings: currentSettings,
          changedReminderCount: 0,
          skippedPastCount: 0,
          failedReminderCount: 0,
        };
      }

      const updatedSettings = await settings.updatePreviousNotifyTime(previousNotifyTime);
      const activeReminders = await reminders.listActive(now);
      let changedReminderCount = 0;
      let skippedPastCount = 0;
      let failedReminderCount = 0;

      for (const reminder of activeReminders) {
        const nextPreviousNotifyAt = buildPreviousNotifyAt(
          reminder.targetAt,
          previousNotifyTime,
        ).toISOString();
        if (nextPreviousNotifyAt === reminder.previousNotifyAt) {
          continue;
        }

        try {
          const updatedReminder = await reminders.updatePreviousSchedule(reminder.id, {
            previousNotifyAt: nextPreviousNotifyAt,
            previousNotificationId: null,
          });
          if (!updatedReminder) {
            failedReminderCount += 1;
            continue;
          }

          changedReminderCount += 1;
          await notifications.cancelOne(reminder.previousNotificationId);

          const oldWasUpcoming = new Date(reminder.previousNotifyAt).getTime() > now.getTime();
          const nextIsUpcoming = new Date(nextPreviousNotifyAt).getTime() > now.getTime();
          if (!nextIsUpcoming) {
            if (oldWasUpcoming) {
              skippedPastCount += 1;
            }
            continue;
          }

          const notification = await notifications.schedulePrevious(updatedReminder, {
            soundEnabled: updatedSettings.notificationSoundEnabled,
            permissionMode: 'check-only',
          });
          if (notification.status !== 'scheduled') {
            failedReminderCount += 1;
            continue;
          }

          const reminderWithNotification = await reminders.updatePreviousSchedule(reminder.id, {
            previousNotifyAt: nextPreviousNotifyAt,
            previousNotificationId: notification.notificationId,
          });
          if (!reminderWithNotification) {
            await notifications.cancelOne(notification.notificationId);
            failedReminderCount += 1;
          }
        } catch (error) {
          console.warn('Failed to apply shared previous notification time', error);
          failedReminderCount += 1;
        }
      }

      return {
        settings: updatedSettings,
        changedReminderCount,
        skippedPastCount,
        failedReminderCount,
      };
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
