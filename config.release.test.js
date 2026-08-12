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
  assert.equal(easConfig.build.production.environment, 'production');
  assert.equal(easConfig.build.production.android.image, 'sdk-54');
  assert.equal(easConfig.build.production.ios.simulator, false);
  assert.equal(easConfig.build.production.ios.image, 'macos-sequoia-15.6-xcode-26.0');
});

test('release configuration removes Android permissions outside the feature scope', () => {
  const blockedPermissions = [
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.ACTIVITY_RECOGNITION',
  ];
  const androidManifest = readFileSync(
    join(__dirname, 'android/app/src/main/AndroidManifest.xml'),
    'utf8',
  );

  assert.deepEqual(appConfig.expo.android.blockedPermissions, blockedPermissions);
  assert.match(androidManifest, /xmlns:tools="http:\/\/schemas\.android\.com\/tools"/);
  for (const permission of blockedPermissions) {
    assert.match(
      androidManifest,
      new RegExp(`<uses-permission android:name="${permission}" tools:node="remove"`),
    );
    assert.doesNotMatch(
      androidManifest,
      new RegExp(`<uses-permission android:name="${permission}"(?! tools:node="remove")[^>]*\\/>`),
    );
  }
  assert.match(androidManifest, /android\.permission\.RECORD_AUDIO/);
  assert.match(androidManifest, /android\.permission\.INTERNET/);
  assert.match(androidManifest, /android\.permission\.VIBRATE/);
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

test('macOS development shell leaves native builds to the Apple toolchain', () => {
  assert.match(
    flakeConfig,
    /mkDevShell = if pkgs\.stdenv\.isDarwin then pkgs\.mkShellNoCC else pkgs\.mkShell;/,
  );
});

test('native release dependencies include vector icon peer dependencies', () => {
  assert.match(packageConfig.dependencies['expo-font'], /^~14\./);
});

test('side-tilt voice native dependencies and permissions are synced without proximity', () => {
  const sensorPlugin = appConfig.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-sensors',
  );
  const speechPlugin = appConfig.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-speech-recognition',
  );
  const iosInfoPlist = readFileSync(join(__dirname, 'ios/app/Info.plist'), 'utf8');
  const androidManifest = readFileSync(
    join(__dirname, 'android/app/src/main/AndroidManifest.xml'),
    'utf8',
  );

  assert.equal(packageConfig.dependencies['expo-sensors'], '~15.0.8');
  assert.equal(packageConfig.dependencies['expo-speech-recognition'], '3.1.3');
  assert.ok(sensorPlugin);
  assert.match(sensorPlugin[1].motionPermission, /左右へ傾けた動き/);
  assert.ok(speechPlugin);
  assert.match(speechPlugin[1].microphonePermission, /端末内で文字にする/);
  assert.match(speechPlugin[1].speechRecognitionPermission, /端末内で文字に変換/);
  assert.deepEqual(speechPlugin[1].androidSpeechServicePackages, [
    'com.google.android.as',
    'com.google.android.tts',
    'com.google.android.googlequicksearchbox',
  ]);
  assert.match(
    iosInfoPlist,
    /<key>NSMicrophoneUsageDescription<\/key>\s*<string>ふわっと。がリマインダーのタイトルを端末内で文字にするために、マイクを使用します。<\/string>/,
  );
  assert.match(
    iosInfoPlist,
    /<key>NSMotionUsageDescription<\/key>\s*<string>ふわっと。が端末を左右へ傾けた動きを検出するために、モーションデータを使用します。<\/string>/,
  );
  assert.match(
    iosInfoPlist,
    /<key>NSSpeechRecognitionUsageDescription<\/key>\s*<string>ふわっと。が音声を端末内で文字に変換するために、音声認識を使用します。<\/string>/,
  );
  assert.match(
    androidManifest,
    /<uses-permission\b[^>]*android:name="android\.permission\.RECORD_AUDIO"/,
  );
  assert.equal(
    existsSync(
      join(
        __dirname,
        'modules/expo-proximity-sensor/android/src/main/java/expo/modules/proximitysensor/ExpoProximitySensorModule.kt',
      ),
    ),
    false,
  );
  assert.equal(
    existsSync(
      join(__dirname, 'modules/expo-proximity-sensor/ios/ExpoProximitySensorModule.swift'),
    ),
    false,
  );
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
  assert.match(runbook, /保持期間を12か月/);
  assert.match(runbook, /初回リリースの正式機能/);
  assert.doesNotMatch(runbook, /Widgetは別タスク/);
  assert.doesNotMatch(runbook, /削除依頼/);
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
  assert.match(storeDraft, /左右に傾けて音声入力/);
  assert.match(storeDraft, /音声認識は端末内/);
  assert.match(storeDraft, /録音、文字起こし、モーション値は外部送信しません/);
  assert.match(storeDraft, /買い切りの「Pro版ふわっと。」/);
  assert.match(storeDraft, /Android先行/);
  assert.match(storeDraft, /App Store後追い/);
  assert.match(storeDraft, /Android Widgetを初回Androidリリースの正式機能/);
  assert.doesNotMatch(storeDraft, /Widgetは別タスク/);
  assert.match(storeDraft, /Google Play Data safety 下書き/);
  assert.match(storeDraft, /Device or other IDs、App interactions、Purchase history/);
  assert.match(storeDraft, /削除リクエスト手段: なし/);
  assert.match(storeDraft, /通常保持期間12か月後に削除/);
  const postHogSection = storeDraft.match(/- PostHog:[\s\S]*?(?=\n- RevenueCat:)/)?.[0];
  const revenueCatSection = storeDraft.match(/- RevenueCat:[\s\S]*?(?=\n- リマインダー本文)/)?.[0];
  assert.ok(postHogSection, 'PostHog Data safety section is missing');
  assert.ok(revenueCatSection, 'RevenueCat Data safety section is missing');
  assert.match(postHogSection, /収集/);
  assert.match(postHogSection, /共有/);
  assert.match(revenueCatSection, /収集/);
  assert.match(revenueCatSection, /共有/);
  assert.doesNotMatch(postHogSection, /第三者との共有はありません/);
  assert.doesNotMatch(revenueCatSection, /第三者との共有はありません/);
  assert.doesNotMatch(storeDraft, /設定画面の削除依頼|匿名分析ID|専用サポートメールから削除/);
  assert.match(storeDraft, /App Store Connect App Privacy 下書き/);
  assert.match(storeDraft, /ATT \/ IDFA は使用しません/);
});

