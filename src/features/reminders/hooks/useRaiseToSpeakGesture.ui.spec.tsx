import { act, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

const mockMotionListener = jest.fn();
const mockMotionRemove = jest.fn();
const mockMotion = {
  setUpdateInterval: jest.fn(),
  addListener: jest.fn((listener: (measurement: unknown) => void) => {
    mockMotionListener.mockImplementation(listener);
    return { remove: mockMotionRemove };
  }),
};
let mockFocusEffect: (() => () => void) | null = null;
let mockAppStateListener: ((state: AppStateStatus) => void) | null = null;
const mockAppStateRemove = jest.fn();

jest.mock('expo-sensors/build/DeviceMotion', () => ({
  __esModule: true,
  default: mockMotion,
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => () => void) => {
    mockFocusEffect = effect;
  },
}));

// The hook must load after the native-module mocks are registered.
const { useRaiseToSpeakGesture } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./useRaiseToSpeakGesture') as typeof import('./useRaiseToSpeakGesture');

type HarnessProps = {
  enabled: boolean;
  blocked: boolean;
  onStart: () => void;
  onStop: () => void;
};

function Harness({ enabled, blocked, onStart, onStop }: HarnessProps) {
  useRaiseToSpeakGesture({ enabled, blocked, onStart, onStop });
  return null;
}

describe('useRaiseToSpeakGesture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusEffect = null;
    mockAppStateListener = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      mockAppStateListener = listener as (state: AppStateStatus) => void;
      return { remove: mockAppStateRemove } as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('activates only after focus, stops on blocked/background transitions, and removes subscriptions', async () => {
    const onStart = jest.fn();
    const onStop = jest.fn();
    const view = await render(
      <Harness enabled blocked={false} onStart={onStart} onStop={onStop} />,
    );
    await act(async () => {});
    expect(mockMotion.addListener).not.toHaveBeenCalled();
    expect(mockAppStateListener).toEqual(expect.any(Function));

    let focusCleanup: (() => void) | undefined;
    await act(async () => {
      mockAppStateListener?.('active');
      focusCleanup = mockFocusEffect?.();
      view.rerender(<Harness enabled blocked={false} onStart={onStart} onStop={onStop} />);
    });

    expect(mockMotion.addListener).toHaveBeenCalledTimes(1);

    await act(async () => {
      view.rerender(<Harness enabled={false} blocked={false} onStart={onStart} onStop={onStop} />);
    });
    expect(mockMotionRemove).toHaveBeenCalledTimes(1);

    await act(async () => {
      view.rerender(<Harness enabled blocked={false} onStart={onStart} onStop={onStop} />);
    });
    expect(mockMotion.addListener).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(200);
      mockMotionListener({ accelerationIncludingGravity: { x: 9.8, y: 0, z: 0 } });
      mockMotionListener({ accelerationIncludingGravity: { x: 9.8, y: 0, z: 0 } });
    });
    expect(onStart).toHaveBeenCalledTimes(1);

    await act(async () => {
      view.rerender(<Harness enabled blocked onStart={onStart} onStop={onStop} />);
    });
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(mockMotionRemove).toHaveBeenCalledTimes(2);

    await act(async () => {
      view.rerender(<Harness enabled blocked={false} onStart={onStart} onStop={onStop} />);
    });
    expect(mockMotion.addListener).toHaveBeenCalledTimes(3);

    await act(async () => {
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(200);
      mockMotionListener({ accelerationIncludingGravity: { x: 9.8, y: 0, z: 0 } });
      mockMotionListener({ accelerationIncludingGravity: { x: 9.8, y: 0, z: 0 } });
    });
    expect(onStart).toHaveBeenCalledTimes(2);

    await act(async () => {
      mockAppStateListener?.('background');
    });
    expect(onStop).toHaveBeenCalledTimes(2);
    expect(mockMotionRemove).toHaveBeenCalledTimes(3);

    await act(async () => {
      focusCleanup?.();
      view.unmount();
    });
    expect(mockAppStateRemove).toHaveBeenCalledTimes(1);
  });
});
