import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
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
import {
  getReminderBubbleDimensions,
  getReminderTitleVisualLength,
} from '../utils/reminderBubbleVisuals';
import { getMsUntilNextDay } from '../utils/reminderDueColor';
import { EmptyReminderBubble } from './EmptyReminderBubble';
import { ReminderBubble, type BubbleDeleteMotionPhase } from './ReminderBubble';
import {
  REMINDER_BUBBLE_PRESS_SCALE,
  REMINDER_BUBBLE_PRESS_SPRING,
} from './reminderBubblePressMotion';
import {
  getTemporalYRatio,
  makeGridSlots,
  makeFittingBubbleLayout,
  makeLayoutForItem,
  resolveBoardSizeMeasurement,
  type BoardSize,
  type BubbleVerticalLayoutMode,
} from './reminderBubbleLayout';

export { getTemporalYRatio, makeGridSlots, makeLayoutForItem };

export type BubbleDeleteMotion = {
  reminderId: string;
  phase: BubbleDeleteMotionPhase;
  delayMs?: number;
  hapticsEnabled?: boolean;
};

type ReminderBubbleBoardProps = {
  reminders: Reminder[];
  loading?: boolean;
  error?: string | null;
  selectedReminderId?: string | null;
  selectedReminderIds?: ReadonlySet<string>;
  selectionMode?: boolean;
  deleteMotion?: BubbleDeleteMotion | null;
  deleteMotions?: readonly BubbleDeleteMotion[];
  freezeLayout?: boolean;
  idleDisabled?: boolean;
  interactionDisabled?: boolean;
  onReminderPress?: (reminder: Reminder) => void;
  onReminderLongPress?: (reminder: Reminder) => void;
  onDeleteMotionComplete?: (reminderId: string, phase: BubbleDeleteMotionPhase) => void;
  onOverflowPress?: () => void;
  onEmptyPress?: () => void;
  emptyDisabled?: boolean;
  verticalLayoutMode?: BubbleVerticalLayoutMode;
  onVisibleReminderIdsChange?: (ids: string[]) => void;
};

const EMPTY_HEADLINE_BLOCK_HEIGHT = 31 * 2 + 32;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

