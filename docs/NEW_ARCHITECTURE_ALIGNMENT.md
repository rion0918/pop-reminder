# React Native Architecture & Alignment Policy

本プロジェクトは **React Native New Architecture** を有効化した上で、クリーンで保守性の高い **Feature-First Hexagonal Architecture (Ports & Adapters)** を採用しています。外部ライブラリやネイティブ層への直接依存を隠蔽し、ドメインロジックの単体テスト可能性とプラットフォーム抽象化を担保します。

---

## 🏗️ 依存方向とレイヤー構造

```mermaid
graph TD
    subgraph Presentation ["1. Presentation Layer (src/features/*/presentation, screens, components)"]
        Hook[useRemindersQuery]
        UI[HomeScreen / ReminderBubble]
    end

    subgraph Application ["2. Application Layer (src/features/*/application)"]
        UC[reminderUseCases]
        PortRepo[ReminderRepository Port]
        PortNotif[ReminderNotificationGateway Port]
        PortWidget[WidgetSyncGateway Port]
        PortPro[ProAccessGateway Port]
    end

    subgraph Domain ["3. Domain Layer (src/features/*/domain)"]
        Model[Reminder Model]
        Rules[reminderSchedule Rules]
    end

    subgraph Infrastructure ["4. Infrastructure Layer (src/features/*/infrastructure, src/db, src/lib)"]
        SQLiteRepo[SqliteReminderRepository]
        ExpoNotifGateway[ExpoNotificationGateway]
        AndroidWidgetGateway[AndroidWidgetGateway]
        RevenueCatAdapter[RevenueCatPurchaseService]
    end

    subgraph Bootstrap ["5. Bootstrap Layer (src/bootstrap)"]
        AppServices[appServices Container]
    end

    UI --> Hook
    Hook --> UC
    UC --> Model
    UC --> Rules
    UC --> PortRepo
    UC --> PortNotif
    UC --> PortWidget
    UC --> PortPro

    SQLiteRepo -. Implements .-> PortRepo
    ExpoNotifGateway -. Implements .-> PortNotif
    AndroidWidgetGateway -. Implements .-> PortWidget
    RevenueCatAdapter -. Implements .-> PortPro

    AppServices -- Connects & Injects --> Application
```

### 🧩 階層構造とディレクトリ役割一覧

| ディレクトリ              | 役割                        | 含まれる主な処理                                                                 | 依存の向き                 |
| :------------------------ | :-------------------------- | :------------------------------------------------------------------------------- | :------------------------- |
| `src/app/`                | **ルーティング (UIの入口)** | Expo Router 画面エントリー、Deep Link・通知の起動初期化                          | ➔ `features/`              |
| `src/features/reminders/` | **リマインダー機能**        | ドメインモデル、ユースケース、画面・コンポーネント・Zustand UI状態               | ➔ `db/`, `lib/` (Port経由) |
| `src/features/purchases/` | **購入機能**                | Pro権利契約、RevenueCat Adapter、購入状態Query                                   | ➔ RevenueCat (Adapter経由) |
| `src/features/settings/`  | **設定機能**                | 通知設定・クイック追加プリセット・アプリ設定画面                                 | ➔ `db/`, `lib/` (Port経由) |
| `src/db/`                 | **データベースインフラ**    | SQLite (Drizzle ORM) のスキーマ定義・クライアント・CRUD操作                      | 独立 (DB専用)              |
| `src/lib/notifications/`  | **通知インフラ**            | Expo Notifications によるローカル通知の予約・キャンセル・権限管理                | 独立 (通知専用)            |
| `src/widget/`             | **Android Widget**          | ウィジェット専用の独立SQLite参照・スナップショット更新・UIレンダリング           | 独立 (Widget専用)          |
| `src/bootstrap/`          | **依存注入 (DI Container)** | アプリ起動時にインフラ実装（SQLite/通知/購入）をユースケースに接続するアセンブラ | ➔ 全レイヤーを接続         |

### 🛡️ アーキテクチャの黄金律（守るべき3つの原則）

