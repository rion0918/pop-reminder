import { act, fireEvent, render, within } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { withSpring } from 'react-native-reanimated';

import { ReminderAllDaySlider } from './ReminderAllDaySlider';
import { ReminderInputSheet } from './ReminderInputSheet';
import { useReminderUiStore } from '../stores/reminderUiStore';

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (value: unknown) => React.useRef({ value }).current,
    useAnimatedStyle: (callback: () => unknown) => callback(),
    cancelAnimation: jest.fn(),
    runOnJS: (callback: unknown) => callback,
    withSpring: jest.fn((value: number) => value),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Gesture: {
      Pan: () => {
        const callbacks: Record<string, unknown> = {};
        const gesture: Record<string, unknown> = { callbacks };
        for (const name of [
          'enabled',
          'minDistance',
          'activeOffsetX',
          'failOffsetY',
          'onStart',
          'onUpdate',
          'onFinalize',
        ]) {
          gesture[name] = (value: unknown) => {
            callbacks[name] = value;
            return gesture;
          };
        }
        return gesture;
      },
    },
    GestureDetector: ({
      gesture,
      children,
    }: {
      gesture: { callbacks: object };
      children: React.ReactNode;
    }) => React.createElement(View, { testID: 'slider-gesture', ...gesture.callbacks }, children),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../../bootstrap/appServicesContext', () => {
  const voiceInput = { subscribe: jest.fn(() => ({ remove: jest.fn() })) };
  return { useAppServices: () => ({ voiceInput }) };
});
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View, TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    BottomSheetModal: React.forwardRef(function MockBottomSheetModal(
      { children }: { children: React.ReactNode },
      ref,
    ) {
      React.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
      return React.createElement(View, null, children);
    }),
    BottomSheetScrollView: View,
    BottomSheetBackdrop: View,
    BottomSheetTextInput: TextInput,
  };
});

const props = {
  allDay: false,
  dateLabel: '2030/5/13（月）',
  time: '20:00',
  allDayNotifyTime: '09:00',
  disabled: false,
  reduceMotion: false,
  onChange: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  useReminderUiStore.getState().resetInput('20:00');
});

async function measure(view: Awaited<ReturnType<typeof render>>) {
  await fireEvent(view.getByTestId('all-day-slider-track'), 'layout', {
    nativeEvent: { layout: { width: 240, height: 48 } },
  });
}

test('quick add claims slider movement before the sheet pan, without rejecting vertical drift', async () => {
  const view = await render(<ReminderInputSheet />);
  await measure(view);
  const gesture = view.getByTestId('slider-gesture');
  // These native recognizer settings govern the race with the parent sheet.
  // Callback-only gesture mocks cannot reproduce native gesture arbitration.
  expect(gesture.props.minDistance).toBe(0);
  expect(gesture.props.activeOffsetX).toBeUndefined();
  expect(gesture.props.failOffsetY).toBeUndefined();
});

test.each([false, true])(
  'early activation ignores taps and vertical movement, but allows diagonal swipes (allDay=%s)',
  async (allDay) => {
    const view = await render(<ReminderAllDaySlider {...props} allDay={allDay} />);
    await measure(view);
    await fireEvent(view.getByTestId('slider-gesture'), 'start');
    await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
    await fireEvent(view.getByTestId('slider-gesture'), 'start');
    await fireEvent(view.getByTestId('slider-gesture'), 'update', {
      translationX: 0,
      translationY: 60,
    });
    await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
    expect(props.onChange).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    await fireEvent(view.getByTestId('slider-gesture'), 'start');
    await fireEvent(view.getByTestId('slider-gesture'), 'update', {
      translationX: allDay ? -184 : 184,
      translationY: 60,
    });
    await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
    expect(props.onChange).toHaveBeenCalledTimes(1);
    expect(props.onChange).toHaveBeenCalledWith(!allDay);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  },
);

