import {
  normalizeReminderTitle,
  type CreateReminderInput,
  type Reminder,
} from '../domain/reminder';
import { FREE_ACTIVE_REMINDER_LIMIT } from '../../purchases/domain/proAccess';
import {
  buildAllDayTargetNotifyAt,
  buildPreviousNotifyAt,
  buildReminderSchedule,
  validateReminderScheduleInput,
} from '../domain/reminderSchedule';
import type {
  ReminderApplicationDependencies,
  ReminderNotificationScheduleResult,
  ReminderNotificationScheduleOptions,
} from './ports';

export type { CreateReminderInput } from '../domain/reminder';

type CreateReminderOptions = {
  useTestNotifications?: boolean;
  permissionMode?: ReminderNotificationScheduleOptions['permissionMode'];
  now?: Date;
};

export type CreateReminderResult = {
  reminder: Reminder;
  notification: ReminderNotificationScheduleResult;
};

type ScheduleUpdateOptions = {
  now?: Date;
};

export type UpdateReminderScheduleInput = {
  targetDate: string;
  targetTime: string;
  allDay?: boolean;
};

export type UpdateReminderScheduleResult = {
  reminder: Reminder;
  notification: ReminderNotificationScheduleResult | { status: 'unchanged' };
};

export type UpdatePreviousNotifyTimeResult = {
  settings: Awaited<ReturnType<ReminderApplicationDependencies['settings']['get']>>;
  changedReminderCount: number;
  skippedPastCount: number;
  failedReminderCount: number;
};

export { FREE_ACTIVE_REMINDER_LIMIT } from '../../purchases/domain/proAccess';

export class ActiveReminderLimitReachedError extends Error {
  constructor() {
    super(`Free users can keep up to ${FREE_ACTIVE_REMINDER_LIMIT} active reminders`);
    this.name = 'ActiveReminderLimitReachedError';
  }
}

const schedulingFailedResult: ReminderNotificationScheduleResult = {
  status: 'not-scheduled',
  reason: 'scheduling-failed',
  ids: {
    previousNotificationId: null,
    targetNotificationId: null,
  },
};

