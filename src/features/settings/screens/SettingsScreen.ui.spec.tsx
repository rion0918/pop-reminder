import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { AppSettings, UpdateAppSettingsInput } from '../domain/appSettings';

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  replace: jest.fn(),
};
const mockSettingsUpdate = jest.fn();
const mockPreviousTimeUpdate = jest.fn(async (value: string) => ({
  settings: { ...mockSettingsState, previousNotifyTime: value },
  skippedPastCount: 0,
  failedReminderCount: 0,
}));
const mockRaiseToSpeakPrepare = jest.fn();
const mockHapticsNotificationAsync = jest.fn();
const mockHapticsSelectionAsync = jest.fn();
const mockEvents: string[] = [];
let mockSettingsState: AppSettings;
let mockSettingsLoading = false;
let mockPreviousTimePending = false;
let mockProAccessState: 'free' | 'pro' | 'unavailable' = 'unavailable';
const mockRestoreProPurchase = jest.fn(async () => 'no-purchase' as const);
let mockCalibrationDeferred: Promise<void> | null = null;
let mockResolveCalibration: (() => void) | null = null;
let mockRejectCalibration: (() => void) | null = null;
let mockRaiseGestureOptions: {
  enabled: boolean;
  blocked: boolean;
  onStart: () => void | Promise<void>;
  onStop: (reason: 'portrait' | 'timeout' | 'interrupted') => void;
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
  selectionAsync: (...args: unknown[]) => mockHapticsSelectionAsync(...args),
}));

