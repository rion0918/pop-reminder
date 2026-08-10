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
