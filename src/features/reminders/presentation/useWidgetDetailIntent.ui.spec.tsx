import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useWidgetDetailIntent } from './useWidgetDetailIntent';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

afterEach(() => jest.restoreAllMocks());

test('waits for fresh data and only opens the latest requested reminder', async () => {
  const first = deferred<{ id: string }[]>();
  const second = deferred<{ id: string }[]>();
  const refresh = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const open = jest.fn();
  const view = await renderHook<void, { id: string; intent: string }>(
    ({ id, intent }) => useWidgetDetailIntent({ action: 'view', id, intent }, refresh, open),
    { initialProps: { id: 'first', intent: '1' } },
  );
  expect(open).not.toHaveBeenCalled();
  await view.rerender({ id: 'second', intent: '2' });
  await act(async () => second.resolve([{ id: 'second' }]));
  expect(open).toHaveBeenCalledWith('second');
  await act(async () => first.resolve([{ id: 'first' }]));
  expect(open).toHaveBeenCalledTimes(1);
});

test('a later tap of the same reminder opens again', async () => {
  const refresh = jest.fn(async () => [{ id: 'first' }]);
  const open = jest.fn();
  const view = await renderHook<void, { intent: string }>(
    ({ intent }) => useWidgetDetailIntent({ action: 'view', id: 'first', intent }, refresh, open),
    { initialProps: { intent: '1' } },
  );
  await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
  await view.rerender({ intent: '2' });
  await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
});

test('missing and failed reads differ, and failed reads can be retried', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const refresh = jest
    .fn()
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error('busy'))
    .mockResolvedValueOnce([{ id: 'first' }]);
  const open = jest.fn();
  const view = await renderHook<void, { intent: string }>(
    ({ intent }) => useWidgetDetailIntent({ action: 'view', id: 'first', intent }, refresh, open),
    { initialProps: { intent: '1' } },
  );
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith('リマインダーが見つかりません', expect.any(String)),
  );
  await view.rerender({ intent: '2' });
  await waitFor(() =>
    expect(alert).toHaveBeenLastCalledWith(
      'リマインダーを読み込めませんでした',
      expect.any(String),
      expect.any(Array),
    ),
  );
  const retry = alert.mock.calls.at(-1)?.[2]?.find((button) => button.text === '再試行');
  await act(async () => retry?.onPress?.());
  await waitFor(() => expect(open).toHaveBeenCalledWith('first'));
});
