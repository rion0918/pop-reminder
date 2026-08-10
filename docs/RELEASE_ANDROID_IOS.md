# Android / iOS Release Runbook

## 方針

- Android を先に Google Play へリリースする。
- App Store は Android と同じ主要機能を確認してから後追いでリリースする。
- Android Widgetを初回リリースの正式機能としてこの手順に含める。

## 共通の事前確認

1. 依存関係とExpo設定を確認する。

```bash
pnpm install --frozen-lockfile
pnpm run format:check
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run doctor
```

まとめて確認する場合:

```bash
pnpm run verify:release
```

2. JavaScript bundle が Android / iOS の両方で作れることを確認する。

```bash
pnpm exec expo export --platform android --output-dir /private/tmp/pop-reminder-export-android
pnpm exec expo export --platform ios --output-dir /private/tmp/pop-reminder-export-ios
```

3. リリース番号を確認する。

- ユーザー向けバージョン: `app.json` の `expo.version`
- Android 提出番号: `app.json` の `expo.android.versionCode`
- iOS 提出番号: `app.json` の `expo.ios.buildNumber`

4. PostHog のリリース設定と匿名計測を確認する。

- EAS の対象環境に `EXPO_PUBLIC_POSTHOG_API_KEY` を設定し、`EXPO_PUBLIC_POSTHOG_HOST` は US Cloud (`https://us.i.posthog.com`) を使用する。
- Development Build と PostHog Live Events で、3画面、主要5イベント、opt out / opt in、機微情報が含まれないことを確認する。
- PostHog project側のイベント保持期間を12か月に設定し、設定画面の削除依頼に対応できることを確認する。
- project token を `.env` やリポジトリへコミットしない。

5. RevenueCatとストア商品を確認する。

- [RevenueCatセットアップ](REVENUECAT_SETUP.md) に従い、`pro` entitlement、default offering、`$rc_lifetime` packageを設定する。
- EASの対象environmentへ `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` と `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` を設定する。
- RevenueCatのpublic SDK key以外のsecret、Google service account、App Store Connect private keyをアプリへ含めない。
- Development Buildまたはストアテスト版で購入と復元を確認する。Expo Goの購入UIは実購入の確認に使用しない。

6. プライバシー同意と削除依頼を確認する。

- 初回起動時は匿名計測が未選択・無効で、共有しない選択でも機能を利用できることを確認する。
- 同意後だけPostHogに許可されたイベントが送信され、設定からOFFにすると送信が止まることを確認する。
- `EXPO_PUBLIC_SUPPORT_EMAIL` に専用サポートメールを設定し、利用状況データ削除依頼の導線を確認する。

## Android 先行リリース

1. 実機確認用APKを作る。

```bash
eas build --profile preview --platform android
```

2. APKをAndroid実機に入れて確認する。

- 初回起動
- Androidランチャーで丸/角丸などのマスクがかかってもアイコンが欠けないこと
- Androidナビゲーションバーが淡い背景色で、ボタン/ジェスチャー表示が読めること
- リマインダー追加
- SQLiteの再起動後保持
- 通知権限の許可 / 拒否
- 拒否後に「端末の通知設定を開く」から設定へ移動し、戻った時に表示が更新されること
- 通知ドロワーの小アイコンが白い泡として表示され、アクセント色が不自然でないこと
- 通知音ONの通知チャンネル: `リマインダー`
- 通知音OFFの通知チャンネル: `リマインダー（通知音なし）`
- 追加Sheetと詳細Sheetを開いた状態でBackキーを押すと、画面離脱ではなくSheetだけ閉じること
- Android小画面でHome、追加Sheet、設定、一覧が崩れないこと
- 無料6件、7件目のPaywall、買い切りPro購入、購入復元、返金後の権利取消
- Android Widgetの追加、リサイズ、データ更新、削除、Widgetからのdeep link

3. Google Play向けAABを作る。

```bash
eas build --profile production --platform android
```

4. Google Play Consoleへアップロードする。

- 内部テストまたはクローズドテストに配布する。
- 個人開発者アカウントでクローズドテスト要件が出る場合は、必要なテスター数と期間を満たす。
- Google Play提出前に `expo.android.versionCode` が前回提出版より大きいことを確認する。
- AABのmerged manifestに不要なストレージ、オーバーレイ、身体活動権限が含まれないことを確認する。
- AABのネイティブライブラリがAndroid 15以降の16KB page size要件を満たすことを確認する。
- Google Play Console のデータ安全性を、PostHog による任意の匿名利用状況計測と一致するよう更新する。
- 非消耗型商品 `fuwatto_pro_lifetime` が800円で有効であり、RevenueCatの`pro` entitlementへ接続されていることを確認する。
- プライバシーポリシーとデータ安全性をRevenueCatによる匿名購入情報の処理と一致させる。

## App Store 後追いリリース

1. iOS実機向けproduction buildを作る。

```bash
eas build --profile production --platform ios
```

2. iPhone実機で確認する。

- 初回App Storeリリースは `ios.supportsTablet = false` のiPhone対象として扱う。
- iPhone SE系
- 標準サイズ
- Pro Max系
- 通知権限の許可 / 拒否
- 通知音ON/OFF
- 通知タップ後のアプリ復帰
- Home、追加Sheet、設定、一覧が崩れないこと
- App Store Sandboxで買い切りProの購入、復元、返金後の権利取消

3. App Store Connectへ提出する。

- App Store提出前に `expo.ios.buildNumber` が前回提出版より大きいことを確認する。
- `ITSAppUsesNonExemptEncryption = false` と暗号化申告が一致していることを確認する。
- プライバシーポリシーと利用規約の問い合わせ文言がApp Storeでも不自然でないことを確認する。
- App Store Connect の App Privacy を、PostHog による任意の匿名利用状況計測と一致するよう更新する。
- 非消耗型商品 `fuwatto_pro_lifetime` がRevenueCatの`pro` entitlementへ接続されていることを確認する。
- App PrivacyをRevenueCatによる匿名購入情報の処理と一致させる。

## リリース後

- ストアページの問い合わせ導線を確認する。
- 通知が届かない端末報告があれば、OSバージョン、通知権限、通知チャンネル、バッテリー最適化の状態を記録する。
- Android Widgetは初回リリース機能として、更新失敗・再起動・deep linkの報告を記録する。
- RevenueCatでPaywall到達、購入、復元、返金を確認し、PostHogで上限到達後の継続率と購入結果を確認する。
- AndroidクローズドテストではPaywall到達率、購入率、キャンセル・エラー率、到達後の継続利用、復元失敗を確認する。
- 初期段階ではA/Bテストを行わず、6件制限による離脱が強い場合だけ10件への緩和を検討する。
