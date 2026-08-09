import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './appInitialization.ts');
const layoutSource = readSource(import.meta.url, '../app/_layout.tsx');

test('bootstrap owns native setup and persisted data preparation', () => {
  assertSourceIncludes(source, [
    /configureNotificationHandler\(\);/,
    /return configureAndroidNotificationChannels\(\)\.catch/,
    /await initializeDatabase\(\);\s+await appServices\.reminders\.cleanup\(\);/,
    /await appServices\.reminders\.retryPendingNotifications\(\);/,
  ]);
});

test('root layout delegates runtime and data initialization to bootstrap', () => {
  assertSourceIncludes(layoutSource, [
    /import \{ configureAppRuntime, prepareAppData \} from '\.\.\/bootstrap\/appInitialization';/,
    /await configureAppRuntime\(\);\s+await prepareAppData\(\);/,
  ]);
});
