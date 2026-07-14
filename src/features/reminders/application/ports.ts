import type { AppSettings } from '../../settings/domain/appSettings';
import type { CreateReminderDraft, Reminder } from '../domain/reminder';

export type ReminderNotificationIds = Pick<
  Reminder,
  'previousNotificationId' | 'targetNotificationId'
>;

export type ReminderNotificationFailureReason =
  | 'notification-permission-denied'
  | 'exact-alarm-permission-required'
  | 'target-time-passed'
  | 'scheduling-failed';

export type ReminderNotificationScheduleResult =
  | {
      status: 'scheduled';
      ids: ReminderNotificationIds;
    }
  | {
      status: 'partial';
      reason: 'previous-scheduling-failed';
      ids: ReminderNotificationIds;
    }
  | {
      status: 'not-scheduled';
      reason: ReminderNotificationFailureReason;
      ids: ReminderNotificationIds;
    };

export type ReminderNotificationScheduleOptions = {
  soundEnabled: boolean;
  permissionMode?: 'request' | 'check-only';
};

export type ReminderRepository = {
  listActive(now?: Date): Promise<Reminder[]>;
  listExpired(now?: Date): Promise<Reminder[]>;
  getById(id: string): Promise<Reminder | null>;
  insert(draft: CreateReminderDraft): Promise<Reminder>;
  updateNotificationIds(id: string, ids: ReminderNotificationIds): Promise<Reminder | null>;
  updateTitle(id: string, title: string): Promise<Reminder | null>;
  markExpired(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  deleteById(id: string): Promise<void>;
};

export type ReminderNotificationGateway = {
  schedule(
    reminder: Reminder,
    options: ReminderNotificationScheduleOptions,
  ): Promise<ReminderNotificationScheduleResult>;
  scheduleTest(
    reminder: Reminder,
    options: ReminderNotificationScheduleOptions,
  ): Promise<ReminderNotificationScheduleResult>;
  cancel(reminder: Reminder): Promise<void>;
};

export type ReminderSettingsGateway = {
  get(): Promise<AppSettings>;
};

export type WidgetSyncGateway = {
  sync(): Promise<void>;
};

export type ReminderApplicationDependencies = {
  reminders: ReminderRepository;
  notifications: ReminderNotificationGateway;
  settings: ReminderSettingsGateway;
  widget: WidgetSyncGateway;
};
