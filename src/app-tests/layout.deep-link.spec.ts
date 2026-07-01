import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, '../app/_layout.tsx');

test('widget deep links always land on home before opening add or detail UI', () => {
  const addBlock = source.slice(
    source.indexOf("parsed.queryParams?.action === 'add'"),
    source.indexOf("parsed.queryParams?.action === 'view'"),
  );
  const viewBlock = source.slice(
    source.indexOf("parsed.queryParams?.action === 'view'"),
    source.indexOf('},', source.indexOf("parsed.queryParams?.action === 'view'")),
  );

  assertSourceIncludes(source, [
    /import \{ Stack, useRouter \} from 'expo-router';/,
    /const router = useRouter\(\);/,
    /\[openQuickAdd, router, setSelectedReminderId, ready\]/,
  ]);
  assertSourceIncludes(addBlock, [/router\.replace\('\/'\);[\s\S]*openQuickAdd\('08:00'\);/]);
  assertSourceIncludes(viewBlock, [/router\.replace\('\/'\);[\s\S]*setSelectedReminderId\(id\);/]);
});
