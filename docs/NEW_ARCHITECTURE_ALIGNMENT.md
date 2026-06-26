# React Native New Architecture Alignment

このアプリでは、React Native New Architecture の考え方を「外部実装に触れる境界を型で固定する」方針として扱う。

## 方針

- feature のサービスは、Expo Notifications や DB などの実装詳細を直接知りすぎない。
- JS と native の境界で Spec を単一の参照元にする考え方にならい、アプリ内の外部境界も port 型を単一の参照元にする。
- feature から見える契約は `src/features/*/ports` に置く。
- 具体実装の接続は service dependencies に集約する。
- 既存機能の挙動は変えず、依存の向きだけを整理する。

## Reminders

`reminders` feature では、サービス層が通知実装と設定取得実装を直接呼ばない。

- `ReminderNotificationGateway`
  - リマインダー通知の予約、テスト通知予約、キャンセルの契約。
  - Expo Notifications への接続は `reminderNotificationGateway` で行う。
- `ReminderSettingsGateway`
  - リマインダー処理に必要な設定だけを返す契約。
  - settings repository への接続は `reminderServiceDependencies` に集約する。

この形により、将来 native module や通知実装を差し替える場合も、feature サービス側は port 型を守ったまま変更できる。
