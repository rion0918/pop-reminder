import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockEvents: string[] = [];
const mockServices = {
  settings: {
    get: jest.fn(),
    update: jest.fn(),
  },
  analytics: {
    configured: true,
    setCaptureEnabled: jest.fn(),
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

function makeSettings(analyticsConsent: 'unknown' | 'granted' | 'denied') {
  return { analyticsConsent };
}

type RenderedApp = Awaited<ReturnType<typeof render>>;

function getShareButton(view: RenderedApp) {
  return view.getByLabelText('匿名の利用状況を共有する');
}

describe('AppProviders analytics consent gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvents.length = 0;
    mockServices.settings.get.mockResolvedValue(makeSettings('unknown'));
    mockServices.settings.update.mockImplementation(async ({ analyticsConsent }) => {
      mockEvents.push(`persist:${analyticsConsent}`);
      return makeSettings(analyticsConsent);
    });
    mockServices.analytics.setCaptureEnabled.mockImplementation(async (enabled: boolean) => {
      mockEvents.push(`capture:${enabled}`);
      return true;
    });
  });

  it('enables capture only after consent persistence succeeds', async () => {
    let resolvePersistence!: () => void;
    const persistence = new Promise<void>((resolve) => {
      resolvePersistence = resolve;
    });
    mockServices.settings.update.mockImplementation(async ({ analyticsConsent }) => {
      mockEvents.push(`persist:start:${analyticsConsent}`);
      await persistence;
      mockEvents.push(`persist:done:${analyticsConsent}`);
      return makeSettings(analyticsConsent);
    });

    const view = await render(<AppProviders>{null}</AppProviders>);
    const shareButton = await waitFor(() => getShareButton(view));

    await act(async () => {
      fireEvent.press(shareButton);
    });
    expect(mockServices.analytics.setCaptureEnabled).not.toHaveBeenCalled();

    await act(async () => {
      resolvePersistence();
      await persistence;
    });
    await waitFor(() =>
      expect(mockServices.analytics.setCaptureEnabled).toHaveBeenCalledWith(true),
    );

    expect(mockEvents.indexOf('persist:done:granted')).toBeGreaterThanOrEqual(0);
    expect(mockEvents.indexOf('capture:true')).toBeGreaterThan(
      mockEvents.indexOf('persist:done:granted'),
    );
  });

  it('disables capture when consent persistence fails and keeps the gate open', async () => {
    mockServices.settings.update.mockRejectedValue(new Error('persistence failed'));

    const view = await render(<AppProviders>{null}</AppProviders>);
    const shareButton = await waitFor(() => getShareButton(view));

    await act(async () => {
      await fireEvent.press(shareButton);
    });

    expect(mockServices.analytics.setCaptureEnabled).toHaveBeenCalledWith(false);
    expect(getShareButton(view)).toBeOnTheScreen();
  });

  it('disables capture and restores the previous consent when enabling fails', async () => {
    mockServices.analytics.setCaptureEnabled.mockImplementation(async (enabled: boolean) => {
      mockEvents.push(`capture:${enabled}`);
      return false;
    });

    const view = await render(<AppProviders>{null}</AppProviders>);
    const shareButton = await waitFor(() => getShareButton(view));

    await act(async () => {
      await fireEvent.press(shareButton);
    });
    await waitFor(() => expect(mockServices.settings.update).toHaveBeenCalledTimes(2));

    expect(mockServices.settings.update.mock.calls[0][0]).toEqual({
      analyticsConsent: 'granted',
    });
    expect(mockServices.settings.update.mock.calls[1][0]).toEqual({
      analyticsConsent: 'unknown',
    });
    expect(mockServices.analytics.setCaptureEnabled).toHaveBeenCalledWith(false);
    expect(getShareButton(view)).toBeOnTheScreen();
  });
});
