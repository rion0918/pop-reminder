#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOW_ENV = 'MVH_ALLOW_PROTECTED_CONFIG_CHANGE';

const PROTECTED_EXACT_PATHS = new Set([
  'AGENTS.md',
  'biome.json',
  'flake.nix',
  'lefthook.yml',
  'package.json',
  'pnpm-lock.yaml',
  '.codex/hooks.json',
]);

const PROTECTED_PREFIXES = ['.codex/hooks/', 'scripts/mvh-', 'tools/biome-rules/'];

export function normalizeRepoPath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function isProtectedHarnessPath(filePath) {
  const normalizedPath = normalizeRepoPath(filePath);

  return (
    PROTECTED_EXACT_PATHS.has(normalizedPath) ||
    PROTECTED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))
  );
}

export function findProtectedChanges(changedPaths) {
  return Array.from(
    new Set(changedPaths.map(normalizeRepoPath).filter(isProtectedHarnessPath)),
  ).sort();
}

function runGit(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getChangedPaths() {
  return [
    ...runGit(['diff', '--name-only']),
    ...runGit(['diff', '--name-only', '--cached']),
    ...runGit(['ls-files', '--others', '--exclude-standard']),
  ];
}

export function buildGuardFailureMessage(protectedChanges) {
  return [
    'MVH protected harness files changed without approval:',
    ...protectedChanges.map((filePath) => `- ${filePath}`),
    '',
    `Set ${ALLOW_ENV}=1 only when the user explicitly asked to edit harness configuration.`,
  ].join('\n');
}

export function runGuard({ env = process.env, changedPaths = getChangedPaths() } = {}) {
  if (env[ALLOW_ENV] === '1') {
    return {
      ok: true,
      protectedChanges: [],
      message: `MVH protected-file guard bypassed by ${ALLOW_ENV}=1.`,
    };
  }

  const protectedChanges = findProtectedChanges(changedPaths);

  if (protectedChanges.length === 0) {
    return {
      ok: true,
      protectedChanges,
      message: 'MVH protected-file guard passed.',
    };
  }

  return {
    ok: false,
    protectedChanges,
    message: buildGuardFailureMessage(protectedChanges),
  };
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  try {
    const result = runGuard();
    const output = result.ok ? console.log : console.error;

    output(result.message);
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error(`MVH protected-file guard failed to inspect git state: ${error.message}`);
    process.exit(1);
  }
}
