import { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { palette } from '../../../constants/colors';

type SettingRowProps = PropsWithChildren<{
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  caption?: string;
  onPress?: () => void;
}>;

export function SettingRow({ icon, title, caption, onPress, children }: SettingRowProps) {
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
        <Pressable onPress={onPress} hitSlop={4} style={styles.tapArea}>
          {label}
        </Pressable>
      ) : (
        <View style={styles.tapArea}>{label}</View>
      )}
      <View style={styles.control}>{children}</View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    marginVertical: -10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F7FE',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  caption: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  control: {
    alignItems: 'flex-end',
  },
});
