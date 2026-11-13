# Google Play 公開前のデータ取り扱い確認

2026年11月10日の更新: PostHogプロジェクトの保持期間を、運営者の明示確認後に12か月へ設定した。EAS productionにもPostHog公開SDKキーを登録。過去イベントの一括削除と最終AABの実通信確認は未実施。詳細は[最終確認記録](ANDROID_RELEASE_READINESS.md)を参照。

確認日: 2026年9月7日。アプリのコードと導入済みSDKを確認した記録です。本番AABの通信は未確認です。管理画面の追加確認は以下に記録します。

2026年10月16日の追加確認: 公開中の[プライバシーポリシー](https://rion0918.github.io/pop-reminder/privacy/)と[利用規約](https://rion0918.github.io/pop-reminder/terms/)を認証なしのHTTPS GETで取得し、両方のHTTP 200、リポジトリの対応HTMLとのSHA-256一致、問い合わせメールの`mailto:`リンクを確認しました。アプリ内からの両文書と問い合わせ先は、その後運営者が表示を確認しました。任意の別地域からの到達性検査と本番AABの全通信検査は実施していません。今回の進捗は[製品版アクセス申請の準備記録](GOOGLE_PLAY_PRODUCTION_ACCESS.md)を参照してください。

同日のPlay Console読み取り確認: 購入履歴・アプリ操作・デバイス等のIDをすべて任意収集と申告済み。購入履歴はアプリ機能・分析、残りは分析のみ。いずれも共有なし・一時的処理なしです。購入履歴の任意収集はRevenueCat有効化後の動作と整合しないため、購入用IDと外部連携の確認と合わせて修正が必要です。この確認では申告を保存・送信していません。

同日のRevenueCat確認: Play Store appの認証チェックが成功し、Google Play開発者通知のテスト受信も確認しました。Integrationsは`Active 0`で、PostHog・広告・Webhookを含め有効な外部連携はありません。EAS productionにはGoogle Play用のRevenueCat公開SDK keyだけを追加し、PostHogの変数は未設定です。対象AABの最終設定は下記の静的確認で照合し、端末の通信確認を残します。

同日の申告修正: 購入履歴を必須収集へ変更。デバイス等のIDも、常時起動する購入管理の匿名IDを含むため必須とし、アプリ機能の目的を追加しました。アプリ操作は任意・分析のままです。保存後、Alpha 46と合わせて審査へ送信。14時台に送信ID 9の詳細を確認し、2026年10月16日13:06（日本時間）にData safetyを含む4件の変更が「公開」になったことを確認しました。初回のSandbox購入・復元・返金取消は運営者の実機報告と両サービスの注文で照合済みです。全通信の検査は未実施で、当初の再購入成功報告は無料表示のため訂正し、その後17:32:29（日本時間）の新しいテスト注文を両サービスの注文ID・JPY 300と`pro`有効で照合しました。経緯は準備記録に残しています。

同日のストアURL照合: Play Consoleの「アプリのコンテンツ」に登録済みのプライバシーURLは`https://rion0918.github.io/pop-reminder/privacy/`で、確認済みの最新版と一致しました。ストアのウェブサイトは別の`https://fuwatto.pages.dev/`で、そちらの`/privacy`には「解析SDKを使用していない」旨の古い記載が残っています。別リポジトリ`rion0918/pop-reminder-website`に現行文書と揃える修正を用意し、サイト固有の待機リスト説明を残して既存チェック・ビルド・ローカル表示を確認済みですが、運営者の個別承認を受け、17:26（日本時間）ごろに公開反映しました。公式サイトのトップ・プライバシー・規約はcurl取得が成功し、Cloudflareの既存Web Analytics注入部だけを除いて承認済みHTMLと一致しました。Functions・D1・資産・設定は公開版から維持しています。[詳細](GOOGLE_PLAY_PRODUCTION_ACCESS.md#ストア掲載情報と案内サイトの確認)

同日のPostHog確認: プロジェクト`pop-reminder`（549328）の直近30日の442イベントは、すべてGeoIP無効指定があり、国・市・緯度・経度のプロパティは0件でした。一方、空でないIPアドレスは442件に保存されていました。運営者の承認を受け、11:59（日本時間）に今後のIP保存を停止する`anonymize_ips = true`へ変更し、再取得で保存を確認しました。既存データは削除していません。有効な外部向けHog Function destinationと未削除のbatch exportは0件。変更後の新規イベントと、12か月の保持・削除運用の確認は残ります。[PostHogのIP収集設定](https://posthog.com/docs/privacy/data-collection#ip-data-capture)

過去の保存データへの追加確認: プロジェクト作成日2026-08-09から2026-10-16 03:01 UTCまでの保存イベントは1,203件で、すべてIPを保持。うち189件に国・緯度・経度等があり、期間は2026-08-10～2026-09-07（UTC）でした。古いイベントには端末メーカー・端末名・OS・ロケール等の項目名も存在します。現在のSDKが抑止している項目と、過去に保存済みの項目を区別し、保持・削除・公開文書との整合を決める必要があります。個別の値は取得・記録していません。

versionCode 46のAAB追加確認: Google用のRevenueCat公開SDK keyを埋め込み済みで、Test Store keyとPostHog keyは含まれていません。Firebase MessagingのManifest宣言はありますが、デフォルトFirebase設定用の主要リソースはなく、アプリ側のプッシュトークン取得呼び出しも見当たりません。これは静的確認であり、端末上の通信確認の代わりにはしません。詳細とAABのハッシュは[準備記録](GOOGLE_PLAY_PRODUCTION_ACCESS.md)に記載しています。

2026年10月16日の実機QA・再購入後の追加集計: 同じプロジェクトの保存イベントは1,203件のまま。前回の03:01 UTC以降の追加は0件、最終イベントは2026-10-02 12:20:10.617 UTCでした。v46の分析無効設定と整合します。これは端末の全通信や、IP保存停止後の新規イベントの処理を直接検査したものではありません。

## 過去の分析データの削除準備（未実行）

2026年10月16日、運営者は過去の分析履歴を「不要（削除する方向で整理する）」と回答した。この回答は対象・手順の整理までであり、削除実行の承認ではない。その後、方法だけを問い合わせる文面の送信について別途承認を受け、下記のサポートチケットを作成した。データ削除は未実行。

### 対象と影響

対象プロジェクトはPostHogの`pop-reminder`（ID `549328`）。確認範囲はプロジェクト作成日の2026-08-09から2026-10-16 12:01（日本時間、03:01 UTC）より前まで。再確認時も、その時刻以降の追加イベントは0件だった。

| 対象                               | 確認件数                                                       | 削除手段の確認状況                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 対応するプロフィールがあるイベント | 804件・30個のdistinct ID                                       | `persons-bulk-delete`で関連イベントを含めて削除する設定がある                                                       |
| 対応するプロフィールがないイベント | 399件・15個のdistinct ID                                       | サポートが15個のdistinct IDに`$set`を送ってプロフィールを作成し、その後イベントごと削除する方法を案内。実行は未承認 |
| プロフィール                       | 30件。すべて対象イベントに対応し、うち10件に位置情報の項目あり | 上記のプロフィール削除の対象に含める案                                                                              |

イベント合計は1,203件で、すべてIPを保持し、うち189件に古い位置推定結果がある。distinct IDやプロフィール数を実在のテスター人数として扱わない。削除すると、この期間の利用件数・継続利用・購入導線などの集計根拠が失われ、既存グラフの過去の数値も変わる。元データのバックアップや個別のIP・位置情報の書き出しは作らない。

今回の案は分析イベントと対応するプロフィールを対象とする。端末のリマインダー、Google Play・RevenueCatの購入記録、Pro権利はこの削除操作の対象外。プロジェクト、SDK key、ダッシュボードやInsightの定義を削除する案ではない。

### サポート回答と実行前の手順（2026年10月17日更新）

[チケット #78114](https://us.posthog.com/project/549328/my-tickets?ticket=01a142ba-e63d-0000-0ea2-d30bfa591b06)で担当者Benからの回答を確認した。チケットは`pending`。サポートの説明は次のとおり。

- `persons/bulk_delete`は、プロフィールのあるdistinct IDだけを対象にする。
- プロフィールのない15個のdistinct IDへ`$set`イベントを送り、プロフィールを作成してから、全45個のdistinct IDを指定して`delete_events: true`で削除する。プロジェクト・token・Dashboard・Insightの定義は維持される。
- 削除は期間指定ではなく、指定したIDに紐付く全期間のイベントが対象。
- イベントの削除処理は土曜日22:00 UTC以降の週次処理で、完了までおよそ2週間を見込む。削除ステータスの`delete_verified_at`で検証し、バックアップからの削除にはさらに約2週間かかるとの案内。

接続ツールの`persons-bulk-delete`も、`ids`（person UUID）または`distinct_ids`のいずれかを指定でき、最大1,000件、`delete_events`の既定値はfalse、受付は202で不可逆と説明している。[Persons API](https://posthog.com/docs/api/persons)も参照。

2026年10月17日に既存の集計を再実行し、イベントは1,203件、2026-10-16 03:01 UTC以降の新着0件、最終イベントは2026-10-02 12:20:10.617 UTCであることを再確認した。個別のID・IP・位置情報の値は取得していない。

実行案:

1. 対象プロジェクト549328、1,203件の過去イベント、30プロフィール、プロフィールなし15 IDに対するプロフィール作成、その後の全期間削除、不可逆性と完了待ち期間を提示し、**削除実行の最終承認を受ける**。この段階では新しい`$set`も送信しない。
2. 実行直前にイベント件数・新着、30プロフィールと15 IDの対応を再確認する。新しい利用データが増えていた場合は対象を改めて提示し、承認範囲外のデータを削除しない。
3. 承認後、サポートが案内したプロフィール作成用イベントを、既存の15 IDだけに送る。氏名・メール・位置等の属性を追加せず、IDも新規に捏造しない。取り込みとプロフィール作成が完了したことを確認する。この操作に伴う追加データも削除対象として記録する。送信payloadは実行前にCapture APIの仕様と再照合する。
4. 45個の`distinct_ids`に対し、`delete_events: true`、`keep_person: false`を明示して`persons-bulk-delete`を呼ぶ。今回の対象はイベントとプロフィールであり、録画の削除は含めず`delete_recordings: false`とする。個別IDは取得と呼び出しの間だけリポジトリ外で扱い、文書へ保存しない。
5. `GET /api/projects/549328/persons/deletion_status/`を読み取り、対象の`delete_verified_at`を確認する。サポートの`status=pending`指定だけでは完了済み対象が表示から消える可能性もあるため、対象受付記録と完了レコードを対応付ける。受付202やプロフィールの消滅だけで、イベント削除まで完了したとは判断しない。
6. 下記の削除後条件を照合し、実施日時・結果・バックアップの扱いを残す。週次処理を待つ間にプロジェクト削除・再作成・部分的な削除で代替しない。[PostHogの削除案内](https://posthog.com/docs/privacy/data-storage#data-deletion)

これは確認できた方法を整理した実行案であり、**プロフィール作成・削除はいずれも未実施**。当初の「架空のプロフィールを作成して回避しない」という方針を、サポートが示した既存IDのプロフィール作成手順と区別する。新しい属性や架空IDの作成はこの案に含めない。

### PostHogサポートへの問い合わせ送信記録

運営者が「用意した文面で問い合わせる」と承認。2026年10月16日12:21（日本時間）、PostHogのアプリ内サポートへ次の本文を送信した。個別の分析ID、IP・位置情報の値、SDK key、添付ファイルは送っていない。

- [問い合わせチケット](https://us.posthog.com/project/549328/my-tickets?ticket=01a142ba-e63d-0000-0ea2-d30bfa591b06)
- 受付番号: `#78114`。チケットID: `01a142ba-e63d-0000-0ea2-d30bfa591b06`
- 送信直後の表示は`new`。送信本文がチケット内に表示されたことを確認。2026年10月16日17:16（日本時間）以降の再確認では未受領だったが、翌17日に上記の回答を確認した。
- 削除を実行せず、方法の案内だけを求める内容。サポートからの回答を確認し、対象・手順を確定してから削除の最終確認を行う。

送信本文:

> We would like instructions for deleting historical analytics data from the US Cloud project "pop-reminder" (project ID 549328), while preserving the project, token, and saved dashboard/insight definitions. Please do not execute deletion yet.
>
> The proposed scope is events from 2026-08-09 until 2026-10-16 03:01 UTC: 1,203 events in total. 804 events are associated with 30 existing person profiles; 399 events use 15 distinct IDs with no matching person profile. The historical data includes stored IP addresses, and 189 older events contain GeoIP fields.
>
> What is the supported way to delete all these events, including the 399 events without person profiles, and the associated 30 profiles? Does persons/bulk_delete with delete_events=true cover IDs with no person profile? How can we verify completion, and what deletion timelines apply to backups or other retained copies?

### 削除後の確認条件

- [ ] 対象期間の`events`が0件。対象期間のIP・GeoIPの項目を持つイベントも0件。
- [ ] 対象プロフィール30件がなくなり、関連する位置情報項目も照会できない。
- [ ] プロフィールなしの399件も0件。プロフィールの件数だけで完了としない。
- [ ] 同じプロジェクトと保存した集計定義が残っている。今後のIP保存停止設定`anonymize_ips = true`も維持されている。
- [ ] PostHogの受付結果、完了確認日時、バックアップ等の扱い、実行後の件数を値を含まない記録として残す。

サポートが示した方法と接続ツールの入力を照合し、上記の実行案を整理済み。最終承認、作成用イベントのpayload照合、削除実行と完了確認は未完了。アプリコードや依存関係を変える判断ではなく、今回限りの運用準備のため、新規ADRは追加しない。

## 公開文書

- 運営者: Rion（個人開発）
- 問い合わせ先: rion.developer.apps@gmail.com
- 公開用: [プライバシーポリシー](privacy/index.html)、[利用規約](terms/index.html)
- アプリ内: 設定画面の「プライバシーポリシー」「利用規約」
- 公開予定URL: [プライバシーポリシー](https://rion0918.github.io/pop-reminder/privacy/)、[利用規約](https://rion0918.github.io/pop-reminder/terms/)
- PostHogの12か月での削除運用は、2026年9月7日に運営者が確認済みと回答。

## 実装と記載の対応

| 処理                   | 確認した実装                                                                                                              | 文書に反映した内容                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 端末内の保存           | `src/db/schema.ts`、`src/features/settings/domain/appSettings.ts`                                                         | タイトル・日時・各ID・作成更新日時・状態・設定、SDKのローカル保存                                                |
| 自動整理               | `src/features/reminders/application/reminderUseCases.ts`、`src/features/reminders/domain/reminderSchedule.ts`             | 初期ON、予定日の終了後に起動時などの整理処理で削除、OFFなら保持                                                  |
| 通知・Widget           | `src/lib/notifications/reminderNotifications.ts`、`src/widget/PopReminderWidget.tsx`                                      | ローカル通知、ロック画面の本文、ホーム画面のタイトル・日時、Widgetでの削除                                       |
| 音声入力               | `src/lib/voice-input/voiceInputServiceCore.ts`、`androidOnDeviceVoiceInputServiceCore.ts`、`voiceInputService.android.ts` | OS標準認識（オンライン時はApple/Google処理の場合あり）、録音非保存、OSモデル取得時の通信、同梱モデルへの切り替え |
| 音声から日時を読み取る | `src/features/reminders/domain/voiceReminderParser.ts`、`presentation/voiceReminderSchedule.ts`                           | タイトルと日時の候補を端末内で生成し、確認・追加後に保存                                                         |
| センサー               | `src/features/reminders/hooks/useRaiseToSpeakGesture.ts`                                                                  | 明示的な有効化、前面での傾き検出、値の非保存・非送信                                                             |
| 利用状況分析           | `src/lib/analytics/posthogAnalytics.ts`、`analyticsService.ts`                                                            | 同意後のみの収集、匿名ID、イベント日時・識別子・SDK情報、許可した操作結果                                        |
| 位置推定の抑制         | `posthogAnalytics.ts`と導入済みPostHog SDK                                                                                | SDKが付けた`$geoip_disable`が送信前フィルターで消えていたため、保持するよう修正。回帰テストで確認                |
| 購入管理               | `src/bootstrap/appInitialization.ts`、`src/features/purchases/infrastructure/revenueCatPurchaseService.native.ts`         | 起動時の初期化、購入前の通信、分析同意と独立した処理、匿名購入ID・購入履歴等                                     |
| OSバックアップ         | `android/app/src/main/AndroidManifest.xml`の`allowBackup="true"`                                                          | OSの設定次第でバックアップ・復元、アンインストールだけではバックアップは消えない                                 |

## Data safety の回答根拠

「収集なし」にはできません。GoogleはSDK経由や仮名IDの端末外送信も収集に含めます。リマインダー本文やモーション値は端末内のみで扱い、音声入力の音声・文字起こしも開発者や導入SDKが収集・送信することはありません（音声認識処理はOS標準の音声認識機能またはアプリ同梱モデルが行います）。[Googleの定義](https://support.google.com/googleplay/android-developer/answer/10787469?hl=ja)

- **App interactions**: PostHogの画面表示・操作結果。任意、目的はAnalytics。一時的処理ではない。
- **Device or other IDs**: PostHogの匿名IDに加え、RevenueCatの匿名購入IDも扱う。Googleの「アプリに関連する識別子」の定義から、アプリに紐付く匿名購入IDをこの分類として扱う判断。PostHogは任意だが、起動時に動作するRevenueCatには停止設定がないため、申告を必須・アプリ機能と分析に修正した。広告IDを収集する設定は追加していない。対象AABの実際の通信との照合は残る。
- **Purchase history**: RevenueCatが収集。目的はApp functionality / Analytics、一時的処理ではなく、収集を無効にする設定はない。[RevenueCatのGoogle Play向け案内](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety)
- **国情報**: RevenueCatは取引国、またはIPから推定した国を処理し、IPそのものは推定後に破棄すると説明している。[顧客プロフィールの説明](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile)は公開文書に反映済み。同社の[Google Play Data safety案内](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety)は、RevenueCat単独では位置情報の分類を申告不要としているため、現在の位置情報未選択はこの公式案内に沿う。これは過去のPostHogの位置推定結果の保存を否定するものではない。連携・属性・SDK設定を変える場合は再評価する。
- **共有**: 外部SDK利用だけで「共有あり／なし」を決めない。処理委託先の例外に該当する契約・用途を確認し、PostHogの配信先とRevenueCatの外部連携も含めて判定する。
- **削除**: アカウント作成なしと、収集データの削除リクエスト手段の有無は別の質問。現在は匿名分析イベントの個別削除受付を提供していない。問い合わせ用メールの掲載だけで削除手段を「あり」にしない。

## 提出前に残る確認

- [x] Play登録済みのプライバシーURLがGitHub Pagesの最新版と一致し、公開文書2件が認証なしでHTTP 200・HTML一致・正しいメールリンクを持つこと。
- [x] 本番アプリからの法的文書の表示と問い合わせ先を運営者が確認。別サイト`fuwatto.pages.dev`も修正版を公開し、公開URLで照合した。任意の別地域からの検査は未実施。[Googleの掲載要件](https://support.google.com/googleplay/android-developer/answer/10144311)
- [x] 本番AABのサポートメールの既定値が上記と一致し、EAS productionに`EXPO_PUBLIC_SUPPORT_EMAIL`の上書き変数がないこと。設定画面での実表示と法的文書の表示も運営者が確認済み。
- [ ] 本番PostHogの送信先と保持運用を確認し、同意前と撤回後に分析通信がないことを確認する。v46はAPI key未設定のため分析クライアントなし。旧版のIP保存は上記のとおり停止設定へ変更済みで、既存データは残る。[PostHogのデータ収集設定](https://posthog.com/docs/privacy/data-collection)
- [ ] PostHogで、リマインダー本文・予定日時・音声・端末モデルが現在届かないことを確認する。直近30日のGeoIP無効指定と位置プロパティ0件は確認済み。上記の古い位置・端末情報とIPを含む既存データの扱い、変更後の新規イベント・保持期限による削除を確認する。
- [ ] RevenueCatの本番キー、匿名ID、購入・復元、外部連携、購入記録の保持運用を確認する。SDK提供者のポリシーは運営者の対応責任の代わりにはならない。[RevenueCatの情報処理方針](https://www.revenuecat.com/privacy)
- [ ] 本番AABで権限と通信を確認する。v46のManifestとFirebase設定リソースの静的確認は上記のとおり完了。通知SDK由来のFirebase Messagingやダウンロード関連の宣言があるため、プッシュトークンの自動生成などが本番で有効になっていないかを端末の実通信で確認する。
- [x] Google Playの非消耗型商品と公開Paywallの価格変数・買い切り・自動更新なし・復元・法的文書リンクを照合。実機の300円表示・購入・復元は運営者が確認し、初回購入・返金と17:32の再購入は両サービスで照合済み。

利用規約の免責文言は、消費者契約法などで認められる権利を制限しない内容に修正しました。[消費者庁の解説](https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/annotations/assets/consumer_system_cms203_230915_13.pdf)
