import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const aabArgument = process.argv.slice(2).find((argument) => argument !== '--');
const aabPath = aabArgument ? resolve(aabArgument) : null;

if (!aabPath) {
  console.error('Usage: node scripts/verify-android-aab.mjs <path-to-aab>');
  process.exit(2);
}
if (!existsSync(aabPath)) {
  console.error(`AAB does not exist: ${aabPath}`);
  process.exit(2);
}

const modelDirectory = 'assets/models/moonshine-tiny-ja';
const artifactDirectory = `base/assets/models/moonshine-tiny-ja`;
const modelFiles = [
  { source: 'encoder_model.ort.gz', artifact: 'encoder_model.ort', decompress: true },
  { source: 'decoder_model_merged.ort.gz', artifact: 'decoder_model_merged.ort', decompress: true },
  { source: 'tokens.txt', artifact: 'tokens.txt', decompress: false },
  { source: 'LICENSE', artifact: 'LICENSE', decompress: false },
  { source: 'NOTICE', artifact: 'NOTICE', decompress: false },
];
const maxBuffer = 128 * 1024 * 1024;

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function readArtifact(relativePath) {
  return execFileSync('unzip', ['-p', aabPath, relativePath], { maxBuffer });
}

const entries = execFileSync('unzip', ['-Z1', aabPath], { encoding: 'utf8' }).split(/\r?\n/);
for (const file of modelFiles) {
  const artifactPath = `${artifactDirectory}/${file.artifact}`;
  if (!entries.includes(artifactPath)) {
    throw new Error(`Missing Moonshine asset in AAB: ${artifactPath}`);
  }

  const sourcePath = join(repositoryRoot, modelDirectory, file.source);
  const source = readFileSync(sourcePath);
  const expected = file.decompress ? gunzipSync(source) : source;
  const actual = readArtifact(artifactPath);
  if (sha256(actual) !== sha256(expected)) {
    throw new Error(`Moonshine asset content mismatch: ${artifactPath}`);
  }
  console.log(`${artifactPath}: ${actual.byteLength} bytes, SHA-256 ${sha256(actual)}`);
}

console.log(`Android AAB Moonshine assets verified: ${aabPath}`);
