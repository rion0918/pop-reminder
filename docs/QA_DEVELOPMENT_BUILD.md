# Development Build QA チェックリスト

## 概要

EAS Build による development build（`.ipa` / `.apk`）を実機にインストールし、ポップ・リマインダー MVP の動作を確認するためのチェックリストです。

## テスト環境

| 項目           | 内容                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| ビルド種別     | development build（`developmentClient: true`）                                                                     |
| 配布方法       | internal distribution（`.ipa` / `.apk`）                                                                           |
| 対象 OS        | iOS / Android                                                                                                      |
| 前提条件       | 通知権限のリクエスト、日本語 IME、SQLite、Expo Notifications が実機ネイティブ環境で動作することを確認              |
| リリース方針   | Android を先行し、App Store は後追いで同じ機能セットを確認する。Widget は Android Development Build で確認する     |
| バージョン管理 | ユーザー向けは `expo.version`、Android提出番号は `android.versionCode`、iOS提出番号は `ios.buildNumber` を更新する |

## Android 実機でQR検証する手順

このプロジェクトは `expo-dev-client` を含むため、通常の `expo start` では development build 用のQRが表示されます。QRのURLが `exp+pop-reminder://expo-development-client/...` の場合、そのQRは Expo Go ではなく、実機にインストール済みの development build アプリで開きます。

1. Nix 開発シェルに入る（direnv を使っている場合は `cd` するだけで自動適用）。

```bash
# direnv が有効な場合は自動。手動の場合:
nix develop
pnpm install
```

2. development build をAndroid実機にインストールする。

```bash
eas build --profile development --platform android
```

3. Metroをdevelopment buildモードで起動する。

```bash
pnpm run start:dev-client
```

4. 表示されたQRを、Expo Goではなくインストール済みの「ポップ・リマインダー」development buildで開く。

Expo Goで確認したい場合は、development build用QRではなくExpo Goモードで起動します。

```bash
pnpm run start:expo-go
```

Expo Goで `Something went wrong. Sorry about that. You can go back to Expo home or try to reload the project.` が表示される場合は、development build用QRをExpo Goで開いていないか確認してください。

---

## チェック項目

### 1. 初回起動

- [ ] アプリをインストール後、タップして起動できる
- [ ] 初回起動時にローディングインジケータが表示され、数秒以内に Home 画面に遷移する
- [ ] 初回起動時に空の泡（`まだ泡はひとつも浮いていません`）が表示される
- [ ] ステータスバーがダークモード（`StatusBar style="dark"`）で表示される

**期待される結果**

- クラッシュやホワイトアウトが発生しない
- DB 初期化（`initializeDatabase`）と期限切れリマインダー整理（`cleanupExpiredReminders`）が完了する

---

### 2. アプリ名・アイコン・スプラッシュ

- [ ] ホーム画面のアプリ名が **「ポップ・リマインダー」** である（iOS/Android）
- [ ] アプリアイコンが `assets/app-icon.png` で設定された画像で表示される
- [ ] iOS: ホーム画面アイコンが `assets/app-icon.png` 由来で表示されている
- [ ] Android: アダプティブアイコンの背景色が `#EFF8FF` で反映されている
- [ ] 起動時にスプラッシュ画像（`assets/splash.png`）が表示される
- [ ] スプラッシュの背景色が `#EFF8FF` で、`resizeMode: contain` で表示される

**期待される結果**

- アプリ名の文字化けや省略がない
- アイコン・スプラッシュの解像度が実機で粗くならない

---

### 3. 通知許可

- [ ] 初回起動後、自動的に通知権限のダイアログが表示される（iOS）
- [ ] Android では必要に応じて通知権限ダイアログが表示される（Android 13+）
- [ ] 通知権限を「許可」にした場合、設定画面で「許可済み」と表示される
- [ ] 通知権限を「許可しない」にした場合、設定画面で「未許可」と表示される
- [ ] 設定画面の「通知権限をリクエスト」ボタンで再度リクエストできる
- [ ] 再リクエストできない状態では、設定画面の「端末の通知設定を開く」ボタンからOS設定へ移動できる

**期待される結果**

- `requestNotificationPermissions()` で権限状態が正しく取得・更新される
- 権限がない場合でもアプリがクラッシュしない
- リリースビルドでも通知権限の状態と回復導線を確認できる

