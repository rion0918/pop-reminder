import { z } from 'zod';

import { REMINDER_TITLE_MAX_LENGTH } from '../domain/reminder';

export { REMINDER_TITLE_MAX_LENGTH } from '../domain/reminder';

export const reminderTitleSchema = z
  .string()
  .trim()
  .min(1, 'タイトルを入力してください')
  .max(REMINDER_TITLE_MAX_LENGTH, 'タイトルは40文字以内で保存できます');

export const createReminderInputSchema = z.object({
  title: reminderTitleSchema,
  dateOffset: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  customTargetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  targetTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '時刻をHH:mm形式で入力してください'),
  allDay: z.boolean().optional().default(false),
});

export type CreateReminderInput = z.input<typeof createReminderInputSchema>;
