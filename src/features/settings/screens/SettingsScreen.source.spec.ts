import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './SettingsScreen.tsx');

test('settings uses the dream theme before a persisted theme is available', () => {
  assertSourceIncludes(source, [/settings\?\.theme \?\? 'lavender'/]);
});

test('settings back button responds immediately without delaying navigation', () => {
  assertSourceContract(source, {
    includes: [
      /const handleBackPress = \(\) => \{\s*if \(router\.canGoBack\(\)\) \{\s*router\.back\(\);/,
      /router\.replace\(['"]\/['"]\);/,
      /pressed \? styles\.iconButtonPressed : null/,
      /iconButtonPressed: \{/,
      /transform: \[\{ translateY: 1 \}, \{ scale: 0\.94 \}\]/,
    ],
    excludes: [/BACK_BUTTON_FEEDBACK_MS/, /backPressTimeoutRef/, /isBackButtonPressed/],
  });
});

test('settings exposes notification permission controls outside the dev-only section', () => {
  const devSectionIndex = source.indexOf('{__DEV__ ? (');
  const productionSection = source.slice(0, devSectionIndex);

  assertSourceIncludes(productionSection, [
    /title="通知"/,
    /notificationPermissionLabel/,
    /name=\{[\s\S]*'checkmark-circle'/,
    /bg-\[#E9F8F1\]/,
    /accessibilityLabel="通知設定を開く"/,
    /handleRequestNotificationPermission/,
    /handleOpenAppSettings/,
    /title="通知"[\s\S]*?onPress=\{handleOpenAppSettings\}/,
  ]);
  assertSourceContract(productionSection, {
    excludes: [/通知音とバイブレーションは端末設定で変更できます/],
  });
});

test('settings does not expose an in-app notification sound toggle', () => {
  assertSourceContract(source, {
    excludes: [
      /title="通知音"/,
      /notificationSoundEnabled/,
      /OS標準の通知音を鳴らします/,
      /端末の通知設定と連動します/,
    ],
  });
});

test('settings exposes native Pro purchase and independent restore actions', () => {
  assertSourceContract(source, {
    includes: [
      /text-app-lavender-deep">\s*Pro版ふわっと。\s*<\/Text>/,
      /accessibilityLabel="Proにアップグレードする"/,
      /name="sparkles-outline"\s*size=\{22\}\s*color=\{palette\.lavenderDeep\}\s*style=\{styles\.proUpgradeIcon\}/,
      /proUpgradeIcon: \{\s*includeFontPadding: false,\s*lineHeight: 22,\s*textAlign: 'center',\s*textAlignVertical: 'center',\s*\}/,
      /text-app-lavender-deep"\s*>\s*Proにアップグレードする\s*<\/Text>/,
      /handleOpenProPaywall/,
      /presentProPaywallIfNeeded/,
      /handleRestoreProPurchase/,
      /restoreProPurchase/,
      /!isProAccessLoading && proAccessState === 'free'/,
      /accessibilityRole="button"\s*accessibilityLabel="購入済みの方はこちら（購入を復元）"/,
      /購入済みの方はこちら/,
      /disabled=\{isPurchaseActionPending\}/,
      /proAccessState === 'pro'/,
      /result === 'restored'/,
      /result === 'no-purchase'/,
      /購入を復元できませんでした/,
      /await refreshProAccess\(\)/,
    ],
    excludes: [
      />\s*忘れたくないことを無制限に\s*<\/Text>/,
      /現在の利用状態: Pro/,
      /現在の利用状態: 無料版（6件まで）/,
      /現在の利用状態を確認できません/,
      /text-app-white">Pro<\/Text>/,
      /ふわっと。Pro/,
      /<SettingRow[\s\S]*title="購入を復元"/,
    ],
  });
});

test('settings applies the shared previous time to existing reminders with observable feedback', () => {
  assertSourceContract(source, {
    includes: [
      /updatePreviousNotifyTime/,
      /isUpdatingPreviousNotifyTime/,
      /result\.skippedPastCount/,
      /result\.failedReminderCount/,
      /終日通知を予約できませんでした。次回起動時に再試行します。/,
      /pending=\{isUpdatingPreviousNotifyTime\}/,
    ],
    excludes: [
      /すべての泡に共通/,
      /OS標準の通知音を鳴らします/,
      /端末の通知設定と連動します/,
      /期限切れ後は表示せず、起動時に整理します/,
      /朝・昼・夕・夜の候補を設定/,
      /画面表示と操作結果のみ。内容は送信しません/,
      /保存データ、通知権限、利用状況の計測について/,
      /アプリのご利用にあたって/,
      /保存後10秒・20秒で通知を予約します/,
    ],
  });
});

test('settings legal copy supports both Google Play and App Store release pages', () => {
  assertSourceContract(source, {
    includes: [
      /Google PlayやApp Storeなどの配布ページ/,
      /body: '「ふわっと。」は/,
      /updatedAt: '2026年9月7日'/,
      /音声入力とセンサーについて/,
      /音声、録音、モーション値を保存、分析、外部送信しません/,
      /文字起こしを分析、外部送信することはありません/,
      /PostHog の US Cloud/,
      /明示的な同意後に/,
      /通常保持期間は12か月/,
      /タイトル、リマインダーID、具体的な日付・時刻、設定値、価格、ストア取引ID、ディープリンクURLは送信しません/,
      /RevenueCatにはSDKが生成する匿名購入ID/,
      /settings\.analyticsConsent/,
      /第三者ライセンス/,
      /Powered by Moonshine AI/,
      /thirdPartyLicensesDocument/,
      /information-circle-outline/,
    ],
    excludes: [
      /ポップ・リマインダー/,
      /利用状況データの削除を依頼/,
      /handleAnalyticsDeletionRequest/,
      /getDeletionRequestId/,
    ],
  });
});

test('settings shows the side-tilt voice intro on the first enable before preparing it', () => {
  assertSourceIncludes(source, [
    /title="左右に傾けて音声入力"/,
    /settings\.raiseToSpeakEnabled/,
    /raiseToSpeakCalibrationPhase/,
    /if \(!settings\.raiseToSpeakIntroSeen\)/,
    /await update\(\{ raiseToSpeakEnabled: true \}\)/,
    /return;/,
    /raiseToSpeak\.prepare\(\)/,
    /raiseToSpeakEnabled: true, raiseToSpeakIntroSeen: true/,
    /raiseToSpeakCalibrationPhase !== 'awaiting-upright'/,
    /reason !== 'portrait'/,
    /setRaiseToSpeakCalibrationPhase\('success'\)/,
    /raiseToSpeakEnabled: false, raiseToSpeakIntroSeen: false/,
    /<RaiseToSpeakIntroModal/,
    /const \{[\s\S]*sensorStatus: raiseToSpeakSensorStatus,[\s\S]*sensorFailureReason: raiseToSpeakSensorFailureReason,[\s\S]*retrySensor: retryRaiseToSpeakSensor,[\s\S]*tiltProgress: raiseToSpeakTiltProgress,[\s\S]*\} = useRaiseToSpeakGesture/,
    /trackTiltProgress: isRaiseToSpeakCalibrating/,
    /sensorStatus=\{raiseToSpeakSensorStatus\}/,
    /sensorFailureReason=\{raiseToSpeakSensorFailureReason\}/,
    /tiltProgress=\{raiseToSpeakTiltProgress\}/,
    /onRetry=\{retryRaiseToSpeakSensor\}/,
    /visible=\{Boolean\([\s\S]*?raiseToSpeakCalibrationPhase === 'success'[\s\S]*?\)\}/,
    /onEnable=\{\(\) => void handlePrepareRaiseToSpeak\(\)\}/,
    /onDismiss=\{handleDismissRaiseToSpeakIntro\}/,
    /isRaiseToSpeakCalibrating,[\s\S]*?raiseToSpeakCalibrationPhase !== 'awaiting-upright'/,
    /setIsRaiseToSpeakSetupBusy\(true\);[\s\S]*await update\(\{[\s\S]*raiseToSpeakEnabled: true/,
    /setIsRaiseToSpeakCalibrating\(false\);\s*setRaiseToSpeakCalibrationPhase\('success'\)/,
    /onSuccessComplete=\{\(\) => setRaiseToSpeakCalibrationPhase\('intro'\)\}/,
    /blocked: isRaiseToSpeakSetupBusy/,
    /const permissionLabel = Platform\.OS === 'android' \? 'マイク' : 'マイクとモーション';/,
    /`\$\{permissionLabel\}の権限を許可してください。`/,
    /`端末の設定で\$\{permissionLabel\}の権限を許可してください。`/,
  ]);
  assert.doesNotMatch(source, /音声は端末内で処理し、録音を保存しません/);
  assert.doesNotMatch(
    source,
    /if \(!settings\.raiseToSpeakIntroSeen\) \{\s*await update\(\{ raiseToSpeakEnabled: true \}\);\s*router\.replace\(['"]\/['"]\)/,
  );
  assert.doesNotMatch(source, /proximity-unavailable|近接センサー|近接情報/);
});

test('settings refreshes notification permission after returning from OS settings', () => {
  assertSourceIncludes(source, [
    /AppState/,
    /AppState\.addEventListener\('change'/,
    /nextAppState === 'active'/,
    /void refreshNotificationPermissionStatus\(\);/,
    /subscription\.remove\(\)/,
  ]);
});

test('settings does not expose exact alarm permission controls', () => {
  assertSourceContract(source, {
    excludes: [
      /正確な時刻の通知/,
      /exactAlarmPermissionStatus/,
      /getExactAlarmPermissionStatus/,
      /openExactAlarmSettings/,
    ],
  });
});

test('settings only reports a successful test notification after both notifications are scheduled', () => {
  assertSourceIncludes(source, [
    /const result = await scheduleTestReminderNotifications/,
    /result\.status === 'scheduled'/,
    /予約できませんでした/,
  ]);
});
