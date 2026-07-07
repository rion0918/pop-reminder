import type { ReminderRow } from '../../../db/schema';

export type ReminderStatus = 'active' | 'expired';

export type Reminder = ReminderRow;

export type CreateReminderDraft = {
  title: string;
  targetAt: string;
  previousNotifyAt: string;
  targetNotifyAt: string;
  expiresAt: string;
};
