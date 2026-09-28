# リリース手順: Android 内部テストから iOS まで

最初に行うのは **Android の内部テスト**です。このページは、AAB の作成、Google Play への配布、実機確認を上から順に進められるようにしています。クローズドテスト、製品版、iOS は後半に分けています。画面の名前が変わった場合は、ボタン名よりも各手順の完了条件を優先してください。

## まず読む: 今回の進め方

1. [共通の準備](#1-共通の準備)を終える。
2. AAB の作成方法を **一つ**選ぶ。EAS クラウドビルド枠が使える場合は[クラウド](#2a-eas-クラウドビルド枠が使える場合)、EAS クラウドビルド枠を使い切った場合は[Mac でのローカルビルド](#2b-eas-クラウドビルド枠を使い切った場合)へ進む。
3. [どちらの経路でも同じ AAB 検証](#3-どちらの経路でも同じ-aab-検証)を通す。
4. [Play Console を準備](#4-play-console-を準備する)し、[内部テストへ配布](#5-内部テストへ配布する)する。
5. テスト参加リンクから Play Store 版をインストールし、[実機 QA](#6-内部テストの実機-qa)を行う。

| 方法         | ビルドする場所 | EAS クラウドビルド枠 | EAS との接続                                 | 出力                    |
| ------------ | -------------- | -------------------- | -------------------------------------------- | ----------------------- |
| 2A: クラウド | EAS サーバー   | 使用する             | 必要                                         | ダウンロードした AAB    |
| 2B: ローカル | 自分の Mac     | 使用しない           | ログイン、プロジェクト・資格情報・採番に必要 | `dist/pop-reminder.aab` |

**ローカルビルドは完全オフラインではありません。** `eas build --local` は EAS CLI を使い、ビルド処理だけを Mac で行います。Google Play への AAB アップロードも Play Console への接続が必要です。`./gradlew app:bundleRelease` はこのリポジトリでは release に debug 鍵を指定しているため、ここに書いた Play 提出用 AAB の作成方法には含めません。

## 0. 公開範囲と固定値

- アプリ名: `ふわっと。`。日本向け、日本語、アプリ種別はアプリ、カテゴリは Productivity。
- Android package / iOS Bundle ID: `com.rion0918.popreminder`。
- ユーザー向けバージョン: 現行の `app.json` と native 設定を確認する。`versionCode` は AAB と Play Console の実値で判断し、過去の手順に書かれた番号を再利用しない。
- 無料版は同時に 6 件まで。Pro は買い切りでリマインダー数の制限を解除する。現行版に広告 SDK はない。
- Android Widget は初回リリースの正式機能。iOS Widget は案内しない。
- 内部テストは一般公開ではない。**製品版公開、製品版アクセス申請、外部 TestFlight 審査、App Review 提出**はそれぞれ別の判断を経て行う。

AAB 作成と内部テストへのアップロードは別の操作です。ビルドが成功しても、Play Console でリリースを公開し、テスターが参加するまでは実機テストを開始できません。

## 1. 共通の準備

### 1.1 リリース対象と検証を固定する

リリース対象のコミットと作業ツリーを確認してから実行します。コードや依存関係を変えた後は、同じ対象で検証をやり直します。

```bash
git status --short
pnpm install --frozen-lockfile
pnpm run mvh:verify
pnpm run verify:release
```

`verify:release` はテスト、型チェック、Lint、Expo Doctor、Android / iOS export を含みます。失敗した検証を無視して AAB をアップロードしません。音声モデルの元ファイルは `assets/moonshine-tiny-ja.sha256` と[第三者ライセンス](THIRD_PARTY_LICENSES.md)に照らして確認します。

### 1.2 署名、番号、環境変数を確認する

- Play Console の「アプリの完全性」で **Upload key certificate** の SHA-256 を確認する。EAS の production 用 Keystore と同じ鍵か確認し、過去の JKS など別の資格情報を選ばない。Google Play の App signing key certificate は別の鍵の場合がある。
- Play Console にアップロード済みの最大 `versionCode` を控える。production profile は `appVersionSource: remote` と `autoIncrement: true` なので、クラウド・ローカルのどちらも EAS の remote 番号を使う。`app.json` の `android.versionCode` や `android/app/build.gradle` の値だけで提出番号を判断しない。
- `eas.json` の production environment と、`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`、`EXPO_PUBLIC_POSTHOG_API_KEY`、`EXPO_PUBLIC_POSTHOG_HOST` の実際の設定を確認する。値や秘密情報をログ、Issue、チャットへ貼らない。購入用の公開 SDK key の準備は[RevenueCat セットアップ](REVENUECAT_SETUP.md)を参照する。
- アプリの package は `app.json` と `android/app/build.gradle` で `com.rion0918.popreminder` と一致させる。`android/` があるためビルドでは native の `applicationId` が優先される。

EAS 側の現在値は `eas build:version:get --platform android --profile production` で確認できます。Play Console の最大値より低い場合は `eas build:version:set --platform android --profile production` で基準値を合わせてからビルドします。production の次のビルドで自動採番される番号が未使用になることを確認してください。

### 1.3 資格情報を Git に載せない

現在の production profile は `credentialsSource` 未指定、つまり既定の `remote` です。**2A と 2B のどちらにも `credentials.json` のダウンロードは不要**で、EAS が production の Keystore を取得します。`credentialsSource: local` を設定したときだけローカルファイルを使用します。

```bash
git ls-files credentials.json credentials/android/keystore.jks
```

このコマンドでパスが表示される場合、`.gitignore` に書かれていても **すでに Git の追跡対象**です。現在のリポジトリもこの状態です。署名ファイルやパスワードを追加・更新してコミットしないでください。履歴を含む公開状況を確認し、公開済みの資格情報なら Play Console の Upload key リセットと EAS 資格情報の更新を先に扱います。Git の追跡解除だけでは過去の漏えいは解消しません。秘密情報を変更する作業は、このリリース手順とは別に実施します。

## 2. AAB を一つの方法で作成する

どちらも `eas.json` の `production` profile を使用します。最終成果物は Play Console に手動アップロードする **Android App Bundle（`.aab`）** です。`preview` profile の APK は端末での予備確認用で、Play 提出用 AAB と取り違えません。

必要なら予備確認用 APK は次で作成できます。内部テストの購入確認は Play Store から入れた AAB 由来のアプリで行います。

```bash
eas build --profile preview --platform android
```

### 2A. EAS クラウドビルド枠が使える場合

1. `eas whoami` で対象 Expo アカウントにログイン済みか確認する。未ログインなら `eas login` を実行する。
2. `production` profile、EAS の production 環境変数、Upload key が対象アプリ用であることを確認する。
3. 次を実行し、ビルド完了を待つ。

```bash
eas build --profile production --platform android
```

4. 成功したビルドの URL から `.aab` をダウンロードし、**この文書では** `dist/pop-reminder.aab` に保存する。既存ファイルを上書きする前に、今回のビルド ID と保存先を確認する。
5. [共通の AAB 検証](#3-どちらの経路でも同じ-aab-検証)へ進む。ビルド失敗・キャンセル時の AAB は使わない。

EAS クラウドのビルド枠に達したら、同じ release 対象を維持して 2B へ切り替えます。`versionCode` は失敗した試行を含めて進む場合があるため、実際にできた AAB の番号を確認します。

### 2B. EAS クラウドビルド枠を使い切った場合

**Mac に Android Studio の JDK、Android SDK、NDK、Node.js、pnpm、EAS CLI が必要**です。`eas whoami` でログインを確認します。EAS CLI と EAS サーバーへの接続は使いますが、EAS のクラウドビルド枠は消費しません。`eas.json` の `android.image: sdk-54` はローカルでは適用されないため、Mac 側の SDK / NDK を使用します。

1. `nix develop` を使う場合は先に入る。続けて、今回のローカルビルドで成功した Mac の配置例を同じターミナルで設定する。NDK の版は `android/build.gradle` が要求するものと一致させる。

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/27.1.12297006"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
java -version
```

2. **同じターミナルで**試行ごとの新しい作業場所を指定する。`$HOME/tmp` はこの Mac で `/tmp` のシンボリックリンクを経由しない場所として確認済み。

```bash
export EAS_LOCAL_BUILD_WORKINGDIR="$HOME/tmp/pop-reminder-eas-build-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EAS_LOCAL_BUILD_WORKINGDIR" dist
```

3. EAS の production 環境変数と Mac 上でビルドに渡る値を照合する。特に RevenueCat と PostHog の `EXPO_PUBLIC_` 変数が欠けていないか確認する。EAS の **Secret** 可視性の変数はローカルビルドに自動提供されないため、必要な値はローカル環境に安全に設定する。値をターミナルへ表示しない。
4. 次を実行し、完了を待つ。今回成功した EAS CLI `24.8.0` を指定して再現性を保つ。通常は作業ディレクトリを保持する設定を追加しない。

```bash
npx -y eas-cli@24.8.0 build --platform android --profile production --local --output ./dist/pop-reminder.aab --non-interactive
```

5. [共通の AAB 検証](#3-どちらの経路でも同じ-aab-検証)へ進む。ローカルビルドでも EAS の remote `versionCode` 自動採番と managed Keystore の取得が行われる。採番に欠番が出ても、Play に未使用の番号なら問題ない。

`eas build --local` の制約: EAS のビルドキャッシュとクラウド用の `image` 指定は使われず、マシン側のツールが必要です。ビルド失敗時は最初に表示されるエラーを確認し、修正後に再実行します。資格情報ファイルをダウンロードして Gradle に直接渡す手順へ切り替えないでください。

ビルドログには Keystore のデータとパスワードが含まれる場合があります。EAS の実行引数を含む行や未加工のログ全体を Issue・チャットへ貼らず、共有前に署名情報を除去します。

#### `libworklets.so` が見つからない場合

以前の失敗だけでは依存関係の不整合とは判断できません。今回、Reanimated `4.1.7` と Worklets `0.5.1` のまま、EAS CLI `24.8.0`、Android Studio JDK 21、SDK、NDK `27.1.12297006`、試行ごとに作る新しい `$HOME/tmp` 作業ディレクトリでローカル EAS ビルドが成功しました。Worklets の CMake / native library タスクが完了した後、Reanimated の CMake タスクも成功しています。依存関係の更新なしで `dist/pop-reminder.aab` を生成できることを確認済みです。

同じエラーが再発したら、まず上記の JDK / SDK / NDK と EAS CLI の版、新しい作業ディレクトリを確認して再実行します。それでも失敗する場合は Gradle の最初の CMake エラーと、その直前の Worklets タスク結果を調べます。依存更新は、そのログで不整合を確認してから検討します。失敗した試行でも EAS remote `versionCode` が進むことがあるため、次のビルド前に番号を再確認します。

## 3. どちらの経路でも同じ AAB 検証

以降は保存した `dist/pop-reminder.aab` を使います。AAB の出所（EAS のビルド ID またはローカルビルドの日時）、Git commit、実際の `versionCode`、Upload key の SHA-256 をリリース記録へ残します。

```bash
ls -lh dist/pop-reminder.aab
pnpm run verify:android:aab dist/pop-reminder.aab
jarsigner -verify dist/pop-reminder.aab
keytool -printcert -jarfile dist/pop-reminder.aab
```

- `verify:android:aab` は同梱 Moonshine モデル 2 ファイル、`tokens.txt`、`LICENSE`、`NOTICE` が元データと一致することを検査する。失敗した AAB は配布しない。
- `jarsigner` が成功し、`keytool` の署名証明書 SHA-256 が Play Console の **Upload key certificate** と一致することを確認する。自己署名やタイムスタンプに関する警告は、終了コードと証明書の結果を見て判断する。
- `versionCode` は Play Console に既にアップロードした最大値より大きく、package は `com.rion0918.popreminder`、version は今回のリリース予定値と一致することを確認する。AAB アップロード後は App Bundle 詳細でも確認する。
- target SDK と権限を App Bundle 詳細で確認する。不要な `READ_EXTERNAL_STORAGE`、`WRITE_EXTERNAL_STORAGE`、`SYSTEM_ALERT_WINDOW`、`ACTIVITY_RECOGNITION` が含まれないこと、Widget、通知、マイクが必要な範囲で動くことを確認する。

## 4. Play Console を準備する

Play Console の対象アプリ `ふわっと。` を開きます。内部テストは最大 100 人で開始できます。初回の内部テストは 1 人でも可能です。クローズドテストの 12 人・14 日要件は[後の工程](#7-内部テストの後)です。

### 4.1 アプリ情報とストア掲載情報

| 項目             | 確認する内容                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| アプリアクセス   | アプリ内ログインはないため「いいえ」。Google Play 購入用 Google アカウントはアプリ内ログインではない。                                                       |
| 広告             | 現行 AAB に広告 SDK・広告表示がないことを確認して「広告を含まない」。                                                                                        |
| 対象年齢         | 13 歳以上を対象とする方針に沿い、実際に対象とする年齢帯のみ選ぶ。子ども向けプログラムは選ばない。                                                            |
| レーティング     | 非ゲーム。暴力・性的内容、ユーザー間共有、ギャンブル、金融サービス、ランダム報酬はない。買い切りのデジタル商品はある。質問が変われば実態に合わせて回答する。 |
| 金融取引機能     | 金融サービス・送金は提供しない。アプリ内課金とは区別する。                                                                                                   |
| カテゴリと連絡先 | アプリ / Productivity。問い合わせを受けられるサポートメールを Play Console、アプリ内、Privacy Policy で一致させる。                                          |
| ストア掲載情報   | [掲載情報ドラフト](STORE_LISTING_DRAFT.md)から転記。アプリ名 `ふわっと。`、短い説明 `忘れる前に、数秒だけ。`。Android Widget を iOS 共通機能として書かない。 |
| 素材             | アイコン 512 × 512、Feature Graphic 1024 × 500、個人情報に架空データを使った日本語の実画面スクリーンショットを準備する。                                     |
| Privacy Policy   | `https://rion0918.github.io/pop-reminder/privacy/` が HTTPS で開き、アプリと SDK の実態に一致する。                                                          |

これらは Play Console が内部テスト開始時に求める項目と、後の公開準備項目を含みます。画面の必須項目を完了し、下書きだけで止まっていないことを確認します。

### 4.2 Data safety と課金設定

[Google Play データ確認記録](GOOGLE_PLAY_DATA_REVIEW.md)で、本番の PostHog / RevenueCat 設定、同意前の通信、収集・共有・保持期間を照合します。分析イベントの保持期間を12か月とし、同意 OFF 後は新規分析イベントを送らない設計です。RevenueCat は分析同意とは独立して動くため、購入用 ID や購入履歴を「分析同意後のみ」とまとめて申告しません。録音、文字起こし、リマインダー本文、具体的な日時、モーション値は外部送信しない実装か確認します。SDK の設定を変えた場合は古い回答を使い回しません。

| Data safety の分類             | 現行版で照合する内容                                                    |
| ------------------------------ | ----------------------------------------------------------------------- |
| Device or other IDs            | RevenueCat の購入用 ID と、PostHog の同意後の匿名 ID を分けて確認する。 |
| App interactions               | 分析同意後のイベントだけが対象。OFF 後は新規送信しない。                |
| Purchase history               | RevenueCat の購入・権利情報を確認する。                                 |
| 音声・本文・日時・モーション値 | 外部へ収集・共有しない実装と申告を一致させる。                          |

「共有」の回答は SDK の連携設定次第です。[確認記録](GOOGLE_PLAY_DATA_REVIEW.md)と実際の管理画面を照合して確定します。

[RevenueCat セットアップ](REVENUECAT_SETUP.md)に従い、Google Play の非消耗型商品 `fuwatto_pro_lifetime`、日本価格 800 円、RevenueCat の `pro` entitlement と `default` offering / `$rc_lifetime` を接続します。初回の AAB アップロード後に商品作成が可能な場合は、先に内部テストを作り、商品を有効化してから購入 QA を行います。ライセンステスターも設定します。

## 5. 内部テストへ配布する

1. **テストとリリース → テスト → 内部テスト**の「テスター」でメールリストを作る。自分の Play Store 用 Google アカウントを含め、フィードバック先を設定して保存する。
2. 「リリース」で新しいリリースを作り、手順 3 を通過した `dist/pop-reminder.aab` をアップロードする。内部アプリ共有ではなく **内部テストトラック**を選ぶ。
3. App Bundle 詳細で package、versionCode、target SDK、署名を再確認する。リリース名は管理しやすい名前を付ける。リリースノートには、今回確認する機能を日本語で書く。
4. 保存・プレビューでエラーを解消し、テスター、国、掲載情報、リリース内容を確認して内部テストへ公開する。Play Console の「公開の概要」に未送信の変更が残る場合は、必要な審査・公開操作まで進め、リリースの状態が公開済みになったことを確認する。
5. 「テスター」に出る参加リンクを、登録したアカウントで Android 実機から開く。「テストに参加」を押し、Play Store のリンクからインストールする。検索で見つからない場合もリンクを使う。

リリースノートの例です。実際に含まれる機能と異なる場合は書き換えます。

```xml
<ja-JP>
内部テスト版です。リマインダー、通知、端末内音声入力、Android Widget、Pro版の購入・復元を確認します。
</ja-JP>
```

初回の参加リンクや更新の反映には時間がかかる場合があります。リンクが出ないときはリリース状態が下書き・公開待ちではないか、メールリストが保存済みか、端末とリストの Google アカウントが一致するかを確認します。**Play Store からインストールできた時点**で配布経路の確認が完了です。

## 6. 内部テストの実機 QA

テスト結果は端末名、Android バージョン、Google アカウント、AAB の versionCode、結果、再現手順を記録します。通知、SQLite、Widget は Expo Go では判定しません。詳細な端末手順は[Development Build QA](QA_DEVELOPMENT_BUILD.md)も参照します。

### 初回起動・同意

- [ ] 同意しなくても主要機能が動き、未選択・拒否時に PostHog の通信や画面イベントがない。
- [ ] 同意後だけ許可した匿名イベントが送信され、設定で OFF にすると新規送信が止まり、再起動後も状態が残る。

### リマインダー・通知・音声・Widget

- [ ] 追加・タイトル更新・削除ができ、SQLite の内容が再起動後も残る。無料版の 7 件目で Paywall が出る。
- [ ] 通知許可時に前日・当日の通知が届く。拒否してもアプリが壊れず、端末設定を開ける。
- [ ] マイク許可時に端末内音声入力が動き、拒否時は手入力できる。機内モードで初回入力・保存・再起動・ローカル通知を確認する。Android 13 以上は OS 日本語モデル、Android 9 以上は同梱 Moonshine へのフォールバック、Android 7・8 は音声入力のみ非対応という実態を確認する。
- [ ] 左右に傾ける操作で音声入力を明示的に有効化した場合だけ、モーション検出が動く。
- [ ] Widget を追加・リサイズでき、リマインダー追加・更新・削除で同期し、追加ボタンの deep link と端末再起動後の表示が動く。
- [ ] 端末別圧縮ダウンロードサイズは 150 MB 未満を目標とし、200 MB 以上なら配布を止める。AQUOS 相当のベースラインは約 90.0 MiB。予期しない増加を調べる。

### 購入・復元

- [ ] `fuwatto_pro_lifetime` を有効化した状態で、Play Store 版から購入し、`pro` 権利で 7 件以上追加できる。
- [ ] 再起動後も権利が残り、購入復元が動く。返金・権利取消後も既存データを残して無料上限が戻る。

購入の判定には、APK のサイドロードや Expo Go を使いません。重大なクラッシュ、データ消失、購入・復元不能、通知不能、Data safety と実装の不一致があれば、修正して **新しい versionCode の AAB** を作り直し、手順 3 からやり直します。

## 7. 内部テストの後

内部テストの完了条件は、AAB が内部テストへ公開され、参加リンクから Play Store 版をインストールでき、手順 6 の主要 QA を通過したことです。以下は次の工程であり、内部テストを始めるために先回りして実行するものではありません。

### 7.1 クローズドテスト

2023 年 11 月 13 日以降に作成した個人用デベロッパーアカウントでは、製品版アクセス申請前に **12 人以上のテスターが連続 14 日以上クローズドテストへオプトイン**する必要があります。Play Console のアカウントに適用される要件を確認します。内部テストの人数・期間はこの条件に算入されません。

1. 内部テスト QA、ストア掲載情報、Privacy Policy、Data safety、購入・復元を整える。
2. **テストとリリース → テスト → クローズドテスト**でトラックとメールリストを設定し、フィードバック先を保存する。
3. 検証済み AAB をトラックへ追加する。同じ AAB を使う場合は Play Console の既存 App Bundle を選び、同じ `versionCode` のファイルを再アップロードしない。修正版なら新しい番号でビルドする。
4. リリースを確認・公開して参加リンクを渡す。内部テストに参加中のアカウントがクローズドテストを受け取らない場合は、内部テストを退出してからクローズドテストへ参加する。
5. 各テスターの参加日、14 日間の継続、フィードバックと修正をリポジトリ外で記録する。メールアドレスを Git に保存しない。

### 7.2 製品版アクセス申請と Android 公開

クローズドテストの条件を満たし、QA・ストア情報・価格・Data safety に矛盾がないことを確認してから、Play Console の案内に従って製品版アクセスを申請します。募集方法、テスターが試した内容、フィードバックと修正、製品版の準備状況を実態どおりに回答します。承認前は製品版を公開しません。

承認後に最終 AAB、対象国を日本、ストア素材、価格、連絡先、リリースノートを再確認し、製品版リリースを作成します。公開操作は最終確認を得てから行います。以降の更新も `versionCode` を増やし、テストトラックで確認します。

### 7.3 iOS

Android の内部テストとクローズドテスト準備が終わってから進めます。iOS の production build は次を使います。

```bash
eas build --profile production --platform ios
```

App Store Connect では iPhone 専用、Bundle ID `com.rion0918.popreminder`、日本語、無料ダウンロード、Productivity、Privacy Policy / 利用規約、App Privacy、非消耗型 IAP `fuwatto_pro_lifetime`、契約・税務・銀行情報を確認します。TestFlight 内部テストで通知、音声入力、購入・復元、拒否経路を確認します。iOS Widget を機能説明に含めません。外部 TestFlight 審査と App Review 提出は別途判断します。

App Privacy は Device ID、Product Interaction、Purchase History の実際の収集と同意状態に合わせて申告し、ATT / IDFA を導入していない現行実装と一致させます。iPhone の小型・標準・大型端末で、通知、音声入力、購入、復元、返金後の権利取消、再起動を確認します。App Store Connect へ提出する前に buildNumber が未使用かも確認します。

## 8. 詰まったとき

| 症状                                    | 最初に確認すること                                                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EAS クラウドの枠に達した                | 同じコミットで 2B の `--local` に切り替える。`credentials.json` のダウンロードは不要。                                                                         |
| ローカルビルドで JDK / SDK / NDK エラー | `JAVA_HOME`、`ANDROID_HOME`、NDK の実際のインストール版、`android/build.gradle` の要求版を確認する。                                                           |
| `libworklets.so` が見つからない         | 上の確認済みの環境変数と新しい作業ディレクトリを使う。再発したら最初の CMake エラーと Worklets タスク結果を確認してから依存変更を判断する。                    |
| `expo-updates` のインストール確認       | このリリースで EAS Update を使わないなら `n`。依存関係の変更は別作業。                                                                                         |
| `versionCode` 重複                      | EAS の remote 番号と Play Console の最大値を確認し、必要なら `eas build:version:set` で基準値を合わせる。`app.json` の値だけを書き換えて解決したと判断しない。 |
| AAB を Play Console が拒否              | package、未使用の `versionCode`、Upload key 証明書、AAB 形式、Play のエラー文を確認する。                                                                      |
| 参加リンクがない                        | テスターリストの保存、リリースの公開状態、初回反映待ちを確認する。                                                                                             |
| テスターがインストールできない          | 参加リンク、登録した Google アカウント、公開状態、Play Store の反映を確認する。                                                                                |
| Pro を購入できない                      | 商品、RevenueCat offering / entitlement、ライセンステスター、Play Store 版かを確認する。                                                                       |
| mapping file 警告                       | 現行ビルドでコード縮小が無効なら警告内容を記録する。有効化した場合は mapping file を追加する。                                                                 |

## 参照先

- [Expo: EAS Build をローカルで実行](https://docs.expo.dev/build-reference/local-builds/)
- [Expo: アプリの versionCode 管理](https://docs.expo.dev/build-reference/app-versions/)
- [Expo: EAS のローカル資格情報と `credentialsSource`](https://docs.expo.dev/app-signing/local-credentials/)
- [Google Play: 内部・クローズド・オープンテスト](https://support.google.com/googleplay/android-developer/answer/9845334?hl=ja)
- [Google Play: 新しい個人用アカウントのテスト要件](https://support.google.com/googleplay/android-developer/answer/14151465?hl=ja)
- [Google Play: リリースの作成と公開](https://support.google.com/googleplay/android-developer/answer/9859348?hl=ja)
- [Google Play: Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=ja)
