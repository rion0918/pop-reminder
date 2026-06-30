import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { initializeDatabase } from '../db/client';
import { cleanupExpiredReminders } from '../features/reminders/services/reminderCleanupService';
import {
  configureAndroidNotificationChannels,
  configureNotificationHandler,
} from '../lib/notifications/reminderNotifications';
import { useReminderUiStore } from '../features/reminders/stores/reminderUiStore';
import { palette } from '../constants/colors';

export default function RootLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    configureNotificationHandler();

    configureAndroidNotificationChannels().catch((error) => {
      console.warn('Failed to configure notification channels', error);
    });

    initializeDatabase()
      .then(() => cleanupExpiredReminders())
      .catch((error) => {
        console.warn('Failed to prepare app data', error);
      })
      .finally(() => {
        if (mounted) {
          setReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const openQuickAdd = useReminderUiStore((state) => state.openQuickAdd);
  const setSelectedReminderId = useReminderUiStore((state) => state.setSelectedReminderId);

  const handleDeepLink = useCallback(
    (url: string | null) => {
      if (!url || !ready) {
        return;
      }

      const parsed = Linking.parse(url);

      if (parsed.queryParams?.action === 'add') {
        router.replace('/');
        // Delay slightly to ensure the home screen is mounted
        setTimeout(() => {
          openQuickAdd('08:00');
        }, 600);
      } else if (parsed.queryParams?.action === 'view' && typeof parsed.queryParams.id === 'string') {
        const id = parsed.queryParams.id;
        router.replace('/');
        // Delay slightly to ensure home screen is loaded
        setTimeout(() => {
          setSelectedReminderId(id);
        }, 600);
      }
    },
    [openQuickAdd, router, setSelectedReminderId, ready],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    // Handle the URL that opened the app
    Linking.getInitialURL().then(handleDeepLink).catch(() => {});

    // Handle URLs while the app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink, ready]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.skyDeep} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <BottomSheetModalProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.sky },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen
            name="settings"
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="reminders-list"
            options={{
              animation: 'fade',
            }}
          />
        </Stack>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.sky,
  },
});
