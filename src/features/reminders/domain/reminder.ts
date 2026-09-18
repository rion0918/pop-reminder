export type ReminderStatus = 'active' | 'expired';

export const REMINDER_TITLE_MAX_LENGTH = 40;

export type CreateReminderInput = {
  title: string;
  dateOffset: 0 | 1 | 2;
  customTargetDate?: string | null;
  targetTime: string;
  allDay?: boolean;
};

export type Reminder = {
  id: string;
  title: string;
  allDay?: boolean;
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
  'title' | 'allDay' | 'targetAt' | 'previousNotifyAt' | 'targetNotifyAt' | 'expiresAt'
>;

export function normalizeReminderTitle(title: string) {
  const normalized = title.trim();

  if (normalized.length < 1 || normalized.length > REMINDER_TITLE_MAX_LENGTH) {
    throw new Error(
      `Reminder title must contain between 1 and ${REMINDER_TITLE_MAX_LENGTH} characters`,
    );
  }

  return normalized;
}
