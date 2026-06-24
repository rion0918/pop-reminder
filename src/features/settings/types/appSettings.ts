import { AppSettingsRow } from '../../../db/schema';
import { AppTheme } from '../../../shared/constants/colors';

export type AppSettings = Omit<AppSettingsRow, 'theme'> & {
  theme: AppTheme;
};

export type UpdateAppSettingsInput = Partial<{
  previousNotifyTime: string;
  defaultTargetTime: string;
  autoDeleteEnabled: boolean;
  theme: AppTheme;
}>;
