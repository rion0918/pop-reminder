import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '../../../shared/components/AppScreen';
import { palette } from '../../../constants/colors';
import { useAppSettings } from '../../settings/hooks/useAppSettings';
import { ReminderDetailSheet } from '../components/ReminderDetailSheet';
import { deleteReminder } from '../services/deleteReminderService';
import { listActiveReminders } from '../services/reminderRepository';
import { Reminder } from '../types/reminder';
import { formatReminderDateTime } from '../utils/reminderDateFormat';
import { getMsUntilNextDay, getReminderDueColor } from '../utils/reminderDueColor';

function handleBack(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/');
}

export function ReminderListScreen() {
  const router = useRouter();
  const { settings } = useAppSettings();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [colorReferenceDate, setColorReferenceDate] = useState(() => new Date());

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const rows = await listActiveReminders();
      setReminders(rows);
    } catch (refreshError) {
      console.warn('Failed to load reminder list', refreshError);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setColorReferenceDate(new Date());
    }, getMsUntilNextDay());

    return () => clearTimeout(timer);
  }, [colorReferenceDate]);

  const handleDeleteReminder = useCallback(
    async (reminder: Reminder) => {
      try {
        const deleted = await deleteReminder(reminder.id);

        if (!deleted) {
          throw new Error('Reminder was not found');
        }

        setSelectedReminder(null);
        setReminders((current) => current.filter((item) => item.id !== reminder.id));
        await refresh({ silent: true });
      } catch (deleteError) {
        console.warn('Failed to delete reminder from list', deleteError);
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
        <Text style={styles.headerTitle}>すべての泡</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summary}>
        <View>
          <Text style={styles.kicker}>表示中の7個も含めて</Text>
          <Text style={styles.title}>リマインドを一覧で見る</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{reminders.length}件</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.skyDeep} />
          <Text style={styles.centerText}>泡を並べています</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>うまく読めませんでした</Text>
          <Text style={styles.centerText}>{error}</Text>
        </View>
      ) : reminders.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyBubble}>
            <Ionicons name="ellipse-outline" size={30} color={palette.lavenderDeep} />
          </View>
          <Text style={styles.centerTitle}>浮いている泡はありません</Text>
          <Text style={styles.centerText}>ホームからふわっと追加しましょう</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {reminders.map((reminder) => {
            const dueColor = getReminderDueColor(reminder.targetAt, colorReferenceDate);

            return (
              <Pressable
                key={reminder.id}
                accessibilityRole="button"
                accessibilityLabel={`${reminder.title}の詳細を開く`}
                onPress={() => setSelectedReminder(reminder)}
                style={({ pressed }) => [
                  styles.listItem,
                  pressed ? styles.listItemPressed : null,
                ]}
              >
                <View
                  style={[
                    styles.indexBubble,
                    {
                      backgroundColor: dueColor.background,
                      borderColor: dueColor.border,
                    },
                  ]}
                >
                  <View style={styles.indexBubbleHighlight} />
                </View>
                <View style={styles.listCopy}>
                  <Text numberOfLines={1} style={styles.listTitle}>
                    {reminder.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.listTime}>
                    {formatReminderDateTime(reminder.targetAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </Pressable>
            );
          })}
        </ScrollView>
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
    top: 96,
    right: -28,
    width: 112,
    height: 112,
  },
  ambientTwo: {
    left: -24,
    bottom: 118,
    width: 76,
    height: 76,
    backgroundColor: 'rgba(237,230,255,0.22)',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  headerSpacer: {
    width: 44,
  },
  summary: {
    minHeight: 94,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 18,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.86)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  kicker: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: palette.ink,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 5,
  },
  countPill: {
    minWidth: 58,
    minHeight: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(237,230,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.86)',
  },
  countText: {
    color: palette.lavenderDeep,
    fontSize: 14,
    fontWeight: '900',
  },
  listContent: {
    paddingBottom: 34,
  },
  listItem: {
    minHeight: 72,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  listItemPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  indexBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(237,230,255,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    overflow: 'hidden',
  },
  indexBubbleHighlight: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 14,
    height: 8,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.64)',
    transform: [{ rotate: '-28deg' }],
  },
  listCopy: {
    flex: 1,
    minWidth: 0,
  },
  listTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  listTime: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
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
