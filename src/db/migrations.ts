export type MigrationDatabase = {
  execAsync(sql: string): Promise<unknown>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
  getAllAsync<T>(sql: string): Promise<T[]>;
};

const CURRENT_DATABASE_VERSION = 2;

export async function runDatabaseMigrations(database: MigrationDatabase) {
  const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;
  if (version >= CURRENT_DATABASE_VERSION) return;

  if (version < 1) {
    await database.execAsync(`
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

      PRAGMA user_version = 1;
    `);
    version = 1;
  }

  if (version < 2) {
    const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(app_settings)');
    if (!columns.some((column) => column.name === 'notification_sound_enabled')) {
      await database.execAsync(`
        ALTER TABLE app_settings
        ADD COLUMN notification_sound_enabled INTEGER NOT NULL DEFAULT 1;
      `);
    }
    await database.execAsync(`PRAGMA user_version = 2;`);
  }

  await database.execAsync(`
    INSERT OR IGNORE INTO app_settings (
      id,
      previous_notify_time,
      default_target_time,
      auto_delete_enabled,
      notification_sound_enabled,
      theme
    ) VALUES ('default', '20:00', '08:00', 1, 1, 'sky');
  `);
}
