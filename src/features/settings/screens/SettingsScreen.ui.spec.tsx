import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { AppSettings, UpdateAppSettingsInput } from '../domain/appSettings';

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  replace: jest.fn(),
};
const mockSettingsUpdate = jest.fn();
const mockRaiseToSpeakPrepare = jest.fn();
const mockHapticsNotificationAsync = jest.fn();
const mockEvents: string[] = [];
let mockSettingsState: AppSettings;
let mockCalibrationDeferred: Promise<void> | null = null;
let mockResolveCalibration: (() => void) | null = null;
let mockRejectCalibration: (() => void) | null = null;
let mockRaiseGestureOptions: {
  enabled: boolean;
  blocked: boolean;
  onStart: () => void | Promise<void>;
} | null = null;

function makeSettings(): AppSettings {
  return {
    id: 'default',
    previousNotifyTime: '20:00',
    defaultTargetTime: '08:00',
    noonTargetTime: '12:00',
    eveningTargetTime: '18:00',
    nightTargetTime: '22:00',
    autoDeleteEnabled: true,
    notificationSoundEnabled: true,
    notificationPermissionIntroSeen: true,
    raiseToSpeakEnabled: false,
    raiseToSpeakIntroSeen: false,
    analyticsConsent: 'denied',
    theme: 'lavender',
  };
}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  notificationAsync: (...args: unknown[]) => mockHapticsNotificationAsync(...args),
}));

jest.mock('../../../bootstrap/AppProviders', () => ({
  useAppServices: () => ({
    reminders: {
      retryPendingNotifications: jest.fn(async () => undefined),
    },
    analytics: {
      configured: true,
      setCaptureEnabled: jest.fn(async () => true),
      getDeletionRequestId: jest.fn(async () => null),
      captureNotificationPermissionUpdated: jest.fn(),
      captureProPaywallResult: jest.fn(),
      captureProRestoreResult: jest.fn(),
    },
    purchases: {
      getProAccessState: jest.fn(async () => 'unavailable'),
      presentProPaywallIfNeeded: jest.fn(async () => 'cancelled'),
      restoreProPurchase: jest.fn(async () => 'no-purchase'),
    },
    raiseToSpeak: {
      prepare: (...args: unknown[]) => mockRaiseToSpeakPrepare(...args),
    },
    notificationSettings: {
      getNotificationPermissionStatus: jest.fn(async () => ({
        status: 'granted',
        label: '許可済み',
        canAskAgain: false,
      })),
      requestNotificationPermissions: jest.fn(),
      scheduleTestReminderNotifications: jest.fn(),
      cancelAllScheduledNotifications: jest.fn(),
    },
  }),
}));

jest.mock('../presentation/useAppSettingsQuery', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    useAppSettingsQuery: () => {
      const [settings, setSettings] = React.useState(mockSettingsState);

      const update = async (patch: UpdateAppSettingsInput) => {
        mockSettingsUpdate(patch);
        if (patch.raiseToSpeakEnabled === true && patch.raiseToSpeakIntroSeen === true) {
          await mockCalibrationDeferred;
        }
        const nextSettings = { ...settings, ...patch };
        mockSettingsState = nextSettings;
        setSettings(nextSettings);
        mockEvents.push(`update:${JSON.stringify(patch)}`);
        return nextSettings;
      };

      return {
        settings,
        loading: false,
        refresh: jest.fn(async () => ({ data: settings })),
        update,
        updatePreviousNotifyTime: jest.fn(),
        isUpdatingPreviousNotifyTime: false,
      };
    },
  };
});

jest.mock('../presentation/useNotificationSettings', () => ({
  useNotificationSettings: () => ({
    cancelAllScheduledNotifications: jest.fn(),
    getNotificationPermissionStatus: jest.fn(async () => ({
      status: 'granted',
      label: '許可済み',
      canAskAgain: false,
    })),
    requestNotificationPermissions: jest.fn(),
    scheduleTestReminderNotifications: jest.fn(),
  }),
}));

jest.mock('../../purchases/presentation/useProAccessQuery', () => ({
  useProAccessQuery: () => ({
    proAccessState: 'unavailable',
    isProAccessLoading: false,
    refreshProAccess: jest.fn(async () => 'unavailable'),
  }),
}));

jest.mock('../../reminders/stores/notificationDevStore', () => ({
  useNotificationDevStore: (selector: (state: unknown) => unknown) =>
    selector({
      isNotificationTestModeEnabled: false,
      setNotificationTestModeEnabled: jest.fn(),
    }),
}));

