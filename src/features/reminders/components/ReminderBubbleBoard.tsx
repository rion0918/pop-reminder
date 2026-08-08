import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '../../../constants/colors';
import type { Reminder } from '../types/reminder';
import { getMsUntilNextDay } from '../utils/reminderDueColor';
import { EmptyReminderBubble } from './EmptyReminderBubble';
import { ReminderBubble, type BubbleDeleteMotionPhase } from './ReminderBubble';
import {
  REMINDER_BUBBLE_PRESS_SCALE,
  REMINDER_BUBBLE_PRESS_SPRING,
} from './reminderBubblePressMotion';
import {
  MIN_EDGE_CLEARANCE,
  getTemporalYRatio,
  makeGridSlots,
  makeLayoutForItem,
  resolveBoardSizeMeasurement,
  type BoardSize,
  type BubbleVerticalLayoutMode,
  type PlacedBubble,
} from './reminderBubbleLayout';

export { getTemporalYRatio, makeGridSlots, makeLayoutForItem };

export type BubbleDeleteMotion = {
  reminderId: string;
  phase: BubbleDeleteMotionPhase;
};

type ReminderBubbleBoardProps = {
  reminders: Reminder[];
  loading?: boolean;
  error?: string | null;
  selectedReminderId?: string | null;
  deleteMotion?: BubbleDeleteMotion | null;
  freezeLayout?: boolean;
  idleDisabled?: boolean;
  onReminderPress?: (reminder: Reminder) => void;
  onDeleteMotionComplete?: (reminderId: string, phase: BubbleDeleteMotionPhase) => void;
  onOverflowPress?: () => void;
  onEmptyPress?: () => void;
  emptyDisabled?: boolean;
  verticalLayoutMode?: BubbleVerticalLayoutMode;
};

const MAX_VISIBLE_BUBBLES = 12;
const LAYOUT_VERSION = 7;
const EMPTY_HEADLINE_BLOCK_HEIGHT = 31 * 2 + 32;
const BUBBLE_SIZE_BUCKETS = {
  large: { base: 160, min: 116 },
  medium: { base: 128, min: 98 },
  small: { base: 114, min: 90 },
} as const;
const BUBBLE_SIZE_SEQUENCE: BubbleSizeName[] = [
  'large',
  'medium',
  'small',
  'medium',
  'large',
  'small',
  'medium',
  'small',
  'large',
  'small',
  'medium',
  'small',
];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type BubbleSizeName = keyof typeof BUBBLE_SIZE_BUCKETS;

type BubbleDimensions = {
  width: number;
  height: number;
  collisionSize: number;
};

type BubbleLayout = {
  id: string;
  reminder: Reminder;
  visualIndex: number;
  size: number;
  width: number;
  height: number;
  left: number;
  top: number;
  positionStyle: ViewStyle;
};

type CachedBubbleLayout = {
  contentKey: string;
  visualIndex: number;
  size: number;
  width: number;
  height: number;
  collisionSize: number;
  left: number;
  top: number;
  centerX: number;
  centerY: number;
};

