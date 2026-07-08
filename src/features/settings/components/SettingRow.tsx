import type { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, Text, View } from 'react-native';
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
  const tapAreaStyle = labelFlex ? { flex: labelFlex } : undefined;
  const controlStyle = controlFlex ? { flex: controlFlex } : undefined;
  const label = (
    <>
      <View className="h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[17px] bg-[#F2F7FE]">
        <Ionicons name={icon} size={20} color={palette.muted} />
      </View>
      <View className="min-w-[48px] flex-1">
        <Text
          className="text-[14px] font-extrabold leading-[19px] text-app-ink"
          style={{ includeFontPadding: false }}
        >
          {title}
        </Text>
        {caption ? (
          <Text className="mt-[3px] text-[11px] font-semibold leading-[16px] text-app-muted">
            {caption}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <View className="min-h-[64px] flex-row items-center py-[10px]">
      {onPress ? (
        <Pressable
          onPress={onPress}
          hitSlop={4}
          className="-my-[10px] min-w-0 flex-1 flex-row items-center gap-[12px] py-[10px]"
          style={tapAreaStyle}
        >
          {label}
        </Pressable>
      ) : (
        <View
          className="-my-[10px] min-w-0 flex-1 flex-row items-center gap-[12px] py-[10px]"
          style={tapAreaStyle}
        >
          {label}
        </View>
      )}
      <View className="shrink-0 items-end" style={controlStyle}>
        {children}
      </View>
    </View>
  );
}