export function createReminderUseCases(dependencies: ReminderApplicationDependencies) {
  const { reminders, notifications, settings, widget, proAccess, notificationChannelMigration } =
    dependencies;

  return {
    listActive: (now?: Date) => reminders.listActive(now),

    async listVisible(now?: Date) {
      const currentSettings = await settings.get();
      return reminders.listVisible(!currentSettings.autoDeleteEnabled, now);
    },

    async create(
      input: CreateReminderInput,
      options?: CreateReminderOptions,
    ): Promise<CreateReminderResult> {
      const title = normalizeReminderTitle(input.title);
      validateReminderScheduleInput({
        ...input,
        previousNotifyTime: '00:00',
        now: options?.now,
      });
      const accessState = await proAccess.getState();
      if (accessState === 'free') {
        const activeReminders = await reminders.listActive(options?.now);
        if (activeReminders.length >= FREE_ACTIVE_REMINDER_LIMIT) {
          throw new ActiveReminderLimitReachedError();
        }
      }
      const currentSettings = await settings.get();
      const requestedAllDay = input.allDay ?? false;
      const schedule = buildReminderSchedule({
        dateOffset: input.dateOffset,
        customTargetDate: input.customTargetDate,
        targetTime: input.targetTime,
        allDay: requestedAllDay,
        allDayNotifyTime: currentSettings.allDayNotifyTime ?? '09:00',
        previousNotifyTime: currentSettings.previousNotifyTime,
        now: options?.now,
      });
      const reminder = await reminders.insert({
        title,
        allDay: requestedAllDay,
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
              permissionMode: options?.permissionMode,
            })
          : await notifications.schedule(reminder, {
              permissionMode: options?.permissionMode,
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

          if (reminder.allDay === true) {
            const expectedTargetNotifyAt = buildAllDayTargetNotifyAt(
              reminder.targetAt,
              currentSettings.allDayNotifyTime ?? '09:00',
            ).toISOString();

            if (reminder.targetNotifyAt !== expectedTargetNotifyAt) {
              const oldTargetNotificationId = reminder.targetNotificationId;
              const reconciled = await reminders.updateTargetSchedule(reminder.id, {
                targetAt: reminder.targetAt,
                targetNotifyAt: expectedTargetNotifyAt,
                targetNotificationId: null,
              });
              if (!reconciled) {
                remaining += 1;
                continue;
              }
              reminder = reconciled;
              await notifications.cancelOne(oldTargetNotificationId);
            }
          }

          if (reminder.targetNotificationId === null) {
            const targetResult = await notifications.scheduleTarget(reminder, {
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
            } else if (targetResult.status === 'not-scheduled') {
              remaining += 1;
            }
          }

          if (
            reminder.previousNotificationId === null &&
            new Date(reminder.previousNotifyAt).getTime() > now.getTime()
          ) {
            const previousResult = await notifications.schedulePrevious(reminder, {
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

    async migrateLegacyNotificationChannels() {
      if ((await notificationChannelMigration.getVersion()) >= 1) {
        return;
      }

      const activeReminders = await reminders.listActive();
      const legacyIds = await notifications.getLegacyScheduledNotificationIds(
        activeReminders.flatMap((reminder) => [
          reminder.previousNotificationId,
          reminder.targetNotificationId,
        ]),
      );
      let migrationPending = false;

      for (const activeReminder of activeReminders) {
        let currentReminder = activeReminder;

        if (
          currentReminder.targetNotificationId &&
          legacyIds.has(currentReminder.targetNotificationId)
        ) {
          try {
            const oldNotificationId = currentReminder.targetNotificationId;
            const result = await notifications.scheduleTarget(currentReminder, {
              permissionMode: 'check-only',
            });
            if (result.status === 'scheduled') {
              let updated: Reminder | null = null;
              try {
                updated = await reminders.updateTargetSchedule(currentReminder.id, {
                  targetAt: currentReminder.targetAt,
                  targetNotifyAt: currentReminder.targetNotifyAt,
                  targetNotificationId: result.notificationId,
                });
              } catch (error) {
                console.warn('Failed to persist migrated target notification', error);
              }
              if (updated) {
                currentReminder = updated;
                await notifications.cancelOne(oldNotificationId);
              } else {
                migrationPending = true;
                await notifications.cancelOne(result.notificationId);
              }
            } else if (result.status === 'skipped') {
              let updated: Reminder | null = null;
              try {
                updated = await reminders.updateTargetSchedule(currentReminder.id, {
                  targetAt: currentReminder.targetAt,
                  targetNotifyAt: currentReminder.targetNotifyAt,
                  targetNotificationId: null,
                });
              } catch (error) {
                console.warn('Failed to persist skipped target notification migration', error);
              }
              if (updated) {
                currentReminder = updated;
                await notifications.cancelOne(oldNotificationId);
              } else {
                migrationPending = true;
              }
            } else {
              migrationPending = true;
            }
          } catch (error) {
            console.warn('Failed to migrate target notification channel', error);
            migrationPending = true;
          }
        }

        if (
          currentReminder.previousNotificationId &&
          legacyIds.has(currentReminder.previousNotificationId)
        ) {
          try {
            const oldNotificationId = currentReminder.previousNotificationId;
            const result = await notifications.schedulePrevious(currentReminder, {
              permissionMode: 'check-only',
            });
            if (result.status === 'scheduled') {
              let updated: Reminder | null = null;
              try {
                updated = await reminders.updatePreviousSchedule(currentReminder.id, {
                  previousNotifyAt: currentReminder.previousNotifyAt,
                  previousNotificationId: result.notificationId,
                });
              } catch (error) {
                console.warn('Failed to persist migrated previous notification', error);
              }
              if (updated) {
                currentReminder = updated;
                await notifications.cancelOne(oldNotificationId);
              } else {
                migrationPending = true;
                await notifications.cancelOne(result.notificationId);
              }
            } else if (result.status === 'skipped') {
              let updated: Reminder | null = null;
              try {
                updated = await reminders.updatePreviousSchedule(currentReminder.id, {
                  previousNotifyAt: currentReminder.previousNotifyAt,
                  previousNotificationId: null,
                });
              } catch (error) {
                console.warn('Failed to persist skipped previous notification migration', error);
              }
              if (updated) {
                currentReminder = updated;
                await notifications.cancelOne(oldNotificationId);
              } else {
                migrationPending = true;
              }
            } else {
              migrationPending = true;
            }
          } catch (error) {
            console.warn('Failed to migrate previous notification channel', error);
            migrationPending = true;
          }
        }
      }

      if (!migrationPending) {
        await notificationChannelMigration.setVersion(1);
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

    async deleteMany(ids: string[]): Promise<string[]> {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return [];

      const remindersToDelete = (
        await Promise.all(uniqueIds.map((id) => reminders.getById(id)))
      ).filter((candidate): candidate is Reminder => candidate !== null);
      if (remindersToDelete.length === 0) return [];

      await Promise.all(remindersToDelete.map((reminder) => notifications.cancel(reminder)));
      const deletedIds = remindersToDelete.map((reminder) => reminder.id);
      await reminders.deleteMany(deletedIds);
      await widget.sync();
      return deletedIds;
    },

    async updateTitle(id: string, title: string) {
      const normalizedTitle = normalizeReminderTitle(title);
      const reminder = await reminders.getById(id);
      if (!reminder) return null;

      const updatedReminder = await reminders.updateTitle(id, normalizedTitle);
      if (!updatedReminder) return null;

      const emptyNotificationIds = {
        previousNotificationId: null,
        targetNotificationId: null,
      } as const;
      const clearNotificationIds = async () => {
        try {
          return (
            (await reminders.updateNotificationIds(updatedReminder.id, emptyNotificationIds)) ?? {
              ...updatedReminder,
              ...emptyNotificationIds,
            }
          );
        } catch (error) {
          console.warn('Failed to clear reminder notification ids after title update', error);
          return { ...updatedReminder, ...emptyNotificationIds };
        }
      };

      try {
        const notification = await notifications.schedule(updatedReminder, {});
        const hasReplacement =
          notification.ids.previousNotificationId !== null ||
          notification.ids.targetNotificationId !== null;

        if (hasReplacement) {
          await notifications.cancel(reminder);
          try {
            const persisted = await reminders.updateNotificationIds(
              updatedReminder.id,
              notification.ids,
            );
            if (!persisted) throw new Error('Reminder notification ids could not be persisted');
            return persisted;
          } catch (error) {
            await notifications.cancel({ ...updatedReminder, ...notification.ids });
            console.warn('Failed to persist reminder notification ids after title update', error);
            return await clearNotificationIds();
          }
        }

        await notifications.cancel(reminder);
        return await clearNotificationIds();
      } catch (error) {
        await notifications.cancel(reminder);
        const cleared = await clearNotificationIds();
        console.warn('Failed to refresh reminder notifications after title update', error);
        return cleared;
      } finally {
        await widget.sync();
      }
    },

    async updateSchedule(
      id: string,
      input: UpdateReminderScheduleInput,
      options?: ScheduleUpdateOptions,
    ): Promise<UpdateReminderScheduleResult | null> {
      const reminder = await reminders.getById(id);
      if (!reminder) return null;

      const now = options?.now ?? new Date();
      if (reminder.status === 'expired' && (await proAccess.getState()) === 'free') {
        const activeReminders = await reminders.listActive(now);
        if (activeReminders.length >= FREE_ACTIVE_REMINDER_LIMIT) {
          throw new ActiveReminderLimitReachedError();
        }
      }
      const currentSettings = await settings.get();
      const schedule = buildReminderSchedule({
        dateOffset: 0,
        customTargetDate: input.targetDate,
        targetTime: input.targetTime,
        allDay: input.allDay ?? reminder.allDay ?? false,
        allDayNotifyTime: currentSettings.allDayNotifyTime ?? '09:00',
        previousNotifyTime: currentSettings.previousNotifyTime,
        now,
      });
      const nextTargetAt = schedule.targetAt.toISOString();
      const nextTargetNotifyAt = schedule.targetNotifyAt.toISOString();
      const nextPreviousNotifyAt = schedule.previousNotifyAt.toISOString();
      const nextExpiresAt = schedule.expiresAt.toISOString();
      const nextAllDay = input.allDay ?? reminder.allDay ?? false;

      if (
        (nextAllDay && schedule.expiresAt.getTime() <= now.getTime()) ||
        (!nextAllDay && schedule.targetAt.getTime() <= now.getTime())
      ) {
        throw new Error('Reminder target time must be in the future');
      }

      if (
        nextTargetAt === reminder.targetAt &&
        nextTargetNotifyAt === reminder.targetNotifyAt &&
        nextPreviousNotifyAt === reminder.previousNotifyAt &&
        nextExpiresAt === reminder.expiresAt &&
        nextAllDay === (reminder.allDay ?? false)
      ) {
        return { reminder, notification: { status: 'unchanged' } };
      }

      let persistedReminder = await reminders.updateSchedule(id, {
        allDay: nextAllDay,
        targetAt: nextTargetAt,
        previousNotifyAt: nextPreviousNotifyAt,
        targetNotifyAt: nextTargetNotifyAt,
        expiresAt: nextExpiresAt,
        previousNotificationId: null,
        targetNotificationId: null,
        status: 'active',
      });
      if (!persistedReminder) return null;

      await notifications.cancel(reminder);

      let notification = schedulingFailedResult;
      try {
        notification = await notifications.schedule(persistedReminder, {});
        const hasReplacement =
          notification.ids.previousNotificationId !== null ||
          notification.ids.targetNotificationId !== null;
        if (hasReplacement) {
          const reminderWithNotification = await reminders.updateNotificationIds(
            id,
            notification.ids,
          );
          if (reminderWithNotification) {
            persistedReminder = reminderWithNotification;
          } else {
            await notifications.cancel({ ...persistedReminder, ...notification.ids });
            notification = schedulingFailedResult;
          }
        }
      } catch (error) {
        if (
          notification.ids.previousNotificationId !== null ||
          notification.ids.targetNotificationId !== null
        ) {
          await notifications
            .cancel({ ...persistedReminder, ...notification.ids })
            .catch((cancelError) => {
              console.warn('Failed to cancel replacement notifications', cancelError);
            });
          notification = schedulingFailedResult;
        }
        console.warn('Failed to schedule reminder notifications after schedule update', error);
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

    async updateAllDayNotifyTime(allDayNotifyTime: string, options?: ScheduleUpdateOptions) {
      const now = options?.now ?? new Date();
      const currentSettings = await settings.get();
      if (currentSettings.allDayNotifyTime === allDayNotifyTime) {
        return {
          settings: currentSettings,
          changedReminderCount: 0,
          skippedPastCount: 0,
          failedReminderCount: 0,
        };
      }
      const updatedSettings = settings.updateAllDayNotifyTime
        ? await settings.updateAllDayNotifyTime(allDayNotifyTime)
        : await settings.get();
      const activeReminders = await reminders.listActive(now);
      let changedReminderCount = 0;
      let skippedPastCount = 0;
      let failedReminderCount = 0;
      for (const reminder of activeReminders.filter((item) => item.allDay === true)) {
        const nextTargetNotifyAt = buildAllDayTargetNotifyAt(
          reminder.targetAt,
          allDayNotifyTime,
        ).toISOString();
        if (nextTargetNotifyAt === reminder.targetNotifyAt) continue;
        try {
          const updated = await reminders.updateTargetSchedule(reminder.id, {
            targetAt: reminder.targetAt,
            targetNotifyAt: nextTargetNotifyAt,
            targetNotificationId: null,
          });
          if (!updated) {
            failedReminderCount += 1;
            continue;
          }
          changedReminderCount += 1;
          await notifications.cancelOne(reminder.targetNotificationId);
          if (new Date(nextTargetNotifyAt).getTime() <= now.getTime()) {
            skippedPastCount += 1;
            continue;
          }
          const result = await notifications.scheduleTarget(updated, {
            permissionMode: 'check-only',
          });
          if (result.status !== 'scheduled') {
            failedReminderCount += 1;
            continue;
          }
          const saved = await reminders.updateTargetSchedule(reminder.id, {
            targetAt: reminder.targetAt,
            targetNotifyAt: nextTargetNotifyAt,
            targetNotificationId: result.notificationId,
          });
          if (!saved) {
            await notifications.cancelOne(result.notificationId);
            failedReminderCount += 1;
          }
        } catch {
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
      const retainedExpiredReminders = currentSettings.autoDeleteEnabled
        ? await reminders.listRetainedExpired()
        : [];
      const remindersToRemove = [...expiredReminders, ...retainedExpiredReminders];
      if (remindersToRemove.length === 0) return 0;

      if (currentSettings.autoDeleteEnabled) {
        await Promise.all(remindersToRemove.map((reminder) => notifications.cancel(reminder)));
        await reminders.deleteMany(remindersToRemove.map((reminder) => reminder.id));
      } else {
        await Promise.all(expiredReminders.map((reminder) => reminders.markExpired(reminder.id)));
      }
      await widget.sync();
      return remindersToRemove.length;
    },
  };
}