jest.mock('../../../shared/components/AppScreen', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    AppScreen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('../../../shared/components/TimePickerModal', () => ({
  TimePickerModal: () => null,
}));

jest.mock('../../reminders/hooks/useRaiseToSpeakGesture', () => ({
  useRaiseToSpeakGesture: (options: typeof mockRaiseGestureOptions) => {
    mockRaiseGestureOptions = options;
  },
}));

const { SettingsScreen } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./SettingsScreen') as typeof import('./SettingsScreen');

describe('SettingsScreen raise-to-speak setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvents.length = 0;
    mockSettingsState = makeSettings();
    mockResolveCalibration = null;
    mockRejectCalibration = null;
    mockCalibrationDeferred = new Promise<void>((resolve) => {
      mockResolveCalibration = resolve;
    });
    mockRaiseGestureOptions = null;
    mockRaiseToSpeakPrepare.mockResolvedValue({ status: 'ready' });
    mockHapticsNotificationAsync.mockImplementation(async () => {
      mockEvents.push('haptic');
    });
  });

  it('releases the setup lock when preparation fails', async () => {
    mockRaiseToSpeakPrepare.mockRejectedValue(new Error('preparation failed'));
    const view = await render(<SettingsScreen />);

    await fireEvent(view.getByLabelText('左右に傾けて音声入力'), 'valueChange', true);
    await waitFor(() =>
      expect(view.getByLabelText('左右に傾けて音声入力を使ってみる')).toBeOnTheScreen(),
    );
    await fireEvent.press(view.getByLabelText('左右に傾けて音声入力を使ってみる'));

    await waitFor(() => {
      expect(mockRaiseToSpeakPrepare).toHaveBeenCalledTimes(1);
      expect(mockRaiseGestureOptions?.blocked).toBe(false);
      expect(view.getByLabelText('左右に傾けて音声入力を使ってみる')).not.toBeDisabled();
    });
    expect(view.queryByLabelText('左右に傾けて音声入力の設定をキャンセル')).toBeNull();
  });

  it('releases the setup lock when calibration persistence fails', async () => {
    mockCalibrationDeferred = new Promise<void>((_, reject) => {
      mockRejectCalibration = () => reject(new Error('calibration persistence failed'));
    });
    const view = await render(<SettingsScreen />);

    await fireEvent(view.getByLabelText('左右に傾けて音声入力'), 'valueChange', true);
    await waitFor(() =>
      expect(view.getByLabelText('左右に傾けて音声入力を使ってみる')).toBeOnTheScreen(),
    );
    await fireEvent.press(view.getByLabelText('左右に傾けて音声入力を使ってみる'));
    await waitFor(() => expect(mockRaiseGestureOptions?.enabled).toBe(true));

    await act(async () => {
      void mockRaiseGestureOptions?.onStart();
    });
    await waitFor(() => {
      expect(mockRaiseGestureOptions?.blocked).toBe(true);
      expect(view.getByLabelText('左右に傾けて音声入力の設定をキャンセル')).toBeDisabled();
    });

    await act(async () => {
      mockRejectCalibration?.();
    });
    await waitFor(() => {
      expect(mockRaiseGestureOptions?.blocked).toBe(false);
      expect(view.getByLabelText('左右に傾けて音声入力を使ってみる')).not.toBeDisabled();
    });
    expect(view.queryByLabelText('左右に傾けて音声入力の設定をキャンセル')).toBeNull();
  });

  it('persists the first enable, prepares the gesture, and blocks cancellation while saving', async () => {
    const view = await render(<SettingsScreen />);

    const enabledSwitch = view.getByLabelText('左右に傾けて音声入力');
    await fireEvent(enabledSwitch, 'valueChange', true);
    await waitFor(() => {
      expect(mockSettingsUpdate).toHaveBeenCalledWith({ raiseToSpeakEnabled: true });
      expect(view.getByLabelText('左右に傾けて音声入力を使ってみる')).toBeOnTheScreen();
    });

    await fireEvent.press(view.getByLabelText('左右に傾けて音声入力を使ってみる'));
    await waitFor(() => expect(mockRaiseToSpeakPrepare).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockRaiseGestureOptions?.enabled).toBe(true));

    await act(async () => {
      void mockRaiseGestureOptions?.onStart();
    });
    await waitFor(() => expect(mockRaiseGestureOptions?.blocked).toBe(true));

    const updateCountBeforeCancel = mockSettingsUpdate.mock.calls.length;
    const cancelButton = view.getByLabelText('左右に傾けて音声入力の設定をキャンセル');
    expect(cancelButton).toBeDisabled();
    await fireEvent.press(cancelButton);
    expect(mockSettingsUpdate).toHaveBeenCalledTimes(updateCountBeforeCancel);

    await act(async () => {
      mockResolveCalibration?.();
      await mockCalibrationDeferred;
    });
    await waitFor(() => expect(mockRaiseGestureOptions?.enabled).toBe(false));

    expect(mockSettingsUpdate).toHaveBeenLastCalledWith({
      raiseToSpeakEnabled: true,
      raiseToSpeakIntroSeen: true,
    });
    expect(mockEvents.indexOf('haptic')).toBeGreaterThan(
      mockEvents.findIndex((event) => event.includes('raiseToSpeakIntroSeen')),
    );
  });
});
