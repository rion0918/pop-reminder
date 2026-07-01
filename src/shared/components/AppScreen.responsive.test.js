/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('app screen reduces horizontal padding on compact phone widths', () => {
  const source = readFileSync(__dirname + '/AppScreen.tsx', 'utf8');

  assert.match(source, /useWindowDimensions/);
  assert.match(source, /const horizontalPadding = width <= 360 \? 16 : 20;/);
  assert.match(
    source,
    /<View style=\{\[styles\.container, \{ paddingHorizontal: horizontalPadding \}\]\}>/,
  );
  assert.doesNotMatch(source, /paddingHorizontal: 20,/);
});
