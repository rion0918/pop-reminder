import type { AnalyticsConsent, AppSettings, UpdateAppSettingsInput } from '../domain/appSettings';
import type { SettingsRepository } from './settingsRepository';

export type UpdateGeneralAppSettingsInput = Omit<UpdateAppSettingsInput, 'analyticsConsent'>;

export type SettingsWidgetSyncGateway = {
  sync(): Promise<void>;
};

export type AnalyticsConsentGateway = {
  setCaptureEnabled(enabled: boolean): Promise<boolean>;
};

export type ReminderExpirationGateway = {
  cleanup(): Promise<number>;
};

export type SettingsApplicationDependencies = {
  settings: SettingsRepository;
  widget: SettingsWidgetSyncGateway;
  analytics: AnalyticsConsentGateway;
  reminders: ReminderExpirationGateway;
};

export function createSettingsUseCases(dependencies: SettingsApplicationDependencies) {
  const { settings, widget, analytics, reminders } = dependencies;

  return {
    get: settings.get,

    async update(input: UpdateGeneralAppSettingsInput) {
      const updatedSettings = await settings.update(input);

      if (input.theme !== undefined) {
        await widget.sync();
      }

      if (input.autoDeleteEnabled !== undefined) {
        await reminders.cleanup();
      }

      return updatedSettings;
    },

    async updateAnalyticsConsent(consent: AnalyticsConsent): Promise<AppSettings> {
      const previousSettings = await settings.get();
      let consentPersisted = false;

      try {
        const updatedSettings = await settings.update({ analyticsConsent: consent });
        consentPersisted = true;
        const enabled = await analytics.setCaptureEnabled(consent === 'granted');

        if (consent === 'granted' && !enabled) {
          throw new Error('Analytics could not be enabled');
        }

        return updatedSettings;
      } catch (error) {
        await analytics.setCaptureEnabled(false).catch(() => false);

        if (consentPersisted && previousSettings.analyticsConsent !== consent) {
          await settings
            .update({ analyticsConsent: previousSettings.analyticsConsent })
            .catch(() => undefined);
        }

        throw error;
      }
    },
  };
}
