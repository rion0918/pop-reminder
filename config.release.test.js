const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const appConfig = JSON.parse(readFileSync(join(__dirname, 'app.json'), 'utf8'));
const easConfig = JSON.parse(readFileSync(join(__dirname, 'eas.json'), 'utf8'));
const packageConfig = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const flakeConfig = readFileSync(join(__dirname, 'flake.nix'), 'utf8');
const nodeVersionPath = join(__dirname, '.node-version');

function readPngColorType(path) {
  const pngSignatureLength = 8;
  const ihdrColorTypeOffset = pngSignatureLength + 4 + 4 + 8 + 1;
  const file = readFileSync(path);

  return file[ihdrColorTypeOffset];
}

function readPngDimensions(path) {
  const file = readFileSync(path);

  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
  };
}

function readFileSha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

test('app config has store release numbers for Android and iOS', () => {
  assert.equal(
    appConfig.expo.description,
    '忘れる前に、数秒だけ。ふわっと残せるシンプルなリマインダーアプリです。',
  );
  assert.equal(appConfig.expo.android.versionCode, 1);
  assert.equal(appConfig.expo.ios.buildNumber, '1');
});

test('public branding changes while technical identifiers stay compatible', () => {
  const widgetPlugin = appConfig.expo.plugins.find((plugin) => {
    return Array.isArray(plugin) && plugin[0] === 'react-native-android-widget';
  });
  const iosInfoPlist = readFileSync(join(__dirname, 'ios/app/Info.plist'), 'utf8');
  const androidStrings = readFileSync(
    join(__dirname, 'android/app/src/main/res/values/strings.xml'),
    'utf8',
  );
  const androidManifest = readFileSync(
    join(__dirname, 'android/app/src/main/AndroidManifest.xml'),
    'utf8',
  );

  assert.equal(appConfig.expo.name, 'ふわっと。');
  assert.equal(appConfig.expo.slug, 'pop-reminder');
  assert.equal(appConfig.expo.scheme, 'popreminder');
  assert.equal(appConfig.expo.ios.bundleIdentifier, 'com.rion0918.popreminder');
  assert.equal(appConfig.expo.android.package, 'com.rion0918.popreminder');
  assert.ok(widgetPlugin);
  assert.equal(widgetPlugin[1].widgets[0].name, 'PopReminderWidget');
  assert.equal(widgetPlugin[1].widgets[0].label, 'ふわっと。');
  assert.match(iosInfoPlist, /<key>CFBundleDisplayName<\/key>\s*<string>ふわっと。<\/string>/);
  assert.match(androidStrings, /<string name="app_name">ふわっと。<\/string>/);
  assert.match(androidManifest, /android:label="ふわっと。"/);
});

test('Android widget picker uses a representative preview and a 4 by 3 target size', () => {
  const widgetPlugin = appConfig.expo.plugins.find((plugin) => {
    return Array.isArray(plugin) && plugin[0] === 'react-native-android-widget';
  });
  const widget = widgetPlugin?.[1].widgets[0];
  const previewPath = join(__dirname, 'assets/widget-preview.png');
  const nativePreviewPath = join(
    __dirname,
    'android/app/src/main/res/drawable/popreminderwidget_preview.png',
  );
  const nativeWidgetConfig = readFileSync(
    join(__dirname, 'android/app/src/main/res/xml/widgetprovider_popreminderwidget.xml'),
    'utf8',
  );

  assert.ok(widget);
  assert.equal(widget.previewImage, './assets/widget-preview.png');
  assert.equal(widget.targetCellWidth, 4);
  assert.equal(widget.targetCellHeight, 3);
  assert.equal(existsSync(previewPath), true);
  assert.deepEqual(readPngDimensions(previewPath), { width: 750, height: 540 });
  assert.equal(readPngColorType(previewPath), 6);
  assert.equal(existsSync(nativePreviewPath), true);
  assert.equal(readFileSha256(nativePreviewPath), readFileSha256(previewPath));
  assert.match(nativeWidgetConfig, /android:targetCellWidth="4"/);
  assert.match(nativeWidgetConfig, /android:targetCellHeight="3"/);
  assert.match(nativeWidgetConfig, /android:previewImage="@drawable\/popreminderwidget_preview"/);
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
  assert.equal(packageConfig.scripts.test, 'pnpm run test:node && pnpm run test:ui');
  assert.equal(
    packageConfig.scripts['test:node'],
    "node --import tsx --test config.release.test.js $(rg --files src -g '*.test.js' -g '*.spec.ts' -g '*.spec.tsx' -g '!*.ui.spec.tsx')",
  );
  assert.equal(packageConfig.scripts['test:ui'], 'jest --config jest.config.cjs --runInBand');
});

