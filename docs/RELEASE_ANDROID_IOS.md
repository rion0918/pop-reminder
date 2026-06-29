# Android / iOS Release Runbook

## 方針

- Android を先に Google Play へリリースする。
- App Store は Android と同じ主要機能を確認してから後追いでリリースする。
- Widget は別タスクとして扱い、このリリース手順のブロッカーにしない。

## 共通の事前確認

1. 依存関係とExpo設定を確認する。

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run lint
npx expo-doctor
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

3. Google Play向けAABを作る。

```bash
eas build --profile production --platform android
```

4. Google Play Consoleへアップロードする。

- 内部テストまたはクローズドテストに配布する。
- 個人開発者アカウントでクローズドテスト要件が出る場合は、必要なテスター数と期間を満たす。
- Google Play提出前に `expo.android.versionCode` が前回提出版より大きいことを確認する。

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

3. App Store Connectへ提出する。

- App Store提出前に `expo.ios.buildNumber` が前回提出版より大きいことを確認する。
- `ITSAppUsesNonExemptEncryption = false` と暗号化申告が一致していることを確認する。
- プライバシーポリシーと利用規約の問い合わせ文言がApp Storeでも不自然でないことを確認する。

## リリース後

- ストアページの問い合わせ導線を確認する。
- 通知が届かない端末報告があれば、OSバージョン、通知権限、通知チャンネル、バッテリー最適化の状態を記録する。
- Widget 実装は別タスクで設計し、Android/iOSそれぞれのネイティブ制約を確認してから進める。
