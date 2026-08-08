import { memo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { bubbleDueColors, palette } from '../../../constants/colors';

type ReminderSelectionBarProps = {
  selectedCount: number;
  allSelected: boolean;
  busy: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  onToggleAll: () => void;
  onDelete: () => void;
};

const SELECTION_BAR_SPRING = {
  damping: 32,
  stiffness: 280,
  mass: 0.9,
  overshootClamping: true,
} as const;

export const ReminderSelectionBar = memo(function ReminderSelectionBar({
  selectedCount,
  allSelected,
  busy,
  compact,
  style,
  onToggleAll,
  onDelete,
}: ReminderSelectionBarProps) {
  const reduceMotion = useReducedMotion();
  const revealProgress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    revealProgress.value = reduceMotion ? 1 : withSpring(1, SELECTION_BAR_SPRING);
  }, [reduceMotion, revealProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
    transform: [
      { translateY: (1 - revealProgress.value) * 10 },
      { scale: 0.98 + revealProgress.value * 0.02 },
    ],
  }));
  const deleteButtonLabel = busy
    ? compact
      ? '処理中'
      : '削除中…'
    : compact
      ? '削除'
      : `${selectedCount}件を削除`;

  return (
    <Animated.View
      style={[styles.container, compact ? styles.containerCompact : null, style, animatedStyle]}
    >
      <View style={[styles.selectionCount, compact ? styles.selectionCountCompact : null]}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={styles.selectionCountText}
        >
          {selectedCount}件選択中
        </Text>
      </View>

      <View style={[styles.actionGroup, compact ? styles.actionGroupCompact : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={allSelected ? '選択解除' : 'すべて選択'}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          hitSlop={4}
          onPress={onToggleAll}
          style={({ pressed }) => [
            styles.action,
            styles.toggleAction,
            compact ? styles.toggleActionCompact : null,
            pressed ? styles.actionPressed : null,
            busy ? styles.actionDisabled : null,
          ]}
        >
          <Text numberOfLines={1} style={styles.toggleLabel}>
            {allSelected ? '選択解除' : 'すべて選択'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={busy ? `${selectedCount}件を削除中` : `${selectedCount}件を削除`}
          accessibilityState={{ disabled: selectedCount === 0 || busy }}
          disabled={selectedCount === 0 || busy}
          hitSlop={4}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.action,
            styles.deleteAction,
            compact ? styles.deleteActionCompact : null,
            pressed ? styles.actionPressed : null,
            selectedCount === 0 || busy ? styles.actionDisabled : null,
          ]}
        >
          <View style={styles.deleteIconSlot}>
            {busy ? (
              <ActivityIndicator size="small" color={bubbleDueColors.today.accent} />
            ) : (
              <Ionicons name="trash-outline" size={17} color={bubbleDueColors.today.accent} />
            )}
          </View>
          <Text numberOfLines={1} style={styles.deleteLabel}>
            {deleteButtonLabel}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    backgroundColor: 'rgba(255,255,255,0.86)',
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 5,
  },
  containerCompact: {
    gap: 4,
    padding: 5,
  },
  selectionCount: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  selectionCountCompact: {
    paddingHorizontal: 4,
  },
  selectionCountText: {
    color: palette.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'left',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  actionGroupCompact: {
    gap: 4,
  },
  action: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  toggleAction: {
    minWidth: 88,
    backgroundColor: 'rgba(237,229,255,0.76)',
  },
  toggleActionCompact: {
    minWidth: 82,
    paddingHorizontal: 7,
  },
  deleteAction: {
    minWidth: 118,
    flexDirection: 'row',
    gap: 5,
    borderWidth: 1,
    borderColor: bubbleDueColors.today.border,
    backgroundColor: 'rgba(248,113,113,0.14)',
  },
  deleteActionCompact: {
    minWidth: 82,
    paddingHorizontal: 7,
  },
  deleteIconSlot: {
    width: 18,
    height: 18,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.96 }],
  },
  actionDisabled: {
    opacity: 0.42,
  },
  toggleLabel: {
    color: palette.lavenderDeep,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  deleteLabel: {
    minWidth: 0,
    color: bubbleDueColors.today.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
});
