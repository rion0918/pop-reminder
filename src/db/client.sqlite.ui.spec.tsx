import type { MigrationDatabase } from './migrations';

type FakeDatabaseState = {
  database: MigrationDatabase;
  statements: string[];
  getVersion: () => number;
  getColumns: () => string[];
  getDefinition: (name: string) => string | undefined;
};

function makeDatabase(userVersion: number, initialColumns: string[]): FakeDatabaseState {
  let version = userVersion;
  const columns = new Set(initialColumns);
  const definitions = new Map<string, string>();
  const statements: string[] = [];

  const database: MigrationDatabase = {
    execAsync: async (sql) => {
      statements.push(sql);

      const versionMatch = sql.match(/PRAGMA user_version = (\d+)/);
      if (versionMatch) version = Number(versionMatch[1]);

      const columnMatch = sql.match(/ADD COLUMN\s+(\w+)\s+([\s\S]+?);/);
      if (columnMatch) {
        const [, name, definition] = columnMatch;
        if (columns.has(name)) throw new Error(`duplicate column: ${name}`);
        columns.add(name);
        definitions.set(name, definition.trim());
      }
    },
    getFirstAsync: async <T,>() => ({ user_version: version }) as T,
    getAllAsync: async <T,>() => [...columns].map((name) => ({ name })) as T[],
  };

  return {
    database,
    statements,
    getVersion: () => version,
    getColumns: () => [...columns],
    getDefinition: (name) => definitions.get(name),
  };
}

const mockOpenDatabaseSync = jest.fn(() => ({ databasePath: '/mock/SQLite/pop_reminder.db' }));

jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => ({})),
}));

jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///mock/' } },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => mockOpenDatabaseSync(),
}));

// Native modules are mocked above so this test can execute the startup flow with a DB double.
const { initializeDatabase } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./client') as typeof import('./client');

describe('initializeDatabase notification permission compatibility', () => {
  it('adds compatibility columns, records v6, and is idempotent on rerun', async () => {
    const fake = makeDatabase(4, [
      'id',
      'notification_sound_enabled',
      'noon_target_time',
      'evening_target_time',
      'night_target_time',
      'raise_to_speak_enabled',
      'raise_to_speak_intro_seen',
    ]);

    await initializeDatabase(fake.database);

    expect(fake.getVersion()).toBe(6);
    expect(fake.getColumns()).toContain('notification_permission_intro_seen');
    expect(fake.getDefinition('notification_permission_intro_seen')).toBe(
      'INTEGER NOT NULL DEFAULT 0',
    );
    expect(fake.getColumns()).toContain('notification_channel_version');
    expect(fake.getDefinition('notification_channel_version')).toBe('INTEGER NOT NULL DEFAULT 0');

    const statementCount = fake.statements.length;
    await initializeDatabase(fake.database);

    expect(fake.getVersion()).toBe(6);
    expect(fake.statements).toHaveLength(statementCount);
    expect(
      fake.statements.filter((statement) =>
        statement.includes('ADD COLUMN notification_permission_intro_seen'),
      ),
    ).toHaveLength(1);
  });
});

test('concurrent initialization shares migrations and failures can be retried', async () => {
  const fake = makeDatabase(4, [
    'id',
    'notification_sound_enabled',
    'noon_target_time',
    'evening_target_time',
    'night_target_time',
    'raise_to_speak_enabled',
    'raise_to_speak_intro_seen',
  ]);
  await Promise.all([initializeDatabase(fake.database), initializeDatabase(fake.database)]);
  expect(
    fake.statements.filter((sql) => sql.includes('ADD COLUMN notification_permission_intro_seen')),
  ).toHaveLength(1);

  const getFirst = fake.database.getFirstAsync;
  fake.database.getFirstAsync = jest
    .fn()
    .mockRejectedValueOnce(new Error('busy'))
    .mockImplementation(getFirst);
  // A fresh connection must retry after an initialization failure.
  const retryDatabase = { ...fake.database };
  await expect(initializeDatabase(retryDatabase)).rejects.toThrow('busy');
  await expect(initializeDatabase(retryDatabase)).resolves.toBeUndefined();
});
