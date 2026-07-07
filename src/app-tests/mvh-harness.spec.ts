import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  findProtectedChanges,
  isProtectedHarnessPath,
} from '../../scripts/mvh-guard-protected-files.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const packageConfig = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));
const hooksConfig = JSON.parse(readFileSync(resolve(repositoryRoot, '.codex/hooks.json'), 'utf8'));
const ciConfig = readFileSync(resolve(repositoryRoot, '.github/workflows/ci.yml'), 'utf8');

test('MVH package scripts expose deterministic feedback and verification commands', () => {
  assert.equal(packageConfig.scripts['biome:check'], 'biome check . --error-on-warnings');
  assert.equal(packageConfig.scripts['mvh:feedback'], 'node scripts/mvh-feedback.mjs');
  assert.equal(
    packageConfig.scripts['mvh:verify'],
    'pnpm run format:check && node scripts/mvh-guard-protected-files.mjs && pnpm run biome:check && pnpm test && pnpm run typecheck && pnpm run lint',
  );
  assert.equal(packageConfig.scripts['mvh:setup'], 'bash scripts/mvh-setup.sh');
});

test('CI uses the shared Node version and standard MVH verification gate', () => {
  assert.match(ciConfig, /node-version-file: \.node-version/);
  assert.match(ciConfig, /run: pnpm run mvh:verify/);
  assert.doesNotMatch(ciConfig, /run: pnpm run format:check/);
});

test('Codex post-write hook runs structured MVH feedback instead of background formatters', () => {
  assert.deepEqual(hooksConfig.hooks, [
    {
      event: 'PostToolUse',
      matcher: {
        tool: 'apply_patch',
      },
      command: 'bash .codex/hooks/post_write_feedback.sh',
    },
  ]);
});

test('MVH protected-file guard covers harness configuration and rules', () => {
  assert.equal(isProtectedHarnessPath('biome.json'), true);
  assert.equal(isProtectedHarnessPath('lefthook.yml'), true);
  assert.equal(isProtectedHarnessPath('flake.nix'), true);
  assert.equal(isProtectedHarnessPath('package.json'), true);
  assert.equal(isProtectedHarnessPath('pnpm-lock.yaml'), true);
  assert.equal(isProtectedHarnessPath('AGENTS.md'), true);
  assert.equal(isProtectedHarnessPath('docs/adr/0001-harness-policy.md'), true);
  assert.equal(isProtectedHarnessPath('.codex/hooks.json'), true);
  assert.equal(isProtectedHarnessPath('.codex/hooks/post_write_feedback.sh'), true);
  assert.equal(isProtectedHarnessPath('scripts/mvh-feedback.mjs'), true);
  assert.equal(isProtectedHarnessPath('tools/biome-rules/no-direct-expo-sqlite.grit'), true);
  assert.equal(isProtectedHarnessPath('src/features/reminders/services/reminderService.ts'), false);
});

test('MVH protected-file guard reports only protected changed paths', () => {
  assert.deepEqual(
    findProtectedChanges([
      'src/features/reminders/screens/HomeScreen.tsx',
      'biome.json',
      'docs/adr/0001-harness-policy.md',
      'tools/biome-rules/no-direct-expo-notifications.grit',
      'docs/QA_CHECKLIST.md',
    ]),
    [
      'biome.json',
      'docs/adr/0001-harness-policy.md',
      'tools/biome-rules/no-direct-expo-notifications.grit',
    ],
  );
});
