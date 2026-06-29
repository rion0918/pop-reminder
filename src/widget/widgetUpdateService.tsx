import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import * as SQLite from 'expo-sqlite';

import { PopReminderWidget } from './PopReminderWidget';

const WIDGET_NAME = 'PopReminderWidget';

type ReminderRow = {
  id: string;
  title: string;
  target_at: string;
  target_notify_at: string;
  status: string;
};

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

    const reminders = rows.map((row) => ({
      id: row.id,
      title: row.title,
      targetAt: row.target_at,
    }));

    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <PopReminderWidget reminders={reminders} />,
      widgetNotFound: () => {
        // Widget not added to home screen — nothing to do
      },
    });
  } catch (error) {
    console.warn('[Widget] Failed to update widget', error);
  }
}
