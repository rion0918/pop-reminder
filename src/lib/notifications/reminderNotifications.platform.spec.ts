import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './reminderNotifications.ts');

test('scheduled notifications use the fuwatto display name', () => {
  assert.equal(source.match(/title: 'ふわっと。'/g)?.length, 2);
  assert.equal(source.includes("title: 'ポップ・リマインダー'"), false);
});

test('notification setup uses one OS-controlled Android channel', () => {
  assertSourceIncludes(source, [
    /REMINDER_NOTIFICATION_CHANNEL_ID = 'reminder-alerts'/,
    /configureAndroidNotificationChannels/,
    /Notifications\.setNotificationChannelAsync\(REMINDER_NOTIFICATION_CHANNEL_ID/,
  ]);
  assert.equal(source.includes("setNotificationChannelAsync('reminder-silent'"), false);
  assert.equal(source.includes('通知音なし'), false);
});

test('scheduled notifications delegate sound behavior to the OS settings', () => {
  assertSourceIncludes(source, [
    /shouldPlaySound: true/,
    /sound: true/,
    /channelId: REMINDER_NOTIFICATION_CHANNEL_ID/,
  ]);
  assert.equal(source.includes('soundEnabled'), false);
});

test('legacy silent-channel notifications can be identified for migration', () => {
  assertSourceIncludes(source, [
    /getLegacyScheduledNotificationIds/,
    /Notifications\.getAllScheduledNotificationsAsync\(\)/,
    /reminder-silent/,
  ]);
});

test('notification scheduling reports permission and native scheduling failures', () => {
  assertSourceIncludes(source, [
    /notification-permission-denied/,
    /target-time-passed/,
    /scheduling-failed/,
    /previous-scheduling-failed/,
    /permissionMode/,
  ]);
  assert.equal(source.includes('exact-alarm-permission-required'), false);
});

test('target notification is scheduled before the optional previous notification', () => {
  const targetIndex = source.indexOf('targetNotificationId = await scheduleIfFuture');
  const previousIndex = source.indexOf('previousNotificationId = await scheduleIfFuture');

  assert.equal(targetIndex >= 0, true);
  assert.equal(previousIndex > targetIndex, true);
});

test('notification gateway can replace target and previous notifications independently', () => {
  assertSourceIncludes(source, [
    /scheduleTargetReminderNotification/,
    /schedulePreviousReminderNotification/,
    /cancelScheduledReminderNotification/,
    /scheduleTarget: scheduleTargetReminderNotification/,
    /schedulePrevious: schedulePreviousReminderNotification/,
    /cancelOne: cancelScheduledReminderNotification/,
  ]);
});
