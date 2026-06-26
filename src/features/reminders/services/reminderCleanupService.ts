import {
  deleteReminders,
  listExpiredReminders,
  markReminderExpired,
} from './reminderRepository';
import {
  reminderServiceDependencies,
  ReminderServiceDependencies,
} from './reminderServiceDependencies';

export async function cleanupExpiredReminders(
  now = new Date(),
  dependencies: ReminderServiceDependencies = reminderServiceDependencies,
) {
  const { notificationGateway, settingsGateway } = dependencies;
  const [settings, expiredReminders] = await Promise.all([
    settingsGateway.getAppSettings(),
    listExpiredReminders(now),
  ]);

  if (expiredReminders.length === 0) {
    return 0;
  }

  await Promise.all(
    expiredReminders.map((reminder) =>
      notificationGateway.cancelReminderNotifications(reminder),
    ),
  );

  if (settings.autoDeleteEnabled) {
    await deleteReminders(expiredReminders.map((reminder) => reminder.id));
  } else {
    await Promise.all(expiredReminders.map((reminder) => markReminderExpired(reminder.id)));
  }

  return expiredReminders.length;
}
