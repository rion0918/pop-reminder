import { fireEvent, render } from '@testing-library/react-native';

import type { Reminder } from '../types/reminder';
import { ReminderScheduleEditorModal } from './ReminderScheduleEditorModal';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return function MockDateTimePicker(props: Record<string, unknown>) {
    return React.createElement(View, { testID: 'date-time-picker', ...props });
  };
});

const initialReminder: Pick<Reminder, 'targetAt' | 'previousNotifyAt'> = {
  targetAt: new Date(2030, 4, 13, 14).toISOString(),
  previousNotifyAt: new Date(2030, 4, 12, 20).toISOString(),
};

describe('ReminderScheduleEditorModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2030, 4, 12, 10));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('edits date and time, keeps the draft during a visible rerender, and saves it', async () => {
    const onConfirm = jest.fn();
    const view = await render(
      <ReminderScheduleEditorModal
        visible
        reminder={initialReminder}
        isSaving={false}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    const dateButton = view.getByLabelText('日付を変更');
    await fireEvent.press(dateButton);
    expect(dateButton).toBeSelected();
    expect(dateButton).not.toBeDisabled();
    await fireEvent(
      view.getByTestId('date-time-picker'),
      'change',
      { type: 'set' },
      new Date(2030, 4, 19, 12),
    );

    const timeButton = view.getByLabelText('時刻を変更');
    await fireEvent.press(timeButton);
    expect(timeButton).toBeSelected();
    expect(timeButton).not.toBeDisabled();
    await fireEvent(
      view.getByTestId('date-time-picker'),
      'change',
      { type: 'set' },
      new Date(2030, 4, 12, 15, 30),
    );

    expect(view.getByText('5月19日（日）')).toBeOnTheScreen();
    expect(view.getByText('15:30')).toBeOnTheScreen();
    expect(
      view.getByLabelText('前日のお知らせも 5月18日（土） 20:00 に変わります'),
    ).toBeOnTheScreen();

    await view.rerender(
      <ReminderScheduleEditorModal
        visible
        reminder={{ ...initialReminder }}
        isSaving={false}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    expect(view.getByText('5月19日（日）')).toBeOnTheScreen();
    expect(view.getByText('15:30')).toBeOnTheScreen();

    await fireEvent.press(view.getByLabelText('日時変更を完了'));
    expect(onConfirm).toHaveBeenCalledWith({ targetDate: '2030-05-19', targetTime: '15:30' });
  });

  it('disables saving and explains when the selected target is in the past', async () => {
    const onConfirm = jest.fn();
    const view = await render(
      <ReminderScheduleEditorModal
        visible
        reminder={{
          targetAt: new Date(2030, 4, 12, 11).toISOString(),
          previousNotifyAt: new Date(2030, 4, 11, 20).toISOString(),
        }}
        isSaving={false}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    await fireEvent.press(view.getByLabelText('時刻を変更'));
    await fireEvent(
      view.getByTestId('date-time-picker'),
      'change',
      { type: 'set' },
      new Date(2030, 4, 12, 9),
    );

    expect(view.getByText('過去の日時には変更できません')).toBeOnTheScreen();
    expect(
      view.getByLabelText('前日のお知らせ時刻は過ぎているため、当日だけお知らせします'),
    ).toBeOnTheScreen();
    const completeButton = view.getByLabelText('日時変更を完了');
    expect(completeButton).toBeDisabled();
    await fireEvent.press(completeButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables every action while saving', async () => {
    const view = await render(
      <ReminderScheduleEditorModal
        visible
        reminder={initialReminder}
        isSaving
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(view.getByText('保存中…')).toBeOnTheScreen();
    expect(view.getByLabelText('日時変更を完了')).toBeDisabled();
    expect(view.getByLabelText('日付を変更')).toBeDisabled();
    expect(view.getByLabelText('時刻を変更')).toBeDisabled();
    for (const cancelButton of view.getAllByLabelText('日時変更をキャンセル')) {
      expect(cancelButton).toBeDisabled();
    }
  });
});