test('package scripts expose a release verification command', () => {
  const releaseScript = packageConfig.scripts['verify:release'];

  assert.match(releaseScript, /pnpm run format:check/);
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

  assert.equal(nodeVersion, '24.16.0');
  assert.match(flakeConfig, /nodejs_24/);
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
  assert.equal(existsSync(join(__dirname, 'assets/notification-icon.png')), true);
});

test('Android notifications do not require exact alarm special access', () => {
  const permission = 'android.permission.SCHEDULE_EXACT_ALARM';
  const manifest = readFileSync(
    join(__dirname, 'android/app/src/main/AndroidManifest.xml'),
    'utf8',
  );
  const mainApplication = readFileSync(
    join(__dirname, 'android/app/src/main/java/com/rion0918/popreminder/MainApplication.kt'),
    'utf8',
  );
  const exactAlarmModulePath = join(
    __dirname,
    'android/app/src/main/java/com/rion0918/popreminder/notifications/ExactAlarmPermissionModule.kt',
  );
  assert.equal((appConfig.expo.android.permissions ?? []).includes(permission), false);
  assert.doesNotMatch(manifest, /android\.permission\.SCHEDULE_EXACT_ALARM/);
  assert.equal(existsSync(exactAlarmModulePath), false);
  assert.doesNotMatch(mainApplication, /ExactAlarmPermissionPackage/);
});

test('Android notification QA documents inexact DATE trigger tolerance', () => {
  const qaDocument = readFileSync(join(__dirname, 'docs/QA_DEVELOPMENT_BUILD.md'), 'utf8');
  const qaLines = qaDocument.split('\n');
  const androidBackgroundCheck = qaLines.find(
    (line) => line.includes('Android 12以降') && line.includes('バックグラウンド'),
  );
  const androidTerminatedCheck = qaLines.find(
    (line) => line.includes('Android 12以降') && line.includes('アプリを終了'),
  );
  const androidInexactExpectation = qaLines.find((line) =>
    line.includes('`SCHEDULE_EXACT_ALARM` を使わない'),
  );

  assert.ok(androidBackgroundCheck);
  assert.ok(androidTerminatedCheck);
  assert.ok(androidInexactExpectation);
  assert.match(androidBackgroundCheck ?? '', /最大60分程度の遅延を許容/);
  assert.match(androidTerminatedCheck ?? '', /最大60分程度の遅延を許容/);
  assert.match(androidInexactExpectation ?? '', /`SCHEDULE_EXACT_ALARM` を使わない/);
  assert.match(androidInexactExpectation ?? '', /`DATE` トリガーは inexact alarm/);
  assert.doesNotMatch(androidInexactExpectation ?? '', /必要|要求|必須/);
  assert.doesNotMatch(qaDocument, /^- \[ \] Android 12以降.*指定時刻に通知が届く$/m);
});

