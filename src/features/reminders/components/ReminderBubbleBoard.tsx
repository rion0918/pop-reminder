import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

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
};

const MAX_VISIBLE_BUBBLES = 7;
const EDGE_CLEARANCE = 16;
const BUBBLE_SIZE_BUCKETS = {
  large: { base: 150, min: 136 },
  medium: { base: 134, min: 124 },
  small: { base: 120, min: 114 },
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
  { x: 0.52, y: 0.2 },
  { x: 0.24, y: 0.34 },
  { x: 0.76, y: 0.36 },
  { x: 0.43, y: 0.53 },
  { x: 0.2, y: 0.69 },
  { x: 0.72, y: 0.72 },
  { x: 0.46, y: 0.84 },
  { x: 0.62, y: 0.58 },
];

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

function getBubbleSize(id: string, boardSize: BoardSize) {
  const seed = hashString(id);
  const sizeName = BUBBLE_SIZE_SEQUENCE[seed % BUBBLE_SIZE_SEQUENCE.length] ?? 'medium';
  const bucket = BUBBLE_SIZE_BUCKETS[sizeName];
  const maxByWidth = boardSize.width * 0.45;
  const maxByHeight = boardSize.height * 0.31;
  const safeMax = Math.max(
    108,
    Math.min(
      boardSize.width - EDGE_CLEARANCE * 2,
      boardSize.height - EDGE_CLEARANCE * 2,
      maxByWidth,
      maxByHeight,
    ),
  );

  return Math.round(clamp(bucket.base, bucket.min, safeMax));
}

function getStableVisualIndex(id: string) {
  return hashString(id) % 97;
}

function makeLayoutForItem(
  id: string,
  size: number,
  boardSize: BoardSize,
  placedBubbles: PlacedBubble[],
  preferredSlotIndex: number,
): FloatingItemLayout {
  const seed = hashString(id);
  const maxLeft = Math.max(EDGE_CLEARANCE, boardSize.width - size - EDGE_CLEARANCE);
  const maxTop = Math.max(EDGE_CLEARANCE, boardSize.height - size - EDGE_CLEARANCE);
  const preferredSlot = preferredSlotIndex % FLOATING_SLOTS.length;

  const bestLayout = FLOATING_SLOTS.reduce<{
    score: number;
    left: number;
    top: number;
    centerX: number;
    centerY: number;
  } | null>((best, slot, slotIndex) => {
    const distanceFromPreferred = Math.min(
      Math.abs(slotIndex - preferredSlot),
      FLOATING_SLOTS.length - Math.abs(slotIndex - preferredSlot),
    );
    const jitterX = (unitFromHash(seed, slotIndex + 30) - 0.5) * 28;
    const jitterY = (unitFromHash(seed, slotIndex + 50) - 0.5) * 24;
    const left = clamp(slot.x * boardSize.width - size / 2 + jitterX, EDGE_CLEARANCE, maxLeft);
    const top = clamp(slot.y * boardSize.height - size / 2 + jitterY, EDGE_CLEARANCE, maxTop);
    const centerX = left + size / 2;
    const centerY = top + size / 2;
    const overlapPenalty = placedBubbles.reduce((penalty, placed) => {
      const distance = Math.hypot(centerX - placed.centerX, centerY - placed.centerY);
      const minReadableDistance = (size + placed.size) * 0.48;

      if (distance >= minReadableDistance) {
        return penalty;
      }

      return penalty + (minReadableDistance - distance) * 4.2;
    }, 0);
    const lowerRightPenalty =
      centerX > boardSize.width * 0.72 && centerY > boardSize.height * 0.7 ? 88 : 0;
    const edgePenalty =
      top <= EDGE_CLEARANCE + 2 || left <= EDGE_CLEARANCE + 2 || left >= maxLeft - 2 ? 10 : 0;
    const score =
      distanceFromPreferred * 46 +
      unitFromHash(seed, slotIndex + 10) * 18 +
      overlapPenalty +
      lowerRightPenalty +
      edgePenalty;

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
    left: EDGE_CLEARANCE,
    top: EDGE_CLEARANCE,
    centerX: EDGE_CLEARANCE + size / 2,
    centerY: EDGE_CLEARANCE + size / 2,
    score: 0,
  };

  placedBubbles.push({
    size,
    centerX: layout.centerX,
    centerY: layout.centerY,
  });

  return layout;
}

export const ReminderBubbleBoard = memo(function ReminderBubbleBoard({
  reminders,
  loading,
  error,
  burstingReminderId,
  idleDisabled,
  onReminderPress,
}: ReminderBubbleBoardProps) {
  const [boardSize, setBoardSize] = useState<BoardSize>({ width: 0, height: 0 });
  const layoutCacheRef = useRef(new Map<string, CachedBubbleLayout>());
  const layoutBoardKeyRef = useRef('');
  const visibleReminders = useMemo(
    () => reminders.slice(0, MAX_VISIBLE_BUBBLES),
    [reminders],
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

      const boardKey = `${boardSize.width}x${boardSize.height}`;
      const layoutCache = layoutCacheRef.current;

      if (layoutBoardKeyRef.current !== boardKey) {
        layoutCache.clear();
        layoutBoardKeyRef.current = boardKey;
      }

      const reminderIds = new Set(reminders.map((reminder) => reminder.id));
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

      const bubbleLayouts = visibleReminders.map((reminder): BubbleLayout => {
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

        const size = getBubbleSize(reminder.id, boardSize);
        const visualIndex = getStableVisualIndex(reminder.id);
        const layout = makeLayoutForItem(
          reminder.id,
          size,
          boardSize,
          placedBubbles,
          visualIndex,
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
    [boardSize, overflowCount, reminders, visibleReminders],
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
        <View
          style={[
            styles.moreBubble,
            {
              width: overflowBubble.size,
              height: overflowBubble.size,
              borderRadius: overflowBubble.size / 2,
              left: overflowBubble.left,
              top: overflowBubble.top,
            },
          ]}
        >
          <Text style={styles.moreCount}>+{overflowCount}</Text>
          <Text style={styles.moreLabel}>ほか</Text>
        </View>
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
