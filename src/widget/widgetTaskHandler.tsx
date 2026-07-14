import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { appServices } from '../bootstrap/appServices';
import { PopReminderWidget, WIDGET_DELETE_REMINDER_ACTION } from './PopReminderWidget';
import { getWidgetReminders } from './widgetReminderSnapshot';

async function renderPopReminderWidget(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const reminders = await getWidgetReminders();

  props.renderWidget(
    <PopReminderWidget
      reminders={reminders}
      widgetWidth={widgetInfo.width}
      widgetHeight={widgetInfo.height}
    />,
  );
}

async function handleWidgetClick(props: WidgetTaskHandlerProps) {
  if (props.clickAction !== WIDGET_DELETE_REMINDER_ACTION) {
    return;
  }

  const reminderId = props.clickActionData?.id;
  if (typeof reminderId !== 'string' || reminderId.length === 0) {
    return;
  }

  try {
    await appServices.reminders.delete(reminderId);
  } catch (error) {
    console.warn('[Widget] Failed to delete reminder', error);
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetAction = props.widgetAction;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      await renderPopReminderWidget(props);
      break;
    }
    case 'WIDGET_DELETED': {
      // No cleanup needed
      break;
    }
    case 'WIDGET_CLICK': {
      await handleWidgetClick(props);
      await renderPopReminderWidget(props);
      break;
    }
    default: {
      break;
    }
  }
}
