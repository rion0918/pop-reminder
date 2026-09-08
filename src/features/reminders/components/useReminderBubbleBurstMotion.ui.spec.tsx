import { act, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { withTiming } from 'react-native-reanimated';

import { useReminderBubbleBurstMotion } from './useReminderBubbleBurstMotion';

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useSharedValue: (value: unknown) => React.useRef({ value }).current,
    useAnimatedReaction: jest.fn(),
    cancelAnimation: jest.fn(),
    runOnJS: (callback: unknown) => callback,
    withDelay: (_delay: number, animation: unknown) => animation,
    withTiming: jest.fn(() => 0),
    Easing: { linear: (x: number) => x },
  };
});

function Harness(props: Parameters<typeof useReminderBubbleBurstMotion>[0]) {
  useReminderBubbleBurstMotion(props);
  return <View />;
}

function completionAt(index: number) {
  return (withTiming as jest.Mock).mock.calls[index][2] as (finished: boolean) => void;
}

beforeEach(() => jest.clearAllMocks());

test('rerender keeps the clock running and delivers completion once to the latest callback', async () => {
  const oldCallback = jest.fn();
  const newCallback = jest.fn();
  const props = {
    reminderId: 'one',
    phase: 'bursting' as const,
    delayMs: 70,
    reduceMotion: false,
    onMotionComplete: oldCallback,
  };
  const view = await render(<Harness {...props} />);
  expect(oldCallback).not.toHaveBeenCalled();
  await view.rerender(<Harness {...props} onMotionComplete={newCallback} />);
  expect(withTiming).toHaveBeenCalledTimes(1);
  await act(() => {
    completionAt(0)(true);
    completionAt(0)(true);
  });
  expect(oldCallback).not.toHaveBeenCalled();
  expect(newCallback).toHaveBeenCalledTimes(1);
  expect(newCallback).toHaveBeenCalledWith('one', 'bursting');
});

test('cancelled, stale and unmounted animations cannot notify completion', async () => {
  const complete = jest.fn();
  const props = { reminderId: 'one', delayMs: 0, reduceMotion: false, onMotionComplete: complete };
  const view = await render(<Harness {...props} phase="bursting" />);
  const burstComplete = completionAt(0);
  await act(() => burstComplete(false));
  expect(complete).not.toHaveBeenCalled();
  await view.rerender(<Harness {...props} phase="restoring" />);
  await act(() => burstComplete(true));
  expect(complete).not.toHaveBeenCalled();
  const restoreComplete = completionAt(1);
  await view.unmount();
  await act(() => restoreComplete(true));
  expect(complete).not.toHaveBeenCalled();
});

test('reduced motion completes once without a timer or image', async () => {
  const complete = jest.fn();
  const view = await render(
    <Harness
      reminderId="one"
      phase="bursting"
      delayMs={700}
      reduceMotion
      onMotionComplete={complete}
    />,
  );
  expect(withTiming).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledTimes(1);
  await view.rerender(
    <Harness
      reminderId="one"
      phase="bursting"
      delayMs={700}
      reduceMotion
      onMotionComplete={complete}
    />,
  );
  expect(complete).toHaveBeenCalledTimes(1);
});
