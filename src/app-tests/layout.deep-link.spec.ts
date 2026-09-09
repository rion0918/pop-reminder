import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, '../app/_layout.tsx');
const homeSource = readSource(import.meta.url, '../features/reminders/screens/HomeScreen.tsx');

test('widget deep links always land on home before opening add or detail UI', () => {
  assertSourceIncludes(source, [
    /import \{ Stack, useRouter \} from 'expo-router';/,
    /const router = useRouter\(\);/,
    /pathname: '\/',/,
    /action: intent\.action,/,
    /id: intent\.action === 'view' \? intent\.id : undefined,/,
    /createDeepLinkIntentBuffer/,
  ]);
  assertSourceIncludes(homeSource, [
    /useLocalSearchParams/,
    /requestQuickAdd\('widget_deep_link', \{ focusTitle: true \}\);/,
    /purchases\.getProAccessState\(\)/,
    /setSelectedReminderId\(/,
  ]);
  assertSourceContract(source, { excludes: [/useReminderUiStore/, /setTimeout\(\(\) =>/] });
});

test('home does not clear route params while a later widget intent may be arriving', () => {
  assertSourceContract(homeSource, {
    excludes: [/router\.setParams\(\{ action: undefined, id: undefined, intent: undefined \}\);/],
  });
});

test('widget intents wait for the mounted navigator before being published', () => {
  const prepareBlock = source.slice(
    source.indexOf('const prepare = useCallback'),
    source.indexOf("if (bootstrapState !== 'ready')"),
  );

  assertSourceIncludes(source, [
    /const navigationReadyRef = useRef\(false\);/,
    /const flushPendingIntent = useCallback\(\(\) => \{/,
    /if \(!navigationReadyRef\.current\) return;/,
    /navigationReadyRef\.current = true;/,
    /flushPendingIntent\(\);/,
  ]);
  assertSourceContract(prepareBlock, {
    excludes: [/intentBufferRef\.current\.consume\(\)/, /publishIntent\(pendingIntent\)/],
  });
});
