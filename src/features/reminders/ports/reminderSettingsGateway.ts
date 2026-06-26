export type ReminderRuntimeSettings = {
  previousNotifyTime: string;
  autoDeleteEnabled: boolean;
  notificationSoundEnabled: boolean;
};

export type ReminderSettingsGateway = {
  getAppSettings: () => Promise<ReminderRuntimeSettings>;
};
