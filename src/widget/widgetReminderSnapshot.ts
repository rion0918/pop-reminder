import * as SQLite from 'expo-sqlite';

import { coerceAppTheme, type AppTheme } from '../shared/domain/appTheme';

export type WidgetReminder = {
  id: string;
  title: string;
  targetAt: string;
};

export type WidgetSnapshot = {
  reminders: WidgetReminder[];
  theme: AppTheme;
};

type ReminderRow = {
  id: string;
  title: string;
  target_at: string;
  target_notify_at: string;
  status: string;
};

type SettingsRow = {
  theme: string;
};

let widgetDb: SQLite.SQLiteDatabase | null = null;

function getWidgetDb(): SQLite.SQLiteDatabase {
  if (!widgetDb) {
    widgetDb = SQLite.openDatabaseSync('pop_reminder.db', { useNewConnection: true });
  }
  return widgetDb;
}

function getReminders(db: SQLite.SQLiteDatabase, now: Date): WidgetReminder[] {
  const rows = db.getAllSync<ReminderRow>(
    `SELECT id, title, target_at, target_notify_at, status
     FROM reminders
     WHERE status = 'active' AND target_notify_at > ?
     ORDER BY target_at ASC
     LIMIT 20`,
    [now.toISOString()],
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    targetAt: row.target_at,
  }));
}

function getTheme(db: SQLite.SQLiteDatabase): AppTheme {
  try {
    const row = db.getFirstSync<SettingsRow>(
      `SELECT theme
       FROM app_settings
       WHERE id = 'default'
       LIMIT 1`,
    );

    return coerceAppTheme(row?.theme ?? 'lavender');
  } catch (error) {
    console.warn('[Widget] Failed to fetch theme from SQLite', error);
    return 'lavender';
  }
}

export async function getWidgetSnapshot(now = new Date()): Promise<WidgetSnapshot> {
  try {
    const db = getWidgetDb();

    return {
      reminders: getReminders(db, now),
      theme: getTheme(db),
    };
  } catch (error) {
    console.warn('[Widget] Failed to fetch reminders from SQLite', error);
    return { reminders: [], theme: 'lavender' };
  }
}
