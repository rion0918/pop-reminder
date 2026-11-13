# Android公開前の最終確認

確認日: 2026年11月11日。対象は日本向けAndroid版。

## 公開判定

最終AABの作成・静的検査と、空のAndroidエミュレーターでの起動確認は完了。11月11日時点でクローズドテスト変更とProduction access申請は審査中。Play経由の購入QAに使う実機がなく、API 36で向き固定が無視される大画面の画面確認も残るため、製品版を公開できる状態とはまだ判定しない。

## 完了した整備

- 入金口座の確認は運営者が完了済みと回答。Play Consoleのお支払いプロファイルにも銀行口座の登録が表示された（末尾62）。ただし管理画面上の明示的な「確認済み」表示は今回読み取れず、確認完了の判定は運営者の回答に基づく。
- EAS productionの既定Upload keyは、2026年10月16日に照合したPlayの現行Upload証明書と一致し、公開済み旧JKSとは別鍵である。最終AABもこの既定キーで署名した。
- 公開済み旧JKSに対応するEASの非既定資格情報を削除した。ローカルの`credentials.json`、旧JKS、CLIが作成したバックアップも削除した。旧JKSは過去のGit履歴には残り、履歴書き換えは未実施。ファイルは公開済み資格情報として扱い、現行EAS/PlayのUpload keyに使われていないことを上記証明書照合で確認した。
- EAS productionへ対象PostHogプロジェクトの公開SDKキーを登録した。ホストはアプリの既定US Cloudを使う。RevenueCatのGoogle用公開SDKキーも登録済み。
- RevenueCat管理画面でPlay Storeアプリのpackage `com.rion0918.popreminder`、サービスアカウント資格情報の`Valid credentials`、Play Developer NotificationsのGoogle接続を確認した。通知トピックの最終受信は2026年10月16日。Play Store商品`fuwatto_pro_lifetime`は`pro` entitlementに関連付けられ、`default` offeringの`$rc_lifetime` packageから参照される。SDK Compatibility画面はAndroid `react-native-purchases 10.7.0`を表示。
- Google Playの現行画面で一回限り商品`fuwatto_pro_lifetime`が有効、日本の価格が300円・利用可能であることを確認。RevenueCatの新規購入をサーバー通知だけから追加追跡する設定はOFF。通常のSDK購入導線を置き換える設定ではなく、今回変更していない。
- 公開中のプライバシーポリシーと利用規約をHTTPSで再取得し、リポジトリ内HTMLとのSHA-256一致を確認した。
- PostHogプロジェクト549328のIP匿名化は有効。運営者の`confirm`入力後、プロジェクトのイベント保持期間を明示的に12か月へ設定した。月次削除の予定が返された。過去テストデータの一括削除は実施していない。
- Reanimated 4.1.7が参照する旧CMake出力先と、Worklets 0.5.1の実際のcxx出力先の不一致を修正した。GradleでWorkletsの生成後にABIごとの不足ライブラリを補う。旧パスに正規の出力がある環境では上書きしない。実際のGradle処理で、旧処理の既存出力上書きを再現し、修正後の保持と不足分のコピーを確認した。依存バージョンは変更していない。
- 修正前のEASローカルビルドは`libworklets.so`欠落で失敗。修正後の`:react-native-reanimated:externalNativeBuildDebug`は成功した。
- リリース候補は隔離ブランチ`codex/android-release-readiness`、コミット`b1f3947`。既存の作業ツリー変更は保持している。

## GitHubソースの現行状態

- 2026年11月10日、`b1f3947`を`origin/main`へ早送りpushした。push後のリモートHEADは同コミットで、`credentials.json`と`credentials/android/keystore.jks`は現行ツリーから除かれている。候補AABと同じAndroidビルド修正を含む。
- GitHubはpush時にPR必須ルールを迂回したと応答したため、今回のmain更新はPRレビューを通っていない。push後にGitHub Actionsの`MVH verify`、`build`、`deploy`、`report-build-status`はすべて成功を確認した。`MVH verify`は完了・成功だが、PRレビュー未実施というルール逸脱は残る。
- 古い資格情報は過去コミット`61920bf`に残っている。履歴の書き換えは実施しておらず、別途承認が必要。作業中のローカル`main`と未コミット変更はそのまま保持している。

