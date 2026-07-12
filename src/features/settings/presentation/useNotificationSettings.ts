import { useAppServices } from '../../../bootstrap/AppProviders';

export function useNotificationSettings() {
  return useAppServices().notificationSettings;
}
