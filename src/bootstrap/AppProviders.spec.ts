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

test('PostHog tracks Expo Router pathnames manually without route parameters', () => {
  assertSourceIncludes(source, [
    /import \{ usePathname \} from 'expo-router';/,
    /import \{ PostHogProvider \} from 'posthog-react-native';/,
    /const pathname = usePathname\(\);/,
    /const previousPathnameRef = useRef<string \| null>\(null\);/,
    /if \(previousPathnameRef\.current === pathname\) return;/,
    /appServices\.analytics\.captureScreen\(pathname\);/,
    /autocapture=\{false\}/,
  ]);
  assert.doesNotMatch(source, /useGlobalSearchParams/);
  assert.doesNotMatch(source, /useLocalSearchParams/);
});
