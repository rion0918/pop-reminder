# pop-reminder エージェントガイド

Expo / React Native の Android・iOS リマインダーアプリ。依存バージョンと実行コマンドは `package.json`、検証契約はテスト・Biome・CI を正とする。

## 作業範囲と完了条件

- 要求された振る舞いに必要な変更だけを行う。承認済みの範囲で、実装・関連検証・自分の変更に起因する失敗の修正まで進める。
- 自分の変更に起因するローカル検証の失敗は、修正して対象の検証を再実行する。無関係な既存エラーは切り分け、完了した確認と残る阻害要因を報告する。失敗や未検証を成功扱いにしない。
- 必須の参照や権限が不足し、根拠を持って進められない作業は停止して報告する。
- `biome.json`、`lefthook.yml`、`flake.nix`、`package.json`、`pnpm-lock.yaml`、`AGENTS.md`、`.codex/hooks/**`、`scripts/mvh-*`、`tools/biome-rules/**` は保護対象。変更や権限境界を越える操作には明示承認が必要。検証を通すために保護を緩めない。

## アプリ固有の境界

- 画面から SQLite・通知・Widget のネイティブ実装を直接呼ばない。`expo-sqlite` の直接 import は `src/db/` と `src/widget/`、`expo-notifications` は `src/lib/notifications/` に限定する。
- reminders のユースケースは `src/features/reminders/application/` の Port のみに依存し、Adapter は `src/bootstrap/appServices.ts` で接続する。
- Router の入口は `src/app/`、画面実装は `src/features/*/screens/` に分ける。
- DB のテーブル定義は `src/db/schema.ts`、起動時の互換初期化は `src/db/client.ts` に置く。専用 migration パッケージは導入しない。
- 永続データは SQLite、読み込み・mutation・画面間同期は TanStack Query、Quick Add draft・開発用設定は Zustand、選択・検索・削除アニメーションは画面ローカルに置く。
- reminders の追加・削除・タイトル更新では `src/widget/widgetUpdateService.tsx` の同期契約を維持する。Widget は通常アプリとは別の SQLite 接続で snapshot を読む。
- プラットフォーム差分は既存の `.native.tsx`・`.android.tsx` の解決規則に沿わせる。

## ADR の参照と記録

- 作業前に [ADR 運用ガイド・一覧](docs/adr/README.md) と、変更対象に関係する Accepted ADR を確認する。
- 複数のモジュールに影響する判断、長く効く制約、後から採用理由を知る必要がある選択は、テンプレートを使って Proposed ADR として記録する。Accepted への変更はユーザーの採用確認後に行う。
- 実装と Accepted ADR の矛盾や判断の変更が必要な場合は、変更前に理由を提示して相談する。採用後の判断変更は新しい ADR に記録し、旧記録を Superseded にして相互リンクする。
- PR には関連 ADR と、相談に利用した Discussion のリンクを記載する。ADR が不要な場合は理由を短く記載する。Discussion は必要な相談にだけ使い、投稿は個別の指示を受けて行う。

## 検証と参照

- 標準ゲートは `pnpm run mvh:verify`。変更に対応する既存 spec を使い、合格後の繰り返しや検証範囲の拡大は、新たな変更・失敗・未解決の懸念がある場合に行う。
- 通知・SQLite・Android Widget の実機確認には Development Build を使う。通知や Widget の実機挙動を変えた場合は `docs/QA_DEVELOPMENT_BUILD.md` と関連テストを更新する。
- セットアップ・ビルド・MVH の運用、または実装の参照先が必要なときは [.agents/references/project-operations.md](.agents/references/project-operations.md) の該当節を読む。
- リリース準備では `docs/RELEASE_ANDROID_IOS.md` を参照し、`pnpm run verify:release` で確認する。