type OverflowBubbleProps = {
  count: number;
  size: number;
  left: number;
  top: number;
  disabled: boolean;
  onPress?: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function unitFromHash(seed: number, salt: number) {
  let hash = seed ^ Math.imul(salt + 1, 0x9e3779b9);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

function getEdgeClearance(boardSize: BoardSize) {
  return Math.round(
    clamp(Math.min(boardSize.width, boardSize.height) * 0.055, MIN_EDGE_CLEARANCE, 30),
  );
}

function getTitleVisualLength(title: string) {
  return Array.from(title.trim()).reduce((length, character) => {
    if (character.trim().length === 0) {
      return length + 0.35;
    }

    return length + (character.charCodeAt(0) <= 0x007f ? 0.62 : 1);
  }, 0);
}

function getReminderLayoutContentKey(reminder: Reminder) {
  return `${Math.round(getTitleVisualLength(reminder.title) * 10)}`;
}

function getTitleSizeScale(visualLength: number) {
  if (visualLength >= 32) {
    return 1.64;
  }

  if (visualLength >= 24) {
    return 1.52;
  }

  if (visualLength >= 18) {
    return 1.42;
  }

  if (visualLength >= 13) {
    return 1.28;
  }

  if (visualLength >= 9) {
    return 1.14;
  }

  if (visualLength <= 3) {
    return 0.72;
  }

  if (visualLength <= 4) {
    return 0.8;
  }

  return 1;
}

function getTitleMinSize(visualLength: number, bucketMin: number, visibleCount: number) {
  const compactMin = visibleCount >= 8 ? 86 : 98;

  if (visualLength >= 32) {
    return bucketMin + (visibleCount >= 8 ? 26 : 34);
  }

  if (visualLength >= 24) {
    return bucketMin + (visibleCount >= 8 ? 22 : 30);
  }

  if (visualLength >= 18) {
    return bucketMin + (visibleCount >= 8 ? 18 : 24);
  }

  if (visualLength >= 13) {
    return bucketMin + (visibleCount >= 8 ? 12 : 18);
  }

  if (visualLength <= 4) {
    return compactMin;
  }

  return visibleCount >= 8 ? Math.min(bucketMin, 96) : bucketMin;
}

function getBubbleDimensions(
  reminder: Reminder,
  boardSize: BoardSize,
  visibleCount: number,
): BubbleDimensions {
  const seed = hashString(reminder.id);
  const sizeName = BUBBLE_SIZE_SEQUENCE[seed % BUBBLE_SIZE_SEQUENCE.length] ?? 'medium';
  const bucket = BUBBLE_SIZE_BUCKETS[sizeName];
  const edgeClearance = getEdgeClearance(boardSize);
  const densityScale =
    visibleCount >= 12
      ? 0.76
      : visibleCount >= 10
        ? 0.8
        : visibleCount >= 8
          ? 0.84
          : visibleCount >= 7
            ? 0.9
            : visibleCount >= 5
              ? 0.94
              : 1;
  const titleVisualLength = getTitleVisualLength(reminder.title);
  const titleScale = getTitleSizeScale(titleVisualLength);
  const minForTitle = getTitleMinSize(titleVisualLength, bucket.min, visibleCount);
  const maxByWidth = boardSize.width * (visibleCount >= 8 ? 0.34 : 0.41);
  const maxByHeight = boardSize.height * (visibleCount >= 8 ? 0.23 : 0.28);
  const safeMax = Math.max(
    visibleCount >= 8 ? 90 : 104,
    Math.min(
      boardSize.width - edgeClearance * 2,
      boardSize.height - edgeClearance * 2,
      maxByWidth,
      maxByHeight,
    ),
  );

  const height = Math.round(clamp(bucket.base * densityScale * titleScale, minForTitle, safeMax));
  const aspectRatio = titleVisualLength >= 32 ? 1.72 : titleVisualLength >= 24 ? 1.56 : 1;
  const maxWideWidth = Math.min(
    boardSize.width - edgeClearance * 2,
    boardSize.width * (visibleCount >= 8 ? 0.54 : 0.68),
  );
  const width = Math.round(clamp(height * aspectRatio, height, maxWideWidth));

  return {
    width,
    height,
    collisionSize: Math.max(width, height),
  };
}

function getStableVisualIndex(id: string) {
  return hashString(id) % 97;
}

function makeOverflowIdleMotionConfig(id: string) {
  const seed = hashString(id);

  return {
    delay: Math.round(unitFromHash(seed, 1) * 1000),
    duration: Math.round(5000 + unitFromHash(seed, 2) * 2200),
    amplitudeX: 1.4 + unitFromHash(seed, 3) * 1.8,
    amplitudeY: 1.8 + unitFromHash(seed, 4) * 2.2,
    rotateDeg: 0.18 + unitFromHash(seed, 5) * 0.28,
  };
}

const OverflowBubble = memo(function OverflowBubble({
  count,
  size,
  left,
  top,
  disabled,
  onPress,
}: OverflowBubbleProps) {
  const reduceMotion = useReducedMotion();
  const idleProgress = useSharedValue(0);
  const pressProgress = useSharedValue(0);
  const idleMotion = useMemo(() => makeOverflowIdleMotionConfig(`overflow-${count}`), [count]);

  useEffect(() => {
    cancelAnimation(idleProgress);

    if (reduceMotion) {
      idleProgress.value = 0;
      return;
    }

    idleProgress.value = 0;
    idleProgress.value = withDelay(
      idleMotion.delay,
      withRepeat(
        withTiming(1, {
          duration: idleMotion.duration,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      ),
    );

    return () => {
      cancelAnimation(idleProgress);
    };
  }, [idleMotion.delay, idleMotion.duration, idleProgress, reduceMotion]);

  const handlePressIn = () => {
    if (disabled) return;

    pressProgress.value = reduceMotion ? 1 : withSpring(1, REMINDER_BUBBLE_PRESS_SPRING);
  };

  const handlePressOut = () => {
    pressProgress.value = reduceMotion ? 0 : withSpring(0, REMINDER_BUBBLE_PRESS_SPRING);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: Math.sin(idleProgress.value * Math.PI * 2) * idleMotion.amplitudeX,
      },
      {
        translateY: Math.cos(idleProgress.value * Math.PI * 2) * idleMotion.amplitudeY,
      },
      {
        rotate: `${Math.sin(idleProgress.value * Math.PI * 2) * idleMotion.rotateDeg}deg`,
      },
      {
        scale: 1 - pressProgress.value * (1 - REMINDER_BUBBLE_PRESS_SCALE),
      },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`ほか${count}件のリマインダーを一覧で開く`}
      accessibilityHint="一覧を開きます"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.moreBubble,
        disabled ? styles.moreBubbleDisabled : null,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left,
          top,
        },
        animatedStyle,
      ]}
    >
      <Text style={styles.moreCount}>+{count}</Text>
      <Text style={styles.moreLabel}>ほか</Text>
    </AnimatedPressable>
  );
});

