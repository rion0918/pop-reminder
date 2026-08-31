import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const checksumManifest = readFileSync(
  join(repositoryRoot, 'assets/moonshine-tiny-ja.sha256'),
  'utf8',
);

test('bundled Moonshine Japanese model matches the reviewed checksums', () => {
  const entries = checksumManifest.trim().split('\n');
  assert.equal(entries.length, 5);

  for (const entry of entries) {
    const [expectedHash, relativePath] = entry.split(/\s{2}/);
    assert.ok(expectedHash);
    assert.ok(relativePath?.startsWith('assets/models/moonshine-tiny-ja/'));
    const actualHash = createHash('sha256')
      .update(readFileSync(join(repositoryRoot, relativePath)))
      .digest('hex');
    assert.equal(actualHash, expectedHash, relativePath);
  }
});

test('Android uses the Sherpa-ONNX native build with safe JNI UTF-8 handling', () => {
  const packageDirectory = dirname(require.resolve('react-native-sherpa-onnx/package.json'));
  const releaseTag = readFileSync(
    join(packageDirectory, 'third_party/sherpa-onnx-prebuilt/ANDROID_RELEASE_TAG'),
    'utf8',
  ).trim();

  assert.equal(releaseTag, 'sherpa-onnx-android-v1.13.2-1');
});
