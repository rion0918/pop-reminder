import { act, render } from '@testing-library/react-native';
import { AppState, Platform, Text, type AppStateStatus } from 'react-native';

const mockAccelerometerListener = jest.fn();
const mockAccelerometerRemove = jest.fn();
const mockAccelerometer = {
  isAvailableAsync: jest.fn(async () => true),
  setUpdateInterval: jest.fn(),
  addListener: jest.fn((listener: (measurement: unknown) => void) => {
    mockAccelerometerListener.mockImplementation(listener);
    return { remove: mockAccelerometerRemove };
  }),
};
const mockDeviceMotionListener = jest.fn();
const mockDeviceMotionRemove = jest.fn();
const mockDeviceMotion = {
  isAvailableAsync: jest.fn(async () => true),
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
const appStateDescriptor = Object.getOwnPropertyDescriptor(AppState, 'currentState');

jest.mock('expo-sensors', () => ({
  Accelerometer: mockAccelerometer,
  DeviceMotion: mockDeviceMotion,
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
  trackTiltProgress?: boolean;
  onStart: () => void;
  onStop: () => void;
};

function Harness({ enabled, blocked, trackTiltProgress, onStart, onStop }: HarnessProps) {
  const gesture = useRaiseToSpeakGesture({
    enabled,
    blocked,
    trackTiltProgress,
    onStart,
    onStop,
  }) as unknown as
    | {
        sensorStatus?: string;
        sensorFailureReason?: string | null;
        retrySensor?: () => void;
        tiltProgress?: number | null;
      }
    | undefined;
  retrySensor = gesture?.retrySensor;
  return (
    <>
      <Text testID="sensor-status">{gesture?.sensorStatus ?? 'legacy'}</Text>
      <Text testID="sensor-failure">{gesture?.sensorFailureReason ?? 'none'}</Text>
      <Text testID="tilt-progress">{gesture?.tiltProgress ?? 'none'}</Text>
    </>
  );
}

async function flushSensorStart() {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useRaiseToSpeakGesture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusEffect = null;
    mockAppStateListener = null;
    retrySensor = undefined;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'unknown',
    });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      mockAppStateListener = listener as (state: AppStateStatus) => void;
      return { remove: mockAppStateRemove } as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (appStateDescriptor) Object.defineProperty(AppState, 'currentState', appStateDescriptor);
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
    expect(view.getByTestId('sensor-status')).toHaveTextContent('waiting');

    let focusCleanup: (() => void) | undefined;
    await act(async () => {
      focusCleanup = mockFocusEffect?.();
      mockAppStateListener?.('active');
      view.rerender(<Harness enabled blocked={false} onStart={onStart} onStop={onStop} />);
      await Promise.resolve();
    });
    await flushSensorStart();

    expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(1);
    expect(mockDeviceMotion.addListener).not.toHaveBeenCalled();
    expect(view.getByTestId('sensor-status')).toHaveTextContent('starting');

    await act(async () => {
      view.rerender(<Harness enabled={false} blocked={false} onStart={onStart} onStop={onStop} />);
    });
    expect(mockAccelerometerRemove).toHaveBeenCalledTimes(1);

    await act(async () => {
      view.rerender(<Harness enabled blocked={false} onStart={onStart} onStop={onStop} />);
    });
    await flushSensorStart();
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
    await flushSensorStart();
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

  it('starts the sample timeout only after subscribing and retries with a fresh subscription', async () => {
    jest.useFakeTimers();
    const view = await render(
      <Harness enabled blocked={false} onStart={jest.fn()} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockFocusEffect?.();
      mockAppStateListener?.('background');
      await Promise.resolve();
    });
    expect(view.getByTestId('sensor-status')).toHaveTextContent('waiting');
    expect(mockAccelerometer.addListener).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });
    expect(view.getByTestId('sensor-status')).toHaveTextContent('waiting');
    expect(view.getByTestId('sensor-failure')).toHaveTextContent('none');

    await act(async () => {
      mockAppStateListener?.('active');
      await Promise.resolve();
    });
    await flushSensorStart();
    expect(view.getByTestId('sensor-status')).toHaveTextContent('starting');

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });
    expect(view.getByTestId('sensor-status')).toHaveTextContent('unavailable');
    expect(view.getByTestId('sensor-failure')).toHaveTextContent('no-valid-sample');

    await act(async () => {
      retrySensor?.();
      await Promise.resolve();
    });
    await flushSensorStart();
    expect(mockAccelerometerRemove).toHaveBeenCalledTimes(1);
    expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(2);
    expect(view.getByTestId('sensor-status')).toHaveTextContent('starting');
    expect(view.getByTestId('sensor-failure')).toHaveTextContent('none');

    await act(async () => {
      view.unmount();
    });
    jest.useRealTimers();
  });

  it('starts calibration even when the navigation focus callback arrives late', async () => {
    const view = await render(
      <Harness enabled blocked={false} trackTiltProgress onStart={jest.fn()} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockAppStateListener?.('active');
    });
    await flushSensorStart();

    expect(mockAccelerometer.addListener).toHaveBeenCalled();
    expect(view.getByTestId('sensor-status')).toHaveTextContent('starting');

    await act(async () => {
      view.unmount();
    });
  });

  it('treats an unresolved AppState as foreground during calibration', async () => {
    const view = await render(
      <Harness enabled blocked={false} trackTiltProgress onStart={jest.fn()} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockFocusEffect?.();
    });
    await flushSensorStart();

    expect(mockAccelerometer.addListener).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('sensor-status')).toHaveTextContent('starting');

    await act(async () => {
      view.unmount();
    });
  });

  it('does not activate or clear the timeout for invalid sensor values', async () => {
    jest.useFakeTimers();
    const view = await render(
      <Harness enabled blocked={false} trackTiltProgress onStart={jest.fn()} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockFocusEffect?.();
      mockAppStateListener?.('active');
      await Promise.resolve();
    });
    await flushSensorStart();
    expect(view.getByTestId('sensor-status')).toHaveTextContent('starting');

    await act(async () => {
      mockAccelerometerListener({ x: Number.NaN, y: 0, z: 0 });
      mockAccelerometerListener({ x: 0, y: 0, z: 0 });
      mockAccelerometerListener({ x: 1_000, y: 0, z: 0 });
    });
    expect(view.getByTestId('sensor-status')).toHaveTextContent('starting');
    expect(view.getByTestId('tilt-progress')).toHaveTextContent('none');

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });
    expect(view.getByTestId('sensor-status')).toHaveTextContent('unavailable');
    expect(view.getByTestId('sensor-failure')).toHaveTextContent('no-valid-sample');

    await act(async () => {
      view.unmount();
    });
    jest.useRealTimers();
  });

  it('breaks a pending side-tilt hold when an invalid value interrupts it', async () => {
    const onStart = jest.fn();
    const view = await render(
      <Harness enabled blocked={false} onStart={onStart} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockFocusEffect?.();
      mockAppStateListener?.('active');
    });
    await flushSensorStart();

    const now = jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(200);
    await act(async () => {
      mockAccelerometerListener({ x: 0.98, y: 0, z: 0 });
      mockAccelerometerListener({ x: Number.NaN, y: 0, z: 0 });
      mockAccelerometerListener({ x: 0.98, y: 0, z: 0 });
    });
    expect(onStart).not.toHaveBeenCalled();

    await act(async () => {
      now.mockReturnValueOnce(400);
      mockAccelerometerListener({ x: 0.98, y: 0, z: 0 });
    });
    expect(onStart).toHaveBeenCalledTimes(1);

    await act(async () => {
      view.unmount();
    });
  });

  it('reports tilt progress only when calibration feedback is requested', async () => {
    const view = await render(
      <Harness enabled blocked={false} onStart={jest.fn()} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockFocusEffect?.();
      mockAppStateListener?.('active');
      await Promise.resolve();
    });
    await flushSensorStart();
    await act(async () => {
      mockAccelerometerListener({ x: 0.5, y: 0.866, z: 0 });
    });
    expect(view.getByTestId('tilt-progress')).toHaveTextContent('none');

    await act(async () => {
      view.rerender(
        <Harness
          enabled
          blocked={false}
          trackTiltProgress
          onStart={jest.fn()}
          onStop={jest.fn()}
        />,
      );
    });
    await flushSensorStart();
    await act(async () => {
      mockAccelerometerListener({ x: 0.5, y: 0.866, z: 0 });
    });
    expect(Number(view.getByTestId('tilt-progress').props.children)).toBeCloseTo(0.75, 1);

    await act(async () => {
      view.unmount();
    });
  });

  it('starts from a practical side tilt while the phone is slightly pitched', async () => {
    const onStart = jest.fn();
    const view = await render(
      <Harness enabled blocked={false} onStart={onStart} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockFocusEffect?.();
      mockAppStateListener?.('active');
      await Promise.resolve();
    });
    await flushSensorStart();
    await act(async () => {
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(200);
      mockAccelerometerListener({ x: 0.58, y: 0.65, z: 0.5 });
      mockAccelerometerListener({ x: 0.58, y: 0.65, z: 0.5 });
    });

    expect(onStart).toHaveBeenCalledTimes(1);
    await act(async () => {
      view.unmount();
    });
  });

  it('keeps DeviceMotion measurements on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const onStart = jest.fn();
    const view = await render(
      <Harness enabled blocked={false} onStart={onStart} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockFocusEffect?.();
      mockAppStateListener?.('active');
      await Promise.resolve();
    });
    await flushSensorStart();
    expect(mockDeviceMotion.addListener).toHaveBeenCalledTimes(1);
    expect(mockAccelerometer.addListener).not.toHaveBeenCalled();

    await act(async () => {
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(200);
      mockDeviceMotionListener({
        accelerationIncludingGravity: { x: 4.6, y: 5.4, z: 4.9 },
      });
      mockDeviceMotionListener({
        accelerationIncludingGravity: { x: 4.6, y: 5.4, z: 4.9 },
      });
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
      mockFocusEffect?.();
      mockAppStateListener?.('active');
      await Promise.resolve();
    });
    await flushSensorStart();
    expect(view.getByTestId('sensor-status')).toHaveTextContent('unavailable');
    expect(view.getByTestId('sensor-failure')).toHaveTextContent('subscription-error');

    await act(async () => {
      view.unmount();
    });
  });

  it('reports when the platform sensor is unavailable without subscribing', async () => {
    mockAccelerometer.isAvailableAsync.mockResolvedValueOnce(false);
    const view = await render(
      <Harness enabled blocked={false} onStart={jest.fn()} onStop={jest.fn()} />,
    );

    await act(async () => {
      mockFocusEffect?.();
      mockAppStateListener?.('active');
      await Promise.resolve();
    });
    await flushSensorStart();

    expect(mockAccelerometer.addListener).not.toHaveBeenCalled();
    expect(view.getByTestId('sensor-status')).toHaveTextContent('unavailable');
    expect(view.getByTestId('sensor-failure')).toHaveTextContent('sensor-unavailable');

    await act(async () => {
      view.unmount();
    });
  });
});
