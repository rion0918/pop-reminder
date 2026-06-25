# Development Build QA チェックリスト

## 概要

EAS Build による development build（`.ipa` / `.apk`）を実機にインストールし、ポップ・リマインダー MVP の動作を確認するためのチェックリストです。

## テスト環境

| 項目 | 内容 |
|------|------|
| ビルド種別 | development build（`developmentClient: true`） |
| 配布方法 | internal distribution（`.ipa` / `.apk`） |
| 対象 OS | iOS / Android |
| 前提条件 | 通知権限のリクエスト、日本語 IME、SQLite、Expo Notifications が実機ネイティブ環境で動作することを確認 |

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
- [ ] アプリアイコンが `assets/icon.png` で設定された画像で表示される
- [ ] iOS: アダプティブアイコンの背景色が `#EFF8FF` で反映されている
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

**期待される結果**
- `requestNotificationPermissions()` で権限状態が正しく取得・更新される
- 権限がない場合でもアプリがクラッシュしない

---

### 4. 日本語 IME

- [ ] リマインダー追加時のテキスト入力で日本語変換が正しく動作する
- [ ] 変換中（未確定文字）で「追加」ボタンを押しても、確定前文字がそのまま保存されない
- [ ] 改行（`\n`）を含めて入力した場合、保存時に半角スペースに正規化される
- [ ] 絵文字を入力した場合、正しく保存・表示される
- [ ] 長文（40文字以上）を入力した場合、バリデーションエラー「タイトルは40文字以内で保存できます」が表示される

**期待される結果**
- `BottomSheetTextInput` 上で日本語 IME が問題なく動作
- `keyboardBehavior="interactive"` でキーボード表示時に入力欄が隠れない

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

**期待される結果**
- `expo-notifications` の `scheduleNotificationAsync` で予約された通知が、実機で確実に発火する
- iOS: `DATE` トリガー、Android: `TIME_INTERVAL` / `DATE` トリガーが正しく動作

---

### 10. リマインダー削除

- [ ] Bubble をタップすると詳細 Bottom Sheet が開く
- [ ] 「削除する」ボタンを押すと確認ダイアログ（`Alert.alert`）が表示される
- [ ] 確認ダイアログに「予約済みの通知も一緒にキャンセルします。」と表示される
- [ ] 「キャンセル」を押すと削除されず、Sheet は開いたまま（または閉じない）
- [ ] 「削除する」を押すと、泡がバーストアニメーション（260ms）後に消える
- [ ] 削除後、Bubble Board から該当リマインダーが消え、残りが詰めて表示される

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
- [ ] キーボード表示中に Sheet を閉じても、キーボードが追従して閉じる（`keyboardBehavior="interactive"`）
- [ ] Sheet 開閉中に素早く連打しても、状態の不整合（開かない/閉じない）が発生しない

**期待される結果**
- `@gorhom/bottom-sheet` のネイティブ動作が development build で正しく動作
- `isPresentedRef` / `isClosingRef` による競合防止が機能している

---

### 13. Bubble UI の動作速度

- [ ] 泡のゆらゆら浮遊アニメーションが滑らかに動作する（60fps 近く出ているか目視確認）
- [ ] 泡をタップした際の拡縮（タッチフィードバック）が遅延なく反応する
- [ ] リマインダー追加時の出現アニメーション（360ms）がカクつかない
- [ ] リマインダー削除時のバーストアニメーション（260ms）がカクつかない
- [ ] 泡が7個以上ある場合、オーバーフロー泡（`+N ほか`）が正しく表示される
- [ ] `useReducedMotion` が有効な端末では、アニメーションが抑制される

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

### 16. development build と Expo Go で差が出た箇所

以下の項目は、development build でのみ確認可能、または Expo Go とは挙動が異なる可能性があるため、差分を記録してください。

| # | 確認項目 | development build | Expo Go | 差分あり/備考 |
|---|---------|-------------------|---------|--------------|
| 1 | アプリ名表示 | 「ポップ・リマインダー」 | 同左 | □ |
| 2 | アイコン解像度 | ネイティブアセット | 同左 | □ |
| 3 | スプラッシュ表示 | `splash.png` + `#EFF8FF` | 同左 | □ |
| 4 | 通知権限ダイアログ | iOS/Android ネイティブ | 同左 | □ |
| 5 | ローカル通知発火 | 実機プッシュ経由 | Expo Go プッシュ経由 | □ |
| 6 | SQLite 永続化 | 実機ストレージ | 同左 | □ |
| 7 | DatePicker 表示 | iOS: スピナー / Android: ネイティブ | 同左 | □ |
| 8 | TimePicker 表示 | iOS: スピナー / Android: ネイティブ | 同左 | □ |
| 9 | Bottom Sheet パフォーマンス | Release 相当で滑らか | JS ベースでやや重い可能性 | □ |
| 10 | Reanimated アニメーション | ワークレットが最適化 | 同左（やや遅い可能性） | □ |
| 11 | `__DEV__` フラグ | `true`（development build） | `true` | □ |
| 12 | 開発用通知テスト | 設定画面に表示される | 表示される | □ |
| 13 | バンドル読み込み速度 | 初回のみネイティブ | 毎回 Metro からロード | □ |
| 14 | フォント/アセット読み込み | 事前にバンドル済み | 同左 | □ |
| 15 | ディープリンク（`scheme`） | `popreminder://` | 同左 | □ |

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

