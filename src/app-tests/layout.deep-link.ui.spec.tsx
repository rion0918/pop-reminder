import { act, render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
let mockNavigation: { key: string } | undefined;
let mockReceiveUrl: (event: { url: string }) => void;
let mockInitialUrl: Promise<string | null>;
const mockPrepare = jest.fn(async () => {});
jest.mock('../../global.css', () => ({}));
jest.mock('expo-router', () => {
  const Stack = ({ children }: { children: unknown }) => children;
  Stack.Screen = function Screen() {
    return null;
  };
  return { Stack, useRouter: () => mockRouter, useRootNavigationState: () => mockNavigation };
});
jest.mock('expo-linking', () => ({
  addEventListener: (_event: string, callback: typeof mockReceiveUrl) => {
    mockReceiveUrl = callback;
    return { remove: jest.fn() };
  },
  getInitialURL: () => mockInitialUrl,
}));
jest.mock('../bootstrap/appInitialization', () => ({
  configureAppRuntime: async () => {},
  prepareAppData: () => mockPrepare(),
}));
jest.mock('../bootstrap/AppProviders', () => ({
  AppProviders: ({ children }: { children: unknown }) => children,
}));
jest.mock('../features/reminders/components/EmptyReminderBubble', () => ({
  EmptyReminderBubble: () => null,
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: unknown }) => children,
}));
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModalProvider: ({ children }: { children: unknown }) => children,
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RootLayout = require('../app/_layout').default;

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigation = undefined;
  mockInitialUrl = Promise.resolve(null);
});

test('initial tap waits for both bootstrap and mounted navigator; later identical taps are delivered', async () => {
  let ready!: () => void;
  mockPrepare.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        ready = resolve;
      }),
  );
  mockInitialUrl = Promise.resolve('popreminder://?action=view&id=first');
  const view = await render(<RootLayout />);
  await act(async () => ready());
  expect(mockReplace).not.toHaveBeenCalled();
  mockNavigation = { key: 'root' };
  await view.rerender(<RootLayout />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
  expect(mockReplace).toHaveBeenLastCalledWith({
    pathname: '/',
    params: { action: 'view', id: 'first', intent: '1' },
  });
  await act(async () => mockReceiveUrl({ url: 'popreminder://?action=view&id=first' }));
  expect(mockReplace).toHaveBeenLastCalledWith({
    pathname: '/',
    params: { action: 'view', id: 'first', intent: '2' },
  });
});

test('a late initial URL does not overwrite a newer widget tap', async () => {
  let initial!: (url: string) => void;
  mockInitialUrl = new Promise((resolve) => {
    initial = resolve;
  });
  mockNavigation = { key: 'root' };
  await render(<RootLayout />);
  await act(async () => mockReceiveUrl({ url: 'popreminder://?action=view&id=new' }));
  await act(async () => initial('popreminder://?action=view&id=old'));
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenLastCalledWith({
    pathname: '/',
    params: { action: 'view', id: 'new', intent: '1' },
  });
});
