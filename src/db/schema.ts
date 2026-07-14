import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  targetAt: text('target_at').notNull(),
  previousNotifyAt: text('previous_notify_at').notNull(),
  targetNotifyAt: text('target_notify_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  previousNotificationId: text('previous_notification_id'),
  targetNotificationId: text('target_notification_id'),
  status: text('status', { enum: ['active', 'expired'] })
    .notNull()
    .default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(),
  previousNotifyTime: text('previous_notify_time').notNull().default('20:00'),
  defaultTargetTime: text('default_target_time').notNull().default('08:00'),
  noonTargetTime: text('noon_target_time').notNull().default('12:00'),
  eveningTargetTime: text('evening_target_time').notNull().default('18:00'),
  nightTargetTime: text('night_target_time').notNull().default('20:00'),
  autoDeleteEnabled: integer('auto_delete_enabled', { mode: 'boolean' }).notNull().default(true),
  notificationSoundEnabled: integer('notification_sound_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  theme: text('theme', { enum: ['sky', 'lavender', 'mint'] })
    .notNull()
    .default('sky'),
});

export type ReminderRow = typeof reminders.$inferSelect;
export type NewReminderRow = typeof reminders.$inferInsert;
export type AppSettingsRow = typeof appSettings.$inferSelect;
export type NewAppSettingsRow = typeof appSettings.$inferInsert;
