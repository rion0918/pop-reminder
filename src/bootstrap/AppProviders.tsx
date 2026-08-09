import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import { PostHogProvider } from 'posthog-react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { appServices, type AppServices } from './appServices';

const AppServicesContext = createContext<AppServices | null>(null);
const trackedPathnames = new Set(['/', '/reminders-list', '/settings']);

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error('AppProviders is missing');
  return services;
}

export function AppProviders({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );

  useEffect(() => {
    if (!trackedPathnames.has(pathname)) return;
    if (previousPathnameRef.current === pathname) return;

    previousPathnameRef.current = pathname;
    appServices.analytics.captureScreen(pathname);
  }, [pathname]);

  useEffect(() => {
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

  const providers = (
    <AppServicesContext.Provider value={appServices}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppServicesContext.Provider>
  );

  return appServices.analytics.client ? (
    <PostHogProvider client={appServices.analytics.client} autocapture={false}>
      {providers}
    </PostHogProvider>
  ) : (
    providers
  );
}
