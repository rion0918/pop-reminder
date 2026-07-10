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
import type { Reminder } from '../types/reminder';
import { getMsUntilNextDay } from '../utils/reminderDueColor';
import { ReminderBubble, type BubbleDeleteMotionPhase } from './ReminderBubble';

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
};

const MAX_VISIBLE_BUBBLES = 12;
const MIN_EDGE_CLEARANCE = 18;
const LAYOUT_VERSION = 5;
const MAX_SOFT_OVERLAP_RATIO = 0.12;
const MAX_DENSE_SOFT_OVERLAP_RATIO = 0.16;
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
const DENSE_FLOATING_SLOTS = [
  { x: 0.28, y: 0.15 },
  { x: 0.62, y: 0.15 },
  { x: 0.82, y: 0.28 },
  { x: 0.15, y: 0.32 },
  { x: 0.48, y: 0.34 },
  { x: 0.72, y: 0.43 },
  { x: 0.26, y: 0.52 },
  { x: 0.58, y: 0.58 },
  { x: 0.84, y: 0.64 },
  { x: 0.16, y: 0.72 },
  { x: 0.44, y: 0.82 },
  { x: 0.72, y: 0.82 },
  { x: 0.62, y: 0.74 },
];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type BubbleSizeName = keyof typeof BUBBLE_SIZE_BUCKETS;

type BoardSize = {
  width: number;
  height: number;
};

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

type PlacedBubble = {
  size: number;
  centerX: number;
  centerY: number;
};

type LayoutSlot = {
  x: number;
  y: number;
  temporal: boolean;
  slotIndex: number;
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

function getTemporalYRatio(index: number, count: number) {
  if (count <= 1) {
    return 0.38;
  }

  return 0.18 + (index / (count - 1)) * 0.66;
}

function makeGridSlots(isDenseLayout: boolean): LayoutSlot[] {
  const columns = isDenseLayout ? 3 : 3;
  const rows = isDenseLayout ? 5 : 3;

  return Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const rowProgress = rows <= 1 ? 0 : row / (rows - 1);
    const stagger = row % 2 === 0 ? -0.02 : 0.02;

    return {
      x: clamp((column + 0.5) / columns + stagger, 0.14, 0.86),
      y: clamp(0.14 + rowProgress * 0.72, 0.14, 0.88),
      temporal: isDenseLayout,
      slotIndex: index,
    };
  });
}

