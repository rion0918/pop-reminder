import { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AnalyticsConsentGate } from '../features/settings/components/AnalyticsConsentGate';
import { appServices } from './appServices';
import { AppServicesProvider } from './appServicesContext';

const trackedPathnames = new Set(['/', '/reminders-list', '/settings']);

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

  return (
    <AppServicesProvider>
      <QueryClientProvider client={queryClient}>
        <AnalyticsConsentGate>{children}</AnalyticsConsentGate>
      </QueryClientProvider>
    </AppServicesProvider>
  );
}
