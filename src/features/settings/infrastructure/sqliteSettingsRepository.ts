import { eq } from 'drizzle-orm';

import { db } from '../../../db/client';
import { appSettings, type AppSettingsRow, type NewAppSettingsRow } from '../../../db/schema';
import { coerceTheme, isTimeString } from '../../../shared/utils/time';
import type { SettingsRepository } from '../application/settingsRepository';
import {
  DEFAULT_QUICK_ADD_PRESET_TIMES,
  resolveQuickAddPresetTimes,
  type AppSettings,
  type QuickAddPresetTimes,
} from '../domain/appSettings';

const DEFAULT_SETTINGS_ID = 'default';
const defaultSettings: NewAppSettingsRow = {
  id: DEFAULT_SETTINGS_ID,
  previousNotifyTime: '20:00',
  ...DEFAULT_QUICK_ADD_PRESET_TIMES,
  autoDeleteEnabled: true,
  notificationSoundEnabled: true,
  theme: 'sky',
};

function toDomain(row: AppSettingsRow): AppSettings {
  return {
    id: row.id,
    previousNotifyTime: row.previousNotifyTime,
    defaultTargetTime: row.defaultTargetTime,
    noonTargetTime: row.noonTargetTime,
    eveningTargetTime: row.eveningTargetTime,
    nightTargetTime: row.nightTargetTime,
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
    const presetInput: QuickAddPresetTimes = {
      defaultTargetTime: input.defaultTargetTime ?? current.defaultTargetTime,
      noonTargetTime: input.noonTargetTime ?? current.noonTargetTime,
      eveningTargetTime: input.eveningTargetTime ?? current.eveningTargetTime,
      nightTargetTime: input.nightTargetTime ?? current.nightTargetTime,
    };
    const nextPresetTimes = resolveQuickAddPresetTimes(
      {
        defaultTargetTime: current.defaultTargetTime,
        noonTargetTime: current.noonTargetTime,
        eveningTargetTime: current.eveningTargetTime,
        nightTargetTime: current.nightTargetTime,
      },
      presetInput,
    );
    const next: AppSettings = {
      ...current,
      previousNotifyTime:
        input.previousNotifyTime && isTimeString(input.previousNotifyTime)
          ? input.previousNotifyTime
          : current.previousNotifyTime,
      ...nextPresetTimes,
      autoDeleteEnabled: input.autoDeleteEnabled ?? current.autoDeleteEnabled,
      notificationSoundEnabled: input.notificationSoundEnabled ?? current.notificationSoundEnabled,
      theme: input.theme ?? current.theme,
    };
    await db
      .update(appSettings)
      .set({
        previousNotifyTime: next.previousNotifyTime,
        defaultTargetTime: next.defaultTargetTime,
        noonTargetTime: next.noonTargetTime,
        eveningTargetTime: next.eveningTargetTime,
        nightTargetTime: next.nightTargetTime,
        autoDeleteEnabled: next.autoDeleteEnabled,
        notificationSoundEnabled: next.notificationSoundEnabled,
        theme: next.theme,
      })
      .where(eq(appSettings.id, DEFAULT_SETTINGS_ID));
    return next;
  },
};
