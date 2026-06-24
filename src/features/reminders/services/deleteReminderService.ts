import { cancelReminderNotifications } from './reminderNotificationService';
import { deleteReminderById, getReminderById } from './reminderRepository';

export async function deleteReminder(id: string) {
  const reminder = await getReminderById(id);

  if (!reminder) {
    return false;
  }

  await cancelReminderNotifications(reminder);
  await deleteReminderById(id);

  return true;
}
