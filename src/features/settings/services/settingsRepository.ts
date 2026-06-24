import { eq } from 'drizzle-orm';

import { db } from '../../../db/client';
import { appSettings, NewAppSettingsRow } from '../../../db/schema';
import { coerceTheme, isTimeString } from '../../../shared/utils/time';
import { AppSettings, UpdateAppSettingsInput } from '../types/appSettings';

export const DEFAULT_SETTINGS_ID = 'default';

const defaultSettings: NewAppSettingsRow = {
  id: DEFAULT_SETTINGS_ID,
  previousNotifyTime: '20:00',
  defaultTargetTime: '08:00',
  autoDeleteEnabled: true,
  theme: 'sky',
};

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, DEFAULT_SETTINGS_ID))
    .limit(1);

  if (rows[0]) {
    return {
      ...rows[0],
      theme: coerceTheme(rows[0].theme),
    };
  }

  await db.insert(appSettings).values(defaultSettings);

  return {
    id: DEFAULT_SETTINGS_ID,
    previousNotifyTime: '20:00',
    defaultTargetTime: '08:00',
    autoDeleteEnabled: true,
    theme: 'sky',
  };
}

export async function updateAppSettings(input: UpdateAppSettingsInput): Promise<AppSettings> {
  const current = await getAppSettings();

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
    theme: input.theme ?? current.theme,
  };

  await db
    .update(appSettings)
    .set({
      previousNotifyTime: next.previousNotifyTime,
      defaultTargetTime: next.defaultTargetTime,
      autoDeleteEnabled: next.autoDeleteEnabled,
      theme: next.theme,
    })
    .where(eq(appSettings.id, DEFAULT_SETTINGS_ID));

  return next;
}
