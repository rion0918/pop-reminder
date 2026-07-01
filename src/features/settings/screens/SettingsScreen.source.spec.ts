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
      /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*style=\{\[styles\.themeLabel, active \? styles\.themeLabelActive : null\]\}/,
      /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*style=\{styles\.notificationButtonText\}/,
      /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*style=\{styles\.devButtonText\}/,
      /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.72\}[\s\S]*style=\{styles\.cancelButtonText\}/,
      /themeRow: \{[\s\S]*flexShrink: 1,[\s\S]*minWidth: 0,/,
      /themeRow: \{[\s\S]*width: '100%',/,
      /themeButton: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/,
      /themeLabel: \{[\s\S]*fontSize: 11,[\s\S]*includeFontPadding: false,/,
      /notificationButtonText: \{[\s\S]*flexShrink: 1,[\s\S]*includeFontPadding: false,/,
      /devButtonText: \{[\s\S]*flexShrink: 1,[\s\S]*includeFontPadding: false,/,
      /cancelButtonText: \{[\s\S]*flexShrink: 1,[\s\S]*includeFontPadding: false,/,
    ],
    excludes: [/themeButton: \{[\s\S]*minWidth: 58,/],
  });
});

test('legal modal header keeps close button reachable on compact widths', () => {
  assertSourceIncludes(source, [
    /<View style=\{styles\.legalModalCopy\}>/,
    /<Text numberOfLines=\{2\} style=\{styles\.legalModalTitle\}>/,
    /<Text numberOfLines=\{1\} style=\{styles\.legalModalUpdated\}>/,
    /legalModalCopy: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/,
    /legalCloseButton: \{[\s\S]*flexShrink: 0,/,
  ]);
});
