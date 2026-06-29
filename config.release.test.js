const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { test } = require('node:test');

const appConfig = JSON.parse(readFileSync(__dirname + '/app.json', 'utf8'));
const easConfig = JSON.parse(readFileSync(__dirname + '/eas.json', 'utf8'));
const packageConfig = JSON.parse(readFileSync(__dirname + '/package.json', 'utf8'));
const nodeVersionPath = __dirname + '/.node-version';

function readPngColorType(path) {
  const pngSignatureLength = 8;
  const ihdrColorTypeOffset = pngSignatureLength + 4 + 4 + 8 + 1;
  const file = readFileSync(path);

  return file[ihdrColorTypeOffset];
}

test('app config has store release numbers for Android and iOS', () => {
  assert.equal(
    appConfig.expo.description,
    '忘れたくないことを、ふわっと泡にして残せるシンプルなリマインダーアプリです。',
  );
  assert.equal(appConfig.expo.android.versionCode, 1);
  assert.equal(appConfig.expo.ios.buildNumber, '1');
});

test('first App Store release stays scoped to iPhone devices', () => {
  assert.equal(appConfig.expo.ios.supportsTablet, false);
});

test('eas config makes Android preview installable and production store-ready', () => {
  assert.equal(easConfig.build.preview.android.buildType, 'apk');
  assert.equal(easConfig.build.production.android.buildType, 'app-bundle');
  assert.equal(easConfig.build.production.ios.simulator, false);
});

test('package scripts expose release regression checks', () => {
  assert.equal(
    packageConfig.scripts.test,
    "node --test config.release.test.js $(rg --files src -g '*.test.js')",
  );
});

test('package scripts expose a release verification command', () => {
  const releaseScript = packageConfig.scripts['verify:release'];

  assert.match(releaseScript, /pnpm test/);
  assert.match(releaseScript, /pnpm run typecheck/);
  assert.match(releaseScript, /pnpm run lint/);
  assert.match(releaseScript, /expo export --platform android/);
  assert.match(releaseScript, /expo export --platform ios/);
});

test('package scripts expose explicit Android QR verification modes', () => {
  assert.equal(packageConfig.scripts['start:dev-client'], 'expo start --dev-client --lan');
  assert.equal(packageConfig.scripts['start:expo-go'], 'expo start --go --lan');
});

test('local development uses the Expo-compatible Node version', () => {
  assert.equal(existsSync(nodeVersionPath), true);

  const nodeVersion = readFileSync(nodeVersionPath, 'utf8').trim();

  assert.equal(nodeVersion, '22.22.3');
});

test('native release dependencies include vector icon peer dependencies', () => {
  assert.match(packageConfig.dependencies['expo-font'], /^~14\./);
});

test('Android notifications have a release-ready small icon and accent color', () => {
  const notificationsPlugin = appConfig.expo.plugins.find((plugin) => {
    return Array.isArray(plugin) && plugin[0] === 'expo-notifications';
  });

  assert.ok(notificationsPlugin);
  assert.equal(notificationsPlugin[1].icon, './assets/notification-icon.png');
  assert.equal(notificationsPlugin[1].color, '#5F7FE8');
  assert.equal(existsSync(__dirname + '/assets/notification-icon.png'), true);
});

test('Android adaptive icon uses a transparent foreground asset', () => {
  const adaptiveIconPath = __dirname + '/assets/adaptive-icon.png';

  assert.equal(appConfig.expo.android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png');
  assert.equal(appConfig.expo.android.adaptiveIcon.backgroundColor, '#EFF8FF');
  assert.equal(existsSync(adaptiveIconPath), true);
  assert.equal(readPngColorType(adaptiveIconPath), 6);
});

test('Android navigation bar matches the light app chrome', () => {
  assert.ok(appConfig.expo.androidNavigationBar);
  assert.equal(appConfig.expo.androidNavigationBar.backgroundColor, '#EFF8FF');
  assert.equal(appConfig.expo.androidNavigationBar.barStyle, 'dark-content');
});

test('release runbook documents Android-first and iOS-later commands', () => {
  const runbookPath = __dirname + '/docs/RELEASE_ANDROID_IOS.md';

  assert.equal(existsSync(runbookPath), true);

  const runbook = readFileSync(runbookPath, 'utf8');

  assert.match(runbook, /eas build --profile preview --platform android/);
  assert.match(runbook, /eas build --profile production --platform android/);
  assert.match(runbook, /eas build --profile production --platform ios/);
  assert.match(runbook, /Widget/);
  assert.match(runbook, /別タスク/);
});

test('store listing draft documents privacy and platform release notes', () => {
  const storeDraftPath = __dirname + '/docs/STORE_LISTING_DRAFT.md';

  assert.equal(existsSync(storeDraftPath), true);

  const storeDraft = readFileSync(storeDraftPath, 'utf8');

  assert.match(storeDraft, /短い説明/);
  assert.match(storeDraft, /詳しい説明/);
  assert.match(storeDraft, /データは端末内に保存/);
  assert.match(storeDraft, /外部サーバーへの同期はありません/);
  assert.match(storeDraft, /Android先行/);
  assert.match(storeDraft, /App Store後追い/);
  assert.match(storeDraft, /Widgetは別タスク/);
});

test('privacy policy draft is ready to publish for store review', () => {
  const privacyPolicyPath = __dirname + '/docs/PRIVACY_POLICY.md';

  assert.equal(existsSync(privacyPolicyPath), true);

  const privacyPolicy = readFileSync(privacyPolicyPath, 'utf8');

  assert.match(privacyPolicy, /プライバシーポリシー/);
  assert.match(privacyPolicy, /端末内に保存/);
  assert.match(privacyPolicy, /外部サーバーへの同期はありません/);
  assert.match(privacyPolicy, /通知権限/);
  assert.match(privacyPolicy, /データの削除/);
  assert.match(privacyPolicy, /Google PlayやApp Store/);
});
