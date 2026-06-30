/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('search result meta keeps the result count inside narrow widths', () => {
  const source = readFileSync(__dirname + '/SearchScreen.tsx', 'utf8');

  assert.match(source, /<Text numberOfLines=\{1\} style=\{styles\.resultMetaText\}>/);
  assert.match(source, /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*style=\{styles\.resultMetaSub\}/);
  assert.match(source, /resultMetaText: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/);
  assert.match(source, /resultMetaSub: \{[\s\S]*flexShrink: 0,[\s\S]*maxWidth: '34%',/);
  assert.match(source, /resultMetaSub: \{[\s\S]*includeFontPadding: false,/);
});

test('search removes deleted reminders locally before a silent refresh', () => {
  const source = readFileSync(__dirname + '/SearchScreen.tsx', 'utf8');

  assert.match(source, /const refresh = useCallback\(async \(options\?: \{ silent\?: boolean \}\) => \{/);
  assert.match(source, /if \(!options\?\.silent\) \{[\s\S]*setLoading\(true\);[\s\S]*\}/);
  assert.match(source, /setReminders\(\(current\) => current\.filter\(\(item\) => item\.id !== reminder\.id\)\);/);
  assert.match(source, /await refresh\(\{ silent: true \}\);/);
});