---

### 4. 日本語 IME

- [ ] リマインダー追加時のテキスト入力で日本語変換が正しく動作する
- [ ] 変換中（未確定文字）で「追加」ボタンを押しても、確定前文字がそのまま保存されない
- [ ] 改行（`\n`）を含めて入力した場合、保存時に半角スペースに正規化される
- [ ] 絵文字を入力した場合、正しく保存・表示される
- [ ] 長文（40文字以上）を入力した場合、バリデーションエラー「タイトルは40文字以内で保存できます」が表示される

**期待される結果**

- `BottomSheetTextInput` 上で日本語 IME が問題なく動作
- Android は `keyboardBehavior="fillParent"` + `android_keyboardInputMode="adjustResize"`、iOS/Web は `keyboardBehavior="interactive"` で、キーボード表示時も入力欄が隠れない
- 日本語 IME の候補欄が表示されても、タイトル欄は Safe Area 内で見え、他の入力項目と追加ボタンには Sheet 内スクロールで到達できる

---

### 5. リマインダー追加

- [ ] 右下の「+」ボタンをタップすると Bottom Sheet が開く
- [ ] タイトルを入力し、日付・時刻を選択して「ふわっと追加」ボタンを押すと保存される
- [ ] 保存中（`isSaving = true`）はボタンがローディング表示になり、連打しても2重送信されない
- [ ] 保存完了後、Bottom Sheet が閉じ、Bubble Board に新しい泡がアニメーション付きで表示される
- [ ] 日付プリセット（今日/明日/明後日）と「カレンダー」カスタム日付の両方が機能する
- [ ] 時刻プリセット（朝/昼/夜など）と「時計」カスタム時刻の両方が機能する
- [ ] 空欄で追加しようとすると「タイトルを入力してください」エラーが表示される

**期待される結果**

- `createReminderService` → `insertReminder` → `scheduleReminderNotifications` の一連の流れが完了
- 保存後に `upsertReminder` と `refresh({ silent: true })` でリストが更新される

---

### 6. DatePicker / TimePicker

- [ ] 「カレンダー」ボタンをタップすると、Modal 内に DatePicker（スピナー）が表示される
- [ ] 日付選択で「今日以降の日付を選べます」が表示され、過去日は選べない（`minimumDate={minCustomDate}`）
- [ ] 日付選択後、「この日付にする」ボタンで確定できる
- [ ] 「時計」ボタンをタップすると、Modal 内に TimePicker（スピナー）が表示される
- [ ] TimePicker は24時間制（`is24Hour`）で表示される
- [ ] TimePicker の locale が `ja-JP` で表示される
- [ ] 時刻選択後、「この時刻にする」ボタンで確定できる
- [ ] DatePicker/TimePicker いずれも、Modal の外側タップや「×」ボタンで閉じられる

**期待される結果**

- `@react-native-community/datetimepicker` のネイティブピッカーが正しく動作
- development build での表示が Expo Go と同じである（OS 標準ピッカーが出る）

---

### 7. SQLite 保存

- [ ] リマインダーを追加後、`listActiveReminders` で正しく取得できる
- [ ] 設定値（前日通知時刻、デフォルト時刻、自動消滅、テーマ）が SQLite に保存される
- [ ] `app_settings` テーブルに `id = 'default'` のレコードが存在する

**期待される結果**

- `expo-sqlite` + Drizzle ORM で CRUD が正常に動作
- ネイティブビルドで SQL エラーが出ない

---

### 8. アプリ再起動後のデータ保持

- [ ] リマインダーを複数追加後、アプリを完全に終了（キル）して再起動する
- [ ] 再起動後、追加したリマインダーが Bubble Board に表示される
- [ ] 設定画面で変更したテーマ・時刻・自動消滅設定が保持されている
- [ ] 再起動時に `cleanupExpiredReminders` が実行され、期限切れリマインダーが非表示になる

**期待される結果**

- SQLite のデータがストレージに永続化されている
- 起動時の初期化フロー（`_layout.tsx`）が正常に完了する

---

### 9. ローカル通知

