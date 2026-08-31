import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './AppProviders.tsx');

test('app resume retries pending reminder notifications without prompting for permission', () => {
  assertSourceIncludes(source, [
    /AppState\.addEventListener\('change'/,
    /state === 'active'/,
    /appServices\.reminders\.retryPendingNotifications\(\)/,
    /Failed to retry pending reminder notifications after app resume/,
  ]);
});

test('analytics tracks Expo Router pathnames manually only after the consent gate', () => {
  assertSourceIncludes(source, [
    /import \{ usePathname \} from 'expo-router';/,
    /const pathname = usePathname\(\);/,
    /const previousPathnameRef = useRef<string \| null>\(null\);/,
    /if \(previousPathnameRef\.current === pathname\) return;/,
    /appServices\.analytics\.captureScreen\(pathname\);/,
    /AnalyticsConsentGate/,
  ]);
  assertSourceContract(source, {
    excludes: [
      /PostHogProvider/,
      /useGlobalSearchParams/,
      /useLocalSearchParams/,
      /analyticsConsent/,
      /settingsQuery/,
      /<Modal/,
    ],
  });
});
