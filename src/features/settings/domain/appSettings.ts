export type AppTheme = 'sky' | 'lavender' | 'mint';

export type AppSettings = {
  id: string;
  previousNotifyTime: string;
  defaultTargetTime: string;
  autoDeleteEnabled: boolean;
  notificationSoundEnabled: boolean;
  theme: AppTheme;
};

export type UpdateAppSettingsInput = Partial<Omit<AppSettings, 'id'>>;