export const ReminderBubbleBoard = memo(function ReminderBubbleBoard({
  reminders,
  loading,
  error,
  selectedReminderId,
  deleteMotion,
  freezeLayout,
  idleDisabled,
  onReminderPress,
  onDeleteMotionComplete,
  onOverflowPress,
  onEmptyPress,
  emptyDisabled,
  verticalLayoutMode = 'natural',
}: ReminderBubbleBoardProps) {
  const boardContentMode = !loading && !error && reminders.length === 0 ? 'empty' : 'populated';
  const [boardSize, setBoardSize] = useState<BoardSize>({ width: 0, height: 0 });
  const [colorReferenceDate, setColorReferenceDate] = useState(() => new Date());
  const layoutCacheRef = useRef(new Map<string, CachedBubbleLayout>());
  const layoutBoardKeyRef = useRef('');
  const lastMeasuredContentModeRef = useRef(boardContentMode);
  const reminderIdsKey = useMemo(
    () =>
      reminders
        .slice(0, MAX_VISIBLE_BUBBLES)
        .map(
          (reminder) => `${reminder.id}:${Math.round(getTitleVisualLength(reminder.title) * 10)}`,
        )
        .join(','),
    [reminders],
  );
  const visibleReminders = useMemo(
    () => reminders.slice(0, MAX_VISIBLE_BUBBLES),
    [reminderIdsKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const overflowCount = Math.max(0, reminders.length - visibleReminders.length);
  useEffect(() => {
    const timer = setTimeout(() => {
      setColorReferenceDate(new Date());
    }, getMsUntilNextDay());

    return () => clearTimeout(timer);
  }, [colorReferenceDate]);
  const handleBoardLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      const measuredSize = {
        width: Math.round(width),
        height: Math.round(height),
      };
      const contentModeChanged = lastMeasuredContentModeRef.current !== boardContentMode;

      if (contentModeChanged) {
        lastMeasuredContentModeRef.current = boardContentMode;
      }

      setBoardSize((current) =>
        resolveBoardSizeMeasurement(current, measuredSize, {
          freezeLayout: Boolean(freezeLayout),
          contentModeChanged,
        }),
      );
    },
    [boardContentMode, freezeLayout],
  );
  const boardLayout = useMemo(() => {
    if (boardSize.width === 0 || boardSize.height === 0) {
      return {
        bubbleLayouts: [],
        overflowBubble: null,
      };
    }

    const homeTimelineOrderKey =
      verticalLayoutMode === 'homeTimeline'
        ? visibleReminders.map((reminder) => reminder.id).join(',')
        : 'stable';
    const boardKey = `${LAYOUT_VERSION}:${verticalLayoutMode}:${boardContentMode}:${boardSize.width}x${boardSize.height}:${homeTimelineOrderKey}`;
    const layoutCache = layoutCacheRef.current;

    if (layoutBoardKeyRef.current !== boardKey) {
      layoutCache.clear();
      layoutBoardKeyRef.current = boardKey;
    }

    const reminderIds = new Set(visibleReminders.map((reminder) => reminder.id));
    layoutCache.forEach((_, reminderId) => {
      if (!reminderIds.has(reminderId)) {
        layoutCache.delete(reminderId);
      }
    });

    const placedBubbles: PlacedBubble[] = [];

    visibleReminders.forEach((reminder) => {
      const cachedLayout = layoutCache.get(reminder.id);

      if (!cachedLayout || cachedLayout.contentKey !== getReminderLayoutContentKey(reminder)) {
        return;
      }

      placedBubbles.push({
        size: cachedLayout.collisionSize,
        centerX: cachedLayout.centerX,
        centerY: cachedLayout.centerY,
      });
    });

    const bubbleLayouts = visibleReminders.map((reminder, reminderIndex): BubbleLayout => {
      const cachedLayout = layoutCache.get(reminder.id);
      const contentKey = getReminderLayoutContentKey(reminder);

      if (cachedLayout && cachedLayout.contentKey === contentKey) {
        return {
          id: reminder.id,
          reminder,
          visualIndex: cachedLayout.visualIndex,
          size: cachedLayout.size,
          width: cachedLayout.width,
          height: cachedLayout.height,
          left: cachedLayout.left,
          top: cachedLayout.top,
          positionStyle: {
            left: cachedLayout.left,
            top: cachedLayout.top,
          },
        };
      }

      const dimensions = getBubbleDimensions(reminder, boardSize, visibleReminders.length);
      const size = dimensions.height;
      const { width, height, collisionSize } = dimensions;
      const visualIndex = getStableVisualIndex(reminder.id);
      const layout = makeLayoutForItem(
        reminder.id,
        dimensions,
        boardSize,
        placedBubbles,
        visualIndex,
        reminderIndex,
        visibleReminders.length,
        verticalLayoutMode,
      );
      const nextLayout = {
        contentKey,
        visualIndex,
        size,
        width,
        height,
        collisionSize,
        left: layout.left,
        top: layout.top,
        centerX: layout.centerX,
        centerY: layout.centerY,
      };

      layoutCache.set(reminder.id, nextLayout);

      return {
        id: reminder.id,
        reminder,
        visualIndex,
        size,
        width,
        height,
        left: layout.left,
        top: layout.top,
        positionStyle: {
          left: layout.left,
          top: layout.top,
        },
      };
    });
    const overflowBubble =
      overflowCount > 0
        ? (() => {
            const isDenseOverflow = visibleReminders.length >= 10;
            const size = Math.round(
              clamp(
                boardSize.width * (isDenseOverflow ? 0.24 : 0.29),
                isDenseOverflow ? 82 : 96,
                isDenseOverflow ? 98 : 112,
              ),
            );
            const layout = makeLayoutForItem(
              `overflow-${overflowCount}`,
              { width: size, height: size, collisionSize: size },
              boardSize,
              placedBubbles,
              getStableVisualIndex(`overflow-${overflowCount}`),
              visibleReminders.length,
              visibleReminders.length + 1,
              verticalLayoutMode,
            );

            return {
              size,
              left: layout.left,
              top: layout.top,
            };
          })()
        : null;

    return {
      bubbleLayouts,
      overflowBubble,
    };
  }, [boardContentMode, boardSize, overflowCount, verticalLayoutMode, visibleReminders]);
  const { bubbleLayouts, overflowBubble } = boardLayout;

  const boardReady = boardSize.width > 0 && boardSize.height > 0;
  const emptyBubbleSize = Math.round(
    clamp(Math.min(boardSize.width * 0.82, boardSize.height * 0.48), 184, 286),
  );
  const emptySceneTopPadding = Math.max(
    0,
    Math.round((boardSize.height - emptyBubbleSize) / 2 - EMPTY_HEADLINE_BLOCK_HEIGHT),
  );
  const emptyInstructionGap = Math.round(clamp(boardSize.height * 0.09, 32, 68));

  if (loading) {
    return (
      <View onLayout={handleBoardLayout} style={[styles.board, styles.center]}>
        <View style={styles.emptyBubble}>
          <Text style={styles.emptyTitle}>読み込み中</Text>
          <Text style={styles.emptyText}>泡を整えています</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View onLayout={handleBoardLayout} style={[styles.board, styles.center]}>
        <View style={styles.emptyBubble}>
          <Text style={styles.emptyTitle}>うまく読めませんでした</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (reminders.length === 0) {
    return (
      <View onLayout={handleBoardLayout} style={styles.board}>
        <View style={[styles.emptyScene, { paddingTop: emptySceneTopPadding }]}>
          <Text style={styles.emptyHeadline}>忘れる前に{`\n`}ふわっと残そう。</Text>
          <EmptyReminderBubble
            size={emptyBubbleSize}
            disabled={emptyDisabled}
            onPress={onEmptyPress}
          />
          <Text style={[styles.emptyInstruction, { marginTop: emptyInstructionGap }]}>
            泡をタップして追加
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View onLayout={handleBoardLayout} style={styles.board}>
      {boardReady
        ? bubbleLayouts.map(({ reminder, visualIndex, size, width, height, positionStyle }) => (
            <ReminderBubble
              key={reminder.id}
              reminder={reminder}
              index={visualIndex}
              size={size}
              width={width}
              height={height}
              currentDate={colorReferenceDate}
              isSelected={selectedReminderId === reminder.id}
              deleteMotionPhase={
                deleteMotion?.reminderId === reminder.id ? deleteMotion.phase : undefined
              }
              idleDisabled={idleDisabled || deleteMotion?.reminderId === reminder.id}
              onPress={onReminderPress}
              onDeleteMotionComplete={onDeleteMotionComplete}
              style={positionStyle}
            />
          ))
        : null}
      {overflowBubble ? (
        <OverflowBubble
          count={overflowCount}
          disabled={!onOverflowPress}
          left={overflowBubble.left}
          size={overflowBubble.size}
          top={overflowBubble.top}
          onPress={onOverflowPress}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  board: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBubble: {
    width: 236,
    minHeight: 188,
    borderRadius: 94,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 30,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(179,220,248,0.72)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 2,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyScene: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  emptyHeadline: {
    alignSelf: 'flex-start',
    marginBottom: 32,
    color: palette.ink,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '900',
  },
  emptyInstruction: {
    alignSelf: 'center',
    color: palette.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  moreBubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(179,220,248,0.62)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 1,
  },
  moreBubbleDisabled: {
    opacity: 0.9,
  },
  moreCount: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
  },
  moreLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    marginTop: 2,
  },
});
