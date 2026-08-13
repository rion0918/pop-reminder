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

const settingsService = {
  get: sqliteSettingsRepository.get,
  async update(input: Parameters<typeof sqliteSettingsRepository.update>[0]) {
    const settings = await sqliteSettingsRepository.update(input);

    if (input.theme !== undefined) {
      await widgetGateway.sync();
    }

    return settings;
  },
};

export const appServices = {
  analytics: posthogAnalytics,
  purchases: revenueCatPurchaseService,
  voiceInput: voiceInputService,
  raiseToSpeak: {
    prepare: prepareRaiseToSpeak,
  },
  reminders: createReminderUseCases({
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
  }),
  settings: settingsService,
  notificationSettings: {
    cancelAllScheduledNotifications,
    getNotificationPermissionStatus,
    requestNotificationPermissions,
    scheduleTestReminderNotifications,
  },
};

export type AppServices = typeof appServices;
