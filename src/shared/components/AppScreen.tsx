import type { PropsWithChildren } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type AppTheme, appThemes } from '../../constants/colors';

type AppScreenProps = PropsWithChildren<{
  theme?: AppTheme;
}>;

export function AppScreen({ children, theme = 'sky' }: AppScreenProps) {
  const colors = appThemes[theme];
  const { width } = useWindowDimensions();
  const horizontalPadding = width <= 360 ? 16 : 20;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1 pt-[8px]" style={{ paddingHorizontal: horizontalPadding }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
