import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { useAppSettingsQuery as useAppSettings } from '../../settings/presentation/useAppSettingsQuery';
import { useRemindersQuery as useReminders } from '../presentation/useRemindersQuery';
import type { Reminder } from '../types/reminder';
import { filterReminders, type SearchFilter } from '../domain/reminderFilter';
import { ReminderBubbleBoard } from '../components/ReminderBubbleBoard';
import { ReminderDetailSheet } from '../components/ReminderDetailSheet';

const appIcon = require('../../../../assets/app-icon.png');

const filters: { key: SearchFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'today', label: '今日' },
  { key: 'tomorrow', label: '明日' },
  { key: 'week', label: '7日以内' },
];

function handleBack(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/');
}

export function SearchScreen() {
  const router = useRouter();
  const { settings } = useAppSettings();
  const {
    reminders,
    loading,
    error,
    refresh,
    deleteReminder,
    updateReminderTitle,
    updateReminderTargetTime,
  } = useReminders();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const selectedReminder = reminders.find((reminder) => reminder.id === selectedReminderId) ?? null;

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filteredReminders = useMemo(
    () => filterReminders(reminders, query, filter),
    [filter, query, reminders],
  );
  const hasActiveCondition = query.trim().length > 0 || filter !== 'all';
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

        setSelectedReminderId(null);
      } catch (deleteError) {
        console.warn('Failed to delete reminder from search', deleteError);
        Alert.alert('削除できませんでした', '時間をおいてもう一度お試しください。');
      }
    },
    [deleteReminder],
  );

  const handleUpdateReminderTitle = useCallback(
    async (reminder: Reminder, title: string) => {
      const updatedReminder = await updateReminderTitle(reminder.id, title);

      if (!updatedReminder) {
        throw new Error('Reminder was not found');
      }

      return updatedReminder;
    },
    [updateReminderTitle],
  );

  const handleUpdateReminderTargetTime = useCallback(
    async (reminder: Reminder, targetTime: string) => {
      const result = await updateReminderTargetTime(reminder.id, targetTime);

      if (!result) {
        throw new Error('Reminder was not found');
      }

      return result;
    },
    [updateReminderTargetTime],
  );

  return (
    <AppScreen theme={settings?.theme ?? 'sky'}>
      <View pointerEvents="none" className="absolute inset-0">
        <View
          className="absolute rounded-full border border-[rgba(255,255,255,0.46)] bg-[rgba(255,255,255,0.22)]"
          style={styles.ambientOne}
        />
        <View
          className="absolute rounded-full border border-[rgba(255,255,255,0.46)] bg-[rgba(237,230,255,0.22)]"
          style={styles.ambientTwo}
        />
      </View>

      <View className="h-[52px] flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ホームに戻る"
          hitSlop={8}
          onPress={() => handleBack(router)}
          className="h-[44px] w-[44px] items-center justify-center rounded-[22px] border border-[rgba(255,255,255,0.90)] bg-[rgba(255,255,255,0.78)]"
        >
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </Pressable>
        <Text className="text-[18px] font-black text-app-ink">探す</Text>
        <View className="w-[44px]" />
      </View>

      <View className="mb-[20px] mt-[20px] flex-row items-center gap-[14px]">
        <Image source={appIcon} className="h-[76px] w-[76px] rounded-[20px]" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[13px] font-extrabold text-app-muted">
            浮かべた泡を探す
          </Text>
          <Text
            className="mt-[4px] text-[24px] font-black leading-[31px] text-app-ink"
            numberOfLines={2}
          >
            必要な時に、そっと見つける
          </Text>
        </View>
      </View>

      <View
        className={`min-h-[52px] flex-row items-center gap-[10px] rounded-[22px] border px-[16px] ${
          isSearchFocused
            ? 'border-[rgba(168,145,245,0.48)] bg-[rgba(255,255,255,0.96)]'
            : 'border-[rgba(255,255,255,0.96)] bg-[rgba(255,255,255,0.84)]'
        }`}
        style={isSearchFocused ? styles.searchBoxFocused : null}
      >
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
          className="min-w-0 flex-1 py-[12px] text-[16px] font-extrabold text-app-ink"
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="検索文字を消す"
            hitSlop={8}
            onPress={() => setQuery('')}
            className="h-[28px] w-[28px] items-center justify-center rounded-[14px] bg-[#F3F6FC]"
          >
            <Ionicons name="close" size={16} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>

      <View className="mt-[12px] flex-row gap-[8px]">
        {filters.map((item) => {
          const active = item.key === filter;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(item.key)}
              className={`min-h-[38px] flex-1 items-center justify-center rounded-[19px] border px-[10px] ${
                active
                  ? 'border-app-lavender-deep bg-app-lavender-deep'
                  : 'border-app-line bg-[rgba(255,255,255,0.62)]'
              }`}
              style={({ pressed }) => [pressed ? styles.filterChipPressed : null]}
            >
              <Text
                className={`text-[12px] font-black ${active ? 'text-app-white' : 'text-app-ink'}`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mb-[8px] mt-[18px] flex-row items-center justify-between">
        <Text numberOfLines={1} className="min-w-0 flex-1 text-[14px] font-black text-app-ink">
          {resultLabel}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          className="min-h-[28px] min-w-[42px] max-w-[34%] shrink-0 overflow-hidden rounded-[14px] bg-[rgba(255,255,255,0.68)] px-[10px] pt-[6px] text-center text-[12px] font-black text-app-lavender-deep"
          style={styles.noFontPadding}
        >
          {filteredReminders.length}件
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center px-[28px]">
          <ActivityIndicator color={palette.skyDeep} />
          <Text className="mt-[8px] text-center text-[13px] font-extrabold leading-[19px] text-app-muted">
            泡を探しています
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-[28px]">
          <Text className="text-center text-[17px] font-black leading-[24px] text-app-ink">
            うまく探せませんでした
          </Text>
          <Text className="mt-[8px] text-center text-[13px] font-extrabold leading-[19px] text-app-muted">
            {error}
          </Text>
        </View>
      ) : filteredReminders.length === 0 ? (
        <View className="min-h-[260px] flex-1 items-center justify-center px-[30px]">
          <View className="mb-[18px] h-[72px] w-[72px] items-center justify-center rounded-[36px] border-2 border-[rgba(255,255,255,0.68)] bg-[rgba(255,255,255,0.40)]">
            <Ionicons name="search-outline" size={30} color={palette.lavenderDeep} />
          </View>
          <Text className="text-center text-[17px] font-black leading-[24px] text-app-ink">
            見つかる泡はありません
          </Text>
          <Text className="mt-[8px] text-center text-[13px] font-extrabold leading-[19px] text-app-muted">
            キーワードや日付を少しゆるめてみてください
          </Text>
          {hasActiveCondition ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="検索条件をリセット"
              onPress={resetConditions}
              className="mt-[18px] min-h-[42px] flex-row items-center justify-center gap-[7px] rounded-[21px] border border-[rgba(216,204,255,0.72)] bg-[rgba(255,255,255,0.72)] px-[16px]"
              style={({ pressed }) => [pressed ? styles.resetButtonPressed : null]}
            >
              <Ionicons name="refresh" size={16} color={palette.ink} />
              <Text className="text-[13px] font-black text-app-ink">条件をリセット</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View className="mb-[12px] flex-1 overflow-visible">
          <ReminderBubbleBoard
            reminders={filteredReminders}
            idleDisabled={Boolean(selectedReminder)}
            onReminderPress={(reminder) => setSelectedReminderId(reminder.id)}
          />
        </View>
      )}

      <ReminderDetailSheet
        reminder={selectedReminder}
        onClose={(closedReminderId) =>
          setSelectedReminderId((current) => (current === closedReminderId ? null : current))
        }
        onDelete={handleDeleteReminder}
        onUpdateTitle={handleUpdateReminderTitle}
        onUpdateTargetTime={handleUpdateReminderTargetTime}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
  },
  searchBoxFocused: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  filterChipPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  noFontPadding: {
    includeFontPadding: false,
  },
  resetButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
});
