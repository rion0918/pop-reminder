import { getAppSettings } from '../../settings/services/settingsRepository';
import { reminderNotificationGateway } from '../../../lib/notifications/reminderNotifications';
import type { ReminderNotificationGateway } from '../ports/reminderNotificationGateway';
import type { ReminderSettingsGateway } from '../ports/reminderSettingsGateway';

export type ReminderServiceDependencies = {
  notificationGateway: ReminderNotificationGateway;
  settingsGateway: ReminderSettingsGateway;
};

export const reminderServiceDependencies: ReminderServiceDependencies = {
  notificationGateway: reminderNotificationGateway,
  settingsGateway: {
    getAppSettings,
  },
};
