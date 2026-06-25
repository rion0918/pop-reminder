import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  cancelAllScheduledNotifications,
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  scheduleTestReminderNotifications,
} from '../../../lib/notifications/reminderNotifications';
import { useNotificationDevStore } from '../../reminders/stores/notificationDevStore';
import { SettingRow } from '../components/SettingRow';
import { useAppSettings } from '../hooks/useAppSettings';
import { AppScreen } from '../../../shared/components/AppScreen';
import { TimePickerModal } from '../../../shared/components/TimePickerModal';
import { TimeSelector } from '../../../shared/components/TimeSelector';
import { AppTheme, palette, themeOptions } from '../../../constants/colors';

const appIcon = require('../../../../assets/app-icon.png');

export function SettingsScreen() {
  const router = useRouter();
  const { settings, loading, update } = useAppSettings();
  const isNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.isNotificationTestModeEnabled,
  );
  const setNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.setNotificationTestModeEnabled,
  );
  const [previousTime, setPreviousTime] = useState('20:00');
  const [isPreviousTimeSelectorOpen, setIsPreviousTimeSelectorOpen] = useState(false);
  const [isPreviousTimePickerOpen, setIsPreviousTimePickerOpen] = useState(false);
  const [notificationPermissionLabel, setNotificationPermissionLabel] =
    useState('確認が必要');
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] =
    useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setPreviousTime(settings.previousNotifyTime);
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

  const savePreviousTime = async (value: string) => {
    setPreviousTime(value);
    await update({ previousNotifyTime: value });
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

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  const togglePreviousTimeSelector = () => {
    setIsPreviousTimeSelectorOpen((current) => !current);
  };

  const handleTimePickerChange = (value: string) => {
    void savePreviousTime(value);
  };

  return (
    <AppScreen theme={settings?.theme ?? 'sky'}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ホームに戻る"
          hitSlop={8}
          onPress={handleBackPress}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </Pressable>
        <Text style={styles.title}>設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading || !settings ? (
        <View style={styles.loading}>
          <ActivityIndicator color={palette.skyDeep} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Image source={appIcon} style={styles.appIcon} />

          <View style={styles.group}>
            <SettingRow
              icon="notifications-outline"
              title="前日のお知らせ時刻"
              onPress={togglePreviousTimeSelector}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="前日のお知らせ時刻を変更"
                onPress={togglePreviousTimeSelector}
                style={({ pressed }) => [
                  styles.timeValueButton,
                  isPreviousTimeSelectorOpen ? styles.timeValueButtonActive : null,
                  pressed ? styles.timeValueButtonPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.timeValueText,
                    isPreviousTimeSelectorOpen ? styles.timeValueTextActive : null,
                  ]}
                >
                  {previousTime}
                </Text>
              </Pressable>
            </SettingRow>
            {isPreviousTimeSelectorOpen ? (
              <View style={styles.selectorPanel}>
                <TimeSelector
                  value={previousTime}
                  onChange={(value) => {
                    void savePreviousTime(value);
                  }}
                  onSelectCustomTime={() => setIsPreviousTimePickerOpen(true)}
                />
              </View>
            ) : null}
            <View style={styles.divider} />
            <SettingRow
              icon="volume-medium-outline"
              title="通知音"
              caption="OS標準の通知音を鳴らします"
              onPress={() => {
                void update({ notificationSoundEnabled: !settings.notificationSoundEnabled });
              }}
            >
              <Switch
                value={settings.notificationSoundEnabled}
                onValueChange={(value) => {
                  void update({ notificationSoundEnabled: value });
                }}
                trackColor={{ false: '#DDE7F4', true: '#D8CCFF' }}
                thumbColor={settings.notificationSoundEnabled ? palette.lavenderDeep : palette.white}
              />
            </SettingRow>
            <View style={styles.divider} />
            <SettingRow
              icon="sparkles-outline"
              title="自動消滅"
              caption="期限切れ後は表示せず、起動時に整理します"
              onPress={() => {
                void update({ autoDeleteEnabled: !settings.autoDeleteEnabled });
              }}
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
                      style={({ pressed }) => [
                        styles.themeButton,
                        active ? styles.themeButtonActive : null,
                        pressed ? styles.themeButtonPressed : null,
                      ]}
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
                onPress={() => {
                  setNotificationTestModeEnabled(!isNotificationTestModeEnabled);
                }}
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
      <TimePickerModal
        visible={isPreviousTimePickerOpen}
        value={previousTime}
        hint="選んだ時刻に前日のお知らせが届きます"
        onChange={handleTimePickerChange}
        onClose={() => setIsPreviousTimePickerOpen(false)}
      />
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
  appIcon: {
    alignSelf: 'center',
    width: 156,
    height: 156,
    borderRadius: 36,
    marginTop: 18,
    marginBottom: 30,
    shadowColor: '#A891F5',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
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
  timeValueButton: {
    minWidth: 72,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6FAFF',
    borderWidth: 1,
    borderColor: palette.line,
  },
  timeValueButtonActive: {
    backgroundColor: palette.lavenderDeep,
    borderColor: palette.lavenderDeep,
  },
  timeValueButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  timeValueText: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  timeValueTextActive: {
    color: palette.white,
  },
  selectorPanel: {
    paddingLeft: 46,
    paddingRight: 2,
    paddingBottom: 12,
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
  themeButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
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
