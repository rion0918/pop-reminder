import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  BackHandler,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ReminderBubbleBoard } from "../components/ReminderBubbleBoard";
import { ReminderDetailSheet } from "../components/ReminderDetailSheet";
import { ReminderInputSheet } from "../components/ReminderInputSheet";
import { useReminders } from "../hooks/useReminders";
import { createReminder } from "../services/createReminderService";
import { deleteReminder } from "../services/deleteReminderService";
import { useNotificationDevStore } from "../stores/notificationDevStore";
import {
  selectFormattedTime,
  useReminderUiStore,
} from "../stores/reminderUiStore";
import { Reminder } from "../types/reminder";
import { useAppSettings } from "../../settings/hooks/useAppSettings";
import { AppScreen } from "../../../shared/components/AppScreen";
import { bubbleDueColors, palette } from "../../../constants/colors";
import { formatReminderBubbleDateTime } from "../utils/reminderDateFormat";

const appIcon = require("../../../../assets/app-icon.png");
const SETTINGS_BUTTON_FEEDBACK_MS = 120;
const dueLegendItems = [
  { label: "今日", color: bubbleDueColors.today },
  { label: "明日", color: bubbleDueColors.tomorrow },
  { label: "2-3日", color: bubbleDueColors.soon },
  { label: "4日+", color: bubbleDueColors.later },
];