function makeLayoutForItem(
  id: string,
  dimensions: BubbleDimensions,
  boardSize: BoardSize,
  placedBubbles: PlacedBubble[],
  preferredSlotIndex: number,
  temporalIndex: number,
  temporalCount: number,
): FloatingItemLayout {
  const seed = hashString(id);
  const { width, height, collisionSize } = dimensions;
  const edgeClearance = getEdgeClearance(boardSize);
  const maxLeft = Math.max(edgeClearance, boardSize.width - width - edgeClearance);
  const maxTop = Math.max(edgeClearance, boardSize.height - height - edgeClearance);
  const isDenseLayout = temporalCount > 7;
  const activeFloatingSlots = isDenseLayout ? DENSE_FLOATING_SLOTS : FLOATING_SLOTS;
  const preferredSlot = isDenseLayout
    ? temporalIndex % activeFloatingSlots.length
    : preferredSlotIndex % activeFloatingSlots.length;
  const temporalYRatio = isDenseLayout
    ? (activeFloatingSlots[preferredSlot]?.y ?? getTemporalYRatio(temporalIndex, temporalCount))
    : getTemporalYRatio(temporalIndex, temporalCount);
  const jitterRangeX = clamp(
    boardSize.width * (isDenseLayout ? 0.045 : 0.06),
    10,
    isDenseLayout ? 20 : 30,
  );
  const jitterRangeY = clamp(
    boardSize.height * (isDenseLayout ? 0.034 : 0.045),
    9,
    isDenseLayout ? 18 : 26,
  );
  const temporalLaneRatios = [0.5, 0.2, 0.8, 0.34, 0.66, 0.18, 0.82];
  const laneOffset = Math.floor(unitFromHash(seed, 80) * temporalLaneRatios.length);
  const temporalSlots = temporalLaneRatios.map((xRatio, index) => {
    const verticalNudge = ((index % 3) - 1) * 0.025;

    return {
      x: temporalLaneRatios[(index + laneOffset) % temporalLaneRatios.length] ?? xRatio,
      y: clamp(temporalYRatio + verticalNudge, 0.14, 0.9),
      temporal: true,
      slotIndex: index,
    };
  });
  const gridSlots = makeGridSlots(isDenseLayout);
  const slotCandidates = isDenseLayout
    ? [
        ...DENSE_FLOATING_SLOTS.map((slot, index) => ({
          ...slot,
          temporal: true,
          slotIndex: index,
        })),
        ...gridSlots,
        ...FLOATING_SLOTS.map((slot, index) => ({ ...slot, temporal: false, slotIndex: index })),
      ]
    : [
        ...temporalSlots,
        ...FLOATING_SLOTS.map((slot, index) => ({ ...slot, temporal: false, slotIndex: index })),
        ...gridSlots,
      ];

  const bestLayout = slotCandidates.reduce<{
    score: number;
    left: number;
    top: number;
    centerX: number;
    centerY: number;
  } | null>((best, slot, slotIndex) => {
    const baseSlotIndex = slot.slotIndex % activeFloatingSlots.length;
    const distanceFromPreferred = Math.min(
      Math.abs(baseSlotIndex - preferredSlot),
      activeFloatingSlots.length - Math.abs(baseSlotIndex - preferredSlot),
    );
    const jitterX = (unitFromHash(seed, slotIndex + 30) - 0.5) * jitterRangeX;
    const jitterY = (unitFromHash(seed, slotIndex + 50) - 0.5) * jitterRangeY;
    const left = clamp(slot.x * boardSize.width - width / 2 + jitterX, edgeClearance, maxLeft);
    const top = clamp(slot.y * boardSize.height - height / 2 + jitterY, edgeClearance, maxTop);
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const overlapPenalty = placedBubbles.reduce((penalty, placed) => {
      const distance = Math.hypot(centerX - placed.centerX, centerY - placed.centerY);
      const radiusSum = (collisionSize + placed.size) / 2;
      const overlap = Math.max(0, radiusSum - distance);

      if (overlap <= 0) {
        return penalty;
      }

      const allowedOverlap =
        Math.min(collisionSize, placed.size) *
        (isDenseLayout ? MAX_DENSE_SOFT_OVERLAP_RATIO : MAX_SOFT_OVERLAP_RATIO);
      const excessOverlap = Math.max(0, overlap - allowedOverlap);
      const coverRiskDistance =
        Math.abs(collisionSize - placed.size) / 2 + Math.min(collisionSize, placed.size) * 0.28;
      const coverRiskPenalty = distance < coverRiskDistance ? 20000 : 0;
      const hardOverlapPenalty = excessOverlap > 0 ? 12000 : 0;

      return penalty + overlap * 2.4 + excessOverlap * 260 + hardOverlapPenalty + coverRiskPenalty;
    }, 0);
    const lowerRightPenalty =
      centerX > boardSize.width * 0.68 && centerY > boardSize.height * 0.68
        ? isDenseLayout
          ? 180
          : 280
        : 0;
    const edgePenalty =
      top <= edgeClearance + 2 || left <= edgeClearance + 2 || left >= maxLeft - 2 ? 28 : 0;
    const temporalPenalty =
      Math.abs(centerY / boardSize.height - temporalYRatio) * (isDenseLayout ? 520 : 780);
    const floatingSlotPenalty = slot.temporal ? 0 : isDenseLayout ? 240 : 170;
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
    centerX: edgeClearance + width / 2,
    centerY: edgeClearance + height / 2,
    score: 0,
  };

  placedBubbles.push({
    size: collisionSize,
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
  selectedReminderId,
  deleteMotion,
  freezeLayout,
  idleDisabled,
  onReminderPress,
  onDeleteMotionComplete,
  onOverflowPress,
}: ReminderBubbleBoardProps) {
  const [boardSize, setBoardSize] = useState<BoardSize>({ width: 0, height: 0 });
  const [colorReferenceDate, setColorReferenceDate] = useState(() => new Date());
  const layoutCacheRef = useRef(new Map<string, CachedBubbleLayout>());
  const layoutBoardKeyRef = useRef('');
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

      setBoardSize((current) => {
        const nextWidth = Math.round(width);
        const nextHeight = Math.round(height);

        if (current.width === nextWidth && current.height === nextHeight) {
          return current;
        }

        if (freezeLayout && current.width > 0 && current.height > 0) {
          return current;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    },
    [freezeLayout],
  );
  const boardLayout = useMemo(() => {
    if (boardSize.width === 0 || boardSize.height === 0) {
      return {
        bubbleLayouts: [],
        overflowBubble: null,
      };
    }

    const boardKey = `${LAYOUT_VERSION}:${boardSize.width}x${boardSize.height}`;
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
  }, [boardSize, overflowCount, visibleReminders]);
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
