import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ElementRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format } from 'date-fns';
import { Calendar, DateData } from 'react-native-calendars';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { palette } from '../../../shared/constants/colors';
import {
  selectIsTimeValid,
  selectFormattedTime,
  useReminderUiStore,
} from '../stores/reminderUiStore';
import { DateChips } from './DateChips';
import { TimeKeypad } from './TimeKeypad';

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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [titleNotice, setTitleNotice] = useState<string | null>(null);
  const snapPoints = useMemo(() => ['64%', '88%'], []);
  const minCustomDate = useMemo(() => format(addDays(new Date(), 2), 'yyyy-MM-dd'), []);

  const isOpen = useReminderUiStore((state) => state.isQuickAddOpen);
  const dateOffset = useReminderUiStore((state) => state.dateOffset);
  const customTargetDate = useReminderUiStore((state) => state.customTargetDate);
  const time = useReminderUiStore(selectFormattedTime);
  const isTimeValid = useReminderUiStore(selectIsTimeValid);
  const timeTouched = useReminderUiStore((state) => state.timeTouched);
  const isSaving = useReminderUiStore((state) => state.isSaving);
  const closeQuickAdd = useReminderUiStore((state) => state.closeQuickAdd);
  const setTitle = useReminderUiStore((state) => state.setTitle);
  const setDateOffset = useReminderUiStore((state) => state.setDateOffset);
  const setCustomTargetDate = useReminderUiStore((state) => state.setCustomTargetDate);
  const pressTimeDigit = useReminderUiStore((state) => state.pressTimeDigit);
  const deleteTimeDigit = useReminderUiStore((state) => state.deleteTimeDigit);
  const confirmTimeInput = useReminderUiStore((state) => state.confirmTimeInput);
  const resetInput = useReminderUiStore((state) => state.resetInput);

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
    if (isOpen && !isPresentedRef.current) {
      isPresentedRef.current = true;
      resetDraftTitle();
      setTitleNotice(null);
      resetInput(defaultTargetTime);
      sheetRef.current?.present();
      return;
    }

    if (!isOpen && isPresentedRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [defaultTargetTime, isOpen, resetDraftTitle, resetInput]);

  const handleClosePress = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    setIsDatePickerOpen(false);
    resetDraftTitle();
    setTitleNotice(null);
    closeQuickAdd();
  }, [closeQuickAdd, resetDraftTitle]);

  const handleSave = useCallback(async () => {
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
    try {
      await onSave?.(normalizedTitle);
      sheetRef.current?.dismiss();
    } catch {
      // HomeScreen shows the user-facing error. Keep the sheet open so the title is not lost.
    }
  }, [onSave, setTitle]);

  const handleSelectDate = useCallback(
    (day: DateData) => {
      setCustomTargetDate(day.dateString);
      setIsDatePickerOpen(false);
    },
    [setCustomTargetDate],
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
            <Pressable accessibilityRole="button" onPress={handleClosePress} style={styles.closeButton}>
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
            customDate={customTargetDate}
            onChange={setDateOffset}
            onSelectCustomDate={() => setIsDatePickerOpen(true)}
          />

          <TimeKeypad
            time={time}
            onDigitPress={pressTimeDigit}
            onDelete={deleteTimeDigit}
            onConfirm={confirmTimeInput}
          />

          {!isTimeValid && timeTouched ? (
            <Text style={styles.noticeText}>時刻は00:00〜23:59で入力してください</Text>
          ) : null}

          <PrimaryButton
            label={isSaving ? '追加中' : 'ふわっと追加'}
            icon="cloud-outline"
            onPress={handleSave}
            disabled={isSaving || !isTimeValid}
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
          <View style={styles.calendarPanel}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>日付を選択</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsDatePickerOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={palette.ink} />
              </Pressable>
            </View>
            <Calendar
              minDate={minCustomDate}
              onDayPress={handleSelectDate}
              markedDates={
                customTargetDate
                  ? {
                      [customTargetDate]: {
                        selected: true,
                        selectedColor: palette.skyDeep,
                        selectedTextColor: palette.white,
                      },
                    }
                  : undefined
              }
              theme={{
                calendarBackground: palette.white,
                textSectionTitleColor: palette.muted,
                selectedDayBackgroundColor: palette.skyDeep,
                selectedDayTextColor: palette.white,
                todayTextColor: palette.lavenderDeep,
                dayTextColor: palette.ink,
                textDisabledColor: '#C9D3E5',
                arrowColor: palette.skyDeep,
                monthTextColor: palette.ink,
                textDayFontWeight: '700',
                textMonthFontWeight: '800',
                textDayHeaderFontWeight: '800',
              }}
            />
            <Text style={styles.calendarHint}>明後日以降の日付を選べます</Text>
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
  saveButton: {
    marginTop: 14,
    backgroundColor: palette.lavenderDeep,
  },
  noticeText: {
    color: '#8B6F2D',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(38,49,81,0.22)',
  },
  calendarPanel: {
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
  calendarHeader: {
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
});
