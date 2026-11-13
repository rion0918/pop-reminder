import { StyleSheet } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

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

  it('discloses the analytics recipient and optional collection before consent', async () => {
    const view = await render(<AnalyticsConsentGate>{null}</AnalyticsConsentGate>);

    expect(view.getByText(/PostHog.*米国/)).toBeOnTheScreen();
    expect(view.getByText(/共有しなくても/)).toBeOnTheScreen();
    expect(view.getByText(/イベントの発生時刻/)).toBeOnTheScreen();
  });

  it('applies persisted consent once when settings are first hydrated', async () => {
    mockAnalyticsConsent = 'granted';

    await render(<AnalyticsConsentGate>{null}</AnalyticsConsentGate>);

    expect(mockSetCaptureEnabled).toHaveBeenCalledTimes(1);
    expect(mockSetCaptureEnabled).toHaveBeenCalledWith(true);
    await waitFor(() => expect(mockCaptureScreen).toHaveBeenCalledWith('/settings'));
  });

  it('does not record the initial screen if restoring consent fails', async () => {
    mockAnalyticsConsent = 'granted';
    mockSetCaptureEnabled.mockResolvedValueOnce(false);
    await render(<AnalyticsConsentGate>{null}</AnalyticsConsentGate>);
    expect(mockCaptureScreen).not.toHaveBeenCalled();
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

  it('applies edge-to-edge modal flags, safe-area padding, and a scroll container', async () => {
    const view = await render(
      <SafeAreaInsetsContext.Provider value={{ top: 24, right: 32, bottom: 20, left: 32 }}>
        <AnalyticsConsentGate>{null}</AnalyticsConsentGate>
      </SafeAreaInsetsContext.Provider>,
    );

    const [modal] = view.container.queryAll(
      (node) => node.type === 'RCTModalHostView' || node.type === 'Modal',
    );
    expect(modal).toBeDefined();
    expect(modal.props.statusBarTranslucent).toBe(true);
    expect(modal.props.navigationBarTranslucent).toBe(true);

    const [overlay] = view.container.queryAll(
      (node) => StyleSheet.flatten(node.props.style)?.paddingTop === 36,
    );
    expect(overlay).toBeDefined();
    expect(StyleSheet.flatten(overlay.props.style)).toMatchObject({
      paddingTop: 36,
      paddingBottom: 32,
      paddingLeft: 48,
      paddingRight: 48,
    });

    const [card] = view.container.queryAll((node) => node.props.accessibilityViewIsModal === true);
    expect(StyleSheet.flatten(card.props.style)).toMatchObject({
      maxWidth: 420,
      maxHeight: '100%',
    });
    expect(
      view.container.queryAll((node) => node.type === 'RCTScrollView' || node.type === 'ScrollView')
        .length,
    ).toBeGreaterThan(0);
  });
});
