import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
  withTiming,
} from 'react-native-reanimated';

import { palette } from '../../../constants/colors';
import { Reminder } from '../types/reminder';
import { ReminderBubble } from './ReminderBubble';

type ReminderBubbleBoardProps = {
  reminders: Reminder[];
  loading?: boolean;
  error?: string | null;
  burstingReminderId?: string | null;
  idleDisabled?: boolean;
  onReminderPress?: (reminder: Reminder) => void;
  onOverflowPress?: () => void;
};

const MAX_VISIBLE_BUBBLES = 7;
const MIN_EDGE_CLEARANCE = 18;
const LAYOUT_VERSION = 2;
const BUBBLE_SIZE_BUCKETS = {
  large: { base: 146, min: 126 },
  medium: { base: 128, min: 114 },
  small: { base: 114, min: 104 },
} as const;
const BUBBLE_SIZE_SEQUENCE: BubbleSizeName[] = [
  'large',
  'medium',
  'small',
  'medium',
  'large',
  'small',
  'medium',
];
const FLOATING_SLOTS = [
  { x: 0.5, y: 0.16 },
  { x: 0.18, y: 0.31 },
  { x: 0.82, y: 0.31 },
  { x: 0.34, y: 0.52 },
  { x: 0.17, y: 0.73 },
  { x: 0.82, y: 0.72 },
  { x: 0.48, y: 0.87 },
  { x: 0.68, y: 0.54 },
];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type BubbleSizeName = keyof typeof BUBBLE_SIZE_BUCKETS;

type BoardSize = {
  width: number;
  height: number;
};

type BubbleLayout = {
  id: string;
  reminder: Reminder;
  visualIndex: number;
  size: number;
  left: number;
  top: number;
  positionStyle: ViewStyle;
};

type CachedBubbleLayout = {
  visualIndex: number;
  size: number;
  left: number;
  top: number;
  centerX: number;
  centerY: number;
};

type PlacedBubble = {
  size: number;
  centerX: number;
  centerY: number;
};

type FloatingItemLayout = {
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
  return Math.round(clamp(Math.min(boardSize.width, boardSize.height) * 0.055, MIN_EDGE_CLEARANCE, 30));
}

