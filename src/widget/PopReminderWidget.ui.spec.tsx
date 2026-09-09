import { render } from '@testing-library/react-native';

import { PopReminderWidget, WIDGET_DELETE_REMINDER_ACTION } from './PopReminderWidget';

jest.mock('react-native-android-widget', () => {
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    FlexWidget: View,
    OverlapWidget: View,
    SvgWidget: View,
    TextWidget: ({ text, ...props }: { text: string }) => <Text {...props}>{text}</Text>,
  };
});

const reminders = [
  {
    id: 'first',
    title: '長い日本語のリマインダーも縮小せずに二行まで表示する予定',
    targetAt: '2099-01-01T09:00:00.000Z',
    isExpired: false,
  },
  {
    id: 'expired',
    title: '期限が過ぎた予定',
    targetAt: '2020-01-01T09:00:00.000Z',
    isExpired: true,
  },
];

test('native widget separates detail and delete targets and preserves readable text', async () => {
  const view = await render(
    <PopReminderWidget reminders={reminders} widgetWidth={360} widgetHeight={320} />,
  );
  expect(view.getByText('表示中 2件 / 全2件')).toBeTruthy();
  for (const reminder of reminders) {
    const title = view.getByText(reminder.title);
    expect(title.props.maxLines).toBe(1);
    expect(title.props.style.fontSize).toBeGreaterThanOrEqual(14);
    expect(title.props.style.adjustsFontSizeToFit).not.toBe(true);
    const deletion = view.getByLabelText(`「${reminder.title}」を削除`);
    expect(deletion.props.clickAction).toBe(WIDGET_DELETE_REMINDER_ACTION);
    expect(deletion.props.clickActionData).toEqual({ id: reminder.id });
    expect(deletion.props.style.width).toBe(48);
    expect(deletion.props.style.height).toBe(48);
    let ancestor = deletion.parent;
    while (ancestor) {
      expect(ancestor.props.clickAction).not.toBe('OPEN_URI');
      ancestor = ancestor.parent;
    }
  }
  expect(view.getByText(/期限済み.*2020/)).toBeTruthy();
  const detail = view.getByLabelText(new RegExp(`${reminders[0].title}.*詳細を開く`));
  expect(detail.props.clickActionData).toEqual({ uri: 'popreminder://?action=view&id=first' });
  const add = view.getByLabelText('リマインダーを追加');
  expect(add.props.style.width).toBe(48);
  expect(add.props.style.height).toBe(48);
  expect(add.props.clickActionData).toEqual({ uri: 'popreminder://?action=add' });
});

test('native empty state provides a single clear add target', async () => {
  const view = await render(<PopReminderWidget reminders={[]} />);
  expect(view.getByText('リマインダーはありません')).toBeTruthy();
  expect(view.getByText('＋ 追加する')).toBeTruthy();
  expect(view.getByLabelText('リマインダーを追加').props.clickActionData).toEqual({
    uri: 'popreminder://?action=add',
  });
});

test('native widget reports fetched counts without implying the database total', async () => {
  const many = Array.from({ length: 20 }, (_, index) => ({
    ...reminders[0],
    id: `reminder-${index}`,
    title: `予定${index}`,
  }));
  const view = await render(<PopReminderWidget reminders={many} />);
  expect(view.getByText('表示中 1件 / 全20件')).toBeTruthy();
  expect(view.queryByText('予定1')).toBeNull();
  await view.rerender(<PopReminderWidget reminders={many} widgetWidth={360} widgetHeight={840} />);
  expect(view.getByText('表示中 8件 / 全20件')).toBeTruthy();
  expect(view.getByText('予定7')).toBeTruthy();
  expect(view.queryByText('予定8')).toBeNull();
});
