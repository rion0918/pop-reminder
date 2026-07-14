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
