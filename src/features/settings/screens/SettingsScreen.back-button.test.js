/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('settings back button shows feedback before navigating back', () => {
  const source = readFileSync(__dirname + '/SettingsScreen.tsx', 'utf8');

  assert.match(source, /BACK_BUTTON_FEEDBACK_MS/);
  assert.match(source, /const \[isBackButtonPressed, setIsBackButtonPressed\] = useState\(false\);/);
  assert.match(source, /setTimeout\(\(\) => \{/);
  assert.match(source, /pressed \|\| isBackButtonPressed \? styles\.iconButtonPressed : null/);
  assert.match(source, /iconButtonPressed: \{/);
  assert.match(source, /transform: \[\{ translateY: 1 \}, \{ scale: 0\.94 \}\]/);
});
