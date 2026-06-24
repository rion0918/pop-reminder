import { memo, useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../../../shared/constants/colors';
import { Reminder } from '../types/reminder';
import { ReminderBubble } from './ReminderBubble';

type ReminderBubbleBoardProps = {
  reminders: Reminder[];
  loading?: boolean;
  error?: string | null;
  burstingReminderId?: string | null;
  onReminderPress?: (reminder: Reminder) => void;
};

const MAX_VISIBLE_BUBBLES = 7;
const EDGE_CLEARANCE = 24;
const BUBBLE_SIZE_PATTERN = [154, 140, 128, 146, 116, 134, 124];
const FLOATING_SLOTS = [
  { x: 0.48, y: 0.13 },
  { x: 0.22, y: 0.25 },
  { x: 0.73, y: 0.28 },
  { x: 0.39, y: 0.43 },
  { x: 0.79, y: 0.52 },
  { x: 0.18, y: 0.61 },
  { x: 0.56, y: 0.69 },
  { x: 0.31, y: 0.82 },
];

type BoardSize = {
  width: number;
  height: number;
};

type BubbleLayout = {
  id: string;
  reminder: Reminder;
  index: number;
  size: number;
  left: number;
  top: number;
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

function getBubbleSize(seed: number, boardSize: BoardSize) {
  const patternIndex = Math.floor(unitFromHash(seed, 2) * BUBBLE_SIZE_PATTERN.length);
  const baseSize = BUBBLE_SIZE_PATTERN[patternIndex] ?? BUBBLE_SIZE_PATTERN[0];
  const maxByWidth = (boardSize.width - EDGE_CLEARANCE * 2) * 0.43;
  const maxByHeight = (boardSize.height - EDGE_CLEARANCE * 2) * 0.28;
  const maxSize = clamp(Math.min(maxByWidth, maxByHeight), 104, 154);

  return Math.round(clamp(baseSize, 104, maxSize));
}

function makeLayoutForItem(
  id: string,
  size: number,
  boardSize: BoardSize,
  placedBubbles: PlacedBubble[],
): FloatingItemLayout {
  const seed = hashString(id);
  const maxLeft = Math.max(EDGE_CLEARANCE, boardSize.width - size - EDGE_CLEARANCE);
  const maxTop = Math.max(EDGE_CLEARANCE, boardSize.height - size - EDGE_CLEARANCE);
  const slotOrder = FLOATING_SLOTS
    .map((slot, slotIndex) => ({
      slot,
      slotIndex,
      rank: unitFromHash(seed, slotIndex + 10),
    }))
    .sort((a, b) => a.rank - b.rank);

  const bestLayout = slotOrder.reduce<{
    score: number;
    left: number;
    top: number;
    centerX: number;
    centerY: number;
  } | null>((best, { slot, slotIndex, rank }) => {
    const jitterX = (unitFromHash(seed, slotIndex + 30) - 0.5) * 38;
    const jitterY = (unitFromHash(seed, slotIndex + 50) - 0.5) * 34;
    const left = clamp(slot.x * boardSize.width - size / 2 + jitterX, EDGE_CLEARANCE, maxLeft);
    const top = clamp(slot.y * boardSize.height - size / 2 + jitterY, EDGE_CLEARANCE, maxTop);
    const centerX = left + size / 2;
    const centerY = top + size / 2;
    const overlapPenalty = placedBubbles.reduce((penalty, placed) => {
      const distance = Math.hypot(centerX - placed.centerX, centerY - placed.centerY);
      const minReadableDistance = (size + placed.size) * 0.46;

      if (distance >= minReadableDistance) {
        return penalty;
      }

      return penalty + (minReadableDistance - distance) * 3.4;
    }, 0);
    const lowerRightPenalty =
      centerX > boardSize.width * 0.72 && centerY > boardSize.height * 0.72 ? 70 : 0;
    const edgePenalty =
      top <= EDGE_CLEARANCE + 2 || left <= EDGE_CLEARANCE + 2 || left >= maxLeft - 2 ? 8 : 0;
    const score = rank * 34 + overlapPenalty + lowerRightPenalty + edgePenalty;

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

function makeLayoutForReminder(
  reminder: Reminder,
  index: number,
  boardSize: BoardSize,
  placedBubbles: PlacedBubble[],
): BubbleLayout {
  const seed = hashString(reminder.id);
  const size = getBubbleSize(seed, boardSize);
  const layout = makeLayoutForItem(reminder.id, size, boardSize, placedBubbles);

  return {
    id: reminder.id,
    reminder,
    index,
    size,
    left: layout.left,
    top: layout.top,
  };
}

export const ReminderBubbleBoard = memo(function ReminderBubbleBoard({
  reminders,
  loading,
  error,
  burstingReminderId,
  onReminderPress,
}: ReminderBubbleBoardProps) {
  const [boardSize, setBoardSize] = useState<BoardSize>({ width: 0, height: 0 });
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

      const placedBubbles: PlacedBubble[] = [];
      const bubbleLayouts = visibleReminders.map((reminder, index) =>
        makeLayoutForReminder(reminder, index, boardSize, placedBubbles),
      );
      const overflowBubble =
        overflowCount > 0
          ? (() => {
              const size = Math.round(clamp(boardSize.width * 0.29, 96, 112));
              const layout = makeLayoutForItem(
                `overflow-${overflowCount}`,
                size,
                boardSize,
                placedBubbles,
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
    [boardSize, overflowCount, visibleReminders],
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
        <View style={[styles.miniBubble, styles.miniBubbleTop]} />
        <View style={styles.emptyBubble}>
          <Text style={styles.emptyTitle}>今日はまだ、忘れ物ゼロかもしれません</Text>
          <Text style={styles.emptyText}>気になることがあれば、右下からひとつ浮かべましょう</Text>
        </View>
        <View style={[styles.miniBubble, styles.miniBubbleBottom]} />
      </View>
    );
  }

  return (
    <View onLayout={handleBoardLayout} style={styles.board}>
      {boardReady ? bubbleLayouts.map(({ reminder, index, size, left, top }) => (
        <ReminderBubble
          key={reminder.id}
          reminder={reminder}
          index={index}
          size={size}
          isBursting={burstingReminderId === reminder.id}
          onPress={onReminderPress}
          style={{ left, top }}
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
  miniBubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(179,220,248,0.52)',
  },
  miniBubbleTop: {
    top: '18%',
    right: '18%',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  miniBubbleBottom: {
    left: '17%',
    bottom: '22%',
    width: 28,
    height: 28,
    borderRadius: 14,
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
