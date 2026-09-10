import { AppState, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { activeRemindersQueryKey } from '../features/reminders/presentation/reminderQueryMutations';
import { act, render, waitFor } from '@testing-library/react-native';

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
    listVisible: jest.fn(async () => ['first']),
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

function ReminderList() {
  const { data } = useQuery({
    queryKey: activeRemindersQueryKey,
    queryFn: mockServices.reminders.listVisible,
  });
  return <Text>{data?.join(',') || 'empty'}</Text>;
}

test('returning from a widget deletion refreshes the cached reminder list', async () => {
  const subscribe = jest.spyOn(AppState, 'addEventListener');
  const view = await render(
    <AppProviders>
      <ReminderList />
    </AppProviders>,
  );
  await waitFor(() => expect(view.getByText('first')).toBeTruthy());
  mockServices.reminders.listVisible.mockResolvedValue([]);
  await act(async () => {
    for (const [event, listener] of subscribe.mock.calls) {
      if (event === 'change') listener('background');
    }
    for (const [event, listener] of subscribe.mock.calls) {
      if (event === 'change') listener('active');
    }
  });
  await waitFor(() => expect(view.getByText('empty')).toBeTruthy());
  subscribe.mockRestore();
});
