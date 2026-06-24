import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  cancelAllScheduledNotifications,
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  scheduleTestReminderNotifications,
} from '../features/reminders/services/reminderNotificationService';
import { useNotificationDevStore } from '../features/reminders/stores/notificationDevStore';
import { SettingRow } from '../features/settings/components/SettingRow';
import { useAppSettings } from '../features/settings/hooks/useAppSettings';
import { AppScreen } from '../shared/components/AppScreen';
import { AppTheme, palette, themeOptions } from '../shared/constants/colors';
import { normalizeTimeInput } from '../shared/utils/time';

export default function SettingsScreen() {
  const { settings, loading, update } = useAppSettings();
  const isNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.isNotificationTestModeEnabled,
  );
  const setNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.setNotificationTestModeEnabled,
  );
  const [previousTime, setPreviousTime] = useState('20:00');
  const [defaultTime, setDefaultTime] = useState('08:00');
  const [notificationPermissionLabel, setNotificationPermissionLabel] =
    useState('確認が必要');
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] =
    useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setPreviousTime(settings.previousNotifyTime);
    setDefaultTime(settings.defaultTargetTime);
  }, [settings]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    void refreshNotificationPermissionStatus();
  }, []);

  const refreshNotificationPermissionStatus = async () => {
    const permission = await getNotificationPermissionStatus();
    setNotificationPermissionLabel(permission.label);
    setIsNotificationPermissionGranted(permission.status === 'granted');
  };

  const savePreviousTime = async () => {
    const normalized = normalizeTimeInput(previousTime, settings?.previousNotifyTime ?? '20:00');
    setPreviousTime(normalized);
    await update({ previousNotifyTime: normalized });
  };

  const saveDefaultTime = async () => {
    const normalized = normalizeTimeInput(defaultTime, settings?.defaultTargetTime ?? '08:00');
    setDefaultTime(normalized);
    await update({ defaultTargetTime: normalized });
  };

  const saveTheme = async (theme: AppTheme) => {
    await update({ theme });
  };

  const handleRequestNotificationPermission = async () => {
    await requestNotificationPermissions();
    await refreshNotificationPermissionStatus();
  };

  const handleSendTestNotification = async () => {
    try {
      const now = new Date().toISOString();
      await scheduleTestReminderNotifications({
        id: `dev_test_${Date.now()}`,
        title: '開発テスト',
      });
      Alert.alert('予約しました', `10秒後と20秒後にテスト通知を送ります。\n${now}`);
    } catch (error) {
      console.warn('Failed to schedule test notification', error);
      Alert.alert('予約できませんでした', '通知権限や端末設定を確認してください。');
    }
  };

  const handleCancelAllNotifications = async () => {
    await cancelAllScheduledNotifications();
    Alert.alert('キャンセルしました', '予約済み通知をすべてキャンセルしました。');
  };

  return (
    <AppScreen theme={settings?.theme ?? 'sky'}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={palette.ink} />
          </Pressable>
        </Link>
        <Text style={styles.title}>設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading || !settings ? (
        <View style={styles.loading}>
          <ActivityIndicator color={palette.skyDeep} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarBubble}>
            <Ionicons name="sparkles" size={30} color={palette.lavenderDeep} />
            <Text style={styles.avatarText}>ポップ・リマインダー</Text>
          </View>

          <View style={styles.group}>
            <SettingRow icon="notifications-outline" title="前日の通知時刻">
              <TextInput
                value={previousTime}
                onChangeText={setPreviousTime}
                onBlur={savePreviousTime}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={styles.timeInput}
              />
            </SettingRow>
            <View style={styles.divider} />
            <SettingRow icon="time-outline" title="当日のデフォルト時刻">
              <TextInput
                value={defaultTime}
                onChangeText={setDefaultTime}
                onBlur={saveDefaultTime}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={styles.timeInput}
              />
            </SettingRow>
            <View style={styles.divider} />
            <SettingRow
              icon="sparkles-outline"
              title="自動消滅"
              caption="期限切れ後は表示せず、起動時に整理します"
            >
              <Switch
                value={settings.autoDeleteEnabled}
                onValueChange={(value) => {
                  void update({ autoDeleteEnabled: value });
                }}
                trackColor={{ false: '#DDE7F4', true: '#BFEBD9' }}
                thumbColor={settings.autoDeleteEnabled ? palette.mintDeep : palette.white}
              />
            </SettingRow>
          </View>

          <View style={styles.group}>
            <SettingRow icon="color-palette-outline" title="テーマ">
              <View style={styles.themeRow}>
                {themeOptions.map((theme) => {
                  const active = theme === settings.theme;

                  return (
                    <Pressable
                      key={theme}
                      accessibilityRole="button"
                      onPress={() => saveTheme(theme)}
                      style={[styles.themeButton, active ? styles.themeButtonActive : null]}
                    >
                      <Text style={[styles.themeLabel, active ? styles.themeLabelActive : null]}>
                        {theme}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SettingRow>
          </View>

          {__DEV__ ? (
            <View style={styles.devGroup}>
              <View style={styles.devHeader}>
                <Ionicons name="flask-outline" size={20} color={palette.lavenderDeep} />
                <Text style={styles.devTitle}>開発用通知テスト</Text>
              </View>

              <SettingRow
                icon="timer-outline"
                title="通知テストモード"
                caption="保存後10秒・20秒で通知を予約します"
              >
                <Switch
                  value={isNotificationTestModeEnabled}
                  onValueChange={setNotificationTestModeEnabled}
                  trackColor={{ false: '#DDE7F4', true: '#D8CCFF' }}
                  thumbColor={isNotificationTestModeEnabled ? palette.lavenderDeep : palette.white}
                />
              </SettingRow>
              <View style={styles.divider} />
              <SettingRow icon="notifications-outline" title="通知権限">
                <Text style={styles.permissionLabel}>{notificationPermissionLabel}</Text>
              </SettingRow>

              {!isNotificationPermissionGranted ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleRequestNotificationPermission}
                  style={styles.devButton}
                >
                  <Ionicons name="notifications-outline" size={18} color={palette.white} />
                  <Text style={styles.devButtonText}>通知権限をリクエスト</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={handleSendTestNotification}
                style={styles.devButton}
              >
                <Ionicons name="paper-plane-outline" size={18} color={palette.white} />
                <Text style={styles.devButtonText}>テスト通知を送る</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleCancelAllNotifications}
                style={[styles.devButton, styles.cancelButton]}
              >
                <Ionicons name="close-circle-outline" size={18} color={palette.ink} />
                <Text style={styles.cancelButtonText}>予約済み通知を全キャンセル</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  headerSpacer: {
    width: 44,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 40,
  },
  avatarBubble: {
    alignSelf: 'center',
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 22,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: '#D7DFFF',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
  avatarText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  group: {
    marginBottom: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    marginLeft: 46,
    backgroundColor: 'rgba(220,233,247,0.78)',
  },
  timeInput: {
    width: 70,
    height: 38,
    borderRadius: 12,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#F6FAFF',
    borderWidth: 1,
    borderColor: palette.line,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  themeButton: {
    minWidth: 58,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#F6FAFF',
    borderWidth: 1,
    borderColor: palette.line,
  },
  themeButtonActive: {
    backgroundColor: palette.skyDeep,
    borderColor: palette.skyDeep,
  },
  themeLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  themeLabelActive: {
    color: palette.white,
  },
  devGroup: {
    marginBottom: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(168,145,245,0.22)',
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  devTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  permissionLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  devButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 10,
    backgroundColor: palette.lavenderDeep,
  },
  devButtonText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '800',
  },
  cancelButton: {
    backgroundColor: 'rgba(246,250,255,0.96)',
    borderWidth: 1,
    borderColor: palette.line,
  },
  cancelButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
});
