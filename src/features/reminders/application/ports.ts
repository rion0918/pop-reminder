import type { AppSettings } from '../../settings/domain/appSettings';
import type { ProAccessState } from '../../purchases/application/purchaseService';
import type { CreateReminderDraft, Reminder } from '../domain/reminder';

export type ReminderNotificationIds = Pick<
  Reminder,
  'previousNotificationId' | 'targetNotificationId'
>;

export type ReminderNotificationFailureReason =
  'notification-permission-denied' | 'target-time-passed' | 'scheduling-failed';

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

export type ReminderSingleNotificationScheduleResult =
  | {
      status: 'scheduled';
      notificationId: string;
    }
  | {
      status: 'skipped';
      reason: 'time-passed';
      notificationId: null;
    }
  | {
      status: 'not-scheduled';
      reason: 'notification-permission-denied' | 'scheduling-failed';
      notificationId: null;
    };

export type ReminderTargetScheduleUpdate = Pick<
  Reminder,
  'targetAt' | 'targetNotifyAt' | 'targetNotificationId'
>;

export type ReminderScheduleUpdate = Pick<
  Reminder,
  | 'targetAt'
  | 'previousNotifyAt'
  | 'targetNotifyAt'
  | 'expiresAt'
  | 'previousNotificationId'
  | 'targetNotificationId'
>;

export type ReminderPreviousScheduleUpdate = Pick<
  Reminder,
  'previousNotifyAt' | 'previousNotificationId'
>;

export type ReminderRepository = {
  listActive(now?: Date): Promise<Reminder[]>;
  listExpired(now?: Date): Promise<Reminder[]>;
  getById(id: string): Promise<Reminder | null>;
  insert(draft: CreateReminderDraft): Promise<Reminder>;
  updateNotificationIds(id: string, ids: ReminderNotificationIds): Promise<Reminder | null>;
  updateTitle(id: string, title: string): Promise<Reminder | null>;
  updateSchedule(id: string, update: ReminderScheduleUpdate): Promise<Reminder | null>;
  updateTargetSchedule(id: string, update: ReminderTargetScheduleUpdate): Promise<Reminder | null>;
  updatePreviousSchedule(
    id: string,
    update: ReminderPreviousScheduleUpdate,
  ): Promise<Reminder | null>;
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
  scheduleTarget(
    reminder: Reminder,
    options: ReminderNotificationScheduleOptions,
  ): Promise<ReminderSingleNotificationScheduleResult>;
  schedulePrevious(
    reminder: Reminder,
    options: ReminderNotificationScheduleOptions,
  ): Promise<ReminderSingleNotificationScheduleResult>;
  cancel(reminder: Reminder): Promise<void>;
  cancelOne(notificationId: string | null): Promise<void>;
};

export type ReminderSettingsGateway = {
  get(): Promise<AppSettings>;
  updatePreviousNotifyTime(previousNotifyTime: string): Promise<AppSettings>;
};

export type WidgetSyncGateway = {
  sync(): Promise<void>;
};

export type ProAccessGateway = {
  getState(): Promise<ProAccessState>;
};

export type ReminderApplicationDependencies = {
  reminders: ReminderRepository;
  notifications: ReminderNotificationGateway;
  settings: ReminderSettingsGateway;
  widget: WidgetSyncGateway;
  proAccess: ProAccessGateway;
};
