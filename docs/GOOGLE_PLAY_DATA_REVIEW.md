# Google Play 公開前のデータ取り扱い確認

確認日: 2026年9月7日。アプリのコードと導入済みSDKを確認した記録です。Play Console・PostHog・RevenueCatの管理画面、本番AABの通信は未確認です。

## 公開文書

- 運営者: Rion（個人開発）
- 問い合わせ先: rion.developer.apps@gmail.com
- 公開用: [プライバシーポリシー](privacy/index.html)、[利用規約](terms/index.html)
- アプリ内: 設定画面の「プライバシーポリシー」「利用規約」
- 公開予定URL: [プライバシーポリシー](https://rion0918.github.io/pop-reminder/privacy/)、[利用規約](https://rion0918.github.io/pop-reminder/terms/)
- PostHogの12か月での削除運用は、2026年9月7日に運営者が確認済みと回答。

## 実装と記載の対応

| 処理                   | 確認した実装                                                                                                              | 文書に反映した内容                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 端末内の保存           | `src/db/schema.ts`、`src/features/settings/domain/appSettings.ts`                                                         | タイトル・日時・各ID・作成更新日時・状態・設定、SDKのローカル保存                                 |
| 自動整理               | `src/features/reminders/application/reminderUseCases.ts`、`src/features/reminders/domain/reminderSchedule.ts`             | 初期ON、予定日の終了後に起動時などの整理処理で削除、OFFなら保持                                   |
| 通知・Widget           | `src/lib/notifications/reminderNotifications.ts`、`src/widget/PopReminderWidget.tsx`                                      | ローカル通知、ロック画面の本文、ホーム画面のタイトル・日時、Widgetでの削除                        |
| 音声入力               | `src/lib/voice-input/voiceInputServiceCore.ts`、`androidOnDeviceVoiceInputServiceCore.ts`、`voiceInputService.android.ts` | 端末内認識、録音非保存、OSモデル取得時の通信、同梱モデルへの切り替え                              |
| 音声から日時を読み取る | `src/features/reminders/domain/voiceReminderParser.ts`、`presentation/voiceReminderSchedule.ts`                           | タイトルと日時の候補を端末内で生成し、確認・追加後に保存                                          |
| センサー               | `src/features/reminders/hooks/useRaiseToSpeakGesture.ts`                                                                  | 明示的な有効化、前面での傾き検出、値の非保存・非送信                                              |
| 利用状況分析           | `src/lib/analytics/posthogAnalytics.ts`、`analyticsService.ts`                                                            | 同意後のみの収集、匿名ID、イベント日時・識別子・SDK情報、許可した操作結果                         |
| 位置推定の抑止         | `posthogAnalytics.ts`と導入済みPostHog SDK                                                                                | SDKが付けた`$geoip_disable`が送信前フィルターで消えていたため、保持するよう修正。回帰テストで確認 |
| 購入管理               | `src/bootstrap/appInitialization.ts`、`src/features/purchases/infrastructure/revenueCatPurchaseService.native.ts`         | 起動時の初期化、購入前の通信、分析同意と独立した処理、匿名購入ID・購入履歴等                      |
| OSバックアップ         | `android/app/src/main/AndroidManifest.xml`の`allowBackup="true"`                                                          | OSの設定次第でバックアップ・復元、アンインストールだけではバックアップは消えない                  |

## Data safety の回答根拠

「収集なし」にはできません。GoogleはSDK経由や仮名IDの端末外送信も収集に含めます。端末内だけで処理する音声やリマインダー本文は、端末外送信の収集申告には含めません。[Googleの定義](https://support.google.com/googleplay/android-developer/answer/10787469?hl=ja)

- **App interactions**: PostHogの画面表示・操作結果。任意、目的はAnalytics。一時的処理ではない。
- **Device or other IDs**: PostHogの匿名IDに加え、RevenueCatの匿名購入IDも扱う。PostHogは任意だが、起動時に動作するRevenueCatには停止設定がないため、データ種別全体を「分析同意後のみ・任意」と断定しない。購入用識別子の分類と目的を本番SDK・Consoleの説明と照合する。
- **Purchase history**: RevenueCatが収集。目的はApp functionality / Analytics、一時的処理ではなく、収集を無効にする設定はない。[RevenueCatのGoogle Play向け案内](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety)
- **国情報**: RevenueCatは取引国、またはIPから推定した国を処理し、IPそのものは推定後に破棄すると説明している。PostHogの位置推定を無効にしたことだけで、アプリ全体の国情報処理まで否定しない。国だけの処理がConsoleの位置情報の分類に該当するか、対象SDKの案内と照合する。[RevenueCatの説明](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile)
- **共有**: 外部SDK利用だけで「共有あり／なし」を決めない。処理委託先の例外に該当する契約・用途を確認し、PostHogの配信先とRevenueCatの外部連携も含めて判定する。
- **削除**: アカウント作成なしと、収集データの削除リクエスト手段の有無は別の質問。現在は匿名分析イベントの個別削除受付を提供していない。問い合わせ用メールの掲載だけで削除手段を「あり」にしない。

## 提出前に残る確認

- [ ] 公開URLで最新版がログイン不要・地域制限なしで開け、メールリンクが使えること。HTMLを更新しただけでは公開先への反映は完了しない。[Googleの掲載要件](https://support.google.com/googleplay/android-developer/answer/10144311)
- [ ] 本番ビルドのサポートメールが上記と一致すること。`EXPO_PUBLIC_SUPPORT_EMAIL`を設定している場合は、アプリ内の既定値より優先される。
- [ ] 本番PostHogの送信先がUS Cloudであること。IPの保存設定・位置推定・外部配信先を確認し、同意前と撤回後に分析通信がないことを確認する。[PostHogのデータ収集設定](https://posthog.com/docs/privacy/data-collection)
- [ ] PostHogで、修正後のイベントに位置推定の無効指定が残り、リマインダー本文・予定日時・音声・端末モデルが届かないこと。過去のイベントに位置情報が付いていた場合は保存状況を確認し、削除・申告を整合させる。
- [ ] RevenueCatの本番キー、匿名ID、購入・復元、外部連携、購入記録の保持運用を確認する。SDK提供者のポリシーは運営者の対応責任の代わりにはならない。[RevenueCatの情報処理方針](https://www.revenuecat.com/privacy)
- [ ] 本番AABで権限と通信を確認する。現在ローカルにある結合済みManifestはdebug用であり、製品版の証拠には使わない。通知SDK由来のFirebase Messagingやダウンロード関連の宣言があるため、Firebase設定・プッシュトークンの自動生成などが本番で有効になっていないかも確認する。
- [ ] Google Playの商品が非消耗型の買い切りで、価格・特典・復元条件・法的文書リンクが購入画面と一致すること。

利用規約の免責文言は、消費者契約法などで認められる権利を制限しない内容に修正しました。[消費者庁の解説](https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/annotations/assets/consumer_system_cms203_230915_13.pdf)
