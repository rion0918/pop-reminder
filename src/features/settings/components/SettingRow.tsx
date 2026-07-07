import type { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { palette } from '../../../constants/colors';

type SettingRowProps = PropsWithChildren<{
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  caption?: string;
  labelFlex?: number;
  controlFlex?: number;
  onPress?: () => void;
}>;

export function SettingRow({
  icon,
  title,
  caption,
  labelFlex,
  controlFlex,
  onPress,
  children,
}: SettingRowProps) {
  const tapAreaStyle = labelFlex ? [styles.tapArea, { flex: labelFlex }] : styles.tapArea;
  const controlStyle = controlFlex ? [styles.control, { flex: controlFlex }] : styles.control;
  const label = (
    <>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={palette.muted} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      {onPress ? (
        <Pressable onPress={onPress} hitSlop={4} style={tapAreaStyle}>
          {label}
        </Pressable>
      ) : (
        <View style={tapAreaStyle}>{label}</View>
      )}
      <View style={controlStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  tapArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    marginVertical: -10,
  },
  iconWrap: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F7FE',
  },
  copy: {
    flex: 1,
    minWidth: 48,
  },
  title: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    includeFontPadding: false,
  },
  caption: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 3,
  },
  control: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
});
