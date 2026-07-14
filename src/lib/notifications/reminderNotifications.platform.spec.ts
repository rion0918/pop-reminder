import assert from 'node:assert/strict';
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

test('notification scheduling reports permission and native scheduling failures', () => {
  assertSourceIncludes(source, [
    /notification-permission-denied/,
    /exact-alarm-permission-required/,
    /target-time-passed/,
    /scheduling-failed/,
    /previous-scheduling-failed/,
    /permissionMode/,
  ]);
});

test('target notification is scheduled before the optional previous notification', () => {
  const targetIndex = source.indexOf('targetNotificationId = await scheduleIfFuture');
  const previousIndex = source.indexOf('previousNotificationId = await scheduleIfFuture');

  assert.equal(targetIndex >= 0, true);
  assert.equal(previousIndex > targetIndex, true);
});
