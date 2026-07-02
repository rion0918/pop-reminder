# Codex MVH ハーネス

このリポジトリには、Codex が自律的に作業しても検証を飛ばしにくくするための最小実行可能ハーネス（MVH）があります。目的は、速い決定論的チェック、テスト実行、アーキテクチャ境界の保護、設定改竄の検知をひとつのフィードバックループにまとめることです。

## 仕組み

- `biome.json` は Codex 向けの高速フィードバックエンジンです。既存の Prettier / Expo ESLint を置き換えず、追加のガードとして動きます。
- `tools/biome-rules/*.grit` は Biome のカスタムルールです。`expo-sqlite` は `src/db/` / `src/widget/` 以外、`expo-notifications` は `src/lib/notifications/` 以外から直接 import すると、修正方針つきで失敗します。
- `.codex/hooks.json` は Codex の `apply_patch` 後に `.codex/hooks/post_write_feedback.sh` を呼びます。そこで `scripts/mvh-feedback.mjs` が guard、Biome、test を実行し、失敗時は `::mvh-feedback-json-begin` / `::mvh-feedback-json-end` の間に構造化 JSON を出します。
- `lefthook.yml` は `pre-commit` で `00-protected-harness-config`、`10-biome`、`20-test` の順に実行します。
- `scripts/mvh-guard-protected-files.mjs` は `biome.json`、`lefthook.yml`、`package.json`、`.codex/hooks/**`、`scripts/mvh-*`、`tools/biome-rules/**` などの保護対象ファイルが無断変更されていないかを確認します。
- `src/app-tests/mvh-harness.spec.ts` は package script、Codex hook、保護対象パスの期待値をテストで固定しています。

## メリット

- Codex がファイルを書いた直後に、失敗内容を機械可読な形で受け取れます。
- SQLite、通知、widget など壊れやすい境界に直接依存が漏れにくくなります。
- pre-commit で Biome とテストが走るため、検証忘れを減らせます。
- ハーネス設定そのものを書き換えてエラーを消す「ルール改竄」を検知できます。
- 既存の `pnpm test`、`pnpm run typecheck`、`pnpm run lint`、`pnpm run format:check` は残るため、従来の品質ゲートと併用できます。

## 使うコマンド

- 初回セットアップ、または hook を入れ直す時:
  `pnpm run mvh:setup`
- MVH 全体を確認する時:
  `pnpm run mvh:verify`
- Codex 用の構造化フィードバックを手動で見たい時:
  `pnpm run mvh:feedback`
- Biome だけ確認する時:
  `pnpm run biome:check`
- Lefthook の pre-commit を手動実行する時:
  `pnpm exec lefthook run pre-commit --force --no-auto-install`

## ユーザー操作が必要な場面

- 新しく clone した後や `node_modules` を作り直した後は、`pnpm install` の後に `pnpm run mvh:setup` を実行してください。
- `biome.json`、`lefthook.yml`、`package.json`、`.codex/hooks/**`、`scripts/mvh-*`、`tools/biome-rules/**` などを意図して変更する場合だけ、明示的に `MVH_ALLOW_PROTECTED_CONFIG_CHANGE=1` を付けて検証します。
- 例:
  `MVH_ALLOW_PROTECTED_CONFIG_CHANGE=1 pnpm run mvh:verify`
- 通常のアプリ実装、画面修正、service/repository 修正では `MVH_ALLOW_PROTECTED_CONFIG_CHANGE=1` を使わないでください。

## 禁止・注意事項

- Biome や Lefthook のエラーを消す目的で、保護対象ファイルを無断で緩めないでください。
- `MVH_ALLOW_PROTECTED_CONFIG_CHANGE=1` は「ユーザーがハーネス変更を明示した時」だけ使ってください。
- Biome は Prettier / Expo ESLint の完全な置き換えではありません。既存の標準検証は引き続き使います。
- `pnpm run format:check` が docs だけで失敗する場合でも、ユーザー作成中の未追跡ファイルは勝手に整形しないでください。
- Lefthook の hook install は `.git/hooks` に書き込むため、環境によっては権限確認が必要です。

## 失敗した時の見方

- `protected-files` が失敗した場合、保護対象ファイルが変更されています。意図しない変更なら戻し、意図した変更ならユーザー承認の上で `MVH_ALLOW_PROTECTED_CONFIG_CHANGE=1` を使います。
- `biome` が失敗した場合、出力のメッセージに従って import 境界、構文、formatter/lint の問題を直します。`biome.json` を緩めて隠さないでください。
- `tests` が失敗した場合、観測可能な振る舞いを直すか、仕様変更が明確な場合だけテストを更新します。
