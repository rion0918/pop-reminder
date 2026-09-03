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
      sensorFailureReason={null}
      tiltProgress={0}
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
      sensorFailureReason={null}
      tiltProgress={0}
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
      sensorFailureReason={null}
      tiltProgress={0}
      onEnable={onEnable}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
    />,
  );

  expect(view.getByText('動きを試す')).toBeTruthy();
  const enableButton = view.getByLabelText('左右に傾けて音声入力を使ってみる');
  expect(enableButton).not.toBeDisabled();
  await fireEvent.press(enableButton);
  expect(onEnable).toHaveBeenCalledTimes(1);
});

test('intro labels the setup action as trying the motion', async () => {
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      phase="intro"
      message={null}
      sensorStatus="inactive"
      sensorFailureReason={null}
      tiltProgress={null}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
      onSuccessComplete={jest.fn()}
    />,
  );

  expect(view.getByText('傾けて話す')).toBeTruthy();
  expect(view.getByText('動きを試す')).toBeTruthy();
});

test('intro guides the user to return upright after tilt is detected', async () => {
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      phase="awaiting-upright"
      message={null}
      sensorStatus="active"
      sensorFailureReason={null}
      tiltProgress={1}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
      onSuccessComplete={jest.fn()}
    />,
  );

  expect(view.getByText('開始の動きを確認できました')).toBeTruthy();
  expect(
    view.getByText('次はスマホを縦に戻してください。音声入力も同じ操作で終了します。'),
  ).toBeTruthy();
});

test('intro shows a non-dismissible preparation state while permissions are checked', async () => {
  const onDismiss = jest.fn();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy
      phase="preparing"
      message={null}
      sensorStatus="waiting"
      sensorFailureReason={null}
      tiltProgress={null}
      onEnable={jest.fn()}
      onDismiss={onDismiss}
      onRetry={jest.fn()}
    />,
  );

  expect(view.getByText('準備しています…')).toBeTruthy();
  expect(view.getByText('マイクとセンサーを確認しています。')).toBeTruthy();
  expect(view.getByLabelText('左右に傾けて音声入力の設定をキャンセル')).toBeDisabled();
  await fireEvent.press(view.getByLabelText('左右に傾けて音声入力の設定をキャンセル'));
  expect(onDismiss).not.toHaveBeenCalled();
});

test('success keeps the modal visible until the completion callback is invoked', async () => {
  jest.useFakeTimers();
  const onSuccessComplete = jest.fn();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      phase="success"
      message={null}
      sensorStatus="waiting"
      sensorFailureReason={null}
      tiltProgress={null}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
      onSuccessComplete={onSuccessComplete}
    />,
  );

  expect(view.getByText('使い方を確認できました')).toBeTruthy();
  expect(onSuccessComplete).not.toHaveBeenCalled();

  await act(async () => {
    jest.advanceTimersByTime(999);
  });
  expect(onSuccessComplete).not.toHaveBeenCalled();

  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(onSuccessComplete).toHaveBeenCalledTimes(1);

  await act(async () => {
    view.unmount();
  });
  jest.useRealTimers();
});

test('intro places the defer choice before the enable choice', async () => {
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating={false}
      message={null}
      sensorStatus="inactive"
      sensorFailureReason={null}
      tiltProgress={0}
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
      sensorFailureReason="no-valid-sample"
      tiltProgress={0}
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

test.each([
  ['sensor-unavailable', '加速度センサーを利用できません'],
  ['subscription-error', 'センサーを開始できませんでした'],
] as const)('calibration explains the %s failure', async (sensorFailureReason, title) => {
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      sensorStatus="unavailable"
      sensorFailureReason={sensorFailureReason}
      tiltProgress={null}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
    />,
  );

  expect(view.getByText(title)).toBeTruthy();
  expect(view.getByLabelText('傾きセンサーをもう一度試す')).toBeTruthy();
});

test('calibration reports that an installed subscription is waiting for its first value', async () => {
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      sensorStatus="starting"
      sensorFailureReason={null}
      tiltProgress={null}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
    />,
  );

  expect(view.getByText('センサーを確認しています…')).toBeTruthy();
  expect(view.queryByLabelText('傾きセンサーをもう一度試す')).toBeNull();
});

test('calibration does not report a sensor failure while subscription prerequisites are pending', async () => {
  jest.useFakeTimers();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      sensorStatus="waiting"
      sensorFailureReason={null}
      tiltProgress={0}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
    />,
  );

  await act(async () => {
    jest.advanceTimersByTime(3_000);
  });
  expect(view.getByText('準備しています…')).toBeTruthy();
  expect(view.queryByText('センサーを確認できませんでした')).toBeNull();
  expect(view.queryByLabelText('傾きセンサーをもう一度試す')).toBeNull();

  await act(async () => {
    view.unmount();
  });
  jest.useRealTimers();
});

test('calibration exposes progress feedback while the phone is being tilted', async () => {
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      sensorStatus="active"
      sensorFailureReason={null}
      tiltProgress={0.8}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
    />,
  );

  expect(view.getByText('もう少し傾けてください')).toBeTruthy();
  await act(async () => {
    view.unmount();
  });
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
      sensorFailureReason={null}
      tiltProgress={0}
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

test('calibration keeps the pose timeout deadline when sensor status briefly changes', async () => {
  jest.useFakeTimers();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      sensorStatus="active"
      sensorFailureReason={null}
      tiltProgress={0}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={jest.fn()}
    />,
  );

  await act(async () => {
    jest.advanceTimersByTime(9_000);
    await Promise.resolve();
  });
  await act(async () => {
    view.rerender(
      <RaiseToSpeakIntroModal
        visible
        busy={false}
        calibrating
        message={null}
        sensorStatus="waiting"
        sensorFailureReason={null}
        tiltProgress={0}
        onEnable={jest.fn()}
        onDismiss={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    await Promise.resolve();
  });
  await act(async () => {
    jest.advanceTimersByTime(1_000);
    await Promise.resolve();
  });

  expect(view.getByText('傾きを検出できませんでした')).toBeTruthy();
  await act(async () => {
    view.unmount();
  });
  jest.useRealTimers();
});

test('calibration retry starts a fresh pose timeout', async () => {
  jest.useFakeTimers();
  const onRetry = jest.fn();
  const view = await render(
    <RaiseToSpeakIntroModal
      visible
      busy={false}
      calibrating
      message={null}
      sensorStatus="active"
      sensorFailureReason={null}
      tiltProgress={0}
      onEnable={jest.fn()}
      onDismiss={jest.fn()}
      onRetry={onRetry}
    />,
  );

  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  await fireEvent.press(view.getByLabelText('傾きセンサーをもう一度試す'));
  expect(onRetry).toHaveBeenCalledTimes(1);

  await act(async () => {
    jest.advanceTimersByTime(9_999);
  });
  expect(view.queryByText('傾きを検出できませんでした')).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(view.getByText('傾きを検出できませんでした')).toBeTruthy();

  await act(async () => {
    view.unmount();
  });
  jest.useRealTimers();
});