type SelectedBoardLayout = {
  bubbleLayouts: BubbleLayout[];
  overflowBubble: { size: number; left: number; top: number } | null;
  overflowCount: number;
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

function getBubbleDimensions(reminder: Reminder, boardSize: BoardSize): BubbleDimensions {
  return getReminderBubbleDimensions(
    getReminderTitleVisualLength(reminder.title),
    boardSize.width,
    boardSize.height,
  );
}

function selectVisibleReminders(
  reminders: Reminder[],
  boardSize: BoardSize,
  verticalLayoutMode: BubbleVerticalLayoutMode,
) {
  if (boardSize.width === 0 || boardSize.height === 0) {
    return { bubbleLayouts: [], overflowBubble: null, overflowCount: 0 };
  }
  const candidates = reminders.slice(0, 12).map((reminder) => ({
    id: reminder.id,
    dimensions: getBubbleDimensions(reminder, boardSize),
  }));
  for (let count = candidates.length; count >= 0; count -= 1) {
    const items = candidates.slice(0, count);
    const overflowCount = reminders.length - count;
    const isDenseOverflow = count >= 10;
    const overflowSize = Math.round(
      clamp(
        boardSize.width * (isDenseOverflow ? 0.24 : 0.29),
        isDenseOverflow ? 82 : 96,
        isDenseOverflow ? 98 : 112,
      ),
    );
    if (overflowCount > 0) {
      items.push({
        id: `overflow-${overflowCount}`,
        dimensions: { width: overflowSize, height: overflowSize, collisionSize: overflowSize },
      });
    }
    const layouts = makeFittingBubbleLayout(items, boardSize, verticalLayoutMode);
    if (!layouts) continue;
    const bubbleLayouts: BubbleLayout[] = candidates
      .slice(0, count)
      .map(({ id, dimensions }, index) => ({
        id,
        reminder: reminders[index],
        visualIndex: getStableVisualIndex(id),
        size: dimensions.height,
        width: dimensions.width,
        height: dimensions.height,
        ...layouts[index],
        positionStyle: { left: layouts[index].left, top: layouts[index].top },
      }));
    return {
      bubbleLayouts,
      overflowBubble: overflowCount > 0 ? { size: overflowSize, ...layouts[count] } : null,
      overflowCount,
    };
  }
  return { bubbleLayouts: [], overflowBubble: null, overflowCount: reminders.length };
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

const REMINDER_BUBBLE_LAYOUT_SPRING = {
  damping: 28,
  stiffness: 240,
  mass: 0.8,
  overshootClamping: true,
} as const;

function useBubblePositionStyle(left: number, top: number) {
  const reduceMotion = useReducedMotion();
  const positionLeft = useSharedValue(left);
  const positionTop = useSharedValue(top);

  useEffect(() => {
    cancelAnimation(positionLeft);
    cancelAnimation(positionTop);

    if (reduceMotion) {
      positionLeft.value = left;
      positionTop.value = top;
      return;
    }

    positionLeft.value = withSpring(left, REMINDER_BUBBLE_LAYOUT_SPRING);
    positionTop.value = withSpring(top, REMINDER_BUBBLE_LAYOUT_SPRING);

    return () => {
      cancelAnimation(positionLeft);
      cancelAnimation(positionTop);
    };
  }, [left, positionLeft, positionTop, reduceMotion, top]);

  return useAnimatedStyle(
    () => ({
      left: reduceMotion ? left : positionLeft.value,
      top: reduceMotion ? top : positionTop.value,
    }),
    [left, reduceMotion, top],
  );
}

type PositionedReminderBubbleProps = ComponentProps<typeof ReminderBubble> & {
  left: number;
  top: number;
};

const PositionedReminderBubble = memo(function PositionedReminderBubble({
  left,
  top,
  width,
  height,
  size,
  ...props
}: PositionedReminderBubbleProps) {
  const positionStyle = useBubblePositionStyle(left, top);
  const bubbleWidth = width ?? size;
  const bubbleHeight = height ?? size;

  return (
    <Animated.View
      style={[styles.positionedBubble, { width: bubbleWidth, height: bubbleHeight }, positionStyle]}
    >
      <ReminderBubble
        {...props}
        size={size}
        width={width}
        height={height}
        style={styles.positionedBubbleContent}
      />
    </Animated.View>
  );
});

const OverflowBubble = memo(function OverflowBubble({
  count,
  size,
  left,
  top,
  disabled,
  onPress,
}: OverflowBubbleProps) {
  const reduceMotion = useReducedMotion();
  const positionStyle = useBubblePositionStyle(left, top);
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
        positionStyle,
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
  selectedReminderIds,
  selectionMode,
  deleteMotion,
  deleteMotions,
  freezeLayout,
  idleDisabled,
  interactionDisabled,
  onReminderPress,
  onDeleteMotionComplete,
  onReminderLongPress,
  onOverflowPress,
  onEmptyPress,
  emptyDisabled,
  verticalLayoutMode = 'natural',
  onVisibleReminderIdsChange,
}: ReminderBubbleBoardProps) {
  const boardContentMode = !loading && !error && reminders.length === 0 ? 'empty' : 'populated';
  const [boardSize, setBoardSize] = useState<BoardSize>({ width: 0, height: 0 });
  const [colorReferenceDate, setColorReferenceDate] = useState(() => new Date());
  const lastMeasuredContentModeRef = useRef(boardContentMode);
  const calculatedBoardLayout = useMemo(
    () => selectVisibleReminders(reminders, boardSize, verticalLayoutMode),
    [boardSize, reminders, verticalLayoutMode],
  );
  const frozenBoardLayoutRef = useRef<SelectedBoardLayout>(calculatedBoardLayout);
  const hasCommittedBoardLayoutRef = useRef(false);
  const boardLayout =
    freezeLayout && hasCommittedBoardLayoutRef.current
      ? frozenBoardLayoutRef.current
      : calculatedBoardLayout;
  useEffect(() => {
    const boardHasMeasuredSize = boardSize.width > 0 && boardSize.height > 0;

    if (boardHasMeasuredSize && (!freezeLayout || !hasCommittedBoardLayoutRef.current)) {
      frozenBoardLayoutRef.current = calculatedBoardLayout;
      hasCommittedBoardLayoutRef.current = true;
    }
  }, [boardSize.height, boardSize.width, calculatedBoardLayout, freezeLayout]);
  const { bubbleLayouts, overflowBubble } = boardLayout;
  const visibleReminders = useMemo(
    () => bubbleLayouts.map(({ reminder }) => reminder),
    [bubbleLayouts],
  );
  const { overflowCount } = boardLayout;
  useEffect(() => {
    onVisibleReminderIdsChange?.(visibleReminders.map((reminder) => reminder.id));
  }, [onVisibleReminderIdsChange, visibleReminders]);
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
    <View testID="reminder-bubble-board" onLayout={handleBoardLayout} style={styles.board}>
      {boardReady
        ? bubbleLayouts.map(({ reminder, visualIndex, size, width, height, left, top }) => {
            const isMultiSelected = selectedReminderIds?.has(reminder.id) ?? false;
            const activeDeleteMotion =
              deleteMotions?.find((motion) => motion.reminderId === reminder.id) ??
              (deleteMotion?.reminderId === reminder.id ? deleteMotion : undefined);

            return (
              <PositionedReminderBubble
                key={reminder.id}
                reminder={reminder}
                index={visualIndex}
                size={size}
                width={width}
                height={height}
                currentDate={colorReferenceDate}
                compactDateLabel={verticalLayoutMode === 'homeTimeline'}
                isSelected={selectedReminderId === reminder.id || isMultiSelected}
                selectionMode={selectionMode}
                isMultiSelected={isMultiSelected}
                deleteMotionPhase={activeDeleteMotion?.phase}
                deleteMotionDelayMs={activeDeleteMotion?.delayMs}
                deleteMotionHapticsEnabled={activeDeleteMotion?.hapticsEnabled}
                idleDisabled={idleDisabled || Boolean(activeDeleteMotion)}
                interactionDisabled={interactionDisabled}
                onPress={onReminderPress}
                onLongPress={onReminderLongPress}
                onDeleteMotionComplete={onDeleteMotionComplete}
                left={left}
                top={top}
              />
            );
          })
        : null}
      {boardReady && overflowCount > 0 && !overflowBubble ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`ほか${overflowCount}件のリマインダーを一覧で開く`}
          disabled={Boolean(selectionMode) || !onOverflowPress}
          onPress={onOverflowPress}
          style={styles.center}
        >
          <Text style={styles.emptyText}>一覧で{overflowCount}件を見る</Text>
        </Pressable>
      ) : null}
      {overflowBubble ? (
        <OverflowBubble
          count={overflowCount}
          disabled={Boolean(selectionMode) || !onOverflowPress}
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
  positionedBubble: {
    position: 'absolute',
  },
  positionedBubbleContent: {
    left: 0,
    top: 0,
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