test('Android adaptive icon uses a transparent foreground asset', () => {
  const adaptiveIconPath = join(__dirname, 'assets/adaptive-icon.png');

  assert.equal(appConfig.expo.android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png');
  assert.equal(appConfig.expo.android.adaptiveIcon.backgroundImage, './assets/app-icon.png');
  assert.equal(appConfig.expo.android.adaptiveIcon.backgroundColor, '#EFF8FF');
  assert.equal(existsSync(adaptiveIconPath), true);
  assert.equal(readPngColorType(adaptiveIconPath), 6);
});

test('brand image sources and committed native assets stay in sync', () => {
  const appIconPath = join(__dirname, 'assets/app-icon.png');
  const adaptiveIconPath = join(__dirname, 'assets/adaptive-icon.png');
  const iosSplashPath = join(__dirname, 'assets/splash.png');
  const androidSplashPath = join(__dirname, 'assets/splash-icon.png');
  const iosAppIconPath = join(
    __dirname,
    'ios/app/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png',
  );
  const iosNativeSplashPaths = ['image.png', 'image@2x.png', 'image@3x.png'].map((filename) =>
    join(__dirname, 'ios/app/Images.xcassets/SplashScreenLegacy.imageset', filename),
  );
  const androidAdaptiveXml = readFileSync(
    join(__dirname, 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'),
    'utf8',
  );

  assert.deepEqual(readPngDimensions(appIconPath), { width: 1024, height: 1024 });
  assert.equal(readPngColorType(appIconPath), 2);
  assert.deepEqual(readPngDimensions(adaptiveIconPath), { width: 1024, height: 1024 });
  assert.deepEqual(readPngDimensions(iosSplashPath), { width: 1242, height: 2436 });
  assert.deepEqual(readPngDimensions(androidSplashPath), { width: 1024, height: 1024 });
  assert.equal(readFileSha256(iosAppIconPath), readFileSha256(appIconPath));
  for (const nativeSplashPath of iosNativeSplashPaths) {
    assert.equal(readFileSha256(nativeSplashPath), readFileSha256(iosSplashPath));
  }
  assert.match(androidAdaptiveXml, /@mipmap\/ic_launcher_background/);
  assert.equal(
    existsSync(
      join(__dirname, 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_background.webp'),
    ),
    true,
  );
});

test('Android navigation bar matches the light app chrome', () => {
  assert.ok(appConfig.expo.androidNavigationBar);
  assert.equal(appConfig.expo.androidNavigationBar.backgroundColor, '#EFF8FF');
  assert.equal(appConfig.expo.androidNavigationBar.barStyle, 'dark-content');
});

test('release runbook documents Android-first and iOS-later commands', () => {
  const runbookPath = join(__dirname, 'docs/RELEASE_ANDROID_IOS.md');

  assert.equal(existsSync(runbookPath), true);

  const runbook = readFileSync(runbookPath, 'utf8');

  assert.match(runbook, /eas build --profile preview --platform android/);
  assert.match(runbook, /eas build --profile production --platform android/);
  assert.match(runbook, /eas build --profile production --platform ios/);
  assert.match(runbook, /Widget/);
  assert.match(runbook, /別タスク/);
});

test('store listing draft documents privacy and platform release notes', () => {
  const storeDraftPath = join(__dirname, 'docs/STORE_LISTING_DRAFT.md');

  assert.equal(existsSync(storeDraftPath), true);

  const storeDraft = readFileSync(storeDraftPath, 'utf8');

  assert.match(storeDraft, /短い説明/);
  assert.match(storeDraft, /詳しい説明/);
  assert.match(storeDraft, /## アプリ名\s+ふわっと。/);
  assert.match(storeDraft, /## 短い説明\s+忘れる前に、数秒だけ。/);
  assert.match(storeDraft, /データは端末内に保存/);
  assert.match(storeDraft, /リマインダーデータの外部同期はありません/);
  assert.match(storeDraft, /PostHog US Cloud/);
  assert.match(storeDraft, /匿名の利用状況は設定画面からいつでも停止・再開できます/);
  assert.match(
    storeDraft,
    /タイトル、リマインダーID、具体的な日付・時刻、設定値、価格、ストア取引ID、ディープリンクURLは送信しません/,
  );
  assert.match(storeDraft, /RevenueCat/);
  assert.match(storeDraft, /買い切りの「ふわっと。Pro」/);
  assert.match(storeDraft, /Android先行/);
  assert.match(storeDraft, /App Store後追い/);
  assert.match(storeDraft, /Widgetは別タスク/);
});

test('privacy policy draft is ready to publish for store review', () => {
  const privacyPolicyPath = join(__dirname, 'docs/PRIVACY_POLICY.md');

  assert.equal(existsSync(privacyPolicyPath), true);

  const privacyPolicy = readFileSync(privacyPolicyPath, 'utf8');

  assert.match(privacyPolicy, /プライバシーポリシー/);
  assert.match(privacyPolicy, /最終更新日: 2026年8月9日/);
  assert.match(privacyPolicy, /「ふわっと。」は/);
  assert.match(privacyPolicy, /端末内に保存/);
  assert.match(privacyPolicy, /登録したリマインダーやアプリ設定を同期する機能はなく/);
  assert.match(privacyPolicy, /PostHog US Cloud/);
  assert.match(privacyPolicy, /いつでも停止・再開できます/);
  assert.match(
    privacyPolicy,
    /リマインダーのタイトル、リマインダーID、具体的な日付・時刻、設定値、価格、ストア取引ID、ディープリンクURLは送信しません/,
  );
  assert.match(privacyPolicy, /RevenueCat/);
  assert.match(privacyPolicy, /AndroidとiOSの間で購入権利は共有されません/);
  assert.match(privacyPolicy, /通知権限/);
  assert.match(privacyPolicy, /データの削除/);
  assert.match(privacyPolicy, /Google PlayやApp Store/);
});
