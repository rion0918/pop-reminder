import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Alert,
  BackHandler,
  Image,
  ImageBackground,
  Linking,
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
import { NotificationPermissionIntroModal } from '../components/NotificationPermissionIntroModal';
import { RaiseToSpeakIntroModal } from '../components/RaiseToSpeakIntroModal';
import { ReminderSelectionBar } from '../components/ReminderSelectionBar';
import { makeBulkDeleteMotions } from '../components/reminderBulkDeleteMotion';
import { useRemindersQuery as useReminders } from '../presentation/useRemindersQuery';
import { useNotificationDevStore } from '../stores/notificationDevStore';
import {
  selectFormattedTime,
  type QuickAddInputMode,
  useReminderUiStore,
} from '../stores/reminderUiStore';
import type { Reminder } from '../types/reminder';
import { useAppServices } from '../../../bootstrap/AppProviders';
import { useAppSettingsQuery as useAppSettings } from '../../settings/presentation/useAppSettingsQuery';
import { AppScreen } from '../../../shared/components/AppScreen';
import { DEFAULT_TIME_PRESETS } from '../../../shared/utils/timePresets';
import { addButtonVisualTokens, bubbleDueColors, palette } from '../../../constants/colors';
import {
  formatReminderBubbleDateTime,
  formatReminderDetailAccessibilityDateTime,
} from '../utils/reminderDateFormat';
import { getNextAvailableTimeForToday } from '../utils/reminderTimePresets';
import { triggerReminderSelectionHaptic } from '../utils/reminderSelectionFeedback';
import { FREE_ACTIVE_REMINDER_LIMIT } from '../../purchases/domain/proAccess';
import { useRaiseToSpeakGesture } from '../hooks/useRaiseToSpeakGesture';

const appIcon = require('../../../../assets/app-icon.png');
const reminderDetailBubbles = require('../../../../assets/reminder-detail-bubbles.png');
const HOME_ADD_BUTTON_SIZE = 64;
const HOME_BOTTOM_CONTROLS_OFFSET = 28;
const HOME_BUBBLE_CONTROLS_GAP = 12;
const HOME_BUBBLE_BOARD_BOTTOM_RESERVE =
  HOME_ADD_BUTTON_SIZE + HOME_BOTTOM_CONTROLS_OFFSET + HOME_BUBBLE_CONTROLS_GAP;
const MAX_VISIBLE_HOME_BUBBLES = 12;

