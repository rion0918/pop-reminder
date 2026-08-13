import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './appServices.ts');

test('persisting an app theme immediately refreshes the android widget', () => {
  assertSourceIncludes(source, [
    /const settingsService/,
    /await sqliteSettingsRepository\.update\(input\)/,
    /if \(input\.theme !== undefined\)/,
    /await widgetGateway\.sync\(\)/,
    /settings: settingsService/,
  ]);
});
