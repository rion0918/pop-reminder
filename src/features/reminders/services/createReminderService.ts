import { createReminderInputSchema, CreateReminderInput } from '../schemas/reminderSchema';
import { insertReminder, updateReminderNotificationIds } from './reminderRepository';
import { buildReminderSchedule } from './reminderDateService';
import {
  reminderServiceDependencies,
  ReminderServiceDependencies,
} from './reminderServiceDependencies';
import { updateWidget } from '../../../widget/widgetUpdateService';

type CreateReminderOptions = {
  useTestNotifications?: boolean;
};

export async function createReminder(
  input: CreateReminderInput,
  options?: CreateReminderOptions,
  dependencies: ReminderServiceDependencies = reminderServiceDependencies,
) {
  const { notificationGateway, settingsGateway } = dependencies;
  const parsed = createReminderInputSchema.parse(input);
  const settings = await settingsGateway.getAppSettings();
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
        ? await notificationGateway.scheduleTestReminderNotifications(reminder, {
            soundEnabled: settings.notificationSoundEnabled,
          })
        : await notificationGateway.scheduleReminderNotifications(reminder, {
            soundEnabled: settings.notificationSoundEnabled,
          });

    const result = (await updateReminderNotificationIds(reminder.id, notificationIds)) ?? reminder;
    void updateWidget();
    return result;
  } catch (error) {
    console.warn('Failed to schedule reminder notifications', error);
    void updateWidget();
    return reminder;
  }
}