export function HomeScreen() {
  const router = useRouter();
  const { reminders, loading, error, refresh, upsertReminder } = useReminders();
  const isQuickAddOpen = useReminderUiStore((state) => state.isQuickAddOpen);
  const openQuickAdd = useReminderUiStore((state) => state.openQuickAdd);
  const closeQuickAdd = useReminderUiStore((state) => state.closeQuickAdd);
  const dateOffset = useReminderUiStore((state) => state.dateOffset);
  const customTargetDate = useReminderUiStore(
    (state) => state.customTargetDate,
  );
  const targetTime = useReminderUiStore(selectFormattedTime);
  const isSaving = useReminderUiStore((state) => state.isSaving);
  const setSaving = useReminderUiStore((state) => state.setSaving);
  const isNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.isNotificationTestModeEnabled,
  );
  const { settings } = useAppSettings();
  const isQuickAddOpenRef = useRef(false);
  const isSavingRef = useRef(false);
  const selectedReminderRef = useRef<Reminder | null>(null);
  const deleteTimeoutRef = useRef<number | null>(null);
  const settingsPressTimeoutRef = useRef<number | null>(null);
  const [isSettingsButtonPressed, setIsSettingsButtonPressed] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(
    null,
  );
  const [burstingReminderId, setBurstingReminderId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    isQuickAddOpenRef.current = isQuickAddOpen;
  }, [isQuickAddOpen]);

  useEffect(() => {
    selectedReminderRef.current = selectedReminder;
  }, [selectedReminder]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }

      if (settingsPressTimeoutRef.current) {
        clearTimeout(settingsPressTimeoutRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }

      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (selectedReminderRef.current) {
          setSelectedReminder(null);
          return true;
        }

        if (isQuickAddOpenRef.current) {
          closeQuickAdd();
          return true;
        }

        return false;
      });

      return () => {
        subscription.remove();
      };
    }, [closeQuickAdd]),
  );

  const handleSave = async (title: string) => {
    if (isSavingRef.current) {
      throw new Error("Reminder save is already in progress");
    }

    isSavingRef.current = true;
    setSaving(true);

    try {
      const reminder = await createReminder(
        {
          title,
          dateOffset,
          customTargetDate,
          targetTime,
        },
        {
          useTestNotifications: __DEV__ && isNotificationTestModeEnabled,
        },
      );
      upsertReminder(reminder);
      void refresh({ silent: true });
    } catch (saveError) {
      console.warn("Failed to save reminder", saveError);
      Alert.alert("追加できませんでした", "タイトルと時刻を確認してください。");
      throw saveError;
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  const handlePressAdd = useCallback(() => {
    if (isQuickAddOpenRef.current || isSaving) {
      return;
    }

    isQuickAddOpenRef.current = true;
    openQuickAdd("08:00");
  }, [isSaving, openQuickAdd]);

  const handleOpenReminderList = useCallback(() => {
    router.push("/reminders-list");
  }, [router]);

  const handlePressSettings = useCallback(() => {
    if (settingsPressTimeoutRef.current) {
      clearTimeout(settingsPressTimeoutRef.current);
    }

    setIsSettingsButtonPressed(true);
    settingsPressTimeoutRef.current = setTimeout(() => {
      setIsSettingsButtonPressed(false);
      settingsPressTimeoutRef.current = null;
      router.push("/settings");
    }, SETTINGS_BUTTON_FEEDBACK_MS) as unknown as number;
  }, [router]);

  const handleDeleteReminder = useCallback(
    async (reminder: Reminder) => {
      setBurstingReminderId(reminder.id);
      await new Promise((resolve) => {
        deleteTimeoutRef.current = setTimeout(
          resolve,
          260,
        ) as unknown as number;
      });

      try {
        const deleted = await deleteReminder(reminder.id);

        if (!deleted) {
          throw new Error("Reminder was not found");
        }

        await refresh();
      } catch (err) {
        console.warn("Failed to delete reminder", err);
      } finally {
        setBurstingReminderId(null);
        deleteTimeoutRef.current = null;
      }
    },
    [refresh],
  );

  const isAddButtonDisabled = isSaving;
  const isBubbleIdleDisabled =
    isSaving ||
    Boolean(selectedReminder) ||
    Boolean(burstingReminderId);
  const nextReminderLabel = reminders[0]
    ? formatReminderBubbleDateTime(reminders[0].targetAt)
    : "完璧！";
  const nextReminderTitle =
    reminders[0]?.title ?? "忘れたくないことはありません";

  return (
    <AppScreen theme={settings?.theme ?? "sky"}>
      <View pointerEvents="none" style={styles.ambientLayer}>
        <View style={[styles.ambientBubble, styles.ambientOne]} />
        <View style={[styles.ambientBubble, styles.ambientTwo]} />
        <View style={[styles.ambientBubble, styles.ambientThree]} />
      </View>

      <View style={styles.header}>
        <View style={styles.brandBlock}>
          <Image source={appIcon} style={styles.brandIcon} />
          <View style={styles.brandCopy}>
            <Text numberOfLines={1} style={styles.kicker}>
              ポップ・リマインダー
            </Text>
            <Text numberOfLines={1} style={styles.title}>
              ふわっと残す
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="設定を開く"
            hitSlop={8}
            onPress={handlePressSettings}
            style={({ pressed }) => [
              styles.iconButton,
              pressed || isSettingsButtonPressed ? styles.iconButtonPressed : null,
            ]}
          >
            <Ionicons name="settings-outline" size={22} color={palette.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusPill, styles.nextPill]}>
          <Ionicons
            name="time-outline"
            size={15}
            color={palette.lavenderDeep}
          />
          <Text numberOfLines={1} style={styles.statusLabel}>
            次
          </Text>
          <View style={styles.nextCopy}>
            <Text numberOfLines={1} style={styles.nextTitle}>
              {nextReminderTitle}
            </Text>
            <Text numberOfLines={1} style={styles.nextValue}>
              {nextReminderLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bubbleArea}>
        <ReminderBubbleBoard
          reminders={reminders}
          loading={loading}
          error={error}
          burstingReminderId={burstingReminderId}
          idleDisabled={isBubbleIdleDisabled}
          onReminderPress={setSelectedReminder}
          onOverflowPress={handleOpenReminderList}
        />
      </View>

      <ReminderInputSheet defaultTargetTime="08:00" onSave={handleSave} />

      <ReminderDetailSheet
        reminder={selectedReminder}
        onClose={() => setSelectedReminder(null)}
        onDelete={handleDeleteReminder}
      />

      <View
        accessibilityLabel="シャボン玉の色。今日、明日、2から3日後、4日以上先"
        accessibilityRole="text"
        style={styles.dueLegend}
      >
        {dueLegendItems.map((item) => (
          <View key={item.label} style={styles.dueLegendItem}>
            <View
              style={[
                styles.dueLegendBubble,
                {
                  backgroundColor: item.color.background,
                  borderColor: item.color.border,
                },
              ]}
            />
            <Text numberOfLines={1} style={styles.dueLegendLabel}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="リマインダーを追加"
        accessibilityState={{ disabled: isAddButtonDisabled }}
        disabled={isAddButtonDisabled}
        hitSlop={8}
        onPress={handlePressAdd}
        style={({ pressed }) => [
          styles.addButton,
          pressed && !isAddButtonDisabled ? styles.addButtonPressed : null,
          isAddButtonDisabled ? styles.addButtonDisabled : null,
        ]}
      >
        <Ionicons name="add" size={26} color={palette.white} />
        <Text style={styles.addButtonText}>追加</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  ambientLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  ambientBubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
  },
  ambientOne: {
    top: 116,
    right: -28,
    width: 108,
    height: 108,
  },
  ambientTwo: {
    top: 270,
    left: -32,
    width: 76,
    height: 76,
    backgroundColor: "rgba(237,230,255,0.2)",
  },
  ambientThree: {
    right: 54,
    bottom: 132,
    width: 42,
    height: 42,
    backgroundColor: "rgba(220,248,236,0.2)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    flexShrink: 0,
  },
  brandBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  iconButtonPressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }, { scale: 0.94 }],
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    flexShrink: 0,
  },
  statusPill: {
    minHeight: 54,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  nextPill: {
    flex: 1,
    minWidth: 0,
  },
  statusLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  statusValue: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  nextCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nextTitle: {
    flex: 1,
    minWidth: 0,
    color: palette.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  nextValue: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  bubbleArea: {
    flex: 1,
    marginTop: 14,
    marginBottom: 104,
    overflow: "visible",
  },
  dueLegend: {
    position: "absolute",
    left: 24,
    right: 136,
    bottom: 34,
    minHeight: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.66)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.86)",
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 1,
  },
  dueLegendItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dueLegendBubble: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.4,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  dueLegendLabel: {
    color: palette.muted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  addButton: {
    position: "absolute",
    right: 24,
    bottom: 28,
    minWidth: 98,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 22,
    backgroundColor: palette.skyDeep,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 6,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 2 }, { scale: 0.97 }],
    shadowOpacity: 0.16,
  },
  addButtonText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: "900",
  },
});
