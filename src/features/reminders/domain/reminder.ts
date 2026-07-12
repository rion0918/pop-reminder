export type ReminderStatus = 'active' | 'expired';

export type Reminder = {
  id: string;
  title: string;
  targetAt: string;
  previousNotifyAt: string;
  targetNotifyAt: string;
  expiresAt: string;
  previousNotificationId: string | null;
  targetNotificationId: string | null;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateReminderDraft = Pick<
  Reminder,
  'title' | 'targetAt' | 'previousNotifyAt' | 'targetNotifyAt' | 'expiresAt'
>;

export function normalizeReminderTitle(title: string) {
  const normalized = title.trim();

  if (normalized.length < 1 || normalized.length > 40) {
    throw new Error('Reminder title must contain between 1 and 40 characters');
  }

  return normalized;
}
