import { eq } from 'drizzle-orm';

import { db } from '../../../db/client';
import { appSettings, type AppSettingsRow, type NewAppSettingsRow } from '../../../db/schema';
import { coerceAppTheme } from '../../../shared/domain/appTheme';
import { isTimeString } from '../../../shared/utils/time';
import type { SettingsRepository } from '../application/settingsRepository';
import {
  DEFAULT_ANALYTICS_SETTINGS,
  DEFAULT_QUICK_ADD_PRESET_TIMES,
  DEFAULT_NOTIFICATION_PERMISSION_SETTINGS,
  DEFAULT_RAISE_TO_SPEAK_SETTINGS,
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
  ...DEFAULT_NOTIFICATION_PERMISSION_SETTINGS,
  ...DEFAULT_RAISE_TO_SPEAK_SETTINGS,
  ...DEFAULT_ANALYTICS_SETTINGS,
  theme: 'lavender',
};

type CurrentAppSettingsRow = Omit<
  AppSettingsRow,
  'notificationSoundEnabled' | 'notificationChannelVersion'
>;

function toDomain(row: CurrentAppSettingsRow): AppSettings {
  return {
    id: row.id,
    previousNotifyTime: row.previousNotifyTime,
    defaultTargetTime: row.defaultTargetTime,
    noonTargetTime: row.noonTargetTime,
    eveningTargetTime: row.eveningTargetTime,
    nightTargetTime: row.nightTargetTime,
    autoDeleteEnabled: row.autoDeleteEnabled,
    notificationPermissionIntroSeen: row.notificationPermissionIntroSeen,
    raiseToSpeakEnabled: row.raiseToSpeakEnabled,
    raiseToSpeakIntroSeen: row.raiseToSpeakIntroSeen,
    analyticsConsent: row.analyticsConsent,
    theme: coerceAppTheme(row.theme),
  };
}

async function get() {
  const rows = await db
    .select({
      id: appSettings.id,
      previousNotifyTime: appSettings.previousNotifyTime,
      defaultTargetTime: appSettings.defaultTargetTime,
      noonTargetTime: appSettings.noonTargetTime,
      eveningTargetTime: appSettings.eveningTargetTime,
      nightTargetTime: appSettings.nightTargetTime,
      autoDeleteEnabled: appSettings.autoDeleteEnabled,
      notificationPermissionIntroSeen: appSettings.notificationPermissionIntroSeen,
      raiseToSpeakEnabled: appSettings.raiseToSpeakEnabled,
      raiseToSpeakIntroSeen: appSettings.raiseToSpeakIntroSeen,
      analyticsConsent: appSettings.analyticsConsent,
      theme: appSettings.theme,
    })
    .from(appSettings)
    .where(eq(appSettings.id, DEFAULT_SETTINGS_ID))
    .limit(1);
  if (rows[0]) return toDomain(rows[0]);

  await db.insert(appSettings).values(defaultSettings);
  return toDomain(defaultSettings as CurrentAppSettingsRow);
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
      notificationPermissionIntroSeen:
        input.notificationPermissionIntroSeen ?? current.notificationPermissionIntroSeen,
      raiseToSpeakEnabled: input.raiseToSpeakEnabled ?? current.raiseToSpeakEnabled,
      raiseToSpeakIntroSeen: input.raiseToSpeakIntroSeen ?? current.raiseToSpeakIntroSeen,
      analyticsConsent: input.analyticsConsent ?? current.analyticsConsent,
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
        notificationPermissionIntroSeen: next.notificationPermissionIntroSeen,
        raiseToSpeakEnabled: next.raiseToSpeakEnabled,
        raiseToSpeakIntroSeen: next.raiseToSpeakIntroSeen,
        analyticsConsent: next.analyticsConsent,
        theme: next.theme,
      })
      .where(eq(appSettings.id, DEFAULT_SETTINGS_ID));
    return next;
  },
};
