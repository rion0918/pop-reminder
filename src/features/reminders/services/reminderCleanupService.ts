import { getAppSettings } from '../../settings/services/settingsRepository';
import {
  deleteReminders,
  listExpiredReminders,
  markReminderExpired,
} from './reminderRepository';
import { cancelReminderNotifications } from './reminderNotificationService';

export async function cleanupExpiredReminders(now = new Date()) {
  const [settings, expiredReminders] = await Promise.all([
    getAppSettings(),
    listExpiredReminders(now),
  ]);

  if (expiredReminders.length === 0) {
    return 0;
  }

  await Promise.all(expiredReminders.map((reminder) => cancelReminderNotifications(reminder)));

  if (settings.autoDeleteEnabled) {
    await deleteReminders(expiredReminders.map((reminder) => reminder.id));
  } else {
    await Promise.all(expiredReminders.map((reminder) => markReminderExpired(reminder.id)));
  }

  return expiredReminders.length;
}
