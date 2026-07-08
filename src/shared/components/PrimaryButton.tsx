import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { palette } from '../../constants/colors';

type PrimaryButtonProps = {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({ label, icon, onPress, disabled, style }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-[56px] flex-row items-center justify-center gap-[8px] rounded-[18px] bg-app-sky-deep px-[20px]"
      style={({ pressed }) => [
        styles.shadow,
        style,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon ? <Ionicons name={icon} color={palette.white} size={20} /> : null}
      <Text className="text-[16px] font-bold text-app-white">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.5,
  },
});
