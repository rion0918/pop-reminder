import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { palette } from '../../constants/colors';
import { DEFAULT_TIME_PRESETS, type TimePreset } from '../utils/timePresets';

export type TimeSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectCustomTime: () => void;
  presets?: TimePreset[];
  variant?: 'regular' | 'compact';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TimeSelector({
  value,
  onChange,
  onSelectCustomTime,
  presets = DEFAULT_TIME_PRESETS,
  variant = 'regular',
  disabled = false,
  style,
}: TimeSelectorProps) {
  const isPresetTime = presets.some((preset) => preset.time === value);
  const isCompact = variant === 'compact';
  const customTimeLabel = isCompact && !isPresetTime ? value : '時刻';

  const renderPresetChip = (preset: TimePreset) => {
    const active = value === preset.time;
    const presetChipClassName = `min-w-0 flex-1 items-center justify-center gap-[2px] border px-[8px] py-[7px] ${
      isCompact ? 'min-h-[42px] rounded-[14px] px-[3px] py-[5px]' : 'min-h-[42px] rounded-[16px]'
    } ${active ? 'border-app-lavender-deep bg-app-lavender-deep' : 'border-app-line bg-app-cloud'}`;

    return (
      <Pressable
        key={preset.time}
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled }}
        disabled={disabled}
        onPress={() => onChange(preset.time)}
        className={presetChipClassName}
        style={({ pressed }) => [pressed ? styles.pressedChip : null]}
      >
        <Text
          className={`font-extrabold ${isCompact ? 'text-[12px]' : 'text-[13px]'} ${
            active ? 'text-app-white' : 'text-app-ink'
          }`}
        >
          {preset.label}
        </Text>
        <Text
          className={`text-[12px] font-extrabold ${active ? 'text-app-white' : 'text-app-muted'}`}
        >
          {preset.time}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className={isCompact ? 'gap-0' : 'gap-[8px]'} style={style}>
      {isCompact ? (
        <View className="flex-row gap-[5px]">
          {presets.map(renderPresetChip)}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !isPresetTime, disabled }}
            disabled={disabled}
            onPress={onSelectCustomTime}
            className={`min-h-[42px] min-w-0 flex-1 flex-row items-center justify-center gap-[4px] rounded-[14px] border px-[3px] py-[5px] ${
              !isPresetTime
                ? 'border-app-lavender-deep bg-app-lavender-deep'
                : 'border-app-line bg-app-cloud'
            }`}
            style={({ pressed }) => [pressed ? styles.pressedChip : null]}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={!isPresetTime ? palette.white : palette.ink}
            />
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              className={`text-[12px] font-extrabold ${
                !isPresetTime ? 'text-app-white' : 'text-app-ink'
              }`}
            >
              {isCompact ? customTimeLabel : '時刻を選ぶ'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="flex-row gap-[8px]">{presets.map(renderPresetChip)}</View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !isPresetTime, disabled }}
            disabled={disabled}
            onPress={onSelectCustomTime}
            className={`min-h-[42px] w-full min-w-0 flex-row items-center justify-center gap-[6px] rounded-[16px] border px-[14px] py-[7px] ${
              !isPresetTime
                ? 'border-app-lavender-deep bg-app-lavender-deep'
                : 'border-app-line bg-app-cloud'
            }`}
            style={({ pressed }) => [pressed ? styles.pressedChip : null]}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={!isPresetTime ? palette.white : palette.ink}
            />
            <Text
              className={`text-[13px] font-extrabold ${
                !isPresetTime ? 'text-app-white' : 'text-app-ink'
              }`}
            >
              {!isPresetTime ? `カスタム: ${value}` : '時刻を選ぶ'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pressedChip: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
});
