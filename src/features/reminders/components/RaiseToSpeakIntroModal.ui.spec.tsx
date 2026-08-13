import { act, fireEvent, render } from '@testing-library/react-native';

import { RaiseToSpeakIntroModal } from './RaiseToSpeakIntroModal';

test('calibration exposes a cancellable action', async () => {
  const onDismiss = jest.fn();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      sensorStatus="active"
      onEnable={jest.fn()}
      onDismiss={onDismiss}
      onRetry={jest.fn()}
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
      sensorStatus="inactive"
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
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
      sensorStatus="inactive"
      onEnable={onEnable}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
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
      sensorStatus="inactive"
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
    />,
  );

  expect(view.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
    '今は音声入力を使わない',
    '左右に傾けて音声入力を使ってみる',
  ]);
});

test('calibration reports missing sensor samples and offers retry', async () => {
  const onRetry = jest.fn();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      sensorStatus="unavailable"
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={onRetry}
    />,
  );

  expect(view.getByText('センサーを確認できませんでした')).toBeTruthy();
  expect(view.getByText(/加速度センサーから値を取得できませんでした/)).toBeTruthy();
  const retryButton = view.getByLabelText('傾きセンサーをもう一度試す');
  await fireEvent.press(retryButton);
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('calibration offers retry when an active sensor does not detect the pose', async () => {
  jest.useFakeTimers();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      sensorStatus="active"
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
    />,
  );

  expect(view.getByText(/画面を見たまま/)).toBeTruthy();
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(view.getByText('傾きを検出できませんでした')).toBeTruthy();
  expect(view.getByLabelText('傾きセンサーをもう一度試す')).toBeTruthy();

  await act(async () => {
    view.unmount();
  });
  jest.useRealTimers();
});
