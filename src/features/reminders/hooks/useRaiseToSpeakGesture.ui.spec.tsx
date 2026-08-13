import { act, render } from '@testing-library/react-native';
import { AppState, Platform, Text, type AppStateStatus } from 'react-native';

const mockAccelerometerListener = jest.fn();
const mockAccelerometerRemove = jest.fn();
const mockAccelerometer = {
  setUpdateInterval: jest.fn(),
  addListener: jest.fn((listener: (measurement: unknown) => void) => {
    mockAccelerometerListener.mockImplementation(listener);
    return { remove: mockAccelerometerRemove };
  }),
};
const mockDeviceMotionListener = jest.fn();
const mockDeviceMotionRemove = jest.fn();
const mockDeviceMotion = {
  setUpdateInterval: jest.fn(),
  addListener: jest.fn((listener: (measurement: unknown) => void) => {
    mockDeviceMotionListener.mockImplementation(listener);
    return { remove: mockDeviceMotionRemove };
  }),
};
let mockFocusEffect: (() => () => void) | null = null;
let mockAppStateListener: ((state: AppStateStatus) => void) | null = null;
const mockAppStateRemove = jest.fn();
let retrySensor: (() => void) | undefined;

jest.mock('expo-sensors/build/Accelerometer', () => ({
  __esModule: true,
  default: mockAccelerometer,
}));
jest.mock('expo-sensors/build/DeviceMotion', () => ({
  __esModule: true,
  default: mockDeviceMotion,
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => () => void) => {
    mockFocusEffect = effect;
  },
}));

// The hook must load after the native-module mocks are registered.
Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
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
  const gesture = useRaiseToSpeakGesture({ enabled, blocked, onStart, onStop }) as unknown as
    { sensorStatus?: string; retrySensor?: () => void } | undefined;
  retrySensor = gesture?.retrySensor;
  return <Text testID="sensor-status">{gesture?.sensorStatus ?? 'legacy'}</Text>;
}

describe('useRaiseToSpeakGesture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusEffect = null;
    mockAppStateListener = null;
    retrySensor = undefined;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
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
    expect(mockAccelerometer.addListener).not.toHaveBeenCalled();
    expect(mockAppStateListener).toEqual(expect.any(Function));

    let focusCleanup: (() => void) | undefined;
    await act(async () => {
      mockAppStateListener?.('active');
      focusCleanup = mockFocusEffect?.();
      view.rerender(<Harness enabled blocked={false} onStart={onStart} onStop={onStop} />);
    });

    expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(1);
    expect(mockDeviceMotion.addListener).not.toHaveBeenCalled();
    expect(view.getByTestId('sensor-status')).toHaveTextContent('waiting');

    await act(async () => {
      view.rerender(<Harness enabled={false} blocked={false} onStart={onStart} onStop={onStop} />);
    });
    expect(mockAccelerometerRemove).toHaveBeenCalledTimes(1);

    await act(async () => {
      view.rerender(<Harness enabled blocked={false} onStart={onStart} onStop={onStop} />);
    });
    expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(200);
      mockAccelerometerListener({ x: 0.98, y: 0, z: 0 });
      mockAccelerometerListener({ x: 0.98, y: 0, z: 0 });
    });
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('sensor-status')).toHaveTextContent('active');

    await act(async () => {
      view.rerender(<Harness enabled blocked onStart={onStart} onStop={onStop} />);
    });
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(mockAccelerometerRemove).toHaveBeenCalledTimes(2);

    await act(async () => {
      view.rerender(<Harness enabled blocked={false} onStart={onStart} onStop={onStop} />);
    });
    expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(3);

    await act(async () => {
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(200);
      mockAccelerometerListener({ x: -0.98, y: 0, z: 0 });
      mockAccelerometerListener({ x: -0.98, y: 0, z: 0 });
    });
    expect(onStart).toHaveBeenCalledTimes(2);

    await act(async () => {
      mockAppStateListener?.('background');
    });
    expect(onStop).toHaveBeenCalledTimes(2);
    expect(mockAccelerometerRemove).toHaveBeenCalledTimes(3);

    await act(async () => {
      focusCleanup?.();
      view.unmount();
    });
    expect(mockAppStateRemove).toHaveBeenCalledTimes(1);
  });

  it('reports a missing sensor stream and retries with a fresh subscription', async () => {
    jest.useFakeTimers();
    const view = await render(
      <Harness enabled blocked={false} onStart={jest.fn()} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockAppStateListener?.('active');
      mockFocusEffect?.();
    });
    expect(view.getByTestId('sensor-status')).toHaveTextContent('waiting');

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });
    expect(view.getByTestId('sensor-status')).toHaveTextContent('unavailable');

    await act(async () => {
      retrySensor?.();
    });
    expect(mockAccelerometerRemove).toHaveBeenCalledTimes(1);
    expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(2);
    expect(view.getByTestId('sensor-status')).toHaveTextContent('waiting');

    await act(async () => {
      view.unmount();
    });
    jest.useRealTimers();
  });

  it('keeps DeviceMotion measurements on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const onStart = jest.fn();
    const view = await render(
      <Harness enabled blocked={false} onStart={onStart} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockAppStateListener?.('active');
      mockFocusEffect?.();
    });
    expect(mockDeviceMotion.addListener).toHaveBeenCalledTimes(1);
    expect(mockAccelerometer.addListener).not.toHaveBeenCalled();

    await act(async () => {
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(200);
      mockDeviceMotionListener({ accelerationIncludingGravity: { x: 9.8, y: 0, z: 0 } });
      mockDeviceMotionListener({ accelerationIncludingGravity: { x: 9.8, y: 0, z: 0 } });
    });
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('sensor-status')).toHaveTextContent('active');

    await act(async () => {
      view.unmount();
    });
    expect(mockDeviceMotionRemove).toHaveBeenCalledTimes(1);
  });

  it('reports a synchronous subscription failure', async () => {
    mockAccelerometer.addListener.mockImplementationOnce(() => {
      throw new Error('sensor unavailable');
    });
    const view = await render(
      <Harness enabled blocked={false} onStart={jest.fn()} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockAppStateListener?.('active');
      mockFocusEffect?.();
    });
    expect(view.getByTestId('sensor-status')).toHaveTextContent('unavailable');

    await act(async () => {
      view.unmount();
    });
  });
});
