import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
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
    currentAllDay.value = allDay;
    if (!dragging.value || disabled) {
      cancelAnimation(position);
      position.value = allDay ? travel : 0;
      dragging.value = false;
    }
  }, [allDay, disabled, travel, currentAllDay, dragging, position]);

  const pan = Gesture.Pan()
    .enabled(!disabled && travel > EDGE_TOLERANCE)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      cancelAnimation(position);
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
      const target = currentAllDay.value ? travel : 0;
      position.value = reduceMotion ? target : withSpring(target, SNAP_SPRING);
      runOnJS(commit)(currentAllDay.value);
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      const target = currentAllDay.value ? travel : 0;
      position.value = reduceMotion ? target : withSpring(target, SNAP_SPRING);
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
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
          <Animated.View accessible={false} style={[styles.thumb, thumbStyle]}>
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
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(237,230,255,0.58)',
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
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 15,
    backgroundColor: '#D8CCFF',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
