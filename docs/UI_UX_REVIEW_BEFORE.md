# UI/UX 評価レポート（修正前）

対象：ポップ・リマインダー MVP
目的：テーマ・大枠デザインを維持しつつ、細部の品質を引き上げるための現状評価

---

## 1. 現在の良い点

- **世界観の一貫性**: 空色ベースの淡い配色、シャボン玉の Bubble UI、柔らかいフォントウェイトで「ふわっと残す」コンセプトが表現されている。
- **操作フローの簡潔さ**: ホーム → 右下「+」 → タイトル＋日時選択 → 保存という流れが直感的。
- **永続化・通知の基盤**: SQLite + expo-notifications の保存・予約・キャンセルが適切に分離されている。
- **アクセシビリティの配慮**: 多くの Pressable に `accessibilityRole` / `accessibilityLabel` / `hitSlop` が設定されている。
- **Bubble UI の演出**: Reanimated を使った浮遊アニメーション、出現アニメーション、バーストエフェクトが上品。
- **日本語 IME 対応**: `BottomSheetTextInput` を uncontrolled にしており、変換確定前の誤送信リスクが低い。
- **状態管理の基本設計**: Zustand で入力状態を一元管理し、重複実行防止用の ref も用意されている。
- **小画面対応の兆候**: Bubble サイズが画面サイズに応じて clamp される仕組みがある。
- **再レンダリング抑制**: `ReminderBubbleBoard` / `ReminderBubble` に `memo` が適用されている。

---

## 2. UX 上の違和感

### 2.1 ホーム画面

- **Bubble と FAB の重なりリスク**: `bubbleArea` の `marginBottom: 104` に対し、FAB の上端は画面下から 92pt の位置に来るため、縦方向に 12pt 程度の重なり領域が生じている。配置アルゴリズムの `lowerRightPenalty` は相対座標ベースで、必ずしも FAB 領域を回避できていない。
- **Bubble とヘッダーの干渉**: 現状は大きく重ならないが、小さい画面で Bubble がやや上寄りに配置されると、ヘッダー下の泡が圧迫感を持つ可能性がある。
- **空状態の誘導**: 「右下から」の矢印が画面右下を向いているが、FAB への視線誘導は機能している。ただし矢印の角度が -18deg でやや内側を向いており、FAB 位置とずれている。

### 2.2 Bubble UI

- **同時選択状態の不安定さ**: `DateChips` の相対チップ（今日/明日/明後日）の active 判定に `!customDate && chip.value === value` が含まれており、プリセット切り替え時に意図しないチップが active に見えることがある。
- **タップフィードバック不足**: Bubble 以外の Chip / 設定行など、多くの操作要素に `pressed` 状態の視覚フィードバックがない。シャボン玉の世界観に対して操作感が「固い」。
- **長いタイトルの可読性**: `numberOfLines={2}` は設定されているが、極端に小さい泡ではタイトルが読みづらくなる（最小 fontSize 17 は現状維持で可）。

### 2.3 クイック入力 Bottom Sheet

- **過去日時の保存が可能**: `selectIsTimeValid` は時刻形式のみをチェックしており、例えば「今日 07:00」（現在時刻より過去）でも保存ボタンが有効になる。保存後は通知がスケジュールされず、ユーザーは「通知が来ない」という違和感を持つ。
- **日付・時刻の確認表示**: サマリーは「X/Y/Z HH:mm にふわっと通知」と分かりやすいが、過去時刻の場合はそのまま表示されてしまう。
- **Chip の選択状態**: active 時の背景が `#74BDF6`（空色）で白文字。コントラストはやや低めで、視認性に若干の不安がある。
- **保存ボタンの無効化条件**: 時刻形式不正時のみ disabled になっており、未来日時チェックがない。

### 2.4 日付・時刻選択

- **カスタム日付ラベル**: `formatCustomDate` が `M/d` のみなので、年をまたいだ日付でも「1/1」としか表示されない。ただしサマリーには年が出るため致命的ではない。
- **「夜」の配置**: 4 つのプリセットが 1 行に並ぶ。小さい画面ではやや窮屈だが、現状は下段に落ちていない。
- **Chip のタップ領域**: Chip 同士の gap は 8pt、高さ 40pt と適切。ただし pressed フィードバックがない。

### 2.5 設定画面

- **行全体のタップ領域**: スイッチ行はスイッチ本体のみが操作できる。行全体をタップして ON/OFF 切り替えができない。
- **戻るボタン**: `hitSlop` が設定されておらず、タップしにくい。
- **時刻入力**: `keyboardType="numbers-and-punctuation"` だと iOS で `:` の入力に切り替えが必要。数字パッドの方が楽だが、現状でも入力は可能。

---

## 3. パフォーマンス上の懸念

