/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const dbDir = __dirname;
const srcDir = join(__dirname, '..');

test('pop reminder database opens with expo-sqlite directory as the third argument', () => {
  const source = readFileSync(join(dbDir, 'client.ts'), 'utf8');

  assert.match(source, /export function getPopReminderDatabaseDirectory/);
  assert.match(source, /export function openPopReminderDatabase/);
  assert.match(
    source,
    /SQLite\.openDatabaseSync\(\s*POP_REMINDER_DATABASE_NAME,\s*undefined,\s*databaseDirectory\s*\)/,
  );
  assert.doesNotMatch(source, /\{\s*directory:\s*databaseDirectory\s*\}\s+as any/);
});

test('widget snapshot opens a dedicated connection to avoid concurrent-access NPE on android', () => {
  const source = readFileSync(join(srcDir, 'widget/widgetReminderSnapshot.ts'), 'utf8');

  assert.match(source, /import \* as SQLite from 'expo-sqlite';/);
  assert.match(source, /useNewConnection:\s*true/);
  assert.doesNotMatch(source, /openPopReminderDatabase/);
});

test('database initialization logs connection info before rethrowing failures', () => {
  const source = readFileSync(join(dbDir, 'client.ts'), 'utf8');

  assert.match(source, /export function getPopReminderDatabaseInfo/);
  assert.match(source, /console\.warn\('\[DB\] Failed to initialize database'/);
  assert.match(source, /getPopReminderDatabaseInfo\(\)/);
  assert.match(source, /throw error/);
});
