import { and, asc, eq, gt, inArray, lte } from 'drizzle-orm';

import { db } from '../../../db/client';
import { NewReminderRow, reminders } from '../../../db/schema';
import { createId } from '../../../shared/utils/id';
import { CreateReminderDraft, Reminder } from '../types/reminder';

export async function listActiveReminders(now = new Date()): Promise<Reminder[]> {
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.status, 'active'), gt(reminders.expiresAt, now.toISOString())))
    .orderBy(asc(reminders.targetAt));
}

export async function listExpiredReminders(now = new Date()): Promise<Reminder[]> {
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.status, 'active'), lte(reminders.expiresAt, now.toISOString())))
    .orderBy(asc(reminders.expiresAt));
}

export async function insertReminder(draft: CreateReminderDraft): Promise<Reminder> {
  const now = new Date().toISOString();
  const row: NewReminderRow = {
    id: createId('reminder'),
    title: draft.title,
    targetAt: draft.targetAt,
    previousNotifyAt: draft.previousNotifyAt,
    targetNotifyAt: draft.targetNotifyAt,
    expiresAt: draft.expiresAt,
    previousNotificationId: null,
    targetNotificationId: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(reminders).values(row);

  return row as Reminder;
}

export async function updateReminderNotificationIds(
  id: string,
  notificationIds: {
    previousNotificationId: string | null;
    targetNotificationId: string | null;
  },
): Promise<Reminder | null> {
  const now = new Date().toISOString();

  await db
    .update(reminders)
    .set({
      previousNotificationId: notificationIds.previousNotificationId,
      targetNotificationId: notificationIds.targetNotificationId,
      updatedAt: now,
    })
    .where(eq(reminders.id, id));

  return getReminderById(id);
}

export async function markReminderExpired(id: string) {
  await db
    .update(reminders)
    .set({ status: 'expired', updatedAt: new Date().toISOString() })
    .where(eq(reminders.id, id));
}

export async function deleteReminders(ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  await db.delete(reminders).where(inArray(reminders.id, ids));
}

export async function deleteReminderById(id: string) {
  await db.delete(reminders).where(eq(reminders.id, id));
}

export async function getReminderById(id: string): Promise<Reminder | null> {
  const rows = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);

  return rows[0] ?? null;
}
