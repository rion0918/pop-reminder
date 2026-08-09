import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readProductionSources(patterns: string[]) {
  return patterns
    .flatMap((pattern) => globSync(pattern, { cwd: sourceRoot }))
    .filter((path) => !/\.(?:spec|test)\.tsx?$/.test(path))
    .map((path) => ({ path, source: readFileSync(resolve(sourceRoot, path), 'utf8') }));
}

function assertSourcesDoNotMatch(
  sources: ReturnType<typeof readProductionSources>,
  pattern: RegExp,
) {
  for (const { path, source } of sources) {
    assert.doesNotMatch(source, pattern, path);
  }
}

const infrastructureImport =
  /(?:from|import)\s+['"](?:@\/|(?:\.\.?\/)+)(?:[^'"/]+\/)*(?:infrastructure|db|lib|widget)(?:\/[^'"]*)?['"]/;
const externalPackageImport = /(?:from|import)\s+['"](?![./]|@\/)/;

const domainSources = readProductionSources([
  'features/*/domain/**/*.ts',
  'features/*/domain/**/*.tsx',
]);
const applicationSources = readProductionSources([
  'features/*/application/**/*.ts',
  'features/*/application/**/*.tsx',
]);
const presentationSources = readProductionSources(['features/**/*.ts', 'features/**/*.tsx']).filter(
  ({ path }) => !/features\/[^/]+\/(?:application|domain|infrastructure)\//.test(path),
);
const routeSources = readProductionSources(['app/**/*.ts', 'app/**/*.tsx']);

test('boundary matchers include side-effect-only imports', () => {
  assert.match("import 'date-fns';", externalPackageImport);
  assert.match("import '../infrastructure/register';", infrastructureImport);
});

test('domain imports only project-owned pure TypeScript modules', () => {
  assertSourcesDoNotMatch(domainSources, externalPackageImport);
  assertSourcesDoNotMatch(domainSources, infrastructureImport);
});

test('application imports only project-owned modules and no infrastructure', () => {
  assertSourcesDoNotMatch(applicationSources, externalPackageImport);
  assertSourcesDoNotMatch(applicationSources, infrastructureImport);
});

test('presentation does not import infrastructure adapters', () => {
  assertSourcesDoNotMatch(presentationSources, infrastructureImport);
});

test('app routes delegate infrastructure setup to bootstrap', () => {
  assertSourcesDoNotMatch(routeSources, infrastructureImport);
});