test('iOS privacy manifest matches the declared anonymous collection', () => {
  const privacyManifestPath = join(__dirname, 'ios/app/PrivacyInfo.xcprivacy');
  const privacyManifest = readFileSync(privacyManifestPath, 'utf8');

  assert.equal(existsSync(privacyManifestPath), true);
  assert.match(privacyManifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  const expectedPurposes = {
    NSPrivacyCollectedDataTypeDeviceID: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
    NSPrivacyCollectedDataTypeProductInteraction: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
    NSPrivacyCollectedDataTypePurchaseHistory: [
      'NSPrivacyCollectedDataTypePurposeAppFunctionality',
      'NSPrivacyCollectedDataTypePurposeAnalytics',
    ],
  };
  for (const [dataType, purposes] of Object.entries(expectedPurposes)) {
    const entry = privacyManifest.match(
      new RegExp(
        `<dict>\\s*<key>NSPrivacyCollectedDataType<\\/key>\\s*<string>${dataType}<\\/string>[\\s\\S]*?<\\/dict>`,
      ),
    )?.[0];
    assert.ok(entry, `Privacy manifest entry is missing for ${dataType}`);
    assert.match(
      entry,
      /<key>NSPrivacyCollectedDataTypeLinked<\/key>\s*<false\/>[\s\S]*?<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<false\/>/,
    );
    for (const purpose of purposes) {
      assert.match(entry, new RegExp(`<string>${purpose}<\\/string>`));
    }
  }
});

test('privacy policy draft is ready to publish for store review', () => {
  const privacyPolicyPath = join(__dirname, 'docs/PRIVACY_POLICY.md');

  assert.equal(existsSync(privacyPolicyPath), true);

  const privacyPolicy = readFileSync(privacyPolicyPath, 'utf8');

  assert.match(privacyPolicy, /プライバシーポリシー/);
  assert.match(privacyPolicy, /最終更新日: 2026年8月10日/);
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
  assert.match(privacyPolicy, /マイクとモーション/);
  assert.match(privacyPolicy, /音声認識は端末内/);
  assert.match(privacyPolicy, /音声、録音、モーション値は保存、分析、外部送信しません/);
  assert.doesNotMatch(privacyPolicy, /近接センサー|近接情報/);
  assert.match(privacyPolicy, /文字起こしを分析、外部送信することはありません/);
  assert.match(privacyPolicy, /データの削除/);
  assert.match(privacyPolicy, /収集済みイベントは通常保持期間12か月後に削除/);
  assert.match(privacyPolicy, /個別削除依頼の受付は提供していません/);
  assert.doesNotMatch(privacyPolicy, /設定画面の削除依頼|匿名分析ID/);
  assert.match(privacyPolicy, /Google PlayやApp Store/);
});
