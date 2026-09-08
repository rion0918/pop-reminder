import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import {
  RaiseToSpeakIntroModal,
  type RaiseToSpeakCalibrationPhase,
} from '../../reminders/components/RaiseToSpeakIntroModal';
import {
  useRaiseToSpeakGesture,
  type RaiseToSpeakGestureStopReason,
} from '../../reminders/hooks/useRaiseToSpeakGesture';
import { useAppServices } from '../../../bootstrap/appServicesContext';
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
const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';
const supportContact = supportEmail || 'rion.developer.apps@gmail.com';

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
  updatedAt: '2026年9月7日',
  sections: [
    {
      title: '1. 基本方針',
      body: '「ふわっと。」は、忘れたくないことを気軽に残すための個人開発アプリです。本ポリシーは、本アプリで取り扱う情報、その利用目的、保存・削除方法を説明します。運営者と連絡先は末尾に記載しています。',
    },
    {
      title: '2. 端末内に保存する情報',
      body: 'リマインダーの表示・編集・通知・整理のため、タイトル、日時、リマインダーID、通知ID、作成・更新日時、期限・状態を端末内に保存します。テーマ、時刻プリセット、自動整理、音声入力、分析への同意などの設定も保存します。購入管理SDKの識別子・購入状態のキャッシュ、同意後の分析用識別子・未送信イベントも端末内に保存される場合があります。ログイン・アカウント作成機能や、開発者によるリマインダーの外部サーバー同期はありません。OSのバックアップ設定によっては、端末内のデータがバックアップの対象となり、復元される場合があります。バックアップの管理・削除はOSやバックアップサービスの設定から行ってください。',
    },
    {
      title: '3. 通知権限とWidget',
      body: '本アプリは、端末の通知権限を利用し、端末内で予約するローカル通知を表示します。通知の本文にはリマインダーのタイトルが含まれ、OS設定によってはロック画面にも表示されます。Androidのホーム画面に設置したWidgetには、タイトルや日時が表示されます。周囲から見える範囲は、通知の表示設定やWidgetの配置・削除で調整してください。通知権限は端末の設定からいつでも変更できます。通知の表示・時刻・音は、OS設定、集中モード、通知チャンネル、省電力設定、端末の状態などにより予定どおりにならない場合があります。',
    },
    {
      title: '4. 音声入力とセンサーについて',
      body: '音声入力にマイクを、「左右に傾けて音声入力」にマイクとモーション（加速度など）を利用します。通常のマイクボタンはユーザーが押した場合だけ動作します。「左右に傾けて音声入力」は初期状態でOFFであり、案内または設定画面から明示的に有効化した場合だけ、アプリを操作している間の傾きを検出します。設定画面から停止でき、マイクなどの権限は端末の設定から変更できます。音声認識は端末内で日本語を文字へ変換します。音声、録音、モーション値を保存、分析、外部送信しません。文字起こしからタイトルと日時の候補を端末内で読み取り、追加画面に反映します。ユーザーが認識結果と日時を確認して「追加」を押した場合に、リマインダーとして保存します。文字起こしを分析、外部送信することはありません。AndroidではOSの端末内音声認識またはアプリに同梱した認識用モデルを使用します。準備時にOSの認識用モデルのダウンロードが発生する場合があり、その通信はOSや音声認識サービスの提供者が処理します。音声認識のために音声や文字起こしをクラウドへ送信する機能は使用しません。',
    },
    {
      title: '5. 匿名の利用状況について',
      body: '品質改善のためPostHogの解析SDKを使用し、明示的な同意後に利用状況をPostHog の US Cloud（米国）へ送信します。初期状態は無効・未選択で、設定画面の「匿名の利用状況を共有」からいつでも停止・再開できます。共有しなくてもリマインダーの基本機能を利用できます。SDKが生成する匿名ID、イベントの発生時刻・識別子、SDK名・バージョンと、次の画面表示・操作結果を送信します。匿名IDは氏名やメールアドレスに紐付けませんが、同じアプリ利用のイベントを関連付けるための識別子です。対象は、ホーム・一覧・設定の画面表示、追加画面を開いた経路、作成・編集・削除の成功、日付プリセットの種類、編集箇所、削除件数、通知予約の成否・理由、通知権限の再確認可否、無料上限への到達経路、購入画面と購入復元の結果です。PostHogへの分析データに、リマインダーのタイトル、リマインダーID、具体的な日付・時刻、設定値、価格、ストア取引ID、ディープリンクURLは送信しません。音声・録音・文字起こし・モーション値、端末モデル・OS・ロケールも含めません。タッチ操作の自動収集、セッションリプレイ、クラッシュの自動収集、位置情報の推定、リモートFeature Flag、広告SDKは使用しません。通信先には接続に必要なIPアドレスが伝わります。アプリからIPアドレスを分析イベントの項目として追加せず、SDKの位置情報推定を無効にしています。',
    },
    {
      title: '6. 利用状況計測の停止と保持期間',
      body: '収集したイベントの通常保持期間は12か月です。期間経過後に削除します。設定画面から同意を撤回すると、それ以降の分析データの送信を停止できます。同意の撤回だけでは収集済みイベントは削除されません。匿名の分析イベントについて個別削除依頼の受付は提供していません。',
    },
    {
      title: '7. アプリ内購入について',
      body: '買い切りの「Pro版ふわっと。」の提供、購入権利の確認・復元、不正防止、売上分析のため、RevenueCatの購入管理SDKとApple App StoreまたはGoogle Playを利用します。購入管理は分析への同意とは別に動作し、購入前でもアプリ起動時からRevenueCatへ接続して識別子や購入権利の状態を処理します。分析の共有をOFFにしても、この購入管理の通信は停止しません。RevenueCatにはSDKが生成する匿名購入ID、購入商品・履歴、レシートまたは購入トークン、購入・復元・権利状態、最終接続時刻、OSなどの技術情報が送信されます。RevenueCatは取引国、または通信時のIPアドレスから推定する国を処理します。RevenueCatの説明では、国の推定後にIPアドレス自体は破棄されます。リマインダーのタイトル、ID、日時、音声・文字起こしは購入管理へ送信しません。決済は各ストアが処理し、開発者がクレジットカード番号を取得することはありません。購入記録は購入権利の維持・復元に必要な期間、ならびに不正防止・会計・法令対応に必要な期間保持されます。アプリをアンインストールしても、RevenueCatやストアにある購入記録が自動で削除されるわけではありません。購入権利は購入時と同じストアアカウントで復元できます。AndroidとiOSの間で購入権利は共有されません。',
    },
    {
      title: '8. データの削除',
      body: 'リマインダーはアプリ内やAndroidのWidgetの削除操作で削除できます。自動整理は初期状態でONであり、予定日の終了後、アプリの起動時などの整理処理で期限切れデータを削除します。OFFにした場合は、手動で削除するまで期限切れデータを端末内に保持します。AndroidのOS設定で本アプリのストレージを消去するか、アプリをアンインストールすると、端末内のデータはOSの仕様に従って削除されます。バックアップ上のデータは別途管理が必要で、復元時に戻る場合があります。開発者はリマインダーのコピーを保有していないため、失われたリマインダーを復元できません。分析データの削除は前記の保持期間に従います。購入記録や取引情報には、購入権利の維持と各サービスのポリシー、法令上の保存義務が適用されます。本アプリには独自のユーザーアカウントがないため、アカウント削除機能はありません。データの取り扱いに関する相談は末尾のメールアドレスへご連絡ください。',
    },
    {
      title: '9. 外部サービスと安全管理',
      body: 'PostHogとRevenueCatは、上記の分析・購入管理を行うサービス提供者として利用します。これらの通信はHTTPSで暗号化します。端末内データはアプリの保存領域で管理し、OSのアクセス制御を利用します。問い合わせへの対応で受け取ったメールアドレス、問い合わせ内容、任意の添付情報は、返信・調査・対応記録のために必要な範囲・期間で取り扱います。PostHog の US Cloudのデータは米国で処理されます。RevenueCatやストア、OSのバックアップ・モデル配信、メールサービスでは、日本国外で処理される場合があります。各サービスの取り扱いは以下もご確認ください。PostHog: https://posthog.com/privacy RevenueCat: https://www.revenuecat.com/privacy Google: https://policies.google.com/privacy?hl=ja Apple: https://www.apple.com/legal/privacy/jp/',
    },
    {
      title: '10. ポリシーの変更',
      body: '法令やサービス内容の変更に応じて本ポリシーを変更する場合があります。重要な変更はアプリ内または配布ページなどでお知らせし、新たな同意が必要な場合は取得します。',
    },
    {
      title: '11. 運営者・お問い合わせ',
      body: `運営者：Rion（個人開発）。本ポリシーに関するお問い合わせは、${supportContact} へご連絡ください。Google PlayやApp Storeなどの配布ページにも同じ連絡先を掲載します。`,
    },
  ],
};

