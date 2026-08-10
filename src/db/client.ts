import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { Paths } from 'expo-file-system';

import * as schema from './schema';
import { runDatabaseMigrations, type MigrationDatabase } from './migrations';

const POP_REMINDER_DATABASE_NAME = 'pop_reminder.db';
const NOTIFICATION_PERMISSION_DATABASE_VERSION = 5;

export function getPopReminderDatabaseDirectory() {
  return `${Paths.document.uri}SQLite`;
}

export function openPopReminderDatabase() {
  const databaseDirectory = getPopReminderDatabaseDirectory();
  return SQLite.openDatabaseSync(POP_REMINDER_DATABASE_NAME, undefined, databaseDirectory);
}

const sqlite = openPopReminderDatabase();

export function getPopReminderDatabaseInfo() {
  return {
    name: POP_REMINDER_DATABASE_NAME,
    directory: getPopReminderDatabaseDirectory() ?? 'default',
    path: sqlite.databasePath,
  };
}

export const db = drizzle(sqlite, { schema });

async function initializeNotificationPermissionCompatibility(database: MigrationDatabase) {
  const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((result?.user_version ?? 0) >= NOTIFICATION_PERMISSION_DATABASE_VERSION) return;

  const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(app_settings)');
  if (!columns.some((column) => column.name === 'notification_permission_intro_seen')) {
    await database.execAsync(`
      ALTER TABLE app_settings
      ADD COLUMN notification_permission_intro_seen INTEGER NOT NULL DEFAULT 0;
    `);
  }

  await database.execAsync(`PRAGMA user_version = 5;`);
  await database.execAsync(`
    INSERT OR IGNORE INTO app_settings (
      id,
      previous_notify_time,
      default_target_time,
      noon_target_time,
      evening_target_time,
      night_target_time,
      auto_delete_enabled,
      notification_sound_enabled,
      notification_permission_intro_seen,
      raise_to_speak_enabled,
      raise_to_speak_intro_seen,
      theme
    ) VALUES ('default', '20:00', '08:00', '12:00', '18:00', '20:00', 1, 1, 0, 0, 0, 'lavender');
  `);
}

export async function initializeDatabase(database: MigrationDatabase = sqlite) {
  try {
    await runDatabaseMigrations(database);
    await initializeNotificationPermissionCompatibility(database);
  } catch (error) {
    console.warn('[DB] Failed to initialize database', {
      ...getPopReminderDatabaseInfo(),
      error,
    });
    throw error;
  }
}
