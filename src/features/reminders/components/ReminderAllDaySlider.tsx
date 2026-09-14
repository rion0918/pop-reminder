import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { palette } from '../../../constants/colors';

type ReminderAllDaySliderProps = {
  allDay: boolean;
  dateLabel: string;
  time: string;
  allDayNotifyTime: string;
  disabled: boolean;
  reduceMotion: boolean;
  onChange: (allDay: boolean) => void;
};

const THUMB_SIZE = 44;
const TRACK_INSET = 4;
const EDGE_TOLERANCE = 4;
const SNAP_SPRING = { damping: 26, stiffness: 300, mass: 0.7, overshootClamping: true };
const SURFACE_SPRING = { damping: 22, stiffness: 400, mass: 0.5 };

export function ReminderAllDaySlider({
  allDay,
  dateLabel,
  time,
  allDayNotifyTime,
  disabled,
  reduceMotion,
  onChange,
}: ReminderAllDaySliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const travel = Math.max(0, trackWidth - THUMB_SIZE - TRACK_INSET * 2);
  const position = useSharedValue(0);
  const stretch = useSharedValue(0);
  const dragOrigin = useSharedValue(0);
  const dragging = useSharedValue(false);
  const committed = useSharedValue(false);
  const currentAllDay = useSharedValue(allDay);
  const originAllDay = useSharedValue(allDay);
  const currentProps = useRef({ allDay, disabled, onChange });
  currentProps.current = { allDay, disabled, onChange };

  const commit = useCallback((nextAllDay: boolean) => {
    const current = currentProps.current;
    if (current.disabled || current.allDay === nextAllDay) return;
    // Guard duplicate accessibility events before the controlled value renders.
    current.allDay = nextAllDay;
    current.onChange(nextAllDay);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentAllDay.value !== allDay || disabled || !dragging.value) {
      cancelAnimation(stretch);
      stretch.value = 0;
    }
    currentAllDay.value = allDay;
    if (!dragging.value || disabled) {
      cancelAnimation(position);
      position.value = allDay ? travel : 0;
      dragging.value = false;
    }
  }, [allDay, disabled, travel, currentAllDay, dragging, position, stretch]);

  useEffect(() => {
    if (!reduceMotion) return;
    cancelAnimation(stretch);
    stretch.value = 0;
  }, [reduceMotion, stretch]);

  const pan = Gesture.Pan()
    .enabled(!disabled && travel > EDGE_TOLERANCE)
    // Claim this control before the parent sheet pan, including diagonal drags.
    .minDistance(0)
    .onStart(() => {
      cancelAnimation(position);
      cancelAnimation(stretch);
      stretch.value = reduceMotion ? 0 : withSpring(1, SURFACE_SPRING);
      dragOrigin.value = position.value;
      originAllDay.value = currentAllDay.value;
      committed.value = false;
      dragging.value = true;
    })
    .onUpdate((event) => {
      if (disabled || !dragging.value || committed.value) return;
      const nextPosition = Math.max(0, Math.min(travel, dragOrigin.value + event.translationX));
      position.value = nextPosition;
      const reachedEnd = originAllDay.value
        ? nextPosition <= EDGE_TOLERANCE
        : nextPosition >= travel - EDGE_TOLERANCE;
      if (!reachedEnd) return;

      committed.value = true;
      currentAllDay.value = !originAllDay.value;
      stretch.value = reduceMotion ? 0 : withSpring(0, SURFACE_SPRING);
      const target = currentAllDay.value ? travel : 0;
      position.value = reduceMotion ? target : withSpring(target, SNAP_SPRING);
      runOnJS(commit)(currentAllDay.value);
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      if (!committed.value) {
        stretch.value = reduceMotion ? 0 : withSpring(0, SURFACE_SPRING);
      }
      const target = currentAllDay.value ? travel : 0;
      position.value = reduceMotion ? target : withSpring(target, SNAP_SPRING);
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
  const surfaceStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + stretch.value * 0.04 }, { scaleY: 1 - stretch.value * 0.03 }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value - travel }],
  }));
  const previewStyle = useAnimatedStyle(() => ({
    // Clear the text before the thumb enters it; reveal the new preview at the end.
    opacity: Math.max(0, 1 - Math.abs(position.value - (allDay ? travel : 0)) / 8),
  }));

  return (
    <View
      accessible
      accessibilityRole="switch"
      accessibilityLabel={`${dateLabel} ${allDay ? `終日・${allDayNotifyTime}にお知らせ` : time}`}
      accessibilityState={{ checked: allDay, disabled }}
      accessibilityHint={allDay ? '時間指定に戻します' : '終日に切り替えます'}
      accessibilityActions={[{ name: 'activate', label: allDay ? '時間指定に戻す' : '終日にする' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') commit(!allDay);
      }}
      onAccessibilityTap={() => commit(!allDay)}
      style={[styles.container, disabled ? styles.disabled : null]}
    >
      <GestureDetector gesture={pan}>
        <View
          testID="all-day-slider-track"
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          style={styles.track}
        >
          <Animated.View pointerEvents="none" style={[styles.fill, fillStyle]} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.64)', 'rgba(255,255,255,0)']}
            style={styles.trackLight}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.summary,
              allDay ? styles.summaryAllDay : styles.summaryTimed,
              previewStyle,
            ]}
          >
            <Text style={styles.date}>{dateLabel}</Text>
            <Text style={styles.time}>
              {allDay ? `終日 · ${allDayNotifyTime}にお知らせ` : time}
            </Text>
          </Animated.View>
          <Animated.View
            testID="all-day-slider-thumb"
            accessible={false}
            style={[styles.thumb, thumbStyle]}
          >
            <Animated.View
              testID="all-day-slider-surface"
              pointerEvents="none"
              accessible={false}
              style={[styles.surface, surfaceStyle]}
            >
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.97)',
                  'rgba(244,239,255,0.94)',
                  'rgba(193,171,246,0.80)',
                ]}
                locations={[0, 0.55, 1]}
                start={{ x: 0.16, y: 0.08 }}
                end={{ x: 0.86, y: 0.96 }}
                style={styles.waterFill}
              />
              <View style={styles.waterRim} />
              <View style={styles.waterHighlight} />
              <View style={styles.waterReflection} />
            </Animated.View>
            <Text style={styles.thumbLabel}>{allDay ? '時刻' : '終日'}</Text>
            <Text style={styles.thumbArrow}>{allDay ? '←' : '→'}</Text>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(237,230,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(168,145,245,0.24)',
  },
  disabled: { opacity: 0.5 },
  summary: { paddingVertical: 8, alignItems: 'center' },
  summaryTimed: { paddingLeft: THUMB_SIZE + TRACK_INSET * 3, paddingRight: 8 },
  summaryAllDay: { paddingLeft: 8, paddingRight: THUMB_SIZE + TRACK_INSET * 3 },
  date: {
    color: palette.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  time: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  track: { minHeight: THUMB_SIZE + TRACK_INSET * 2, overflow: 'hidden', justifyContent: 'center' },
  trackLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(216,204,255,0.48)',
  },
  thumbLabel: {
    color: palette.lavenderDeep,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  thumbArrow: {
    color: palette.lavenderDeep,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  thumb: {
    position: 'absolute',
    left: TRACK_INSET,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    shadowColor: palette.lavenderDeep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
  },
  waterFill: { ...StyleSheet.absoluteFillObject, borderRadius: THUMB_SIZE / 2 },
  waterRim: {
    ...StyleSheet.absoluteFillObject,
    margin: 1,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(121,87,213,0.18)',
    borderTopColor: 'rgba(255,255,255,0.8)',
    borderLeftColor: 'rgba(255,255,255,0.6)',
  },
  waterHighlight: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 14,
    height: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.9)',
    transform: [{ rotate: '-28deg' }],
  },
  waterReflection: {
    position: 'absolute',
    bottom: 3,
    right: 7,
    width: 20,
    height: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.64)',
    transform: [{ rotate: '-18deg' }],
  },
});
