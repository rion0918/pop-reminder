import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { palette } from '../../constants/colors';
import { PrimaryButton } from './PrimaryButton';

const timePickerDisplay = Platform.select({
  ios: 'spinner',
  android: 'default',
  default: 'default',
} as const);

type TimePickerModalProps = {
  visible: boolean;
  value: string;
  title?: string;
  hint?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function TimePickerModal({
  visible,
  value,
  title = '時刻を選択',
  hint = '選んだ時刻にお知らせが届きます',
  onConfirm,
  onClose,
}: TimePickerModalProps) {
  const [draftTime, setDraftTime] = useState(value);

  useEffect(() => {
    setDraftTime(value);
  }, [value, visible]);

  const pickerValue = useMemo(() => {
    const [hoursText, minutesText] = draftTime.split(':');
    const date = new Date();

    date.setHours(Number(hoursText), Number(minutesText), 0, 0);
    return date;
  }, [draftTime]);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedTime?: Date) => {
      if (event.type === 'dismissed') {
        onClose();
        return;
      }

      if (!selectedTime) {
        return;
      }

      const nextTime = format(selectedTime, 'HH:mm');

      if (Platform.OS === 'android') {
        onConfirm(nextTime);
        onClose();
        return;
      }

      setDraftTime(format(selectedTime, 'HH:mm'));
    },
    [onClose, onConfirm],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(draftTime);
    onClose();
  }, [draftTime, onClose, onConfirm]);

  if (!visible) {
    return null;
  }

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={pickerValue}
        mode="time"
        display={timePickerDisplay}
        is24Hour
        locale="ja-JP"
        onChange={handleChange}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.pickerPanel}>
          <View style={styles.pickerHeader}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="時刻選択を閉じる"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={palette.ink} />
            </Pressable>
          </View>
          <DateTimePicker
            value={pickerValue}
            mode="time"
            display={timePickerDisplay}
            is24Hour
            locale="ja-JP"
            themeVariant="light"
            onChange={handleChange}
          />
          <Text style={styles.hint}>{hint}</Text>
          <PrimaryButton
            label="この時刻にする"
            icon="time-outline"
            onPress={handleConfirm}
            style={styles.pickerButton}
          />
        </View>
      </View>
    </Modal>
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
  title: {
    color: palette.ink,
    fontSize: 17,
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
  hint: {
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
