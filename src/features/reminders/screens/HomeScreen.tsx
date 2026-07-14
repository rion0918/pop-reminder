import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  BackHandler,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import type { BubbleDeleteMotionPhase } from '../components/ReminderBubble';
import { ReminderBubbleBoard, type BubbleDeleteMotion } from '../components/ReminderBubbleBoard';
import { ReminderDetailSheet } from '../components/ReminderDetailSheet';
import { ReminderInputSheet } from '../components/ReminderInputSheet';
import { useRemindersQuery as useReminders } from '../presentation/useRemindersQuery';
import { useNotificationDevStore } from '../stores/notificationDevStore';
import { selectFormattedTime, useReminderUiStore } from '../stores/reminderUiStore';
import type { Reminder } from '../types/reminder';
import { useAppSettingsQuery as useAppSettings } from '../../settings/presentation/useAppSettingsQuery';
import { AppScreen } from '../../../shared/components/AppScreen';
import { DEFAULT_TIME_PRESETS } from '../../../shared/utils/timePresets';
import { bubbleDueColors, palette } from '../../../constants/colors';
import { formatReminderBubbleDateTime } from '../utils/reminderDateFormat';

const appIcon = require('../../../../assets/app-icon.png');
const SETTINGS_BUTTON_FEEDBACK_MS = 120;
type DeleteMotionWaiter = {
  key: string;
  resolve: () => void;
};

function makeDeleteMotionKey(reminderId: string, phase: BubbleDeleteMotionPhase) {
  return `${reminderId}:${phase}`;
}

const dueLegendItems = [
  { label: '今日', color: bubbleDueColors.today },
  { label: '明日', color: bubbleDueColors.tomorrow },
  { label: '2-3日', color: bubbleDueColors.soon },
  { label: '4日+', color: bubbleDueColors.later },
];

