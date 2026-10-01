import { render } from '@testing-library/react-native';

import { PopReminderWidget } from './PopReminderWidget';

jest.mock('react-native-android-widget', () => {
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    FlexWidget: View,
    OverlapWidget: View,
    ImageWidget: View,
    SvgWidget: View,
    TextWidget: ({ text, ...props }: { text: string }) => <Text {...props}>{text}</Text>,
  };
});

const reminders = [
  {
    id: 'first',
    title: '長い日本語のリマインダーも縮小せずに一行で省略する予定',
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

test('native widget prioritizes the nearest reminder and one full-width quick-add target', async () => {
  const view = await render(
    <PopReminderWidget reminders={reminders} widgetWidth={360} widgetHeight={320} />,
  );
  expect(view.getByText('次のリマインド')).toBeTruthy();
  const title = view.getByText(reminders[0].title);
  expect(title.props.maxLines).toBe(1);
  expect(title.props.style.fontSize).toBe(34);
  expect(title.props.style.adjustsFontSizeToFit).not.toBe(true);
  expect(view.queryByLabelText(/を削除/)).toBeNull();
  expect(view.getByText(/期限済み.*2020/)).toBeTruthy();
  const detail = view.getByLabelText(new RegExp(`${reminders[0].title}.*詳細を開く`));
  expect(detail.props.clickActionData).toEqual({ uri: 'popreminder://?action=view&id=first' });
  const add = view.getByLabelText('リマインダーを追加');
  expect(view.getByText('追加する')).toBeTruthy();
  expect(add.props.style.width).toBe(324);
  expect(add.props.style.height).toBeGreaterThanOrEqual(48);
  expect(add.props.clickActionData).toEqual({ uri: 'popreminder://?action=add' });
});

test('native empty state provides a single clear add target', async () => {
  const view = await render(<PopReminderWidget reminders={[]} />);
  expect(view.getByText('リマインダーはありません')).toBeTruthy();
  expect(view.getByText('追加する')).toBeTruthy();
  expect(view.getByLabelText('リマインダーを追加').props.clickActionData).toEqual({
    uri: 'popreminder://?action=add',
  });
});

test('native widget keeps compact focus and limits expanded reminders without claiming a database total', async () => {
  const many = Array.from({ length: 20 }, (_, index) => ({
    ...reminders[0],
    id: `reminder-${index}`,
    title: `予定${index}`,
  }));
  const view = await render(<PopReminderWidget reminders={many} />);
  expect(view.queryByText(/全20件/)).toBeNull();
  expect(view.queryByText('予定1')).toBeNull();
  await view.rerender(<PopReminderWidget reminders={many} widgetWidth={360} widgetHeight={840} />);
  expect(view.getByText('次のリマインド')).toBeTruthy();
  expect(view.getByText('予定7')).toBeTruthy();
  expect(view.queryByText('予定8')).toBeNull();
});

describe('today timed and all-day reminders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2030, 4, 12, 10));
  });
  afterEach(() => jest.useRealTimers());

  const mixedReminders = [
    {
      id: 'all-day',
      title: '書類を提出',
      targetAt: new Date(2030, 4, 12).toISOString(),
      allDay: true,
      isExpired: false,
    },
    {
      id: 'other-all-day',
      title: '本を返す',
      targetAt: new Date(2030, 4, 12).toISOString(),
      allDay: true,
      isExpired: false,
    },
    {
      id: 'timed',
      title: '歯医者',
      targetAt: new Date(2030, 4, 12, 14).toISOString(),
      isExpired: false,
    },
  ];

  test('compact widget keeps the next time and the all-day summary readable', async () => {
    const view = await render(<PopReminderWidget reminders={mixedReminders} />);
    const title = view.getByText('歯医者');
    expect(title.props.style.fontSize).toBe(20);
    expect(view.getByText('今日 14:00')).toBeTruthy();
    const summary = view.getByText('今日の終日：書類を提出 ほか1件');
    expect(summary.props.maxLines).toBe(1);
    expect(summary.props.truncate).toBe('END');
    expect(summary.props.allowFontScaling).toBe(false);
    expect(view.getByLabelText(/歯医者.*詳細を開く/).props.clickActionData).toEqual({
      uri: 'popreminder://?action=view&id=timed',
    });
    expect(view.getByLabelText('リマインダーを追加')).toBeTruthy();
  });

  test('the last timed reminder expiring returns the hero to today all-day', async () => {
    const view = await render(<PopReminderWidget reminders={mixedReminders} />);
    jest.setSystemTime(new Date(2030, 4, 12, 15));
    await view.rerender(
      <PopReminderWidget
        reminders={mixedReminders.map((reminder) =>
          reminder.id === 'timed' ? { ...reminder, isExpired: true } : reminder,
        )}
      />,
    );
    expect(view.getByText('書類を提出')).toBeTruthy();
    expect(view.getByText('今日 終日')).toBeTruthy();
    expect(view.queryByText(/今日の終日：/)).toBeNull();
  });
});
