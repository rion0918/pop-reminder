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

const mockOpenDatabaseSync = jest.fn();

jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => ({})),
}));

jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///mock/' } },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: (...args: unknown[]) => mockOpenDatabaseSync(...args),
}));

// Native modules are mocked above so this test can execute the startup flow with a DB double.
const { initializeDatabase } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./client') as typeof import('./client');

describe('initializeDatabase notification permission compatibility', () => {
  it('adds the column, records v5, and is idempotent on rerun', async () => {
    const fake = makeDatabase(4, [
      'id',
      'notification_sound_enabled',
      'noon_target_time',
      'evening_target_time',
      'night_target_time',
      'raise_to_speak_enabled',
      'raise_to_speak_intro_seen',
    ]);
    mockOpenDatabaseSync.mockReturnValue(fake.database);

    await initializeDatabase(fake.database);

    expect(fake.getVersion()).toBe(5);
    expect(fake.getColumns()).toContain('notification_permission_intro_seen');
    expect(fake.getDefinition('notification_permission_intro_seen')).toBe(
      'INTEGER NOT NULL DEFAULT 0',
    );

    const statementCount = fake.statements.length;
    await initializeDatabase(fake.database);

    expect(fake.getVersion()).toBe(5);
    expect(fake.statements).toHaveLength(statementCount);
    expect(
      fake.statements.filter((statement) =>
        statement.includes('ADD COLUMN notification_permission_intro_seen'),
      ),
    ).toHaveLength(1);
  });
});