function getBubbleSize(id: string, boardSize: BoardSize, visibleCount: number) {
  const seed = hashString(id);
  const sizeName = BUBBLE_SIZE_SEQUENCE[seed % BUBBLE_SIZE_SEQUENCE.length] ?? 'medium';
  const bucket = BUBBLE_SIZE_BUCKETS[sizeName];
  const edgeClearance = getEdgeClearance(boardSize);
  const densityScale = visibleCount >= 7 ? 0.9 : visibleCount >= 5 ? 0.94 : 1;
  const maxByWidth = boardSize.width * 0.41;
  const maxByHeight = boardSize.height * 0.28;
  const safeMax = Math.max(
    104,
    Math.min(
      boardSize.width - edgeClearance * 2,
      boardSize.height - edgeClearance * 2,
      maxByWidth,
      maxByHeight,
    ),
  );

  return Math.round(clamp(bucket.base * densityScale, bucket.min, safeMax));
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

function getTemporalYRatio(index: number, count: number) {
  if (count <= 1) {
    return 0.38;
  }

  return 0.18 + (index / (count - 1)) * 0.66;
}

function makeLayoutForItem(
  id: string,
  size: number,
  boardSize: BoardSize,
  placedBubbles: PlacedBubble[],
  preferredSlotIndex: number,
  temporalIndex: number,
  temporalCount: number,
): FloatingItemLayout {
  const seed = hashString(id);
  const edgeClearance = getEdgeClearance(boardSize);
  const maxLeft = Math.max(edgeClearance, boardSize.width - size - edgeClearance);
  const maxTop = Math.max(edgeClearance, boardSize.height - size - edgeClearance);
  const preferredSlot = preferredSlotIndex % FLOATING_SLOTS.length;
  const temporalYRatio = getTemporalYRatio(temporalIndex, temporalCount);
  const jitterRangeX = clamp(boardSize.width * 0.06, 14, 30);
  const jitterRangeY = clamp(boardSize.height * 0.045, 12, 26);
  const temporalLaneRatios = [0.5, 0.2, 0.8, 0.34, 0.66, 0.18, 0.82];
  const laneOffset = Math.floor(unitFromHash(seed, 80) * temporalLaneRatios.length);
  const temporalSlots = temporalLaneRatios.map((xRatio, index) => {
    const verticalNudge = (index % 3 - 1) * 0.025;

    return {
      x: temporalLaneRatios[(index + laneOffset) % temporalLaneRatios.length] ?? xRatio,
      y: clamp(temporalYRatio + verticalNudge, 0.14, 0.9),
      temporal: true,
    };
  });
  const slotCandidates = [
    ...temporalSlots,
    ...FLOATING_SLOTS.map((slot) => ({ ...slot, temporal: false })),
  ];

  const bestLayout = slotCandidates.reduce<{
    score: number;
    left: number;
    top: number;
    centerX: number;
    centerY: number;
  } | null>((best, slot, slotIndex) => {
    const baseSlotIndex = slotIndex % FLOATING_SLOTS.length;
    const distanceFromPreferred = Math.min(
      Math.abs(baseSlotIndex - preferredSlot),
      FLOATING_SLOTS.length - Math.abs(baseSlotIndex - preferredSlot),
    );
    const jitterX = (unitFromHash(seed, slotIndex + 30) - 0.5) * jitterRangeX;
    const jitterY = (unitFromHash(seed, slotIndex + 50) - 0.5) * jitterRangeY;
    const left = clamp(slot.x * boardSize.width - size / 2 + jitterX, edgeClearance, maxLeft);
    const top = clamp(slot.y * boardSize.height - size / 2 + jitterY, edgeClearance, maxTop);
    const centerX = left + size / 2;
    const centerY = top + size / 2;
    const overlapPenalty = placedBubbles.reduce((penalty, placed) => {
      const distance = Math.hypot(centerX - placed.centerX, centerY - placed.centerY);
      const minReadableDistance = (size + placed.size) * 0.68;

      if (distance >= minReadableDistance) {
        return penalty;
      }

      return penalty + (minReadableDistance - distance) * 7.2;
    }, 0);
    const lowerRightPenalty =
      centerX > boardSize.width * 0.68 && centerY > boardSize.height * 0.68 ? 280 : 0;
    const edgePenalty =
      top <= edgeClearance + 2 || left <= edgeClearance + 2 || left >= maxLeft - 2 ? 28 : 0;
    const temporalPenalty = Math.abs(centerY / boardSize.height - temporalYRatio) * 780;
    const floatingSlotPenalty = slot.temporal ? 0 : 170;
    const score =
      distanceFromPreferred * 8 +
      unitFromHash(seed, slotIndex + 10) * 18 +
      overlapPenalty +
      lowerRightPenalty +
      edgePenalty +
      temporalPenalty +
      floatingSlotPenalty;

    if (!best || score < best.score) {
      return {
        score,
        left,
        top,
        centerX,
        centerY,
      };
    }

    return best;
  }, null);

  const layout = bestLayout ?? {
    left: edgeClearance,
    top: edgeClearance,
    centerX: edgeClearance + size / 2,
    centerY: edgeClearance + size / 2,
    score: 0,
  };

  placedBubbles.push({
    size,
    centerX: layout.centerX,
    centerY: layout.centerY,
  });

  return layout;
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
  const idleMotion = useMemo(
    () => makeOverflowIdleMotionConfig(`overflow-${count}`),
    [count],
  );

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          Math.sin(idleProgress.value * Math.PI * 2) * idleMotion.amplitudeX,
      },
      {
        translateY:
          Math.cos(idleProgress.value * Math.PI * 2) * idleMotion.amplitudeY,
      },
      {
        rotate: `${Math.sin(idleProgress.value * Math.PI * 2) * idleMotion.rotateDeg}deg`,
      },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`ほか${count}件のリマインダーを一覧で開く`}
      disabled={disabled}
      onPress={onPress}
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
  burstingReminderId,
  idleDisabled,
  onReminderPress,
  onOverflowPress,
}: ReminderBubbleBoardProps) {
  const [boardSize, setBoardSize] = useState<BoardSize>({ width: 0, height: 0 });
  const layoutCacheRef = useRef(new Map<string, CachedBubbleLayout>());
  const layoutBoardKeyRef = useRef('');
  const reminderIdsKey = useMemo(
    () => reminders.slice(0, MAX_VISIBLE_BUBBLES).map((reminder) => reminder.id).join(','),
    [reminders],
  );
  const visibleReminders = useMemo(
    () => reminders.slice(0, MAX_VISIBLE_BUBBLES),
    [reminderIdsKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const overflowCount = Math.max(0, reminders.length - visibleReminders.length);
  const handleBoardLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setBoardSize((current) => {
      const nextWidth = Math.round(width);
      const nextHeight = Math.round(height);

      if (current.width === nextWidth && current.height === nextHeight) {
        return current;
      }

      return {
        width: nextWidth,
        height: nextHeight,
      };
    });
  }, []);
  const boardLayout = useMemo(
    () => {
      if (boardSize.width === 0 || boardSize.height === 0) {
        return {
          bubbleLayouts: [],
          overflowBubble: null,
        };
      }

      const boardKey = `${LAYOUT_VERSION}:${boardSize.width}x${boardSize.height}:${reminderIdsKey}`;
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

        if (!cachedLayout) {
          return;
        }

        placedBubbles.push({
          size: cachedLayout.size,
          centerX: cachedLayout.centerX,
          centerY: cachedLayout.centerY,
        });
      });

      const bubbleLayouts = visibleReminders.map((reminder, reminderIndex): BubbleLayout => {
        const cachedLayout = layoutCache.get(reminder.id);

        if (cachedLayout) {
          return {
            id: reminder.id,
            reminder,
            visualIndex: cachedLayout.visualIndex,
            size: cachedLayout.size,
            left: cachedLayout.left,
            top: cachedLayout.top,
            positionStyle: {
              left: cachedLayout.left,
              top: cachedLayout.top,
            },
          };
        }

        const size = getBubbleSize(reminder.id, boardSize, visibleReminders.length);
        const visualIndex = getStableVisualIndex(reminder.id);
        const layout = makeLayoutForItem(
          reminder.id,
          size,
          boardSize,
          placedBubbles,
          visualIndex,
          reminderIndex,
          visibleReminders.length,
        );
        const nextLayout = {
          visualIndex,
          size,
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
              const size = Math.round(clamp(boardSize.width * 0.29, 96, 112));
              const layout = makeLayoutForItem(
                `overflow-${overflowCount}`,
                size,
                boardSize,
                placedBubbles,
                getStableVisualIndex(`overflow-${overflowCount}`),
                visibleReminders.length,
                visibleReminders.length + 1,
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
    },
    [boardSize, overflowCount, reminderIdsKey, visibleReminders],
  );
  const { bubbleLayouts, overflowBubble } = boardLayout;

  const boardReady = boardSize.width > 0 && boardSize.height > 0;

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
      <View onLayout={handleBoardLayout} style={[styles.board, styles.center]}>
        <View style={styles.emptyScene}>
          <View style={[styles.emptyMiniBubble, styles.emptyMiniOne]} />
          <View style={[styles.emptyMiniBubble, styles.emptyMiniTwo]} />
          <View style={[styles.emptyMiniBubble, styles.emptyMiniThree]} />
          <View style={styles.emptyMessage}>
            <Text style={styles.emptyTitle}>まだ泡はひとつも浮いていません</Text>
            <Text style={styles.emptyText}>忘れたくないこと、右下からふわっとどうぞ</Text>
          </View>
          <View style={styles.emptyGuide}>
            <Text style={styles.emptyGuideText}>右下から</Text>
            <Ionicons
              name="arrow-down-outline"
              size={18}
              color={palette.muted}
              style={styles.emptyGuideIcon}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View onLayout={handleBoardLayout} style={styles.board}>
      {boardReady ? bubbleLayouts.map(({ reminder, visualIndex, size, positionStyle }) => (
        <ReminderBubble
          key={reminder.id}
          reminder={reminder}
          index={visualIndex}
          size={size}
          isBursting={burstingReminderId === reminder.id}
          idleDisabled={idleDisabled || burstingReminderId === reminder.id}
          onPress={onReminderPress}
          style={positionStyle}
        />
      )) : null}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  emptyMessage: {
    alignItems: 'center',
    maxWidth: 292,
    marginTop: -18,
  },
  emptyGuide: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.86,
  },
  emptyGuideText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  emptyGuideIcon: {
    transform: [{ rotate: '-18deg' }],
  },
  emptyMiniBubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.56)',
    shadowColor: '#A7B6E9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.11,
    shadowRadius: 18,
    elevation: 1,
  },
  emptyMiniOne: {
    top: '18%',
    right: '20%',
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  emptyMiniTwo: {
    top: '32%',
    left: '18%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(237,230,255,0.22)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  emptyMiniThree: {
    left: '25%',
    bottom: '26%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(220,248,236,0.18)',
    borderColor: 'rgba(255,255,255,0.52)',
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
