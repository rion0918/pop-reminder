import { Ionicons } from '@expo/vector-icons';
import { format, getYear } from 'date-fns';
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
  { label: '明後日', value: 2, preset: 'dayAfterTomorrow' },
];

const computedChips: { label: string; preset: ComputedReminderDatePreset }[] = [
  { label: '週末', preset: 'weekend' },
  { label: '来週', preset: 'nextWeek' },
];

function formatCustomDate(value: string | null) {
  if (!value) {
    return '日付を選ぶ';
  }

  const date = new Date(`${value}T00:00:00`);
  const thisYear = getYear(new Date());
  const pattern = getYear(date) === thisYear ? 'M/d' : 'yyyy/M/d';

  return format(date, pattern);
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
      </View>

      <View style={styles.row}>
        {computedChips.map((chip) => {
          const active = preset === chip.preset;

          return (
            <Pressable
              key={chip.preset}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() =>
                onSelectPresetDate(
                  chip.preset,
                  formatLocalDate(getReminderDatePresetTarget(chip.preset)),
                )
              }
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
          <Text style={[styles.label, customActive ? styles.activeLabel : null]}>
            {customActive ? formatCustomDate(customDate) : '日付を選ぶ'}
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
    flex: 1.35,
    paddingHorizontal: 10,
  },
  pressedChip: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
});
