import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ElementRef } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { addDays, format, set, startOfDay } from 'date-fns';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { TimePickerModal } from '../../../shared/components/TimePickerModal';
import { TimeSelector } from '../../../shared/components/TimeSelector';
import { DEFAULT_TIME_PRESETS, type TimePreset } from '../../../shared/utils/timePresets';
import { palette } from '../../../constants/colors';
import {
  selectIsTimeValid,
  selectFormattedTime,
  useReminderUiStore,
} from '../stores/reminderUiStore';
import { REMINDER_TITLE_MAX_LENGTH } from '../schemas/reminderSchema';
import { formatReminderInputDate } from '../utils/reminderDateFormat';
import { getNextAvailableTimeForToday } from '../utils/reminderTimePresets';
import { DateChips } from './DateChips';
import { useAppServices } from '../../../bootstrap/AppProviders';

type VoiceInputStatus = 'idle' | 'starting' | 'listening' | 'stopping';

export type ReminderInputSheetProps = {
  defaultTargetTime?: string;
  presets?: TimePreset[];
  isSaving?: boolean;
  onSave?: (title: string) => Promise<void> | void;
};

const QUICK_ADD_BOTTOM_CLEARANCE = 24;
const VOICE_STOP_FALLBACK_MS = 1_500;
const datePickerDisplay = Platform.select({
  ios: 'spinner',
  android: 'default',
  default: 'default',
} as const);

function buildTargetDateTime(targetDate: Date, time: string) {
  const [hoursText, minutesText] = time.split(':');

  return set(targetDate, {
    hours: Number(hoursText),
    minutes: Number(minutesText),
    seconds: 0,
    milliseconds: 0,
  });
}

function normalizeVoiceText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function joinVoiceText(...values: string[]) {
  return values.map(normalizeVoiceText).filter(Boolean).join(' ');
}

function voiceErrorMessage(error: string) {
  if (error === 'no-speech' || error === 'speech-timeout') {
    return '音声を聞き取れませんでした。もう一度お試しください。';
  }
  if (error === 'interrupted') return '通話やアラームにより音声入力が中断されました。';
  if (error === 'not-allowed') return 'マイクの使用が許可されていません。';
  if (error === 'language-not-supported' || error === 'service-not-allowed') {
    return 'この端末では日本語の端末内音声認識を利用できません。';
  }
  return '音声入力を完了できませんでした。手入力をお試しください。';
}

