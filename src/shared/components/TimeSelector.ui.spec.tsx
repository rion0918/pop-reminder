import { fireEvent, render } from '@testing-library/react-native';

import { TimeSelector } from './TimeSelector';

it('grays out unavailable quick time presets and enables them again for another date', async () => {
  const onChange = jest.fn();
  const onSelectCustomTime = jest.fn();
  const props = {
    value: '18:00',
    variant: 'compact' as const,
    presets: [
      { label: '朝', time: '08:00' },
      { label: '夜', time: '18:00' },
    ],
    onChange,
    onSelectCustomTime,
  };
  const view = await render(<TimeSelector {...props} disabledTimes={['08:00']} />);

  const morning = view.getByRole('button', { name: '朝 08:00' });
  expect(morning).toBeDisabled();
  expect(morning).toHaveStyle({ backgroundColor: '#E5E7EB' });
  expect(view.getByText('朝')).toHaveStyle({ color: '#6B7280' });
  expect(view.getByText('08:00')).toHaveStyle({ color: '#6B7280' });
  await fireEvent.press(morning);
  expect(onChange).not.toHaveBeenCalled();

  const evening = view.getByRole('button', { name: '夜 18:00' });
  expect(evening).not.toBeDisabled();
  await fireEvent.press(evening);
  expect(onChange).toHaveBeenCalledWith('18:00');
  await fireEvent.press(view.getByText('時刻'));
  expect(onSelectCustomTime).toHaveBeenCalledTimes(1);

  await view.rerender(<TimeSelector {...props} disabledTimes={[]} />);
  expect(morning).not.toBeDisabled();
  expect(morning).not.toHaveStyle({ backgroundColor: '#E5E7EB' });
  expect(view.getByText('朝')).not.toHaveStyle({ color: '#6B7280' });
  await fireEvent.press(morning);
  expect(onChange).toHaveBeenLastCalledWith('08:00');
});
