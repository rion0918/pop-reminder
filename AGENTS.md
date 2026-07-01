# エージェント指示

- このファイルをリポジトリ全体のエージェント指示として扱う。
- 指示は短く、最新に保ち、重複させない。
- 既存の構成、命名、テスト方式、UI表現を優先する。
- TypeScript strict mode を前提にし、型エラーや lint を設定緩和で回避しない。
- ユーザーが明示しない限り、アプリ本体、Android widget、DB、通知、リリース設定の境界をまたぐ変更は最小限にする。

## リポジトリ構成

- `src/app/` — Expo Router のアプリエントリ、画面遷移、deep link の受け口。
- `src/app-tests/` — ルーティングやアプリ境界の回帰テスト。
- `src/features/reminders/` — リマインダー機能の画面、hooks、stores、services、repository、型。
- `src/features/settings/` — 設定画面、設定永続化、関連サービス。
- `src/db/` — SQLite/Drizzle の schema、DB client、初期化。
- `src/lib/notifications/` — Expo Notifications のスケジュール、チャンネル、権限まわり。
- `src/shared/` — 複数機能で共有するUIとユーティリティ。
- `src/widget/` — `react-native-android-widget` による Android widget UI、更新処理、DB snapshot。
- `docs/` — QA、リリース、ストア、プライバシーなどの運用ドキュメント。

## 開発プロセス

- 振る舞いを変更するときは TDD に従う。
- 実装前に失敗するテストを追加または更新し、RED を確認する。
- 実装後に同じテストが GREEN になることを確認する。
- テストは観測可能な振る舞いに集中させる。
- 既存のユーザー変更や未コミット差分を勝手に戻さない。
- 変更範囲外のリファクタリングは避ける。

## テスト方針

- 新規テストファイル名は `*.spec.ts` / `*.spec.tsx` を優先する。
- 既存の `*.test.js` は、触る必要がある時だけ段階的に移行する。
- 現在の標準検証は以下を使う。
  - `pnpm run format:check`
  - `pnpm test`
  - `pnpm run typecheck`
  - `pnpm run lint`
- リリース前の包括検証は `pnpm run verify:release` を使う。
- 文書のみの変更でも、影響がありそうなら通常検証を実行する。

## TypeScript と実装

- 公開境界、repository/service、hook、widget props では明示的な型を優先する。
- `any` は既存ライブラリ制約の回避など、理由がある場合だけ使う。
- 日付や時間の扱いは既存の `date-fns` とプロジェクト内ユーティリティに寄せる。
- 永続化と副作用は UI コンポーネントへ直接混ぜず、既存の service/repository/hook 境界を使う。
- 文字列処理で構造を扱う必要がある場合は、可能な限り既存APIや型で表現する。

## UI と React Native

- Expo / React Native の既存コンポーネント構成に合わせる。
- 画面UIは `src/features/**/screens` と関連 components に閉じる。
- 小さいAndroid幅でのはみ出しを避け、既存の responsive テストを参考にする。
- 操作可能な要素は押下フィードバック、到達可能性、テキスト収まりを確認する。
- アプリ本体のシャボン玉表現、色トークン、余白、影は既存の `constants/colors` と近い表現を再利用する。

## Android Widget

- Android widget の実装は原則 `src/widget/` に閉じる。
- `react-native-android-widget` の制約を優先し、通常の React Native style がそのまま使えると仮定しない。
- Widget UI 変更では `PopReminderWidget.bubble-ui.test.js` など、既存の widget 回帰テストを先に更新する。
- Widget のサイズ依存処理は `widgetWidth` / `widgetHeight` を使い、固定値だけに頼らない。
- Widget のクリック導線は deep link または `OPEN_APP` の既存パターンを維持する。
- Android native XML や Java/Kotlin 側は、必要が明確な時だけ変更する。

## SQLite / Drizzle

- DB schema と接続は `src/db/` を入口にする。
- リマインダー永続化は repository/service 層を通す。
- `expo-sqlite` のバージョン固有APIは公式シグネチャに合わせ、オプション引数を推測で渡さない。
- Widget からDBを読む場合は、アプリ本体との接続競合や Android 固有の例外を考慮する。
- DB初期化や接続先の変更では、再発調査に必要なログと回帰テストを追加する。

## 通知と Deep Link

- 通知スケジュール変更は `src/lib/notifications/` と reminder service の境界を守る。
- Android notification channel、音の有無、権限状態の扱いを壊さない。
- Widget や通知からの deep link は、まずホームへ着地してから add/detail UI を開く既存方針を維持する。
- deep link の変更時は `src/app-tests/` のテストを更新する。

## リリースと CI

- CI は `.github/workflows/ci.yml` の `pnpm run format:check`、`pnpm test`、`pnpm typecheck`、`pnpm lint` を前提にする。
- ストア/リリース関連は `docs/RELEASE_ANDROID_IOS.md`、`docs/QA_CHECKLIST.md`、`config.release.test.js` を確認する。
- リリース番号、ストア文言、プライバシー文言を変更する場合は、対応する docs と release regression test を合わせて更新する。