- [ ] リマインダー保存時に、前日通知と当日通知がスケジュールされる
- [ ] development build では設定画面に「開発用通知テスト」セクションが表示される（`__DEV__`）
- [ ] 「通知テストモード」を ON にしてリマインダーを追加すると、10秒後と20秒後にテスト通知が届く
- [ ] テスト通知のタイトルが「通知テスト 前日」「通知テスト 当日」である
- [ ] 通常モードでは、設定した日時に正しく通知が届く（実際の日時を短縮して検証）
- [ ] 通知をタップするとアプリがフォアグラウンドに戻る
- [ ] Android: 通知音 ON のリマインダーが「リマインダー」通知チャンネルで届く
- [ ] Android: 通知音 OFF のリマインダーが「リマインダー（通知音なし）」通知チャンネルで届く
- [ ] Android: OSの通知チャンネル設定画面で、2つのチャンネル名が確認できる

**期待される結果**

- `expo-notifications` の `scheduleNotificationAsync` で予約された通知が、実機で確実に発火する
- iOS: `DATE` トリガー、Android: `TIME_INTERVAL` / `DATE` トリガーが正しく動作
- Android: 通知音の有無がチャンネル単位で安定して反映される

---

### 10. リマインダー削除

- [ ] Bubble をタップすると詳細 Bottom Sheet が開く
- [ ] 「削除する」ボタンを押すと確認ダイアログ（`Alert.alert`）が表示される
- [ ] 確認ダイアログに「予約済みの通知も一緒にキャンセルします。」と表示される
- [ ] 「キャンセル」を押すと削除されず、Sheet は開いたまま（または閉じない）
- [ ] 「削除する」を押すと、泡が薄膜破裂アニメーション（380ms）後に消える
- [ ] 削除後、Bubble Board から該当リマインダーが消え、残りが詰めて表示される
- [ ] Android: 標準サイズの泡で破片・水滴が泡の外側まで見え、380ms後に泡が消える
- [ ] Android: 横長の泡（長いタイトル）でも破片・水滴が外側まで見え、削除処理が待ち続けない
- [ ] Android: 削除失敗を発生させた場合、泡が復元アニメーション（220ms）後に戻り、失敗がエラーとして返る
- [ ] Android: 削除中に同じ泡を連続タップしても、削除・破裂アニメーションが二重実行されない

**期待される結果**

- `deleteReminderService` → `cancelReminderNotifications` → `deleteReminderById` の順で実行
- 削除中は `isDeleting` フラグで二重実行を防止

---

### 11. 削除時の通知キャンセル

- [ ] リマインダー削除後、`Notifications.getAllScheduledNotificationsAsync()` で該当通知 ID が消えている
- [ ] 前日通知と当日通知の両方がキャンセルされる
- [ ] 存在しない通知 ID のキャンセルでエラーが発生してもアプリがクラッシュしない

**期待される結果**

- `cancelReminderNotifications` で `previousNotificationId` と `targetNotificationId` の両方がキャンセルされる
- `cancelScheduledNotificationAsync` の失敗は `catch` でハンドリングされる

---

### 12. Bottom Sheet の開閉

- [ ] 右下「+」ボタンで入力 Sheet（`ReminderInputSheet`）が `present` する
- [ ] 背景の Backdrop をタップすると Sheet が閉じる（`enablePanDownToClose` も有効）
- [ ] Bubble タップで詳細 Sheet（`ReminderDetailSheet`）が開く
- [ ] 詳細 Sheet もスワイプダウンで閉じられる
- [ ] キーボード表示中に Sheet を閉じても、キーボードが追従して閉じる（Android: `fillParent`、iOS/Web: `interactive`）
- [ ] Sheet 開閉中に素早く連打しても、状態の不整合（開かない/閉じない）が発生しない

**期待される結果**

- `@gorhom/bottom-sheet` のネイティブ動作が development build で正しく動作
- `isPresentedRef` / `isClosingRef` による競合防止が機能している

### 12.1 リマインド追加 Sheet のキーボード安全性

