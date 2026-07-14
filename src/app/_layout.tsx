import '../../global.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { AppProviders } from '../bootstrap/AppProviders';
import { appServices } from '../bootstrap/appServices';
import { createDeepLinkIntentBuffer, type DeepLinkIntent } from '../bootstrap/deepLinkIntent';
import { palette } from '../constants/colors';
import { initializeDatabase } from '../db/client';
import {
  configureAndroidNotificationChannels,
  configureNotificationHandler,
} from '../lib/notifications/reminderNotifications';

type BootstrapState = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const router = useRouter();
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>('loading');
  const stateRef = useRef<BootstrapState>('loading');
  const intentBufferRef = useRef(createDeepLinkIntentBuffer());
  const intentSequenceRef = useRef(0);

  const publishIntent = useCallback(
    (intent: DeepLinkIntent) => {
      intentSequenceRef.current += 1;
      router.replace({
        pathname: '/',
        params: {
          action: intent.action,
          id: intent.action === 'view' ? intent.id : undefined,
          intent: String(intentSequenceRef.current),
        },
      });
    },
    [router],
  );

  const receiveUrl = useCallback(
    (url: string | null) => {
      if (!url || !intentBufferRef.current.receive(url) || stateRef.current !== 'ready') return;
      const intent = intentBufferRef.current.consume();
      if (intent) publishIntent(intent);
    },
    [publishIntent],
  );

  const prepare = useCallback(async () => {
    stateRef.current = 'loading';
    setBootstrapState('loading');
    try {
      await initializeDatabase();
      await appServices.reminders.cleanup();
      try {
        await appServices.reminders.retryPendingNotifications();
      } catch (error) {
        console.warn('Failed to retry pending reminder notifications', error);
      }
      stateRef.current = 'ready';
      setBootstrapState('ready');
      const pendingIntent = intentBufferRef.current.consume();
      if (pendingIntent) publishIntent(pendingIntent);
    } catch (error) {
      console.warn('Failed to prepare app data', error);
      stateRef.current = 'error';
      setBootstrapState('error');
    }
  }, [publishIntent]);

  useEffect(() => {
    configureNotificationHandler();
    void configureAndroidNotificationChannels().catch((error) => {
      console.warn('Failed to configure notification channels', error);
    });

    const subscription = Linking.addEventListener('url', (event) => receiveUrl(event.url));
    void Linking.getInitialURL()
      .then(receiveUrl)
      .catch(() => {});
    void prepare();
    return () => subscription.remove();
  }, [prepare, receiveUrl]);

  if (bootstrapState !== 'ready') {
    return (
      <View style={styles.loading}>
        {bootstrapState === 'loading' ? (
          <ActivityIndicator color={palette.skyDeep} />
        ) : (
          <>
            <Text style={styles.errorTitle}>起動できませんでした</Text>
            <Text style={styles.errorBody}>データベースを準備できませんでした。</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void prepare()}
              style={styles.retry}
            >
              <Text style={styles.retryLabel}>もう一度試す</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <AppProviders>
      <GestureHandlerRootView style={styles.root}>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.sky } }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="settings" options={{ animation: 'fade' }} />
            <Stack.Screen name="reminders-list" options={{ animation: 'fade' }} />
          </Stack>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: palette.sky,
  },
  errorTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  errorBody: { color: palette.muted, marginTop: 8, textAlign: 'center' },
  retry: { marginTop: 20, borderRadius: 20, backgroundColor: palette.ink, padding: 12 },
  retryLabel: { color: palette.white, fontWeight: '800' },
});
