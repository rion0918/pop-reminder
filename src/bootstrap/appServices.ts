import { createReminderUseCases } from '../features/reminders/application/reminderUseCases';
import { sqliteReminderRepository } from '../features/reminders/infrastructure/sqliteReminderRepository';
import { sqliteSettingsRepository } from '../features/settings/infrastructure/sqliteSettingsRepository';
import {
  cancelAllScheduledNotifications,
  getNotificationPermissionStatus,
  reminderNotificationGateway,
  requestNotificationPermissions,
  scheduleTestReminderNotifications,
} from '../lib/notifications/reminderNotifications';
import { updateWidget } from '../widget/widgetUpdateService';

const widgetGateway = {
  async sync() {
    try {
      await updateWidget();
    } catch (error) {
      console.warn('Failed to sync reminder widget', error);
    }
  },
};

export const appServices = {
  reminders: createReminderUseCases({
    reminders: sqliteReminderRepository,
    settings: { get: sqliteSettingsRepository.get },
    notifications: reminderNotificationGateway,
    widget: widgetGateway,
  }),
  settings: sqliteSettingsRepository,
  notificationSettings: {
    cancelAllScheduledNotifications,
    getNotificationPermissionStatus,
    requestNotificationPermissions,
    scheduleTestReminderNotifications,
  },
};

export type AppServices = typeof appServices;