1. 🚫 **UIからSQLiteや通知を直接呼ばない**: 画面コンポーネントから直接 `expo-sqlite` や `expo-notifications` を呼び出さず、必ず `useCases` 経由で実行します。
2. 💎 **ドメイン層の純粋性**: `src/features/*/domain/` は React、React Native、Expo、SQLite に依存せず、純粋な TypeScript コードで記述します。
3. 🔌 **Port & Adapter (DI) による疎結合**: ユースケースは外部の具体的なDBや通知実装を知らず、`src/bootstrap/appServices.ts` が起動時に具象クラスを注入します。

---

## 🛡️ レイヤー境界の厳格な定義

### 1. Domain Layer (`src/features/*/domain/`)

- **役割**: ビジネスモデル、データ構造、純粋な判定ルール。
- **制約**: React、React Native、Expo、SQLite 等の外部ライブラリを一切 import してはならない。純粋な TypeScript のみで記述する。

### 2. Application Layer (`src/features/*/application/`)

- **役割**: ユースケースの実現および Port（インターフェース）の定義。
- **制約**: 具体的なインフラストラクチャ実装（SQLite、Expo Notifications 等）を直接 import してはならない。抽象化された Port のみを呼び出す。

### 3. Infrastructure Layer (`src/features/*/infrastructure/`, `src/db/`, `src/lib/`)

- **役割**: 永続化（SQLite / Drizzle）、ローカル通知（Expo Notifications）、Widget（Android Widget）などの外部統合。
- **制約**: Port インターフェースを実装し、DB の行型と Domain のモデル型を明示的に相互変換する。

### 4. Presentation Layer (`src/features/*/presentation/`, `screens/`, `components/`)

- **役割**: ユーザーインターフェース描画およびユーザー操作のハンドリング。
- **制約**: `infrastructure` の具体実装を直接 import しない。TanStack Query の Query/Mutation Hook 経由で `application` のユースケースを呼び出す。

### 5. Bootstrap Layer (`src/bootstrap/`)

- **役割**: アプリ起動時の初期化、依存関係の接続 (Dependency Injection)、Deep Link 意図の解釈。
- **制約**: Port と具体実装をバインドし、`appServices` としてアプリケーション全体に供給する唯一の場所。

---

## 💾 状態の所有権 (State Ownership & SSOT)

| 状態の種類               | 管理ライブラリ / 場所 | 用途と所有権                                                 |
| :----------------------- | :-------------------- | :----------------------------------------------------------- |
| **永続的状態 (SSOT)**    | SQLite (Drizzle ORM)  | リマインダーデータ、ユーザー設定の唯一の永続的な真実         |
| **非同期キャッシュ状態** | TanStack Query        | DB からの読み込み、キャッシュ更新、画面間自動同期            |
| **一時的 UI 状態**       | Zustand               | Quick Add の下書き、メニュー開閉、開発用デバッグ設定         |
| **画面ローカル状態**     | Component State       | 削除モーション中のバブルID、選択状態、ローカルアニメーション |
| **Deep Link 状態**       | Expo Router Params    | Widget や通知クリックからの画面遷移インテント                |
| **Pro権利キャッシュ**    | TanStack Query        | RevenueCatから取得した権利状態。購入・復元・復帰時に再取得   |

---

## 🔌 外部境界 (Ports & Services)

リマインダーの追加・更新・削除・期限切れクリーンアップなどの副作用を伴う処理は、すべて以下の Port を通して実行されます。

- `ReminderRepository`: SQLite データベースへの保存・取得・削除。
- `ReminderNotificationGateway`: ローカル通知の予約・キャンセル・権限確認。
- `WidgetSyncGateway`: Android Widget スナップショットの同期。
- `ProAccessGateway`: リマインダー作成前に `free` / `pro` / `unavailable` の権利状態を取得。
- `PurchaseService`: RevenueCatの初期化、管理Paywall表示、購入復元。SDKの直接利用は購入infrastructureに限定。

これらの Port を束ねるユースケースは、`src/bootstrap/appServices.ts` において具象実装と接続されます。
