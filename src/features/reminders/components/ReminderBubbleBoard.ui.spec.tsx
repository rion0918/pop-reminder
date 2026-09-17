import { fireEvent, render } from '@testing-library/react-native';
import type { ViewStyle } from 'react-native';

import type { Reminder } from '../types/reminder';
import { ReminderBubbleBoard } from './ReminderBubbleBoard';

jest.mock('./ReminderBubble', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const { formatReminderBubbleDateTime } = jest.requireActual<
    typeof import('../utils/reminderDateFormat')
  >('../utils/reminderDateFormat');

  return {
    ReminderBubble: ({
      reminder,
      currentDate,
      width,
      height,
      style,
    }: {
      reminder: Reminder;
      currentDate: Date;
      width: number;
      height: number;
      style: Pick<ViewStyle, 'left' | 'top'>;
    }) =>
      React.createElement(
        Text,
        {
          accessibilityLabel: `bubble-${reminder.id}`,
          style: [style, { width, height }],
        },
        `${reminder.title}|${formatReminderBubbleDateTime(reminder.targetAt, currentDate)}`,
      ),
  };
});

jest.mock('./EmptyReminderBubble', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    EmptyReminderBubble: () => React.createElement(View),
  };
});

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  const targetAt = new Date(2030, 4, 12, 12).toISOString();

  return {
    id: 'reminder-1',
    title: 'こんにちは',
    targetAt,
    previousNotifyAt: new Date(2030, 4, 11, 20).toISOString(),
    targetNotifyAt: targetAt,
    expiresAt: new Date(2030, 4, 12, 23, 59, 59, 999).toISOString(),
    previousNotificationId: null,
    targetNotificationId: null,
    status: 'active',
    createdAt: new Date(2030, 4, 1).toISOString(),
    updatedAt: new Date(2030, 4, 1).toISOString(),
    ...overrides,
  };
}