test('commits within 4pt of the far edge, once per drag, and supports the reverse drag', async () => {
  const view = await render(<ReminderAllDaySlider {...props} />);
  await measure(view);
  // 240pt track - 44pt thumb - 4pt inset on each end = 188pt travel.
  await fireEvent(view.getByTestId('slider-gesture'), 'start');
  await fireEvent(view.getByTestId('slider-gesture'), 'update', {
    translationX: 183,
    velocityX: 5000,
  });
  expect(props.onChange).not.toHaveBeenCalled();
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: 184 });
  expect(props.onChange).toHaveBeenCalledWith(true);
  await view.rerender(<ReminderAllDaySlider {...props} allDay />);
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: 0 });
  await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
  expect(props.onChange).toHaveBeenCalledTimes(1);
  expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  await fireEvent(view.getByTestId('slider-gesture'), 'start');
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: -184 });
  expect(props.onChange).toHaveBeenLastCalledWith(false);
  expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
});

test('an incomplete or cancelled drag returns to its starting state without haptics', async () => {
  const view = await render(<ReminderAllDaySlider {...props} />);
  await measure(view);
  for (const translationX of [90, 183]) {
    await fireEvent(view.getByTestId('slider-gesture'), 'start');
    await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX });
    await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
    expect(withSpring).toHaveBeenLastCalledWith(0, expect.any(Object));
  }
  expect(props.onChange).not.toHaveBeenCalled();
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

test('accessible activation toggles the switch, but disabled controls cannot change it', async () => {
  const view = await render(<ReminderAllDaySlider {...props} />);
  expect(view.getByRole('switch')).not.toBeChecked();
  await fireEvent(view.getByRole('switch'), 'accessibilityAction', {
    nativeEvent: { actionName: 'activate' },
  });
  expect(props.onChange).toHaveBeenCalledWith(true);
  await view.rerender(<ReminderAllDaySlider {...props} allDay disabled />);
  expect(view.getByRole('switch')).toBeChecked();
  expect(view.getByRole('switch')).toBeDisabled();
  await fireEvent(view.getByRole('switch'), 'accessibilityTap');
  expect(props.onChange).toHaveBeenCalledTimes(1);
});

test('external state changes synchronize without haptics and reduced motion skips springs', async () => {
  const view = await render(<ReminderAllDaySlider {...props} reduceMotion />);
  await measure(view);
  await view.rerender(<ReminderAllDaySlider {...props} allDay reduceMotion />);
  expect(view.getByRole('switch')).toBeChecked();
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
  await fireEvent(view.getByTestId('slider-gesture'), 'start');
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: -80 });
  await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
  expect(withSpring).not.toHaveBeenCalled();
});

test('haptic failure does not prevent the change', async () => {
  jest.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error('unavailable'));
  const view = await render(<ReminderAllDaySlider {...props} />);
  await fireEvent(view.getByRole('switch'), 'accessibilityTap');
  expect(props.onChange).toHaveBeenCalledWith(true);
});

test('quick add replaces the old switch row and hides/restores time choices without changing the time', async () => {
  const view = await render(<ReminderInputSheet />);
  expect(view.queryByText('時刻を指定してお知らせ')).toBeNull();
  expect(view.getByText('朝')).toBeOnTheScreen();
  await fireEvent(view.getByRole('switch'), 'accessibilityTap');
  expect(view.queryByText('朝')).toBeNull();
  expect(useReminderUiStore.getState().allDay).toBe(true);
  await fireEvent(view.getByRole('switch'), 'accessibilityTap');
  expect(view.getByText('朝')).toBeOnTheScreen();
  expect(useReminderUiStore.getState().timeDigits).toBe('2000');
  await view.rerender(<ReminderInputSheet isSaving />);
  expect(view.getByRole('switch')).toBeDisabled();
  await act(() => useReminderUiStore.getState().resetInput());
});

test('quick add keeps the active slider mounted when the time row disappears', async () => {
  const view = await render(<ReminderInputSheet />);
  await measure(view);
  await fireEvent(view.getByTestId('slider-gesture'), 'start');
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: 184 });
  expect(view.queryByText('朝')).toBeNull();
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: 0 });
  await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
  expect(view.getByRole('switch')).toBeChecked();
  expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  await fireEvent(view.getByTestId('slider-gesture'), 'start');
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: -184 });
  expect(view.getByText('朝')).toBeOnTheScreen();
  expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
});

test('disabling the slider during a drag cancels the pending change', async () => {
  const view = await render(<ReminderAllDaySlider {...props} />);
  await measure(view);
  await fireEvent(view.getByTestId('slider-gesture'), 'start');
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: 90 });
  await view.rerender(<ReminderAllDaySlider {...props} disabled />);
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: 188 });
  await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
  expect(props.onChange).not.toHaveBeenCalled();
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

