import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { PopReminderWidget } from './PopReminderWidget';
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
      // Click actions are handled via OPEN_URI / OPEN_APP in the widget components
      // This handler is for custom click actions if needed in the future
      await renderPopReminderWidget(props);
      break;
    }
    default: {
      break;
    }
  }
}
