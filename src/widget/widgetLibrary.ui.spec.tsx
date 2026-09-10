const mockDraw = jest.fn();
const mockGetInfo = jest.fn(async () => [{ widgetId: 1 }, { widgetId: 2 }]);
jest.mock('react-native-android-widget/lib/commonjs/AndroidWidget', () => ({
  AndroidWidget: { getWidgetInfo: mockGetInfo, drawWidgetById: mockDraw },
}));
jest.mock('react-native-android-widget/lib/commonjs/api/build-widget-tree', () => ({
  buildWidgetTree: (value: unknown) => value,
}));
const {
  requestWidgetUpdate,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('react-native-android-widget/lib/commonjs/api/request-widget-update');

test('widget update waits for every async render before the next update can run', async () => {
  let release!: (value: object) => void;
  const render = new Promise<object>((resolve) => {
    release = resolve;
  });
  let completed = false;
  const update = requestWidgetUpdate({
    widgetName: 'PopReminderWidget',
    renderWidget: () => render,
  }).then(() => {
    completed = true;
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(completed).toBe(false);
  release({});
  await update;
  expect(mockDraw).toHaveBeenCalledTimes(2);
});
