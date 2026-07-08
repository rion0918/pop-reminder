import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../../../constants/colors';
import type { ReminderDateOffset } from '../stores/reminderUiStore';
import type { ComputedReminderDatePreset, ReminderDatePreset } from '../utils/reminderDatePresets';
import { formatLocalDate, getReminderDatePresetTarget } from '../utils/reminderDatePresets';

type DateChipsProps = {
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
  preset,
  customDate,
  onChange,
  onSelectPresetDate,
  onSelectCustomDate,
}: DateChipsProps) {
  const customActive = preset === 'custom';
  const weekendActive = preset === weekendChip.preset;

  return (
    <View className="gap-[8px]">
      <View className="flex-row gap-[8px]">
        {relativeChips.map((chip) => {
          const active = preset === chip.preset;

          return (
            <Pressable
              key={chip.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(chip.value)}
              className={`h-[38px] min-w-0 flex-1 flex-row items-center justify-center gap-[4px] rounded-[14px] border ${
                active ? 'border-app-sky-deep bg-app-sky-deep' : 'border-app-line bg-app-cloud'
              }`}
              style={({ pressed }) => [pressed ? styles.pressedChip : null]}
            >
              <Text
                className={`text-[13px] font-extrabold ${
                  active ? 'text-app-white' : 'text-app-ink'
                }`}
              >
                {chip.label}
              </Text>
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
          className={`h-[38px] min-w-0 flex-1 flex-row items-center justify-center gap-[4px] rounded-[14px] border ${
            weekendActive ? 'border-app-sky-deep bg-app-sky-deep' : 'border-app-line bg-app-cloud'
          }`}
          style={({ pressed }) => [pressed ? styles.pressedChip : null]}
        >
          <Text
            className={`text-[13px] font-extrabold ${
              weekendActive ? 'text-app-white' : 'text-app-ink'
            }`}
          >
            {weekendChip.label}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: customActive }}
          onPress={onSelectCustomDate}
          className={`h-[38px] min-w-0 flex-row items-center justify-center gap-[4px] rounded-[14px] border px-[8px] ${
            customActive ? 'border-app-sky-deep bg-app-sky-deep' : 'border-app-line bg-app-cloud'
          }`}
          style={({ pressed }) => [styles.selectChip, pressed ? styles.pressedChip : null]}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={customActive ? palette.white : palette.ink}
          />
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            className={`text-[13px] font-extrabold ${
              customActive ? 'text-app-white' : 'text-app-ink'
            }`}
          >
            {customActive ? formatCustomDate(customDate) : '日付'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectChip: {
    flex: 1.18,
  },
  pressedChip: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
});
