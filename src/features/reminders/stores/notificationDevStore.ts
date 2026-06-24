import { create } from 'zustand';

type NotificationDevState = {
  isNotificationTestModeEnabled: boolean;
  setNotificationTestModeEnabled: (enabled: boolean) => void;
};

export const useNotificationDevStore = create<NotificationDevState>((set) => ({
  isNotificationTestModeEnabled: false,
  setNotificationTestModeEnabled: (isNotificationTestModeEnabled) =>
    set({ isNotificationTestModeEnabled }),
}));
