import { eq } from 'drizzle-orm';

import { db } from '../../../db/client';
import { appSettings, type AppSettingsRow, type NewAppSettingsRow } from '../../../db/schema';
import { coerceTheme, isTimeString } from '../../../shared/utils/time';
import type { SettingsRepository } from '../application/settingsRepository';
import type { AppSettings } from '../domain/appSettings';

const DEFAULT_SETTINGS_ID = 'default';
const defaultSettings: NewAppSettingsRow = {
  id: DEFAULT_SETTINGS_ID,
  previousNotifyTime: '20:00',
  defaultTargetTime: '08:00',
  autoDeleteEnabled: true,
  notificationSoundEnabled: true,
  theme: 'sky',
};

function toDomain(row: AppSettingsRow): AppSettings {
  return {
    id: row.id,
    previousNotifyTime: row.previousNotifyTime,
    defaultTargetTime: row.defaultTargetTime,
    autoDeleteEnabled: row.autoDeleteEnabled,
    notificationSoundEnabled: row.notificationSoundEnabled,
    theme: coerceTheme(row.theme),
  };
}

async function get() {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, DEFAULT_SETTINGS_ID))
    .limit(1);
  if (rows[0]) return toDomain(rows[0]);

  await db.insert(appSettings).values(defaultSettings);
  return toDomain(defaultSettings as AppSettingsRow);
}

export const sqliteSettingsRepository: SettingsRepository = {
  get,
  async update(input) {
    const current = await get();
    const next: AppSettings = {
      ...current,
      previousNotifyTime:
        input.previousNotifyTime && isTimeString(input.previousNotifyTime)
          ? input.previousNotifyTime
          : current.previousNotifyTime,
      defaultTargetTime:
        input.defaultTargetTime && isTimeString(input.defaultTargetTime)
          ? input.defaultTargetTime
          : current.defaultTargetTime,
      autoDeleteEnabled: input.autoDeleteEnabled ?? current.autoDeleteEnabled,
      notificationSoundEnabled: input.notificationSoundEnabled ?? current.notificationSoundEnabled,
      theme: input.theme ?? current.theme,
    };
    await db
      .update(appSettings)
      .set({
        previousNotifyTime: next.previousNotifyTime,
        defaultTargetTime: next.defaultTargetTime,
        autoDeleteEnabled: next.autoDeleteEnabled,
        notificationSoundEnabled: next.notificationSoundEnabled,
        theme: next.theme,
      })
      .where(eq(appSettings.id, DEFAULT_SETTINGS_ID));
    return next;
  },
};
