import { act, fireEvent, render } from '@testing-library/react-native';

const mockUpdateAnalyticsConsent = jest.fn();
const mockCaptureScreen = jest.fn();
const mockSetCaptureEnabled = jest.fn(async () => true);
let mockAnalyticsConsent: 'unknown' | 'granted' | 'denied' = 'unknown';

jest.mock('expo-router', () => ({
  usePathname: () => '/settings',
}));

jest.mock('../../../bootstrap/appServicesContext', () => ({
  useAppServices: () => ({
    analytics: {
      configured: true,
      captureScreen: mockCaptureScreen,
      setCaptureEnabled: mockSetCaptureEnabled,
    },
  }),
}));

jest.mock('../presentation/useAppSettingsQuery', () => ({
  useAppSettingsQuery: () => ({
    settings: { analyticsConsent: mockAnalyticsConsent },
    updateAnalyticsConsent: mockUpdateAnalyticsConsent,
  }),
}));

const { AnalyticsConsentGate } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./AnalyticsConsentGate') as typeof import('./AnalyticsConsentGate');

describe('AnalyticsConsentGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyticsConsent = 'unknown';
    mockUpdateAnalyticsConsent.mockResolvedValue({ analyticsConsent: 'granted' });
  });

  it('applies persisted consent once when settings are first hydrated', async () => {
    mockAnalyticsConsent = 'granted';

    await render(<AnalyticsConsentGate>{null}</AnalyticsConsentGate>);

    expect(mockSetCaptureEnabled).toHaveBeenCalledTimes(1);
    expect(mockSetCaptureEnabled).toHaveBeenCalledWith(true);
  });

  it('persists consent before capturing the current screen', async () => {
    const view = await render(<AnalyticsConsentGate>{null}</AnalyticsConsentGate>);

    await act(async () => {
      fireEvent.press(view.getByLabelText('匿名の利用状況を共有する'));
    });

    expect(mockUpdateAnalyticsConsent).toHaveBeenCalledWith('granted');
    expect(mockUpdateAnalyticsConsent.mock.invocationCallOrder[0]).toBeLessThan(
      mockCaptureScreen.mock.invocationCallOrder[0],
    );
  });

  it('keeps the consent choice visible when persistence or SDK activation fails', async () => {
    mockUpdateAnalyticsConsent.mockRejectedValue(new Error('consent failed'));
    const view = await render(<AnalyticsConsentGate>{null}</AnalyticsConsentGate>);

    await act(async () => {
      fireEvent.press(view.getByLabelText('匿名の利用状況を共有する'));
    });

    expect(view.getByLabelText('匿名の利用状況を共有する')).toBeOnTheScreen();
    expect(mockCaptureScreen).not.toHaveBeenCalled();
  });

  it('persists denied consent without capturing a screen', async () => {
    const view = await render(<AnalyticsConsentGate>{null}</AnalyticsConsentGate>);

    await act(async () => {
      fireEvent.press(view.getByLabelText('匿名の利用状況を共有しない'));
    });

    expect(mockUpdateAnalyticsConsent).toHaveBeenCalledWith('denied');
    expect(mockCaptureScreen).not.toHaveBeenCalled();
  });
});