- [ ] アプリ内の「+」から追加 Sheet を開いた場合、タイトル欄は自動フォーカスされず、手動タップでキーボードが表示される
- [ ] Widget からのコールドスタートで追加 Sheet を開いた場合、Sheet の表示完了後にタイトル欄へ自動フォーカスされる
- [ ] Widget からのウォーム起動でも、タイトル欄への自動フォーカスとキーボード表示が同じ結果になる
- [ ] タイトル欄を手動タップした状態で閉じるボタン、Backdrop、下スワイプ、Android Back を行うと、Sheet とキーボードが閉じる
- [ ] 表示中の素早い開閉・再表示・連打で、古いフォーカス要求によるキーボードの再表示が発生しない
- [ ] 日付 Picker または時刻 Picker を開く前にキーボードが閉じ、Picker を閉じても古いタイトルフォーカスでキーボードが再表示されない
- [ ] Android の日本語 IME 候補欄表示中に、タイトル欄がキーボードの背後へ入らない
- [ ] キーボードの高さを変更した後も、Sheet が実際のリサイズ領域へ再配置される
- [ ] Android の小画面端末で、タイトル欄が常に見え、日付・時刻入力と追加ボタンへ Sheet 内スクロールで到達できる

**受け入れ条件**

- Android は `fillParent + adjustResize`、iOS/Web は `interactive` で動作する
- すべての追加経路と表示タイミングでタイトル欄がキーボード上にあり、追加ボタンまでスクロール可能で、Sheet を閉じた後にキーボードが再出現しない

---

### 13. Bubble UI の動作速度

- [ ] 泡のゆらゆら浮遊アニメーションが滑らかに動作する（60fps 近く出ているか目視確認）
- [ ] 泡をタップした際の拡縮（タッチフィードバック）が遅延なく反応する
- [ ] リマインダー追加時の出現アニメーション（360ms）がカクつかない
- [ ] リマインダー削除時の薄膜破裂アニメーション（380ms）がカクつかない
- [ ] 泡が7個以上ある場合、オーバーフロー泡（`+N ほか`）が正しく表示される
- [ ] `useReducedMotion` が有効な端末では、アニメーションが抑制される
- [ ] Android: `useReducedMotion` が有効な端末では破片・水滴を描画せず、削除完了通知と削除処理が即時に進む

**期待される結果**

- `react-native-reanimated` のワークレットがメインスレッドをブロックしない
- development build（Release 相当のネイティブパフォーマンス）でアニメーションが Expo Go より滑らか

---

### 14. 小さい画面での表示崩れ

- [ ] iPhone SE（第3世代）相当の小さい画面でレイアウトが崩れない
- [ ] Android 小画面端末（5インチ台）でレイアウトが崩れない
- [ ] タイトルテキストが長い場合、`numberOfLines={2}` で ellipsis される
- [ ] Bottom Sheet の高さが `snapPoints={['58%', '78%']}` で適切に収まる
- [ ] ホームインジケーター/ナビゲーションバーと FAB（+ボタン）が被らない
- [ ] キーボード表示時、入力欄がキーボードに隠れない
- [ ] キーボード表示時、追加 Sheet はリサイズ後の利用可能領域を上限にし、収まらない内容は Sheet 内でスクロールできる

**期待される結果**

- Safe Area 対応（`react-native-safe-area-context`）が正しく機能
- 画面幅に応じた泡サイズ（`BUBBLE_SIZE_BUCKETS` + `clamp`）が適切に計算される

---

### 15. 設定画面

- [ ] ホーム画面の歯車アイコンから設定画面に遷移できる
- [ ] 設定画面から「<」でホーム画面に戻れる
- [ ] 前日の通知時刻を変更し、Blur で保存される（`onBlur={savePreviousTime}`）
- [ ] 当日のデフォルト時刻を変更し、Blur で保存される
- [ ] 自動消滅の ON/OFF が即座に反映され、再起動後も保持される
- [ ] テーマ（sky / lavender / mint）を切り替えると、即座に背景色が変わる
- [ ] 不正な時刻（例: `99:99`）を入力した場合、正規化されて保存される（`normalizeTimeInput`）

**期待される結果**

- `useAppSettings` の `update` が非同期で実行され、SQLite に永続化される
- テーマ変更時に `AppScreen` の `theme` prop が即座に反映される

---

### Android Widget（Development Build）

Android Widget は Expo Go では確認せず、Widget 対応済みの Development Build をホーム画面へ追加して確認する。提供スクリーンショットのように情報量の多い壁紙でも、面の内側の文字・日時・操作が読み取れることを受け入れ条件とする。

#### サイズと表示モード