const termsSections = [
  {
    title: '1. はじめに',
    body: '「ふわっと。」は、忘れたくないことを気軽に残すための個人開発アプリです。本アプリを利用することで、この利用規約に同意したものとします。利用状況の分析への同意は別途選択でき、本規約への同意だけで分析を開始することはありません。',
  },
  {
    title: '2. ご利用について',
    body: 'リマインダーの登録、表示、お知らせは、端末の状態やOSの仕様により予定どおり動作しない場合があります。大切な予定や安全に関わる用途では、他の確認手段もあわせてご利用ください。音声入力ではタイトルと日時の候補を読み取りますが、認識結果と日時を確認してから追加してください。',
  },
  {
    title: '3. データの取り扱い',
    body: '登録したリマインダーや設定は、お使いの端末内に保存されます。現時点ではログイン機能や登録データの外部サーバーへの同期はありません。OSのバックアップ設定によっては端末バックアップの対象となり、復元される場合があります。アプリの削除や端末の初期化により、保存データが失われる場合があります。自動整理は初期状態でONであり、予定日の終了後、アプリ起動時などに期限切れデータを削除します。残したい場合は設定画面でOFFにしてください。開発者は削除されたリマインダーを復元できません。詳しくはプライバシーポリシーをご確認ください。',
  },
  {
    title: '4. 通知について',
    body: '本アプリは、端末の通知権限を利用してお知らせを表示します。通知の表示や通知音は、OS設定、集中モード、通知チャンネル、省電力設定、端末の状態などの影響を受ける場合があります。',
  },
  {
    title: '5. アプリ内購入',
    body: '無料版では、現在時刻より後に通知予定がある有効なリマインダーを同時に6件まで登録できます。期限切れまたは削除済みのリマインダーは、この件数に含まれません。「Pro版ふわっと。」は、ストアに表示される価格で忘れたくないことを無制限に追加できる買い切り商品です。自動更新はありません。購入前にストアの購入画面で価格と内容をご確認ください。購入・復元・権利確認には通信が必要になる場合があります。購入の請求、返金、取消はApple App StoreまたはGoogle Playの規約に従います。購入権利は購入時と同じストアアカウントで復元できますが、AndroidとiOSの間では共有されません。返金や取消が確認された場合、Pro機能は利用できなくなります。6件を超えて登録済みのデータを削除・非表示にはしませんが、新しいリマインダーの追加が制限される場合があります。',
  },
  {
    title: '6. 禁止事項',
    body: '法令に違反する行為、本アプリの運営を妨害する行為、不正な方法で購入権利や機能を取得・利用する行為、その他開発者が不適切と判断する行為を禁止します。',
  },
  {
    title: '7. 提供内容の変更・終了',
    body: '保守、障害、法令対応などのため、本アプリの全部または一部を変更・停止・終了する場合があります。初期のPro購入者には、購入が有効である限り「忘れたくないことを無制限に追加できる機能」を提供します。',
  },
  {
    title: '8. 免責事項',
    body: '開発者は、通知の到達時刻や音声認識の正確性、データの永続的な保存を保証するものではありません。本アプリに関連して開発者が負う損害賠償責任は、消費者契約法その他の適用法令に従います。本規約は、法令により認められる利用者の権利を制限するものではありません。',
  },
  {
    title: '9. 規約の変更',
    body: '必要に応じて、この利用規約を変更することがあります。重要な変更がある場合は、アプリ内または配布ページなどで分かりやすくお知らせします。',
  },
  {
    title: '10. 準拠法',
    body: '本規約は日本法に準拠します。',
  },
  {
    title: '11. お問い合わせ',
    body: `運営者：Rion（個人開発）。本規約に関するお問い合わせは、${supportContact}へご連絡ください。Google PlayやApp Storeなどの配布ページにも同じ連絡先を掲載します。`,
  },
];

