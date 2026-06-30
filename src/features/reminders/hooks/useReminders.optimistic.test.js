/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('useReminders exposes an immediate local removal helper', () => {
  const source = readFileSync(__dirname + '/useReminders.ts', 'utf8');

  assert.match(source, /const removeReminder = useCallback\(\(id: string\) => \{/);
  assert.match(source, /setReminders\(\(current\) => current\.filter\(\(item\) => item\.id !== id\)\);/);
  assert.match(source, /removeReminder,/);
});
