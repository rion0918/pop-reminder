/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('android hardware back closes reminder sheets before leaving home', () => {
  const source = readFileSync(__dirname + '/HomeScreen.tsx', 'utf8');

  assert.match(source, /BackHandler/);
  assert.match(source, /Platform/);
  assert.match(source, /const selectedReminderRef = useRef<Reminder \| null>\(null\);/);
  assert.match(source, /selectedReminderRef\.current = selectedReminder;/);
  assert.match(
    source,
    /const closeQuickAdd = useReminderUiStore\(\(state\) => state\.closeQuickAdd\);/,
  );
  assert.match(source, /Platform\.OS !== ['"]android['"]/);
  assert.match(source, /BackHandler\.addEventListener\(['"]hardwareBackPress['"]/);
  assert.match(source, /if \(selectedReminderRef\.current\) \{/);
  assert.match(source, /setSelectedReminderId\(null\);/);
  assert.match(source, /if \(isQuickAddOpenRef\.current\) \{/);
  assert.match(source, /closeQuickAdd\(\);/);
  assert.match(source, /subscription\.remove\(\);/);
});
