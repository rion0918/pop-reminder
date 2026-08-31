import assert from 'node:assert/strict';
import { test } from 'node:test';

import { APP_THEME_OPTIONS, coerceAppTheme } from './appTheme';

test('app theme values have one shared domain source of truth', () => {
  assert.deepEqual(APP_THEME_OPTIONS, ['sky', 'lavender', 'mint']);
  assert.equal(coerceAppTheme('sky'), 'sky');
  assert.equal(coerceAppTheme('mint'), 'mint');
  assert.equal(coerceAppTheme('unsupported'), 'lavender');
});
