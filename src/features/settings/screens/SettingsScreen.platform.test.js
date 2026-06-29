/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('settings exposes notification permission controls outside the dev-only section', () => {
  const source = readFileSync(__dirname + '/SettingsScreen.tsx', 'utf8');
  const devSectionIndex = source.indexOf('{__DEV__ ? (');
  const productionSection = source.slice(0, devSectionIndex);

  assert.match(productionSection, /title="通知権限"/);
  assert.match(productionSection, /notificationPermissionLabel/);
  assert.match(productionSection, /handleRequestNotificationPermission/);
  assert.match(productionSection, /handleOpenAppSettings/);
});

test('settings legal copy supports both Google Play and App Store release pages', () => {
  const source = readFileSync(__dirname + '/SettingsScreen.tsx', 'utf8');

  assert.doesNotMatch(source, /App Storeの配布ページ/);
  assert.match(source, /Google PlayやApp Storeなどの配布ページ/);
});

test('settings refreshes notification permission after returning from OS settings', () => {
  const source = readFileSync(__dirname + '/SettingsScreen.tsx', 'utf8');

  assert.match(source, /AppState/);
  assert.match(source, /AppState\.addEventListener\('change'/);
  assert.match(source, /nextAppState === 'active'/);
  assert.match(source, /void refreshNotificationPermissionStatus\(\);/);
  assert.match(source, /subscription\.remove\(\)/);
});
