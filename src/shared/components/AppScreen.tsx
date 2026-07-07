import type { PropsWithChildren } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 8,
  },
});
