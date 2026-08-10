import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { palette } from '../constants/colors';
import { appServices, type AppServices } from './appServices';

const AppServicesContext = createContext<AppServices | null>(null);
const trackedPathnames = new Set(['/', '/reminders-list', '/settings']);
const currentSettingsQueryKey = ['settings', 'current'] as const;

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error('AppProviders is missing');
  return services;
}

function AnalyticsConsentGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: currentSettingsQueryKey,
    queryFn: appServices.settings.get,
    retry: false,
  });
  const settingsMutation = useMutation({
    mutationFn: appServices.settings.update,
    onSuccess: (settings) => queryClient.setQueryData(currentSettingsQueryKey, settings),
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const consent = settingsQuery.data?.analyticsConsent;
    if (consent === 'granted') {
      void appServices.analytics.setCaptureEnabled(true);
    } else if (consent === 'denied') {
      void appServices.analytics.setCaptureEnabled(false);
    }
  }, [settingsQuery.data?.analyticsConsent]);

  const chooseConsent = async (consent: 'granted' | 'denied') => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (consent === 'granted') {
        const enabled = await appServices.analytics.setCaptureEnabled(true);
        if (appServices.analytics.configured && !enabled) {
          throw new Error('Analytics could not be enabled');
        }
      } else {
        await appServices.analytics.setCaptureEnabled(false);
      }

      await settingsMutation.mutateAsync({ analyticsConsent: consent });
      if (consent === 'granted' && trackedPathnames.has(pathname)) {
        appServices.analytics.captureScreen(pathname);
      }
    } catch {
      // Keep the gate open when persistence or SDK setup fails.
    } finally {
      setIsSaving(false);
    }
  };

  const shouldAskForConsent =
    appServices.analytics.configured && settingsQuery.data?.analyticsConsent === 'unknown';

  return (
    <>
      {children}
      <Modal
        visible={shouldAskForConsent}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View style={styles.consentOverlay}>
          <View style={styles.consentCard}>
            <Text style={styles.consentTitle}>匿名の利用状況を共有しますか？</Text>
            <Text style={styles.consentBody}>
              品質改善のため、匿名ID、画面表示、リマインダー操作、通知、Pro購入導線の結果を送信します。
              タイトルや日時、音声、位置情報は送信しません。後から設定画面でいつでも変更できます。
            </Text>
            <View style={styles.consentActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="匿名の利用状況を共有しない"
                disabled={isSaving}
                onPress={() => void chooseConsent('denied')}
                style={[styles.consentButton, styles.consentButtonSecondary]}
              >
                <Text style={styles.consentButtonSecondaryLabel}>共有しない</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="匿名の利用状況を共有する"
                disabled={isSaving}
                onPress={() => void chooseConsent('granted')}
                style={[styles.consentButton, styles.consentButtonPrimary]}
              >
                <Text style={styles.consentButtonPrimaryLabel}>共有する</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
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

  return (
    <AppServicesContext.Provider value={appServices}>
      <QueryClientProvider client={queryClient}>
        <AnalyticsConsentGate>{children}</AnalyticsConsentGate>
      </QueryClientProvider>
    </AppServicesContext.Provider>
  );
}

const styles = StyleSheet.create({
  consentOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(20, 32, 58, 0.38)',
  },
  consentCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    padding: 22,
    backgroundColor: palette.white,
  },
  consentTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  consentBody: {
    marginTop: 12,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  consentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  consentButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 13,
  },
  consentButtonSecondary: {
    borderWidth: 1,
    borderColor: '#DDE7F4',
  },
  consentButtonPrimary: {
    backgroundColor: palette.ink,
  },
  consentButtonSecondaryLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  consentButtonPrimaryLabel: {
    color: palette.white,
    fontWeight: '800',
  },
});
