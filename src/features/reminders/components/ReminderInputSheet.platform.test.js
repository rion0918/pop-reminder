/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('custom date picker uses platform native display styles', () => {
  const source = readFileSync(__dirname + '/ReminderInputSheet.tsx', 'utf8');

  assert.match(source, /import \{ Modal, Platform, Pressable, StyleSheet, Text, View \}/);
  assert.match(source, /const datePickerDisplay = Platform\.select/);
  assert.match(source, /ios: 'spinner'/);
  assert.match(source, /android: 'default'/);
  assert.match(source, /display=\{datePickerDisplay\}/);
});
