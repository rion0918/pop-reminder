import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useNotificationDevStore } from '../../reminders/stores/notificationDevStore';
import { useAppServices } from '../../../bootstrap/AppProviders';
import { SettingRow } from '../components/SettingRow';
import { useAppSettingsQuery as useAppSettings } from '../presentation/useAppSettingsQuery';
import { useNotificationSettings } from '../presentation/useNotificationSettings';
import { AppScreen } from '../../../shared/components/AppScreen';
import { TimePickerModal } from '../../../shared/components/TimePickerModal';
import { TimeSelector } from '../../../shared/components/TimeSelector';
import { type AppTheme, appThemes, palette, themeOptions } from '../../../constants/colors';
import {
  isValidQuickAddPresetTimes,
  QUICK_ADD_PRESET_VALIDATION_MESSAGE,
  type QuickAddPresetTimes,
} from '../domain/appSettings';

const appIcon = require('../../../../assets/app-icon.png');
const BACK_BUTTON_FEEDBACK_MS = 120;

type QuickAddPresetKey = keyof QuickAddPresetTimes;
type QuickAddPresetIcon = ComponentProps<typeof Ionicons>['name'];

const quickAddPresetRows: { key: QuickAddPresetKey; label: string; icon: QuickAddPresetIcon }[] = [
  { key: 'defaultTargetTime', label: '朝', icon: 'partly-sunny-outline' },
  { key: 'noonTargetTime', label: '昼', icon: 'sunny-outline' },
  { key: 'eveningTargetTime', label: '夕', icon: 'cloudy-night-outline' },
  { key: 'nightTargetTime', label: '夜', icon: 'moon-outline' },
];

const themeLabels: Record<AppTheme, string> = {
  sky: 'ドーン',
  lavender: 'ドリーム',
  mint: 'ブリーズ',
};

type LegalSection = {
  title: string;
  body: string;
};

type LegalDocument = {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
};

const privacyPolicyDocument: LegalDocument = {
  title: 'プライバシーポリシー',
  updatedAt: '2026年7月14日',
  sections: [
    {
      title: '1. 基本方針',
      body: '「ふわっと。」は、忘れたくないことを気軽に残すための個人開発アプリです。ユーザーのプライバシーを大切にし、必要以上の情報を取得しない方針で運営します。',
    },
    {
      title: '2. 保存する情報',
      body: '登録したリマインダーのタイトル、日時、通知ID、アプリ設定などを、お使いの端末内に保存します。現時点ではログイン機能や外部サーバーへの同期はありません。',
    },
    {
      title: '3. 通知権限について',
      body: '本アプリは、お知らせを届けるために端末の通知権限を利用します。通知権限は端末の設定からいつでも変更できます。',
    },
    {
      title: '4. 外部送信について',
      body: '現時点では、登録したリマインダーや設定内容を開発者のサーバーへ送信することはありません。将来、外部サービスを利用する機能を追加する場合は、分かりやすくお知らせします。',
    },
    {
      title: '5. データの削除',
      body: 'アプリ内の削除操作、期限切れデータの整理、またはアプリのアンインストールにより、端末内のデータは削除されます。',
    },
    {
      title: '6. お問い合わせ',
      body: '不具合やご意見がある場合は、Google PlayやApp Storeなどの配布ページ、または開発者が案内する連絡先からお問い合わせください。',
    },
  ],
};

