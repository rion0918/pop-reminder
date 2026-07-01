/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('settings action controls stay inside compact Android widths', () => {
  const source = readFileSync(__dirname + '/SettingsScreen.tsx', 'utf8');

  assert.match(
    source,
    /<SettingRow[\s\S]*icon="color-palette-outline"[\s\S]*title="テーマ"[\s\S]*labelFlex=\{0\.36\}[\s\S]*controlFlex=\{0\.64\}[\s\S]*>/,
  );
  assert.match(
    source,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*style=\{\[styles\.themeLabel, active \? styles\.themeLabelActive : null\]\}/,
  );
  assert.match(
    source,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*style=\{styles\.notificationButtonText\}/,
  );
  assert.match(
    source,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*style=\{styles\.devButtonText\}/,
  );
  assert.match(
    source,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*style=\{styles\.cancelButtonText\}/,
  );
  assert.match(source, /themeRow: \{[\s\S]*flexShrink: 1,[\s\S]*minWidth: 0,/);
  assert.match(source, /themeRow: \{[\s\S]*width: '100%',/);
  assert.match(source, /themeButton: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/);
  assert.doesNotMatch(source, /themeButton: \{[\s\S]*minWidth: 58,/);
  assert.match(source, /themeLabel: \{[\s\S]*fontSize: 11,[\s\S]*includeFontPadding: false,/);
  assert.match(
    source,
    /notificationButtonText: \{[\s\S]*flexShrink: 1,[\s\S]*includeFontPadding: false,/,
  );
  assert.match(source, /devButtonText: \{[\s\S]*flexShrink: 1,[\s\S]*includeFontPadding: false,/);
  assert.match(
    source,
    /cancelButtonText: \{[\s\S]*flexShrink: 1,[\s\S]*includeFontPadding: false,/,
  );
});

test('legal modal header keeps close button reachable on compact widths', () => {
  const source = readFileSync(__dirname + '/SettingsScreen.tsx', 'utf8');

  assert.match(source, /<View style=\{styles\.legalModalCopy\}>/);
  assert.match(source, /<Text numberOfLines=\{2\} style=\{styles\.legalModalTitle\}>/);
  assert.match(source, /<Text numberOfLines=\{1\} style=\{styles\.legalModalUpdated\}>/);
  assert.match(source, /legalModalCopy: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/);
  assert.match(source, /legalCloseButton: \{[\s\S]*flexShrink: 0,/);
});
