import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../test-utils/sourceAssertions';

const clientSource = readSource(import.meta.url, './client.ts');
const widgetSnapshotSource = readSource(import.meta.url, '../widget/widgetReminderSnapshot.ts');

test('pop reminder database opens with expo-sqlite directory as the third argument', () => {
  assertSourceContract(clientSource, {
    includes: [
      /export function getPopReminderDatabaseDirectory/,
      /export function openPopReminderDatabase/,
      /SQLite\.openDatabaseSync\(\s*POP_REMINDER_DATABASE_NAME,\s*undefined,\s*databaseDirectory\s*\)/,
    ],
    excludes: [/\{\s*directory:\s*databaseDirectory\s*\}\s+as any/],
  });
});

test('widget snapshot opens a dedicated connection to avoid concurrent-access NPE on android', () => {
  assertSourceContract(widgetSnapshotSource, {
    includes: [/import \* as SQLite from 'expo-sqlite';/, /useNewConnection:\s*true/],
    excludes: [/openPopReminderDatabase/],
  });
});

test('database initialization logs connection info before rethrowing failures', () => {
  assertSourceIncludes(clientSource, [
    /export function getPopReminderDatabaseInfo/,
    /console\.warn\('\[DB\] Failed to initialize database'/,
    /getPopReminderDatabaseInfo\(\)/,
    /throw error/,
  ]);
});
