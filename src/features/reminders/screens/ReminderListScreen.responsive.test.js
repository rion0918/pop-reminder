/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('reminder list summary keeps count inside narrow Android widths', () => {
  const source = readFileSync(__dirname + '/ReminderListScreen.tsx', 'utf8');

  assert.match(source, /<View style=\{styles\.summaryCopy\}>/);
  assert.match(source, /<Text numberOfLines=\{1\} style=\{styles\.kicker\}>/);
  assert.match(source, /<Text numberOfLines=\{2\} style=\{styles\.title\}>/);
  assert.match(
    source,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*style=\{styles\.countText\}/,
  );
  assert.match(source, /summaryCopy: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/);
  assert.match(source, /countPill: \{[\s\S]*flexShrink: 0,[\s\S]*maxWidth: '34%',/);
  assert.match(source, /countText: \{[\s\S]*includeFontPadding: false,/);
});