- [ ] 250×180dp: 直近2件が縦並びのガラスカードで表示される
- [ ] 320×220dp: 直近3件が余白を保ったガラスカードで表示される
- [ ] 360×280dp: 直近4件が縦並びのガラスカードで表示される
- [ ] 360×320dp: 高さ39dpのカードで直近5件が縦並びに表示される
- [ ] 480×320dp: 直近5件のカード幅が広がり、文字・期限・余白のバランスが崩れない
- [ ] 360×380dp: 直近6件が同じ高さ39dpのカードで表示される
- [ ] 360×420dp: 直近7件が同じ高さ39dpのカードで表示される
- [ ] 360×460dp以上: 直近8件が表示され、9件目以降はWidget内に表示されない
- [ ] すべてのサイズで「ポップ・リマインダー」が左上、「＋ 追加」が下部中央に表示される
- [ ] すべてのサイズで「＋ 追加」のタップ領域が44dpあり、リサイズ後も中央からずれない

#### 空の背景と時間帯

- [ ] 05:00–09:59 は朝の淡い空、10:00–15:59 は昼の青空、16:00–18:59 は夕焼け、19:00–04:59 は夜空になる（Androidの次回更新後に反映）
- [ ] 朝・昼・夕方・夜の各背景で、予定タイトル・日時・「＋ 追加」が読める
- [ ] 空の画像はWidget内に収まり、リサイズ後も引き伸ばしによる不自然な切れや空白がない

#### 壁紙・データ状態

- [ ] 人物・線・文字が多い複雑な壁紙で、文字や日時の背後へ壁紙が透過して読みにくくならない
- [ ] 明るい単色壁紙と暗い単色壁紙で、背景面・水色の追加ボタン・濃紺文字のコントラストが保たれる
- [ ] 予定0件で「予定はありません」「＋ 追加から予定を登録」が表示される
- [ ] 複数件で、DB取得順の先頭から同じ高さの横長カードとして並ぶ
- [ ] 期限ドットがアプリ本体と同じ今日=赤、明日=オレンジ、2〜3日後=黄色、4日以降=水色で表示される
- [ ] 期限ドットの半透明の塗りと枠線が、アプリ本体の締切カラートークンと一致する
- [ ] 各カードに「今日」「明日」「明後日」または「M/d」と時刻が表示される
- [ ] 各カードでタイトルは左、通知日時は右端に1行で表示され、長いタイトルでも日時が押し出されない
- [ ] 表示上限を超えた予定はWidget内に追加表示せず、Widgetの高さに応じて直近2〜8件へ情報量を抑える

#### 操作・更新・表示崩れ

- [ ] 「＋ 追加」ボタンから `action=add` の既存導線で追加画面を開ける
- [ ] 各リマインドカードをタップすると既存の `action=view&id=...` 詳細導線でアプリを開ける
- [ ] カード内や右端に完了チェック、削除、追加メニューが表示されない
- [ ] 日本語の長いタイトルと英語の長いタイトルが1行で省略・縮小され、領域外へはみ出さない
- [ ] 予定の追加・削除・タイトル更新後に、カード位置が同じWidgetサイズで安定している
- [ ] リサイズ直後とアプリからのWidget更新後に、切れ・重なり・タップ領域のずれがない

**期待される結果**

- 時間帯ごとの空と薄いガラスベール、半透明カードで、背景の雲が見えつつ予定情報が明確に読める
- パステルの期限ドット、水色の追加ボタン、濃紺文字が選定モックと同じ情報階層で表示される
- Widget は確認・追加・詳細を開く役割に限定され、完了・削除操作は表示しない

### 16. development build と Expo Go で差が出た箇所

以下の項目は、development build でのみ確認可能、または Expo Go とは挙動が異なる可能性があるため、差分を記録してください。

