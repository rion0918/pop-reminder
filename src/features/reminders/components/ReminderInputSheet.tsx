import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ElementRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { addDays, addMinutes, format, isSameDay, set, startOfDay } from 'date-fns';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { TimePickerModal } from '../../../shared/components/TimePickerModal';
import { TimeSelector } from '../../../shared/components/TimeSelector';
import { palette } from '../../../constants/colors';
import {
  selectIsTimeValid,
  selectFormattedTime,
  useReminderUiStore,
} from '../stores/reminderUiStore';
import { formatReminderDate } from '../utils/reminderDateFormat';
import { DateChips } from './DateChips';

type ReminderInputSheetProps = {
  defaultTargetTime?: string;
  onSave?: (title: string) => Promise<void> | void;
};

const sameDayTimePresets = ['08:00', '12:00', '18:00', '20:00'];
const QUICK_ADD_MAX_DYNAMIC_CONTENT_SIZE = 360;
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

function getNextAvailableTimeForToday(targetDate: Date, now = new Date()) {
  if (!isSameDay(targetDate, now)) {
    return null;
  }

  const nextPreset = sameDayTimePresets.find(
    (preset) => buildTargetDateTime(targetDate, preset).getTime() > now.getTime(),
  );

  if (nextPreset) {
    return nextPreset;
  }

  const nextTime = addMinutes(now, 5);

  return isSameDay(nextTime, targetDate) ? format(nextTime, 'HH:mm') : null;
}

