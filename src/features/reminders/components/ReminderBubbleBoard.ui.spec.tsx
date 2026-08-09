import { fireEvent, render } from '@testing-library/react-native';

import type { Reminder } from '../types/reminder';
import { ReminderBubbleBoard } from './ReminderBubbleBoard';

jest.mock('./ReminderBubble', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const { formatReminderBubbleDateTime } = jest.requireActual<
    typeof import('../utils/reminderDateFormat')
  >('../utils/reminderDateFormat');

  return {
    ReminderBubble: ({ reminder, currentDate }: { reminder: Reminder; currentDate: Date }) =>
      React.createElement(
        Text,
        { accessibilityLabel: `bubble-${reminder.id}` },
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