- **Bubble レイアウトの再計算**: `ReminderBubbleBoard` の `boardLayout` useMemo は `reminders` / `visibleReminders` / `boardSize` に依存している。`HomeScreen` の `isSaving` や `selectedReminder` 変化で再レンダーが走ると、`visibleReminders` は memo 化されているものの、実際のレイアウト計算が必要以上に実行される可能性がある。
- **Bubble の大量 View**: 1 つの Bubble に 15 近い絶対配置 View / Gradient / ボーダーがあり、7 個同時表示で 100 View 近くになる。低端末では重くなる可能性がある。
- **idle アニメーションの停止処理**: `idleDisabled` が変化するたびに全 Bubble が再レンダーされる。アニメーション自体はネイティブだが、React 側での再レンダーが発生する。
- **削除時のタイマー**: `handleDeleteReminder` 内で `setTimeout(resolve, 260)` を使っているが、コンポーネントアンマウント時のクリーンアップがない。

---

## 4. 状態管理上の懸念

- **重複実行防止の二重管理**: `isSaving` は Zustand と `isSavingRef` の両方で管理されている。ロジックは正しく動作するが、単一の信頼源にできればより堅牢。
- **Bottom Sheet の開閉フラグ**: `isPresentedRef` / `isClosingRef` / `isSaveRequestedRef` など複数の ref で状態を管理しており、急速な連打時に不整合が生じる可能性は低いが、メンテナンスコストが高い。
- **入力欄のクリアタイミング**: `onDismiss` で `draftTitleRef` をクリアするが、Sheet が閉じる前に次の入力が始まる可能性は低い。
- **日付プリセットの遷移**: `setCustomTargetDate(null)` の場合に `datePreset` を強制的に `'tomorrow'` に戻すが、ユーザーが今日を選んでいた場合に「明日」に戻ってしまう可能性がある。

---

## 5. 修正すべき優先順位

| 優先度 | 項目                                    | 理由                                                 |
| ------ | --------------------------------------- | ---------------------------------------------------- |
| P0     | **過去日時保存の防止**                  | 保存後に通知が来ないという致命的な UX バグに直結する |
| P1     | **FAB 領域の Bubble 回避**              | 操作性を阻害し、小画面で重なりやすい                 |
| P1     | **Chip / 設定行のタップフィードバック** | 「気持ちいい操作感」を実現する上で最も効果が高い     |
| P1     | **設定行全体のタップ領域**              | 設定画面の直感性を大きく改善                         |
| P2     | **レイアウト計算の最適化**              | Bubble 増加時のパフォーマンス安定化                  |
| P2     | **削除タイマーのクリーンアップ**        | 潜在的なメモリリーク対策                             |
| P2     | **カスタム日付ラベルの年表示**          | 年またぎ時の誤解防止                                 |
| P3     | **その他微調整**                        | ヒットスロップ、空状態矢印、文字コントラストなど     |

---

## 6. 今回触るファイル

- `src/features/reminders/components/ReminderInputSheet.tsx`
- `src/features/reminders/components/DateChips.tsx`
- `src/features/reminders/components/TimeChips.tsx`
- `src/features/reminders/components/ReminderBubbleBoard.tsx`
- `src/features/reminders/screens/HomeScreen.tsx`
- `src/features/settings/screens/SettingsScreen.tsx`
- `src/features/settings/components/SettingRow.tsx`
- `src/shared/utils/time.ts`（必要に応じて、現状は触らない方向）

---

## 7. 今回触らないファイル

- `src/db/schema.ts`
- `src/db/client.ts`
- `src/lib/notifications/reminderNotifications.ts`
- `src/features/reminders/services/createReminderService.ts`
- `src/features/reminders/services/deleteReminderService.ts`
- `src/features/reminders/services/reminderRepository.ts`
- `src/features/reminders/services/reminderCleanupService.ts`
- `src/features/reminders/services/reminderDateService.ts`
- `src/features/reminders/hooks/useReminders.ts`
- `src/features/reminders/stores/reminderUiStore.ts`
- `src/constants/colors.ts`（色味は変更しない）
- `src/app/_layout.tsx`

---

## 8. 修正リスク

- **過去日時バリデーション**: 追加すると「今日」+ 過去時刻の保存ができなくなるが、これは通知仕様上の正しい挙動。ユーザーには「過去の日時は通知されません」のような表示が必要。
- **FAB 回避領域の拡大**: Bubble 配置が下寄りに少なくなり、小さい画面で空間がもったりに見える可能性がある。ペナルティ値の調整が必要。
- **設定行全体タップ**: Switch や TextInput と競合しないよう、行全体の onPress と子コントロールの onPress を分離する必要がある。
- **Chip active 判定の変更**: `DateChips` の active ロジックを調整する際、相対チップと計算チップの整合性を保つ必要がある。

---

## 9. 備考

- `pnpm typecheck` と `pnpm lint` は現状で成功している。
- 修正後も両方のチェックが通ることを必須条件とする。
