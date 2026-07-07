# エージェント指示

pop-reminder は Expo / React Native / Expo Router のクロスプラットフォーム・リマインダーアプリです。SQLite / Drizzle、通知、Android widget を扱うため、変更は既存の境界に沿って小さく保ってください。

## 見る場所

- `src/app/` — ルーティング、アプリ起動、deep link の受け口。
- `src/features/` — リマインダーと設定の画面、hooks、stores、services、型。
- `src/db/` — SQLite / Drizzle schema、DB client、初期化。
- `src/lib/notifications/` — Expo Notifications の権限、channel、schedule。
- `src/widget/` — Android widget UI、更新処理、DB snapshot。
- `docs/` — QA、リリース、ストア、プライバシーの運用メモ。

## 必ず使う検証

- `pnpm run mvh:verify`

## ルール

- 振る舞いを変える時は先に観測可能なテストを更新し、RED/GREEN を確認する。
- ハーネス方針は `docs/adr/0001-harness-policy.md` を参照し、説明文書より実行可能なテスト・ルール・CI を真実として扱う。
- `biome.json`、`lefthook.yml`、`flake.nix`、`package.json`、`pnpm-lock.yaml`、`.codex/hooks/**`、`scripts/mvh-*`、`tools/biome-rules/**` は保護対象。明示承認なしに改竄しない。
