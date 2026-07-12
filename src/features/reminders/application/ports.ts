import type { AppSettings } from '../../settings/domain/appSettings';
import type { CreateReminderDraft, Reminder } from '../domain/reminder';

export type ReminderNotificationIds = Pick<
  Reminder,
  'previousNotificationId' | 'targetNotificationId'
>;

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
    options: { soundEnabled: boolean },
  ): Promise<ReminderNotificationIds>;
  scheduleTest(
    reminder: Reminder,
    options: { soundEnabled: boolean },
  ): Promise<ReminderNotificationIds>;
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
