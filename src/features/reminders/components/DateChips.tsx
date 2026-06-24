import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../../../shared/constants/colors';
import { ReminderDateOffset } from '../stores/reminderUiStore';

type DateChipsProps = {
  value: ReminderDateOffset;
  customDate: string | null;
  onChange: (value: ReminderDateOffset) => void;
  onSelectCustomDate: () => void;
};

const chips: Array<{ label: string; value: ReminderDateOffset }> = [
  { label: '今日', value: 0 },
  { label: '明日', value: 1 },
  { label: '明後日', value: 2 },
];

function formatCustomDate(value: string | null) {
  if (!value) {
    return '選択';
  }

  return format(new Date(`${value}T00:00:00`), 'M/d');
}

export function DateChips({ value, customDate, onChange, onSelectCustomDate }: DateChipsProps) {
  return (
    <View style={styles.row}>
      {chips.map((chip) => {
        const active = !customDate && chip.value === value;

        return (
          <Pressable
            key={chip.value}
            accessibilityRole="button"
            onPress={() => onChange(chip.value)}
            style={[styles.chip, active ? styles.activeChip : null]}
          >
            <Text style={[styles.label, active ? styles.activeLabel : null]}>{chip.label}</Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        onPress={onSelectCustomDate}
        style={[styles.chip, styles.selectChip, customDate ? styles.activeChip : null]}
      >
        <Ionicons
          name="calendar-outline"
          size={14}
          color={customDate ? palette.white : palette.ink}
        />
        <Text style={[styles.label, customDate ? styles.activeLabel : null]}>
          {formatCustomDate(customDate)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    height: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    backgroundColor: palette.cloud,
    borderWidth: 1,
    borderColor: palette.line,
  },
  activeChip: {
    backgroundColor: palette.skyDeep,
    borderColor: palette.skyDeep,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  activeLabel: {
    color: palette.white,
  },
  selectChip: {
    flex: 0.95,
  },
});