jest.mock('../../../bootstrap/appServicesContext', () => ({
  useAppServices: () => ({
    reminders: {
      retryPendingNotifications: jest.fn(async () => undefined),
    },
    analytics: {
      configured: true,
      setCaptureEnabled: jest.fn(async () => true),
      captureNotificationPermissionUpdated: jest.fn(),
      captureProPaywallResult: jest.fn(),
      captureProRestoreResult: jest.fn(),
    },
    purchases: {
      getProAccessState: jest.fn(async () => 'unavailable'),
      presentProPaywallIfNeeded: jest.fn(async () => 'cancelled'),
      restoreProPurchase: mockRestoreProPurchase,
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
        loading: mockSettingsLoading,
        refresh: jest.fn(async () => ({ data: settings })),
        update,
        updateAnalyticsConsent: (analyticsConsent: AppSettings['analyticsConsent']) =>
          update({ analyticsConsent }),
        updatePreviousNotifyTime: mockPreviousTimeUpdate,
        isUpdatingPreviousNotifyTime: mockPreviousTimePending,
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
    proAccessState: mockProAccessState,
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
  TimePickerModal: ({
    visible,
    title = '前日の時刻',
    value,
    onConfirm,
  }: {
    visible: boolean;
    title?: string;
    value: string;
    onConfirm: (value: string) => void;
  }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return visible
      ? React.createElement(
          Pressable,
          { accessibilityLabel: title, onPress: () => onConfirm(value.replace(':00', ':15')) },
          React.createElement(Text, null, value),
        )
      : null;
  },
}));

jest.mock('../../reminders/hooks/useRaiseToSpeakGesture', () => ({
  useRaiseToSpeakGesture: (options: typeof mockRaiseGestureOptions) => {
    mockRaiseGestureOptions = options;
    return {
      sensorStatus: 'waiting',
      retrySensor: jest.fn(),
    };
  },
}));

const { SettingsScreen } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./SettingsScreen') as typeof import('./SettingsScreen');

describe('SettingsScreen raise-to-speak setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvents.length = 0;
    mockProAccessState = 'unavailable';
    mockRestoreProPurchase.mockClear();
    mockRestoreProPurchase.mockResolvedValue('no-purchase');
    mockSettingsState = makeSettings();
    mockSettingsLoading = false;
    mockPreviousTimePending = false;
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
    mockHapticsSelectionAsync.mockImplementation(async () => {
      mockEvents.push('selection');
    });
  });

  it('keeps editable controls hidden until settings are loaded', async () => {
    mockSettingsLoading = true;
    const view = await render(<SettingsScreen />);
    expect(view.queryByLabelText('朝の時刻を変更')).toBeNull();
    expect(view.queryByLabelText('ドリームテーマを選択')).toBeNull();
    view.unmount();
  });

  it('edits the previous notification time from the timeline', async () => {
    const view = await render(<SettingsScreen />);
    await fireEvent.press(view.getByLabelText('前日のお知らせ時刻を変更'));
    await fireEvent.press(view.getByLabelText('前日の時刻'));
    await waitFor(() => expect(mockPreviousTimeUpdate).toHaveBeenCalledWith('20:15'));
    expect(view.getByLabelText('前日のお知らせ時刻を変更')).toHaveAccessibilityValue({
      text: '20:15',
    });
    view.unmount();
  });

  it('preserves the independent analytics consent control', async () => {
    const view = await render(<SettingsScreen />);
    await fireEvent(view.getByLabelText('匿名の利用状況を共有'), 'valueChange', true);
    await waitFor(() =>
      expect(mockSettingsUpdate).toHaveBeenCalledWith({ analyticsConsent: 'granted' }),
    );
    view.unmount();
  });

  it('prevents reopening the previous-time picker while saving', async () => {
    mockPreviousTimePending = true;
    const view = await render(<SettingsScreen />);
    expect(view.getByLabelText('前日のお知らせ時刻を変更')).toBeDisabled();
    await fireEvent.press(view.getByLabelText('前日のお知らせ時刻を変更'));
    expect(view.queryByLabelText('前日の時刻')).toBeNull();
    view.unmount();
  });

  it('shows all four preset times without expanding and updates the selected theme', async () => {
    const view = await render(<SettingsScreen />);
    for (const label of ['朝', '昼', '夕', '夜']) {
      expect(view.getByLabelText(`${label}の時刻を変更`)).toBeOnTheScreen();
    }
    expect(view.getByText('08:00')).toBeOnTheScreen();
    expect(view.getByLabelText('ドリームテーマを選択')).toHaveProp('accessibilityState', {
      selected: true,
    });
    await fireEvent.press(view.getByLabelText('ブリーズテーマを選択'));
    await waitFor(() => expect(mockSettingsUpdate).toHaveBeenCalledWith({ theme: 'mint' }));
    expect(view.getByLabelText('ブリーズテーマを選択')).toHaveProp('accessibilityState', {
      selected: true,
    });
    view.unmount();
  });

  it.each([
    ['朝', 'defaultTargetTime', '08:15'],
    ['昼', 'noonTargetTime', '12:15'],
    ['夕', 'eveningTargetTime', '18:15'],
    ['夜', 'nightTargetTime', '22:15'],
  ])('edits the %s time through its tile', async (label, key, nextValue) => {
    const view = await render(<SettingsScreen />);
    await fireEvent.press(view.getByLabelText(`${label}の時刻を変更`));
    await fireEvent.press(view.getByLabelText(`${label}の時刻を選択`));
    await waitFor(() => expect(mockSettingsUpdate).toHaveBeenCalledWith({ [key]: nextValue }));
    view.unmount();
  });

  it('explains automatic deletion and exposes its current state accessibly', async () => {
    const view = await render(<SettingsScreen />);
    expect(view.getByText('予定日を過ぎた泡を、アプリ起動時などに削除')).toBeOnTheScreen();
    await fireEvent(view.getByLabelText('自動消滅'), 'valueChange', false);
    await waitFor(() =>
      expect(mockSettingsUpdate).toHaveBeenCalledWith({ autoDeleteEnabled: false }),
    );
    expect(view.getByText('泡を残す')).toBeOnTheScreen();
    view.unmount();
  });

  it('shows the restore link only after the store confirms free access', async () => {
    mockProAccessState = 'free';
    const view = await render(<SettingsScreen />);

    expect(view.getByLabelText('購入済みの方はこちら（購入を復元）')).toBeOnTheScreen();
  });

  it('shows a clear granted notification status and opens the OS notification settings', async () => {
    const view = await render(<SettingsScreen />);

    expect(view.getByText('通知', { exact: true })).toBeOnTheScreen();
    expect(view.getByText('許可済み', { exact: true })).toBeOnTheScreen();
    expect(
      view.queryByText('通知音とバイブレーションは端末設定で変更できます', { exact: true }),
    ).toBeNull();
    expect(view.getByLabelText('通知設定を開く')).toBeOnTheScreen();
  });

  it.each(['unavailable', 'pro'] as const)(
    'hides the restore link when Pro access is %s',
    async (accessState) => {
      mockProAccessState = accessState;
      const view = await render(<SettingsScreen />);

      expect(view.queryByLabelText('購入済みの方はこちら（購入を復元）')).toBeNull();
    },
  );

  it('keeps restoring purchases available from the subtle free-state link', async () => {
    mockProAccessState = 'free';
    const view = await render(<SettingsScreen />);

    await fireEvent.press(view.getByLabelText('購入済みの方はこちら（購入を復元）'));

    await waitFor(() => expect(mockRestoreProPurchase).toHaveBeenCalledTimes(1));
  });

  it('does not show a dedicated analytics deletion request row', async () => {
    const view = await render(<SettingsScreen />);

    expect(view.queryByText('利用状況データの削除を依頼')).toBeNull();
  });

  it('shows the Moonshine attribution in the third-party license document', async () => {
    const view = await render(<SettingsScreen />);

    await fireEvent.press(view.getByText('第三者ライセンス', { exact: true }));

    expect(view.getByText(/Powered by Moonshine AI/)).toBeOnTheScreen();
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
    await act(async () => {
      mockRaiseGestureOptions?.onStop('portrait');
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

  it.each(['timeout', 'interrupted'] as const)(
    'does not complete setup when calibration ends because of %s',
    async (reason) => {
      const view = await render(<SettingsScreen />);

      await fireEvent(view.getByLabelText('左右に傾けて音声入力'), 'valueChange', true);
      await waitFor(() =>
        expect(view.getByLabelText('左右に傾けて音声入力を使ってみる')).toBeOnTheScreen(),
      );
      await fireEvent.press(view.getByLabelText('左右に傾けて音声入力を使ってみる'));
      await waitFor(() => expect(mockRaiseGestureOptions?.enabled).toBe(true));

      await act(async () => {
        mockRaiseGestureOptions?.onStart();
      });
      await act(async () => {
        mockRaiseGestureOptions?.onStop(reason);
      });

      expect(view.getByText('いったん縦に戻して、もう一度傾けてください。')).toBeOnTheScreen();
      expect(mockSettingsUpdate).not.toHaveBeenCalledWith({
        raiseToSpeakEnabled: true,
        raiseToSpeakIntroSeen: true,
      });
      expect(mockRaiseGestureOptions?.blocked).toBe(false);
      view.unmount();
    },
  );

  it('keeps setup incomplete when cancelled after the tilt is detected', async () => {
    const view = await render(<SettingsScreen />);

    await fireEvent(view.getByLabelText('左右に傾けて音声入力'), 'valueChange', true);
    await waitFor(() =>
      expect(view.getByLabelText('左右に傾けて音声入力を使ってみる')).toBeOnTheScreen(),
    );
    await fireEvent.press(view.getByLabelText('左右に傾けて音声入力を使ってみる'));
    await waitFor(() => expect(mockRaiseGestureOptions?.enabled).toBe(true));
    await act(async () => {
      mockRaiseGestureOptions?.onStart();
    });
    await waitFor(() => expect(view.getByText('開始の動きを確認できました')).toBeOnTheScreen());

    await fireEvent.press(view.getByLabelText('左右に傾けて音声入力の設定をキャンセル'));

    await waitFor(() => {
      expect(mockSettingsUpdate).toHaveBeenLastCalledWith({
        raiseToSpeakEnabled: false,
        raiseToSpeakIntroSeen: false,
      });
      expect(view.queryByText('開始の動きを確認できました')).toBeNull();
    });
    view.unmount();
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
    await waitFor(() => expect(view.getByText('開始の動きを確認できました')).toBeOnTheScreen());
    expect(mockHapticsSelectionAsync).toHaveBeenCalledTimes(1);
    expect(mockSettingsUpdate).not.toHaveBeenCalledWith({
      raiseToSpeakEnabled: true,
      raiseToSpeakIntroSeen: true,
    });

    await act(async () => {
      mockRaiseGestureOptions?.onStop('portrait');
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

  it('shows success feedback for one second and then closes the setup', async () => {
    jest.useFakeTimers();
    try {
      const view = await render(<SettingsScreen />);

      await fireEvent(view.getByLabelText('左右に傾けて音声入力'), 'valueChange', true);
      await waitFor(() =>
        expect(view.getByLabelText('左右に傾けて音声入力を使ってみる')).toBeOnTheScreen(),
      );
      await fireEvent.press(view.getByLabelText('左右に傾けて音声入力を使ってみる'));
      await waitFor(() => expect(mockRaiseGestureOptions?.enabled).toBe(true));
      await act(async () => {
        mockRaiseGestureOptions?.onStart();
      });
      await waitFor(() => expect(view.getByText('開始の動きを確認できました')).toBeOnTheScreen());
      expect(mockHapticsNotificationAsync).not.toHaveBeenCalled();
      await act(async () => {
        mockRaiseGestureOptions?.onStop('portrait');
      });

      await waitFor(() => expect(mockRaiseGestureOptions?.blocked).toBe(true));
      await act(async () => {
        mockResolveCalibration?.();
        await mockCalibrationDeferred;
      });

      await waitFor(() => expect(view.getByText('使い方を確認できました')).toBeOnTheScreen());
      expect(view.getByLabelText('音声入力の使い方を確認しました')).toBeOnTheScreen();
      expect(mockHapticsNotificationAsync).toHaveBeenCalledWith('success');

      await act(async () => {
        jest.advanceTimersByTime(999);
      });
      expect(view.getByText('使い方を確認できました')).toBeOnTheScreen();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      await waitFor(() => expect(view.queryByText('使い方を確認できました')).toBeNull());
      view.unmount();
    } finally {
      jest.useRealTimers();
    }
  });
});
