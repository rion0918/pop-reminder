import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const checksumManifest = readFileSync(join(repositoryRoot, 'assets/model-ja-jp.sha256'), 'utf8');

test('bundled Japanese Vosk model matches the reviewed checksums', () => {
  const entries = checksumManifest.trim().split('\n');
  assert.equal(entries.length, 17);

  for (const entry of entries) {
    const [expectedHash, relativePath] = entry.split(/\s{2}/);
    assert.ok(expectedHash);
    assert.ok(relativePath?.startsWith('assets/model-ja-jp/'));
    const actualHash = createHash('sha256')
      .update(readFileSync(join(repositoryRoot, relativePath)))
      .digest('hex');
    assert.equal(actualHash, expectedHash, relativePath);
  }
});
