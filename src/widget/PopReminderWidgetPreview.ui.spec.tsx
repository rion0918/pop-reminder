import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import { PopReminderWidgetPreview } from './PopReminderWidgetPreview';

const reminders = [
  { id: 'first', title: '最初の予定', targetAt: '2099-01-01T09:00:00.000Z' },
  { id: 'second', title: '次の予定', targetAt: '2099-01-02T09:00:00.000Z' },
  { id: 'hidden', title: '表示範囲外の予定', targetAt: '2099-01-03T09:00:00.000Z' },
];

test('compact widget preview promotes the first reminder and keeps production capacity', async () => {
  const view = await render(
    <PopReminderWidgetPreview reminders={reminders} widgetWidth={250} widgetHeight={180} />,
  );

  expect(view.getByText('ふわっと。')).toBeTruthy();
  expect(view.getByText('表示中 1件 / 全3件')).toBeTruthy();
  expect(view.getByText('最初の予定')).toBeTruthy();
  expect(view.queryByText('次の予定')).toBeNull();
  expect(view.queryByText('表示範囲外の予定')).toBeNull();
  expect(view.getByText('＋')).toBeTruthy();
});

test('empty widget preview exposes the native widget empty state', async () => {
  const view = await render(<PopReminderWidgetPreview reminders={[]} />);

  expect(view.getByText('表示中 0件 / 全0件')).toBeTruthy();
  expect(view.getByText('リマインダーはありません')).toBeTruthy();
  expect(view.getByText('＋ 追加する')).toBeTruthy();
});

test('preview accepts every persisted widget theme', async () => {
  const themes = ['sky', 'lavender', 'mint'] as const;
  const view = await render(
    <View>
      {themes.map((theme) => (
        <PopReminderWidgetPreview key={theme} reminders={reminders.slice(0, 1)} theme={theme} />
      ))}
    </View>,
  );

  for (const theme of themes) {
    expect(view.getByTestId(`widget-surface-${theme}`)).toBeTruthy();
  }
});

test('preview keeps long titles at two lines and labels expired reminders', async () => {
  const reminder = {
    ...reminders[0],
    title: '日本語の長いリマインダーも小さくせず二行で表示する予定',
    isExpired: true,
  };
  const view = await render(<PopReminderWidgetPreview reminders={[reminder]} />);
  const title = view.getByText(reminder.title);
  expect(title.props.numberOfLines).toBe(1);
  expect(title.props.adjustsFontSizeToFit).not.toBe(true);
  expect(title.props.style.fontSize).toBeGreaterThanOrEqual(14);
  expect(view.getByText(/期限済み/)).toBeTruthy();
});
