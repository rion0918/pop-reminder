import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './appServices.ts');

test('bootstrap injects settings adapters without owning the theme workflow', () => {
  assertSourceIncludes(source, [
    /createSettingsUseCases/,
    /settings: sqliteSettingsRepository/,
    /widget: widgetGateway/,
    /analytics: posthogAnalytics/,
  ]);
  assertSourceContract(source, {
    excludes: [/const settingsService/, /input\.theme/, /analyticsConsent/],
  });
});
