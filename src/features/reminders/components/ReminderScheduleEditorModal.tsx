import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfDay } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '../../../constants/colors';
import type { Reminder } from '../types/reminder';
import {
  createReminderScheduleDraft,
  evaluateReminderScheduleDraft,
  type ReminderScheduleDraft,
} from '../utils/reminderScheduleEditor';
import { formatReminderDetailDate, formatReminderDetailTime } from '../utils/reminderDateFormat';

type ReminderScheduleEditorModalProps = {
  visible: boolean;
  reminder: Pick<Reminder, 'targetAt' | 'previousNotifyAt'>;
  isSaving: boolean;
  onConfirm: (draft: ReminderScheduleDraft) => void;
  onClose: () => void;
};

type ActivePicker = 'date' | 'time' | null;

const pickerDisplay = Platform.select({
  ios: 'spinner',
  android: 'default',
  default: 'default',
} as const);

export function ReminderScheduleEditorModal({
  visible,
  reminder,
  isSaving,
  onConfirm,
  onClose,
}: ReminderScheduleEditorModalProps) {
  const [draft, setDraft] = useState<ReminderScheduleDraft>(() =>
    createReminderScheduleDraft(reminder),
  );
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const wasVisibleRef = useRef(false);
  const safeAreaInsets = useSafeAreaInsets();

  const initialDraft = createReminderScheduleDraft(reminder);
  const previousNotifyTime = format(new Date(reminder.previousNotifyAt), 'HH:mm');
  const evaluated = useMemo(
    () => evaluateReminderScheduleDraft(draft, previousNotifyTime),
    [draft, previousNotifyTime],
  );
  const minimumDate = startOfDay(new Date());
  const datePickerValue = useMemo(
    () => new Date(`${draft.targetDate}T12:00:00`),
    [draft.targetDate],
  );
  const timePickerValue = useMemo(() => {
    const [hours, minutes] = draft.targetTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, [draft.targetTime]);
  const previousDate = evaluated.schedule?.previousNotifyAt ?? new Date(reminder.previousNotifyAt);
  const hasChanges =
    draft.targetDate !== initialDraft.targetDate || draft.targetTime !== initialDraft.targetTime;
  const previousNoticeText = !evaluated.isPreviousFuture
    ? '前日のお知らせ時刻は過ぎているため、当日だけお知らせします'
    : hasChanges
      ? `前日のお知らせも ${formatReminderDetailDate(previousDate)} ${formatReminderDetailTime(previousDate)} に変わります`
      : `前日のお知らせは ${formatReminderDetailDate(previousDate)} ${formatReminderDetailTime(previousDate)}`;
  const isSaveDisabled = isSaving || !evaluated.isValid || !evaluated.isTargetFuture;

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setDraft(createReminderScheduleDraft(reminder));
      setActivePicker(null);
    }

    wasVisibleRef.current = visible;
  }, [reminder, visible]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setActivePicker(null);
      return;
    }

    if (!selectedDate) return;

    const nextDate = selectedDate < minimumDate ? minimumDate : selectedDate;
    setDraft((current) => ({ ...current, targetDate: format(nextDate, 'yyyy-MM-dd') }));
    if (Platform.OS === 'android') setActivePicker(null);
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (event.type === 'dismissed') {
      setActivePicker(null);
      return;
    }

    if (!selectedTime) return;

    setDraft((current) => ({ ...current, targetTime: format(selectedTime, 'HH:mm') }));
    if (Platform.OS === 'android') setActivePicker(null);
  };

  const renderPicker = () => {
    if (!activePicker) return null;

    const picker = (
      <DateTimePicker
        value={activePicker === 'date' ? datePickerValue : timePickerValue}
        mode={activePicker}
        display={pickerDisplay}
        minimumDate={activePicker === 'date' ? minimumDate : undefined}
        is24Hour={activePicker === 'time'}
        locale="ja-JP"
        themeVariant="light"
        onChange={activePicker === 'date' ? handleDateChange : handleTimeChange}
      />
    );

    if (Platform.OS === 'android') return picker;

    return (
      <View style={styles.pickerSurface}>
        <View style={styles.inlinePicker}>{picker}</View>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          if (!isSaving) onClose();
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="日時変更をキャンセル"
            accessibilityState={{ disabled: isSaving }}
            disabled={isSaving}
            onPress={onClose}
            style={styles.backdrop}
          />

          <View accessibilityViewIsModal style={styles.panel}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(18, safeAreaInsets.bottom + 8) },
              ]}
            >
              <View style={styles.actionBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="日時変更をキャンセル"
                  accessibilityState={{ disabled: isSaving }}
                  disabled={isSaving}
                  hitSlop={6}
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && !isSaving ? styles.actionButtonPressed : null,
                    isSaving ? styles.actionButtonDisabled : null,
                  ]}
                >
                  <Text style={styles.cancelActionText}>キャンセル</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="日時変更を完了"
                  accessibilityState={{ disabled: isSaveDisabled }}
                  disabled={isSaveDisabled}
                  hitSlop={6}
                  onPress={() => onConfirm(draft)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && !isSaveDisabled ? styles.actionButtonPressed : null,
                    isSaveDisabled ? styles.actionButtonDisabled : null,
                  ]}
                >
                  <Text style={styles.completeActionText}>{isSaving ? '保存中…' : '完了'}</Text>
                </Pressable>
              </View>

              <View style={styles.scheduleSurface}>
                <Text style={styles.scheduleLabel}>お知らせ日時</Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="日付を変更"
                  accessibilityHint={formatReminderDetailDate(datePickerValue)}
                  accessibilityState={{ selected: activePicker === 'date', disabled: isSaving }}
                  disabled={isSaving}
                  onPress={() => setActivePicker('date')}
                  style={({ pressed }) => [
                    styles.scheduleDateButton,
                    activePicker === 'date' ? styles.scheduleValueActive : null,
                    isSaving ? styles.scheduleValueDisabled : null,
                    pressed ? styles.scheduleValuePressed : null,
                  ]}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                    numberOfLines={1}
                    style={styles.scheduleDateValue}
                  >
                    {formatReminderDetailDate(datePickerValue)}
                  </Text>
                </Pressable>

                <View style={styles.scheduleDivider} />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="時刻を変更"
                  accessibilityHint={formatReminderDetailTime(timePickerValue)}
                  accessibilityState={{ selected: activePicker === 'time', disabled: isSaving }}
                  disabled={isSaving}
                  onPress={() => setActivePicker('time')}
                  style={({ pressed }) => [
                    styles.scheduleTimeButton,
                    activePicker === 'time' ? styles.scheduleValueActive : null,
                    isSaving ? styles.scheduleValueDisabled : null,
                    pressed ? styles.scheduleValuePressed : null,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.scheduleTimeValue}>
                    {formatReminderDetailTime(timePickerValue)}
                  </Text>
                </Pressable>
              </View>

              {Platform.OS !== 'android' ? renderPicker() : null}

              {!evaluated.isTargetFuture ? (
                <Text style={styles.targetWarning}>過去の日時には変更できません</Text>
              ) : null}

              <View
                accessible
                accessibilityRole="text"
                accessibilityLabel={previousNoticeText}
                style={styles.previousNotice}
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={evaluated.isPreviousFuture ? palette.muted : palette.peachDeep}
                />
                <Text
                  style={[
                    styles.previousNoticeText,
                    !evaluated.isPreviousFuture ? styles.previousNoticeTextPast : null,
                  ]}
                >
                  {previousNoticeText}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {visible && Platform.OS === 'android' ? renderPicker() : null}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(38,49,81,0.32)',
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '96%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.99)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  content: {
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  actionBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    minWidth: 84,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  actionButtonPressed: {
    opacity: 0.68,
    transform: [{ scale: 0.96 }],
  },
  actionButtonDisabled: {
    opacity: 0.42,
  },
  cancelActionText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  completeActionText: {
    color: palette.lavenderDeep,
    fontSize: 14,
    fontWeight: '900',
  },
  scheduleSurface: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(197,215,241,0.68)',
    borderRadius: 24,
    backgroundColor: '#F3F7FE',
  },
  scheduleLabel: {
    paddingHorizontal: 8,
    paddingTop: 2,
    paddingBottom: 6,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  scheduleDateButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  scheduleTimeButton: {
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  scheduleValueActive: {
    backgroundColor: '#EEE8FF',
  },
  scheduleValuePressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  scheduleValueDisabled: {
    opacity: 0.5,
  },
  scheduleDateValue: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  scheduleTimeValue: {
    color: palette.ink,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '900',
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  scheduleDivider: {
    height: 1,
    marginHorizontal: 12,
    backgroundColor: 'rgba(197,215,241,0.72)',
  },
  pickerSurface: {
    marginTop: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(211,213,251,0.7)',
    borderRadius: 22,
    backgroundColor: '#F9FAFE',
  },
  inlinePicker: {
    alignItems: 'center',
  },
  targetWarning: {
    marginTop: 10,
    color: palette.peachDeep,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  previousNotice: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  previousNoticeText: {
    minWidth: 0,
    flex: 1,
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  previousNoticeTextPast: {
    color: palette.peachDeep,
  },
});
