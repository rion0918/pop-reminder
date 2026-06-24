import { memo, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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
const BOARD_SIDE_GUTTER = 22;
const BOARD_TOP_SPACE = 28;
const ROW_HEIGHT = 144;
const BOARD_BOTTOM_SPACE = 146;
const sizePattern = [156, 138, 145, 122, 150, 134, 142];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const ReminderBubbleBoard = memo(function ReminderBubbleBoard({
  reminders,
  loading,
  error,
  burstingReminderId,
  onReminderPress,
}: ReminderBubbleBoardProps) {
  const { width } = useWindowDimensions();
  const boardWidth = Math.max(280, width - 40);
  const visibleReminders = useMemo(
    () => reminders.slice(0, MAX_VISIBLE_BUBBLES),
    [reminders],
  );
  const overflowCount = Math.max(0, reminders.length - visibleReminders.length);
  const visibleItemCount = visibleReminders.length + (overflowCount > 0 ? 1 : 0);
  const rowCount = Math.max(3, Math.ceil(Math.max(visibleItemCount, 1) / 2));
  const boardHeight = rowCount * ROW_HEIGHT + BOARD_BOTTOM_SPACE;
  const bubbleLayouts = useMemo(
    () =>
      visibleReminders.map((reminder, index) => {
        const size = sizePattern[index % sizePattern.length];
        const row = Math.floor(index / 2);
        const isRight = index % 2 === 1;
        const rowShift = row % 2 === 0 ? 0 : 14;
        const rawLeft = isRight
          ? boardWidth - size - BOARD_SIDE_GUTTER - rowShift
          : BOARD_SIDE_GUTTER + rowShift;
        const left = clamp(rawLeft, BOARD_SIDE_GUTTER, boardWidth - size - BOARD_SIDE_GUTTER);
        const top = BOARD_TOP_SPACE + row * ROW_HEIGHT + (isRight ? 24 : 0);

        return {
          reminder,
          index,
          size,
          style: {
            left,
            top,
          },
        };
      }),
    [boardWidth, visibleReminders],
  );
  const overflowBubble = useMemo(() => {
    if (overflowCount === 0) {
      return null;
    }

    const size = 118;
    const index = visibleReminders.length;
    const row = Math.floor(index / 2);
    const isRight = index % 2 === 1;
    const rawLeft = isRight
      ? boardWidth - size - BOARD_SIDE_GUTTER
      : BOARD_SIDE_GUTTER + 10;

    return {
      size,
      left: clamp(rawLeft, BOARD_SIDE_GUTTER, boardWidth - size - BOARD_SIDE_GUTTER),
      top: BOARD_TOP_SPACE + row * ROW_HEIGHT + (isRight ? 22 : 0),
    };
  }, [boardWidth, overflowCount, visibleReminders.length]);

  if (loading) {
    return (
      <View style={[styles.board, styles.center, { minHeight: boardHeight }]}>
        <View style={styles.emptyBubble}>
          <Text style={styles.emptyTitle}>読み込み中</Text>
          <Text style={styles.emptyText}>泡を整えています</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.board, styles.center, { minHeight: boardHeight }]}>
        <View style={styles.emptyBubble}>
          <Text style={styles.emptyTitle}>うまく読めませんでした</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (reminders.length === 0) {
    return (
      <View style={[styles.board, styles.center]}>
        <View style={styles.emptyBubble}>
          <Text style={styles.emptyTitle}>まだ何も浮いていません</Text>
          <Text style={styles.emptyText}>右下の追加ボタンから残せます</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.board, { minHeight: boardHeight }]}>
      {bubbleLayouts.map(({ reminder, index, size, style }) => (
        <ReminderBubble
          key={reminder.id}
          reminder={reminder}
          index={index}
          size={size}
          isBursting={burstingReminderId === reminder.id}
          onPress={onReminderPress}
          style={style}
        />
      ))}
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
    marginTop: 26,
    overflow: 'visible',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 420,
  },
  emptyBubble: {
    width: 210,
    height: 210,
    borderRadius: 105,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    fontSize: 18,
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
