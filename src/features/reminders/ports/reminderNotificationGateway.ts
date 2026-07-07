import type { Reminder } from '../types/reminder';

export type ReminderNotificationIds = {
  previousNotificationId: string | null;
  targetNotificationId: string | null;
};

export type ReminderNotificationTarget = Pick<
  Reminder,
  'id' | 'title' | 'previousNotifyAt' | 'targetNotifyAt'
>;

export type ReminderNotificationOptions = {
  soundEnabled?: boolean;
};

export type ReminderNotificationGateway = {
  scheduleReminderNotifications: (
    reminder: ReminderNotificationTarget,
    options?: ReminderNotificationOptions,
  ) => Promise<ReminderNotificationIds>;
  scheduleTestReminderNotifications: (
    reminder: Pick<Reminder, 'id' | 'title'>,
    options?: ReminderNotificationOptions,
  ) => Promise<ReminderNotificationIds>;
  cancelReminderNotifications: (reminder: Reminder) => Promise<void>;
};
