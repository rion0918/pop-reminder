import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { palette } from '../../constants/colors';

type TimePreset = {
  label: string;
  time: string;
};

type TimeSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectCustomTime: () => void;
  style?: StyleProp<ViewStyle>;
};

const presets: TimePreset[] = [
  { label: '朝', time: '08:00' },
  { label: '昼', time: '12:00' },
  { label: '夕', time: '18:00' },
  { label: '夜', time: '20:00' },
];

export function TimeSelector({
  value,
  onChange,
  onSelectCustomTime,
  style,
}: TimeSelectorProps) {
  const isPresetTime = presets.some((preset) => preset.time === value);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.presetRow}>
        {presets.map((preset) => {
          const active = value === preset.time;

          return (
            <Pressable
              key={preset.time}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(preset.time)}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.activeChip : null,
                pressed ? styles.pressedChip : null,
              ]}
            >
              <Text style={[styles.label, active ? styles.activeLabel : null]}>{preset.label}</Text>
              <Text style={[styles.time, active ? styles.activeLabel : null]}>{preset.time}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !isPresetTime }}
        onPress={onSelectCustomTime}
        style={({ pressed }) => [
          styles.chip,
          styles.customChip,
          !isPresetTime ? styles.activeChip : null,
          pressed ? styles.pressedChip : null,
        ]}
      >
        <Ionicons
          name="time-outline"
          size={15}
          color={!isPresetTime ? palette.white : palette.ink}
        />
        <Text style={[styles.label, !isPresetTime ? styles.activeLabel : null]}>
          時刻を選ぶ
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: palette.cloud,
    borderWidth: 1,
    borderColor: palette.line,
  },
  activeChip: {
    backgroundColor: palette.lavenderDeep,
    borderColor: palette.lavenderDeep,
  },
  customChip: {
    minHeight: 40,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  time: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  activeLabel: {
    color: palette.white,
  },
  pressedChip: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
});
