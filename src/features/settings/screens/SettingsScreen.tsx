import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Linking,
  Modal,
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
const BACK_BUTTON_FEEDBACK_MS = 120;

const themeLabels: Record<AppTheme, string> = {
  sky: 'そら',
  lavender: 'らべんだー',
  mint: 'みんと',
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
  updatedAt: '2026年6月25日',
  sections: [
    {
      title: '1. 基本方針',
      body: 'ポップ・リマインダーは、忘れたくないことを気軽に残すための個人開発アプリです。ユーザーのプライバシーを大切にし、必要以上の情報を取得しない方針で運営します。',
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
    body: 'ポップ・リマインダーは、忘れたくないことを気軽に残すための個人開発アプリです。本アプリを利用することで、この利用規約に同意したものとします。',
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
  updatedAt: '2026年6月25日',
  sections: termsSections,
};

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
  const [notificationPermissionLabel, setNotificationPermissionLabel] = useState('確認が必要');
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] = useState(false);
  const [canAskNotificationPermissionAgain, setCanAskNotificationPermissionAgain] = useState(true);
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const [isBackButtonPressed, setIsBackButtonPressed] = useState(false);
  const backPressTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setPreviousTime(settings.previousNotifyTime);
  }, [settings]);

  useEffect(() => {
    void refreshNotificationPermissionStatus();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void refreshNotificationPermissionStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (backPressTimeoutRef.current) {
        clearTimeout(backPressTimeoutRef.current);
      }
    };
  }, []);

  const refreshNotificationPermissionStatus = async () => {
    const permission = await getNotificationPermissionStatus();
    setNotificationPermissionLabel(permission.label);
    setIsNotificationPermissionGranted(permission.status === 'granted');
    setCanAskNotificationPermissionAgain(permission.canAskAgain);
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
          style={({ pressed }) => [
            styles.iconButton,
            pressed || isBackButtonPressed ? styles.iconButtonPressed : null,
          ]}
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
                thumbColor={
                  settings.notificationSoundEnabled ? palette.lavenderDeep : palette.white
                }
              />
            </SettingRow>
            <View style={styles.divider} />
            <SettingRow
              icon="notifications-outline"
              title="通知権限"
              caption="端末の通知設定と連動します"
            >
              <Text style={styles.permissionLabel}>{notificationPermissionLabel}</Text>
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
                  style={styles.notificationButton}
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
                    style={styles.notificationButtonText}
                  >
                    {canAskNotificationPermissionAgain
                      ? '通知権限をリクエスト'
                      : '端末の通知設定を開く'}
                  </Text>
                </Pressable>
                <View style={styles.divider} />
              </>
            ) : (
              <View style={styles.divider} />
            )}
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
            <SettingRow
              icon="color-palette-outline"
              title="テーマ"
              labelFlex={0.36}
              controlFlex={0.64}
            >
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
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={[styles.themeLabel, active ? styles.themeLabelActive : null]}
                      >
                        {themeLabels[theme]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SettingRow>
          </View>

          <View style={styles.group}>
            <SettingRow
              icon="shield-checkmark-outline"
              title="プライバシーポリシー"
              caption="保存データと通知権限について"
              onPress={() => setLegalDocument(privacyPolicyDocument)}
            >
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </SettingRow>
            <View style={styles.divider} />
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
              <Pressable
                accessibilityRole="button"
                onPress={handleSendTestNotification}
                style={styles.devButton}
              >
                <Ionicons name="paper-plane-outline" size={18} color={palette.white} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={styles.devButtonText}
                >
                  テスト通知を送る
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleCancelAllNotifications}
                style={[styles.devButton, styles.cancelButton]}
              >
                <Ionicons name="close-circle-outline" size={18} color={palette.ink} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={styles.cancelButtonText}
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
        onChange={handleTimePickerChange}
        onClose={() => setIsPreviousTimePickerOpen(false)}
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
      <View style={styles.modalBackdrop}>
        <View style={styles.legalModal}>
          <View style={styles.legalModalHeader}>
            <View style={styles.legalModalCopy}>
              <Text numberOfLines={2} style={styles.legalModalTitle}>
                {document?.title}
              </Text>
              <Text numberOfLines={1} style={styles.legalModalUpdated}>
                最終更新日: {document?.updatedAt}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="閉じる"
              hitSlop={8}
              onPress={onClose}
              style={styles.legalCloseButton}
            >
              <Ionicons name="close" size={20} color={palette.ink} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.legalModalContent}
            showsVerticalScrollIndicator={false}
          >
            {document?.sections.map((section) => (
              <View key={section.title} style={styles.legalSection}>
                <Text style={styles.legalSectionTitle}>{section.title}</Text>
                <Text style={styles.legalBody}>{section.body}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  iconButtonPressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }, { scale: 0.94 }],
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  themeRow: {
    flexShrink: 1,
    minWidth: 0,
    width: '100%',
    flexDirection: 'row',
    gap: 6,
  },
  themeButton: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 11,
    fontWeight: '800',
    includeFontPadding: false,
  },
  themeLabelActive: {
    color: palette.white,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(38,49,81,0.26)',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  legalModal: {
    maxHeight: '84%',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingTop: 18,
    paddingHorizontal: 18,
    shadowColor: '#7DB5E8',
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
  },
  legalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220,233,247,0.78)',
  },
  legalModalCopy: {
    flex: 1,
    minWidth: 0,
  },
  legalModalTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  legalModalUpdated: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  legalCloseButton: {
    flexShrink: 0,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6FAFF',
    borderWidth: 1,
    borderColor: palette.line,
  },
  legalModalContent: {
    paddingTop: 6,
    paddingBottom: 24,
  },
  legalSection: {
    marginTop: 12,
  },
  legalSectionTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 5,
  },
  legalBody: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 21,
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
  notificationButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginLeft: 46,
    marginBottom: 12,
    backgroundColor: palette.skyDeep,
  },
  notificationButtonText: {
    flexShrink: 1,
    color: palette.white,
    fontSize: 14,
    fontWeight: '800',
    includeFontPadding: false,
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
    flexShrink: 1,
    color: palette.white,
    fontSize: 14,
    fontWeight: '800',
    includeFontPadding: false,
  },
  cancelButton: {
    backgroundColor: 'rgba(246,250,255,0.96)',
    borderWidth: 1,
    borderColor: palette.line,
  },
  cancelButtonText: {
    flexShrink: 1,
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
    includeFontPadding: false,
  },
});
