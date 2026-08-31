import { render, waitFor } from '@testing-library/react-native';

const mockServices = {
  settings: {
    get: jest.fn(async () => ({ analyticsConsent: 'denied' })),
    update: jest.fn(),
    updateAnalyticsConsent: jest.fn(),
  },
  analytics: {
    configured: true,
    setCaptureEnabled: jest.fn(async () => false),
    captureScreen: jest.fn(),
  },
  reminders: {
    retryPendingNotifications: jest.fn(async () => undefined),
  },
};

jest.mock('expo-router', () => ({
  usePathname: () => '/settings',
}));

jest.mock('./appServices', () => ({
  appServices: mockServices,
}));

const { AppProviders } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./AppProviders') as typeof import('./AppProviders');

describe('AppProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides the shared settings query to the feature-owned consent gate', async () => {
    await render(<AppProviders>{null}</AppProviders>);

    await waitFor(() => expect(mockServices.settings.get).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockServices.analytics.setCaptureEnabled).toHaveBeenCalledWith(false),
    );
  });
});
