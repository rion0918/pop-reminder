import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isSameDay, isTomorrow, startOfDay } from 'date-fns';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppScreen } from '../../../shared/components/AppScreen';
import { palette } from '../../../constants/colors';
import { useAppSettings } from '../../settings/hooks/useAppSettings';
import { deleteReminder } from '../services/deleteReminderService';
import { listActiveReminders } from '../services/reminderRepository';
import { Reminder } from '../types/reminder';
import { ReminderBubbleBoard } from '../components/ReminderBubbleBoard';
import { ReminderDetailSheet } from '../components/ReminderDetailSheet';

const appIcon = require('../../../../assets/app-icon.png');

type SearchFilter = 'all' | 'today' | 'tomorrow' | 'week';

const filters: { key: SearchFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'today', label: '今日' },
  { key: 'tomorrow', label: '明日' },
  { key: 'week', label: '7日以内' },
];

function isWithinNextWeek(value: string) {
  const target = new Date(value).getTime();
  const now = startOfDay(new Date()).getTime();
  const weekLater = now + 7 * 24 * 60 * 60 * 1000;

  return target >= now && target <= weekLater;
}

function handleBack(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/');
}

function matchesFilter(reminder: Reminder, filter: SearchFilter) {
  const target = new Date(reminder.targetAt);
  const now = new Date();

  if (filter === 'today') {
    return isSameDay(target, now);
  }

  if (filter === 'tomorrow') {
    return isTomorrow(target);
  }

  if (filter === 'week') {
    return isWithinNextWeek(reminder.targetAt);
  }

  return true;
}

export function SearchScreen() {
  const router = useRouter();
  const { settings } = useAppSettings();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await listActiveReminders();
      setReminders(rows);
    } catch (refreshError) {
      console.warn('Failed to search reminders', refreshError);
      setError('リマインダーを読み込めませんでした');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filteredReminders = useMemo(
    () =>
      reminders.filter((reminder) => {
        const matchesText =
          normalizedQuery.length === 0 ||
          reminder.title.toLowerCase().includes(normalizedQuery);

        return matchesText && matchesFilter(reminder, filter);
      }),
    [filter, normalizedQuery, reminders],
  );
  const hasActiveCondition = normalizedQuery.length > 0 || filter !== 'all';
  const resultLabel = hasActiveCondition ? '見つかった泡' : '浮いている泡';

  const resetConditions = useCallback(() => {
    setQuery('');
    setFilter('all');
  }, []);

  const handleDeleteReminder = useCallback(
    async (reminder: Reminder) => {
      try {
        const deleted = await deleteReminder(reminder.id);

        if (!deleted) {
          throw new Error('Reminder was not found');
        }

        setSelectedReminder(null);
        await refresh();
      } catch (deleteError) {
        console.warn('Failed to delete reminder from search', deleteError);
        Alert.alert('削除できませんでした', '時間をおいてもう一度お試しください。');
      }
    },
    [refresh],
  );

  return (
    <AppScreen theme={settings?.theme ?? 'sky'}>
      <View pointerEvents="none" style={styles.ambientLayer}>
        <View style={[styles.ambientBubble, styles.ambientOne]} />
        <View style={[styles.ambientBubble, styles.ambientTwo]} />
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ホームに戻る"
          hitSlop={8}
          onPress={() => handleBack(router)}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>探す</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.hero}>
        <Image source={appIcon} style={styles.heroIcon} />
        <View style={styles.heroCopy}>
          <Text numberOfLines={1} style={styles.kicker}>
            浮かべた泡を探す
          </Text>
          <Text numberOfLines={2} style={styles.title}>
            必要な時に、そっと見つける
          </Text>
        </View>
      </View>

      <View style={[styles.searchBox, isSearchFocused ? styles.searchBoxFocused : null]}>
        <Ionicons name="search-outline" size={19} color={palette.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="タイトルで探す"
          placeholderTextColor="#A6B2CE"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="検索文字を消す"
            hitSlop={8}
            onPress={() => setQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close" size={16} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => {
          const active = item.key === filter;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(item.key)}
              style={({ pressed }) => [
                styles.filterChip,
                active ? styles.filterChipActive : null,
                pressed ? styles.filterChipPressed : null,
              ]}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.resultMeta}>
        <Text numberOfLines={1} style={styles.resultMetaText}>{resultLabel}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={styles.resultMetaSub}
        >
          {filteredReminders.length}件
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.skyDeep} />
          <Text style={styles.centerText}>泡を探しています</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>うまく探せませんでした</Text>
          <Text style={styles.centerText}>{error}</Text>
        </View>
      ) : filteredReminders.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyBubble}>
            <Ionicons name="search-outline" size={30} color={palette.lavenderDeep} />
          </View>
          <Text style={styles.centerTitle}>見つかる泡はありません</Text>
          <Text style={styles.centerText}>
            キーワードや日付を少しゆるめてみてください
          </Text>
          {hasActiveCondition ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="検索条件をリセット"
              onPress={resetConditions}
              style={({ pressed }) => [
                styles.resetButton,
                pressed ? styles.resetButtonPressed : null,
              ]}
            >
              <Ionicons name="refresh" size={16} color={palette.ink} />
              <Text style={styles.resetButtonText}>条件をリセット</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.resultsBoard}>
          <ReminderBubbleBoard
            reminders={filteredReminders}
            idleDisabled={Boolean(selectedReminder)}
            onReminderPress={setSelectedReminder}
          />
        </View>
      )}

      <ReminderDetailSheet
        reminder={selectedReminder}
        onClose={() => setSelectedReminder(null)}
        onDelete={handleDeleteReminder}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  ambientLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  ambientBubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.46)',
  },
  ambientOne: {
    top: 94,
    right: -34,
    width: 118,
    height: 118,
  },
  ambientTwo: {
    left: -26,
    bottom: 120,
    width: 74,
    height: 74,
    backgroundColor: 'rgba(237,230,255,0.22)',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  headerSpacer: {
    width: 44,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 20,
    marginBottom: 20,
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 20,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    marginTop: 4,
  },
  searchBox: {
    minHeight: 52,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
  },
  searchBoxFocused: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(168,145,245,0.48)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 12,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FC',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    flex: 1,
    minHeight: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: palette.line,
  },
  filterChipActive: {
    backgroundColor: palette.lavenderDeep,
    borderColor: palette.lavenderDeep,
  },
  filterChipPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  filterText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: palette.white,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  resultMetaText: {
    flex: 1,
    minWidth: 0,
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  resultMetaSub: {
    flexShrink: 0,
    minWidth: 42,
    maxWidth: '34%',
    minHeight: 28,
    borderRadius: 14,
    overflow: 'hidden',
    color: palette.lavenderDeep,
    fontSize: 12,
    fontWeight: '900',
    includeFontPadding: false,
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingTop: 6,
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  resultsBoard: {
    flex: 1,
    marginBottom: 12,
    overflow: 'visible',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyState: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.68)',
  },
  resetButton: {
    minHeight: 42,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(216,204,255,0.72)',
  },
  resetButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  resetButtonText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  centerTitle: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  centerText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
});