const termsDocument: LegalDocument = {
  title: '利用規約',
  updatedAt: '2026年9月7日',
  sections: termsSections,
};

const thirdPartyLicensesDocument: LegalDocument = {
  title: '第三者ライセンス',
  updatedAt: '2026年8月31日',
  sections: [
    {
      title: 'Moonshine Tiny JA',
      body: '短い音声入力の認識には、Moonshine Tiny JAモデルを使用しています。Powered by Moonshine AI。モデルのライセンス全文はアプリに同梱しています。',
    },
    {
      title: 'react-native-sherpa-onnx',
      body: 'Androidの端末内音声認識ランタイムには、MIT Licenseのreact-native-sherpa-onnxを使用しています。',
    },
  ],
};

export function SettingsScreen() {
  const router = useRouter();
  const { reminders: reminderServices, analytics, purchases } = useAppServices();
  const raiseToSpeak = useAppServices().raiseToSpeak;
  const { proAccessState, isProAccessLoading, refreshProAccess } = useProAccessQuery();
  const {
    settings,
    loading,
    refresh: refreshSettings,
    update,
    updateAnalyticsConsent,
    updatePreviousNotifyTime,
    isUpdatingPreviousNotifyTime,
  } = useAppSettings();
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
  const [isRaiseToSpeakSetupBusy, setIsRaiseToSpeakSetupBusy] = useState(false);
  const [isRaiseToSpeakCalibrating, setIsRaiseToSpeakCalibrating] = useState(false);
  const [raiseToSpeakCalibrationPhase, setRaiseToSpeakCalibrationPhase] =
    useState<RaiseToSpeakCalibrationPhase>('intro');
  const [raiseToSpeakSetupMessage, setRaiseToSpeakSetupMessage] = useState<string | null>(null);
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
    if (!settings) return;
    setIsAnalyticsEnabled(settings.analyticsConsent === 'granted');
    setIsAnalyticsPreferenceLoading(false);
  }, [settings]);

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
    if (!analytics.configured || isAnalyticsPreferenceLoading || !settings) return;

    setIsAnalyticsPreferenceLoading(true);
    const nextConsent = value ? 'granted' : 'denied';
    try {
      await updateAnalyticsConsent(nextConsent);
      setIsAnalyticsEnabled(value);
    } catch {
      await refreshSettings();
      Alert.alert('設定を変更できませんでした', '時間をおいてもう一度お試しください。');
    } finally {
      setIsAnalyticsPreferenceLoading(false);
    }
  };

  const handleRaiseToSpeakEnabledChange = async (enabled: boolean) => {
    if (isRaiseToSpeakUpdatePending) return;
    if (!settings) return;

    setIsRaiseToSpeakUpdatePending(true);
    try {
      if (!enabled) {
        setIsRaiseToSpeakCalibrating(false);
        setRaiseToSpeakCalibrationPhase('intro');
        setRaiseToSpeakSetupMessage(null);
        await update({ raiseToSpeakEnabled: false, raiseToSpeakIntroSeen: true });
        return;
      }

      if (!settings.raiseToSpeakIntroSeen) {
        await update({ raiseToSpeakEnabled: true });
        return;
      }

      const result = await raiseToSpeak.prepare();
      if (result.status === 'ready') {
        await update({ raiseToSpeakEnabled: true, raiseToSpeakIntroSeen: true });
        return;
      }

      if (result.status === 'permission-denied') {
        setRaiseToSpeakCalibrationPhase('intro');
        const permissionLabel = Platform.OS === 'android' ? 'マイク' : 'マイクとモーション';
        const actions = result.canAskAgain
          ? [{ text: 'OK' }]
          : [
              { text: 'あとで', style: 'cancel' as const },
              { text: '設定を開く', onPress: () => void handleOpenAppSettings() },
            ];
        Alert.alert(
          '権限が必要です',
          `${permissionLabel}の権限を許可すると利用できます。`,
          actions,
        );
        return;
      }

      const message = {
        'motion-unavailable': 'この端末ではモーション検出を利用できません。',
        'model-unavailable':
          '音声モデルを読み込めません。アプリを再起動するか、手入力を利用してください。',
        'speech-unavailable':
          'この端末では日本語の端末内音声認識を利用できません。手入力をご利用ください。',
      }[result.status];
      Alert.alert('左右に傾けて音声入力を利用できません', message);
    } catch (error) {
      console.warn('Failed to update raise-to-speak setting', error);
      Alert.alert('設定を変更できませんでした', '時間をおいてもう一度お試しください。');
    } finally {
      setIsRaiseToSpeakUpdatePending(false);
    }
  };

  const handleDismissRaiseToSpeakIntro = useCallback(() => {
    if (isRaiseToSpeakSetupBusy) return;

    setRaiseToSpeakSetupMessage(null);
    setIsRaiseToSpeakCalibrating(false);
    setRaiseToSpeakCalibrationPhase('intro');
    void update({ raiseToSpeakEnabled: false, raiseToSpeakIntroSeen: false });
  }, [isRaiseToSpeakSetupBusy, update]);

  const handlePrepareRaiseToSpeak = useCallback(async () => {
    if (isRaiseToSpeakSetupBusy) return;

    setIsRaiseToSpeakSetupBusy(true);
    setRaiseToSpeakCalibrationPhase('preparing');
    setRaiseToSpeakSetupMessage(null);
    try {
      const result = await raiseToSpeak.prepare();
      if (result.status === 'ready') {
        setIsRaiseToSpeakCalibrating(true);
        setRaiseToSpeakCalibrationPhase('awaiting-tilt');
        return;
      }

      if (result.status === 'permission-denied') {
        const permissionLabel = Platform.OS === 'android' ? 'マイク' : 'マイクとモーション';
        const message = result.canAskAgain
          ? `${permissionLabel}の権限を許可してください。`
          : `端末の設定で${permissionLabel}の権限を許可してください。`;
        setRaiseToSpeakSetupMessage(message);
        if (!result.canAskAgain) {
          Alert.alert('権限が必要です', message, [
            { text: 'あとで', style: 'cancel' },
            { text: '設定を開く', onPress: () => void Linking.openSettings() },
          ]);
        }
        return;
      }

      const message = {
        'motion-unavailable': 'この端末ではモーション検出を利用できません。',
        'model-unavailable':
          '音声モデルを読み込めません。アプリを再起動するか、手入力を利用してください。',
        'speech-unavailable': 'この端末では日本語の端末内音声認識を利用できません。',
      }[result.status];
      setRaiseToSpeakCalibrationPhase('intro');
      setRaiseToSpeakSetupMessage(message);
    } catch {
      setRaiseToSpeakCalibrationPhase('intro');
      setRaiseToSpeakSetupMessage('音声入力の準備を完了できませんでした。');
    } finally {
      setIsRaiseToSpeakSetupBusy(false);
    }
  }, [isRaiseToSpeakSetupBusy, raiseToSpeak]);

  const handleRaiseToSpeakCalibrationStart = useCallback(() => {
    if (
      !isRaiseToSpeakCalibrating ||
      isRaiseToSpeakSetupBusy ||
      raiseToSpeakCalibrationPhase !== 'awaiting-tilt'
    ) {
      return;
    }

    setRaiseToSpeakCalibrationPhase('awaiting-upright');
    setRaiseToSpeakSetupMessage(null);
    void Haptics.selectionAsync().catch(() => {});
  }, [isRaiseToSpeakCalibrating, isRaiseToSpeakSetupBusy, raiseToSpeakCalibrationPhase]);

  const handleRaiseToSpeakCalibrationStop = useCallback(
    async (reason: RaiseToSpeakGestureStopReason) => {
      if (
        !isRaiseToSpeakCalibrating ||
        isRaiseToSpeakSetupBusy ||
        raiseToSpeakCalibrationPhase !== 'awaiting-upright'
      ) {
        return;
      }

      if (reason !== 'portrait') {
        setRaiseToSpeakCalibrationPhase('awaiting-tilt');
        setRaiseToSpeakSetupMessage('いったん縦に戻して、もう一度傾けてください。');
        return;
      }

      setIsRaiseToSpeakSetupBusy(true);
      setRaiseToSpeakCalibrationPhase('saving');
      try {
        await update({
          raiseToSpeakEnabled: true,
          raiseToSpeakIntroSeen: true,
        });
        setIsRaiseToSpeakCalibrating(false);
        setRaiseToSpeakCalibrationPhase('success');
        setRaiseToSpeakSetupMessage(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {
        setIsRaiseToSpeakCalibrating(false);
        setRaiseToSpeakCalibrationPhase('intro');
        setRaiseToSpeakSetupMessage('設定を保存できませんでした。もう一度お試しください。');
      } finally {
        setIsRaiseToSpeakSetupBusy(false);
      }
    },
    [isRaiseToSpeakCalibrating, isRaiseToSpeakSetupBusy, raiseToSpeakCalibrationPhase, update],
  );

  const {
    sensorStatus: raiseToSpeakSensorStatus,
    sensorFailureReason: raiseToSpeakSensorFailureReason,
    retrySensor: retryRaiseToSpeakSensor,
    tiltProgress: raiseToSpeakTiltProgress,
  } = useRaiseToSpeakGesture({
    enabled: isRaiseToSpeakCalibrating,
    blocked: isRaiseToSpeakSetupBusy,
    trackTiltProgress: isRaiseToSpeakCalibrating,
    onStart: handleRaiseToSpeakCalibrationStart,
    onStop: handleRaiseToSpeakCalibrationStop,
  });

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
    <AppScreen theme={settings?.theme ?? 'lavender'}>
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
              {!isProAccessLoading && proAccessState === 'free' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="購入済みの方はこちら（購入を復元）"
                  accessibilityState={{ disabled: isPurchaseActionPending }}
                  disabled={isPurchaseActionPending}
                  onPress={() => void handleRestoreProPurchase()}
                  className="items-center py-[8px]"
                  style={({ pressed }) => [pressed ? styles.timeValueButtonPressed : null]}
                >
                  <Text className="text-[12px] font-semibold text-app-muted underline">
                    購入済みの方はこちら
                  </Text>
                </Pressable>
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
              icon="notifications-outline"
              title="通知"
              onPress={handleOpenAppSettings}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="通知設定を開く"
                onPress={() => void handleOpenAppSettings()}
                hitSlop={4}
                className="flex-row items-center gap-[8px] rounded-[14px]"
                style={({ pressed }) => [pressed ? styles.timeValueButtonPressed : null]}
              >
                <View
                  className={
                    isNotificationPermissionGranted
                      ? 'flex-row items-center gap-[5px] rounded-[12px] bg-[#E9F8F1] px-[9px] py-[7px]'
                      : 'flex-row items-center gap-[5px] rounded-[12px] bg-[#FFF4E7] px-[9px] py-[7px]'
                  }
                >
                  <Ionicons
                    name={
                      isNotificationPermissionGranted
                        ? 'checkmark-circle'
                        : 'alert-circle-outline'
                    }
                    size={16}
                    color={
                      isNotificationPermissionGranted ? palette.mintDeep : palette.peachDeep
                    }
                  />
                  <Text
                    className={
                      isNotificationPermissionGranted
                        ? 'text-[12px] font-black text-app-mint-deep'
                        : 'text-[12px] font-black text-app-peach-deep'
                    }
                >
                  {notificationPermissionLabel}
                </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </Pressable>
            </SettingRow>
            {!isNotificationPermissionGranted ? (
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
                    canAskNotificationPermissionAgain ? 'notifications-outline' : 'settings-outline'
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
            ) : null}
            <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
            <SettingRow
              icon="hourglass-outline"
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
              title="左右に傾けて音声入力"
              onPress={() => void handleRaiseToSpeakEnabledChange(!settings.raiseToSpeakEnabled)}
            >
              {isRaiseToSpeakUpdatePending ? (
                <ActivityIndicator size="small" color={palette.lavenderDeep} />
              ) : (
                <Switch
                  accessibilityLabel="左右に傾けて音声入力"
                  value={settings.raiseToSpeakEnabled}
                  onValueChange={(value) => void handleRaiseToSpeakEnabledChange(value)}
                  trackColor={{ false: '#DDE7F4', true: '#D8CCFF' }}
                  thumbColor={settings.raiseToSpeakEnabled ? palette.lavenderDeep : palette.white}
                />
              )}
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
            <View className="ml-[46px] h-px bg-[rgba(220,233,247,0.78)]" />
            <SettingRow
              icon="information-circle-outline"
              title="第三者ライセンス"
              onPress={() => setLegalDocument(thirdPartyLicensesDocument)}
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
      <RaiseToSpeakIntroModal
        visible={Boolean(
          settings?.raiseToSpeakEnabled &&
          (!settings.raiseToSpeakIntroSeen || raiseToSpeakCalibrationPhase === 'success'),
        )}
        busy={isRaiseToSpeakSetupBusy}
        phase={raiseToSpeakCalibrationPhase}
        message={raiseToSpeakSetupMessage}
        sensorStatus={raiseToSpeakSensorStatus}
        sensorFailureReason={raiseToSpeakSensorFailureReason}
        tiltProgress={raiseToSpeakTiltProgress}
        onEnable={() => void handlePrepareRaiseToSpeak()}
        onDismiss={handleDismissRaiseToSpeakIntro}
        onRetry={retryRaiseToSpeakSensor}
        onSuccessComplete={() => setRaiseToSpeakCalibrationPhase('intro')}
      />
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
