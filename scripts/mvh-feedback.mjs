#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const BEGIN_MARKER = '::mvh-feedback-json-begin';
const END_MARKER = '::mvh-feedback-json-end';
const SNIPPET_LIMIT = 12000;
const ANSI_ESCAPE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

const checks = [
  {
    name: 'protected-files',
    command: 'node',
    args: ['scripts/mvh-guard-protected-files.mjs'],
    nextAction:
      'If this failed, revert the protected harness edit or set MVH_ALLOW_PROTECTED_CONFIG_CHANGE=1 only after explicit user approval.',
  },
  {
    name: 'biome',
    command: 'pnpm',
    args: ['run', 'biome:check'],
    nextAction:
      'Fix the reported formatting, lint, or architecture rule violation. Do not weaken biome.json to hide the error.',
  },
  {
    name: 'tests',
    command: 'pnpm',
    args: ['test'],
    nextAction:
      'Fix the failing observable behavior or update the test only when the requested behavior changed.',
  },
];

function stripAnsi(value) {
  return value.replace(ANSI_ESCAPE_PATTERN, '');
}

function snippet(value) {
  const cleanValue = stripAnsi(value ?? '');

  if (cleanValue.length <= SNIPPET_LIMIT) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, SNIPPET_LIMIT)}\n...[truncated ${cleanValue.length - SNIPPET_LIMIT} chars]`;
}

function runCheck(check) {
  const startedAt = Date.now();
  const result = spawnSync(check.command, check.args, {
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const exitCode = result.status ?? 1;
  const failed = exitCode !== 0;

  return {
    name: check.name,
    command: [check.command, ...check.args].join(' '),
    status: failed ? 'failed' : 'passed',
    exitCode,
    durationMs: Date.now() - startedAt,
    stdout: failed ? snippet(result.stdout) : '',
    stderr: failed ? snippet(result.stderr) : '',
    nextAction: failed ? check.nextAction : null,
  };
}

const results = checks.map(runCheck);
const failedChecks = results.filter((result) => result.exitCode !== 0).map((result) => result.name);
const payload = {
  schemaVersion: 1,
  ok: failedChecks.length === 0,
  generatedAt: new Date().toISOString(),
  failedChecks,
  checks: results,
};

console.log(BEGIN_MARKER);
console.log(JSON.stringify(payload, null, 2));
console.log(END_MARKER);

if (process.env.MVH_FEEDBACK_EXIT_ZERO === '1') {
  process.exit(0);
}

process.exit(payload.ok ? 0 : 1);
