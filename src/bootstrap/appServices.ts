import { createReminderUseCases } from '../features/reminders/application/reminderUseCases';
import { sqliteReminderRepository } from '../features/reminders/infrastructure/sqliteReminderRepository';
import { createSettingsUseCases } from '../features/settings/application/settingsUseCases';
import { sqliteSettingsRepository } from '../features/settings/infrastructure/sqliteSettingsRepository';
import {
  cancelAllScheduledNotifications,
  getNotificationPermissionStatus,
  reminderNotificationGateway,
  requestNotificationPermissions,
  scheduleTestReminderNotifications,
} from '../lib/notifications/reminderNotifications';
import { posthogAnalytics } from '../lib/analytics/posthogAnalytics';
import { updateWidget } from '../widget/widgetUpdateService';
import { revenueCatPurchaseService } from '../features/purchases/infrastructure/revenueCatPurchaseService';
import { prepareRaiseToSpeak } from '../lib/voice-input/prepareRaiseToSpeak';
import { voiceInputService } from '../lib/voice-input/voiceInputService';

const widgetGateway = {
  async sync() {
    try {
      await updateWidget();
    } catch (error) {
      console.warn('Failed to sync reminder widget', error);
    }
  },
};

const reminderUseCases = createReminderUseCases({
  reminders: sqliteReminderRepository,
  settings: {
    get: sqliteSettingsRepository.get,
    updatePreviousNotifyTime: (previousNotifyTime: string) =>
      sqliteSettingsRepository.update({ previousNotifyTime }),
  },
  notifications: reminderNotificationGateway,
  widget: widgetGateway,
  proAccess: {
    getState: revenueCatPurchaseService.getProAccessState,
  },
});

export const appServices = {
  analytics: posthogAnalytics,
  purchases: revenueCatPurchaseService,
  voiceInput: voiceInputService,
  raiseToSpeak: {
    prepare: prepareRaiseToSpeak,
  },
  reminders: reminderUseCases,
  settings: createSettingsUseCases({
    settings: sqliteSettingsRepository,
    widget: widgetGateway,
    analytics: posthogAnalytics,
    reminders: {
      cleanup: reminderUseCases.cleanup,
    },
  }),
  notificationSettings: {
    cancelAllScheduledNotifications,
    getNotificationPermissionStatus,
    requestNotificationPermissions,
    scheduleTestReminderNotifications,
  },
};

export type AppServices = typeof appServices;
