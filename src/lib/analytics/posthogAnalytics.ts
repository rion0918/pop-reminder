import PostHog from 'posthog-react-native';

import { createAnalyticsService, isAllowedAnalyticsEvent } from './analyticsService';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim() ?? '';
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;

function createPostHogClient() {
  if (!posthogApiKey) return null;

  try {
    return new PostHog(posthogApiKey, {
      host: posthogHost,
      captureAppLifecycleEvents: false,
      disableGeoip: true,
      enableSessionReplay: false,
      disableRemoteFeatureFlags: true,
      preloadFeatureFlags: false,
      sendFeatureFlagEvent: false,
      setDefaultPersonProperties: false,
      personProfiles: 'never',
      before_send: (event) => (event && isAllowedAnalyticsEvent(event.event) ? event : null),
    });
  } catch {
    return null;
  }
}

export const posthogAnalytics = createAnalyticsService(createPostHogClient());
