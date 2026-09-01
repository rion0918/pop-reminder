import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { dirname, posix } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';

const sourceRoot = posix.resolve(dirname(fileURLToPath(import.meta.url)), '..');

type ProductionSource = {
  path: string;
  source: string;
};

type ImportGraphNode = {
  localTargets: string[];
  externalModules: string[];
};

type ImportGraph = Map<string, ImportGraphNode>;

function readProductionSources(patterns: string[]): ProductionSource[] {
  return patterns
    .flatMap((pattern) => globSync(pattern, { cwd: sourceRoot }))
    .filter((path) => !/\.(?:spec|test)\.tsx?$/.test(path))
    .map((path) => ({ path, source: readFileSync(posix.resolve(sourceRoot, path), 'utf8') }));
}

function readModuleSpecifiers(source: string) {
  return ts.preProcessFile(source, true, true).importedFiles.map(({ fileName }) => fileName);
}

function resolveLocalImport(
  sourcePath: string,
  specifier: string,
  sourcePaths: ReadonlySet<string>,
) {
  const basePath = specifier.startsWith('@/')
    ? specifier.slice(2)
    : posix.normalize(posix.join(posix.dirname(sourcePath), specifier));
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.native.ts`,
    `${basePath}.native.tsx`,
    `${basePath}.android.ts`,
    `${basePath}.android.tsx`,
    `${basePath}.ios.ts`,
    `${basePath}.ios.tsx`,
    posix.join(basePath, 'index.ts'),
    posix.join(basePath, 'index.tsx'),
  ];

  return candidates.find((candidate) => sourcePaths.has(candidate)) ?? null;
}

function buildImportGraph(sources: ProductionSource[]): ImportGraph {
  const sourcePaths = new Set(sources.map(({ path }) => path));

  return new Map(
    sources.map(({ path, source }) => {
      const node: ImportGraphNode = { localTargets: [], externalModules: [] };

      for (const specifier of readModuleSpecifiers(source)) {
        if (specifier.startsWith('.') || specifier.startsWith('@/')) {
          const target = resolveLocalImport(path, specifier, sourcePaths);
          if (target) node.localTargets.push(target);
        } else {
          node.externalModules.push(specifier);
        }
      }

      return [path, node];
    }),
  );
}

function findTransitiveViolation(
  graph: ImportGraph,
  startPath: string,
  isForbiddenTarget: (path: string) => boolean,
) {
  const pending: { path: string; chain: string[] }[] = [{ path: startPath, chain: [startPath] }];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current.path)) continue;
    visited.add(current.path);

    const node = graph.get(current.path);
    if (!node) continue;
    if (node.externalModules[0]) {
      return {
        chain: [...current.chain, node.externalModules[0]],
        reason: 'external package',
      };
    }

    for (const target of node.localTargets) {
      const chain = [...current.chain, target];
      if (isForbiddenTarget(target)) {
        return { chain, reason: 'forbidden layer' };
      }
      pending.push({ path: target, chain });
    }
  }

  return null;
}

function assertNoTransitiveViolations(
  graph: ImportGraph,
  startPaths: string[],
  isForbiddenTarget: (path: string) => boolean,
) {
  for (const startPath of startPaths) {
    const violation = findTransitiveViolation(graph, startPath, isForbiddenTarget);
    assert.equal(
      violation,
      null,
      violation ? `${violation.reason}: ${violation.chain.join(' -> ')}` : startPath,
    );
  }
}

function isFeatureLayer(path: string, layer: 'domain' | 'application' | 'infrastructure') {
  return new RegExp(`^features/[^/]+/${layer}/`).test(path);
}

function isFeaturePresentation(path: string) {
  return (
    path.startsWith('features/') &&
    !isFeatureLayer(path, 'domain') &&
    !isFeatureLayer(path, 'application') &&
    !isFeatureLayer(path, 'infrastructure')
  );
}

function isOuterLayer(path: string) {
  return /^(?:app|bootstrap|constants|db|lib|widget|shared\/components)\//.test(path);
}

function isInfrastructureTarget(path: string) {
  return isFeatureLayer(path, 'infrastructure') || /^(?:db|lib|widget)\//.test(path);
}

const allProductionSources = readProductionSources(['**/*.ts', '**/*.tsx']);
const importGraph = buildImportGraph(allProductionSources);
const domainPaths = allProductionSources
  .map(({ path }) => path)
  .filter((path) => isFeatureLayer(path, 'domain'));
const applicationPaths = allProductionSources
  .map(({ path }) => path)
  .filter((path) => isFeatureLayer(path, 'application'));
const presentationPaths = allProductionSources
  .map(({ path }) => path)
  .filter(isFeaturePresentation);
const routePaths = allProductionSources
  .map(({ path }) => path)
  .filter((path) => path.startsWith('app/'));

test('module parser includes side-effect, export-from, and dynamic imports', () => {
  assert.deepEqual(
    readModuleSpecifiers(`
      import 'date-fns';
      export { adapter } from '../infrastructure/adapter';
      const lazyAdapter = import('../infrastructure/lazyAdapter');
    `),
    ['date-fns', '../infrastructure/adapter', '../infrastructure/lazyAdapter'],
  );
});

test('transitive graph reports an outer dependency through a shared module', () => {
  const fixtureGraph: ImportGraph = new Map([
    [
      'features/example/domain/model.ts',
      {
        localTargets: ['shared/utils/helper.ts'],
        externalModules: [],
      },
    ],
    [
      'shared/utils/helper.ts',
      {
        localTargets: ['lib/nativeAdapter.ts'],
        externalModules: [],
      },
    ],
    ['lib/nativeAdapter.ts', { localTargets: [], externalModules: ['expo-device'] }],
  ]);

  assert.deepEqual(
    findTransitiveViolation(fixtureGraph, 'features/example/domain/model.ts', isOuterLayer),
    {
      chain: ['features/example/domain/model.ts', 'shared/utils/helper.ts', 'lib/nativeAdapter.ts'],
      reason: 'forbidden layer',
    },
  );
});

test('domain reaches only domain and pure shared TypeScript modules', () => {
  assertNoTransitiveViolations(
    importGraph,
    domainPaths,
    (path) =>
      isFeatureLayer(path, 'application') ||
      isFeatureLayer(path, 'infrastructure') ||
      isFeaturePresentation(path) ||
      isOuterLayer(path),
  );
});

test('application reaches only application, domain, and pure shared TypeScript modules', () => {
  assertNoTransitiveViolations(
    importGraph,
    applicationPaths,
    (path) =>
      isFeatureLayer(path, 'infrastructure') || isFeaturePresentation(path) || isOuterLayer(path),
  );
});

test('presentation does not import infrastructure adapters directly', () => {
  for (const path of presentationPaths) {
    for (const target of importGraph.get(path)?.localTargets ?? []) {
      assert.equal(isInfrastructureTarget(target), false, `${path} -> ${target}`);
    }
  }
});

test('app routes delegate infrastructure setup to bootstrap', () => {
  for (const path of routePaths) {
    for (const target of importGraph.get(path)?.localTargets ?? []) {
      assert.equal(isInfrastructureTarget(target), false, `${path} -> ${target}`);
    }
  }
});

test('RevenueCat SDK imports stay inside the purchase infrastructure adapter', () => {
  const revenueCatPaths = [...importGraph.entries()]
    .filter(([, node]) =>
      node.externalModules.some((module) => /^react-native-purchases(?:-ui)?$/.test(module)),
    )
    .map(([path]) => path);

  assert.ok(revenueCatPaths.length > 0);
  for (const path of revenueCatPaths) {
    assert.match(path, /^features\/purchases\/infrastructure\//);
  }
});
