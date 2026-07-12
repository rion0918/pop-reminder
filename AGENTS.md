# pop-reminder エージェントガイド

## 最優先の制約

- 既存のレイヤー境界を守り、変更は目的に必要な範囲だけに留める。
- 画面から SQLite、通知、Widget のネイティブ実装を直接呼び出さない。
- `expo-sqlite` の直接 import は `src/db/` と `src/widget/` に限定する。
- `expo-notifications` の直接 import は `src/lib/notifications/` に限定する。
- reminders の service は `src/features/reminders/ports/` の型と `reminderServiceDependencies.ts` を介して外部実装へ接続する。
- 状態変更を伴う作業は、観測可能なテストを先に更新して RED、実装後に GREEN を確認する。
- ハーネスの真実は説明文書ではなく、テスト、Biome ルール、package scripts、CI に置く。
- `biome.json`、`lefthook.yml`、`flake.nix`、`package.json`、`pnpm-lock.yaml`、`AGENTS.md`、`.codex/hooks/**`、`scripts/mvh-*`、`tools/biome-rules/**` は保護対象。明示承認なしに変更しない。

## プロジェクト概要

- Expo SDK 54、React Native 0.81、React 19、TypeScript 5.9、Expo Router 6 の Android / iOS / Web 対応アプリ。
- `src/app/` が typed routes を有効にした Expo Router の入口で、起動初期化と通知・Widget の deep link を受け取る。
- `src/features/reminders/` が泡 UI、入力・詳細・検索・一覧、hooks、Zustand UI store、Zod schema、service、repository、port を持つ。
- `src/features/settings/` が設定画面、設定 hook、SQLite 永続化サービス、設定型を持つ。
- SQLite / Drizzle の schema と DB client は `src/db/`、ローカル通知の channel・権限・予約・キャンセルは `src/lib/notifications/` に集約する。
- Android Widget は `src/widget/` にあり、通常アプリとは別の SQLite 接続で snapshot を読み、データ変更後に更新する。
- NativeWind / Tailwind と Reanimated を UI の基本に使い、色・画面トークンは `src/constants/colors.ts` と `tailwind.config.js` を参照する。
- iOS の泡破裂は `ReminderBubbleBurst.native.tsx`、Android は `ReminderBubbleBurst.android.tsx`、Web は `ReminderBubbleBurst.web.tsx` を使う。

## 実装時の境界

- ルートファイルは `src/app/`、画面の実装は各 feature の `screens/` に置く。新しい画面は Router の入口と feature 画面を分ける。
- DB のテーブル定義と起動時の互換初期化は `src/db/schema.ts` と `src/db/client.ts` に置く。専用 migration パッケージは使わない。
- reminders の CRUD は `src/features/reminders/services/reminderRepository.ts`、副作用を伴うユースケースは同ディレクトリの各 service を参照する。
- 入力の trim・文字数・日付時刻検証は `src/features/reminders/schemas/reminderSchema.ts` と日付 service/util を参照する。
- 永続データは repository/service、画面だけの状態は `src/features/reminders/stores/` の Zustand に置く。新しいグローバル状態管理を追加しない。
- reminders の追加・削除・タイトル更新では `src/widget/widgetUpdateService.tsx` の同期契約を維持する。
- 通知や Widget の実機挙動を変更したら、Development Build を使い、`docs/QA_DEVELOPMENT_BUILD.md` と関連テストを更新する。
- プラットフォーム差分は既存の `.native.tsx`、`.android.tsx`、`.web.tsx` の解決規則に沿わせ、共通ファイルに分岐を増やしすぎない。

## テストと検証

- テストランナーは Node.js 標準 `node --import tsx --test`。対象は `config.release.test.js` と `src/**/*.spec.ts(x)`。
- DB binding、通知 channel、Widget 同期、deep link、レスポンシブ UI、source contract、プラットフォーム実装は既存 spec の近くにテストを追加する。
- 実装契約の確認には `src/test-utils/sourceAssertions.ts`、アーキテクチャ違反の確認には `tools/biome-rules/` を使う。
- 標準ゲートは `pnpm run mvh:verify`。Prettier、保護ファイル guard、Biome、test、typecheck、Expo lint を順に実行する。
- 個別確認には `pnpm test`、`pnpm run typecheck`、`pnpm run lint`、`pnpm run format:check`、`pnpm run biome:check`、`pnpm run doctor` を使う。
- リリース相当の確認は `pnpm run verify:release`。Android / iOS の Expo export まで実行する。

## 開発・実機コマンド

- 環境は `nix develop` または direnv。固定 Node.js は `.node-version` の 24.16.0、pnpm は 10.8.1。
- 初回セットアップは `pnpm install` の後に `pnpm run mvh:setup`。
- Development Build の Metro は `pnpm run start:dev-client`、Expo Go は `pnpm run start:expo-go`、Web は `pnpm run web`。
- ネイティブローカル実行は `pnpm run android` または `pnpm run ios`。
- 通知・SQLite・Android Widget の確認には Expo Go を使わず Development Build を使う。
- EAS の開発ビルドは `eas build --profile development --platform android` または `ios`。release 手順は `docs/RELEASE_ANDROID_IOS.md` を参照する。
- MVH の構造化フィードバックは `pnpm run mvh:feedback`、hook の初期化は `pnpm run mvh:setup` を使う。

## 参照先

- 技術構成は `docs/TECH_STACK.md`、外部境界の方針は `docs/NEW_ARCHITECTURE_ALIGNMENT.md` を参照する。
- MVH の方針と保護ファイルの扱いは `docs/MVH_HARNESS.md` と `docs/adr/0001-harness-policy.md` を参照する。
- 起動・通知・deep link は `src/app/_layout.tsx`、DB は `src/db/client.ts`、通知は `src/lib/notifications/reminderNotifications.ts` を起点に読む。
- 画面から service までの実例は `src/features/reminders/screens/HomeScreen.tsx` と `src/features/reminders/services/createReminderService.ts` を参照する。