| #   | 確認項目                    | development build                     | Expo Go                   | 差分あり/備考 |
| --- | --------------------------- | ------------------------------------- | ------------------------- | ------------- |
| 1   | アプリ名表示                | 「ポップ・リマインダー」              | 同左                      | □             |
| 2   | アイコン解像度              | ネイティブアセット                    | 同左                      | □             |
| 3   | Android adaptive icon       | 透明foreground + `#EFF8FF` background | Expo Go対象外             | □             |
| 4   | Android navigation bar      | `#EFF8FF` + dark icons                | Expo Go対象外             | □             |
| 5   | スプラッシュ表示            | `splash.png` + `#EFF8FF`              | 同左                      | □             |
| 6   | 通知権限ダイアログ          | iOS/Android ネイティブ                | 同左                      | □             |
| 7   | ローカル通知発火            | 実機プッシュ経由                      | Expo Go プッシュ経由      | □             |
| 8   | SQLite 永続化               | 実機ストレージ                        | 同左                      | □             |
| 9   | DatePicker 表示             | iOS: スピナー / Android: ネイティブ   | 同左                      | □             |
| 10  | TimePicker 表示             | iOS: スピナー / Android: ネイティブ   | 同左                      | □             |
| 11  | Android Backキー            | 開いている追加/詳細Sheetだけ閉じる    | 同左                      | □             |
| 12  | Bottom Sheet パフォーマンス | Release 相当で滑らか                  | JS ベースでやや重い可能性 | □             |
| 13  | Reanimated アニメーション   | ワークレットが最適化                  | 同左（やや遅い可能性）    | □             |
| 14  | `__DEV__` フラグ            | `true`（development build）           | `true`                    | □             |
| 15  | 開発用通知テスト            | 設定画面に表示される                  | 表示される                | □             |
| 16  | バンドル読み込み速度        | 初回のみネイティブ                    | 毎回 Metro からロード     | □             |
| 17  | フォント/アセット読み込み   | 事前にバンドル済み                    | 同左                      | □             |
| 18  | ディープリンク（`scheme`）  | `popreminder://`                      | 同左                      | □             |

---

### 17. Android 先行リリース確認

- [ ] `eas build --profile preview --platform android` で実機確認用APKを作成できる
- [ ] EAS production build の Android AAB を作成できる
- [ ] Google Play提出前に `android.versionCode` が前回提出版より大きい
- [ ] Google Play Console の内部テストまたはクローズドテストにアップロードできる
- [ ] Androidランチャーで丸/角丸などのマスクがかかってもアイコンが欠けないことを確認する
- [ ] Androidナビゲーションバーが淡い背景色で、ボタン/ジェスチャー表示が読めることを確認する
- [ ] Android 13+ 実機で通知権限、通知チャンネル、通知音 ON/OFF を確認する
- [ ] Android通知ドロワーで小アイコンが白い泡として表示され、通知アクセント色が不自然でない
- [ ] 追加Sheetと詳細Sheetを開いた状態でAndroid Backキーを押し、画面離脱ではなくSheetだけ閉じることを確認する
- [ ] Android 小画面端末で Home、追加 Sheet、設定画面、一覧画面が崩れない
- [ ] Google Play の配布ページから問い合わせ導線を用意する

**期待される結果**

- Android 先行リリースに必要な実機挙動とストア提出前チェックが完了する
- Widget 未実装であることがリリース判定のブロッカーにならない

---

### 18. App Store 後追い確認

- [ ] EAS production build の iOS app archive を作成できる
- [ ] App Store提出前に `ios.buildNumber` が前回提出版より大きい
- [ ] 初回App Storeリリースは `ios.supportsTablet = false` のiPhone対象として提出する
- [ ] iPhone SE 系、標準サイズ、Pro Max 系で Home、追加 Sheet、設定画面、一覧画面が崩れない
- [ ] iOS 実機で通知権限、通知音 ON/OFF、通知タップ復帰を確認する
- [ ] プライバシーポリシーと利用規約の問い合わせ文言が App Store でも不自然でない
- [ ] `ITSAppUsesNonExemptEncryption = false` が App Store Connect の暗号化申告と一致している

**期待される結果**

- Android 先行で入れた通知・設定導線が iOS リリース時にもそのまま使える
- iPad最適化、App Store 審査向けの追加申告、文言修正が必要な場合だけ別タスク化する

**備考欄**

- 差分があった場合、具体的な症状と再現手順を以下に記載してください。

```markdown
### 記録用メモ

- 項目番号:
- 症状:
- 再現手順:
- スクリーンショット/動画:
```

---

## 総合判定

- [ ] 全項目で問題なし（リリース候補として問題なし）
- [ ] 軽微な問題あり（対応後リリース可能）
- [ ] 重大な問題あり（追加修正が必要）

**備考:**
