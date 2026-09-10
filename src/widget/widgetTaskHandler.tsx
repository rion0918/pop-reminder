import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { widgetServices } from '../bootstrap/appServices';
import { initializeDatabase } from '../db/client';
import { PopReminderWidget, WIDGET_DELETE_REMINDER_ACTION } from './PopReminderWidget';
import { getWidgetSnapshot } from './widgetReminderSnapshot';
import { enqueueWidgetTask } from './widgetTaskQueue';
import { runWidgetUpdate } from './widgetUpdateService';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  if (
    !['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED', 'WIDGET_CLICK'].includes(
      props.widgetAction,
    )
  )
    return;

  await enqueueWidgetTask(async () => {
    let stage = 'initialize';
    const reminderId = props.clickActionData?.id;
    try {
      await initializeDatabase();
      if (props.widgetAction === 'WIDGET_CLICK') {
        if (
          props.clickAction !== WIDGET_DELETE_REMINDER_ACTION ||
          typeof reminderId !== 'string' ||
          !reminderId
        )
          return;
        stage = 'delete';
        const deleted = await widgetServices.reminders.delete(reminderId);
        // Successful deletion syncs all widgets inside the use case. A stale click needs a refresh too.
        if (!deleted) {
          stage = 'sync';
          await runWidgetUpdate();
        }
        return;
      }

      stage = 'snapshot';
      const snapshot = await getWidgetSnapshot();
      stage = 'render';
      props.renderWidget(
        <PopReminderWidget
          reminders={snapshot.reminders}
          theme={snapshot.theme}
          widgetWidth={props.widgetInfo.width}
          widgetHeight={props.widgetInfo.height}
        />,
      );
    } catch (error) {
      console.warn('[Widget] Task failed', {
        widgetId: props.widgetInfo.widgetId,
        reminderId: typeof reminderId === 'string' ? reminderId : undefined,
        stage,
        error,
      });
    }
  });
}