test('the preview sits in the thumb path and becomes an all-day preview at the other end', async () => {
  const view = await render(<ReminderAllDaySlider {...props} />);
  const track = within(view.getByTestId('all-day-slider-track'));
  expect(track.getByText(props.dateLabel)).toBeOnTheScreen();
  expect(track.getByText('20:00')).toBeOnTheScreen();
  expect(track.getByText('終日')).toBeOnTheScreen();
  expect(track.getByText('→')).toBeOnTheScreen();
  expect(view.queryByText('右へスライドで終日')).toBeNull();
  await measure(view);
  await fireEvent(view.getByTestId('slider-gesture'), 'start');
  await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: 184 });
  expect(props.onChange).toHaveBeenCalledWith(true);
  await view.rerender(<ReminderAllDaySlider {...props} allDay />);
  expect(track.getByText('終日 · 09:00にお知らせ')).toBeOnTheScreen();
  expect(track.getByText('時刻')).toBeOnTheScreen();
  expect(track.getByText('←')).toBeOnTheScreen();
  expect(track.queryByText('20:00')).toBeNull();
  expect(view.queryByText('左へスライドで時刻指定')).toBeNull();
});

test('only the water surface stretches during a drag and settles after cancellation or commit', async () => {
  const view = await render(<ReminderAllDaySlider {...props} />);
  await measure(view);
  for (const translationX of [90, 184]) {
    await fireEvent(view.getByTestId('slider-gesture'), 'start');
    await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: 40 });
    // Refresh animated styles: this mock does not run UI-thread subscriptions.
    await view.rerender(<ReminderAllDaySlider {...props} />);
    expect(view.getByTestId('all-day-slider-surface')).toHaveStyle({
      transform: [{ scaleX: 1.04 }, { scaleY: 0.97 }],
    });
    expect(within(view.getByTestId('all-day-slider-surface')).queryByText('終日')).toBeNull();
    expect(view.getByTestId('all-day-slider-thumb')).toHaveStyle({
      transform: [{ translateX: 40 }],
    });
    await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX });
    if (translationX === 90) {
      await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
    }
    await view.rerender(<ReminderAllDaySlider {...props} />);
    expect(view.getByTestId('all-day-slider-surface')).toHaveStyle({
      transform: [{ scaleX: 1 }, { scaleY: 1 }],
    });
  }
  expect(props.onChange).toHaveBeenCalledTimes(1);
  expect(props.onChange).toHaveBeenCalledWith(true);
});

test.each([{ disabled: true }, { allDay: true }, { reduceMotion: true }])(
  'a prop change clears the active water stretch: %j',
  async (changedProps) => {
    const view = await render(<ReminderAllDaySlider {...props} />);
    await measure(view);
    await fireEvent(view.getByTestId('slider-gesture'), 'start');
    await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX: 90 });
    await view.rerender(<ReminderAllDaySlider {...props} />);
    expect(view.getByTestId('all-day-slider-surface')).toHaveStyle({
      transform: [{ scaleX: 1.04 }, { scaleY: 0.97 }],
    });
    await view.rerender(<ReminderAllDaySlider {...props} {...changedProps} />);
    await view.rerender(<ReminderAllDaySlider {...props} {...changedProps} />);
    expect(view.getByTestId('all-day-slider-surface')).toHaveStyle({
      transform: [{ scaleX: 1 }, { scaleY: 1 }],
    });
    expect(props.onChange).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  },
);

test('reduced motion keeps the water round during dragging, cancellation and commit', async () => {
  const view = await render(<ReminderAllDaySlider {...props} reduceMotion />);
  await measure(view);
  for (const translationX of [90, 184]) {
    await fireEvent(view.getByTestId('slider-gesture'), 'start');
    await fireEvent(view.getByTestId('slider-gesture'), 'update', { translationX });
    await view.rerender(<ReminderAllDaySlider {...props} reduceMotion />);
    expect(view.getByTestId('all-day-slider-surface')).toHaveStyle({
      transform: [{ scaleX: 1 }, { scaleY: 1 }],
    });
    await fireEvent(view.getByTestId('slider-gesture'), 'finalize');
  }
  expect(withSpring).not.toHaveBeenCalled();
  expect(props.onChange).toHaveBeenCalledTimes(1);
  expect(props.onChange).toHaveBeenCalledWith(true);
});
