import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { SharedValue } from 'react-native-reanimated';

type EmptyReminderBubbleMembraneFallbackProps = {
  size: number;
  motionProgress: SharedValue<number>;
};

export function EmptyReminderBubbleMembraneFallback({
  size,
}: EmptyReminderBubbleMembraneFallbackProps) {
  const radius = size / 2;

  return (
    <View
      pointerEvents="none"
      style={[styles.surface, { width: size, height: size, borderRadius: radius }]}
    >
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.84)',
          'rgba(182,218,255,0.28)',
          'rgba(218,203,255,0.22)',
          'rgba(255,225,211,0.16)',
        ]}
        locations={[0, 0.44, 0.76, 1]}
        start={{ x: 0.16, y: 0.08 }}
        end={{ x: 0.86, y: 0.96 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.36)', 'rgba(255,255,255,0)', 'rgba(63,87,145,0.08)']}
        locations={[0, 0.54, 1]}
        start={{ x: 0.08, y: 0.04 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.outerGlassRing, { borderRadius: radius }]} />
      <View style={[styles.innerGlassRing, { borderRadius: radius - 7 }]} />
      <View style={[styles.leftLightArc, { borderRadius: radius }]} />
      <View style={[styles.colorRim, { borderRadius: radius - 11 }]} />
      <View style={[styles.highlightLarge, { borderRadius: size * 0.2 }]} />
      <View style={[styles.highlightSmall, { borderRadius: size * 0.05 }]} />
      <View style={[styles.bottomReflection, { borderRadius: size * 0.16 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.84)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  outerGlassRing: {
    position: 'absolute',
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderWidth: 2.2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  innerGlassRing: {
    position: 'absolute',
    top: 7,
    right: 7,
    bottom: 7,
    left: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  leftLightArc: {
    position: 'absolute',
    top: '5%',
    left: '6%',
    width: '77%',
    height: '75%',
    borderTopWidth: 3,
    borderLeftWidth: 2.2,
    borderColor: 'rgba(255,255,255,0.76)',
    opacity: 0.84,
    transform: [{ rotate: '-14deg' }],
  },
  colorRim: {
    position: 'absolute',
    top: 10,
    right: 9,
    bottom: 9,
    left: 10,
    borderTopWidth: 2,
    borderRightWidth: 2.4,
    borderBottomWidth: 1.8,
    borderTopColor: 'rgba(199,172,255,0.34)',
    borderRightColor: 'rgba(102,203,255,0.38)',
    borderBottomColor: 'rgba(255,188,220,0.34)',
  },
  highlightLarge: {
    position: 'absolute',
    top: '13%',
    left: '16%',
    width: '34%',
    height: '18%',
    backgroundColor: 'rgba(255,255,255,0.72)',
    opacity: 0.86,
    transform: [{ rotate: '-28deg' }],
  },
  highlightSmall: {
    position: 'absolute',
    top: '29%',
    left: '13%',
    width: '10%',
    height: '16%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    opacity: 0.78,
    transform: [{ rotate: '16deg' }],
  },
  bottomReflection: {
    position: 'absolute',
    right: '16%',
    bottom: '15%',
    width: '22%',
    height: '10%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    opacity: 0.7,
    transform: [{ rotate: '-36deg' }],
  },
});
