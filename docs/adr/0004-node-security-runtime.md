# ADR 0004: Nix の Node.js を公式セキュリティ修正版に固定する

Date: 2026-10-22

## Status

Proposed

## Context

Node.js の2026年10月21日付セキュリティ修正に対し、本プロジェクトの Nix は `24.16.0` を使用していた。確認した nixpkgs の公開ブランチは `24.21.0` で、修正版 `24.22.1` には達していなかった。Nix 版は共有ライブラリを使うため、Node.js のソースの版だけを差し替えても Brotli・OpenSSL などの修正を取り込めるとは限らない。

## Decision

Nix の開発シェルで Node.js 公式配布の `24.22.1` バイナリを使用し、配布元の SHA-256 で固定する。版は `.node-version` から読み、pnpm の実行環境にも同じ Node.js を渡す。既存の macOS / Linux、ARM64 / x64 の4環境を維持し、Linux は Nix の動的リンカーに合わせて補正する。

検討した他案:

- nixpkgs の更新のみ: 確認時点の公開ブランチでは修正版に届かない。
- 既存 Node.js パッケージのソースのみ更新: 共有ライブラリの修正漏れを避けられないため採用しない。

## Consequences

- 利点: Node.js 本体と同梱依存のセキュリティ修正を取り込み、開発・CI・EAS の指定版を揃えられる。
- 受け入れる欠点: Node.js 更新時には4環境分のチェックサム更新が必要になる。公式配布バイナリへの依存と Linux の補正処理を持つ。
- 確認方法: Nix シェル内の `node --version`、pnpm の Node.js 実行先、設定テスト、標準ゲートを確認する。
- 見直し条件: nixpkgs の Node.js と共有ライブラリが修正済みになった時点で、通常の Nix パッケージに戻せるか確認する。

根拠: [Node.js 公式セキュリティ告知](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)、[公式チェックサム](https://nodejs.org/dist/v24.22.1/SHASUMS256.txt)。アプリは Hermes で実行されるため、このビルド環境更新に伴うストア再配布は不要と判断した。
