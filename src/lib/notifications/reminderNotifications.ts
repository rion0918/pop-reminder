import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type {
  ReminderNotificationGateway,
  ReminderNotificationFailureReason,
  ReminderNotificationScheduleOptions,
  ReminderNotificationScheduleResult,
  ReminderSingleNotificationScheduleResult,
} from '../../features/reminders/application/ports';
import type { Reminder } from '../../features/reminders/domain/reminder';

type ReminderNotificationTarget = Pick<
  Reminder,
  'id' | 'title' | 'previousNotifyAt' | 'targetNotifyAt'
>;

export const REMINDER_NOTIFICATION_CHANNEL_ID = 'reminder-alerts';
const LEGACY_SILENT_REMINDER_NOTIFICATION_CHANNEL_ID = 'reminder-silent';

type ScheduleNotificationInput = {
  title: string;
  body: string;
  date?: Date;
  seconds?: number;
  reminderId: string;
};

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      return {
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      } as Notifications.NotificationBehavior;
    },
  });
}

export async function configureAndroidNotificationChannels() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_NOTIFICATION_CHANNEL_ID, {
    name: 'リマインダー',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'リマインダーのお知らせを届けます。音とバイブレーションは端末設定に従います',
    sound: 'default',
    enableVibrate: true,
    showBadge: false,
  });
}

export async function getNotificationPermissionStatus() {
  const permission = await Notifications.getPermissionsAsync();

  if (permission.status === 'granted') {
    return {
      status: permission.status,
      label: '許可済み',
      canAskAgain: permission.canAskAgain,
    };
  }

  if (permission.status === 'denied') {
    return {
      status: permission.status,
      label: '未許可',
      canAskAgain: permission.canAskAgain,
    };
  }

  return {
    status: permission.status,
    label: '確認が必要',
    canAskAgain: permission.canAskAgain,
  };
}

export async function requestNotificationPermissions() {
  const current = await Notifications.getPermissionsAsync();

  if (current.status === 'granted') {
    return current;
  }

  return Notifications.requestPermissionsAsync();
}

async function scheduleIfFuture({
  title,
  body,
  date,
  reminderId,
  seconds,
}: ScheduleNotificationInput) {
  if (seconds !== undefined) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { reminderId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
      },
    });
  }

  if (!date) {
    return null;
  }

  if (date.getTime() <= Date.now()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { reminderId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
    },
  });
}

function notScheduled(
  reason: ReminderNotificationFailureReason,
): ReminderNotificationScheduleResult {
  return {
    status: 'not-scheduled',
    reason,
    ids: {
      previousNotificationId: null,
      targetNotificationId: null,
    },
  };
}

async function getSchedulingBlockReason(
  permissionMode: ReminderNotificationScheduleOptions['permissionMode'] = 'request',
): Promise<
  Extract<ReminderSingleNotificationScheduleResult, { status: 'not-scheduled' }>['reason'] | null
> {
  const permission =
    permissionMode === 'check-only'
      ? await Notifications.getPermissionsAsync()
      : await requestNotificationPermissions();

  if (permission.status !== 'granted') {
    return 'notification-permission-denied';
  }

  return null;
}

function singleNotificationNotScheduled(
  reason: Extract<ReminderSingleNotificationScheduleResult, { status: 'not-scheduled' }>['reason'],
): ReminderSingleNotificationScheduleResult {
  return { status: 'not-scheduled', reason, notificationId: null };
}

export async function scheduleTargetReminderNotification(
  reminder: ReminderNotificationTarget,
  options: ReminderNotificationScheduleOptions = {},
): Promise<ReminderSingleNotificationScheduleResult> {
  const targetDate = new Date(reminder.targetNotifyAt);
  if (targetDate.getTime() <= Date.now()) {
    return { status: 'skipped', reason: 'time-passed', notificationId: null };
  }

  const blockReason = await getSchedulingBlockReason(options.permissionMode);
  if (blockReason) {
    return singleNotificationNotScheduled(blockReason);
  }

  try {
    const notificationId = await scheduleIfFuture({
      title: 'ふわっと。',
      body: `「${reminder.title}」の時間をお知らせします`,
      date: targetDate,
      reminderId: reminder.id,
    });
    return notificationId
      ? { status: 'scheduled', notificationId }
      : { status: 'skipped', reason: 'time-passed', notificationId: null };
  } catch (error) {
    console.warn('Failed to schedule target notification', error);
    return singleNotificationNotScheduled('scheduling-failed');
  }
}

export async function schedulePreviousReminderNotification(
  reminder: ReminderNotificationTarget,
  options: ReminderNotificationScheduleOptions = {},
): Promise<ReminderSingleNotificationScheduleResult> {
  const previousDate = new Date(reminder.previousNotifyAt);
  if (previousDate.getTime() <= Date.now()) {
    return { status: 'skipped', reason: 'time-passed', notificationId: null };
  }

  const blockReason = await getSchedulingBlockReason(options.permissionMode);
  if (blockReason) {
    return singleNotificationNotScheduled(blockReason);
  }

  try {
    const notificationId = await scheduleIfFuture({
      title: '前日のお知らせ',
      body: `明日の「${reminder.title}」をふわっと残しています`,
      date: previousDate,
      reminderId: reminder.id,
    });
    return notificationId
      ? { status: 'scheduled', notificationId }
      : { status: 'skipped', reason: 'time-passed', notificationId: null };
  } catch (error) {
    console.warn('Failed to schedule previous notification', error);
    return singleNotificationNotScheduled('scheduling-failed');
  }
}

