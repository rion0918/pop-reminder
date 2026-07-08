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

test('settings legal copy supports both Google Play and App Store release pages', () => {
  assertSourceContract(source, {
    includes: [/Google PlayやApp Storeなどの配布ページ/],
    excludes: [/App Storeの配布ページ/],
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

test('settings action controls stay inside compact Android widths', () => {
  assertSourceContract(source, {
    includes: [
      /<SettingRow[\s\S]*icon="color-palette-outline"[\s\S]*title="テーマ"[\s\S]*labelFlex=\{0\.36\}[\s\S]*controlFlex=\{0\.64\}[\s\S]*>/,
      /className="w-full min-w-0 shrink flex-row gap-\[6px\]"/,
      /className=\{`h-\[34px\] min-w-0 flex-1/,
      /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*className=\{`text-\[11px\] font-extrabold/,
      /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*className="shrink text-\[14px\] font-extrabold text-app-white"[\s\S]*style=\{styles\.noFontPadding\}/,
      /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*className="shrink text-\[14px\] font-extrabold text-app-ink"[\s\S]*style=\{styles\.noFontPadding\}/,
      /noFontPadding: \{[\s\S]*includeFontPadding: false,/,
    ],
    excludes: [/min-w-\[58px\]/],
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
