import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '../../../shared/components/AppScreen';
import { palette } from '../../../constants/colors';
import { useAppSettingsQuery as useAppSettings } from '../../settings/presentation/useAppSettingsQuery';
import { ReminderDetailSheet } from '../components/ReminderDetailSheet';
import { ReminderSelectionBar } from '../components/ReminderSelectionBar';
import { useRemindersQuery as useReminders } from '../presentation/useRemindersQuery';
import type { Reminder } from '../types/reminder';
import { formatReminderDateTime } from '../utils/reminderDateFormat';
import { getMsUntilNextDay, getReminderDueColor } from '../utils/reminderDueColor';
import { triggerReminderSelectionHaptic } from '../utils/reminderSelectionFeedback';
import {
  executeReminderBulkDelete,
  retainVisibleReminderSelection,
  startReminderSelection,
  toggleAllReminderSelection,
  toggleReminderSelection as toggleReminderSelectionIds,
} from './reminderListSelection';

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
    deleteReminders,
    isDeletingReminders,
    updateReminderTitle,
    updateReminderSchedule,
  } = useReminders();
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<Set<string>>(() => new Set());
  const [colorReferenceDate, setColorReferenceDate] = useState(() => new Date());
  const longPressTriggeredIdRef = useRef<string | null>(null);
  const selectedReminder = reminders.find((reminder) => reminder.id === selectedReminderId) ?? null;
  const selectedCount = selectedReminderIds.size;
  const allRemindersSelected = reminders.length > 0 && selectedCount === reminders.length;

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

  const cancelSelection = useCallback(() => {
    longPressTriggeredIdRef.current = null;
    setIsSelectionMode(false);
    setSelectedReminderIds(new Set());
  }, []);

  const enterSelectionMode = useCallback((id: string) => {
    setIsSelectionMode(true);
    setSelectedReminderIds(startReminderSelection(id));
    void triggerReminderSelectionHaptic();
  }, []);

  const toggleReminderSelection = useCallback((id: string) => {
    void triggerReminderSelectionHaptic();
    setSelectedReminderIds((current) => toggleReminderSelectionIds(current, id));
  }, []);

  const toggleSelectAll = useCallback(() => {
    void triggerReminderSelectionHaptic();
    setSelectedReminderIds((current) =>
      toggleAllReminderSelection(
        current,
        reminders.map((reminder) => reminder.id),
      ),
    );
  }, [reminders]);

  useEffect(() => {
    setSelectedReminderIds((current) =>
      retainVisibleReminderSelection(
        current,
        reminders.map((reminder) => reminder.id),
      ),
    );
  }, [reminders]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isDeletingReminders) return true;
        if (isSelectionMode) {
          cancelSelection();
          return true;
        }
        return false;
      });

      return () => subscription.remove();
    }, [cancelSelection, isDeletingReminders, isSelectionMode]),
  );

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

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      const result = await executeReminderBulkDelete(ids, deleteReminders);

      if (result.ok) {
        cancelSelection();
        return;
      }

      console.warn('Failed to delete reminders from list', result.error);
      Alert.alert('削除できませんでした', '時間をおいてもう一度お試しください。');
    },
    [cancelSelection, deleteReminders],
  );

  const handleBulkDeletePress = useCallback(() => {
    if (selectedCount === 0 || isDeletingReminders) return;
    const ids = [...selectedReminderIds];

    Alert.alert(
      '選択したリマインドを削除しますか？',
      `${selectedCount}件のリマインドを削除します。この操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: `${selectedCount}件を削除`,
          style: 'destructive',
          onPress: () => void handleBulkDelete(ids),
        },
      ],
    );
  }, [handleBulkDelete, isDeletingReminders, selectedCount, selectedReminderIds]);

  const handleHeaderBack = useCallback(() => {
    if (isSelectionMode) {
      cancelSelection();
      return;
    }

    handleBack(router);
  }, [cancelSelection, isSelectionMode, router]);

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

  const handleUpdateReminderSchedule = useCallback(
    async (reminder: Reminder, input: { targetDate: string; targetTime: string }) => {
      const result = await updateReminderSchedule(reminder.id, input);

      if (!result) {
        throw new Error('Reminder was not found');
      }

      return result;
    },
    [updateReminderSchedule],
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
          accessibilityLabel={isSelectionMode ? '選択モードを閉じる' : 'ホームに戻る'}
          hitSlop={8}
          onPress={handleHeaderBack}
          disabled={isDeletingReminders}
          className="h-[44px] w-[44px] items-center justify-center rounded-[22px] border border-[rgba(255,255,255,0.90)] bg-[rgba(255,255,255,0.78)]"
          style={({ pressed }) => (pressed ? styles.headerButtonPressed : null)}
        >
          <Ionicons
            name={isSelectionMode ? 'close' : 'chevron-back'}
            size={24}
            color={palette.ink}
          />
        </Pressable>
        <Text className="text-[18px] font-black text-app-ink">
          {isSelectionMode ? `${selectedCount}件選択中` : 'すべての泡'}
        </Text>
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
            const isSelected = selectedReminderIds.has(reminder.id);

            return (
              <Pressable
                key={reminder.id}
                accessibilityRole={isSelectionMode ? 'checkbox' : 'button'}
                accessibilityLabel={
                  isSelectionMode
                    ? `${reminder.title}を${isSelected ? '選択解除' : '選択'}`
                    : `${reminder.title}の詳細を開く`
                }
                accessibilityHint={
                  isSelectionMode ? 'タップして選択状態を切り替えます' : '長押しで複数選択できます'
                }
                accessibilityState={
                  isSelectionMode
                    ? { checked: isSelected, disabled: isDeletingReminders }
                    : { disabled: isDeletingReminders }
                }
                onLongPress={() => {
                  if (!isDeletingReminders && !isSelectionMode) {
                    longPressTriggeredIdRef.current = reminder.id;
                    enterSelectionMode(reminder.id);
                  }
                }}
                onPress={() => {
                  if (isDeletingReminders) return;
                  if (longPressTriggeredIdRef.current === reminder.id) {
                    longPressTriggeredIdRef.current = null;
                    return;
                  }
                  if (isSelectionMode) {
                    toggleReminderSelection(reminder.id);
                  } else {
                    setSelectedReminderId(reminder.id);
                  }
                }}
                disabled={isDeletingReminders}
                className="mb-[10px] min-h-[72px] flex-row items-center gap-[12px] rounded-[24px] border border-[rgba(255,255,255,0.92)] bg-[rgba(255,255,255,0.82)] px-[14px]"
                style={({ pressed }) => [
                  styles.softShadow,
                  isSelected ? styles.listItemSelected : null,
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
                {isSelectionMode ? (
                  <View
                    className="h-[28px] w-[28px] items-center justify-center rounded-[14px] border"
                    style={[
                      styles.selectionIndicator,
                      isSelected ? styles.selectionIndicatorSelected : null,
                    ]}
                  >
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color={palette.white} />
                    ) : null}
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {isSelectionMode && !loading && !error && reminders.length > 0 ? (
        <ReminderSelectionBar
          selectedCount={selectedCount}
          allSelected={allRemindersSelected}
          busy={isDeletingReminders}
          onToggleAll={toggleSelectAll}
          onDelete={handleBulkDeletePress}
          style={styles.selectionActions}
        />
      ) : null}

      <ReminderDetailSheet
        reminder={selectedReminder}
        onClose={(closedReminderId) =>
          setSelectedReminderId((current) => (current === closedReminderId ? null : current))
        }
        onDelete={handleDeleteReminder}
        onUpdateTitle={handleUpdateReminderTitle}
        onUpdateSchedule={handleUpdateReminderSchedule}
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
  headerButtonPressed: {
    opacity: 0.78,
    transform: [{ translateY: 1 }, { scale: 0.94 }],
  },
  listContent: {
    paddingBottom: 34,
  },
  selectionActions: {
    marginTop: 10,
    marginBottom: 8,
  },
  listItemSelected: {
    borderColor: palette.lavenderDeep,
    backgroundColor: 'rgba(237,230,255,0.72)',
  },
  selectionIndicator: {
    borderColor: palette.lavenderDeep,
    backgroundColor: 'rgba(255,255,255,0.66)',
  },
  selectionIndicatorSelected: {
    backgroundColor: palette.lavenderDeep,
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
