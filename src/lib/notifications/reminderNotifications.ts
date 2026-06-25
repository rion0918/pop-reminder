import * as Notifications from 'expo-notifications';

import { Reminder } from '../../features/reminders/types/reminder';

type NotificationIds = {
  previousNotificationId: string | null;
  targetNotificationId: string | null;
};

type ReminderNotificationTarget = Pick<
  Reminder,
  'id' | 'title' | 'previousNotifyAt' | 'targetNotifyAt'
>;

type ScheduleNotificationInput = {
  title: string;
  body: string;
  date?: Date;
  seconds?: number;
  reminderId: string;
  soundEnabled?: boolean;
};

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const soundEnabled = notification.request.content.data?.soundEnabled === true;

      return {
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: soundEnabled,
        shouldSetBadge: false,
      } as Notifications.NotificationBehavior;
    },
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
  soundEnabled,
}: ScheduleNotificationInput) {
  if (seconds !== undefined) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: soundEnabled ? true : false,
        data: {
          reminderId,
          soundEnabled: Boolean(soundEnabled),
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
      sound: soundEnabled ? true : false,
      data: {
        reminderId,
        soundEnabled: Boolean(soundEnabled),
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

async function scheduleIfFutureSafely(input: ScheduleNotificationInput) {
  try {
    return await scheduleIfFuture(input);
  } catch (error) {
    console.warn('Failed to schedule notification', error);
    return null;
  }
}

async function hasNotificationPermission() {
  const permission = await requestNotificationPermissions();

  return permission.status === 'granted';
}

export async function scheduleReminderNotifications(
  reminder: ReminderNotificationTarget,
  options?: { soundEnabled?: boolean },
): Promise<NotificationIds> {
  const hasPermission = await hasNotificationPermission();

  if (!hasPermission) {
    return {
      previousNotificationId: null,
      targetNotificationId: null,
    };
  }

  const previousNotificationId = await scheduleIfFutureSafely({
    title: '前日のお知らせ',
    body: `明日の「${reminder.title}」をふわっと残しています`,
    date: new Date(reminder.previousNotifyAt),
    reminderId: reminder.id,
    soundEnabled: options?.soundEnabled,
  });

  const targetNotificationId = await scheduleIfFutureSafely({
    title: 'ポップ・リマインダー',
    body: `「${reminder.title}」の時間をお知らせします`,
    date: new Date(reminder.targetNotifyAt),
    reminderId: reminder.id,
    soundEnabled: options?.soundEnabled,
  });

  return {
    previousNotificationId,
    targetNotificationId,
  };
}

export async function scheduleTestReminderNotifications(
  reminder: Pick<Reminder, 'id' | 'title'>,
  options?: { soundEnabled?: boolean },
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

  const previousNotificationId = await scheduleIfFutureSafely({
    title: '通知テスト 前日',
    body: `「${reminder.title}」の前日通知テストです`,
    seconds: 10,
    reminderId: reminder.id,
    soundEnabled: options?.soundEnabled,
  });

  const targetNotificationId = await scheduleIfFutureSafely({
    title: '通知テスト 当日',
    body: `「${reminder.title}」の当日通知テストです`,
    seconds: 20,
    reminderId: reminder.id,
    soundEnabled: options?.soundEnabled,
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
