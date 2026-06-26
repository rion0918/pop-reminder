import { getAppSettings } from '../../settings/services/settingsRepository';
import { reminderNotificationGateway } from '../../../lib/notifications/reminderNotifications';
import { ReminderNotificationGateway } from '../ports/reminderNotificationGateway';
import { ReminderSettingsGateway } from '../ports/reminderSettingsGateway';

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
