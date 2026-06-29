import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

import * as schema from './schema';

const databaseDirectory = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}SQLite` : undefined;
const sqlite = SQLite.openDatabaseSync('pop_reminder.db', { directory: databaseDirectory } as any);

export const db = drizzle(sqlite, { schema });

export async function initializeDatabase() {
  await sqlite.execAsync(`
    PRAGMA journal_mode = DELETE;

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      target_at TEXT NOT NULL,
      previous_notify_at TEXT NOT NULL,
      target_notify_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      previous_notification_id TEXT,
      target_notification_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY NOT NULL,
      previous_notify_time TEXT NOT NULL DEFAULT '20:00',
      default_target_time TEXT NOT NULL DEFAULT '08:00',
      auto_delete_enabled INTEGER NOT NULL DEFAULT 1,
      notification_sound_enabled INTEGER NOT NULL DEFAULT 1,
      theme TEXT NOT NULL DEFAULT 'sky'
    );
  `);

  const appSettingsColumns = await sqlite.getAllAsync<{ name: string }>(
    'PRAGMA table_info(app_settings)',
  );
  const hasNotificationSoundColumn = appSettingsColumns.some(
    (column) => column.name === 'notification_sound_enabled',
  );

  if (!hasNotificationSoundColumn) {
    await sqlite.execAsync(`
      ALTER TABLE app_settings
      ADD COLUMN notification_sound_enabled INTEGER NOT NULL DEFAULT 1;
    `);
  }

  await sqlite.execAsync(`
    INSERT OR IGNORE INTO app_settings (
      id,
      previous_notify_time,
      default_target_time,
      auto_delete_enabled,
      notification_sound_enabled,
      theme
    ) VALUES (
      'default',
      '20:00',
      '08:00',
      1,
      1,
      'sky'
    );
  `);
}
