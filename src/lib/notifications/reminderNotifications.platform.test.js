/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('notification setup creates Android channels for audible and silent reminders', () => {
  const source = readFileSync(__dirname + '/reminderNotifications.ts', 'utf8');

  assert.match(source, /REMINDER_NOTIFICATION_CHANNEL_ID = 'reminder-alerts'/);
  assert.match(source, /SILENT_REMINDER_NOTIFICATION_CHANNEL_ID = 'reminder-silent'/);
  assert.match(source, /configureAndroidNotificationChannels/);
  assert.match(
    source,
    /Notifications\.setNotificationChannelAsync\(REMINDER_NOTIFICATION_CHANNEL_ID/,
  );
  assert.match(
    source,
    /Notifications\.setNotificationChannelAsync\(SILENT_REMINDER_NOTIFICATION_CHANNEL_ID/,
  );
});

test('scheduled Android reminder notifications select a channel from sound preference', () => {
  const source = readFileSync(__dirname + '/reminderNotifications.ts', 'utf8');

  assert.match(source, /getReminderNotificationChannelId\(soundEnabled\)/);
  assert.match(source, /channelId: getReminderNotificationChannelId\(soundEnabled\)/);
  assert.match(
    source,
    /type: Notifications\.SchedulableTriggerInputTypes\.DATE,[\s\S]*channelId: getReminderNotificationChannelId\(soundEnabled\)/,
  );
  assert.match(
    source,
    /type: Notifications\.SchedulableTriggerInputTypes\.TIME_INTERVAL,[\s\S]*channelId: getReminderNotificationChannelId\(soundEnabled\)/,
  );
});
