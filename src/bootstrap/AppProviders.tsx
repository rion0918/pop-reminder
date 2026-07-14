import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { appServices, type AppServices } from './appServices';

const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error('AppProviders is missing');
  return services;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      const isActive = state === 'active';
      focusManager.setFocused(isActive);
      if (isActive) {
        void appServices.reminders.retryPendingNotifications().catch((error) => {
          console.warn('Failed to retry pending reminder notifications after app resume', error);
        });
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <AppServicesContext.Provider value={appServices}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppServicesContext.Provider>
  );
}
