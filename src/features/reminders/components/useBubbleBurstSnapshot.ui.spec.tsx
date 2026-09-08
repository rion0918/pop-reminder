import { act, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { makeImageFromView } from '@shopify/react-native-skia';

import type { ReminderBubbleBurstProps } from './ReminderBubbleBurst.types';
import { useBubbleBurstSnapshot } from './useBubbleBurstSnapshot';

jest.mock('@shopify/react-native-skia', () => ({ makeImageFromView: jest.fn() }));

const motion = {
  progress: { value: 0 },
  snapshotReady: { value: false },
  membraneMode: { value: -1 },
  activePhase: { value: undefined as 'bursting' | undefined },
} as ReminderBubbleBurstProps['motion'];
const surfaceRef = { current: null };
const image = () => ({ dispose: jest.fn() });
let resolveCapture: (value: ReturnType<typeof image>) => void;
function Harness({
  surfaceKey = 'one',
  prepare = true,
  surfaceReady = true,
}: {
  surfaceKey?: string;
  prepare?: boolean;
  surfaceReady?: boolean;
}) {
  useBubbleBurstSnapshot({ surfaceKey, prepare, surfaceRef, motion, surfaceReady });
  return <View />;
}
beforeEach(() => {
  motion.progress.value = 0;
  motion.snapshotReady.value = false;
  motion.membraneMode.value = -1;
  motion.activePhase.value = undefined;
  (makeImageFromView as jest.Mock).mockReset().mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveCapture = resolve;
      }),
  );
});

test('capture becomes ready, stays cached on rerender, and releases when no longer selected', async () => {
  const view = await render(<Harness />);
  const captured = image();
  await act(() => resolveCapture(captured));
  expect(motion.snapshotReady.value).toBe(true);
  await view.rerender(<Harness />);
  expect(makeImageFromView).toHaveBeenCalledTimes(1);
  await view.rerender(<Harness prepare={false} />);
  expect(motion.snapshotReady.value).toBe(false);
  expect(captured.dispose).toHaveBeenCalledTimes(1);
});

test('late or failed captures cannot switch an ongoing burst to a different rendering mode', async () => {
  const view = await render(<Harness />);
  motion.activePhase.value = 'bursting';
  motion.progress.value = 60 / 380;
  motion.membraneMode.value = 0;
  const late = image();
  await act(() => resolveCapture(late));
  expect(motion.snapshotReady.value).toBe(false);
  expect(late.dispose).toHaveBeenCalledTimes(1);
  await view.unmount();
  (makeImageFromView as jest.Mock).mockRejectedValue(new Error('capture unavailable'));
  await render(<Harness />);
  expect(motion.snapshotReady.value).toBe(false);
});

test('content changes and unmount invalidate pending captures and dispose stale images', async () => {
  const view = await render(<Harness />);
  const oldResolve = resolveCapture;
  await view.rerender(<Harness surfaceKey="updated" />);
  const stale = image();
  await act(() => oldResolve(stale));
  expect(stale.dispose).toHaveBeenCalledTimes(1);
  expect(motion.snapshotReady.value).toBe(false);
  const current = image();
  await act(() => resolveCapture(current));
  expect(motion.snapshotReady.value).toBe(true);
  await view.unmount();
  expect(current.dispose).toHaveBeenCalledTimes(1);
});

test('a cached image is released immediately when its content is invalidated', async () => {
  const view = await render(<Harness />);
  const captured = image();
  await act(() => resolveCapture(captured));
  await view.rerender(<Harness surfaceKey="edited-title" />);
  expect(motion.snapshotReady.value).toBe(false);
  expect(captured.dispose).toHaveBeenCalledTimes(1);
});

test('does not ask native Skia to capture a view before its first layout', async () => {
  const view = await render(<Harness surfaceReady={false} />);
  expect(makeImageFromView).not.toHaveBeenCalled();
  await view.rerender(<Harness surfaceReady />);
  expect(makeImageFromView).toHaveBeenCalledTimes(1);
});