export function HomeScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ action?: string; id?: string; intent?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const {
    reminders,
    loading,
    error,
    refresh,
    removeReminder,
    createReminder,
    deleteReminder,
    updateReminderTitle,
    isCreating: isSaving,
  } = useReminders();
  const isQuickAddOpen = useReminderUiStore((state) => state.isQuickAddOpen);
  const openQuickAdd = useReminderUiStore((state) => state.openQuickAdd);
  const closeQuickAdd = useReminderUiStore((state) => state.closeQuickAdd);
  const dateOffset = useReminderUiStore((state) => state.dateOffset);
  const customTargetDate = useReminderUiStore((state) => state.customTargetDate);
  const targetTime = useReminderUiStore(selectFormattedTime);
  const isNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.isNotificationTestModeEnabled,
  );
  const { settings, refresh: refreshSettings } = useAppSettings();
  const quickAddPresets = useMemo(
    () =>
      settings
        ? [
            { label: '朝', time: settings.defaultTargetTime },
            { label: '昼', time: settings.noonTargetTime },
            { label: '夕', time: settings.eveningTargetTime },
            { label: '夜', time: settings.nightTargetTime },
          ]
        : DEFAULT_TIME_PRESETS,
    [settings],
  );
  const isQuickAddOpenRef = useRef(false);
  const isSavingRef = useRef(false);
  const selectedReminderRef = useRef<Reminder | null>(null);
  const selectedReminderIdRef = useRef<string | null>(null);
  const deleteMotionWaiterRef = useRef<DeleteMotionWaiter | null>(null);
  const isReminderDeletionInProgressRef = useRef(false);
  const isMountedRef = useRef(true);
  const settingsPressTimeoutRef = useRef<number | null>(null);
  const [isSettingsButtonPressed, setIsSettingsButtonPressed] = useState(false);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const consumedIntentRef = useRef<string | null>(null);

  const selectedReminder = reminders.find((r) => r.id === selectedReminderId) || null;

  const [deleteMotion, setDeleteMotion] = useState<BubbleDeleteMotion | null>(null);

  useEffect(() => {
    isQuickAddOpenRef.current = isQuickAddOpen;
  }, [isQuickAddOpen]);

  useEffect(() => {
    selectedReminderRef.current = selectedReminder;
  }, [selectedReminder]);

  useEffect(() => {
    selectedReminderIdRef.current = selectedReminderId;
  }, [selectedReminderId]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    if (!routeParams.intent || consumedIntentRef.current === routeParams.intent) return;
    if (routeParams.action === 'view' && loading) return;

    consumedIntentRef.current = routeParams.intent;
    if (routeParams.action === 'add') {
      openQuickAdd(quickAddPresets[0].time, { focusTitle: true });
    } else if (routeParams.action === 'view' && routeParams.id) {
      setSelectedReminderId(
        reminders.some((reminder) => reminder.id === routeParams.id) ? routeParams.id : null,
      );
    }
    router.setParams({ action: undefined, id: undefined, intent: undefined });
  }, [loading, openQuickAdd, quickAddPresets, reminders, routeParams, router]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      deleteMotionWaiterRef.current?.resolve();
      deleteMotionWaiterRef.current = null;

      if (settingsPressTimeoutRef.current) {
        clearTimeout(settingsPressTimeoutRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      void refreshSettings();
    }, [refreshSettings]),
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isReminderDeletionInProgressRef.current) {
          return true;
        }

        if (selectedReminderRef.current) {
          setSelectedReminderId(null);
          return true;
        }

        if (isQuickAddOpenRef.current) {
          closeQuickAdd();
          return true;
        }

        return false;
      });

      return () => {
        subscription.remove();
      };
    }, [closeQuickAdd, setSelectedReminderId]),
  );

  const handleSave = async (title: string) => {
    if (isSavingRef.current) {
      throw new Error('Reminder save is already in progress');
    }

    isSavingRef.current = true;
    try {
      const result = await createReminder(
        {
          title,
          dateOffset,
          customTargetDate,
          targetTime,
        },
        {
          useTestNotifications: __DEV__ && isNotificationTestModeEnabled,
        },
      );

      if (result.notification.status === 'not-scheduled') {
        const failureMessage = {
          'notification-permission-denied': '端末の通知権限が許可されていません。',
          'exact-alarm-permission-required': '正確な時刻に通知するための許可が必要です。',
          'target-time-passed': '保存中に指定時刻を過ぎたため、通知を予約できませんでした。',
          'scheduling-failed': '端末で通知を予約できませんでした。',
        }[result.notification.reason];

        Alert.alert('リマインダーは保存しましたが、通知を予約できませんでした', failureMessage, [
          { text: 'あとで', style: 'cancel' },
          { text: '設定を確認', onPress: () => router.push('/settings') },
        ]);
      } else if (result.notification.status === 'partial') {
        Alert.alert(
          '前日通知を予約できませんでした',
          '当日の通知は予約されています。端末の通知設定を確認してください。',
        );
      }
    } catch (saveError) {
      console.warn('Failed to save reminder', saveError);
      Alert.alert('追加できませんでした', 'タイトルと時刻を確認してください。');
      throw saveError;
    } finally {
      isSavingRef.current = false;
    }
  };

  const handlePressAdd = useCallback(() => {
    if (isQuickAddOpenRef.current || isSaving) {
      return;
    }

    isQuickAddOpenRef.current = true;
    openQuickAdd(quickAddPresets[0].time);
  }, [isSaving, openQuickAdd, quickAddPresets]);

  const handleOpenReminderList = useCallback(() => {
    router.push('/reminders-list');
  }, [router]);

  const handlePressSettings = useCallback(() => {
    if (settingsPressTimeoutRef.current) {
      clearTimeout(settingsPressTimeoutRef.current);
    }

    setIsSettingsButtonPressed(true);
    settingsPressTimeoutRef.current = setTimeout(() => {
      setIsSettingsButtonPressed(false);
      settingsPressTimeoutRef.current = null;
      router.push('/settings');
    }, SETTINGS_BUTTON_FEEDBACK_MS) as unknown as number;
  }, [router]);

  const waitForDeleteMotion = useCallback(
    (reminderId: string, phase: BubbleDeleteMotionPhase) =>
      new Promise<void>((resolve) => {
        deleteMotionWaiterRef.current?.resolve();
        deleteMotionWaiterRef.current = {
          key: makeDeleteMotionKey(reminderId, phase),
          resolve,
        };
      }),
    [],
  );

  const handleDeleteMotionComplete = useCallback(
    (reminderId: string, phase: BubbleDeleteMotionPhase) => {
      const waiter = deleteMotionWaiterRef.current;

      if (waiter?.key !== makeDeleteMotionKey(reminderId, phase)) {
        return;
      }

      deleteMotionWaiterRef.current = null;
      waiter.resolve();
    },
    [],
  );

  const handleDeleteReminder = useCallback(
    async (reminder: Reminder) => {
      isReminderDeletionInProgressRef.current = true;

      try {
        setDeleteMotion({ reminderId: reminder.id, phase: 'bursting' });
        const [deleteResult] = await Promise.allSettled([
          deleteReminder(reminder.id, { deferCache: true }),
          waitForDeleteMotion(reminder.id, 'bursting'),
        ]);

        if (!isMountedRef.current) {
          return;
        }

        const deleteError =
          deleteResult.status === 'rejected'
            ? deleteResult.reason
            : deleteResult.value
              ? null
              : new Error('Reminder was not found');

        if (deleteError) {
          setDeleteMotion({ reminderId: reminder.id, phase: 'restoring' });
          await waitForDeleteMotion(reminder.id, 'restoring');

          if (!isMountedRef.current) {
            return;
          }

          setDeleteMotion(null);
          console.warn('Failed to delete reminder', deleteError);
          throw deleteError;
        }

        setSelectedReminderId(null);
        removeReminder(reminder.id);
        setDeleteMotion(null);
        void refresh({ silent: true });
      } finally {
        isReminderDeletionInProgressRef.current = false;
      }
    },
    [deleteReminder, refresh, removeReminder, waitForDeleteMotion],
  );

  const handleCloseReminderDetail = useCallback(
    (closedReminderId: string | null) => {
      if (selectedReminderIdRef.current === closedReminderId) {
        setSelectedReminderId(null);
      }
    },
    [setSelectedReminderId],
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

  const isAddButtonDisabled = isSaving;
  const isBubbleIdleDisabled = isSaving;
  const nextReminderLabel = reminders[0]
    ? formatReminderBubbleDateTime(reminders[0].targetAt)
    : '完璧！';
  const nextReminderTitle = reminders[0]?.title ?? '忘れたくないことはありません';
  const isCompactPhoneWidth = windowWidth <= 360;

  return (
    <AppScreen theme={settings?.theme ?? 'sky'}>
      <View pointerEvents="none" className="absolute inset-0">
        <View
          className="absolute rounded-full border border-[rgba(255,255,255,0.42)] bg-[rgba(255,255,255,0.22)]"
          style={styles.ambientOne}
        />
        <View
          className="absolute rounded-full border border-[rgba(255,255,255,0.42)] bg-[rgba(237,230,255,0.20)]"
          style={styles.ambientTwo}
        />
        <View
          className="absolute rounded-full border border-[rgba(255,255,255,0.42)] bg-[rgba(220,248,236,0.20)]"
          style={styles.ambientThree}
        />
      </View>

      <View className="shrink-0 flex-row items-center justify-between pt-[8px]">
        <View className="min-w-0 flex-1 flex-row items-center gap-[12px]">
          <Image source={appIcon} className="h-[54px] w-[54px] rounded-[15px]" />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-[13px] font-bold text-app-muted">
              ポップ・リマインダー
            </Text>
            <Text numberOfLines={1} className="mt-[4px] text-[30px] font-extrabold text-app-ink">
              ふわっと残す
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-[8px]">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="設定を開く"
            hitSlop={8}
            onPress={handlePressSettings}
            className="h-[44px] w-[44px] items-center justify-center rounded-[22px] border border-[rgba(255,255,255,0.90)] bg-[rgba(255,255,255,0.78)]"
            style={({ pressed }) => [
              pressed || isSettingsButtonPressed ? styles.iconButtonPressed : null,
            ]}
          >
            <Ionicons name="settings-outline" size={22} color={palette.ink} />
          </Pressable>
        </View>
      </View>

      <View className="mt-[18px] shrink-0 flex-row gap-[10px]">
        <View
          className="min-h-[54px] min-w-0 flex-1 flex-row items-center gap-[6px] rounded-[27px] border border-[rgba(255,255,255,0.90)] bg-[rgba(255,255,255,0.72)] px-[13px]"
          style={styles.statusPillShadow}
        >
          <Ionicons name="time-outline" size={15} color={palette.lavenderDeep} />
          <Text numberOfLines={1} className="text-[12px] font-extrabold text-app-muted">
            次
          </Text>
          <View className="min-w-0 flex-1 flex-row items-center gap-[8px]">
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 text-[14px] font-black leading-[18px] text-app-ink"
            >
              {nextReminderTitle}
            </Text>
            <Text
              numberOfLines={1}
              className="text-[12px] font-extrabold leading-[16px] text-app-muted"
            >
              {nextReminderLabel}
            </Text>
          </View>
        </View>
      </View>

      <View className="mb-[104px] mt-[14px] flex-1 overflow-visible">
        <ReminderBubbleBoard
          reminders={reminders}
          loading={loading}
          error={error}
          selectedReminderId={selectedReminderId}
          deleteMotion={deleteMotion}
          freezeLayout={isQuickAddOpen}
          idleDisabled={isBubbleIdleDisabled}
          onReminderPress={(reminder) => setSelectedReminderId(reminder.id)}
          onDeleteMotionComplete={handleDeleteMotionComplete}
          onOverflowPress={handleOpenReminderList}
        />
      </View>

      <ReminderInputSheet
        defaultTargetTime={quickAddPresets[0].time}
        presets={quickAddPresets}
        isSaving={isSaving}
        onSave={handleSave}
      />

      <ReminderDetailSheet
        reminder={selectedReminder}
        onClose={handleCloseReminderDetail}
        onDelete={handleDeleteReminder}
        onUpdateTitle={handleUpdateReminderTitle}
      />

      <View
        style={[styles.bottomControls, isCompactPhoneWidth ? styles.bottomControlsCompact : null]}
      >
        <View
          accessibilityLabel="シャボン玉の色。今日、明日、2から3日後、4日以上先"
          accessibilityRole="text"
          className="min-h-[52px] flex-row items-center justify-around gap-[6px] rounded-[26px] border border-[rgba(255,255,255,0.86)] bg-[rgba(255,255,255,0.66)] px-[12px]"
          style={[styles.dueLegend, isCompactPhoneWidth ? styles.dueLegendCompact : null]}
        >
          {dueLegendItems.map((item) => (
            <View key={item.label} className="min-w-0 flex-1 items-center justify-center gap-[3px]">
              <View
                className="h-[18px] w-[18px] rounded-[9px] border-[1.4px]"
                style={[
                  styles.dueLegendBubble,
                  {
                    backgroundColor: item.color.background,
                    borderColor: item.color.border,
                  },
                ]}
              />
              <Text
                numberOfLines={1}
                className="text-center text-[10px] font-black leading-[12px] text-app-muted"
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="リマインダーを追加"
          accessibilityState={{ disabled: isAddButtonDisabled }}
          disabled={isAddButtonDisabled}
          hitSlop={8}
          onPress={handlePressAdd}
          className="h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[32px] border-[2px] border-app-white bg-app-ink"
          style={({ pressed }) => [
            styles.addButton,
            pressed && !isAddButtonDisabled ? styles.addButtonPressed : null,
            isAddButtonDisabled ? styles.addButtonDisabled : null,
          ]}
        >
          <Ionicons name="add" size={30} color={palette.white} />
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  ambientOne: {
    top: 116,
    right: -28,
    width: 108,
    height: 108,
  },
  ambientTwo: {
    top: 270,
    left: -32,
    width: 76,
    height: 76,
    backgroundColor: 'rgba(237,230,255,0.2)',
  },
  ambientThree: {
    right: 54,
    bottom: 132,
    width: 42,
    height: 42,
  },
  iconButtonPressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }, { scale: 0.94 }],
  },
  statusPillShadow: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  bottomControls: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomControlsCompact: {
    left: 16,
    right: 16,
  },
  dueLegend: {
    flex: 1,
    minWidth: 0,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 1,
  },
  dueLegendCompact: {
    paddingHorizontal: 8,
  },
  dueLegendBubble: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  addButton: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 2 }, { scale: 0.97 }],
    shadowOpacity: 0.16,
  },
});
