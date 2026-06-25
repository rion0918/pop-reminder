import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ElementRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, set, startOfDay } from 'date-fns';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { palette } from '../../../constants/colors';
import {
  selectIsTimeValid,
  selectFormattedTime,
  useReminderUiStore,
} from '../stores/reminderUiStore';
import { formatReminderDate } from '../utils/reminderDateFormat';
import { DateChips } from './DateChips';
import { TimeChips } from './TimeChips';

type ReminderInputSheetProps = {
  defaultTargetTime?: string;
  onSave?: (title: string) => Promise<void> | void;
};

export function ReminderInputSheet({
  defaultTargetTime = '08:00',
  onSave,
}: ReminderInputSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const titleInputRef = useRef<ElementRef<typeof BottomSheetTextInput>>(null);
  const draftTitleRef = useRef('');
  const isPresentedRef = useRef(false);
  const isClosingRef = useRef(false);
  const isSaveRequestedRef = useRef(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [titleNotice, setTitleNotice] = useState<string | null>(null);
  const snapPoints = useMemo(() => ['58%', '78%'], []);
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

  const timePickerValue = useMemo(() => {
    const [hoursText, minutesText] = time.split(':');
    const value = new Date();

    value.setHours(Number(hoursText), Number(minutesText), 0, 0);
    return value;
  }, [time]);

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
    const [hoursText, minutesText] = time.split(':');

    return set(selectedTargetDate, {
      hours: Number(hoursText),
      minutes: Number(minutesText),
      seconds: 0,
      milliseconds: 0,
    });
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
    isClosingRef.current = true;
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
      requestClose();
    } catch {
      // HomeScreen shows the user-facing error. Keep the sheet open so the title is not lost.
      isSaveRequestedRef.current = false;
    }
  }, [isSaving, onSave, requestClose, setTitle]);

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
      setCustomTargetDate(format(nextDate, 'yyyy-MM-dd'));
    },
    [minCustomDate, setCustomTargetDate],
  );

  const handleTimePickerChange = useCallback(
    (event: DateTimePickerEvent, selectedTime?: Date) => {
      if (event.type === 'dismissed') {
        setIsTimePickerOpen(false);
        return;
      }

      if (!selectedTime) {
        return;
      }

      setTargetTime(format(selectedTime, 'HH:mm'));
    },
    [setTargetTime],
  );

  return (
    <>
      <BottomSheetModal
        name="quick-reminder-input"
        ref={sheetRef}
        snapPoints={snapPoints}
        stackBehavior="replace"
        enableDismissOnClose
        enablePanDownToClose
        onDismiss={handleDismiss}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>なにを忘れたくない？</Text>
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

          <BottomSheetTextInput
            ref={titleInputRef}
            defaultValue=""
            onChangeText={(text) => {
              draftTitleRef.current = text;
            }}
            placeholder="インターンの持ち物"
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

          {titleNotice ? <Text style={styles.titleNoticeText}>{titleNotice}</Text> : null}

          <DateChips
            value={dateOffset}
            preset={datePreset}
            customDate={customTargetDate}
            onChange={setDateOffset}
            onSelectPresetDate={setPresetTargetDate}
            onSelectCustomDate={() => setIsDatePickerOpen(true)}
          />

          <TimeChips
            value={time}
            onChange={setTargetTime}
            onSelectCustomTime={() => setIsTimePickerOpen(true)}
          />

          <View style={styles.summary}>
            <Ionicons name="notifications-outline" size={17} color={palette.lavenderDeep} />
            <Text style={styles.summaryText}>{selectedDateLabel} {time} にふわっと通知</Text>
          </View>

          {!isTargetFuture ? (
            <Text style={styles.timingNoticeText}>
              過去の日時は選べません。通知を受け取る未来の日時を選んでください。
            </Text>
          ) : null}

          <PrimaryButton
            label={isSaving ? '追加中' : 'ふわっと追加'}
            icon="cloud-outline"
            onPress={handleSave}
            disabled={isSaving || !isTimeValid || !isTargetFuture}
            style={styles.saveButton}
          />
        </BottomSheetScrollView>
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
              display="spinner"
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

      <Modal
        visible={isTimePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTimePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerPanel}>
            <View style={styles.pickerHeader}>
              <Text style={styles.calendarTitle}>時刻を選択</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="時刻選択を閉じる"
                hitSlop={8}
                onPress={() => setIsTimePickerOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={palette.ink} />
              </Pressable>
            </View>
            <DateTimePicker
              value={timePickerValue}
              mode="time"
              display="spinner"
              is24Hour
              locale="ja-JP"
              themeVariant="light"
              onChange={handleTimePickerChange}
            />
            <Text style={styles.calendarHint}>選んだ時刻に当日の通知が届きます</Text>
            <PrimaryButton
              label="この時刻にする"
              icon="time-outline"
              onPress={() => setIsTimePickerOpen(false)}
              style={styles.pickerButton}
            />
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
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
    height: 48,
    borderRadius: 18,
    paddingHorizontal: 18,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: 10,
  },
  titleNoticeText: {
    color: '#8B6F2D',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  timingNoticeText: {
    color: palette.peachDeep,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 14,
    backgroundColor: palette.lavenderDeep,
  },
  summary: {
    minHeight: 44,
    borderRadius: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(237,230,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(168,145,245,0.24)',
  },
  summaryText: {
    color: palette.ink,
    fontSize: 13,
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
