import { fireEvent, render } from '@testing-library/react-native';

import { RaiseToSpeakIntroModal } from './RaiseToSpeakIntroModal';

test('calibration exposes a cancellable action', async () => {
  const onDismiss = jest.fn();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      onEnable={jest.fn()}
      onDismiss={onDismiss}
    />,
  );

  const cancelButton = view.getByLabelText('左右に傾けて音声入力の設定をキャンセル');
  expect(cancelButton).not.toBeDisabled();
  await fireEvent.press(cancelButton);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('intro exposes the tilt illustration', async () => {
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating={false}
      message={null}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
    />,
  );

  expect(view.getByLabelText('スマートフォンが左右に傾く動き')).toBeTruthy();
});

test('intro exposes the enable action', async () => {
  const onEnable = jest.fn();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating={false}
      message={null}
      onEnable={onEnable}
      onDismiss={jest.fn()}
    />,
  );

  expect(view.getByText('使ってみる')).toBeTruthy();
  const enableButton = view.getByLabelText('左右に傾けて音声入力を使ってみる');
  expect(enableButton).not.toBeDisabled();
  await fireEvent.press(enableButton);
  expect(onEnable).toHaveBeenCalledTimes(1);
});

test('intro places the defer choice before the enable choice', async () => {
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating={false}
      message={null}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
    />,
  );

  expect(view.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
    '今は音声入力を使わない',
    '左右に傾けて音声入力を使ってみる',
  ]);
});
