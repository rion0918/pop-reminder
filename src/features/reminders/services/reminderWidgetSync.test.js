/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('creating a reminder waits for the widget to render the latest database snapshot', () => {
  const source = readFileSync(__dirname + '/createReminderService.ts', 'utf8');

  assert.equal((source.match(/await updateWidget\(\);/g) ?? []).length, 2);
  assert.doesNotMatch(source, /void updateWidget\(\);/);
});

test('deleting a reminder waits for the widget to remove the reminder', () => {
  const source = readFileSync(__dirname + '/deleteReminderService.ts', 'utf8');

  assert.match(source, /await deleteReminderById\(id\);[\s\S]*await updateWidget\(\);/);
  assert.doesNotMatch(source, /void updateWidget\(\);/);
});
