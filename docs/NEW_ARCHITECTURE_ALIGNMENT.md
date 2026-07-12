# React Native New Architecture Alignment

React Native New Architecture は有効なまま維持し、アプリケーションコードは feature-first の軽量 Hexagonal Architecture で外部境界を分離する。

## 依存方向

```text
presentation -> application -> domain
                       ^
infrastructure --------+
        ^
bootstrap で組み立て
```

- `domain`: React、Expo、SQLite、React Native に依存しない型とルール。
- `application`: ユースケースと Repository / Gateway Port。具体実装を import しない。
- `infrastructure`: SQLite の Repository Adapter。DB 行と domain 型を明示的に変換する。
- `presentation`: Query Hook、画面、Component。infrastructure を直接 import しない。
- `bootstrap`: Adapter、通知、Widget、QueryClient の組み立てと起動処理。

## 状態所有権

- SQLite: reminders と settings の永続データ。唯一の永続的な真実。
- TanStack Query: 読み込み、エラー、mutation、画面間同期。キャッシュは永続化しない。
- Zustand: Quick Add の入力途中・開閉と開発用通知設定。
- 画面ローカル: 選択中ID、検索条件、削除アニメーション。
- Expo Router parameter: Widget / Deep Link からの起動意図。

## 外部境界

`ReminderRepository`、`SettingsRepository`、`ReminderNotificationGateway`、`ReminderSettingsGateway`、`WidgetSyncGateway` をPortとして扱う。remindersのcreate、delete、title update、expired cleanupはPortだけを受け取るユースケースであり、SQLite、Expo Notifications、Widgetの具体実装は `src/bootstrap/appServices.ts` で接続する。

DB migrationは `PRAGMA user_version` を使って順次・冪等に実行する。Widgetは独立SQLite接続とsnapshot契約を維持し、journal modeは互換性検証が済むまで `DELETE` とする。
