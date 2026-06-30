/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('widget deep links always land on home before opening add or detail UI', () => {
  const source = readFileSync(__dirname + '/../app/_layout.tsx', 'utf8');
  const addBlock = source.slice(
    source.indexOf("parsed.queryParams?.action === 'add'"),
    source.indexOf("parsed.queryParams?.action === 'view'"),
  );
  const viewBlock = source.slice(
    source.indexOf("parsed.queryParams?.action === 'view'"),
    source.indexOf('},', source.indexOf("parsed.queryParams?.action === 'view'")),
  );

  assert.match(source, /import \{ Stack, useRouter \} from 'expo-router';/);
  assert.match(source, /const router = useRouter\(\);/);
  assert.match(addBlock, /router\.replace\('\/'\);[\s\S]*openQuickAdd\('08:00'\);/);
  assert.match(viewBlock, /router\.replace\('\/'\);[\s\S]*setSelectedReminderId\(id\);/);
  assert.match(source, /\[openQuickAdd, router, setSelectedReminderId, ready\]/);
});
