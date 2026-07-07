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
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon ? <Ionicons name={icon} color={palette.white} size={20} /> : null}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: palette.skyDeep,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
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
  label: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
