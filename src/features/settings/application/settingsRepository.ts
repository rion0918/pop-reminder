import type { AppSettings, UpdateAppSettingsInput } from '../domain/appSettings';

export type SettingsRepository = {
  get(): Promise<AppSettings>;
  update(input: UpdateAppSettingsInput): Promise<AppSettings>;
};
