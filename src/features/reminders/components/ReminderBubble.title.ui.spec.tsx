import { fireEvent, render, within } from '@testing-library/react-native';
import type { ComponentProps, ReactNode } from 'react';

import type { Reminder } from '../domain/reminder';
import { ReminderBubble } from './ReminderBubble';
import { ReminderDetailSheet } from './ReminderDetailSheet';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => true,
}));

jest.mock('./ReminderBubbleBurst', () => ({ ReminderBubbleBurst: () => null }));
jest.mock('./ReminderScheduleEditorModal', () => ({ ReminderScheduleEditorModal: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { ScrollView, TextInput, View } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    BottomSheetBackdrop: View,
    BottomSheetModal: React.forwardRef(function MockBottomSheetModal(
      { children }: { children: ReactNode },
      ref,
    ) {
      React.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
      return React.createElement(View, null, children);
    }),
    BottomSheetScrollView: (props: ComponentProps<typeof ScrollView>) =>
      React.createElement(ScrollView, { ...props, testID: 'reminder-detail-scroll' }),
    BottomSheetTextInput: TextInput,
  };
});

function makeReminder(title: string): Reminder {
  const targetAt = new Date(2030, 4, 12, 12).toISOString();

  return {
    id: 'reminder-1',
    title,
    targetAt,
    previousNotifyAt: new Date(2030, 4, 11, 20).toISOString(),
    targetNotifyAt: targetAt,
    expiresAt: new Date(2030, 4, 12, 23, 59, 59, 999).toISOString(),
    previousNotificationId: null,
    targetNotificationId: null,
    status: 'active',
    createdAt: new Date(2030, 4, 1).toISOString(),
    updatedAt: new Date(2030, 4, 1).toISOString(),
  };
}

test.each(['買い物', '来週までに健康診断の予約をする', 'iPhone の保護フィルムを注文する'])(
  'bubble title %s stays within two lines and opens its full title in the detail sheet',
  async (title) => {
    const reminder = makeReminder(title);
    const onPress = jest.fn();
    const view = await render(
      <ReminderBubble
        reminder={reminder}
        index={0}
        size={148}
        currentDate={new Date(2030, 4, 12, 10)}
        onPress={onPress}
      />,
    );

    const bubbleTitle = view.getByText(title);
    expect(bubbleTitle.props.numberOfLines).toBe(title === '買い物' ? 1 : 2);
    expect(bubbleTitle.props.ellipsizeMode).toBe('tail');
    expect(bubbleTitle.props.adjustsFontSizeToFit).toBe(false);
    await fireEvent.press(view.getByRole('button', { name: `${title}の詳細を開く` }));
    expect(onPress).toHaveBeenCalledWith(reminder);

    await view.rerender(
      <ReminderDetailSheet
        reminder={onPress.mock.calls[0][0]}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateTitle={jest.fn()}
        onUpdateSchedule={jest.fn()}
      />,
    );

    const detailTitle = within(view.getByLabelText('タイトルを編集')).getByText(title);
    expect(detailTitle.props.numberOfLines).toBeUndefined();
    expect(detailTitle.props.ellipsizeMode).toBeUndefined();
    expect(within(view.getByTestId('reminder-detail-scroll')).getByText(title)).toBeOnTheScreen();
    expect(view.getByLabelText('このシャボン玉を削除する')).toBeOnTheScreen();
  },
);
