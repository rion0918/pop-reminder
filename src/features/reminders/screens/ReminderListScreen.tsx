import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '../../../shared/components/AppScreen';
import { palette } from '../../../constants/colors';
import { useAppSettingsQuery as useAppSettings } from '../../settings/presentation/useAppSettingsQuery';
import { ReminderDetailSheet } from '../components/ReminderDetailSheet';
import { useRemindersQuery as useReminders } from '../presentation/useRemindersQuery';
import type { Reminder } from '../types/reminder';
import { formatReminderDateTime } from '../utils/reminderDateFormat';
import { getMsUntilNextDay, getReminderDueColor } from '../utils/reminderDueColor';

function handleBack(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/');
}

export function ReminderListScreen() {
  const router = useRouter();
  const { settings } = useAppSettings();
  const {
    reminders,
    loading,
    error,
    refresh,
    deleteReminder,
    updateReminderTitle,
    updateReminderTargetTime,
  } = useReminders();
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [colorReferenceDate, setColorReferenceDate] = useState(() => new Date());
  const selectedReminder = reminders.find((reminder) => reminder.id === selectedReminderId) ?? null;

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setColorReferenceDate(new Date());
    }, getMsUntilNextDay());

    return () => clearTimeout(timer);
  }, [colorReferenceDate]);

  const handleDeleteReminder = useCallback(
    async (reminder: Reminder) => {
      try {
        const deleted = await deleteReminder(reminder.id);

        if (!deleted) {
          throw new Error('Reminder was not found');
        }

        setSelectedReminderId(null);
      } catch (deleteError) {
        console.warn('Failed to delete reminder from list', deleteError);
        Alert.alert('削除できませんでした', '時間をおいてもう一度お試しください。');
      }
    },
    [deleteReminder],
  );

  const handleUpdateReminderTitle = useCallback(
    async (reminder: Reminder, title: string) => {
      const updatedReminder = await updateReminderTitle(reminder.id, title);

      if (!updatedReminder) {
        throw new Error('Reminder was not found');
      }

      return updatedReminder;
    },
    [updateReminderTitle],
  );

  const handleUpdateReminderTargetTime = useCallback(
    async (reminder: Reminder, targetTime: string) => {
      const result = await updateReminderTargetTime(reminder.id, targetTime);

      if (!result) {
        throw new Error('Reminder was not found');
      }

      return result;
    },
    [updateReminderTargetTime],
  );

  return (
    <AppScreen theme={settings?.theme ?? 'sky'}>
      <View pointerEvents="none" className="absolute inset-0">
        <View
          className="absolute rounded-full border border-[rgba(255,255,255,0.46)] bg-[rgba(255,255,255,0.22)]"
          style={styles.ambientOne}
        />
        <View
          className="absolute rounded-full border border-[rgba(255,255,255,0.46)] bg-[rgba(237,230,255,0.22)]"
          style={styles.ambientTwo}
        />
      </View>

      <View className="h-[52px] flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ホームに戻る"
          hitSlop={8}
          onPress={() => handleBack(router)}
          className="h-[44px] w-[44px] items-center justify-center rounded-[22px] border border-[rgba(255,255,255,0.90)] bg-[rgba(255,255,255,0.78)]"
        >
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </Pressable>
        <Text className="text-[18px] font-black text-app-ink">すべての泡</Text>
        <View className="w-[44px]" />
      </View>

      <View
        className="mb-[14px] mt-[18px] min-h-[94px] flex-row items-center justify-between gap-[14px] rounded-[28px] border border-[rgba(255,255,255,0.86)] bg-[rgba(255,255,255,0.68)] px-[18px] py-[18px]"
        style={styles.softShadow}
      >
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[12px] font-extrabold text-app-muted">
            表示中の7個も含めて
          </Text>
          <Text
            className="mt-[5px] text-[22px] font-black leading-[29px] text-app-ink"
            numberOfLines={2}
          >
            リマインドを一覧で見る
          </Text>
        </View>
        <View className="min-h-[42px] min-w-[58px] max-w-[34%] shrink-0 items-center justify-center rounded-[21px] border border-[rgba(255,255,255,0.86)] bg-[rgba(237,230,255,0.84)] px-[12px]">
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            className="text-[14px] font-black text-app-lavender-deep"
            style={styles.noFontPadding}
          >
            {reminders.length}件
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center px-[28px]">
          <ActivityIndicator color={palette.skyDeep} />
          <Text className="mt-[8px] text-center text-[13px] font-extrabold leading-[19px] text-app-muted">
            泡を並べています
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-[28px]">
          <Text className="text-center text-[17px] font-black leading-[24px] text-app-ink">
            うまく読めませんでした
          </Text>
          <Text className="mt-[8px] text-center text-[13px] font-extrabold leading-[19px] text-app-muted">
            {error}
          </Text>
        </View>
      ) : reminders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-[28px]">
          <View className="mb-[18px] h-[72px] w-[72px] items-center justify-center rounded-[36px] border-2 border-[rgba(255,255,255,0.68)] bg-[rgba(255,255,255,0.40)]">
            <Ionicons name="ellipse-outline" size={30} color={palette.lavenderDeep} />
          </View>
          <Text className="text-center text-[17px] font-black leading-[24px] text-app-ink">
            浮いている泡はありません
          </Text>
          <Text className="mt-[8px] text-center text-[13px] font-extrabold leading-[19px] text-app-muted">
            ホームからふわっと追加しましょう
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {reminders.map((reminder) => {
            const dueColor = getReminderDueColor(reminder.targetAt, colorReferenceDate);

            return (
              <Pressable
                key={reminder.id}
                accessibilityRole="button"
                accessibilityLabel={`${reminder.title}の詳細を開く`}
                onPress={() => setSelectedReminderId(reminder.id)}
                className="mb-[10px] min-h-[72px] flex-row items-center gap-[12px] rounded-[24px] border border-[rgba(255,255,255,0.92)] bg-[rgba(255,255,255,0.82)] px-[14px]"
                style={({ pressed }) => [
                  styles.softShadow,
                  pressed ? styles.listItemPressed : null,
                ]}
              >
                <View
                  className="h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-[22px] border"
                  style={[
                    styles.indexBubbleFallback,
                    {
                      backgroundColor: dueColor.background,
                      borderColor: dueColor.border,
                    },
                  ]}
                >
                  <View className="absolute left-[10px] top-[8px] h-[8px] w-[14px] rotate-[-28deg] rounded-[7px] bg-[rgba(255,255,255,0.64)]" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-[15px] font-black text-app-ink">
                    {reminder.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="mt-[4px] text-[12px] font-extrabold text-app-muted"
                  >
                    {formatReminderDateTime(reminder.targetAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ReminderDetailSheet
        reminder={selectedReminder}
        onClose={(closedReminderId) =>
          setSelectedReminderId((current) => (current === closedReminderId ? null : current))
        }
        onDelete={handleDeleteReminder}
        onUpdateTitle={handleUpdateReminderTitle}
        onUpdateTargetTime={handleUpdateReminderTargetTime}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  ambientOne: {
    top: 96,
    right: -28,
    width: 112,
    height: 112,
  },
  ambientTwo: {
    left: -24,
    bottom: 118,
    width: 76,
    height: 76,
  },
  softShadow: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  noFontPadding: {
    includeFontPadding: false,
  },
  listContent: {
    paddingBottom: 34,
  },
  listItemPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  indexBubbleFallback: {
    backgroundColor: 'rgba(237,230,255,0.74)',
    borderColor: 'rgba(255,255,255,0.82)',
  },
});
