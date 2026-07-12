# 技術スタック (Technology Stack)

`pop-reminder` は、Expo / React Native / Expo Router を基盤にした Android・iOS・Web 対応のリマインダーアプリです。SQLite によるローカル永続化、ローカル通知、Android ホーム画面 Widget、プラットフォーム別のアニメーションを使用しています。

バージョンは、特記がない限り `package.json` の宣言値に基づきます。

---

## 1. コア・プラットフォーム (Core Platform)

| 技術 / ライブラリ | バージョン | 用途・説明                                                               |
| :---------------- | :--------- | :----------------------------------------------------------------------- |
| **Expo SDK**      | `~54.0.35` | アプリケーションの基盤、ネイティブ機能とビルド設定                       |
| **React Native**  | `0.81.5`   | Android / iOS のネイティブ UI レンダリング                               |
| **React**         | `19.1.0`   | コンポーネント指向 UI ライブラリ                                         |
| **TypeScript**    | `~5.9.3`   | 型安全なアプリケーションコード                                           |
| **Expo Router**   | `~6.0.24`  | `src/app/` を起点にしたファイルベースルーティング。typed routes を有効化 |

---

## 2. 状態管理・ドメイン処理 (State & Domain)

| 技術 / ライブラリ  | バージョン | 用途・説明                                                     |
| :----------------- | :--------- | :------------------------------------------------------------- |
| **TanStack Query** | `^5.0.0`   | SQLite を取得元とする読み込み・mutation・画面間キャッシュ同期  |
| **Zustand**        | `^5.0.5`   | Quick Add の入力途中と開発用通知設定などの UI 状態管理         |
| **Zod**            | `^3.25.64` | リマインダー入力のトリミング、文字数、日付・時刻のスキーマ検証 |
| **date-fns**       | `^4.1.0`   | 日付計算、期限判定、表示用の日付フォーマット                   |

SQLite を唯一の永続的な真実とし、TanStack Query のキャッシュは永続化しません。画面は `presentation/` の Query Hook を使い、`application/` の Port とユースケースを経由します。SQLite、通知、Widget の具体実装は `infrastructure/` と `bootstrap/` で接続します。

---

## 3. データベース・永続化 (Database & Persistence)

ローカルデータは SQLite に保存します。Drizzle の行型は infrastructure 内で domain 型へ明示的に変換します。専用のマイグレーションパッケージは使わず、`src/db/migrations.ts` が `PRAGMA user_version` に基づく順次・冪等な migration を実行します。Widget 互換性のため journal mode は `DELETE` を維持します。

| 技術 / ライブラリ    | バージョン | 用途・説明                                            |
| :------------------- | :--------- | :---------------------------------------------------- |
| **expo-sqlite**      | `~16.0.10` | SQLite へのネイティブアクセス                         |
| **Drizzle ORM**      | `^0.44.2`  | SQLite のテーブル定義、型推論、CRUD クエリ            |
| **expo-file-system** | `~19.0.23` | SQLite ファイル保存先（アプリの Document 配下）の取得 |

主なテーブルは `reminders` と `app_settings` です。Widget は通常のアプリ画面とは別の SQLite 接続を使ってスナップショットを取得します。

---

## 4. UI・スタイリング・インタラクション (UI & Interaction)

| 技術 / ライブラリ                          | バージョン | 用途・説明                                                     |
| :----------------------------------------- | :--------- | :------------------------------------------------------------- |
| **NativeWind**                             | `^4`       | Tailwind クラスによる React Native のスタイリング              |
| **tailwindcss**                            | `^3.4.17`  | アプリ共通のカラー・余白・タイポグラフィトークン               |
| **react-native-css-interop**               | `0.2.6`    | NativeWind の React Native 連携                                |
| **react-native-reanimated**                | `~4.1.7`   | UI アニメーション、ワークレットベースのモーション              |
| **react-native-worklets**                  | `^0.5.1`   | Reanimated 4 のワークレット実行基盤                            |
| **react-native-gesture-handler**           | `~2.28.0`  | ネイティブのタッチ・ジェスチャー処理                           |
| **@gorhom/bottom-sheet**                   | `^5.1.4`   | リマインダー追加・詳細・設定操作の Bottom Sheet                |
| **react-native-safe-area-context**         | `5.6.2`    | ノッチ、ステータスバー、ナビゲーションバーを考慮したレイアウト |
| **expo-linear-gradient**                   | `~15.0.8`  | 泡や画面背景のグラデーション                                   |
| **@shopify/react-native-skia**             | `2.2.12`   | iOS の泡破裂表現、膜のキャプチャ、穴・水滴の描画               |
| **@expo/vector-icons**                     | `^15.1.1`  | 追加、設定、検索などのアイコン                                 |
| **@react-native-community/datetimepicker** | `8.4.4`    | Android / iOS の日付・時刻選択                                 |

