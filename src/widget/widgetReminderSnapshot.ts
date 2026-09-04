import * as SQLite from 'expo-sqlite';

import { coerceAppTheme, type AppTheme } from '../shared/domain/appTheme';

export type WidgetReminder = {
  id: string;
  title: string;
  targetAt: string;
  isExpired: boolean;
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
  auto_delete_enabled: number;
};

type WidgetSettings = {
  theme: AppTheme;
  autoDeleteEnabled: boolean;
};

let widgetDb: SQLite.SQLiteDatabase | null = null;

function getWidgetDb(): SQLite.SQLiteDatabase {
  if (!widgetDb) {
    widgetDb = SQLite.openDatabaseSync('pop_reminder.db', { useNewConnection: true });
  }
  return widgetDb;
}

function getReminders(
  db: SQLite.SQLiteDatabase,
  now: Date,
  includeExpired: boolean,
): WidgetReminder[] {
  const nowIso = now.toISOString();
  const rows = includeExpired
    ? db.getAllSync<ReminderRow>(
        `SELECT id, title, target_at, target_notify_at, status
         FROM reminders
         WHERE (status = 'active' AND target_notify_at > ?)
            OR status = 'expired'
            OR (status = 'active' AND target_notify_at <= ?)
         ORDER BY
           CASE WHEN status = 'active' AND target_notify_at > ? THEN 0 ELSE 1 END ASC,
           CASE WHEN status = 'active' AND target_notify_at > ? THEN target_at END ASC,
           CASE WHEN status = 'expired' OR target_notify_at <= ? THEN target_at END DESC
         LIMIT 20`,
        [nowIso, nowIso, nowIso, nowIso, nowIso],
      )
    : db.getAllSync<ReminderRow>(
        `SELECT id, title, target_at, target_notify_at, status
         FROM reminders
         WHERE status = 'active' AND target_notify_at > ?
         ORDER BY target_at ASC
         LIMIT 20`,
        [nowIso],
      );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    targetAt: row.target_at,
    isExpired: row.status === 'expired' || row.target_notify_at <= nowIso,
  }));
}

function getSettings(db: SQLite.SQLiteDatabase): WidgetSettings {
  try {
    const row = db.getFirstSync<SettingsRow>(
      `SELECT theme, auto_delete_enabled
       FROM app_settings
       WHERE id = 'default'
       LIMIT 1`,
    );

    return {
      theme: coerceAppTheme(row?.theme ?? 'lavender'),
      autoDeleteEnabled: row?.auto_delete_enabled !== 0,
    };
  } catch (error) {
    console.warn('[Widget] Failed to fetch settings from SQLite', error);
    return { theme: 'lavender', autoDeleteEnabled: true };
  }
}

export async function getWidgetSnapshot(now = new Date()): Promise<WidgetSnapshot> {
  try {
    const db = getWidgetDb();
    const settings = getSettings(db);

    return {
      reminders: getReminders(db, now, !settings.autoDeleteEnabled),
      theme: settings.theme,
    };
  } catch (error) {
    console.warn('[Widget] Failed to fetch reminders from SQLite', error);
    return { reminders: [], theme: 'lavender' };
  }
}
