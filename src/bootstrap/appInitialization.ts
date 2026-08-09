import { initializeDatabase } from '../db/client';
import {
  configureAndroidNotificationChannels,
  configureNotificationHandler,
} from '../lib/notifications/reminderNotifications';
import { appServices } from './appServices';

export function configureAppRuntime() {
  configureNotificationHandler();
  return configureAndroidNotificationChannels().catch((error) => {
    console.warn('Failed to configure notification channels', error);
  });
}

export async function prepareAppData() {
  await initializeDatabase();
  await appServices.reminders.cleanup();
  try {
    await appServices.reminders.retryPendingNotifications();
  } catch (error) {
    console.warn('Failed to retry pending reminder notifications', error);
  }
}