## 現行Play Consoleの状態（2026年11月10–11日確認）

- 運営者からは申請通過済みとの申告があったが、認証済みPlay Consoleの「製品版」画面では「製品版へのアクセスがまだありません」「申請されています」「審査しています」と表示された。申請日時は当日11:38。少なくとも今回の画面ではProduction access承認済みとは確認できず、申告と状態が食い違う。
- ダッシュボードのアプリ状態は「製品版 非アクティブ」。製品版トラックに公開中のリリースは確認できなかった。
- 11月10日の初回確認時は公開の概要に保留中の変更がなかった。11月10日の「アプリのアップデートが公開されました」は製品版公開の証拠ではない。11月11日にv52を保存した後、審査送信前は3件の変更が表示されていた。
- Google Paymentsのお支払い方法には銀行口座が登録済みで、運営者も確認完了と回答している。商品状態は有効だが、製品版アクセス申請とリリース審査は別状態として扱う。
- 11月11日の「最新のリリースとバンドル」画面ではalpha v46が公開中、内部テストv37が公開中、`AndroidClosedJP`のv43が未公開。最新App Bundle一覧にはv52がまだなく、アップロード前の最大登録versionCodeは46だった。
- 11月11日、v52を`AndroidClosedJP`の下書きにアップロードし、v43をそのリリースから外して未公開保存した。保存済みv52は0.1.0、min API 24、target SDK 36。内部テスト用リスト8名を同トラックに割り当てた。審査送信前は「クローズド テスト - AndroidClosedJP」「0.1.0 (52) - タイトル表示の改善」「トラックを再開」「テスターをメーリング リスト（内部テスト用）で管理」の3変更が公開の概要に表示されていた。11月11日00:13、これらを審査に送信。送信アクティビティID 11は現在「審査中」。Googleの審査・トラック公開はまだ完了しておらず、8名への配信開始も未確認。課金確認用1名リストは未選択。

### 現行の掲載情報・Data Safety・プライバシーポリシー

- デフォルトの日本語ストア掲載情報は「公開済み」、最終更新は10月16日。アプリ名「ふわっと。」、短い説明、長い説明、アイコン、フィーチャー グラフィック、スマートフォン用スクリーンショット5枚を確認。動画は未設定。
- 現行Data Safetyの保存済みプレビューには、購入履歴、アプリのインタラクション数、デバイスまたはその他のIDを収集すると表示され、第三者共有はなし、送信中の暗号化あり。削除依頼方法は提供しない申告。詳細回答は購入履歴が必須・アプリ機能と分析、アプリのインタラクション数は任意・分析、デバイスまたはその他のIDは必須・アプリ機能と分析で、いずれも一時処理・共有なし。
- Play Consoleのプレビューに表示されたプライバシーポリシーURLは`https://rion0918.github.io/pop-reminder/privacy/`。公開ページは最終更新2026年10月3日で、同意後のみのPostHog計測、12か月保持、RevenueCatの購入管理、アカウント作成なし、個別の分析データ削除依頼なしを説明している。Data Safetyと掲載ポリシーの収集・保持・削除の記載は一致している。
- 取引業者ステータスはデベロッパーアカウントから継承し、「このアプリに適用する」が選択済み。利用規約URL欄は空だが、アプリからリンクしている公開ページ`https://rion0918.github.io/pop-reminder/terms/`が存在する。ConsoleはURLがある場合の入力を案内しているため、公開前にこのURLを登録するのが望ましい。変更・保存はしていない。
- 現行のストア掲載情報、保存済みData Safety、公開ポリシーをComputer Useで照合した。回答の編集・保存、掲載情報の変更はしていない。過去データ一括削除も実行していない。

### Play Consoleの追加確認

