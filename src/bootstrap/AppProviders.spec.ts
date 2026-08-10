import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../test-utils/sourceAssertions';

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
    /共有する/,
    /共有しない/,
    /analyticsConsent === 'unknown'/,
  ]);
  assert.doesNotMatch(source, /PostHogProvider/);
  assert.doesNotMatch(source, /useGlobalSearchParams/);
  assert.doesNotMatch(source, /useLocalSearchParams/);
});

test('analytics consent persists before enabling capture and fails closed on errors', () => {
  assertSourceIncludes(source, [
    /const previousConsent = settingsQuery\.data\?\.analyticsConsent \?\? 'unknown';/,
    /let consentPersisted = false;/,
    /await settingsMutation\.mutateAsync\(\{ analyticsConsent: consent \}\);\s*consentPersisted = true;/,
    /await appServices\.analytics\.setCaptureEnabled\(true\)/,
    /catch \{\s*await appServices\.analytics\.setCaptureEnabled\(false\);/,
    /analyticsConsent: previousConsent/,
  ]);
});
