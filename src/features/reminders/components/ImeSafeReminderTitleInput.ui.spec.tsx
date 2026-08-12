import { createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import {
  ImeSafeReminderTitleInput,
  type ImeSafeReminderTitleInputHandle,
} from './ImeSafeReminderTitleInput';

jest.mock('@gorhom/bottom-sheet', () => {
  const { TextInput } = jest.requireActual('react-native');
  return { BottomSheetTextInput: TextInput };
});

test('IME-safe title keeps manual text native and remounts only for explicit replacement', async () => {
  const onTextChange = jest.fn();
  const onEndEditing = jest.fn();
  const inputRef = createRef<ImeSafeReminderTitleInputHandle>();
  const view = await render(
    <ImeSafeReminderTitleInput
      ref={inputRef}
      accessibilityLabel="リマインダーのタイトル"
      initialValue=""
      onTextChange={onTextChange}
      onEndEditing={onEndEditing}
    />,
  );

  const input = view.getByLabelText('リマインダーのタイトル');
  expect(input.props.value).toBeUndefined();

  await fireEvent.changeText(input, 'かきくけこ');
  expect(onTextChange).toHaveBeenLastCalledWith('かきくけこ');
  expect(view.getByText('5 / 40')).toBeTruthy();

  await fireEvent(input, 'endEditing', { nativeEvent: { text: 'がぎぐげご' } });
  expect(onEndEditing).toHaveBeenCalledWith('がぎぐげご');

  await act(() => inputRef.current?.replaceText('音声入力'));
  expect(view.getByDisplayValue('音声入力')).toBeTruthy();
  expect(view.getByText('4 / 40')).toBeTruthy();
});