type QuickAddSource = 'home_button' | 'widget_deep_link' | 'raise_to_speak';
type QuickAddOptions = { focusTitle?: boolean; inputMode?: QuickAddInputMode };
type NotificationPermissionMode = 'request' | 'check-only';
type PendingReminderSaveInput = {
  title: string;
  dateOffset: 0 | 1 | 2;
  customTargetDate: string | null;
  targetTime: string;
  useTestNotifications: boolean;
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
  const { analytics, notificationSettings, purchases } = useAppServices();
  const raiseToSpeak = useAppServices().raiseToSpeak;
  const routeParams = useLocalSearchParams<{ action?: string; id?: string; intent?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const {
    reminders,
    loading,
    error,
    refresh,
    removeReminder,
    removeReminders,
    createReminder,
    deleteReminder,
    deleteReminders,
    updateReminderTitle,
    updateReminderSchedule,
    isCreating: isSaving,
    isDeletingReminders,
  } = useReminders();
  const isQuickAddOpen = useReminderUiStore((state) => state.isQuickAddOpen);
  const isQuickAddPickerOpen = useReminderUiStore((state) => state.isQuickAddPickerOpen);
  const openQuickAdd = useReminderUiStore((state) => state.openQuickAdd);
  const closeQuickAdd = useReminderUiStore((state) => state.closeQuickAdd);
  const requestVoiceInputStop = useReminderUiStore((state) => state.requestVoiceInputStop);
  const dateOffset = useReminderUiStore((state) => state.dateOffset);
  const datePreset = useReminderUiStore((state) => state.datePreset);
  const customTargetDate = useReminderUiStore((state) => state.customTargetDate);
  const targetTime = useReminderUiStore(selectFormattedTime);
  const isNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.isNotificationTestModeEnabled,
  );
  const { settings, refresh: refreshSettings, update: updateSettings } = useAppSettings();
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
  const getQuickAddDefaultTime = useCallback(
    () => getNextAvailableTimeForToday(new Date(), quickAddPresets) ?? quickAddPresets[0].time,
    [quickAddPresets],
  );
  const isQuickAddOpenRef = useRef(false);
  const isSavingRef = useRef(false);
  const isQuickAddRequestPendingRef = useRef(false);
  const quickAddSourceRef = useRef<QuickAddSource>('home_button');
  const raiseSessionActiveRef = useRef(false);
  const raiseCalibrationSessionRef = useRef(false);
  const selectedReminderRef = useRef<Reminder | null>(null);
  const selectedReminderIdRef = useRef<string | null>(null);
  const isSelectionModeRef = useRef(false);
  const deleteMotionWaitersRef = useRef(new Map<string, () => void>());
  const isReminderDeletionInProgressRef = useRef(false);
  const isMountedRef = useRef(true);
  const pendingReminderSaveRef = useRef<{
    input: PendingReminderSaveInput;
    resolve: (permissionMode: NotificationPermissionMode) => void;
  } | null>(null);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<Set<string>>(() => new Set());
  const [isBulkDeletionInProgress, setIsBulkDeletionInProgress] = useState(false);
  const [bulkDeleteMotions, setBulkDeleteMotions] = useState<readonly BubbleDeleteMotion[]>([]);
  const consumedIntentRef = useRef<string | null>(null);
  const [isRaiseToSpeakSetupBusy, setIsRaiseToSpeakSetupBusy] = useState(false);
  const [isRaiseToSpeakCalibrating, setIsRaiseToSpeakCalibrating] = useState(false);
  const [raiseToSpeakSetupMessage, setRaiseToSpeakSetupMessage] = useState<string | null>(null);
  const [isNotificationPermissionIntroVisible, setIsNotificationPermissionIntroVisible] =
    useState(false);
  const [isNotificationPermissionIntroBusy, setIsNotificationPermissionIntroBusy] = useState(false);
  const [notificationPermissionCanAskAgain, setNotificationPermissionCanAskAgain] = useState(true);

  const selectedReminder = reminders.find((r) => r.id === selectedReminderId) || null;
  const visibleReminderIds = useMemo(
    () => new Set(reminders.slice(0, MAX_VISIBLE_HOME_BUBBLES).map((reminder) => reminder.id)),
    [reminders],
  );
  const selectedCount = selectedReminderIds.size;
  const allVisibleRemindersSelected =
    visibleReminderIds.size > 0 && selectedCount === visibleReminderIds.size;
  const isSelectionBusy = isDeletingReminders || isBulkDeletionInProgress;

  const [deleteMotion, setDeleteMotion] = useState<BubbleDeleteMotion | null>(null);

  const openQuickAddForSource = useCallback(
    (source: QuickAddSource, options?: QuickAddOptions) => {
      isQuickAddOpenRef.current = true;
      quickAddSourceRef.current = source;
      analytics.captureQuickAddOpened({ source });
      openQuickAdd(getQuickAddDefaultTime(), options);
    },
    [analytics, getQuickAddDefaultTime, openQuickAdd],
  );

  const showActiveLimitPaywall = useCallback(
    async (source: QuickAddSource) => {
      analytics.captureProGateReached({ source });
      const result = await purchases.presentProPaywallIfNeeded();
      analytics.captureProPaywallResult({ placement: 'active_limit', outcome: result });

      if (result === 'cancelled') return false;
      if (result === 'error') {
        Alert.alert(
          'Proを確認できませんでした',
          '通信状況を確認して、時間をおいてもう一度お試しください。',
        );
        return false;
      }

      const accessState = await purchases.getProAccessState();
      return result === 'purchased' || result === 'restored' || accessState !== 'free';
    },
    [analytics, purchases],
  );

  const requestQuickAdd = useCallback(
    async (source: QuickAddSource, options?: QuickAddOptions) => {
      if (isQuickAddOpenRef.current || isSavingRef.current || isQuickAddRequestPendingRef.current) {
        if (isQuickAddOpenRef.current && options?.inputMode === 'voice') {
          openQuickAddForSource(source, options);
          return true;
        }
        return false;
      }

      isQuickAddRequestPendingRef.current = true;
      try {
        if (reminders.length >= FREE_ACTIVE_REMINDER_LIMIT) {
          const accessState = await purchases.getProAccessState();
          if (accessState === 'free' && !(await showActiveLimitPaywall(source))) {
            return false;
          }
        }

        if (source === 'raise_to_speak' && !raiseSessionActiveRef.current) return false;

        openQuickAddForSource(source, options);
        return true;
      } finally {
        isQuickAddRequestPendingRef.current = false;
      }
    },
    [openQuickAddForSource, purchases, reminders.length, showActiveLimitPaywall],
  );

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
    isSelectionModeRef.current = isSelectionMode;
  }, [isSelectionMode]);

  useEffect(() => {
    setSelectedReminderIds((current) => {
      const next = new Set([...current].filter((id) => visibleReminderIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleReminderIds]);

  useEffect(() => {
    if (!routeParams.intent || consumedIntentRef.current === routeParams.intent) return;
    if ((routeParams.action === 'add' || routeParams.action === 'view') && loading) return;

    consumedIntentRef.current = routeParams.intent;
    if (routeParams.action === 'add') {
      void requestQuickAdd('widget_deep_link', { focusTitle: true });
    } else if (routeParams.action === 'view' && routeParams.id) {
      setSelectedReminderId(
        reminders.some((reminder) => reminder.id === routeParams.id) ? routeParams.id : null,
      );
    }
    router.setParams({ action: undefined, id: undefined, intent: undefined });
  }, [loading, reminders, requestQuickAdd, routeParams, router]);

  useEffect(() => {
    isMountedRef.current = true;
    const deleteMotionWaiters = deleteMotionWaitersRef.current;

    return () => {
      isMountedRef.current = false;
      for (const resolve of deleteMotionWaiters.values()) {
        resolve();
      }
      deleteMotionWaiters.clear();
    };
  }, []);

  const cancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedReminderIds(new Set());
  }, []);

  const handleReminderLongPress = useCallback(
    (reminder: Reminder) => {
      if (isSelectionBusy || isSelectionMode) return;

      setSelectedReminderId(null);
      setIsSelectionMode(true);
      setSelectedReminderIds(new Set([reminder.id]));
      void triggerReminderSelectionHaptic();
    },
    [isSelectionBusy, isSelectionMode],
  );

  const handleReminderPress = useCallback(
    (reminder: Reminder) => {
      if (isSelectionBusy) return;

      if (isSelectionMode) {
        void triggerReminderSelectionHaptic();
        setSelectedReminderIds((current) => {
          const next = new Set(current);
          if (next.has(reminder.id)) {
            next.delete(reminder.id);
          } else {
            next.add(reminder.id);
          }
          return next;
        });
        return;
      }

      setSelectedReminderId(reminder.id);
    },
    [isSelectionBusy, isSelectionMode],
  );

  const toggleSelectAll = useCallback(() => {
    if (isSelectionBusy) return;

    void triggerReminderSelectionHaptic();
    setSelectedReminderIds(allVisibleRemindersSelected ? new Set() : new Set(visibleReminderIds));
  }, [allVisibleRemindersSelected, isSelectionBusy, visibleReminderIds]);

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

        if (isSelectionModeRef.current) {
          cancelSelection();
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
    }, [cancelSelection, closeQuickAdd]),
  );

  const saveReminder = async (
    input: PendingReminderSaveInput,
    options: {
      permissionMode?: NotificationPermissionMode;
      suppressPermissionDeniedAlert?: boolean;
    } = {},
  ) => {
    if (isSavingRef.current) {
      throw new Error('Reminder save is already in progress');
    }

    isSavingRef.current = true;
    try {
      const result = await createReminder(
        {
          title: input.title,
          dateOffset: input.dateOffset,
          customTargetDate: input.customTargetDate,
          targetTime: input.targetTime,
        },
        {
          useTestNotifications: input.useTestNotifications,
          permissionMode: options.permissionMode,
        },
      );
      analytics.captureReminderCreated({
        source: quickAddSourceRef.current,
        datePreset,
        notificationStatus: result.notification.status,
        notificationReason:
          'reason' in result.notification ? result.notification.reason : undefined,
      });

      if (
        result.notification.status === 'not-scheduled' &&
        !(
          result.notification.reason === 'notification-permission-denied' &&
          options.suppressPermissionDeniedAlert
        )
      ) {
        const failureMessage = {
          'notification-permission-denied': '端末の通知権限が許可されていません。',
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

      if (reminders.length + 1 >= FREE_ACTIVE_REMINDER_LIMIT) {
        const accessState = await purchases.getProAccessState();
        if (accessState === 'free') {
          closeQuickAdd();
        }
      }
    } catch (saveError) {
      console.warn('Failed to save reminder', saveError);
      if (saveError instanceof Error && saveError.name === 'ActiveReminderLimitReachedError') {
        Alert.alert(
          '無料版では6件まで追加できます',
          'Pro版ふわっと。なら、忘れたくないことを無制限に追加できます。',
          [
            { text: 'あとで', style: 'cancel' },
            {
              text: 'Proを見る',
              onPress: () => void showActiveLimitPaywall(quickAddSourceRef.current),
            },
          ],
        );
      } else {
        Alert.alert('追加できませんでした', 'タイトルと時刻を確認してください。');
      }
      throw saveError;
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleSave = async (title: string) => {
    const input: PendingReminderSaveInput = {
      title,
      dateOffset,
      customTargetDate,
      targetTime,
      useTestNotifications: __DEV__ && isNotificationTestModeEnabled,
    };

    if (settings?.notificationPermissionIntroSeen) {
      return saveReminder(input, { permissionMode: 'check-only' });
    }

    try {
      const permission = await notificationSettings.getNotificationPermissionStatus();
      if (permission.status === 'granted') {
        return saveReminder(input, { permissionMode: 'check-only' });
      }

      setNotificationPermissionCanAskAgain(permission.canAskAgain);
      const permissionMode = await new Promise<NotificationPermissionMode>((resolve) => {
        pendingReminderSaveRef.current = { input, resolve };
        setIsNotificationPermissionIntroVisible(true);
      });

      return saveReminder(input, {
        permissionMode,
        suppressPermissionDeniedAlert: true,
      });
    } catch (error) {
      console.warn('Failed to prepare notification permission prompt', error);
      return saveReminder(input, { permissionMode: 'check-only' });
    }
  };

  const resolveNotificationPermissionIntro = useCallback(
    async (requestPermission: boolean) => {
      const pending = pendingReminderSaveRef.current;
      if (!pending || isNotificationPermissionIntroBusy) return;

      setIsNotificationPermissionIntroBusy(true);
      try {
        if (requestPermission) {
          if (notificationPermissionCanAskAgain) {
            await notificationSettings.requestNotificationPermissions();
          } else {
            await Linking.openSettings();
          }
        }
        await updateSettings({ notificationPermissionIntroSeen: true });
      } catch (error) {
        console.warn('Failed to resolve notification permission intro', error);
      } finally {
        pendingReminderSaveRef.current = null;
        setIsNotificationPermissionIntroVisible(false);
        setIsNotificationPermissionIntroBusy(false);
        pending.resolve('check-only');
      }
    },
    [
      isNotificationPermissionIntroBusy,
      notificationPermissionCanAskAgain,
      notificationSettings,
      updateSettings,
    ],
  );

  const handleAllowNotificationPermission = useCallback(() => {
    void resolveNotificationPermissionIntro(true);
  }, [resolveNotificationPermissionIntro]);

  const handleDismissNotificationPermission = useCallback(() => {
    void resolveNotificationPermissionIntro(false);
  }, [resolveNotificationPermissionIntro]);

  const handlePressAdd = useCallback(() => {
    void requestQuickAdd('home_button', { focusTitle: true });
  }, [requestQuickAdd]);

  const handleOpenReminderList = useCallback(() => {
    router.push('/reminders-list');
  }, [router]);

  const handlePressSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const waitForDeleteMotion = useCallback(
    (reminderId: string, phase: BubbleDeleteMotionPhase) =>
      new Promise<void>((resolve) => {
        const key = makeDeleteMotionKey(reminderId, phase);
        deleteMotionWaitersRef.current.get(key)?.();
        deleteMotionWaitersRef.current.set(key, resolve);
      }),
    [],
  );

  const handleDeleteMotionComplete = useCallback(
    (reminderId: string, phase: BubbleDeleteMotionPhase) => {
      const key = makeDeleteMotionKey(reminderId, phase);
      const resolve = deleteMotionWaitersRef.current.get(key);

      if (!resolve) return;

      deleteMotionWaitersRef.current.delete(key);
      resolve();
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      isReminderDeletionInProgressRef.current = true;
      setIsBulkDeletionInProgress(true);

      try {
        const deletedIds = await deleteReminders(ids, { deferCache: true });
        analytics.captureReminderDeleted({ surface: 'home', count: deletedIds.length });
        const motions = makeBulkDeleteMotions(deletedIds);
        const motionCompletion = Promise.all(
          motions.map((motion) => waitForDeleteMotion(motion.reminderId, motion.phase)),
        );

        setBulkDeleteMotions(motions);
        await motionCompletion;

        if (!isMountedRef.current) return;

        setBulkDeleteMotions([]);
        removeReminders(deletedIds);
        cancelSelection();
        void refresh({ silent: true });
      } catch (deleteError) {
        if (!isMountedRef.current) return;

        setBulkDeleteMotions([]);
        console.warn('Failed to delete reminders from home', deleteError);
        Alert.alert('削除できませんでした', '時間をおいてもう一度お試しください。');
      } finally {
        isReminderDeletionInProgressRef.current = false;
        if (isMountedRef.current) {
          setIsBulkDeletionInProgress(false);
        }
      }
    },
    [analytics, cancelSelection, deleteReminders, refresh, removeReminders, waitForDeleteMotion],
  );

  const handleBulkDeletePress = useCallback(() => {
    if (selectedCount === 0 || isSelectionBusy) return;

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
  }, [handleBulkDelete, isSelectionBusy, selectedCount, selectedReminderIds]);

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

        analytics.captureReminderDeleted({ surface: 'home', count: 1 });
        setSelectedReminderId(null);
        removeReminder(reminder.id);
        setDeleteMotion(null);
        void refresh({ silent: true });
      } finally {
        isReminderDeletionInProgressRef.current = false;
      }
    },
    [analytics, deleteReminder, refresh, removeReminder, waitForDeleteMotion],
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

      analytics.captureReminderEdited({ surface: 'home', field: 'title' });
      return updatedReminder;
    },
    [analytics, updateReminderTitle],
  );

  const handleUpdateReminderSchedule = useCallback(
    async (reminder: Reminder, input: { targetDate: string; targetTime: string }) => {
      const result = await updateReminderSchedule(reminder.id, input);

      if (!result) {
        throw new Error('Reminder was not found');
      }

      if (result.notification.status !== 'unchanged') {
        analytics.captureReminderEdited({
          surface: 'home',
          field: 'schedule',
          notificationStatus: result.notification.status,
          notificationReason:
            'reason' in result.notification ? result.notification.reason : undefined,
        });
      }
      return result;
    },
    [analytics, updateReminderSchedule],
  );

  const handleDismissRaiseToSpeakIntro = useCallback(() => {
    if (isRaiseToSpeakSetupBusy) return;

    setRaiseToSpeakSetupMessage(null);
    setIsRaiseToSpeakCalibrating(false);
    void updateSettings({ raiseToSpeakEnabled: false, raiseToSpeakIntroSeen: false });
  }, [isRaiseToSpeakSetupBusy, updateSettings]);

  const handlePrepareRaiseToSpeak = useCallback(async () => {
    if (isRaiseToSpeakSetupBusy) return;

    setIsRaiseToSpeakSetupBusy(true);
    setRaiseToSpeakSetupMessage(null);
    try {
      const result = await raiseToSpeak.prepare();
      if (result.status === 'ready') {
        setIsRaiseToSpeakCalibrating(true);
        return;
      }

      if (result.status === 'model-download-started') {
        setRaiseToSpeakSetupMessage(
          '日本語モデルの準備後、もう一度「使ってみる」を押してください。',
        );
        return;
      }

      if (result.status === 'permission-denied') {
        const message = result.canAskAgain
          ? 'マイクとモーションの権限を許可してください。'
          : '端末の設定でマイクとモーションの権限を許可してください。';
        setRaiseToSpeakSetupMessage(message);
        if (!result.canAskAgain) {
          Alert.alert('権限が必要です', message, [
            { text: 'あとで', style: 'cancel' },
            { text: '設定を開く', onPress: () => void Linking.openSettings() },
          ]);
        }
        return;
      }

      const message = {
        'motion-unavailable': 'この端末ではモーション検出を利用できません。',
        'speech-unavailable': 'この端末では日本語の端末内音声認識を利用できません。',
      }[result.status];
      setRaiseToSpeakSetupMessage(message);
    } catch {
      setRaiseToSpeakSetupMessage('音声入力の準備を完了できませんでした。');
    } finally {
      setIsRaiseToSpeakSetupBusy(false);
    }
  }, [isRaiseToSpeakSetupBusy, raiseToSpeak]);

  const handleRaiseToSpeakStart = useCallback(async () => {
    if (isRaiseToSpeakCalibrating && isRaiseToSpeakSetupBusy) return;

    raiseSessionActiveRef.current = true;

    if (isRaiseToSpeakCalibrating) {
      raiseCalibrationSessionRef.current = true;
      setIsRaiseToSpeakSetupBusy(true);
      try {
        await updateSettings({
          raiseToSpeakEnabled: true,
          raiseToSpeakIntroSeen: true,
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setIsRaiseToSpeakCalibrating(false);
      } catch {
        raiseCalibrationSessionRef.current = false;
        raiseSessionActiveRef.current = false;
        setRaiseToSpeakSetupMessage('設定を保存できませんでした。もう一度お試しください。');
        setIsRaiseToSpeakCalibrating(false);
      } finally {
        setIsRaiseToSpeakSetupBusy(false);
      }
      return;
    }

    void requestQuickAdd('raise_to_speak', { inputMode: 'voice' }).then((opened) => {
      if (!opened) raiseSessionActiveRef.current = false;
    });
  }, [isRaiseToSpeakCalibrating, isRaiseToSpeakSetupBusy, requestQuickAdd, updateSettings]);

  const handleRaiseToSpeakStop = useCallback(() => {
    raiseSessionActiveRef.current = false;
    if (raiseCalibrationSessionRef.current) {
      raiseCalibrationSessionRef.current = false;
      return;
    }
    requestVoiceInputStop();
  }, [requestVoiceInputStop]);

  useRaiseToSpeakGesture({
    enabled: Boolean(settings?.raiseToSpeakEnabled) || isRaiseToSpeakCalibrating,
    blocked:
      (!settings?.raiseToSpeakIntroSeen && !isRaiseToSpeakCalibrating) ||
      isRaiseToSpeakSetupBusy ||
      isSelectionMode ||
      isSelectionBusy ||
      selectedReminder !== null ||
      isQuickAddPickerOpen ||
      isSaving,
    onStart: handleRaiseToSpeakStart,
    onStop: handleRaiseToSpeakStop,
  });

  const isAddButtonDisabled = isSaving;
  const isBubbleIdleDisabled = isSaving;
  const isEmptyHome = !loading && !error && reminders.length === 0;
  const nextReminder = reminders[0] ?? null;
  const nextReminderLabel = nextReminder
    ? formatReminderBubbleDateTime(nextReminder.targetAt)
    : null;
  const nextReminderAccessibilityLabel = nextReminder
    ? `次のリマインド、${nextReminder.title}、${formatReminderDetailAccessibilityDateTime(nextReminder.targetAt)}`
    : undefined;
  const isCompactPhoneWidth = windowWidth <= 360;

  return (
    <AppScreen theme={settings?.theme ?? 'lavender'}>
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
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              className="text-[30px] font-extrabold text-app-ink"
            >
              ふわっと。
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              className="mt-[2px] text-[13px] font-bold text-app-muted"
            >
              忘れる前に、数秒だけ。
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-[8px]">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSelectionMode ? '選択モードを閉じる' : '設定を開く'}
            accessibilityState={{ disabled: isSelectionBusy }}
            disabled={isSelectionBusy}
            hitSlop={8}
            onPress={isSelectionMode ? cancelSelection : handlePressSettings}
            className="h-[44px] w-[44px] items-center justify-center rounded-[22px] border border-[rgba(255,255,255,0.90)] bg-[rgba(255,255,255,0.78)]"
            style={({ pressed }) => [pressed ? styles.iconButtonPressed : null]}
          >
            <Ionicons
              name={isSelectionMode ? 'close' : 'settings-outline'}
              size={22}
              color={palette.ink}
            />
          </Pressable>
        </View>
      </View>

      {nextReminder ? (
        <View className="mt-[18px] shrink-0">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nextReminderAccessibilityLabel}
            accessibilityHint="詳細を開きます"
            accessibilityState={{ disabled: isSelectionMode || isSelectionBusy }}
            disabled={isSelectionMode || isSelectionBusy}
            onPress={() => setSelectedReminderId(nextReminder.id)}
            style={({ pressed }) => [
              styles.nextReminderCard,
              isSelectionMode ? styles.nextReminderCardInactive : null,
              pressed ? styles.nextReminderCardPressed : null,
            ]}
          >
            <ImageBackground
              source={reminderDetailBubbles}
              resizeMode="cover"
              style={styles.nextReminderBackground}
              imageStyle={styles.nextReminderBackgroundImage}
            >
              <View style={styles.nextReminderIcon}>
                <Ionicons name="notifications-outline" size={19} color={palette.lavenderDeep} />
              </View>
              <View style={styles.nextReminderContent}>
                <Text style={styles.nextReminderKicker}>次のリマインド</Text>
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.nextReminderTitle}>
                  {nextReminder.title}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.nextReminderDateTime}>
                {nextReminderLabel}
              </Text>
            </ImageBackground>
          </Pressable>
        </View>
      ) : null}

      <View
        style={[styles.bubbleBoardContainer, isEmptyHome ? styles.bubbleBoardContainerEmpty : null]}
      >
        <ReminderBubbleBoard
          reminders={reminders}
          loading={loading}
          error={error}
          selectedReminderId={selectedReminderId}
          selectedReminderIds={selectedReminderIds}
          selectionMode={isSelectionMode}
          deleteMotion={deleteMotion}
          deleteMotions={bulkDeleteMotions}
          freezeLayout={isQuickAddOpen}
          idleDisabled={isBubbleIdleDisabled}
          interactionDisabled={isSelectionBusy}
          onReminderPress={handleReminderPress}
          onReminderLongPress={handleReminderLongPress}
          onDeleteMotionComplete={handleDeleteMotionComplete}
          onOverflowPress={handleOpenReminderList}
          onEmptyPress={handlePressAdd}
          emptyDisabled={isAddButtonDisabled}
          verticalLayoutMode="homeTimeline"
        />
      </View>

      <ReminderInputSheet
        defaultTargetTime={getQuickAddDefaultTime()}
        presets={quickAddPresets}
        isSaving={isSaving}
        onSave={handleSave}
      />

      <ReminderDetailSheet
        reminder={selectedReminder}
        onClose={handleCloseReminderDetail}
        onDelete={handleDeleteReminder}
        onUpdateTitle={handleUpdateReminderTitle}
        onUpdateSchedule={handleUpdateReminderSchedule}
      />

      {isSelectionMode ? (
        <ReminderSelectionBar
          selectedCount={selectedCount}
          allSelected={allVisibleRemindersSelected}
          busy={isSelectionBusy}
          compact={isCompactPhoneWidth}
          onToggleAll={toggleSelectAll}
          onDelete={handleBulkDeletePress}
          style={[
            styles.selectionControls,
            isCompactPhoneWidth ? styles.bottomControlsCompact : null,
          ]}
        />
      ) : !isEmptyHome ? (
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
              <View
                key={item.label}
                className="min-w-0 flex-1 items-center justify-center gap-[3px]"
              >
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
            className="h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[32px]"
            style={({ pressed }) => [
              styles.addButton,
              pressed && !isAddButtonDisabled ? styles.addButtonPressed : null,
              isAddButtonDisabled ? styles.addButtonDisabled : null,
            ]}
          >
            <LinearGradient
              colors={[addButtonVisualTokens.gradientFrom, addButtonVisualTokens.gradientTo]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.addButtonSurface}
            >
              <Ionicons name="add" size={30} color={addButtonVisualTokens.text} />
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}

      <RaiseToSpeakIntroModal
        visible={Boolean(settings?.raiseToSpeakEnabled && !settings.raiseToSpeakIntroSeen)}
        busy={isRaiseToSpeakSetupBusy}
        calibrating={isRaiseToSpeakCalibrating}
        message={raiseToSpeakSetupMessage}
        onEnable={() => void handlePrepareRaiseToSpeak()}
        onDismiss={handleDismissRaiseToSpeakIntro}
      />
      <NotificationPermissionIntroModal
        visible={isNotificationPermissionIntroVisible}
        busy={isNotificationPermissionIntroBusy}
        canAskAgain={notificationPermissionCanAskAgain}
        onAllow={handleAllowNotificationPermission}
        onDismiss={handleDismissNotificationPermission}
      />
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
  nextReminderCard: {
    minHeight: 68,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(211,213,251,0.72)',
    backgroundColor: palette.lavender,
  },
  nextReminderCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  nextReminderCardInactive: {
    opacity: 0.62,
  },
  nextReminderBackground: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  nextReminderBackgroundImage: {
    borderRadius: 23,
  },
  nextReminderIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.84)',
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  nextReminderContent: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
  },
  nextReminderKicker: {
    color: palette.lavenderDeep,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  nextReminderTitle: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  nextReminderDateTime: {
    flexShrink: 0,
    marginLeft: 10,
    color: palette.lavenderDeep,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  bubbleBoardContainer: {
    flex: 1,
    marginTop: 14,
    marginBottom: HOME_BUBBLE_BOARD_BOTTOM_RESERVE,
    overflow: 'visible',
  },
  bubbleBoardContainerEmpty: {
    marginBottom: 0,
  },
  bottomControls: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: HOME_BOTTOM_CONTROLS_OFFSET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionControls: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: HOME_BOTTOM_CONTROLS_OFFSET,
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: addButtonVisualTokens.border,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
  },
  addButtonSurface: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
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
