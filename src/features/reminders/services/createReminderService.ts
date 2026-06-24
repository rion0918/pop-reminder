import { getAppSettings } from '../../settings/services/settingsRepository';
import { createReminderInputSchema, CreateReminderInput } from '../schemas/reminderSchema';
import { insertReminder, updateReminderNotificationIds } from './reminderRepository';
import { buildReminderSchedule } from './reminderDateService';
import {
  scheduleReminderNotifications,
  scheduleTestReminderNotifications,
} from './reminderNotificationService';

type CreateReminderOptions = {
  useTestNotifications?: boolean;
};

export async function createReminder(input: CreateReminderInput, options?: CreateReminderOptions) {
  const parsed = createReminderInputSchema.parse(input);
  const settings = await getAppSettings();
  const schedule = buildReminderSchedule({
    dateOffset: parsed.dateOffset,
    customTargetDate: parsed.customTargetDate,
    targetTime: parsed.targetTime,
    previousNotifyTime: settings.previousNotifyTime,
  });

  const reminder = await insertReminder({
    title: parsed.title.trim(),
    targetAt: schedule.targetAt.toISOString(),
    previousNotifyAt: schedule.previousNotifyAt.toISOString(),
    targetNotifyAt: schedule.targetNotifyAt.toISOString(),
    expiresAt: schedule.expiresAt.toISOString(),
  });

  try {
    const notificationIds =
      __DEV__ && options?.useTestNotifications
        ? await scheduleTestReminderNotifications(reminder)
        : await scheduleReminderNotifications(reminder);

    return (await updateReminderNotificationIds(reminder.id, notificationIds)) ?? reminder;
  } catch (error) {
    console.warn('Failed to schedule reminder notifications', error);
    return reminder;
  }
}
