import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { Paths } from 'expo-file-system';

import * as schema from './schema';
import { runDatabaseMigrations } from './migrations';

const POP_REMINDER_DATABASE_NAME = 'pop_reminder.db';

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

export async function initializeDatabase() {
  try {
    await runDatabaseMigrations(sqlite);
  } catch (error) {
    console.warn('[DB] Failed to initialize database', {
      ...getPopReminderDatabaseInfo(),
      error,
    });
    throw error;
  }
}