const termsSections = [
  {
    title: '1. はじめに',
    body: '「ふわっと。」は、忘れたくないことを気軽に残すための個人開発アプリです。本アプリを利用することで、この利用規約に同意したものとします。',
  },
  {
    title: '2. ご利用について',
    body: 'リマインダーの登録、表示、お知らせは、端末の状態やOSの仕様により予定どおり動作しない場合があります。大切な予定や安全に関わる用途では、他の確認手段もあわせてご利用ください。',
  },
  {
    title: '3. データの取り扱い',
    body: '登録したリマインダーや設定は、お使いの端末内に保存されます。現時点ではログイン機能や外部サーバーへの同期はありません。アプリの削除や端末の初期化により、保存データが失われる場合があります。',
  },
  {
    title: '4. 通知について',
    body: '本アプリは、端末の通知権限を利用してお知らせを表示します。通知の表示や通知音は、OS設定、集中モード、通信環境、端末の状態などの影響を受ける場合があります。',
  },
  {
    title: '5. 免責事項',
    body: '本アプリの利用により生じた損失、予定の見落とし、通知の不達などについて、開発者は法令で認められる範囲で責任を負いません。本アプリは学生の個人開発者により提供されています。',
  },
  {
    title: '6. 規約の変更',
    body: '必要に応じて、この利用規約を変更することがあります。重要な変更がある場合は、アプリ内などで分かりやすくお知らせします。',
  },
  {
    title: '7. お問い合わせ',
    body: '不具合やご意見がある場合は、Google PlayやApp Storeなどの配布ページ、または開発者が案内する連絡先からお問い合わせください。',
  },
];

const termsDocument: LegalDocument = {
  title: '利用規約',
  updatedAt: '2026年7月14日',
  sections: termsSections,
};

