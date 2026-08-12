import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const homeSource = readSource(import.meta.url, './HomeScreen.tsx');
const listSource = readSource(import.meta.url, './ReminderListScreen.tsx');
const settingsSource = readSource(import.meta.url, '../../settings/screens/SettingsScreen.tsx');

test('home captures quick-add entry and successful reminder outcomes', () => {
  assertSourceIncludes(homeSource, [
    /const \{ analytics, notificationSettings, purchases \} = useAppServices\(\);/,
    /const datePreset = useReminderUiStore\(\(state\) => state\.datePreset\);/,
    /quickAddSourceRef\.current = source;/,
    /captureQuickAddOpened\(\{ source \}\)/,
    /captureProGateReached\(\{ source \}\)/,
    /captureProPaywallResult\(\{ placement: 'active_limit', outcome: result \}\)/,
    /const result = await createReminder\(/,
    /analytics\.captureReminderCreated\(/,
    /datePreset,/,
    /notificationStatus: result\.notification\.status/,
    /analytics\.captureReminderDeleted\(\{ surface: 'home', count: deletedIds\.length \}\)/,
    /analytics\.captureReminderDeleted\(\{ surface: 'home', count: 1 \}\)/,
    /analytics\.captureReminderEdited\(\{ surface: 'home', field: 'title' \}\)/,
    /if \(result\.notification\.status !== 'unchanged'\) \{[\s\S]*surface: 'home',[\s\S]*field: 'schedule'/,
  ]);
});

test('reminder list captures only successful edit and delete outcomes', () => {
  assertSourceIncludes(listSource, [
    /const analytics = useAppServices\(\)\.analytics;/,
    /const deleted = await deleteReminder\(reminder\.id\);[\s\S]*analytics\.captureReminderDeleted\(\{[\s\S]*surface: 'reminders_list',[\s\S]*count: 1/,
    /if \(result\.ok\) \{[\s\S]*analytics\.captureReminderDeleted\(\{[\s\S]*surface: 'reminders_list',[\s\S]*count: result\.deletedIds\.length/,
    /analytics\.captureReminderEdited\(\{[\s\S]*surface: 'reminders_list',[\s\S]*field: 'title'/,
    /if \(result\.notification\.status !== 'unchanged'\) \{[\s\S]*analytics\.captureReminderEdited\(\{[\s\S]*surface: 'reminders_list',[\s\S]*field: 'schedule'/,
  ]);
});

test('settings captures permission results and exposes persisted analytics consent controls', () => {
  assertSourceContract(settingsSource, {
    includes: [
      /const \{ reminders: reminderServices, analytics, purchases \} = useAppServices\(\);/,
      /const permission = await requestNotificationPermissions\(\);/,
      /analytics\.captureNotificationPermissionUpdated\(\{/,
      /status: permission\.status/,
      /canAskAgain: permission\.canAskAgain/,
      /settings\.analyticsConsent === 'granted'/,
      /const previousConsent = settings\.analyticsConsent;/,
      /const nextConsent = value \? 'granted' : 'denied';/,
      /await update\(\{ analyticsConsent: nextConsent \}\);\s*consentPersisted = true;/,
      /const enabled = await analytics\.setCaptureEnabled\(value\);/,
      /await analytics\.setCaptureEnabled\(false\)/,
      /if \(consentPersisted && previousConsent !== nextConsent\)/,
      /analyticsConsent: previousConsent/,
      /title="匿名の利用状況を共有"/,
      /value=\{isAnalyticsEnabled\}/,
      /captureProPaywallResult\(\{ placement: 'settings', outcome: result \}\)/,
      /captureProRestoreResult\(\{ outcome: result \}\)/,
    ],
    excludes: [
      /captureReminderCreated\([^)]*title/,
      /captureScreen\([^)]*routeParams/,
      /getDeletionRequestId/,
    ],
  });
});
