import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runDatabaseMigrations, type MigrationDatabase } from './migrations';

function makeDatabase(userVersion: number, columns: string[] = []) {
  const statements: string[] = [];
  let version = userVersion;
  const currentColumns = [...columns];
  const database: MigrationDatabase = {
    execAsync: async (sql) => {
      statements.push(sql);
      const match = sql.match(/PRAGMA user_version = (\d+)/);
      if (match) version = Number(match[1]);

      const addedColumn = sql.match(/ADD COLUMN (\w+)/);
      if (addedColumn) currentColumns.push(addedColumn[1]);
    },
    getFirstAsync: async <T>() => ({ user_version: version }) as T,
    getAllAsync: async <T>() => currentColumns.map((name) => ({ name })) as T[],
  };

  return { database, statements, getVersion: () => version };
}

test('fresh database runs sequential migrations and records the current version', async () => {
  const fake = makeDatabase(0);
  await runDatabaseMigrations(fake.database);
  assert.equal(fake.getVersion(), 5);
  assert.match(fake.statements.join('\n'), /CREATE TABLE IF NOT EXISTS reminders/);
  assert.match(fake.statements.join('\n'), /ADD COLUMN noon_target_time/);
  assert.match(fake.statements.join('\n'), /ADD COLUMN evening_target_time/);
  assert.match(fake.statements.join('\n'), /ADD COLUMN night_target_time/);
  assert.match(fake.statements.join('\n'), /ADD COLUMN raise_to_speak_enabled/);
  assert.match(fake.statements.join('\n'), /ADD COLUMN raise_to_speak_intro_seen/);
  assert.match(
    fake.statements.join('\n'),
    /ADD COLUMN analytics_consent TEXT NOT NULL DEFAULT 'unknown'/,
  );
  assert.match(fake.statements.join('\n'), /theme TEXT NOT NULL DEFAULT 'lavender'/);
  assert.match(fake.statements.join('\n'), /0, 0, 'unknown', 'lavender'/);
});

test('legacy database adds the notification sound column once', async () => {
  const fake = makeDatabase(1, ['id', 'theme']);
  await runDatabaseMigrations(fake.database);
  assert.equal(fake.getVersion(), 5);
  assert.equal(
    fake.statements.filter((statement) =>
      statement.includes('ADD COLUMN notification_sound_enabled'),
    ).length,
    1,
  );
  assert.equal(
    fake.statements.filter((statement) => statement.includes('ADD COLUMN noon_target_time')).length,
    1,
  );
});

test('migration rerun is idempotent', async () => {
  const fake = makeDatabase(5, [
    'id',
    'notification_sound_enabled',
    'noon_target_time',
    'evening_target_time',
    'night_target_time',
    'raise_to_speak_enabled',
    'raise_to_speak_intro_seen',
    'notification_permission_intro_seen',
    'analytics_consent',
  ]);
  await runDatabaseMigrations(fake.database);
  assert.deepEqual(fake.statements, []);
});

test('legacy version 5 database repairs a missing analytics consent column', async () => {
  const fake = makeDatabase(5, [
    'id',
    'notification_sound_enabled',
    'noon_target_time',
    'evening_target_time',
    'night_target_time',
    'raise_to_speak_enabled',
    'raise_to_speak_intro_seen',
    'notification_permission_intro_seen',
  ]);

  await runDatabaseMigrations(fake.database);

  assert.equal(fake.getVersion(), 5);
  assert.equal(
    fake.statements.filter((statement) => statement.includes('ADD COLUMN analytics_consent'))
      .length,
    1,
  );
});

test('v2 database adds all quick-add preset columns with current defaults', async () => {
  const fake = makeDatabase(2, ['id', 'notification_sound_enabled']);
  await runDatabaseMigrations(fake.database);

  assert.equal(fake.getVersion(), 5);
  const migration = fake.statements.join('\n');
  assert.match(migration, /ADD COLUMN noon_target_time TEXT NOT NULL DEFAULT '12:00'/);
  assert.match(migration, /ADD COLUMN evening_target_time TEXT NOT NULL DEFAULT '18:00'/);
  assert.match(migration, /ADD COLUMN night_target_time TEXT NOT NULL DEFAULT '20:00'/);
});

test('v3 database adds raise-to-speak settings disabled by default', async () => {
  const fake = makeDatabase(3, [
    'id',
    'notification_sound_enabled',
    'noon_target_time',
    'evening_target_time',
    'night_target_time',
  ]);
  await runDatabaseMigrations(fake.database);

  assert.equal(fake.getVersion(), 5);
  const migration = fake.statements.join('\n');
  assert.match(migration, /ADD COLUMN raise_to_speak_enabled INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration, /ADD COLUMN raise_to_speak_intro_seen INTEGER NOT NULL DEFAULT 0/);
});

test('v4 database adds analytics consent and leaves notification compatibility to database startup', async () => {
  const fake = makeDatabase(4, [
    'id',
    'notification_sound_enabled',
    'noon_target_time',
    'evening_target_time',
    'night_target_time',
    'raise_to_speak_enabled',
    'raise_to_speak_intro_seen',
  ]);
  await runDatabaseMigrations(fake.database);

  assert.equal(fake.getVersion(), 5);
  assert.match(
    fake.statements.join('\n'),
    /ADD COLUMN analytics_consent TEXT NOT NULL DEFAULT 'unknown'/,
  );
  assert.match(fake.statements.join('\n'), /PRAGMA user_version = 5/);
});