export function SettingsScreen() {
  const router = useRouter();
  const reminderServices = useAppServices().reminders;
  const { settings, loading, update, updatePreviousNotifyTime, isUpdatingPreviousNotifyTime } =
    useAppSettings();
  const {
    cancelAllScheduledNotifications,
    getExactAlarmPermissionStatus,
    getNotificationPermissionStatus,
    openExactAlarmSettings,
    requestNotificationPermissions,
    scheduleTestReminderNotifications,
  } = useNotificationSettings();
  const isNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.isNotificationTestModeEnabled,
  );
  const setNotificationTestModeEnabled = useNotificationDevStore(
    (state) => state.setNotificationTestModeEnabled,
  );
  const [previousTime, setPreviousTime] = useState('20:00');
  const [isPreviousTimeSelectorOpen, setIsPreviousTimeSelectorOpen] = useState(false);
  const [isPreviousTimePickerOpen, setIsPreviousTimePickerOpen] = useState(false);
  const [isQuickAddPresetSectionOpen, setIsQuickAddPresetSectionOpen] = useState(false);
  const [quickAddPresetPickerKey, setQuickAddPresetPickerKey] = useState<QuickAddPresetKey | null>(
    null,
  );
  const [notificationPermissionLabel, setNotificationPermissionLabel] = useState('確認が必要');
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] = useState(false);
  const [canAskNotificationPermissionAgain, setCanAskNotificationPermissionAgain] = useState(true);
  const [exactAlarmPermissionStatus, setExactAlarmPermissionStatus] = useState<
    'granted' | 'denied' | 'not-required'
  >('not-required');
  const [exactAlarmPermissionLabel, setExactAlarmPermissionLabel] = useState('確認が必要');
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const [isBackButtonPressed, setIsBackButtonPressed] = useState(false);
  const backPressTimeoutRef = useRef<number | null>(null);
  const isPreviousTimeUpdateRequestedRef = useRef(false);
  const refreshNotificationPermissionStatus = useCallback(async () => {
    const permission = await getNotificationPermissionStatus();
    setNotificationPermissionLabel(permission.label);
    setIsNotificationPermissionGranted(permission.status === 'granted');
    setCanAskNotificationPermissionAgain(permission.canAskAgain);
  }, [getNotificationPermissionStatus]);
  const refreshExactAlarmPermissionStatus = useCallback(async () => {
    const permission = await getExactAlarmPermissionStatus();
    setExactAlarmPermissionStatus(permission.status);
    setExactAlarmPermissionLabel(permission.label);
  }, [getExactAlarmPermissionStatus]);
  const retryPendingReminderNotifications = useCallback(async () => {
    try {
      await reminderServices.retryPendingNotifications();
    } catch (error) {
      console.warn('Failed to retry pending reminder notifications', error);
    }
  }, [reminderServices]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setPreviousTime(settings.previousNotifyTime);
  }, [settings]);

  useEffect(() => {
    void refreshNotificationPermissionStatus();
    void refreshExactAlarmPermissionStatus();
  }, [refreshExactAlarmPermissionStatus, refreshNotificationPermissionStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void refreshNotificationPermissionStatus();
        void refreshExactAlarmPermissionStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshExactAlarmPermissionStatus, refreshNotificationPermissionStatus]);

  useEffect(() => {
    return () => {
      if (backPressTimeoutRef.current) {
        clearTimeout(backPressTimeoutRef.current);
      }
    };
  }, []);

  const savePreviousTime = async (value: string) => {
    if (
      isUpdatingPreviousNotifyTime ||
      isPreviousTimeUpdateRequestedRef.current ||
      value === previousTime
    ) {
      return;
    }

    const currentValue = previousTime;
    isPreviousTimeUpdateRequestedRef.current = true;
    setPreviousTime(value);
    try {
      const result = await updatePreviousNotifyTime(value);
      setPreviousTime(result.settings.previousNotifyTime);

      const messages: string[] = [];
      if (result.skippedPastCount > 0) {
        messages.push(
          `${result.skippedPastCount}件は新しい時刻を過ぎているため、前日通知を見送りました。`,
        );
      }
      if (result.failedReminderCount > 0) {
        messages.push(
          `${result.failedReminderCount}件の前日通知を予約できませんでした。次回起動時に再試行します。`,
        );
      }
      if (messages.length > 0) {
        Alert.alert('前日のお知らせ時刻を変更しました', messages.join('\n'));
      }
    } catch (error) {
      console.warn('Failed to update shared previous notification time', error);
      setPreviousTime(currentValue);
      Alert.alert('時刻を変更できませんでした', '時間をおいてもう一度お試しください。');
    } finally {
      isPreviousTimeUpdateRequestedRef.current = false;
    }
  };

  const quickAddPresets = settings
    ? [
        { label: '朝', time: settings.defaultTargetTime },
        { label: '昼', time: settings.noonTargetTime },
        { label: '夕', time: settings.eveningTargetTime },
        { label: '夜', time: settings.nightTargetTime },
      ]
    : [];

  const saveQuickAddPresetTime = async (key: QuickAddPresetKey, value: string) => {
    if (!settings) {
      return;
    }

    const nextPresetTimes: QuickAddPresetTimes = {
      defaultTargetTime: settings.defaultTargetTime,
      noonTargetTime: settings.noonTargetTime,
      eveningTargetTime: settings.eveningTargetTime,
      nightTargetTime: settings.nightTargetTime,
      [key]: value,
    };

    if (!isValidQuickAddPresetTimes(nextPresetTimes)) {
      Alert.alert('時刻を保存できませんでした', QUICK_ADD_PRESET_VALIDATION_MESSAGE);
      return;
    }

    await update({ [key]: value });
  };

  const saveTheme = async (theme: AppTheme) => {
    await update({ theme });
  };

  const handleRequestNotificationPermission = async () => {
    await requestNotificationPermissions();
    await refreshNotificationPermissionStatus();
    await retryPendingReminderNotifications();
  };

  const handleOpenAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Failed to open app settings', error);
      Alert.alert('設定を開けませんでした', '端末の設定アプリから通知を確認してください。');
    }
  };

  const handleOpenExactAlarmSettings = async () => {
    try {
      await openExactAlarmSettings();
    } catch (error) {
      console.warn('Failed to open exact alarm settings', error);
      Alert.alert(
        '設定を開けませんでした',
        '端末の設定から「アラームとリマインダー」を確認してください。',
      );
    }
  };

  const handleSendTestNotification = async () => {
    try {
      const now = new Date().toISOString();
      const result = await scheduleTestReminderNotifications({
        id: `dev_test_${Date.now()}`,
        title: '開発テスト',
      });
      if (result.status === 'scheduled') {
        Alert.alert('予約しました', `10秒後と20秒後にテスト通知を送ります。\n${now}`);
        return;
      }

      Alert.alert('予約できませんでした', '通知権限や正確な時刻の通知設定を確認してください。');
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
    if (backPressTimeoutRef.current) {
      clearTimeout(backPressTimeoutRef.current);
    }

    setIsBackButtonPressed(true);
    backPressTimeoutRef.current = setTimeout(() => {
      setIsBackButtonPressed(false);
      backPressTimeoutRef.current = null;

      if (router.canGoBack()) {
        router.back();
        return;
      }

      router.replace('/');
    }, BACK_BUTTON_FEEDBACK_MS) as unknown as number;
  };

  const togglePreviousTimeSelector = () => {
    if (isUpdatingPreviousNotifyTime) {
      return;
    }
    setIsPreviousTimeSelectorOpen((current) => !current);
  };

  const handleTimePickerChange = (value: string) => {
    void savePreviousTime(value);
  };

  const quickAddPresetPicker = quickAddPresetPickerKey
    ? (quickAddPresetRows.find((preset) => preset.key === quickAddPresetPickerKey) ?? null)
    : null;

  return (
    <AppScreen theme={settings?.theme ?? 'sky'}>
      <View className="h-[52px] flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ホームに戻る"
          hitSlop={8}
          onPress={handleBackPress}
          className="h-[44px] w-[44px] items-center justify-center rounded-[22px] bg-[rgba(255,255,255,0.78)]"
          style={({ pressed }) => [
            pressed || isBackButtonPressed ? styles.iconButtonPressed : null,
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </Pressable>
        <Text className="text-[18px] font-extrabold text-app-ink">設定</Text>
        <View className="w-[44px]" />
      </View>

      {loading || !settings ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.skyDeep} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Image
            source={appIcon}
            className="mb-[30px] mt-[18px] h-[156px] w-[156px] self-center rounded-[36px]"
            style={styles.appIconShadow}
          />

          <View className="mb-[18px] rounded-[24px] bg-[rgba(255,255,255,0.82)] px-[16px] py-[4px]">
            <SettingRow
              icon="notifications-outline"
              title="前日のお知らせ時刻"
              caption="すべての泡に共通"
              onPress={togglePreviousTimeSelector}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="前日のお知らせ時刻を変更"
                accessibilityState={{ disabled: isUpdatingPreviousNotifyTime }}
                onPress={togglePreviousTimeSelector}
                disabled={isUpdatingPreviousNotifyTime}
                className={`h-[38px] min-w-[72px] items-center justify-center rounded-[14px] border ${
                  isPreviousTimeSelectorOpen
                    ? 'border-app-lavender-deep bg-app-lavender-deep'
                    : 'border-app-line bg-[#F6FAFF]'
                }`}
                style={({ pressed }) => [pressed ? styles.timeValueButtonPressed : null]}
              >
                {isUpdatingPreviousNotifyTime ? (
                  <ActivityIndicator size="small" color={palette.lavenderDeep} />
                ) : (
                  <Text
                    className={`text-[15px] font-extrabold ${
                      isPreviousTimeSelectorOpen ? 'text-app-white' : 'text-app-ink'
                    }`}
                  >
                    {previousTime}
                  </Text>
                )}
              </Pressable>
            </SettingRow>
            {isPreviousTimeSelectorOpen ? (
              <View className="px-[16px] pb-[12px]">
                <TimeSelector
                  value={previousTime}
                  disabled={isUpdatingPreviousNotifyTime}
                  onChange={(value) => {
                    void savePreviousTime(value);
                  }}
                  onSelectCustomTime={() => setIsPreviousTimePickerOpen(true)}
                  presets={quickAddPresets}
                />
              </View>
            ) : null}
            <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
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
                thumbColor={
                  settings.notificationSoundEnabled ? palette.lavenderDeep : palette.white
                }
              />
            </SettingRow>
            <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
            <SettingRow
              icon="notifications-outline"
              title="通知権限"
              caption="端末の通知設定と連動します"
            >
              <Text className="text-[13px] font-extrabold text-app-muted">
                {notificationPermissionLabel}
              </Text>
            </SettingRow>
            {!isNotificationPermissionGranted ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={
                    canAskNotificationPermissionAgain
                      ? handleRequestNotificationPermission
                      : handleOpenAppSettings
                  }
                  className="mb-[12px] ml-[46px] min-h-[44px] flex-row items-center justify-center gap-[8px] rounded-[14px] bg-app-sky-deep px-[14px]"
                >
                  <Ionicons
                    name={
                      canAskNotificationPermissionAgain
                        ? 'notifications-outline'
                        : 'settings-outline'
                    }
                    size={18}
                    color={palette.white}
                  />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    className="shrink text-[14px] font-extrabold text-app-white"
                    style={styles.noFontPadding}
                  >
                    {canAskNotificationPermissionAgain
                      ? '通知権限をリクエスト'
                      : '端末の通知設定を開く'}
                  </Text>
                </Pressable>
                <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
              </>
            ) : (
              <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
            )}
            {Platform.OS === 'android' && exactAlarmPermissionStatus !== 'not-required' ? (
              <>
                <SettingRow
                  icon="alarm-outline"
                  title="正確な時刻の通知"
                  caption="Android 12以降の特別な許可です"
                >
                  <Text className="text-[13px] font-extrabold text-app-muted">
                    {exactAlarmPermissionLabel}
                  </Text>
                </SettingRow>
                {exactAlarmPermissionStatus !== 'granted' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="正確な時刻の通知を許可"
                    onPress={handleOpenExactAlarmSettings}
                    className="mb-[12px] ml-[46px] min-h-[44px] flex-row items-center justify-center gap-[8px] rounded-[14px] bg-app-sky-deep px-[14px]"
                  >
                    <Ionicons name="alarm-outline" size={18} color={palette.white} />
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      className="shrink text-[14px] font-extrabold text-app-white"
                      style={styles.noFontPadding}
                    >
                      正確な通知を許可
                    </Text>
                  </Pressable>
                ) : null}
                <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
              </>
            ) : null}
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

          <View className="mb-[18px] rounded-[24px] bg-[rgba(255,255,255,0.82)] px-[16px] py-[4px]">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="クイック追加の時刻設定を開閉"
              accessibilityState={{ expanded: isQuickAddPresetSectionOpen }}
              onPress={() => setIsQuickAddPresetSectionOpen((current) => !current)}
              className="min-h-[64px] flex-row items-center gap-[12px] py-[10px]"
            >
              <View className="h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[17px] bg-[#F2F7FE]">
                <Ionicons name="time-outline" size={20} color={palette.muted} />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[14px] font-extrabold leading-[19px] text-app-ink"
                  style={styles.noFontPadding}
                >
                  クイック追加の時刻
                </Text>
                <Text className="mt-[3px] text-[11px] font-semibold leading-[16px] text-app-muted">
                  朝・昼・夕・夜の候補を設定
                </Text>
              </View>
              <Ionicons
                name={isQuickAddPresetSectionOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={palette.muted}
              />
            </Pressable>
            {isQuickAddPresetSectionOpen
              ? quickAddPresetRows.map((preset, index) => (
                  <View key={preset.key}>
                    <SettingRow icon={preset.icon} title={preset.label}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${preset.label}の時刻を変更`}
                        onPress={() => setQuickAddPresetPickerKey(preset.key)}
                        className="h-[38px] min-w-[72px] items-center justify-center rounded-[14px] border border-app-line bg-[#F6FAFF]"
                        style={({ pressed }) => [pressed ? styles.timeValueButtonPressed : null]}
                      >
                        <Text className="text-[15px] font-extrabold text-app-ink">
                          {settings[preset.key]}
                        </Text>
                      </Pressable>
                    </SettingRow>
                    {index < quickAddPresetRows.length - 1 ? (
                      <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
                    ) : null}
                  </View>
                ))
              : null}
          </View>

          <View className="mb-[18px] rounded-[24px] bg-[rgba(255,255,255,0.82)] px-[16px] py-[14px]">
            <View className="mb-[12px] flex-row items-center gap-[12px]">
              <View className="h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[17px] bg-[#F2F7FE]">
                <Ionicons name="color-palette-outline" size={20} color={palette.muted} />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[14px] font-extrabold leading-[19px] text-app-ink"
                  style={styles.noFontPadding}
                >
                  テーマ
                </Text>
                <Text className="mt-[3px] text-[11px] font-semibold leading-[16px] text-app-muted">
                  テーマを選択
                </Text>
              </View>
            </View>
            <View className="rounded-[24px] border border-[rgba(220,233,247,0.78)] bg-[#F6FAFF] p-[4px]">
              <View className="min-w-0 flex-row gap-[4px]">
                {themeOptions.map((theme) => {
                  const active = theme === settings.theme;

                  return (
                    <Pressable
                      key={theme}
                      accessibilityRole="button"
                      accessibilityLabel={`${themeLabels[theme]}テーマを選択`}
                      accessibilityState={{ selected: active }}
                      onPress={() => saveTheme(theme)}
                      className="min-w-0 flex-1 items-center justify-center gap-[5px] px-[6px]"
                      style={({ pressed }) => [
                        styles.themeButton,
                        {
                          backgroundColor: active ? palette.white : appThemes[theme].accentSoft,
                          borderColor: active ? appThemes[theme].accent : 'transparent',
                        },
                        active ? styles.themeButtonActive : null,
                        pressed ? styles.themeButtonPressed : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.themeSwatch,
                          {
                            backgroundColor: active
                              ? appThemes[theme].accentSoft
                              : appThemes[theme].accent,
                          },
                        ]}
                      >
                        {active ? (
                          <Ionicons name="checkmark" size={11} color={appThemes[theme].accent} />
                        ) : null}
                      </View>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                        className="text-[13px] font-black"
                        style={[
                          styles.themeLabel,
                          {
                            color: appThemes[theme].accent,
                          },
                        ]}
                      >
                        {themeLabels[theme]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="mb-[18px] rounded-[24px] bg-[rgba(255,255,255,0.82)] px-[16px] py-[4px]">
            <SettingRow
              icon="shield-checkmark-outline"
              title="プライバシーポリシー"
              caption="保存データと通知権限について"
              onPress={() => setLegalDocument(privacyPolicyDocument)}
            >
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </SettingRow>
            <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
            <SettingRow
              icon="document-text-outline"
              title="利用規約"
              caption="アプリのご利用にあたって"
              onPress={() => setLegalDocument(termsDocument)}
            >
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </SettingRow>
          </View>

          {__DEV__ ? (
            <View className="mb-[18px] rounded-[24px] border border-[rgba(168,145,245,0.22)] bg-[rgba(255,255,255,0.88)] px-[16px] py-[14px]">
              <View className="mb-[6px] flex-row items-center gap-[8px]">
                <Ionicons name="flask-outline" size={20} color={palette.lavenderDeep} />
                <Text className="text-[16px] font-black text-app-ink">開発用通知テスト</Text>
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
              <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
              <Pressable
                accessibilityRole="button"
                onPress={handleSendTestNotification}
                className="mt-[10px] min-h-[44px] flex-row items-center justify-center gap-[8px] rounded-[14px] bg-app-lavender-deep px-[14px]"
              >
                <Ionicons name="paper-plane-outline" size={18} color={palette.white} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  className="shrink text-[14px] font-extrabold text-app-white"
                  style={styles.noFontPadding}
                >
                  テスト通知を送る
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleCancelAllNotifications}
                className="mt-[10px] min-h-[44px] flex-row items-center justify-center gap-[8px] rounded-[14px] border border-app-line bg-[rgba(246,250,255,0.96)] px-[14px]"
              >
                <Ionicons name="close-circle-outline" size={18} color={palette.ink} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  className="shrink text-[14px] font-extrabold text-app-ink"
                  style={styles.noFontPadding}
                >
                  予約済み通知を全キャンセル
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      )}
      <TimePickerModal
        visible={isPreviousTimePickerOpen}
        value={previousTime}
        hint="選んだ時刻に前日のお知らせが届きます"
        onConfirm={handleTimePickerChange}
        onClose={() => setIsPreviousTimePickerOpen(false)}
      />
      <TimePickerModal
        visible={quickAddPresetPicker !== null}
        value={quickAddPresetPicker && settings ? settings[quickAddPresetPicker.key] : '08:00'}
        title={quickAddPresetPicker ? `${quickAddPresetPicker.label}の時刻を選択` : undefined}
        hint="この時刻をクイック追加の候補として保存します"
        onConfirm={(value) => {
          if (quickAddPresetPicker) {
            void saveQuickAddPresetTime(quickAddPresetPicker.key, value);
          }
        }}
        onClose={() => setQuickAddPresetPickerKey(null)}
      />
      <LegalDocumentModal document={legalDocument} onClose={() => setLegalDocument(null)} />
    </AppScreen>
  );
}

type LegalDocumentModalProps = {
  document: LegalDocument | null;
  onClose: () => void;
};

function LegalDocumentModal({ document, onClose }: LegalDocumentModalProps) {
  return (
    <Modal animationType="fade" transparent visible={document !== null} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-[rgba(38,49,81,0.26)] px-[14px] pb-[14px]">
        <View
          className="max-h-[84%] rounded-[28px] bg-[rgba(255,255,255,0.96)] px-[18px] pt-[18px]"
          style={styles.legalModalShadow}
        >
          <View className="flex-row items-center justify-between gap-[14px] border-b border-[rgba(220,233,247,0.78)] pb-[12px]">
            <View className="min-w-0 flex-1">
              <Text numberOfLines={2} className="text-[18px] font-black text-app-ink">
                {document?.title}
              </Text>
              <Text numberOfLines={1} className="mt-[4px] text-[12px] font-bold text-app-muted">
                最終更新日: {document?.updatedAt}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="閉じる"
              hitSlop={8}
              onPress={onClose}
              className="h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[21px] border border-app-line bg-[#F6FAFF]"
            >
              <Ionicons name="close" size={20} color={palette.ink} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.legalModalContent}
            showsVerticalScrollIndicator={false}
          >
            {document?.sections.map((section) => (
              <View key={section.title} className="mt-[12px]">
                <Text className="mb-[5px] text-[14px] font-black text-app-ink">
                  {section.title}
                </Text>
                <Text className="text-[13px] font-semibold leading-[21px] text-app-muted">
                  {section.body}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  iconButtonPressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }, { scale: 0.94 }],
  },
  content: {
    paddingBottom: 40,
  },
  appIconShadow: {
    shadowColor: palette.lavenderDeep,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  timeValueButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  themeButton: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeButtonActive: {
    shadowColor: palette.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  themeButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  themeSwatch: {
    height: 18,
    width: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    includeFontPadding: false,
  },
  noFontPadding: {
    includeFontPadding: false,
  },
  legalModalShadow: {
    shadowColor: '#7DB5E8',
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
  },
  legalModalContent: {
    paddingTop: 6,
    paddingBottom: 24,
  },
});
