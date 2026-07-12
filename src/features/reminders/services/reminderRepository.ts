import { and, asc, eq, gt, inArray, lte } from 'drizzle-orm';

import { db } from '../../../db/client';
import { type NewReminderRow, reminders } from '../../../db/schema';
import { createId } from '../../../shared/utils/id';
import type { CreateReminderDraft, Reminder } from '../types/reminder';

export async function listActiveReminders(now = new Date()): Promise<Reminder[]> {
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.status, 'active'), gt(reminders.targetNotifyAt, now.toISOString())))
    .orderBy(asc(reminders.targetAt));
}

export async function listExpiredReminders(now = new Date()): Promise<Reminder[]> {
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.status, 'active'), lte(reminders.targetNotifyAt, now.toISOString())))
    .orderBy(asc(reminders.targetNotifyAt));
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
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  const reminder: Reminder = {
    ...row,
    previousNotificationId: null,
    targetNotificationId: null,
  } as Reminder;

  await db.insert(reminders).values(row);

  return reminder;
}

export async function updateReminderNotificationIds(
  id: string,
  notificationIds: {
    previousNotificationId: string | null;
    targetNotificationId: string | null;
  },
): Promise<Reminder | null> {
  if (
    notificationIds.previousNotificationId === null &&
    notificationIds.targetNotificationId === null
  ) {
    return getReminderById(id);
  }

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

export async function updateReminderTitleById(id: string, title: string): Promise<Reminder | null> {
  await db
    .update(reminders)
    .set({
      title,
      updatedAt: new Date().toISOString(),
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
