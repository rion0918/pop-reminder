import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getMoonshineModelAssetPaths,
  hasCompleteMoonshineModelCache,
} from './moonshineModelCacheCore';

test('Moonshine cache is complete only when all model files are regular files', () => {
  assert.equal(
    hasCompleteMoonshineModelCache([{ exists: true }, { exists: true }, { exists: true }]),
    true,
  );
  assert.equal(
    hasCompleteMoonshineModelCache([{ exists: true }, { exists: false }, { exists: true }]),
    false,
  );
  assert.equal(
    hasCompleteMoonshineModelCache([
      { exists: true, isDirectory: true },
      { exists: true },
      { exists: true },
    ]),
    false,
  );
});

test('Moonshine cache recovery materializes every required asset individually', () => {
  assert.deepEqual(getMoonshineModelAssetPaths('models/moonshine-tiny-ja'), [
    'models/moonshine-tiny-ja/encoder_model.ort',
    'models/moonshine-tiny-ja/decoder_model_merged.ort',
    'models/moonshine-tiny-ja/tokens.txt',
  ]);
});
