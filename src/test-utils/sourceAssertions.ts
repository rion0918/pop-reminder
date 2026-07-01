import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type SourceContract = {
  includes?: RegExp[];
  excludes?: RegExp[];
};

function resolveFromImportMeta(importMetaUrl: string, relativePath: string): string {
  return resolve(dirname(fileURLToPath(importMetaUrl)), relativePath);
}

export function readSource(importMetaUrl: string, relativePath: string): string {
  return readFileSync(resolveFromImportMeta(importMetaUrl, relativePath), 'utf8');
}

export function readJson<T>(importMetaUrl: string, relativePath: string): T {
  return JSON.parse(readSource(importMetaUrl, relativePath)) as T;
}

export function assertSourceIncludes(source: string, patterns: RegExp[]): void {
  for (const pattern of patterns) {
    assert.match(source, pattern);
  }
}

export function assertSourceExcludes(source: string, patterns: RegExp[]): void {
  for (const pattern of patterns) {
    assert.doesNotMatch(source, pattern);
  }
}

export function assertSourceContract(source: string, contract: SourceContract): void {
  assertSourceIncludes(source, contract.includes ?? []);
  assertSourceExcludes(source, contract.excludes ?? []);
}