export function ReminderInputSheet({
  defaultTargetTime = '08:00',
  presets = DEFAULT_TIME_PRESETS,
  isSaving = false,
  onSave,
}: ReminderInputSheetProps) {
  const voiceInput = useAppServices().voiceInput;
  const safeAreaInsets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const titleInputRef = useRef<ElementRef<typeof BottomSheetTextInput>>(null);
  const draftTitleRef = useRef('');
  const [draftTitle, setDraftTitleText] = useState('');
  const isPresentedRef = useRef(false);
  const isClosingRef = useRef(false);
  const isSaveRequestedRef = useRef(false);
  const titleFocusRequestIdRef = useRef(0);
  const pendingTitleFocusRequestIdRef = useRef<number | null>(null);
  const handledVoiceInputRequestIdRef = useRef(0);
  const handledVoiceInputStopRequestIdRef = useRef(0);
  const voiceOperationIdRef = useRef(0);
  const voiceStatusRef = useRef<VoiceInputStatus>('idle');
  const voiceBaselineTitleRef = useRef('');
  const voiceCommittedTranscriptRef = useRef('');
  const voiceReceivedTextRef = useRef(false);
  const explicitVoiceAbortRef = useRef(false);
  const voiceStopFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginVoiceInputRef = useRef<() => void>(() => {});
  const stopVoiceInputRef = useRef<() => void>(() => {});
  const isOpenRef = useRef(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [titleLength, setTitleLength] = useState(0);
  const [titleNotice, setTitleNotice] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceInputStatus>('idle');
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [dismissalVersion, setDismissalVersion] = useState(0);
  const sheetTopInset = safeAreaInsets.top + 8;
  const quickAddMaxDynamicContentSize = useMemo(
    () =>
      Math.max(
        1,
        windowHeight - sheetTopInset - safeAreaInsets.bottom - QUICK_ADD_BOTTOM_CLEARANCE,
      ),
    [safeAreaInsets.bottom, sheetTopInset, windowHeight],
  );
  const quickAddContentBottomPadding = useMemo(
    () => 18 + safeAreaInsets.bottom,
    [safeAreaInsets.bottom],
  );
  const minCustomDate = useMemo(() => startOfDay(new Date()), []);

  const isOpen = useReminderUiStore((state) => state.isQuickAddOpen);
  const shouldFocusTitleOnOpen = useReminderUiStore((state) => state.shouldFocusTitleOnOpen);
  const quickAddInputMode = useReminderUiStore((state) => state.quickAddInputMode);
  const voiceInputRequestId = useReminderUiStore((state) => state.voiceInputRequestId);
  const voiceInputStopRequestId = useReminderUiStore((state) => state.voiceInputStopRequestId);
  const dateOffset = useReminderUiStore((state) => state.dateOffset);
  const datePreset = useReminderUiStore((state) => state.datePreset);
  const customTargetDate = useReminderUiStore((state) => state.customTargetDate);
  const time = useReminderUiStore(selectFormattedTime);
  const isTimeValid = useReminderUiStore(selectIsTimeValid);
  const closeQuickAdd = useReminderUiStore((state) => state.closeQuickAdd);
  const completeVoiceInput = useReminderUiStore((state) => state.completeVoiceInput);
  const setQuickAddPickerOpen = useReminderUiStore((state) => state.setQuickAddPickerOpen);
  const setTitle = useReminderUiStore((state) => state.setTitle);
  const resetTitle = useReminderUiStore((state) => state.resetTitle);
  const setDateOffset = useReminderUiStore((state) => state.setDateOffset);
  const setPresetTargetDate = useReminderUiStore((state) => state.setPresetTargetDate);
  const setCustomTargetDate = useReminderUiStore((state) => state.setCustomTargetDate);
  const setTargetTime = useReminderUiStore((state) => state.setTargetTime);
  const resetInput = useReminderUiStore((state) => state.resetInput);
  isOpenRef.current = isOpen;

  const datePickerValue = useMemo(() => {
    if (!customTargetDate) {
      return minCustomDate;
    }

    return new Date(`${customTargetDate}T12:00:00`);
  }, [customTargetDate, minCustomDate]);

  const selectedTargetDate = useMemo(() => {
    if (customTargetDate) {
      return new Date(`${customTargetDate}T00:00:00`);
    }

    return addDays(new Date(), dateOffset);
  }, [customTargetDate, dateOffset]);

  const selectedDateLabel = useMemo(
    () => formatReminderInputDate(selectedTargetDate),
    [selectedTargetDate],
  );

  const targetAt = useMemo(() => {
    return buildTargetDateTime(selectedTargetDate, time);
  }, [selectedTargetDate, time]);

  const isTargetFuture = targetAt.getTime() > Date.now();
  const isTitleCountWarning = titleLength >= REMINDER_TITLE_MAX_LENGTH - 5;
  const isTitleOverLimit = titleLength > REMINDER_TITLE_MAX_LENGTH;
  const titleCountAccessibilityLabel = isTitleOverLimit
    ? `タイトルは${titleLength}文字、上限を${titleLength - REMINDER_TITLE_MAX_LENGTH}文字超えています`
    : `タイトルは${titleLength}文字、あと${REMINDER_TITLE_MAX_LENGTH - titleLength}文字入力できます`;

  const resetDraftTitle = useCallback(() => {
    draftTitleRef.current = '';
    setDraftTitleText('');
    setTitleLength(0);
    titleInputRef.current?.clear();
  }, []);

  const updateDraftTitle = useCallback((text: string) => {
    draftTitleRef.current = text;
    setTitleLength(text.length);
    setDraftTitleText(text);
  }, []);

  const invalidateTitleFocusRequest = useCallback(() => {
    titleFocusRequestIdRef.current += 1;
    pendingTitleFocusRequestIdRef.current = null;
  }, []);

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />
    ),
    [],
  );

  const setVoiceStatusValue = useCallback((status: VoiceInputStatus) => {
    voiceStatusRef.current = status;
    setVoiceStatus(status);
  }, []);

  const clearVoiceStopFallback = useCallback(() => {
    if (voiceStopFallbackRef.current === null) return;
    clearTimeout(voiceStopFallbackRef.current);
    voiceStopFallbackRef.current = null;
  }, []);

  const cancelVoiceInput = useCallback(
    (restoreBaseline: boolean) => {
      clearVoiceStopFallback();
      voiceOperationIdRef.current += 1;
      explicitVoiceAbortRef.current = true;
      if (voiceStatusRef.current !== 'idle') voiceInput.abort();
      if (restoreBaseline) updateDraftTitle(voiceBaselineTitleRef.current);
      voiceCommittedTranscriptRef.current = '';
      voiceReceivedTextRef.current = false;
      setVoiceVolume(0);
      setVoiceStatusValue('idle');
      completeVoiceInput();
    },
    [clearVoiceStopFallback, completeVoiceInput, setVoiceStatusValue, updateDraftTitle, voiceInput],
  );

  const stopVoiceInput = useCallback(() => {
    if (voiceStatusRef.current === 'idle' || voiceStatusRef.current === 'stopping') return;

    clearVoiceStopFallback();
    if (voiceStatusRef.current === 'starting') {
      voiceOperationIdRef.current += 1;
      explicitVoiceAbortRef.current = true;
      voiceInput.abort();
      setVoiceStatusValue('idle');
      completeVoiceInput();
      return;
    }

    setVoiceStatusValue('stopping');
    setVoiceVolume(0);
    voiceInput.stop();
    completeVoiceInput();
    voiceStopFallbackRef.current = setTimeout(() => {
      voiceStopFallbackRef.current = null;
      if (voiceStatusRef.current !== 'stopping') return;

      explicitVoiceAbortRef.current = true;
      voiceInput.abort();
      setVoiceVolume(0);
      setVoiceStatusValue('idle');
      completeVoiceInput();
      void Haptics.selectionAsync().catch(() => {});
      AccessibilityInfo.announceForAccessibility('音声入力を終了しました。内容を確認してください');
    }, VOICE_STOP_FALLBACK_MS);
  }, [clearVoiceStopFallback, completeVoiceInput, setVoiceStatusValue, voiceInput]);

  const beginVoiceInput = useCallback(async () => {
    if (voiceStatusRef.current !== 'idle') return;

    clearVoiceStopFallback();
    const operationId = voiceOperationIdRef.current + 1;
    voiceOperationIdRef.current = operationId;
    voiceBaselineTitleRef.current = draftTitleRef.current;
    voiceCommittedTranscriptRef.current = '';
    voiceReceivedTextRef.current = false;
    explicitVoiceAbortRef.current = false;
    setTitleNotice(null);
    invalidateTitleFocusRequest();
    Keyboard.dismiss();
    setVoiceStatusValue('starting');

    try {
      let availability = await voiceInput.getAvailability();
      if (availability.status === 'permission-required') {
        const permission = await voiceInput.requestMicrophonePermission();
        if (!permission.granted) {
          availability = {
            status: 'permission-denied',
            canAskAgain: permission.canAskAgain,
          };
        } else {
          availability = await voiceInput.getAvailability();
        }
      }

      if (voiceOperationIdRef.current !== operationId) return;

      if (availability.status === 'model-download-required') {
        await voiceInput.downloadJapaneseModel();
        setTitleNotice('日本語の音声モデルを準備後、もう一度マイクを押してください。');
        setVoiceStatusValue('idle');
        completeVoiceInput();
        return;
      }

      if (availability.status === 'permission-denied') {
        setVoiceStatusValue('idle');
        completeVoiceInput();
        Alert.alert('マイクを利用できません', '端末の設定でマイクを許可してください。', [
          { text: 'あとで', style: 'cancel' },
          ...(availability.canAskAgain
            ? []
            : [{ text: '設定を開く', onPress: () => void Linking.openSettings() }]),
        ]);
        return;
      }

      if (availability.status !== 'ready') {
        setTitleNotice('この端末では日本語の端末内音声認識を利用できません。');
        setVoiceStatusValue('idle');
        completeVoiceInput();
        return;
      }

      voiceInput.start();
    } catch {
      if (voiceOperationIdRef.current !== operationId) return;
      setTitleNotice('音声入力を開始できませんでした。手入力をお試しください。');
      setVoiceStatusValue('idle');
      completeVoiceInput();
    }
  }, [
    clearVoiceStopFallback,
    completeVoiceInput,
    invalidateTitleFocusRequest,
    setVoiceStatusValue,
    voiceInput,
  ]);

  beginVoiceInputRef.current = () => void beginVoiceInput();
  stopVoiceInputRef.current = stopVoiceInput;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = voiceInput.subscribe((event) => {
      if (event.type === 'start') {
        setVoiceStatusValue('listening');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        AccessibilityInfo.announceForAccessibility('音声入力を開始しました');
        return;
      }

      if (event.type === 'result') {
        const transcript = normalizeVoiceText(event.transcript);
        if (!transcript) return;
        voiceReceivedTextRef.current = true;
        if (event.isFinal) {
          voiceCommittedTranscriptRef.current = joinVoiceText(
            voiceCommittedTranscriptRef.current,
            transcript,
          );
        }
        const currentTranscript = event.isFinal
          ? voiceCommittedTranscriptRef.current
          : joinVoiceText(voiceCommittedTranscriptRef.current, transcript);
        updateDraftTitle(joinVoiceText(voiceBaselineTitleRef.current, currentTranscript));
        return;
      }

      if (event.type === 'volume') {
        if (voiceStatusRef.current === 'listening') {
          setVoiceVolume(Math.max(0, Math.min(1, (event.value + 2) / 12)));
        }
        return;
      }

      if (event.type === 'nomatch') {
        setTitleNotice('音声を聞き取れませんでした。もう一度お試しください。');
        return;
      }

      if (event.type === 'error') {
        clearVoiceStopFallback();
        const wasExplicitAbort = explicitVoiceAbortRef.current && event.error === 'aborted';
        explicitVoiceAbortRef.current = false;
        setVoiceVolume(0);
        setVoiceStatusValue('idle');
        completeVoiceInput();
        if (!wasExplicitAbort) {
          setTitleNotice(voiceErrorMessage(event.error));
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
        return;
      }

      if (event.type === 'end') {
        clearVoiceStopFallback();
        const shouldConfirmEnd = voiceStatusRef.current !== 'idle';
        explicitVoiceAbortRef.current = false;
        setVoiceVolume(0);
        setVoiceStatusValue('idle');
        completeVoiceInput();
        if (shouldConfirmEnd) {
          void Haptics.selectionAsync().catch(() => {});
          AccessibilityInfo.announceForAccessibility(
            voiceReceivedTextRef.current
              ? '音声入力を終了しました。内容を確認してください'
              : '音声入力を終了しました',
          );
        }
      }
    });

    return () => {
      clearVoiceStopFallback();
      subscription.remove();
      if (voiceStatusRef.current !== 'idle') voiceInput.abort();
    };
  }, [
    clearVoiceStopFallback,
    completeVoiceInput,
    setVoiceStatusValue,
    updateDraftTitle,
    voiceInput,
  ]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index < 0) {
        invalidateTitleFocusRequest();
        Keyboard.dismiss();
        return;
      }

      if (
        quickAddInputMode === 'voice' &&
        handledVoiceInputRequestIdRef.current !== voiceInputRequestId
      ) {
        handledVoiceInputRequestIdRef.current = voiceInputRequestId;
        beginVoiceInputRef.current();
        return;
      }

      const pendingRequestId = pendingTitleFocusRequestIdRef.current;
      if (
        pendingRequestId === null ||
        pendingRequestId !== titleFocusRequestIdRef.current ||
        isClosingRef.current ||
        !isOpenRef.current
      ) {
        return;
      }

      pendingTitleFocusRequestIdRef.current = null;
      titleInputRef.current?.focus();
    },
    [invalidateTitleFocusRequest, quickAddInputMode, voiceInputRequestId],
  );

  useEffect(() => {
    if (
      !isOpen ||
      !isPresentedRef.current ||
      isClosingRef.current ||
      quickAddInputMode !== 'voice' ||
      handledVoiceInputRequestIdRef.current === voiceInputRequestId
    ) {
      return;
    }

    handledVoiceInputRequestIdRef.current = voiceInputRequestId;
    beginVoiceInputRef.current();
  }, [isOpen, quickAddInputMode, voiceInputRequestId]);

  useEffect(() => {
    if (handledVoiceInputStopRequestIdRef.current === voiceInputStopRequestId) return;
    handledVoiceInputStopRequestIdRef.current = voiceInputStopRequestId;
    stopVoiceInputRef.current();
  }, [voiceInputStopRequestId]);

  useEffect(() => {
    if (!isOpen) {
      if (
        isPresentedRef.current ||
        isClosingRef.current ||
        pendingTitleFocusRequestIdRef.current !== null
      ) {
        invalidateTitleFocusRequest();
      }
      if (isPresentedRef.current) {
        isClosingRef.current = true;
        Keyboard.dismiss();
        sheetRef.current?.dismiss();
        return;
      }

      isClosingRef.current = false;
      return;
    }

    if (!isPresentedRef.current && !isClosingRef.current) {
      isPresentedRef.current = true;
      isClosingRef.current = false;
      isSaveRequestedRef.current = false;
      resetDraftTitle();
      setTitleNotice(null);
      resetInput(defaultTargetTime);
      const focusRequestId = titleFocusRequestIdRef.current + 1;
      titleFocusRequestIdRef.current = focusRequestId;
      pendingTitleFocusRequestIdRef.current = shouldFocusTitleOnOpen ? focusRequestId : null;
      sheetRef.current?.present();
    }
  }, [
    defaultTargetTime,
    dismissalVersion,
    invalidateTitleFocusRequest,
    isOpen,
    resetDraftTitle,
    resetInput,
    shouldFocusTitleOnOpen,
  ]);

  useEffect(() => {
    return () => {
      invalidateTitleFocusRequest();
      Keyboard.dismiss();
    };
  }, [invalidateTitleFocusRequest]);

  const closeDatePicker = useCallback(() => {
    setIsDatePickerOpen(false);
    setQuickAddPickerOpen(false);
  }, [setQuickAddPickerOpen]);

  const closeTimePicker = useCallback(() => {
    setIsTimePickerOpen(false);
    setQuickAddPickerOpen(false);
  }, [setQuickAddPickerOpen]);

  const requestClose = useCallback(() => {
    isClosingRef.current = true;
    cancelVoiceInput(false);
    invalidateTitleFocusRequest();
    Keyboard.dismiss();
    closeQuickAdd();
    closeDatePicker();
    closeTimePicker();
    sheetRef.current?.dismiss();
  }, [
    cancelVoiceInput,
    closeDatePicker,
    closeQuickAdd,
    closeTimePicker,
    invalidateTitleFocusRequest,
  ]);

  const handleClosePress = useCallback(() => {
    requestClose();
  }, [requestClose]);

  const handleDismiss = useCallback(() => {
    const shouldReopen = isClosingRef.current && isOpenRef.current;

    isClosingRef.current = false;
    invalidateTitleFocusRequest();
    Keyboard.dismiss();
    isPresentedRef.current = false;
    isSaveRequestedRef.current = false;
    cancelVoiceInput(false);
    closeDatePicker();
    closeTimePicker();
    resetDraftTitle();
    setTitleNotice(null);

    if (shouldReopen) {
      setDismissalVersion((version) => version + 1);
    } else {
      closeQuickAdd();
    }
  }, [
    cancelVoiceInput,
    closeDatePicker,
    closeQuickAdd,
    closeTimePicker,
    invalidateTitleFocusRequest,
    resetDraftTitle,
  ]);

  const openDatePicker = useCallback(() => {
    stopVoiceInput();
    invalidateTitleFocusRequest();
    Keyboard.dismiss();
    setQuickAddPickerOpen(true);
    setIsDatePickerOpen(true);
  }, [invalidateTitleFocusRequest, setQuickAddPickerOpen, stopVoiceInput]);

  const openTimePicker = useCallback(() => {
    stopVoiceInput();
    invalidateTitleFocusRequest();
    Keyboard.dismiss();
    setQuickAddPickerOpen(true);
    setIsTimePickerOpen(true);
  }, [invalidateTitleFocusRequest, setQuickAddPickerOpen, stopVoiceInput]);

  const handleSave = useCallback(async () => {
    if (isSaving || isSaveRequestedRef.current) {
      return;
    }

    const normalizedTitle = draftTitleRef.current.replace(/\n/g, ' ').trim();

    if (normalizedTitle.length === 0) {
      setTitleNotice('タイトルを入力してください');
      return;
    }

    if (normalizedTitle.length > REMINDER_TITLE_MAX_LENGTH) {
      setTitleNotice('タイトルは40文字以内で保存できます');
      return;
    }

    setTitleNotice(null);
    setTitle(normalizedTitle);
    isSaveRequestedRef.current = true;
    try {
      await onSave?.(normalizedTitle);
      resetTitle();
      resetDraftTitle();
      isSaveRequestedRef.current = false;
    } catch {
      // HomeScreen shows the user-facing error. Keep the sheet open so the title is not lost.
      isSaveRequestedRef.current = false;
    }
  }, [isSaving, onSave, resetDraftTitle, resetTitle, setTitle]);

  const handleDatePickerChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === 'dismissed') {
        closeDatePicker();
        return;
      }

      if (!selectedDate) {
        return;
      }

      const nextDate = selectedDate < minCustomDate ? minCustomDate : selectedDate;
      const nextTime = getNextAvailableTimeForToday(nextDate, presets);

      if (nextTime && buildTargetDateTime(nextDate, time).getTime() <= Date.now()) {
        setTargetTime(nextTime);
      }

      setCustomTargetDate(format(nextDate, 'yyyy-MM-dd'));

      if (Platform.OS === 'android') {
        closeDatePicker();
      }
    },
    [closeDatePicker, minCustomDate, presets, setCustomTargetDate, setTargetTime, time],
  );

  const handleDateOffsetChange = useCallback(
    (nextDateOffset: typeof dateOffset) => {
      const nextDate = addDays(new Date(), nextDateOffset);
      const nextTime = getNextAvailableTimeForToday(nextDate, presets);

      if (nextTime && buildTargetDateTime(nextDate, time).getTime() <= Date.now()) {
        setTargetTime(nextTime);
      }

      setDateOffset(nextDateOffset);
    },
    [presets, setDateOffset, setTargetTime, time],
  );

  const handlePresetDateChange = useCallback(
    (nextPreset: Parameters<typeof setPresetTargetDate>[0], nextDateText: string) => {
      const nextDate = new Date(`${nextDateText}T00:00:00`);
      const nextTime = getNextAvailableTimeForToday(nextDate, presets);

      if (nextTime && buildTargetDateTime(nextDate, time).getTime() <= Date.now()) {
        setTargetTime(nextTime);
      }

      setPresetTargetDate(nextPreset, nextDateText);
    },
    [presets, setPresetTargetDate, setTargetTime, time],
  );

  const handleTargetTimeChange = useCallback(
    (nextTime: string) => {
      const targetDateTime = buildTargetDateTime(selectedTargetDate, nextTime);

      if (targetDateTime.getTime() <= Date.now()) {
        const fallbackTime = getNextAvailableTimeForToday(selectedTargetDate, presets);

        setTargetTime(fallbackTime ?? nextTime);
        return;
      }

      setTargetTime(nextTime);
    },
    [presets, selectedTargetDate, setTargetTime],
  );

  return (
    <>
      <BottomSheetModal
        name="quick-reminder-input"
        ref={sheetRef}
        stackBehavior="replace"
        enableDismissOnClose
        enableDynamicSizing
        enablePanDownToClose
        maxDynamicContentSize={quickAddMaxDynamicContentSize}
        onChange={handleSheetChange}
        onDismiss={handleDismiss}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
        topInset={sheetTopInset}
        bottomInset={safeAreaInsets.bottom}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: quickAddContentBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputHeader}>
            <View style={styles.inputField}>
              <BottomSheetTextInput
                ref={titleInputRef}
                value={draftTitle}
                onChangeText={updateDraftTitle}
                placeholder="忘れたくないことを入力"
                placeholderTextColor="#A6B2CE"
                style={styles.input}
                keyboardType="default"
                autoCorrect
                spellCheck={false}
                autoCapitalize="none"
                returnKeyType="done"
                blurOnSubmit={false}
                multiline={false}
                editable={voiceStatus === 'idle'}
              />
              <Text
                accessibilityRole="text"
                accessibilityLabel={titleCountAccessibilityLabel}
                style={[
                  styles.titleCountText,
                  isTitleCountWarning ? styles.titleCountTextWarning : null,
                  isTitleOverLimit ? styles.titleCountTextOverLimit : null,
                ]}
              >
                {titleLength} / {REMINDER_TITLE_MAX_LENGTH}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={voiceStatus === 'idle' ? '音声入力を開始' : '音声入力を終了'}
              accessibilityState={{
                busy: voiceStatus === 'starting' || voiceStatus === 'stopping',
              }}
              hitSlop={8}
              onPress={voiceStatus === 'idle' ? beginVoiceInput : stopVoiceInput}
              style={({ pressed }) => [
                styles.voiceButton,
                voiceStatus !== 'idle' ? styles.voiceButtonActive : null,
                pressed ? styles.voiceButtonPressed : null,
              ]}
            >
              <Ionicons
                name={voiceStatus === 'idle' ? 'mic-outline' : 'stop'}
                size={20}
                color={voiceStatus === 'idle' ? palette.lavenderDeep : palette.white}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="入力を閉じる"
              hitSlop={8}
              onPress={handleClosePress}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={palette.ink} />
            </Pressable>
          </View>

          {voiceStatus !== 'idle' ? (
            <View style={styles.voiceStatusPanel}>
              <View
                style={[
                  styles.voiceMeter,
                  {
                    transform: [
                      { scale: reduceMotionEnabled ? 1 : 1 + Math.max(0.04, voiceVolume * 0.2) },
                    ],
                  },
                ]}
              >
                <Ionicons name="mic" size={18} color={palette.white} />
              </View>
              <View style={styles.voiceStatusCopy}>
                <Text accessibilityLiveRegion="polite" style={styles.voiceStatusTitle}>
                  {voiceStatus === 'listening'
                    ? '聞いています…'
                    : voiceStatus === 'stopping'
                      ? '文字にしています…'
                      : '準備しています…'}
                </Text>
                <Text style={styles.voiceStatusHint}>スマホを下げると終了します</Text>
              </View>
              <View style={styles.voiceStatusActions}>
                {voiceStatus === 'listening' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="音声入力を完了"
                    hitSlop={8}
                    onPress={stopVoiceInput}
                    style={({ pressed }) => [
                      styles.voiceFinishButton,
                      pressed ? styles.voiceButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.voiceFinishText}>完了</Text>
                  </Pressable>
                ) : null}
                {voiceStatus !== 'stopping' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="音声入力をキャンセル"
                    hitSlop={8}
                    onPress={() => cancelVoiceInput(true)}
                    style={({ pressed }) => [
                      styles.voiceCancelButton,
                      pressed ? styles.voiceButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.voiceCancelText}>キャンセル</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {titleNotice ? <Text style={styles.titleNoticeText}>{titleNotice}</Text> : null}

          <DateChips
            preset={datePreset}
            customDate={customTargetDate}
            onChange={handleDateOffsetChange}
            onSelectPresetDate={handlePresetDateChange}
            onSelectCustomDate={openDatePicker}
          />

          <TimeSelector
            value={time}
            onChange={handleTargetTimeChange}
            onSelectCustomTime={openTimePicker}
            presets={presets}
            variant="compact"
            style={styles.timeSelector}
          />

          {!isTargetFuture ? (
            <Text style={styles.timingNoticeText}>
              過去の日時は選べません。お知らせを受け取る未来の日時を選んでください。
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            <View style={styles.summary}>
              <Ionicons name="notifications-outline" size={16} color={palette.lavenderDeep} />
              <Text style={styles.summaryText}>
                {selectedDateLabel} {time}
              </Text>
            </View>
            <PrimaryButton
              label={isSaving ? '追加中' : '追加'}
              icon="cloud-outline"
              onPress={handleSave}
              disabled={isSaving || voiceStatus !== 'idle' || !isTimeValid || !isTargetFuture}
              style={styles.saveButton}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {isDatePickerOpen && Platform.OS === 'android' && (
        <DateTimePicker
          value={datePickerValue}
          mode="date"
          display={datePickerDisplay}
          minimumDate={minCustomDate}
          locale="ja-JP"
          onChange={handleDatePickerChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={isDatePickerOpen}
          transparent
          animationType="fade"
          onRequestClose={closeDatePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerPanel}>
              <View style={styles.pickerHeader}>
                <Text style={styles.calendarTitle}>日付を選択</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="日付選択を閉じる"
                  hitSlop={8}
                  onPress={closeDatePicker}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color={palette.ink} />
                </Pressable>
              </View>
              <DateTimePicker
                value={datePickerValue}
                mode="date"
                display={datePickerDisplay}
                minimumDate={minCustomDate}
                locale="ja-JP"
                themeVariant="light"
                onChange={handleDatePickerChange}
              />
              <Text style={styles.calendarHint}>今日以降の日付を選べます</Text>
              <PrimaryButton
                label="この日付にする"
                icon="calendar-outline"
                onPress={closeDatePicker}
                style={styles.pickerButton}
              />
            </View>
          </View>
        </Modal>
      )}

      <TimePickerModal
        visible={isTimePickerOpen}
        value={time}
        hint="選んだ時刻に当日のお知らせが届きます"
        onConfirm={handleTargetTimeChange}
        onClose={closeTimePicker}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 48,
    backgroundColor: '#C6D0E4',
  },
  content: {
    paddingHorizontal: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputField: {
    flex: 1,
    position: 'relative',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FC',
  },
  voiceButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2EDFF',
    borderWidth: 1,
    borderColor: 'rgba(168,145,245,0.34)',
  },
  voiceButtonActive: {
    backgroundColor: palette.lavenderDeep,
  },
  voiceButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  voiceStatusPanel: {
    minHeight: 58,
    marginBottom: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(237,230,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(168,145,245,0.28)',
  },
  voiceMeter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.lavenderDeep,
  },
  voiceStatusCopy: {
    minWidth: 0,
    flex: 1,
  },
  voiceStatusTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  voiceStatusHint: {
    marginTop: 2,
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  voiceCancelButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  voiceStatusActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  voiceFinishButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: palette.lavenderDeep,
  },
  voiceFinishText: {
    color: palette.white,
    fontSize: 11,
    fontWeight: '900',
  },
  voiceCancelText: {
    color: palette.lavenderDeep,
    fontSize: 11,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 64,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
  },
  titleCountText: {
    position: 'absolute',
    right: 12,
    bottom: 5,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  titleCountTextWarning: {
    color: '#8B6F2D',
  },
  titleCountTextOverLimit: {
    color: '#B34B58',
  },
  titleNoticeText: {
    color: '#8B6F2D',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeSelector: {
    marginTop: 8,
  },
  timingNoticeText: {
    color: palette.peachDeep,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  saveButton: {
    flex: 0.62,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: palette.lavenderDeep,
  },
  actionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  summary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(237,230,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(168,145,245,0.24)',
  },
  summaryText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(38,49,81,0.22)',
  },
  pickerPanel: {
    width: '100%',
    borderRadius: 26,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.98)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calendarTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  calendarHint: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  pickerButton: {
    marginTop: 14,
    backgroundColor: palette.skyDeep,
  },
});
