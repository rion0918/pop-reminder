import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runDatabaseMigrations, type MigrationDatabase } from './migrations';

function makeDatabase(userVersion: number, columns: string[] = []) {
  const statements: string[] = [];
  let version = userVersion;
  const database: MigrationDatabase = {
    execAsync: async (sql) => {
      statements.push(sql);
      const match = sql.match(/PRAGMA user_version = (\d+)/);
      if (match) version = Number(match[1]);
    },
    getFirstAsync: async <T>() => ({ user_version: version }) as T,
    getAllAsync: async <T>() => columns.map((name) => ({ name })) as T[],
  };

  return { database, statements, getVersion: () => version };
}

test('fresh database runs sequential migrations and records the current version', async () => {
  const fake = makeDatabase(0);
  await runDatabaseMigrations(fake.database);
  assert.equal(fake.getVersion(), 2);
  assert.match(fake.statements.join('\n'), /CREATE TABLE IF NOT EXISTS reminders/);
});

test('legacy database adds the notification sound column once', async () => {
  const fake = makeDatabase(1, ['id', 'theme']);
  await runDatabaseMigrations(fake.database);
  assert.equal(fake.getVersion(), 2);
  assert.equal(
    fake.statements.filter((statement) =>
      statement.includes('ADD COLUMN notification_sound_enabled'),
    ).length,
    1,
  );
});

test('migration rerun is idempotent', async () => {
  const fake = makeDatabase(2, ['id', 'notification_sound_enabled']);
  await runDatabaseMigrations(fake.database);
  assert.deepEqual(fake.statements, []);
});
