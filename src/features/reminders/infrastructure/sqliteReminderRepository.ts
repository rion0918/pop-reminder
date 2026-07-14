import { and, asc, eq, gt, inArray, lte } from 'drizzle-orm';

import { db } from '../../../db/client';
import { type NewReminderRow, type ReminderRow, reminders } from '../../../db/schema';
import { createId } from '../../../shared/utils/id';
import type { ReminderRepository } from '../application/ports';
import type { Reminder } from '../domain/reminder';

function toDomain(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    targetAt: row.targetAt,
    previousNotifyAt: row.previousNotifyAt,
    targetNotifyAt: row.targetNotifyAt,
    expiresAt: row.expiresAt,
    previousNotificationId: row.previousNotificationId,
    targetNotificationId: row.targetNotificationId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getById(id: string) {
  const rows = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
  return rows[0] ? toDomain(rows[0]) : null;
}

export const sqliteReminderRepository: ReminderRepository = {
  async listActive(now = new Date()) {
    const rows = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.status, 'active'), gt(reminders.targetNotifyAt, now.toISOString())))
      .orderBy(asc(reminders.targetAt));
    return rows.map(toDomain);
  },

  async listExpired(now = new Date()) {
    const rows = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.status, 'active'), lte(reminders.targetNotifyAt, now.toISOString())))
      .orderBy(asc(reminders.targetNotifyAt));
    return rows.map(toDomain);
  },

  getById,

  async insert(draft) {
    const now = new Date().toISOString();
    const row: NewReminderRow = {
      id: createId('reminder'),
      ...draft,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(reminders).values(row);
    return toDomain({
      ...row,
      previousNotificationId: null,
      targetNotificationId: null,
    } as ReminderRow);
  },

  async updateNotificationIds(id, notificationIds) {
    if (
      notificationIds.previousNotificationId === null &&
      notificationIds.targetNotificationId === null
    ) {
      return getById(id);
    }
    await db
      .update(reminders)
      .set({ ...notificationIds, updatedAt: new Date().toISOString() })
      .where(eq(reminders.id, id));
    return getById(id);
  },

  async updateTitle(id, title) {
    await db
      .update(reminders)
      .set({ title, updatedAt: new Date().toISOString() })
      .where(eq(reminders.id, id));
    return getById(id);
  },

  async updateTargetSchedule(id, update) {
    await db
      .update(reminders)
      .set({ ...update, updatedAt: new Date().toISOString() })
      .where(eq(reminders.id, id));
    return getById(id);
  },

  async updatePreviousSchedule(id, update) {
    await db
      .update(reminders)
      .set({ ...update, updatedAt: new Date().toISOString() })
      .where(eq(reminders.id, id));
    return getById(id);
  },

  async markExpired(id) {
    await db
      .update(reminders)
      .set({ status: 'expired', updatedAt: new Date().toISOString() })
      .where(eq(reminders.id, id));
  },

  async deleteMany(ids) {
    if (ids.length > 0) await db.delete(reminders).where(inArray(reminders.id, ids));
  },

  async deleteById(id) {
    await db.delete(reminders).where(eq(reminders.id, id));
  },
};