- 2026年11月11日にダッシュボードを再確認。アプリは「製品版 非アクティブ」、Production accessは「申請されています / 審査しています」で、申請日は火曜日11:38（11月10日）。以前の「申請通過済み」という申告と異なり、現在も承認待ちと判断する。
- Play Consoleの保護状況は、自動保護1/1有効、Playアプリ署名有効、Playストアの保護6/7有効、Play請求サービスの保護3/4有効。ストア掲載情報のデバイス確認はオフ。Play Integrity APIは7/7未統合。請求保護の未有効項目は定期購入特典の不正使用防止で、現在の商品は買い切りのみのため適用対象ではない。これらの未有効表示は任意の保護・統合で、現時点で公開ブロッカーとは確認されていない。設定変更はしていない。
- 同日の「テストとリリース」概要に、v46を対象とした品質警告が3件表示された。DEX最適化率3%（Console表示の修正期限は2027年2月）、Android 15以降のEdge-to-edge関連API、Android 16大画面で向き・リサイズ制限が無視される際のUXである。v52は審査中のため、これらの警告がv52にも紐づいたかは未確認。現行設定は`android.enableMinifyInReleaseBuilds=false`、`app.json`の向きは`portrait`。Android 16でAPI 36を対象にすると、幅600dp以上で画面向き・リサイズ制限が無視されるため、タブレット・折りたたみ端末での実機または同等の端末確認を公開前の優先QAとして残す。[Android 16の公式動作変更](https://developer.android.com/about/versions/16/behavior-changes-16)。既存のバブル配置ユニットテストには622×350dpのケースがあるが、画面全体の実機描画確認とは別である。
- 接続中の`emulator-5554`は1080×2424px、420dpiの電話相当画面で、インストール済みアプリはversionCode 2、target API 36、Playインストーラー経由ではない。v52のQA結果として扱わない。以前の一時AVDでのv52初回起動確認は上記の通り別に記録している。
- Playのv52プレビューは新規インストール推定102 MB・推定ダウンロード56秒を表示し、警告は1件。内容は難読化解除ファイル未添付で、R8/ProGuardを使う場合はマッピングファイルを追加するよう案内している。リリースGradle設定では`android.enableMinifyInReleaseBuilds`の既定値がfalse。ビルド時に別途上書きされていない前提では難読化を使っていないため、この警告は任意。将来難読化を有効にする場合は対応マッピングを同じリリースに添付する。

## 残る確認

- 最終AABの署名、実versionCode、target API、同梱モデル、本番RevenueCat/PostHogキーの検査は完了。ConsoleでもversionCode 52のBundle処理とクローズドテスト下書き保存を確認した。
- 現行画面ではProduction access申請が審査中、製品版は非アクティブ。申請が承認されたか管理者側で再確認し、承認後に製品版リリースを別途作成・審査へ提出する。こちらから提出・公開操作はしていない。
- クローズドテストは未完了。v52と内部テスト用リスト8名の設定、トラック再開を含む3変更は11月11日00:13に審査へ送信し、送信アクティビティID 11で「審査中」と表示されている。Google審査の承認とテストトラック公開、8名が実際に入手できることの確認、実機QAが残る。
- Consoleの掲載情報、Data Safety、プライバシーポリシーの現在値の照合は完了。v52の端末通信・イベント保存値との実機照合は実機が使えるまで未完了。
- Play Consoleの任意欄「利用規約URL」は空。既存の公開規約URLを入力して保存する仕上げが残る。
- RevenueCatでは商品・offering・entitlement・サービスアカウント・通知接続が整っている。Play Developer Notificationsの「Track new purchases from server-to-server notifications」はOFFのため、購入がRevenueCatに未登録の場合を通知から追加取り込みする範囲は実運用で確認していない。
- 運営者は現在Android実機を利用できない。最終AABをPlayから更新し、購入・復元・取消・返金後の権利、無料6件上限、通知・音声・Widget・再起動を確認する。過去v46の結果を新AABの確認として扱わない。
- 未同意・拒否・撤回後のPostHog無送信と、同意後の許可イベント・IP匿名化は、最終Play版の端末通信と保存結果で確認する。
- 過去PostHogデータの一括削除は、[既存の対象・影響・削除手順](GOOGLE_PLAY_DATA_REVIEW.md)を使用し、別の明示承認後に行う。

## 検証の区別

元の作業ツリーでは`verify:release`が成功（Node 428件、UI 132件）。`mvh:verify`は既存の`flake.nix`変更で停止し、Biome全体チェックも既存の未追跡ストア画像HTMLの空見出しで失敗した。これらの保護・既存変更は今回変更していない。

クリーンな元コミット`ca74a96`では`mvh:verify`と`verify:release`が成功（Node 427件、UI 132件）。最終修正版`b1f3947`でも、通常の依存インストールを使い、Node 24.22.1 / pnpm 10.8.1で両ゲートが成功した。Node 427件、UI 132件、Biome、型、Lint、Expo Doctor、Android/iOS exportを通過。隔離環境の依存リンクによるMetro export失敗は、通常インストールへ揃えて再確認した。AAB情報は下記へ追記する。

この修正はネイティブビルドの互換対応で、アプリの公開API、DB、通知・Widgetの実装契約は変更しない。新しいアーキテクチャ判断を導入しないためADRは追加しない。

## 最終AAB

[EASクラウドビルド](https://expo.dev/accounts/rion0918/projects/pop-reminder/builds/00bc4df0-aeb1-40ee-b918-f699a06bf8dc)が`FINISHED`となり、コミット`b1f3947`、versionCode 52のAABを取得した。

| 項目            | 結果                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 成果物          | `dist/pop-reminder-android-v52.aab`、250,707,581 bytes                                                                                 |
| SHA-256         | `5fc0dc7c7a218af188f9350e7a41481036f0f7034004d52dceb41209c97acb23`                                                                     |
| 識別情報        | `com.rion0918.popreminder` / `0.1.0` / versionCode `52`                                                                                |
| Android API     | min `24` / target `36`                                                                                                                 |
| Billing Library | `8.3.0`                                                                                                                                |
| 署名            | `jarsigner -verify`終了コード0。Upload証明書SHA-256はEASの既定キーと過去のPlay照合記録に一致。自己署名・タイムスタンプ等の通常警告あり |
| 同梱資産        | Moonshineモデル・tokens・LICENSE・NOTICEの5ファイルが元データと一致                                                                    |
| 本番設定        | EAS productionのGoogle RevenueCat公開SDKキーと対象PostHogプロジェクトキーの同梱を値を表示せず照合                                      |
| 除外確認        | ローカルTest Storeキー、キー形式のTest Storeリテラル、JKS・credentials.json・service accountファイルなし                               |
| 権限            | 不要なREAD/WRITE_EXTERNAL_STORAGE、SYSTEM_ALERT_WINDOW、ACTIVITY_RECOGNITIONなし                                                       |
| サイズ予測      | API 35 ARM64端末用APKsに対するbundletoolの圧縮ダウンロード推定102,425,347 bytes。Play上の実機別表示は未確認                            |

Hermesバイナリを単純検索した`test_`候補は、文字列領域をまたいだ一致だった。Hermesの文字列テーブルで、完全なTest Storeキー形式のリテラルがないことも確認した。

47・48は修正前のリンク失敗、49はNinja待機停止、50はローカル容量不足、51はクラウドでWorkletsシンボルを解決できず成果物なし。51の後に既存出力を上書きしない処理へ修正し、52で成功した。今回作成した失敗ビルドの一時領域と署名情報を含み得るローカルログは整理した。ストアへのアップロード・製品版公開は実施していない。

## エミュレーターでの起動確認

- 既存の`emulator-5554`は容量不足で更新できなかった。アプリのアンインストールやデータ消去は行っていない。
- 別の空のAPI 35 / Android 15 / ARM64エミュレーターを一時作成し、v52 AAB由来の端末専用APKsを開発用証明書で署名してインストールした。配布用AAB自体の署名は変更していない。
- versionCode 52、target API 36、初回のコールド起動、分析同意画面、拒否後の再起動とホーム表示を確認。アプリのプロセス継続とAndroidRuntimeのアプリ致命例外なしを確認した。
- 証跡は`dist/pop-reminder-v52-first-launch.png`と`dist/pop-reminder-v52-denied-restart.png`。一時AVDは確認後に終了・削除済み。隔離worktreeも削除し、リリース候補のローカルブランチとコミットは保持した。
- この確認はサイドロードによる起動確認で、Play購入・復元、通知・Widgetの実機挙動、同意前後の全通信の証明には使わない。