泡の破裂表現はプラットフォームごとに実装を切り替えます。

- iOS: `ReminderBubbleBurst.native.tsx` の Skia 表現
- Android: `ReminderBubbleBurst.android.tsx` の Reanimated フォールバック。Skia のビューキャプチャには依存しない
- Web: `ReminderBubbleBurst.web.tsx` の軽量な Reanimated 表現

---

## 5. ネイティブ統合・付加機能 (Native Features)

| 技術 / ライブラリ               | バージョン | 用途・説明                                                       |
| :------------------------------ | :--------- | :--------------------------------------------------------------- |
| **expo-notifications**          | `~0.32.17` | ローカル通知の予約・キャンセル、Android 通知チャンネル、権限管理 |
| **react-native-android-widget** | `^0.20.3`  | Android ホーム画面 Widget の描画・更新・Widget タスク処理        |
| **expo-linking**                | `~8.0.12`  | 通知・Widget の Deep Link を Expo Router に接続                  |
| **expo-haptics**                | `~15.0.8`  | 泡の破裂時の Android / iOS ハプティクス                          |
| **expo-font**                   | `~14.0.12` | アプリ内フォントの読み込み                                       |
| **expo-status-bar**             | `~3.0.9`   | ステータスバー表示の制御                                         |

`expo-notifications` と `react-native-android-widget` はネイティブ依存を含むため、通知や Widget の実機確認には Expo Go ではなく Development Build を使用します。`app.json` の config plugin でネイティブ設定を管理しています。

---

## 6. 開発環境・ビルド・品質管理 (Development & Tooling)

| 技術 / ライブラリ               | バージョン / 構成    | 用途・説明                                         |
| :------------------------------ | :------------------- | :------------------------------------------------- |
| **Node.js**                     | Nix の `nodejs_24`   | 開発シェルでの Node.js バージョン固定              |
| **pnpm**                        | `10.8.1`             | パッケージ管理とスクリプト実行                     |
| **Expo Dev Client**             | `~6.0.21`            | ネイティブ依存を含む Development Build の実行      |
| **EAS**                         | `eas.json`           | Android / iOS のクラウドビルド、配布、リリース管理 |
| **Biome**                       | `^2.5.2`             | 高速なフォーマット・Lint・カスタムルール検証       |
| **ESLint / eslint-config-expo** | `^9.0.0` / `~10.0.0` | Expo 向け静的解析                                  |
| **Prettier**                    | `^3.9.4`             | ドキュメント・設定・コードの整形                   |
| **Lefthook**                    | `^2.1.9`             | pre-commit の保護ファイル、Biome、テスト実行       |
| **MVH**                         | `scripts/mvh-*`      | 保護ファイルガード、構造化フィードバック、統合検証 |

Metro と Babel は Expo をベースに、NativeWind と Reanimated の設定を追加しています。保護されたハーネス設定を含む標準検証コマンドは次のとおりです。

```bash
pnpm run mvh:verify
```

このコマンドは、Prettier、保護ファイルガード、Biome、テスト、TypeScript 型チェック、Expo ESLint を順に実行します。

---

## 7. テスト (Testing)

- **テストランナー**: Node.js 標準テストランナー (`node --import tsx --test`)
- **テスト対象**: `config.release.test.js` と `src/**/*.spec.ts` / `src/**/*.spec.tsx`
- **テスト方針**: DB バインディング、通知、Widget 同期、画面ソース契約、レスポンシブレイアウト、プラットフォーム別実装、泡破裂ジオメトリを決定論的に検証
- **アーキテクチャ境界**: `src/test-utils/sourceAssertions.ts` による実装契約テストと、Biome のカスタムルールを併用

---

## 8. ディレクトリ構造と機能マッピング

```text
src/
├── app/               # Expo Router の画面エントリ
├── app-tests/         # アプリ設定、ルーティング、ハーネスの回帰テスト
├── bootstrap/         # Adapter、QueryClient、起動処理、Deep Link intent の組み立て
├── constants/         # カラーなどの共通デザイントークン
├── db/                # SQLite / Drizzle のスキーマ、DB クライアント、初期化
├── features/
│   ├── reminders/     # domain、application、infrastructure、presentation、画面、UI
│   └── settings/      # domain、application、infrastructure、presentation、画面、UI
├── lib/
│   └── notifications/ # Expo Notifications の権限、チャンネル、予約、キャンセル
├── shared/            # 共通 UI コンポーネントとユーティリティ
├── test-utils/        # ソース契約などのテストヘルパー
└── widget/            # Android Widget UI、DB スナップショット、更新処理、Task Handler

assets/                # アプリアイコン、スプラッシュ、通知アイコン
android/               # Android ネイティブプロジェクト
ios/                   # iOS ネイティブプロジェクト
docs/                  # QA、リリース、ストア、プライバシー、ADR
```
