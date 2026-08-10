import { fireEvent, render } from '@testing-library/react-native';

import { NotificationPermissionIntroModal } from './NotificationPermissionIntroModal';

test('notification permission intro explains the purpose and offers a defer action', async () => {
  const onAllow = jest.fn();
  const onDismiss = jest.fn();
  const view = await render(
    <NotificationPermissionIntroModal
      visible
      busy={false}
      canAskAgain
      onAllow={onAllow}
      onDismiss={onDismiss}
    />,
  );

  expect(view.getByText('通知でお知らせします')).toBeTruthy();
  expect(view.getByText('設定した時刻にリマインダーをお知らせします')).toBeTruthy();
  expect(view.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
    '今は通知を許可しない',
    '通知を許可',
  ]);

  await fireEvent.press(view.getByLabelText('通知を許可'));
  expect(onAllow).toHaveBeenCalledTimes(1);
  await fireEvent.press(view.getByLabelText('今は通知を許可しない'));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
