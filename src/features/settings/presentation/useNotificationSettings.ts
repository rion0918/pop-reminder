import { useAppServices } from '../../../bootstrap/appServicesContext';

export function useNotificationSettings() {
  return useAppServices().notificationSettings;
}
