import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export type WidgetReminder = {
  id: string;
  title: string;
  targetAt: string;
};

type ReminderRow = {
  id: string;
  title: string;
  target_at: string;
  target_notify_at: string;
  status: string;
};

export async function getWidgetReminders(now = new Date()): Promise<WidgetReminder[]> {
  try {
    const databaseDirectory = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}SQLite` : undefined;
    const db = SQLite.openDatabaseSync('pop_reminder.db', { directory: databaseDirectory } as any);

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
  } catch (error) {
    console.warn('[Widget] Failed to fetch reminders from SQLite', error);
    return [];
  }
}
