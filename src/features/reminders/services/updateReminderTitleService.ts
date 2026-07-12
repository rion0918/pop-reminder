import { reminderTitleSchema } from '../schemas/reminderSchema';
import { updateWidget } from '../../../widget/widgetUpdateService';
import {
  getReminderById,
  updateReminderNotificationIds,
  updateReminderTitleById,
} from './reminderRepository';
import {
  reminderServiceDependencies,
  type ReminderServiceDependencies,
} from './reminderServiceDependencies';

export async function updateReminderTitle(
  id: string,
  title: string,
  dependencies: ReminderServiceDependencies = reminderServiceDependencies,
) {
  const parsedTitle = reminderTitleSchema.parse(title);
  const reminder = await getReminderById(id);

  if (!reminder) {
    return null;
  }

  const updatedReminder = await updateReminderTitleById(id, parsedTitle);

  if (!updatedReminder) {
    return null;
  }

  const { notificationGateway, settingsGateway } = dependencies;

  try {
    const settings = await settingsGateway.getAppSettings();
    const notificationIds = await notificationGateway.scheduleReminderNotifications(
      updatedReminder,
      {
        soundEnabled: settings.notificationSoundEnabled,
      },
    );
    const hasReplacementNotifications =
      notificationIds.previousNotificationId !== null ||
      notificationIds.targetNotificationId !== null;

    if (hasReplacementNotifications) {
      await notificationGateway.cancelReminderNotifications(reminder);
      const reminderWithUpdatedNotificationIds = await updateReminderNotificationIds(
        updatedReminder.id,
        notificationIds,
      );

      return reminderWithUpdatedNotificationIds ?? updatedReminder;
    }
  } catch (error) {
    console.warn('Failed to refresh reminder notifications after title update', error);
  } finally {
    await updateWidget();
  }

  return updatedReminder;
}
