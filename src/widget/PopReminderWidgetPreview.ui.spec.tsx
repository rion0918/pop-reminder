import { render } from '@testing-library/react-native';

import { PopReminderWidgetPreview } from './PopReminderWidgetPreview';

const reminders = [
  { id: 'first', title: '最初の予定', targetAt: '2099-01-01T09:00:00.000Z' },
  { id: 'second', title: '次の予定', targetAt: '2099-01-02T09:00:00.000Z' },
  { id: 'hidden', title: '表示範囲外の予定', targetAt: '2099-01-03T09:00:00.000Z' },
];

test('compact widget preview shows the production layout capacity and total count', async () => {
  const view = await render(
    <PopReminderWidgetPreview reminders={reminders} widgetWidth={250} widgetHeight={180} />,
  );

  expect(view.getByText('ふわっと。')).toBeTruthy();
  expect(view.getByText('3件')).toBeTruthy();
  expect(view.getByText('最初の予定')).toBeTruthy();
  expect(view.getByText('次の予定')).toBeTruthy();
  expect(view.queryByText('表示範囲外の予定')).toBeNull();
  expect(view.getByText('＋')).toBeTruthy();
});

test('empty widget preview exposes the native widget empty state', async () => {
  const view = await render(<PopReminderWidgetPreview reminders={[]} />);

  expect(view.getByText('0件')).toBeTruthy();
  expect(view.getByText('まだ泡はひとつも浮いていません')).toBeTruthy();
  expect(view.getByText('忘れたくないこと、右下からふわっとどうぞ')).toBeTruthy();
});
