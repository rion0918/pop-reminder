import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readSource } from '../../test-utils/sourceAssertions';
import {
  ALLOWED_ANALYTICS_EVENTS,
  createAnalyticsService,
  isAllowedAnalyticsEvent,
  type AnalyticsClient,
} from './analyticsService';

type CapturedEvent = { event: string; properties?: Record<string, unknown> };

function makeClient() {
  const captured: CapturedEvent[] = [];
  const screens: CapturedEvent[] = [];
  const calls = { optIn: 0, optOut: 0, ready: 0 };
  const client: AnalyticsClient = {
    optedOut: false,
    capture(event, properties) {
      captured.push({ event, properties });
    },
    screen(name, properties) {
      screens.push({ event: name, properties });
    },
    async ready() {
      calls.ready += 1;
    },
    optIn() {
      calls.optIn += 1;
      client.optedOut = false;
    },
    optOut() {
      calls.optOut += 1;
      client.optedOut = true;
    },
  };

  return { captured, screens, calls, client };
}

test('analytics emits only the approved event schema without reminder content', (t) => {
  t.mock.method(Date, 'now', () => 1_000);
  const fake = makeClient();
  const analytics = createAnalyticsService(fake.client);

  analytics.captureQuickAddOpened({ source: 'widget_deep_link' });
  analytics.captureReminderCreated({
    source: 'widget_deep_link',
    datePreset: 'nextWeek',
    notificationStatus: 'not-scheduled',
    notificationReason: 'notification-permission-denied',
  });
  analytics.captureReminderEdited({
    surface: 'reminders_list',
    field: 'schedule',
    notificationStatus: 'partial',
    notificationReason: 'previous-scheduling-failed',
  });
  analytics.captureReminderDeleted({ surface: 'home', count: 2 });
  analytics.captureNotificationPermissionUpdated({ status: 'denied', canAskAgain: false });
  analytics.captureProGateReached({ source: 'widget_deep_link' });
  analytics.captureProPaywallResult({ placement: 'active_limit', outcome: 'purchased' });
  analytics.captureProRestoreResult({ outcome: 'no-purchase' });
  const visitId = fake.captured[0].properties?.quick_add_id;

  assert.deepEqual(fake.captured, [
    {
      event: 'quick add opened',
      properties: { source: 'widget_deep_link', quick_add_id: visitId, input_mode: 'text' },
    },
    {
      event: 'reminder created',
      properties: {
        source: 'widget_deep_link',
        quick_add_id: visitId,
        input_mode: 'text',
        first_in_quick_add: true,
        elapsed_seconds: 0,
        date_preset: 'nextWeek',
        notification_status: 'not-scheduled',
        notification_reason: 'notification-permission-denied',
      },
    },
    {
      event: 'reminder edited',
      properties: {
        surface: 'reminders_list',
        field: 'schedule',
        notification_status: 'partial',
        notification_reason: 'previous-scheduling-failed',
      },
    },
    { event: 'reminder deleted', properties: { surface: 'home', count: 2 } },
    {
      event: 'notification permission updated',
      properties: { status: 'denied', can_ask_again: false },
    },
    { event: 'pro gate reached', properties: { source: 'widget_deep_link' } },
    {
      event: 'pro paywall result',
      properties: { placement: 'active_limit', outcome: 'purchased' },
    },
    { event: 'pro restore result', properties: { outcome: 'no-purchase' } },
  ]);
  assert.deepEqual(
    [...ALLOWED_ANALYTICS_EVENTS],
    [
      '$screen',
      'app active',
      'quick add opened',
      'quick add submitted',
      'quick add closed',
      'voice input started',
      'voice input result',
      'reminder created',
      'reminder creation failed',
      'reminder edited',
      'reminder deleted',
      'notification permission updated',
      'pro gate reached',
      'pro paywall requested',
      'pro paywall result',
      'pro restore result',
    ],
  );
  assert.equal(isAllowedAnalyticsEvent('$screen'), true);
  assert.equal(isAllowedAnalyticsEvent('$exception'), false);
});

test('analytics omits notification properties unless the result can contain them', () => {
  const fake = makeClient();
  const analytics = createAnalyticsService(fake.client);

  analytics.captureReminderCreated({
    source: 'home_button',
    datePreset: 'today',
    notificationStatus: 'scheduled',
    notificationReason: 'scheduling-failed',
  });
  analytics.captureReminderEdited({
    surface: 'home',
    field: 'title',
    notificationStatus: 'not-scheduled',
    notificationReason: 'scheduling-failed',
  });

  assert.deepEqual(fake.captured, [
    {
      event: 'reminder created',
      properties: {
        source: 'home_button',
        date_preset: 'today',
        notification_status: 'scheduled',
      },
    },
    {
      event: 'reminder edited',
      properties: { surface: 'home', field: 'title' },
    },
  ]);
});

test('analytics screen tracking forwards only the canonical pathname', () => {
  const fake = makeClient();
  const analytics = createAnalyticsService(fake.client);

  analytics.captureScreen('/settings');

  assert.deepEqual(fake.screens, [{ event: '/settings', properties: undefined }]);
});

