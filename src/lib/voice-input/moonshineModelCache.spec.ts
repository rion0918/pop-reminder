import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hasCompleteMoonshineModelCache } from './moonshineModelCacheCore';

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
