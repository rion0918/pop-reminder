/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('setting rows keep controls reachable on compact Android widths', () => {
  const source = readFileSync(__dirname + '/SettingRow.tsx', 'utf8');

  assert.match(source, /<Text style=\{styles\.title\}>/);
  assert.match(source, /<Text style=\{styles\.caption\}>/);
  assert.doesNotMatch(source, /<Text numberOfLines=\{1\} style=\{styles\.title\}>/);
  assert.doesNotMatch(source, /<Text numberOfLines=\{2\} style=\{styles\.caption\}>/);
  assert.match(source, /tapArea: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/);
  assert.match(source, /iconWrap: \{[\s\S]*flexShrink: 0,/);
  assert.match(source, /copy: \{[\s\S]*flex: 1,[\s\S]*minWidth: 48,/);
  assert.match(source, /control: \{[\s\S]*flexShrink: 0,/);
  assert.match(source, /title: \{[\s\S]*fontSize: 14,[\s\S]*lineHeight: 19,[\s\S]*includeFontPadding: false,/);
  assert.match(source, /caption: \{[\s\S]*fontSize: 11,[\s\S]*lineHeight: 16,/);
});
