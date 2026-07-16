import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './SettingsScreen.tsx');

test('settings back button shows feedback before navigating back', () => {
  assertSourceIncludes(source, [
    /BACK_BUTTON_FEEDBACK_MS/,
    /const \[isBackButtonPressed, setIsBackButtonPressed\] = useState\(false\);/,
    /setTimeout\(\(\) => \{/,
    /pressed \|\| isBackButtonPressed \? styles\.iconButtonPressed : null/,
    /iconButtonPressed: \{/,
    /transform: \[\{ translateY: 1 \}, \{ scale: 0\.94 \}\]/,
  ]);
});

test('settings exposes notification permission controls outside the dev-only section', () => {
  const devSectionIndex = source.indexOf('{__DEV__ ? (');
  const productionSection = source.slice(0, devSectionIndex);

  assertSourceIncludes(productionSection, [
    /title="通知権限"/,
    /notificationPermissionLabel/,
    /handleRequestNotificationPermission/,
    /handleOpenAppSettings/,
  ]);
});

test('settings exposes four independently editable quick-add preset times', () => {
  assertSourceIncludes(source, [
    /クイック追加の時刻/,
    /defaultTargetTime/,
    /noonTargetTime/,
    /eveningTargetTime/,
    /nightTargetTime/,
    /TimePickerModal/,
    /QUICK_ADD_PRESET_VALIDATION_MESSAGE/,
    /isQuickAddPresetSectionOpen/,
    /accessibilityState=\{\{ expanded: isQuickAddPresetSectionOpen \}\}/,
    /setIsQuickAddPresetSectionOpen\(\(current\) => !current\)/,
    /isQuickAddPresetSectionOpen \?/,
    /const \[isQuickAddPresetSectionOpen, setIsQuickAddPresetSectionOpen\] = useState\(false\);/,
  ]);
});

test('settings applies the shared previous time to existing reminders with observable feedback', () => {
  assertSourceIncludes(source, [
    /updatePreviousNotifyTime/,
    /isUpdatingPreviousNotifyTime/,
    /すべての泡に共通/,
    /result\.skippedPastCount/,
    /result\.failedReminderCount/,
    /disabled=\{isUpdatingPreviousNotifyTime\}/,
  ]);
});

test('settings uses distinct time-of-day icons for quick-add preset times', () => {
  assertSourceIncludes(source, [
    /key: 'defaultTargetTime', label: '朝', icon: 'partly-sunny-outline'/,
    /key: 'noonTargetTime', label: '昼', icon: 'sunny-outline'/,
    /key: 'eveningTargetTime', label: '夕', icon: 'cloudy-night-outline'/,
    /key: 'nightTargetTime', label: '夜', icon: 'moon-outline'/,
    /<SettingRow icon=\{preset\.icon\} title=\{preset\.label\}/,
  ]);
});

test('settings legal copy supports both Google Play and App Store release pages', () => {
  assertSourceContract(source, {
    includes: [
      /Google PlayやApp Storeなどの配布ページ/,
      /body: '「ふわっと。」は/,
      /updatedAt: '2026年7月14日'/,
    ],
    excludes: [/App Storeの配布ページ/, /ポップ・リマインダー/],
  });
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

test('settings exposes Android exact alarm permission and retries pending reminders on return', () => {
  assertSourceIncludes(source, [
    /正確な時刻の通知/,
    /exactAlarmPermissionStatus/,
    /getExactAlarmPermissionStatus/,
    /openExactAlarmSettings/,
    /retryPendingNotifications/,
    /nextAppState === 'active'/,
  ]);
});

test('settings only reports a successful test notification after both notifications are scheduled', () => {
  assertSourceIncludes(source, [
    /const result = await scheduleTestReminderNotifications/,
    /result\.status === 'scheduled'/,
    /予約できませんでした/,
  ]);
});

test('settings action controls stay inside compact Android widths', () => {
  assertSourceContract(source, {
    includes: [
      /sky: 'ドーン'/,
      /lavender: 'ドリーム'/,
      /mint: 'ブリーズ'/,
      /テーマを選択/,
      /className="mb-\[12px\] flex-row items-center gap-\[12px\]"/,
      /className="rounded-\[24px\] border border-\[rgba\(220,233,247,0\.78\)\] bg-\[#F6FAFF\] p-\[4px\]"/,
      /className="min-w-0 flex-1 items-center justify-center gap-\[5px\] px-\[6px\]"/,
      /accessibilityState=\{\{ selected: active \}\}/,
      /style=\{\(\{ pressed \}\) => \[[\s\S]*styles\.themeButton[\s\S]*backgroundColor: active \? palette\.white : appThemes\[theme\]\.accentSoft[\s\S]*borderColor: active \? appThemes\[theme\]\.accent : 'transparent'/,
      /styles\.themeSwatch[\s\S]*backgroundColor: active[\s\S]*\? appThemes\[theme\]\.accentSoft[\s\S]*: appThemes\[theme\]\.accent/,
      /active \? \([\s\S]*<Ionicons name="checkmark" size=\{11\} color=\{appThemes\[theme\]\.accent\} \/>[\s\S]*\) : null/,
      /color: appThemes\[theme\]\.accent,/,
      /themeButton: \{[\s\S]*minHeight: 58,[\s\S]*borderRadius: 20,/,
      /themeSwatch: \{[\s\S]*height: 18,[\s\S]*width: 18,[\s\S]*borderRadius: 9,/,
      /themeLabel: \{[\s\S]*fontSize: 13,[\s\S]*lineHeight: 16,[\s\S]*fontWeight: '900',/,
      /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*className="shrink text-\[14px\] font-extrabold text-app-white"[\s\S]*style=\{styles\.noFontPadding\}/,
      /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*className="shrink text-\[14px\] font-extrabold text-app-ink"[\s\S]*style=\{styles\.noFontPadding\}/,
      /noFontPadding: \{[\s\S]*includeFontPadding: false,/,
    ],
    excludes: [
      /min-w-\[58px\]/,
      /themeButtonWide/,
      /backgroundColor: active \? appThemes\[theme\]\.accent : '#F6FAFF'/,
      /borderColor: active \? appThemes\[theme\]\.accent : palette\.line/,
      /active \? 'text-app-white' : 'text-app-muted'/,
      /color: active \? palette\.white : appThemes\[theme\]\.accent/,
      /<SettingRow[\s\S]*icon="color-palette-outline"[\s\S]*title="テーマ"/,
      /そら/,
      /らべんだー/,
      /みんと/,
      /sky: 'Dawn'/,
      /lavender: 'Dream'/,
      /mint: 'Breeze'/,
    ],
  });
});

test('legal modal header keeps close button reachable on compact widths', () => {
  assertSourceIncludes(source, [
    /<View className="min-w-0 flex-1">/,
    /<Text numberOfLines=\{2\} className="text-\[18px\] font-black text-app-ink">/,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*className="mt-\[4px\] text-\[12px\] font-bold text-app-muted"/,
    /className="h-\[42px\] w-\[42px\] shrink-0 items-center justify-center rounded-\[21px\] border border-app-line bg-\[#F6FAFF\]"/,
  ]);
});
