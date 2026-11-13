import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

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

test('notification permission intro applies edge-to-edge modal flags, safe-area padding, and scroll container', async () => {
  const view = await render(
    <SafeAreaInsetsContext.Provider value={{ top: 24, right: 32, bottom: 20, left: 32 }}>
      <NotificationPermissionIntroModal
        visible
        busy={false}
        canAskAgain
        onAllow={jest.fn()}
        onDismiss={jest.fn()}
      />
    </SafeAreaInsetsContext.Provider>,
  );

  const [modal] = view.container.queryAll(
    (node) => node.type === 'RCTModalHostView' || node.type === 'Modal',
  );
  expect(modal).toBeDefined();
  expect(modal.props.statusBarTranslucent).toBe(true);
  expect(modal.props.navigationBarTranslucent).toBe(true);

  const [overlay] = view.container.queryAll(
    (node) => StyleSheet.flatten(node.props.style)?.paddingTop === 36,
  );
  expect(overlay).toBeDefined();
  expect(StyleSheet.flatten(overlay.props.style)).toMatchObject({
    paddingTop: 36,
    paddingBottom: 32,
    paddingLeft: 46,
    paddingRight: 46,
  });

  const [card] = view.container.queryAll((node) => node.props.accessibilityViewIsModal === true);
  expect(StyleSheet.flatten(card.props.style)).toMatchObject({
    maxWidth: 420,
    maxHeight: '100%',
  });
  expect(
    view.container.queryAll((node) => node.type === 'RCTScrollView' || node.type === 'ScrollView')
      .length,
  ).toBeGreaterThan(0);
});
