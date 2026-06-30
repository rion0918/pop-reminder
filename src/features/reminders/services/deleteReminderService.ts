import { deleteReminderById, getReminderById } from './reminderRepository';
import {
  reminderServiceDependencies,
  ReminderServiceDependencies,
} from './reminderServiceDependencies';
import { updateWidget } from '../../../widget/widgetUpdateService';

export async function deleteReminder(
  id: string,
  dependencies: ReminderServiceDependencies = reminderServiceDependencies,
) {
  const { notificationGateway } = dependencies;
  const reminder = await getReminderById(id);

  if (!reminder) {
    return false;
  }

  await notificationGateway.cancelReminderNotifications(reminder);
  await deleteReminderById(id);
  await updateWidget();

  return true;
}
