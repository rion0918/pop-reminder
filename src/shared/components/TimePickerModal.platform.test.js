/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('time picker uses platform native display styles', () => {
  const source = readFileSync(__dirname + '/TimePickerModal.tsx', 'utf8');

  assert.match(source, /import \{ Modal, Platform, Pressable, StyleSheet, Text, View \}/);
  assert.match(source, /const timePickerDisplay = Platform\.select/);
  assert.match(source, /ios: 'spinner'/);
  assert.match(source, /android: 'default'/);
  assert.match(source, /display=\{timePickerDisplay\}/);
});
