import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './reminderNotifications.ts');

test('notification setup creates Android channels for audible and silent reminders', () => {
  assertSourceIncludes(source, [
    /REMINDER_NOTIFICATION_CHANNEL_ID = 'reminder-alerts'/,
    /SILENT_REMINDER_NOTIFICATION_CHANNEL_ID = 'reminder-silent'/,
    /configureAndroidNotificationChannels/,
    /Notifications\.setNotificationChannelAsync\(REMINDER_NOTIFICATION_CHANNEL_ID/,
    /Notifications\.setNotificationChannelAsync\(SILENT_REMINDER_NOTIFICATION_CHANNEL_ID/,
  ]);
});

test('scheduled Android reminder notifications select a channel from sound preference', () => {
  assertSourceIncludes(source, [
    /getReminderNotificationChannelId\(soundEnabled\)/,
    /channelId: getReminderNotificationChannelId\(soundEnabled\)/,
    /type: Notifications\.SchedulableTriggerInputTypes\.DATE,[\s\S]*channelId: getReminderNotificationChannelId\(soundEnabled\)/,
    /type: Notifications\.SchedulableTriggerInputTypes\.TIME_INTERVAL,[\s\S]*channelId: getReminderNotificationChannelId\(soundEnabled\)/,
  ]);
});
