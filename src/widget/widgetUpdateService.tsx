import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { PopReminderWidget } from './PopReminderWidget';
import { getWidgetReminders } from './widgetReminderSnapshot';

const WIDGET_NAME = 'PopReminderWidget';
let widgetUpdateQueue: Promise<void> = Promise.resolve();

/**
 * Fetch active reminders from SQLite and trigger a widget update.
 * This should be called after any data mutation (add/delete/update)
 * so the home screen widget stays in sync.
 *
 * No-op on non-Android platforms.
 */
export async function updateWidget(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  widgetUpdateQueue = widgetUpdateQueue.then(runWidgetUpdate, runWidgetUpdate);
  await widgetUpdateQueue;
}

async function runWidgetUpdate(): Promise<void> {
  try {
    const reminders = await getWidgetReminders();

    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: ({ width, height }) => (
        <PopReminderWidget reminders={reminders} widgetWidth={width} widgetHeight={height} />
      ),
      widgetNotFound: () => {
        // Widget not added to home screen — nothing to do
      },
    });
  } catch (error) {
    console.warn('[Widget] Failed to update widget', error);
  }
}