describe('ReminderBubbleBoard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2030, 4, 12, 10));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows all six short reminders when the measured portrait board has room', async () => {
    const reminders = Array.from({ length: 6 }, (_, index) =>
      makeReminder({ id: `short-${index}`, title: '予定' }),
    );
    const onVisibleReminderIdsChange = jest.fn();
    const view = await render(
      <ReminderBubbleBoard
        reminders={reminders}
        verticalLayoutMode="homeTimeline"
        onVisibleReminderIdsChange={onVisibleReminderIdsChange}
      />,
    );
    await fireEvent(view.getByTestId('reminder-bubble-board'), 'layout', {
      nativeEvent: { layout: { width: 350, height: 534 } },
    });

    expect(view.getAllByLabelText(/^bubble-short-/)).toHaveLength(6);
    expect(view.queryByLabelText(/ほか.*件のリマインダー/)).not.toBeOnTheScreen();
    expect(onVisibleReminderIdsChange).toHaveBeenLastCalledWith(
      reminders.map((reminder) => reminder.id),
    );
  });

  it('recalculates capacity on resize and reserves room for a working overflow button', async () => {
    const reminders = Array.from({ length: 16 }, (_, index) =>
      makeReminder({ id: `resize-${index}`, title: '予定' }),
    );
    const onVisibleReminderIdsChange = jest.fn();
    const onOverflowPress = jest.fn();
    const view = await render(
      <ReminderBubbleBoard
        reminders={reminders}
        verticalLayoutMode="homeTimeline"
        onVisibleReminderIdsChange={onVisibleReminderIdsChange}
        onOverflowPress={onOverflowPress}
      />,
    );
    for (const { width, height, expectedCount } of [
      { width: 288, height: 258, expectedCount: 3 },
      { width: 390, height: 622, expectedCount: 12 },
      { width: 622, height: 390, expectedCount: 12 },
      { width: 288, height: 258, expectedCount: 3 },
    ]) {
      await fireEvent(view.getByTestId('reminder-bubble-board'), 'layout', {
        nativeEvent: { layout: { width, height } },
      });
      expect(view.getAllByLabelText(/^bubble-resize-/)).toHaveLength(expectedCount);
      expect(onVisibleReminderIdsChange).toHaveBeenLastCalledWith(
        reminders.slice(0, expectedCount).map(({ id }) => id),
      );
      await fireEvent.press(
        view.getByLabelText(`ほか${16 - expectedCount}件のリマインダーを一覧で開く`),
      );
    }
    expect(onOverflowPress).toHaveBeenCalledTimes(4);
  });

  it('keeps the visible layout and overflow snapshot while frozen, then reflows after release', async () => {
    const reminders = Array.from({ length: 16 }, (_, index) =>
      makeReminder({ id: `delete-${index}`, title: '予定' }),
    );
    const onVisibleReminderIdsChange = jest.fn();
    const view = await render(
      <ReminderBubbleBoard
        reminders={reminders}
        verticalLayoutMode="homeTimeline"
        onVisibleReminderIdsChange={onVisibleReminderIdsChange}
      />,
    );
    await fireEvent(view.getByTestId('reminder-bubble-board'), 'layout', {
      nativeEvent: { layout: { width: 390, height: 622 } },
    });

    const initialVisibleIds = reminders.slice(0, 12).map(({ id }) => id);
    expect(onVisibleReminderIdsChange).toHaveBeenLastCalledWith(initialVisibleIds);

    const remainingReminders = reminders.slice(1);
    await view.rerender(
      <ReminderBubbleBoard
        reminders={reminders}
        freezeLayout
        verticalLayoutMode="homeTimeline"
        onVisibleReminderIdsChange={onVisibleReminderIdsChange}
      />,
    );

    await view.rerender(
      <ReminderBubbleBoard
        reminders={remainingReminders}
        freezeLayout
        verticalLayoutMode="homeTimeline"
        onVisibleReminderIdsChange={onVisibleReminderIdsChange}
      />,
    );

    expect(view.getByLabelText('bubble-delete-0')).toBeOnTheScreen();
    expect(view.getByLabelText('ほか4件のリマインダーを一覧で開く')).toBeOnTheScreen();
    expect(onVisibleReminderIdsChange).toHaveBeenLastCalledWith(initialVisibleIds);

    await view.rerender(
      <ReminderBubbleBoard
        reminders={remainingReminders}
        freezeLayout={false}
        verticalLayoutMode="homeTimeline"
        onVisibleReminderIdsChange={onVisibleReminderIdsChange}
      />,
    );

    expect(view.queryByLabelText('bubble-delete-0')).not.toBeOnTheScreen();
    expect(view.getByLabelText('ほか3件のリマインダーを一覧で開く')).toBeOnTheScreen();
    expect(onVisibleReminderIdsChange).toHaveBeenLastCalledWith(
      remainingReminders.slice(0, 12).map(({ id }) => id),
    );
  });

  it('commits the first measured layout even when the board starts frozen', async () => {
    const view = await render(<ReminderBubbleBoard reminders={[makeReminder()]} freezeLayout />);
    await fireEvent(view.getByTestId('reminder-bubble-board'), 'layout', {
      nativeEvent: { layout: { width: 390, height: 622 } },
    });

    expect(view.getByLabelText('bubble-reminder-1')).toBeOnTheScreen();
  });

  it('keeps the bubble dimension stable when the title changes within the same length bucket', async () => {
    const reminder = makeReminder({ title: '予定' });
    const view = await render(<ReminderBubbleBoard reminders={[reminder]} />);
    await fireEvent(view.getByTestId('reminder-bubble-board'), 'layout', {
      nativeEvent: { layout: { width: 390, height: 622 } },
    });
    expect(view.getByLabelText('bubble-reminder-1')).toHaveStyle({ height: 96 });
    await view.rerender(<ReminderBubbleBoard reminders={[{ ...reminder, title: '変更' }]} />);
    expect(view.getByLabelText('bubble-reminder-1')).toHaveStyle({ height: 96 });
  });

  it('keeps a list entry point when even one bubble cannot fit', async () => {
    const onOverflowPress = jest.fn();
    const view = await render(
      <ReminderBubbleBoard reminders={[makeReminder()]} onOverflowPress={onOverflowPress} />,
    );
    await fireEvent(view.getByTestId('reminder-bubble-board'), 'layout', {
      nativeEvent: { layout: { width: 100, height: 80 } },
    });
    expect(view.queryByLabelText('bubble-reminder-1')).not.toBeOnTheScreen();
    await fireEvent.press(view.getByLabelText('ほか1件のリマインダーを一覧で開く'));
    expect(onOverflowPress).toHaveBeenCalledTimes(1);
  });

  it('refreshes the displayed schedule and title when the reminder order is unchanged', async () => {
    const originalReminder = makeReminder();
    const view = await render(
      <ReminderBubbleBoard reminders={[originalReminder]} verticalLayoutMode="homeTimeline" />,
    );

    await fireEvent(view.getByTestId('reminder-bubble-board'), 'layout', {
      nativeEvent: { layout: { width: 390, height: 622 } },
    });
    expect(view.getByLabelText('bubble-reminder-1')).toHaveTextContent('こんにちは|今日 12:00');

    const nextWeekTarget = new Date(2030, 4, 19, 12).toISOString();
    const rescheduledReminder = makeReminder({
      targetAt: nextWeekTarget,
      targetNotifyAt: nextWeekTarget,
      previousNotifyAt: new Date(2030, 4, 18, 20).toISOString(),
      updatedAt: new Date(2030, 4, 12, 10, 5).toISOString(),
    });
    await view.rerender(
      <ReminderBubbleBoard reminders={[rescheduledReminder]} verticalLayoutMode="homeTimeline" />,
    );

    expect(view.getByLabelText('bubble-reminder-1')).toHaveTextContent(
      'こんにちは|5/19（日） 12:00',
    );
    expect(view.queryByText('こんにちは|今日 12:00')).not.toBeOnTheScreen();

    await view.rerender(
      <ReminderBubbleBoard
        reminders={[makeReminder({ ...rescheduledReminder, title: 'こんばんは' })]}
        verticalLayoutMode="homeTimeline"
      />,
    );

    expect(view.getByLabelText('bubble-reminder-1')).toHaveTextContent(
      'こんばんは|5/19（日） 12:00',
    );
    expect(view.queryByText('こんにちは|5/19（日） 12:00')).not.toBeOnTheScreen();
  });
});
