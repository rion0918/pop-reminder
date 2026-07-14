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
    /openQuickAdd\(quickAddPresets\[0\]\.time, \{ focusTitle: true \}\);/,
    /setSelectedReminderId\(/,
    /router\.setParams\(\{ action: undefined, id: undefined, intent: undefined \}\);/,
  ]);
  assertSourceContract(source, { excludes: [/useReminderUiStore/, /setTimeout\(\(\) =>/] });
});
