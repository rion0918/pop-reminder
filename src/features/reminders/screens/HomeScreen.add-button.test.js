/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('home add button is visually disabled only while saving', () => {
  const source = readFileSync(__dirname + '/HomeScreen.tsx', 'utf8');

  assert.match(source, /const isAddButtonDisabled = isSaving;/);
  assert.match(source, /if \(isQuickAddOpenRef\.current \|\| isSaving\)/);
  assert.doesNotMatch(source, /const isAddButtonDisabled = isQuickAddOpen \|\| isSaving;/);
});

test('opening quick add keeps reminder bubbles floating', () => {
  const source = readFileSync(__dirname + '/HomeScreen.tsx', 'utf8');
  const idleDisabledBlock = source.slice(
    source.indexOf('const isBubbleIdleDisabled ='),
    source.indexOf('const nextReminderLabel ='),
  );

  assert.equal(idleDisabledBlock.includes('isQuickAddOpen'), false);
  assert.match(idleDisabledBlock, /isSaving/);
  assert.match(idleDisabledBlock, /Boolean\(selectedReminder\)/);
  assert.match(idleDisabledBlock, /Boolean\(burstingReminderId\)/);
});

test('opening quick add keeps reminder bubble positions pinned', () => {
  const source = readFileSync(__dirname + '/HomeScreen.tsx', 'utf8');

  assert.match(source, /<ReminderBubbleBoard/);
  assert.match(source, /freezeLayout=\{isQuickAddOpen\}/);
});

test('home add button gives immediate pressed feedback', () => {
  const source = readFileSync(__dirname + '/HomeScreen.tsx', 'utf8');

  assert.match(source, /style=\{\(\{ pressed \}\) => \[/);
  assert.match(source, /pressed && !isAddButtonDisabled \? styles\.addButtonPressed : null/);
  assert.match(source, /addButtonPressed: \{/);
  assert.match(source, /transform: \[\{ translateY: 2 \}, \{ scale: 0\.97 \}\]/);
});

test('settings button gives immediate pressed feedback', () => {
  const source = readFileSync(__dirname + '/HomeScreen.tsx', 'utf8');

  assert.match(source, /SETTINGS_BUTTON_FEEDBACK_MS/);
  assert.match(source, /const \[isSettingsButtonPressed, setIsSettingsButtonPressed\] = useState\(false\);/);
  assert.match(source, /setTimeout\(\(\) => \{/);
  assert.match(source, /router\.push\("\/settings"\);/);
  assert.match(source, /pressed \|\| isSettingsButtonPressed \? styles\.iconButtonPressed : null/);
  assert.match(source, /iconButtonPressed: \{/);
  assert.match(source, /transform: \[\{ translateY: 1 \}, \{ scale: 0\.94 \}\]/);
  assert.doesNotMatch(source, /<Link href="\/settings" asChild>/);
});
