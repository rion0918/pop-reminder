import { isTimeString } from '../../../shared/utils/time';

export type AppTheme = 'sky' | 'lavender' | 'mint';

export type AppSettings = {
  id: string;
  previousNotifyTime: string;
  defaultTargetTime: string;
  noonTargetTime: string;
  eveningTargetTime: string;
  nightTargetTime: string;
  autoDeleteEnabled: boolean;
  notificationSoundEnabled: boolean;
  theme: AppTheme;
};

export type UpdateAppSettingsInput = Partial<Omit<AppSettings, 'id'>>;

export type QuickAddPresetTimes = Pick<
  AppSettings,
  'defaultTargetTime' | 'noonTargetTime' | 'eveningTargetTime' | 'nightTargetTime'
>;

export const DEFAULT_QUICK_ADD_PRESET_TIMES: QuickAddPresetTimes = {
  defaultTargetTime: '08:00',
  noonTargetTime: '12:00',
  eveningTargetTime: '18:00',
  nightTargetTime: '20:00',
};

export const QUICK_ADD_PRESET_VALIDATION_MESSAGE =
  '朝・昼・夕・夜の順に、異なる時刻を設定してください';

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isValidQuickAddPresetTimes(times: QuickAddPresetTimes) {
  const values = [
    times.defaultTargetTime,
    times.noonTargetTime,
    times.eveningTargetTime,
    times.nightTargetTime,
  ];

  return (
    values.every(isTimeString) &&
    values.every(
      (value, index) => index === 0 || timeToMinutes(value) > timeToMinutes(values[index - 1]),
    )
  );
}

export function resolveQuickAddPresetTimes(
  current: QuickAddPresetTimes,
  next: QuickAddPresetTimes,
) {
  return isValidQuickAddPresetTimes(next) ? next : current;
}
