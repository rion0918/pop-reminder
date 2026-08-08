import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfDay } from 'date-fns';

import { palette } from '../../../constants/colors';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
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
  const isSaveDisabled = isSaving || !evaluated.isValid || !evaluated.isTargetFuture;

  useEffect(() => {
    if (!visible) return;

    setDraft(createReminderScheduleDraft(reminder));
    setActivePicker(null);
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

    return Platform.OS === 'android' ? picker : <View style={styles.inlinePicker}>{picker}</View>;
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) onClose();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <Text style={styles.title}>日時を変更</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="日時変更を閉じる"
                accessibilityState={{ disabled: isSaving }}
                disabled={isSaving}
                hitSlop={8}
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={palette.ink} />
              </Pressable>
            </View>

            <Text style={styles.subtitle}>当日のお知らせ日時を変更します</Text>

            <View style={styles.fieldGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="対象日を変更"
                accessibilityHint={formatReminderDetailDate(datePickerValue)}
                accessibilityState={{ disabled: isSaving }}
                disabled={isSaving}
                onPress={() => setActivePicker('date')}
                style={({ pressed }) => [styles.field, pressed ? styles.fieldPressed : null]}
              >
                <View style={styles.fieldIcon}>
                  <Ionicons name="calendar-outline" size={21} color={palette.lavenderDeep} />
                </View>
                <View style={styles.fieldCopy}>
                  <Text style={styles.fieldLabel}>対象日</Text>
                  <Text style={styles.fieldValue}>{formatReminderDetailDate(datePickerValue)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.muted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="当日のお知らせ時刻を変更"
                accessibilityHint={draft.targetTime}
                accessibilityState={{ disabled: isSaving }}
                disabled={isSaving}
                onPress={() => setActivePicker('time')}
                style={({ pressed }) => [styles.field, pressed ? styles.fieldPressed : null]}
              >
                <View style={styles.fieldIcon}>
                  <Ionicons name="time-outline" size={21} color={palette.lavenderDeep} />
                </View>
                <View style={styles.fieldCopy}>
                  <Text style={styles.fieldLabel}>当日のお知らせ</Text>
                  <Text style={styles.fieldValue}>{formatReminderDetailTime(timePickerValue)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.muted} />
              </Pressable>
            </View>

            {activePicker && Platform.OS !== 'android' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pickerを閉じる"
                onPress={() => setActivePicker(null)}
                style={styles.pickerDone}
              >
                <Text style={styles.pickerDoneText}>選択を完了</Text>
              </Pressable>
            ) : null}

            {Platform.OS !== 'android' ? renderPicker() : null}

            <View style={styles.previousPreview}>
              <View style={styles.previousPreviewHeader}>
                <Ionicons name="notifications-outline" size={18} color={palette.muted} />
                <Text style={styles.previousPreviewLabel}>前日のお知らせ</Text>
                <View style={styles.sharedBadge}>
                  <Text style={styles.sharedBadgeText}>すべての泡に共通</Text>
                </View>
              </View>
              <Text style={styles.previousPreviewDate}>
                {formatReminderDetailDate(previousDate)} {formatReminderDetailTime(previousDate)}
              </Text>
              {!evaluated.isPreviousFuture ? (
                <Text style={styles.warningText}>
                  前日のお知らせ時刻は過ぎているため、当日だけ通知します
                </Text>
              ) : null}
            </View>

            {!evaluated.isTargetFuture ? (
              <Text style={styles.warningText}>過去の日時には変更できません</Text>
            ) : null}

            <PrimaryButton
              label={isSaving ? '保存中' : 'この日時に変更'}
              icon="checkmark-circle-outline"
              disabled={isSaveDisabled}
              onPress={() => onConfirm(draft)}
              style={styles.confirmButton}
            />
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
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(38,49,81,0.22)',
  },
  panel: {
    width: '100%',
    borderRadius: 26,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.98)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F3F6FC',
  },
  fieldGroup: {
    gap: 10,
    marginTop: 18,
  },
  field: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(211,213,251,0.72)',
    borderRadius: 18,
    backgroundColor: '#F8F7FF',
  },
  fieldPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  fieldIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#EEEAFF',
  },
  fieldCopy: {
    minWidth: 0,
    flex: 1,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  fieldValue: {
    marginTop: 3,
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  inlinePicker: {
    alignItems: 'center',
    marginTop: 8,
  },
  pickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pickerDoneText: {
    color: palette.lavenderDeep,
    fontSize: 13,
    fontWeight: '900',
  },
  previousPreview: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F7F8FC',
  },
  previousPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  previousPreviewLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  sharedBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#E9EDF6',
  },
  sharedBadgeText: {
    color: palette.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  previousPreviewDate: {
    marginTop: 8,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  warningText: {
    marginTop: 8,
    color: palette.peachDeep,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  confirmButton: {
    marginTop: 16,
  },
});