test('quick add measures one sheet visit, repeated saves, and dismissal without content', (t) => {
  let now = 1_000;
  t.mock.method(Date, 'now', () => now);
  const fake = makeClient();
  const analytics = createAnalyticsService(fake.client);

  analytics.captureQuickAddOpened({ source: 'home_button', inputMode: 'text' });
  const visitId = fake.captured[0].properties?.quick_add_id;
  assert.equal(typeof visitId, 'string');
  analytics.captureQuickAddOpened({ source: 'raise_to_speak', inputMode: 'voice' });
  analytics.captureVoiceInputStarted();
  analytics.captureVoiceInputResult({ outcome: 'success' });
  analytics.captureVoiceInputResult({ outcome: 'empty' });
  now = 6_000;
  analytics.captureQuickAddSubmitted({ datePreset: 'today', allDay: false });
  analytics.captureReminderCreated({
    source: 'home_button',
    datePreset: 'today',
    notificationStatus: 'scheduled',
  });
  analytics.captureReminderCreated({
    source: 'home_button',
    datePreset: 'tomorrow',
    notificationStatus: 'scheduled',
  });
  now = 11_000;
  analytics.captureQuickAddClosed();
  analytics.captureQuickAddClosed();

  assert.equal(fake.captured.filter(({ event }) => event === 'quick add opened').length, 1);
  assert.equal(fake.captured.filter(({ event }) => event === 'voice input result').length, 1);
  const created = fake.captured.filter(({ event }) => event === 'reminder created');
  assert.equal(created[0].properties?.quick_add_id, visitId);
  assert.equal(created[0].properties?.input_mode, 'voice');
  assert.equal(created[0].properties?.first_in_quick_add, true);
  assert.equal(created[0].properties?.elapsed_seconds, 5);
  assert.equal(created[1].properties?.input_mode, 'text');
  assert.equal(created[1].properties?.first_in_quick_add, false);
  assert.equal(created[1].properties?.elapsed_seconds, undefined);
  assert.deepEqual(fake.captured.at(-1), {
    event: 'quick add closed',
    properties: {
      quick_add_id: visitId,
      source: 'home_button',
      outcome: 'created',
      created_count: 2,
      elapsed_seconds: 10,
    },
  });
});

test('consent gates activity and forgets unfinished input tracking on withdrawal', async () => {
  const fake = makeClient();
  fake.client.optedOut = true;
  const analytics = createAnalyticsService(fake.client);
  analytics.captureQuickAddOpened({ source: 'home_button' });
  analytics.captureVoiceInputStarted();
  analytics.captureAppActive({ source: 'resume' });
  assert.deepEqual(fake.captured, []);

  await analytics.setCaptureEnabled(true);
  await analytics.setCaptureEnabled(true);
  assert.equal(fake.captured.filter(({ event }) => event === 'app active').length, 1);
  analytics.captureQuickAddOpened({ source: 'home_button' });
  analytics.captureVoiceInputStarted();
  await analytics.setCaptureEnabled(false);
  await analytics.setCaptureEnabled(true);
  const count = fake.captured.length;
  analytics.captureQuickAddClosed();
  analytics.captureVoiceInputResult({ outcome: 'success' });
  assert.equal(fake.captured.length, count);
});

test('version and environment context accompany every captured event and screen', () => {
  const fake = makeClient();
  const context = {
    analytics_version: 2,
    environment: 'production' as const,
    platform: 'android',
    app_version: '0.1.0',
    app_build: '12',
  };
  const analytics = createAnalyticsService(fake.client, { context });
  analytics.captureScreen('/');
  analytics.captureAppActive({ source: 'resume' });
  assert.deepEqual(fake.screens[0], { event: '/', properties: context });
  assert.deepEqual(fake.captured[0], {
    event: 'app active',
    properties: { ...context, source: 'resume' },
  });
});

test('withdrawal during opt-in prevents measurement start and leaves the SDK opted out', async () => {
  const fake = makeClient();
  fake.client.optedOut = true;
  let finishOptIn!: () => void;
  let announceOptIn!: () => void;
  const optInStarted = new Promise<void>((resolve) => {
    announceOptIn = resolve;
  });
  const optInFinished = new Promise<void>((resolve) => {
    finishOptIn = resolve;
  });
  fake.client.optIn = async () => {
    announceOptIn();
    await optInFinished;
    fake.client.optedOut = false;
  };
  const analytics = createAnalyticsService(fake.client);
  const enabling = analytics.setCaptureEnabled(true);
  await optInStarted;
  const disabling = analytics.setCaptureEnabled(false);
  await Promise.resolve();
  await Promise.resolve();
  finishOptIn();
  await Promise.all([enabling, disabling]);

  assert.deepEqual(fake.captured, []);
  assert.equal(fake.client.optedOut, true);
  assert.equal(await analytics.getCaptureEnabled(), false);
});

