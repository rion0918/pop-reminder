import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import PostHog from 'posthog-react-native';

import { createAnalyticsService, isAllowedAnalyticsEvent } from './analyticsService';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim() ?? '';
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;
const POSTHOG_STORAGE_PREFIX = 'posthog-consent-v2:';

const allowedPostHogPropertyKeys = new Set([
  'distinct_id',
  '$lib',
  '$lib_version',
  '$screen_name',
  'source',
  'date_preset',
  'notification_status',
  'notification_reason',
  'surface',
  'field',
  'count',
  'can_ask_again',
  'placement',
  'outcome',
]);

const posthogStorage = {
  getItem: (key: string) => AsyncStorage.getItem(`${POSTHOG_STORAGE_PREFIX}${key}`),
  setItem: (key: string, value: string) =>
    AsyncStorage.setItem(`${POSTHOG_STORAGE_PREFIX}${key}`, value),
};

function sanitizePostHogEvent<T extends { properties?: object }>(event: T) {
  if (event.properties) {
    for (const key of Object.keys(event.properties)) {
      if (!allowedPostHogPropertyKeys.has(key)) {
        Reflect.deleteProperty(event.properties, key);
      }
    }
  }

  return event;
}

void Promise.all(
  ['.posthog-rn.json', '.posthog-rn-logs.json'].map((key) =>
    AsyncStorage.removeItem(key).catch(() => {}),
  ),
);
if (LegacyFileSystem.documentDirectory) {
  void Promise.all(
    ['.posthog-rn.json', '.posthog-rn-logs.json'].map((key) =>
      LegacyFileSystem.deleteAsync(`${LegacyFileSystem.documentDirectory}${key}`, {
        idempotent: true,
      }).catch(() => {}),
    ),
  );
}

function createPostHogClient() {
  if (!posthogApiKey) return null;

  try {
    return new PostHog(posthogApiKey, {
      host: posthogHost,
      defaultOptIn: false,
      customStorage: posthogStorage,
      customAppProperties: () => ({}),
      captureAppLifecycleEvents: false,
      disableGeoip: true,
      enableSessionReplay: false,
      disableRemoteFeatureFlags: true,
      preloadFeatureFlags: false,
      sendFeatureFlagEvent: false,
      disableSurveys: true,
      capturePushNotificationSubscriptions: false,
      capturePushNotificationOpened: false,
      errorTracking: {
        autocapture: {
          uncaughtExceptions: false,
          unhandledRejections: false,
          console: false,
          nativeCrashes: false,
        },
        exceptionSteps: { enabled: false },
      },
      setDefaultPersonProperties: false,
      personProfiles: 'never',
      before_send: (event) =>
        event && isAllowedAnalyticsEvent(event.event) ? sanitizePostHogEvent(event) : null,
    });
  } catch {
    return null;
  }
}

export const posthogAnalytics = createAnalyticsService(createPostHogClient, {
  configured: Boolean(posthogApiKey),
});
