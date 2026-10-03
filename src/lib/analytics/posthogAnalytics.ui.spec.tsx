type AnalyticsEvent = {
  event: string;
  properties: Record<string, unknown>;
};

let mockBeforeSend: (event: AnalyticsEvent) => AnalyticsEvent | null;

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock('expo-file-system/legacy', () => ({ documentDirectory: null }));

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((_key, options) => {
    mockBeforeSend = options.before_send;
    return { optedOut: false, optIn: jest.fn() };
  }),
}));

it('preserves the SDK geoip opt-out while removing personal event properties', async () => {
  const previousKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY = 'test-project-key';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { posthogAnalytics } = require('./posthogAnalytics');
    await posthogAnalytics.setCaptureEnabled(true);

    expect(
      mockBeforeSend({
        event: 'reminder created',
        properties: {
          distinct_id: 'anonymous-id',
          $geoip_disable: true,
          source: 'home_button',
          status: 'denied',
          environment: 'production',
          analytics_version: 2,
          platform: 'android',
          app_version: '0.1.0',
          app_build: '12',
          quick_add_id: 'anonymous-sheet-visit',
          input_mode: 'voice',
          elapsed_seconds: 5,
          first_in_quick_add: true,
          created_count: 1,
          title: 'private reminder',
          $ip: '192.0.2.1',
          $device_model: 'private device',
        },
      }),
    ).toEqual({
      event: 'reminder created',
      properties: {
        distinct_id: 'anonymous-id',
        $geoip_disable: true,
        source: 'home_button',
        status: 'denied',
        environment: 'production',
        analytics_version: 2,
        platform: 'android',
        app_version: '0.1.0',
        app_build: '12',
        quick_add_id: 'anonymous-sheet-visit',
        input_mode: 'voice',
        elapsed_seconds: 5,
        first_in_quick_add: true,
        created_count: 1,
      },
    });
    expect(mockBeforeSend({ event: '$autocapture', properties: {} })).toBeNull();
  } finally {
    if (previousKey === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    else process.env.EXPO_PUBLIC_POSTHOG_API_KEY = previousKey;
  }
});