export function ReminderInputSheet({
  defaultTargetTime = '08:00',
  onSave,
}: ReminderInputSheetProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const titleInputRef = useRef<ElementRef<typeof BottomSheetTextInput>>(null);
  const draftTitleRef = useRef('');
  const isPresentedRef = useRef(false);
  const isClosingRef = useRef(false);
  const isSaveRequestedRef = useRef(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [titleNotice, setTitleNotice] = useState<string | null>(null);
  const sheetTopInset = safeAreaInsets.top + 8;
  const minCustomDate = useMemo(() => startOfDay(new Date()), []);

  const isOpen = useReminderUiStore((state) => state.isQuickAddOpen);
  const dateOffset = useReminderUiStore((state) => state.dateOffset);
  const datePreset = useReminderUiStore((state) => state.datePreset);
  const customTargetDate = useReminderUiStore((state) => state.customTargetDate);
  const time = useReminderUiStore(selectFormattedTime);
  const isTimeValid = useReminderUiStore(selectIsTimeValid);
  const isSaving = useReminderUiStore((state) => state.isSaving);
  const closeQuickAdd = useReminderUiStore((state) => state.closeQuickAdd);
  const setTitle = useReminderUiStore((state) => state.setTitle);
  const resetTitle = useReminderUiStore((state) => state.resetTitle);
  const setDateOffset = useReminderUiStore((state) => state.setDateOffset);
  const setPresetTargetDate = useReminderUiStore((state) => state.setPresetTargetDate);
  const setCustomTargetDate = useReminderUiStore((state) => state.setCustomTargetDate);
  const setTargetTime = useReminderUiStore((state) => state.setTargetTime);
  const resetInput = useReminderUiStore((state) => state.resetInput);

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
    () => formatReminderDate(selectedTargetDate),
    [selectedTargetDate],
  );

  const targetAt = useMemo(() => {
    return buildTargetDateTime(selectedTargetDate, time);
  }, [selectedTargetDate, time]);

  const isTargetFuture = targetAt.getTime() > Date.now();

  const resetDraftTitle = useCallback(() => {
    draftTitleRef.current = '';
    titleInputRef.current?.clear();
  }, []);

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />
    ),
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      if (isPresentedRef.current) {
        isClosingRef.current = true;
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
      sheetRef.current?.present();
    }
  }, [defaultTargetTime, isOpen, resetDraftTitle, resetInput]);

  const requestClose = useCallback(() => {
    isClosingRef.current = true;
    closeQuickAdd();
    setIsDatePickerOpen(false);
    setIsTimePickerOpen(false);
    sheetRef.current?.dismiss();
  }, [closeQuickAdd]);

  const handleClosePress = useCallback(() => {
    requestClose();
  }, [requestClose]);

  const handleDismiss = useCallback(() => {
    isClosingRef.current = false;
    closeQuickAdd();
    isPresentedRef.current = false;
    isSaveRequestedRef.current = false;
    setIsDatePickerOpen(false);
    setIsTimePickerOpen(false);
    resetDraftTitle();
    setTitleNotice(null);
  }, [closeQuickAdd, resetDraftTitle]);

  const handleSave = useCallback(async () => {
    if (isSaving || isSaveRequestedRef.current) {
      return;
    }

    const normalizedTitle = draftTitleRef.current.replace(/\n/g, ' ').trim();

    if (normalizedTitle.length === 0) {
      setTitleNotice('タイトルを入力してください');
      return;
    }

    if (normalizedTitle.length > 40) {
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
        setIsDatePickerOpen(false);
        return;
      }

      if (!selectedDate) {
        return;
      }

      const nextDate = selectedDate < minCustomDate ? minCustomDate : selectedDate;
      const nextTime = getNextAvailableTimeForToday(nextDate);

      if (nextTime && buildTargetDateTime(nextDate, time).getTime() <= Date.now()) {
        setTargetTime(nextTime);
      }

      setCustomTargetDate(format(nextDate, 'yyyy-MM-dd'));
    },
    [minCustomDate, setCustomTargetDate, setTargetTime, time],
  );

  const handleDateOffsetChange = useCallback(
    (nextDateOffset: typeof dateOffset) => {
      const nextDate = addDays(new Date(), nextDateOffset);
      const nextTime = getNextAvailableTimeForToday(nextDate);

      if (nextTime && buildTargetDateTime(nextDate, time).getTime() <= Date.now()) {
        setTargetTime(nextTime);
      }

      setDateOffset(nextDateOffset);
    },
    [setDateOffset, setTargetTime, time],
  );

  const handlePresetDateChange = useCallback(
    (nextPreset: Parameters<typeof setPresetTargetDate>[0], nextDateText: string) => {
      const nextDate = new Date(`${nextDateText}T00:00:00`);
      const nextTime = getNextAvailableTimeForToday(nextDate);

      if (nextTime && buildTargetDateTime(nextDate, time).getTime() <= Date.now()) {
        setTargetTime(nextTime);
      }

      setPresetTargetDate(nextPreset, nextDateText);
    },
    [setPresetTargetDate, setTargetTime, time],
  );

  const handleTargetTimeChange = useCallback(
    (nextTime: string) => {
      const targetDateTime = buildTargetDateTime(selectedTargetDate, nextTime);

      if (targetDateTime.getTime() <= Date.now()) {
        const fallbackTime = getNextAvailableTimeForToday(selectedTargetDate);

        setTargetTime(fallbackTime ?? nextTime);
        return;
      }

      setTargetTime(nextTime);
    },
    [selectedTargetDate, setTargetTime],
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
        maxDynamicContentSize={QUICK_ADD_MAX_DYNAMIC_CONTENT_SIZE}
        onDismiss={handleDismiss}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        topInset={sheetTopInset}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.inputHeader}>
            <BottomSheetTextInput
              ref={titleInputRef}
              defaultValue=""
              onChangeText={(text) => {
                draftTitleRef.current = text;
              }}
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
            />
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

          {titleNotice ? <Text style={styles.titleNoticeText}>{titleNotice}</Text> : null}

          <DateChips
            value={dateOffset}
            preset={datePreset}
            customDate={customTargetDate}
            onChange={handleDateOffsetChange}
            onSelectPresetDate={handlePresetDateChange}
            onSelectCustomDate={() => setIsDatePickerOpen(true)}
          />

          <TimeSelector
            value={time}
            onChange={handleTargetTimeChange}
            onSelectCustomTime={() => setIsTimePickerOpen(true)}
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
              <Text style={styles.summaryText}>{selectedDateLabel} {time}</Text>
            </View>
            <PrimaryButton
              label={isSaving ? '追加中' : '追加'}
              icon="cloud-outline"
              onPress={handleSave}
              disabled={isSaving || !isTimeValid || !isTargetFuture}
              style={styles.saveButton}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <Modal
        visible={isDatePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDatePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerPanel}>
            <View style={styles.pickerHeader}>
              <Text style={styles.calendarTitle}>日付を選択</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="日付選択を閉じる"
                hitSlop={8}
                onPress={() => setIsDatePickerOpen(false)}
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
              onPress={() => setIsDatePickerOpen(false)}
              style={styles.pickerButton}
            />
          </View>
        </View>
      </Modal>

      <TimePickerModal
        visible={isTimePickerOpen}
        value={time}
        hint="選んだ時刻に当日のお知らせが届きます"
        onChange={handleTargetTimeChange}
        onClose={() => setIsTimePickerOpen(false)}
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
    paddingBottom: 18,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FC',
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
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
