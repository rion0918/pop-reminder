import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

const mockInitialize = jest.fn(async () => {});
const mockSnapshot = jest.fn(async () => ({ reminders: [], theme: 'lavender' }));
const mockDelete = jest.fn(async (_id: string) => true);
const mockUpdate = jest.fn(async () => {});
jest.mock('../db/client', () => ({ initializeDatabase: () => mockInitialize() }));
jest.mock('../bootstrap/appServices', () => ({
  widgetServices: { reminders: { delete: (id: string) => mockDelete(id) } },
  appServices: { reminders: { delete: (id: string) => mockDelete(id) } },
}));
jest.mock('./PopReminderWidget', () => ({
  PopReminderWidget: () => null,
  WIDGET_DELETE_REMINDER_ACTION: 'DELETE_REMINDER',
}));
jest.mock('./widgetReminderSnapshot', () => ({ getWidgetSnapshot: () => mockSnapshot() }));
jest.mock('./widgetUpdateService', () => ({ runWidgetUpdate: () => mockUpdate() }));
const { widgetTaskHandler } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./widgetTaskHandler') as typeof import('./widgetTaskHandler');

const props = (action: WidgetTaskHandlerProps['widgetAction']): WidgetTaskHandlerProps => ({
  widgetAction: action,
  widgetInfo: {
    widgetId: 1,
    widgetName: 'PopReminderWidget',
    width: 250,
    height: 180,
  } as WidgetTaskHandlerProps['widgetInfo'],
  clickAction: 'DELETE_REMINDER',
  clickActionData: { id: 'first' },
  renderWidget: jest.fn(),
});
beforeEach(() => {
  jest.clearAllMocks();
});

test('headless delete waits for database initialization', async () => {
  let release!: () => void;
  mockInitialize.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const task = widgetTaskHandler(props('WIDGET_CLICK'));
  await Promise.resolve();
  expect(mockInitialize).toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
  release();
  await task;
  expect(mockDelete).toHaveBeenCalledWith('first');
});

test('an old event render completes before deletion and rapid duplicate deletion refreshes all widgets', async () => {
  let release!: (value: { reminders: never[]; theme: string }) => void;
  mockSnapshot.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const old = props('WIDGET_UPDATE');
  const update = widgetTaskHandler(old);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  const deletion = widgetTaskHandler(props('WIDGET_CLICK'));
  expect(mockDelete).not.toHaveBeenCalled();
  release({ reminders: [], theme: 'lavender' });
  await Promise.all([update, deletion]);
  expect(old.renderWidget).toHaveBeenCalledTimes(1);
  mockDelete.mockResolvedValueOnce(false);
  await widgetTaskHandler(props('WIDGET_CLICK'));
  expect(mockUpdate).toHaveBeenCalledTimes(1);
});

test('failure does not poison subsequent widget tasks or render an empty success', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockInitialize.mockRejectedValueOnce(new Error('busy'));
  const failed = props('WIDGET_CLICK');
  await widgetTaskHandler(failed);
  expect(mockDelete).not.toHaveBeenCalled();
  expect(failed.renderWidget).not.toHaveBeenCalled();
  await widgetTaskHandler(props('WIDGET_CLICK'));
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(warning).toHaveBeenCalledWith(
    '[Widget] Task failed',
    expect.objectContaining({ widgetId: 1, reminderId: 'first', stage: 'initialize' }),
  );
  warning.mockRestore();
});
