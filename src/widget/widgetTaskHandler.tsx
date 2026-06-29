import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import * as SQLite from 'expo-sqlite';

import { PopReminderWidget } from './PopReminderWidget';

type ReminderRow = {
  id: string;
  title: string;
  target_at: string;
  target_notify_at: string;
  status: string;
};

async function getActiveReminders(): Promise<
  { id: string; title: string; targetAt: string }[]
> {
  try {
    const db = SQLite.openDatabaseSync('pop_reminder.db');
    const now = new Date().toISOString();

    const rows = db.getAllSync<ReminderRow>(
      `SELECT id, title, target_at, target_notify_at, status
       FROM reminders
       WHERE status = 'active' AND target_notify_at > ?
       ORDER BY target_at ASC
       LIMIT 20`,
      [now],
    );

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      targetAt: row.target_at,
    }));
  } catch (error) {
    console.warn('[Widget] Failed to fetch reminders from SQLite', error);
    return [];
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const widgetAction = props.widgetAction;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const reminders = await getActiveReminders();

      props.renderWidget(
        <PopReminderWidget
          reminders={reminders}
          widgetWidth={widgetInfo.width}
          widgetHeight={widgetInfo.height}
        />,
      );
      break;
    }
    case 'WIDGET_DELETED': {
      // No cleanup needed
      break;
    }
    case 'WIDGET_CLICK': {
      // Click actions are handled via OPEN_URI / OPEN_APP in the widget components
      // This handler is for custom click actions if needed in the future
      const reminders = await getActiveReminders();

      props.renderWidget(
        <PopReminderWidget
          reminders={reminders}
          widgetWidth={widgetInfo.width}
          widgetHeight={widgetInfo.height}
        />,
      );
      break;
    }
    default: {
      break;
    }
  }
}
