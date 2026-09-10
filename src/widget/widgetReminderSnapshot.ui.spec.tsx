const mockGetSettings = jest.fn(() => ({ theme: 'mint', auto_delete_enabled: 1 }));
const mockInitialize = jest.fn(async () => {});
const mockGetAll = jest.fn(() => []);
const mockOpen = jest.fn((..._args: unknown[]) => ({
  getAllSync: mockGetAll,
  getFirstSync: mockGetSettings,
}));
jest.mock('expo-sqlite', () => ({ openDatabaseSync: (...args: unknown[]) => mockOpen(...args) }));
jest.mock('../db/client', () => ({
  initializeDatabase: () => mockInitialize(),
  POP_REMINDER_DATABASE_NAME: 'pop_reminder.db',
  getPopReminderDatabaseDirectory: () => 'file:///app/SQLite',
}));
const { getWidgetSnapshot } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./widgetReminderSnapshot') as typeof import('./widgetReminderSnapshot');

test('widget uses the application database directory with a dedicated initialized connection', async () => {
  const result = await getWidgetSnapshot();
  expect(mockInitialize).toHaveBeenCalled();
  expect(mockOpen).toHaveBeenCalledWith(
    'pop_reminder.db',
    { useNewConnection: true },
    'file:///app/SQLite',
  );
  expect(result).toEqual({ reminders: [], theme: 'mint' });
});

test('database read failure is not treated as a successful empty snapshot', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockGetAll.mockImplementationOnce(() => {
    throw new Error('busy');
  });
  await expect(getWidgetSnapshot()).rejects.toThrow('busy');
  warning.mockRestore();
});

test('a settings read failure does not hide retained expired reminders using fallback settings', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockGetSettings.mockImplementationOnce(() => {
    throw new Error('settings busy');
  });
  await expect(getWidgetSnapshot()).rejects.toThrow('settings busy');
  warning.mockRestore();
});
