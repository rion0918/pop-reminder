/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('home bottom controls use compact spacing on narrow Android widths', () => {
  const source = readFileSync(__dirname + '/HomeScreen.tsx', 'utf8');

  assert.match(source, /useWindowDimensions/);
  assert.match(source, /const isCompactPhoneWidth = windowWidth <= 360;/);
  assert.match(
    source,
    /style=\{\[styles\.dueLegend, isCompactPhoneWidth \? styles\.dueLegendCompact : null\]\}/,
  );
  assert.match(
    source,
    /styles\.addButton,[\s\S]*isCompactPhoneWidth \? styles\.addButtonCompact : null,/,
  );
  assert.match(
    source,
    /dueLegendCompact: \{[\s\S]*left: 16,[\s\S]*right: 116,[\s\S]*paddingHorizontal: 8,/,
  );
  assert.match(
    source,
    /addButtonCompact: \{[\s\S]*right: 16,[\s\S]*minWidth: 88,[\s\S]*paddingHorizontal: 18,/,
  );
});
