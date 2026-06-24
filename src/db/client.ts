import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

import * as schema from './schema';

const sqlite = SQLite.openDatabaseSync('pop_reminder.db');

export const db = drizzle(sqlite, { schema });

export async function initializeDatabase() {
  await sqlite.execAsync(`
    PRAGMA journal_mode = WAL;

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
      theme TEXT NOT NULL DEFAULT 'sky'
    );

    INSERT OR IGNORE INTO app_settings (
      id,
      previous_notify_time,
      default_target_time,
      auto_delete_enabled,
      theme
    ) VALUES (
      'default',
      '20:00',
      '08:00',
      1,
      'sky'
    );
  `);
}
