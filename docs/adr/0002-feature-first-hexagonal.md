# ADR 0002: Feature-first lightweight Hexagonal Architecture

- Status: Accepted
- Date: 2026-07-12

## Context

画面ごとのローカル読み込み状態と、SQLite・通知・Widgetへ接続するservice facadeが重複し、画面間同期と外部境界の検証が難しくなっていた。一方、全面的なClean Architecture化はアプリ規模に対して過剰である。

## Decision

各featureを `domain`、`application`、`infrastructure`、`presentation` に分け、`bootstrap` をComposition Rootとする。SQLiteを唯一の永続的な真実とし、TanStack Query v5を非永続cacheとして利用する。ZustandはQuick Add draftと開発用設定だけを所有する。

ユースケースはPortのみを受け取り、DB行はSQLite Adapterでdomain型へ変換する。起動順序は通知handler設定、DB migration、期限切れ整理、画面公開とする。Deep Linkはroute parameterとしてHomeへ渡し、一度だけ消費する。

## Consequences

- Home、一覧、検索は同じquery cacheを共有する。
- domain/applicationはExpoやSQLiteから独立してテストできる。
- Query cacheは再起動時に破棄され、SQLiteから再取得される。
- outbox、クラウド同期、競合解決、楽観更新のrollbackは導入しない。