export async function scheduleReminderNotifications(
  reminder: ReminderNotificationTarget,
  options: ReminderNotificationScheduleOptions = {},
): Promise<ReminderNotificationScheduleResult> {
  const targetDate = new Date(reminder.targetNotifyAt);
  if (targetDate.getTime() <= Date.now()) {
    return notScheduled('target-time-passed');
  }

  const blockReason = await getSchedulingBlockReason(options.permissionMode);
  if (blockReason) {
    return notScheduled(blockReason);
  }

  let targetNotificationId: string | null;
  try {
    targetNotificationId = await scheduleIfFuture({
      title: 'ふわっと。',
      body: `「${reminder.title}」の時間をお知らせします`,
      date: targetDate,
      reminderId: reminder.id,
    });
  } catch (error) {
    console.warn('Failed to schedule target notification', error);
    return notScheduled('scheduling-failed');
  }

  if (!targetNotificationId) {
    return notScheduled('target-time-passed');
  }

  let previousNotificationId: string | null;
  try {
    previousNotificationId = await scheduleIfFuture({
      title: '前日のお知らせ',
      body: `明日の「${reminder.title}」をふわっと残しています`,
      date: new Date(reminder.previousNotifyAt),
      reminderId: reminder.id,
    });
  } catch (error) {
    console.warn('Failed to schedule previous notification', error);
    return {
      status: 'partial',
      reason: 'previous-scheduling-failed',
      ids: { previousNotificationId: null, targetNotificationId },
    };
  }

  return {
    status: 'scheduled',
    ids: { previousNotificationId, targetNotificationId },
  };
}

export async function scheduleTestReminderNotifications(
  reminder: Pick<Reminder, 'id' | 'title'>,
  options: ReminderNotificationScheduleOptions = {},
): Promise<ReminderNotificationScheduleResult> {
  if (!__DEV__) {
    return notScheduled('scheduling-failed');
  }

  const blockReason = await getSchedulingBlockReason(options.permissionMode);
  if (blockReason) {
    return notScheduled(blockReason);
  }

  let targetNotificationId: string | null;
  try {
    targetNotificationId = await scheduleIfFuture({
      title: '通知テスト 当日',
      body: `「${reminder.title}」の当日通知テストです`,
      seconds: 20,
      reminderId: reminder.id,
    });
  } catch (error) {
    console.warn('Failed to schedule target test notification', error);
    return notScheduled('scheduling-failed');
  }

  if (!targetNotificationId) {
    return notScheduled('scheduling-failed');
  }

  try {
    const previousNotificationId = await scheduleIfFuture({
      title: '通知テスト 前日',
      body: `「${reminder.title}」の前日通知テストです`,
      seconds: 10,
      reminderId: reminder.id,
    });
    return {
      status: 'scheduled',
      ids: { previousNotificationId, targetNotificationId },
    };
  } catch (error) {
    console.warn('Failed to schedule previous test notification', error);
    return {
      status: 'partial',
      reason: 'previous-scheduling-failed',
      ids: { previousNotificationId: null, targetNotificationId },
    };
  }
}

export async function cancelReminderNotifications(reminder: Reminder) {
  const ids = [reminder.previousNotificationId, reminder.targetNotificationId].filter(Boolean);

  await Promise.all(ids.map((id) => cancelScheduledReminderNotification(id as string)));
}

export async function cancelScheduledReminderNotification(notificationId: string | null) {
  if (!notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId).catch((error) => {
    console.warn('Failed to cancel notification', error);
  });
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getLegacyScheduledNotificationIds(
  notificationIds: (string | null)[],
): Promise<Set<string>> {
  const candidateIds = new Set(notificationIds.filter((id): id is string => id !== null));
  if (candidateIds.size === 0) {
    return new Set();
  }

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  return new Set(
    scheduledNotifications
      .filter((notification) => candidateIds.has(notification.identifier))
      .filter((notification) => {
        const trigger = notification.trigger;
        return (
          trigger !== null &&
          typeof trigger === 'object' &&
          'channelId' in trigger &&
          trigger.channelId === LEGACY_SILENT_REMINDER_NOTIFICATION_CHANNEL_ID
        );
      })
      .map((notification) => notification.identifier),
  );
}

export const reminderNotificationGateway: ReminderNotificationGateway = {
  schedule: scheduleReminderNotifications,
  scheduleTest: scheduleTestReminderNotifications,
  scheduleTarget: scheduleTargetReminderNotification,
  schedulePrevious: schedulePreviousReminderNotification,
  getLegacyScheduledNotificationIds,
  cancel: cancelReminderNotifications,
  cancelOne: cancelScheduledReminderNotification,
};
