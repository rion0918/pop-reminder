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
import { useProAccessQuery } from '../../purchases/presentation/useProAccessQuery';
import { AppScreen } from '../../../shared/components/AppScreen';
import { TimePickerModal } from '../../../shared/components/TimePickerModal';
import { type AppTheme, appThemes, palette, themeOptions } from '../../../constants/colors';
import {
  isValidQuickAddPresetTimes,
  QUICK_ADD_PRESET_VALIDATION_MESSAGE,
  type QuickAddPresetTimes,
} from '../domain/appSettings';

const appIcon = require('../../../../assets/app-icon.png');

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
  updatedAt: '2026年8月10日',
  sections: [
    {
      title: '1. 基本方針',
      body: '「ふわっと。」は、忘れたくないことを気軽に残すための個人開発アプリです。ユーザーのプライバシーを大切にし、必要以上の情報を取得しない方針で運営します。',
    },
    {
      title: '2. 保存する情報',
      body: '登録したリマインダーのタイトル、日時、通知ID、アプリ設定などを、お使いの端末内に保存します。現時点ではログイン機能や登録データの外部サーバーへの同期はありません。',
    },
    {
      title: '3. 通知権限について',
      body: '本アプリは、お知らせを届けるために端末の通知権限を利用します。通知権限は端末の設定からいつでも変更できます。',
    },
    {
      title: '4. 音声入力とセンサーについて',
      body: '音声入力ではマイクを、右に傾けて音声入力ではモーションを利用します。音声認識は端末内で行い、音声、録音、モーション値を保存、分析、外部送信しません。文字起こしは追加画面にだけ入り、ユーザーが「追加」を押した場合にタイトルとして端末内へ保存されます。文字起こしを分析、外部送信することはありません。これらの権限は端末の設定からいつでも変更できます。',
    },
    {
      title: '5. 匿名の利用状況について',
      body: '品質改善のため、SDKが生成する匿名ID、アプリ・端末の技術情報、ホーム・一覧・設定の画面表示、リマインダー操作、通知、Pro購入導線の結果を PostHog の US Cloud へ送信します。タイトル、リマインダーID、具体的な日付・時刻、設定値、価格、ストア取引ID、ディープリンクURLは送信しません。',
    },
    {
      title: '6. 利用状況計測の停止',
      body: '匿名の利用状況は初期状態で有効です。設定画面の「匿名の利用状況を共有」からいつでも停止・再開でき、選択は端末内に保存されます。タッチ操作の自動収集、セッションリプレイ、位置情報の推定、リモートFeature Flagは使用しません。',
    },
    {
      title: '7. アプリ内購入について',
      body: '買い切りの「Pro版ふわっと。」を提供するため RevenueCat、Apple App Store、Google Play を利用します。RevenueCatにはSDKが生成する匿名購入ID、購入商品、購入・復元・権利状態、アプリ・端末の技術情報が送信されます。リマインダーの内容は送信しません。',
    },
    {
      title: '8. データの削除',
      body: 'アプリ内の削除操作、期限切れデータの整理、またはアプリのアンインストールにより、端末内のデータは削除されます。',
    },
    {
      title: '9. お問い合わせ',
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
    body: '登録したリマインダーや設定は、お使いの端末内に保存されます。現時点ではログイン機能や登録データの外部サーバーへの同期はありません。アプリの削除や端末の初期化により、保存データが失われる場合があります。',
  },
  {
    title: '4. 通知について',
    body: '本アプリは、端末の通知権限を利用してお知らせを表示します。通知の表示や通知音は、OS設定、集中モード、通信環境、端末の状態などの影響を受ける場合があります。',
  },
  {
    title: '5. アプリ内購入',
    body: '無料版では、現在時刻より後に通知予定がある有効なリマインダーを同時に6件まで登録できます。「Pro版ふわっと。」は、ストアに表示される価格で忘れたくないことを無制限に追加できる買い切り商品です。自動更新はありません。購入の請求、返金、取消はApple App StoreまたはGoogle Playの規約に従います。購入権利は購入時と同じストアアカウントで復元できますが、AndroidとiOSの間では共有されません。返金や取消が確認された場合、Pro機能は利用できなくなります。',
  },
  {
    title: '6. 免責事項',
    body: '本アプリの利用により生じた損失、予定の見落とし、通知の不達などについて、開発者は法令で認められる範囲で責任を負いません。本アプリは学生の個人開発者により提供されています。',
  },
  {
    title: '7. 規約の変更',
    body: '必要に応じて、この利用規約を変更することがあります。重要な変更がある場合は、アプリ内などで分かりやすくお知らせします。',
  },
  {
    title: '8. お問い合わせ',
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
  const { reminders: reminderServices, analytics, purchases } = useAppServices();
  const raiseToSpeak = useAppServices().raiseToSpeak;
  const { proAccessState, isProAccessLoading, refreshProAccess } = useProAccessQuery();
  const { settings, loading, update, updatePreviousNotifyTime, isUpdatingPreviousNotifyTime } =
    useAppSettings();
  const {
    cancelAllScheduledNotifications,
    getNotificationPermissionStatus,
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
  const [isPreviousTimePickerOpen, setIsPreviousTimePickerOpen] = useState(false);
  const [isQuickAddPresetSectionOpen, setIsQuickAddPresetSectionOpen] = useState(false);
  const [quickAddPresetPickerKey, setQuickAddPresetPickerKey] = useState<QuickAddPresetKey | null>(
    null,
  );
  const [notificationPermissionLabel, setNotificationPermissionLabel] = useState('確認が必要');
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] = useState(false);
  const [canAskNotificationPermissionAgain, setCanAskNotificationPermissionAgain] = useState(true);
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);
  const [isAnalyticsPreferenceLoading, setIsAnalyticsPreferenceLoading] = useState(true);
  const [isPurchaseActionPending, setIsPurchaseActionPending] = useState(false);
  const [isRaiseToSpeakUpdatePending, setIsRaiseToSpeakUpdatePending] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const isPreviousTimeUpdateRequestedRef = useRef(false);
  const isNativePurchasePlatform = Platform.OS === 'android' || Platform.OS === 'ios';
  const refreshNotificationPermissionStatus = useCallback(async () => {
    const permission = await getNotificationPermissionStatus();
    setNotificationPermissionLabel(permission.label);
    setIsNotificationPermissionGranted(permission.status === 'granted');
    setCanAskNotificationPermissionAgain(permission.canAskAgain);
  }, [getNotificationPermissionStatus]);
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
  }, [refreshNotificationPermissionStatus]);

  useEffect(() => {
    let cancelled = false;

    const loadAnalyticsPreference = async () => {
      const enabled = await analytics.getCaptureEnabled();
      if (cancelled) return;

      setIsAnalyticsEnabled(enabled);
      setIsAnalyticsPreferenceLoading(false);
    };

    void loadAnalyticsPreference();

    return () => {
      cancelled = true;
    };
  }, [analytics]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void refreshNotificationPermissionStatus();
        void refreshProAccess();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshNotificationPermissionStatus, refreshProAccess]);

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
    const permission = await requestNotificationPermissions();
    analytics.captureNotificationPermissionUpdated({
      status: permission.status,
      canAskAgain: permission.canAskAgain,
    });
    await refreshNotificationPermissionStatus();
    await retryPendingReminderNotifications();
  };

  const handleAnalyticsEnabledChange = async (value: boolean) => {
    if (!analytics.configured || isAnalyticsPreferenceLoading) return;

    setIsAnalyticsPreferenceLoading(true);
    const enabled = await analytics.setCaptureEnabled(value);
    setIsAnalyticsEnabled(enabled);
    setIsAnalyticsPreferenceLoading(false);
  };

  const handleRaiseToSpeakEnabledChange = async (enabled: boolean) => {
    if (isRaiseToSpeakUpdatePending) return;

    setIsRaiseToSpeakUpdatePending(true);
    try {
      if (!enabled) {
        await update({ raiseToSpeakEnabled: false, raiseToSpeakIntroSeen: true });
        return;
      }

      const result = await raiseToSpeak.prepare();
      if (result.status === 'ready') {
        await update({ raiseToSpeakEnabled: true, raiseToSpeakIntroSeen: true });
        return;
      }

      if (result.status === 'model-download-started') {
        Alert.alert(
          '日本語モデルを準備しています',
          'OSの案内に沿ってダウンロードし、完了後にもう一度オンにしてください。',
        );
        return;
      }

      if (result.status === 'permission-denied') {
        const actions = result.canAskAgain
          ? [{ text: 'OK' }]
          : [
              { text: 'あとで', style: 'cancel' as const },
              { text: '設定を開く', onPress: () => void handleOpenAppSettings() },
            ];
        Alert.alert(
          '権限が必要です',
          'マイクとモーションの権限を許可すると利用できます。',
          actions,
        );
        return;
      }

      const message = {
        'motion-unavailable': 'この端末ではモーション検出を利用できません。',
        'speech-unavailable':
          'この端末では日本語の端末内音声認識を利用できません。手入力をご利用ください。',
      }[result.status];
      Alert.alert('右に傾けて音声入力を利用できません', message);
    } catch (error) {
      console.warn('Failed to update raise-to-speak setting', error);
      Alert.alert('設定を変更できませんでした', '時間をおいてもう一度お試しください。');
    } finally {
      setIsRaiseToSpeakUpdatePending(false);
    }
  };

  const handleOpenProPaywall = async () => {
    if (isPurchaseActionPending) return;

    setIsPurchaseActionPending(true);
    try {
      const result = await purchases.presentProPaywallIfNeeded();
      analytics.captureProPaywallResult({ placement: 'settings', outcome: result });
      await refreshProAccess();

      if (result === 'error') {
        Alert.alert(
          'Proを確認できませんでした',
          '通信状況を確認して、時間をおいてもう一度お試しください。',
        );
      }
    } finally {
      setIsPurchaseActionPending(false);
    }
  };

  const handleRestoreProPurchase = async () => {
    if (isPurchaseActionPending) return;

    setIsPurchaseActionPending(true);
    try {
      const result = await purchases.restoreProPurchase();
      analytics.captureProRestoreResult({ outcome: result });
      await refreshProAccess();

      if (result === 'restored') {
        Alert.alert('購入を復元しました', 'Pro版ふわっと。を利用できます。');
      } else if (result === 'no-purchase') {
        Alert.alert('復元できる購入がありません', '購入時と同じストアアカウントをご確認ください。');
      } else {
        Alert.alert(
          '購入を復元できませんでした',
          '通信状況とストアアカウントを確認して、もう一度お試しください。',
        );
      }
    } finally {
      setIsPurchaseActionPending(false);
    }
  };

  const handleOpenAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Failed to open app settings', error);
      Alert.alert('設定を開けませんでした', '端末の設定アプリから通知を確認してください。');
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

      Alert.alert('予約できませんでした', '通知権限や端末の通知設定を確認してください。');
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
          style={({ pressed }) => [pressed ? styles.iconButtonPressed : null]}
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

          {isNativePurchasePlatform ? (
            <View className="mb-[18px] rounded-[24px] border border-[rgba(168,145,245,0.26)] bg-[rgba(255,255,255,0.88)] px-[16px] py-[14px]">
              {isProAccessLoading || proAccessState === 'pro' ? (
                <View className="min-h-[64px] flex-row items-center gap-[12px] py-[10px]">
                  <View className="h-[38px] w-[38px] items-center justify-center rounded-[19px] bg-[#EEE8FF]">
                    <Ionicons name="infinite-outline" size={22} color={palette.lavenderDeep} />
                  </View>
                  <Text className="min-w-0 flex-1 text-[16px] font-black text-app-lavender-deep">
                    Pro版ふわっと。
                  </Text>
                  {isProAccessLoading ? (
                    <ActivityIndicator size="small" color={palette.lavenderDeep} />
                  ) : (
                    <View className="rounded-[14px] bg-[#E9F8F1] px-[12px] py-[8px]">
                      <Text className="text-[12px] font-black text-app-mint-deep">Pro利用中</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Proにアップグレードする"
                  accessibilityState={{ disabled: isPurchaseActionPending }}
                  disabled={isPurchaseActionPending}
                  onPress={() => void handleOpenProPaywall()}
                  className="min-h-[64px] flex-row items-center gap-[12px] py-[10px]"
                  style={({ pressed }) => [pressed ? styles.timeValueButtonPressed : null]}
                >
                  <View className="h-[38px] w-[38px] items-center justify-center rounded-[19px] bg-[#EEE8FF]">
                    <Ionicons
                      name="sparkles-outline"
                      size={22}
                      color={palette.lavenderDeep}
                      style={styles.proUpgradeIcon}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    className="min-w-0 flex-1 text-[15px] font-black text-app-lavender-deep"
                  >
                    Proにアップグレードする
                  </Text>
                  {isPurchaseActionPending ? (
                    <ActivityIndicator size="small" color={palette.lavenderDeep} />
                  ) : null}
                </Pressable>
              )}
              {!isProAccessLoading && proAccessState !== 'pro' ? (
                <>
                  <View className="ml-[50px] h-px bg-[rgba(220,233,247,0.78)]" />
                  <SettingRow
                    icon="refresh-outline"
                    title="購入を復元"
                    onPress={() => void handleRestoreProPurchase()}
                  >
                    <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                  </SettingRow>
                </>
              ) : null}
            </View>
          ) : null}

          <View className="mb-[18px] rounded-[24px] bg-[rgba(255,255,255,0.82)] px-[16px] py-[4px]">
            <SettingRow icon="notifications-outline" title="前日のお知らせ時刻">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="前日のお知らせ時刻を変更"
                accessibilityState={{ disabled: isUpdatingPreviousNotifyTime }}
                onPress={() => setIsPreviousTimePickerOpen(true)}
                disabled={isUpdatingPreviousNotifyTime}
                className="h-[38px] min-w-[72px] items-center justify-center rounded-[14px] border border-app-line bg-[#F6FAFF]"
                style={({ pressed }) => [pressed ? styles.timeValueButtonPressed : null]}
              >
                {isUpdatingPreviousNotifyTime ? (
                  <ActivityIndicator size="small" color={palette.lavenderDeep} />
                ) : (
                  <Text className="text-[15px] font-extrabold text-app-ink">{previousTime}</Text>
                )}
              </Pressable>
            </SettingRow>
            <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
            <SettingRow
              icon="volume-medium-outline"
              title="通知音"
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
            <SettingRow icon="notifications-outline" title="通知権限">
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
            <SettingRow
              icon="sparkles-outline"
              title="自動消滅"
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
            <SettingRow
              icon="mic-outline"
              title="右に傾けて音声入力"
              onPress={() => void handleRaiseToSpeakEnabledChange(!settings.raiseToSpeakEnabled)}
            >
              {isRaiseToSpeakUpdatePending ? (
                <ActivityIndicator size="small" color={palette.lavenderDeep} />
              ) : (
                <Switch
                  accessibilityLabel="右に傾けて音声入力"
                  value={settings.raiseToSpeakEnabled}
                  onValueChange={(value) => void handleRaiseToSpeakEnabledChange(value)}
                  trackColor={{ false: '#DDE7F4', true: '#D8CCFF' }}
                  thumbColor={settings.raiseToSpeakEnabled ? palette.lavenderDeep : palette.white}
                />
              )}
            </SettingRow>
            <Text className="mb-[12px] ml-[46px] text-[11px] font-semibold leading-[17px] text-app-muted">
              音声は端末内で処理し、録音を保存しません
            </Text>
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
            <SettingRow icon="analytics-outline" title="匿名の利用状況を共有">
              {isAnalyticsPreferenceLoading ? (
                <ActivityIndicator size="small" color={palette.lavenderDeep} />
              ) : (
                <Switch
                  accessibilityLabel="匿名の利用状況を共有"
                  accessibilityState={{ disabled: !analytics.configured }}
                  value={isAnalyticsEnabled}
                  disabled={!analytics.configured}
                  onValueChange={(value) => void handleAnalyticsEnabledChange(value)}
                  trackColor={{ false: '#DDE7F4', true: '#D8CCFF' }}
                  thumbColor={isAnalyticsEnabled ? palette.lavenderDeep : palette.white}
                />
              )}
            </SettingRow>
            <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
            <SettingRow
              icon="shield-checkmark-outline"
              title="プライバシーポリシー"
              onPress={() => setLegalDocument(privacyPolicyDocument)}
            >
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </SettingRow>
            <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
            <SettingRow
              icon="document-text-outline"
              title="利用規約"
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
  proUpgradeIcon: {
    includeFontPadding: false,
    lineHeight: 22,
    textAlign: 'center',
    textAlignVertical: 'center',
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