test('analytics is a no-op without a configured client and isolates SDK failures', async () => {
  const disabled = createAnalyticsService(null);
  disabled.captureQuickAddOpened({ source: 'home_button' });
  disabled.captureScreen('/');
  assert.equal(disabled.configured, false);
  assert.equal(await disabled.getCaptureEnabled(), false);
  assert.equal(await disabled.setCaptureEnabled(true), false);

  const throwingClient: AnalyticsClient = {
    optedOut: false,
    capture() {
      throw new Error('capture failed');
    },
    screen() {
      throw new Error('screen failed');
    },
    ready() {
      throw new Error('ready failed');
    },
    optIn() {
      throw new Error('opt in failed');
    },
    optOut() {
      throw new Error('opt out failed');
    },
  };
  const isolated = createAnalyticsService(throwingClient);
  assert.doesNotThrow(() => isolated.captureQuickAddOpened({ source: 'home_button' }));
  assert.doesNotThrow(() => isolated.captureScreen('/'));
  assert.equal(await isolated.getCaptureEnabled(), false);
  assert.equal(await isolated.setCaptureEnabled(false), false);
});

test('analytics persists opt-in and opt-out through the SDK client', async () => {
  const fake = makeClient();
  const analytics = createAnalyticsService(fake.client);

  assert.equal(await analytics.getCaptureEnabled(), true);
  assert.equal(await analytics.setCaptureEnabled(false), false);
  assert.equal(await analytics.setCaptureEnabled(true), true);
  assert.deepEqual(fake.calls, { optIn: 1, optOut: 1, ready: 3 });
});

test('analytics fails closed when SDK opt-out fails', async () => {
  const fake = makeClient();
  fake.client.optOut = () => {
    throw new Error('opt out failed');
  };
  const analytics = createAnalyticsService(fake.client);

  assert.equal(await analytics.setCaptureEnabled(false), false);
  analytics.captureQuickAddOpened({ source: 'home_button' });
  assert.deepEqual(fake.captured, []);
});

test('lazy analytics does not create a client or capture before explicit consent', async () => {
  const fake = makeClient();
  let factoryCalls = 0;
  const analytics = createAnalyticsService(
    () => {
      factoryCalls += 1;
      return fake.client;
    },
    { configured: true },
  );

  analytics.captureScreen('/');
  analytics.captureQuickAddOpened({ source: 'home_button' });
  assert.equal(factoryCalls, 0);
  assert.deepEqual(fake.captured, []);
  assert.deepEqual(fake.screens, []);

  assert.equal(await analytics.setCaptureEnabled(true), true);
  assert.equal(factoryCalls, 1);
  assert.deepEqual(fake.captured, [
    { event: 'app active', properties: { source: 'measurement_started' } },
  ]);
  analytics.captureScreen('/');
  assert.deepEqual(fake.screens, [{ event: '/', properties: undefined }]);

  assert.equal(await analytics.setCaptureEnabled(false), false);
  analytics.captureQuickAddOpened({ source: 'home_button' });
  assert.equal(fake.captured.length, 1);
});

test('analytics does not expose a deletion request identifier', () => {
  const fake = makeClient();
  const analytics = createAnalyticsService(fake.client);

  assert.equal('getDeletionRequestId' in analytics, false);
});

test('PostHog client configuration disables sensitive and unused automatic capture', () => {
  const source = readSource(import.meta.url, './posthogAnalytics.ts');

  assert.match(source, /process\.env\.EXPO_PUBLIC_POSTHOG_API_KEY/);
  assert.match(source, /process\.env\.EXPO_PUBLIC_POSTHOG_HOST/);
  assert.match(source, /https:\/\/us\.i\.posthog\.com/);
  assert.match(source, /if \(!posthogApiKey\) return null;/);
  assert.match(source, /try \{[\s\S]*new PostHog[\s\S]*\} catch \{[\s\S]*return null;/);
  assert.match(source, /defaultOptIn: false/);
  assert.match(source, /captureAppLifecycleEvents: false/);
  assert.match(source, /disableGeoip: true/);
  assert.match(source, /enableSessionReplay: false/);
  assert.match(source, /disableRemoteFeatureFlags: true/);
  assert.match(source, /disableSurveys: true/);
  assert.match(source, /capturePushNotificationSubscriptions: false/);
  assert.match(source, /capturePushNotificationOpened: false/);
  assert.match(source, /uncaughtExceptions: false/);
  assert.match(source, /unhandledRejections: false/);
  assert.match(source, /nativeCrashes: false/);
  assert.match(source, /exceptionSteps: \{ enabled: false \}/);
  assert.match(source, /customAppProperties: \(\) => \(\{\}\)/);
  assert.match(source, /posthog-consent-v2:/);
  assert.match(source, /expo-file-system\/legacy/);
  assert.match(source, /\.posthog-rn-logs\.json/);
  assert.match(source, /deleteAsync/);
  assert.match(source, /before_send:/);
  assert.match(source, /isAllowedAnalyticsEvent/);
});
