import * as Notifications from 'expo-notifications';

import { Reminder } from '../types/reminder';

type NotificationIds = {
  previousNotificationId: string | null;
  targetNotificationId: string | null;
};

type ReminderNotificationTarget = Pick<
  Reminder,
  'id' | 'title' | 'previousNotifyAt' | 'targetNotifyAt'
>;

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }) as Notifications.NotificationBehavior,
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
}: {
  title: string;
  body: string;
  date?: Date;
  seconds?: number;
  reminderId: string;
}) {
  if (seconds !== undefined) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
        data: {
          reminderId,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
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
      sound: false,
      data: {
        reminderId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

async function hasNotificationPermission() {
  const permission = await requestNotificationPermissions();

  return permission.status === 'granted';
}

export async function scheduleReminderNotifications(
  reminder: ReminderNotificationTarget,
): Promise<NotificationIds> {
  const hasPermission = await hasNotificationPermission();

  if (!hasPermission) {
    return {
      previousNotificationId: null,
      targetNotificationId: null,
    };
  }

  const previousNotificationId = await scheduleIfFuture({
    title: '明日の持ちもの',
    body: `「${reminder.title}」をふわっと残しています`,
    date: new Date(reminder.previousNotifyAt),
    reminderId: reminder.id,
  });

  const targetNotificationId = await scheduleIfFuture({
    title: 'ポップ・リマインダー',
    body: `「${reminder.title}」の時間です`,
    date: new Date(reminder.targetNotifyAt),
    reminderId: reminder.id,
  });

  return {
    previousNotificationId,
    targetNotificationId,
  };
}

export async function scheduleTestReminderNotifications(
  reminder: Pick<Reminder, 'id' | 'title'>,
): Promise<NotificationIds> {
  if (!__DEV__) {
    return {
      previousNotificationId: null,
      targetNotificationId: null,
    };
  }

  const hasPermission = await hasNotificationPermission();

  if (!hasPermission) {
    return {
      previousNotificationId: null,
      targetNotificationId: null,
    };
  }

  const previousNotificationId = await scheduleIfFuture({
    title: '通知テスト 前日',
    body: `「${reminder.title}」の前日通知テストです`,
    seconds: 10,
    reminderId: reminder.id,
  });

  const targetNotificationId = await scheduleIfFuture({
    title: '通知テスト 当日',
    body: `「${reminder.title}」の当日通知テストです`,
    seconds: 20,
    reminderId: reminder.id,
  });

  return {
    previousNotificationId,
    targetNotificationId,
  };
}

export async function cancelReminderNotifications(reminder: Reminder) {
  const ids = [reminder.previousNotificationId, reminder.targetNotificationId].filter(Boolean);

  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id as string).catch((error) => {
        console.warn('Failed to cancel notification', error);
      }),
    ),
  );
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
