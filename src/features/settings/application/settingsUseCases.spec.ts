import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AppSettings, UpdateAppSettingsInput } from '../domain/appSettings';
import { createSettingsUseCases } from './settingsUseCases';

const baseSettings: AppSettings = {
  id: 'default',
  previousNotifyTime: '20:00',
  defaultTargetTime: '08:00',
  noonTargetTime: '12:00',
  eveningTargetTime: '18:00',
  nightTargetTime: '20:00',
  autoDeleteEnabled: true,
  notificationSoundEnabled: true,
  notificationPermissionIntroSeen: false,
  raiseToSpeakEnabled: false,
  raiseToSpeakIntroSeen: false,
  analyticsConsent: 'unknown',
  theme: 'lavender',
};

function createDependencies(options?: {
  update?: (input: UpdateAppSettingsInput) => Promise<AppSettings>;
  setCaptureEnabled?: (enabled: boolean) => Promise<boolean>;
}) {
  const events: string[] = [];
  let settings = baseSettings;

  return {
    events,
    dependencies: {
      settings: {
        async get() {
          return settings;
        },
        async update(input: UpdateAppSettingsInput) {
          events.push(`persist:${JSON.stringify(input)}`);
          settings = options?.update ? await options.update(input) : { ...settings, ...input };
          return settings;
        },
      },
      widget: {
        async sync() {
          events.push('widget:sync');
        },
      },
      reminders: {
        async cleanup() {
          events.push('reminders:cleanup');
          return 0;
        },
      },
      analytics: {
        async setCaptureEnabled(enabled: boolean) {
          events.push(`analytics:${enabled}`);
          return options?.setCaptureEnabled ? options.setCaptureEnabled(enabled) : enabled;
        },
      },
    },
  };
}

test('ordinary settings update persists without syncing the widget', async () => {
  const { dependencies, events } = createDependencies();
  const useCases = createSettingsUseCases(dependencies);

  const settings = await useCases.update({ notificationSoundEnabled: false });

  assert.equal(settings.notificationSoundEnabled, false);
  assert.deepEqual(events, ['persist:{"notificationSoundEnabled":false}']);
});

test('theme update persists before syncing the widget once', async () => {
  const { dependencies, events } = createDependencies();
  const useCases = createSettingsUseCases(dependencies);

  const settings = await useCases.update({ theme: 'mint' });

  assert.equal(settings.theme, 'mint');
  assert.deepEqual(events, ['persist:{"theme":"mint"}', 'widget:sync']);
});

test('auto-delete update persists before reconciling expired reminders', async () => {
  const { dependencies, events } = createDependencies();
  const useCases = createSettingsUseCases(dependencies);

  const settings = await useCases.update({ autoDeleteEnabled: false });

  assert.equal(settings.autoDeleteEnabled, false);
  assert.deepEqual(events, ['persist:{"autoDeleteEnabled":false}', 'reminders:cleanup']);
});

test('analytics consent is persisted before capture is enabled', async () => {
  const { dependencies, events } = createDependencies();
  const useCases = createSettingsUseCases(dependencies);

  const settings = await useCases.updateAnalyticsConsent('granted');

  assert.equal(settings.analyticsConsent, 'granted');
  assert.deepEqual(events, ['persist:{"analyticsConsent":"granted"}', 'analytics:true']);
});

test('denied analytics consent persists before capture is disabled', async () => {
  const { dependencies, events } = createDependencies();
  const useCases = createSettingsUseCases(dependencies);

  const settings = await useCases.updateAnalyticsConsent('denied');

  assert.equal(settings.analyticsConsent, 'denied');
  assert.deepEqual(events, ['persist:{"analyticsConsent":"denied"}', 'analytics:false']);
});

test('failed analytics enablement disables capture and restores the previous consent', async () => {
  const { dependencies, events } = createDependencies({
    setCaptureEnabled: async () => false,
  });
  const useCases = createSettingsUseCases(dependencies);

  await assert.rejects(() => useCases.updateAnalyticsConsent('granted'));

  assert.deepEqual(events, [
    'persist:{"analyticsConsent":"granted"}',
    'analytics:true',
    'analytics:false',
    'persist:{"analyticsConsent":"unknown"}',
  ]);
});

test('failed consent persistence leaves capture disabled without a rollback write', async () => {
  const { dependencies, events } = createDependencies({
    update: async () => {
      throw new Error('persistence failed');
    },
  });
  const useCases = createSettingsUseCases(dependencies);

  await assert.rejects(() => useCases.updateAnalyticsConsent('granted'));

  assert.deepEqual(events, ['persist:{"analyticsConsent":"granted"}', 'analytics:false']);
});
