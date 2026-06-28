import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../../../constants/colors';
import { ReminderDateOffset } from '../stores/reminderUiStore';
import type {
  ComputedReminderDatePreset,
  ReminderDatePreset,
} from '../utils/reminderDatePresets';
import {
  formatLocalDate,
  getReminderDatePresetTarget,
} from '../utils/reminderDatePresets';

type DateChipsProps = {
  value: ReminderDateOffset;
  preset: ReminderDatePreset;
  customDate: string | null;
  onChange: (value: ReminderDateOffset) => void;
  onSelectPresetDate: (preset: ComputedReminderDatePreset, date: string) => void;
  onSelectCustomDate: () => void;
};

const relativeChips: {
  label: string;
  value: ReminderDateOffset;
  preset: ReminderDatePreset;
}[] = [
  { label: '今日', value: 0, preset: 'today' },
  { label: '明日', value: 1, preset: 'tomorrow' },
];

const weekendChip: { label: string; preset: ComputedReminderDatePreset } = {
  label: '週末',
  preset: 'weekend',
};

function formatCustomDate(value: string | null) {
  if (!value) {
    return '日付';
  }

  return format(new Date(`${value}T00:00:00`), 'M/d');
}

export function DateChips({
  value,
  preset,
  customDate,
  onChange,
  onSelectPresetDate,
  onSelectCustomDate,
}: DateChipsProps) {
  const customActive = preset === 'custom';
  const weekendActive = preset === weekendChip.preset;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {relativeChips.map((chip) => {
          const active = preset === chip.preset;

          return (
            <Pressable
              key={chip.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(chip.value)}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.activeChip : null,
                pressed ? styles.pressedChip : null,
              ]}
            >
              <Text style={[styles.label, active ? styles.activeLabel : null]}>{chip.label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: weekendActive }}
          onPress={() =>
            onSelectPresetDate(
              weekendChip.preset,
              formatLocalDate(getReminderDatePresetTarget(weekendChip.preset)),
            )
          }
          style={({ pressed }) => [
            styles.chip,
            weekendActive ? styles.activeChip : null,
            pressed ? styles.pressedChip : null,
          ]}
        >
          <Text style={[styles.label, weekendActive ? styles.activeLabel : null]}>
            {weekendChip.label}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: customActive }}
          onPress={onSelectCustomDate}
          style={({ pressed }) => [
            styles.chip,
            styles.selectChip,
            customActive ? styles.activeChip : null,
            pressed ? styles.pressedChip : null,
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={customActive ? palette.white : palette.ink}
          />
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[styles.label, customActive ? styles.activeLabel : null]}
          >
            {customActive ? formatCustomDate(customDate) : '日付'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    height: 38,
    borderRadius: 14,
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
    flex: 1.18,
    paddingHorizontal: 8,
  },
  pressedChip: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
});
