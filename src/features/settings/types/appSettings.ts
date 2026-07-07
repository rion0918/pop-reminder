import type { AppSettingsRow } from '../../../db/schema';
import type { AppTheme } from '../../../constants/colors';

export type AppSettings = Omit<AppSettingsRow, 'theme'> & {
  theme: AppTheme;
};

export type UpdateAppSettingsInput = Partial<{
  previousNotifyTime: string;
  defaultTargetTime: string;
  autoDeleteEnabled: boolean;
  notificationSoundEnabled: boolean;
  theme: AppTheme;
}>;
