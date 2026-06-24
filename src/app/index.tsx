import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReminderBubbleBoard } from '../features/reminders/components/ReminderBubbleBoard';
import { ReminderDetailSheet } from '../features/reminders/components/ReminderDetailSheet';
import { ReminderInputSheet } from '../features/reminders/components/ReminderInputSheet';
import { useReminders } from '../features/reminders/hooks/useReminders';
import { createReminder } from '../features/reminders/services/createReminderService';
import { deleteReminder } from '../features/reminders/services/deleteReminderService';
import { useNotificationDevStore } from '../features/reminders/stores/notificationDevStore';
import {
  selectFormattedTime,
  useReminderUiStore,
} from '../features/reminders/stores/reminderUiStore';
import { Reminder } from '../features/reminders/types/reminder';
import { useAppSettings } from '../features/settings/hooks/useAppSettings';
import { AppScreen } from '../shared/components/AppScreen';
import { palette } from '../shared/constants/colors';

export default function HomeScreen() {
  const { reminders, loading, error, refresh } = useReminders();
  const isQuickAddOpen = useReminderUiStore((state) => state.isQuickAddOpen);
  const openQuickAdd = useReminderUiStore((state) => state.openQuickAdd);
  const dateOffset = useReminderUiStore((state) => state.dateOffset);
  const customTargetDate = useReminderUiStore((state) => state.customTargetDate);
  const targetTime = useReminderUiStore(selectFormattedTime);
  const isSaving = useReminderUiStore((state) => state.isSaving);
  const setSaving = useReminderUiStore((state) => state.setSaving);
  const isNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.isNotificationTestModeEnabled,
  );
  const { settings } = useAppSettings();
  const isQuickAddOpenRef = useRef(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [burstingReminderId, setBurstingReminderId] = useState<string | null>(null);

  useEffect(() => {
    isQuickAddOpenRef.current = isQuickAddOpen;
  }, [isQuickAddOpen]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleSave = async (title: string) => {
    setSaving(true);

    try {
      await createReminder({
        title,
        dateOffset,
        customTargetDate,
        targetTime,
      }, {
        useTestNotifications: __DEV__ && isNotificationTestModeEnabled,
      });
      await refresh();
    } catch (saveError) {
      console.warn('Failed to save reminder', saveError);
      Alert.alert('追加できませんでした', 'タイトルと時刻を確認してください。');
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const handlePressAdd = useCallback(() => {
    if (isQuickAddOpenRef.current || isSaving) {
      return;
    }

    isQuickAddOpenRef.current = true;
    openQuickAdd(settings?.defaultTargetTime ?? '08:00');
  }, [isSaving, openQuickAdd, settings?.defaultTargetTime]);

  const handleDeleteReminder = useCallback(
    async (reminder: Reminder) => {
      setBurstingReminderId(reminder.id);
      await new Promise((resolve) => {
        setTimeout(resolve, 260);
      });

      try {
        const deleted = await deleteReminder(reminder.id);

        if (!deleted) {
          throw new Error('Reminder was not found');
        }

        await refresh();
      } finally {
        setBurstingReminderId(null);
      }
    },
    [refresh],
  );

  const isAddButtonDisabled = isQuickAddOpen || isSaving;

  return (
    <AppScreen theme={settings?.theme ?? 'sky'}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>ポップ・リマインダー</Text>
          <Text style={styles.title}>ふわっと残す</Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="button" style={styles.iconButton}>
            <Ionicons name="settings-outline" size={22} color={palette.ink} />
          </Pressable>
        </Link>
      </View>

      <View style={styles.bubbleArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ReminderBubbleBoard
            reminders={reminders}
            loading={loading}
            error={error}
            burstingReminderId={burstingReminderId}
            onReminderPress={setSelectedReminder}
          />
        </ScrollView>
      </View>

      <ReminderInputSheet
        defaultTargetTime={settings?.defaultTargetTime ?? '08:00'}
        onSave={handleSave}
      />

      <ReminderDetailSheet
        reminder={selectedReminder}
        onClose={() => setSelectedReminder(null)}
        onDelete={handleDeleteReminder}
      />

      <Pressable
        accessibilityRole="button"
        disabled={isAddButtonDisabled}
        onPress={handlePressAdd}
        style={[styles.addButton, isAddButtonDisabled ? styles.addButtonDisabled : null]}
      >
        <Ionicons name="add" size={30} color={palette.white} />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    flexShrink: 0,
  },
  kicker: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 136,
  },
  bubbleArea: {
    flex: 1,
    marginTop: 12,
    overflow: 'visible',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.skyDeep,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 6,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
});
