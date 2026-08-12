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

test('analytics emits only the approved event schema without reminder content', () => {
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

  assert.deepEqual(fake.captured, [
    { event: 'quick add opened', properties: { source: 'widget_deep_link' } },
    {
      event: 'reminder created',
      properties: {
        source: 'widget_deep_link',
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
      'quick add opened',
      'reminder created',
      'reminder edited',
      'reminder deleted',
      'notification permission updated',
      'pro gate reached',
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
  analytics.captureScreen('/');
  assert.deepEqual(fake.screens, [{ event: '/', properties: undefined }]);

  assert.equal(await analytics.setCaptureEnabled(false), false);
  analytics.captureQuickAddOpened({ source: 'home_button' });
  assert.deepEqual(fake.captured, []);
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
