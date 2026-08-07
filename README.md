# Pop Reminder (ポップ・リマインダー) 🫧

忘れたくないことを、ふわっと泡にして残せるシンプルで心地よいリマインダーアプリです。  
Expo SDK 54 / React Native 0.81 / Expo Router をベースに、SQLite (Drizzle ORM) によるローカル永続化、ローカル通知、Android Widget、プラットフォーム別最適化アニメーションを備えています。

![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-000000?style=for-the-badge&logo=expo&logoColor=white)
![React Native 0.81](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js 24](https://img.shields.io/badge/Node.js-24.16-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![pnpm 10](https://img.shields.io/badge/pnpm-10.8-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

---

## 📑 目次 (Table of Contents)

1. [✨ 主な機能](#-主な機能-key-features)
2. [🏗️ アーキテクチャ概要](#️-アーキテクチャ概要-architecture-overview)
3. [💻 開発環境セットアップ](#-開発環境セットアップ-getting-started)
4. [🚀 アプリの起動方法](#-アプリの起動方法-running-the-app)
5. [🔧 トラブルシューティング](#-トラブルシューティング-troubleshooting)
6. [🧪 品質保証とテスト](#-品質保証とテスト-quality-assurance)
7. [📚 関連ドキュメント](#-関連ドキュメント-documentation)

---

## ✨ 主な機能 (Key Features)

- 🫧 **泡 (Bubble) UI & 心地よいアニメーション**  
  リマインダーが浮遊するシャボン玉として画面に表示されます。削除時には視覚的・触覚的（Haptics）フィードバックとともに弾けます。  
  _iOS (Skia) / Android (Reanimated) / Web 向けにプラットフォーム別最適化を実施_
- ⏱️ **クイック追加 & 柔軟なプリセット**  
  朝・昼・夕・夜など、カスタマイズ可能な4つの時刻プリセットで瞬時にタスクを登録できます。
- 🔔 **予告付きローカル通知**  
  予定時刻（Target）に加えて、事前通知（Previous）を設定でき、忘れを防ぎます。
- 📱 **Android Widget 対応**  
  ホーム画面で直近のリマインダーをスタック表示し、アプリを開かずに完了・追加操作が可能です。天空の背景カラーが時間帯に応じて変化します。
- 🔒 **プライバシーファースト & 完全ローカル**  
  データはすべて端末内の SQLite データベースに安全に保存され、外部サーバーに個人情報は送信されません。

---

## 🏗️ アーキテクチャ概要 (Architecture Overview)

本プロジェクトは **Feature-First Hexagonal Architecture (Clean Architecture)** を採用し、ドメインロジック、永続化、画面表示、ネイティブ機能を厳格に分離しています。

```mermaid
graph TD
    subgraph Presentation Layer [Presentation Layer]
        UI[Screens / Components / Hooks]
        Router[Expo Router (src/app)]
    end

    subgraph Application Layer [Application Layer]
        UC[Reminder UseCases]
        Ports[Repository & Gateway Ports]
    end

    subgraph Domain Layer [Domain Layer]
        Domain[Reminder Models & Rules]
    end

    subgraph Infrastructure Layer [Infrastructure Layer]
        DB[SQLite / Drizzle Repository]
        Notif[Expo Notifications Gateway]
        Widget[Android Widget Gateway]
    end

    subgraph Bootstrap Layer [Bootstrap Layer]
        AppServices[appServices (DI Container)]
    end

    UI --> Router
    UI --> UC
    UC --> Domain
    UC --> Ports
    Infrastructure Layer -. Implements .-> Ports
    AppServices -- Injects --> Infrastructure Layer
    AppServices -- Connects --> UC
```

### 依存ルールとレイヤー境界

- `domain`: React / Expo / SQLite に非依存の純粋な型とビジネスルール。
- `application`: ユースケースと Port（インターフェース）。具象クラスに直接依存しない。
- `infrastructure`: SQLite (Drizzle) や Expo Notifications の具体実装。
- `presentation`: TanStack Query 経由でユースケースと接続。インフラ層を直接呼び出さない。
- `bootstrap`: アプリ起動時に依存関係を注入 (DI) するアセンブラ。

---

## 💻 開発環境セットアップ (Getting Started)

本プロジェクトは Nix / direnv による環境固定を推奨しています。`flake.nix` により Node.js (`v24.16.0`)、pnpm (`10.8.1`)、OpenJDK 17、Android SDK が自動で提供されます。

### 1. Nix / direnv 環境の準備 (推奨)

direnv を利用する場合（初回のみ許可）:

```bash
direnv allow
```

以降はリポジトリのディレクトリに入るだけで自動的に開発環境が有効化されます。

手動で Nix シェルに入る場合:

```bash
nix develop
```

### 2. 依存パッケージとハーネスのインストール

```bash
pnpm install
pnpm run mvh:setup
```

---

## 🚀 アプリの起動方法 (Running the App)

ネイティブ機能（通知、SQLite、Android Widget）の有無に応じて、最適な起動モードを選択してください。

| 起動モード                   | コマンド                    | 用途・主な活用シーン                                                 |
| :--------------------------- | :-------------------------- | :------------------------------------------------------------------- |
| **Development Build (推奨)** | `pnpm run start:dev-client` | ネイティブ機能（通知・Widget・SQLite）を実機やエミュレータで確認する |
| **Expo Go**                  | `pnpm run start:expo-go`    | JS / UI の変更を迅速に確認する                                       |
| **Android ローカル実行**     | `pnpm run android`          | Android エミュレータ / 実機にビルドして起動                          |
| **iOS ローカル実行**         | `pnpm run ios`              | iOS シミュレータ / 実機にビルドして起動                              |
| **Web 実行**                 | `pnpm run web`              | ブラウザでのレイアウト確認                                           |
| **通常 Expo 起動**           | `pnpm start`                | Expo CLI 標準モードで起動                                            |

### Development Build で起動するステップ

1. 端末用の Development Build を作成・インストールします（EAS Build を使用する場合）。
   ```bash
   eas build --profile development --platform android
   # iOS の場合は --platform ios
   ```
2. Metro サーバーを起動します。
   ```bash
   pnpm run start:dev-client
   ```
3. 表示された QR コードを端末の「Pop Reminder (Dev Client)」アプリで読み取ります。

---

## 🔧 トラブルシューティング (Troubleshooting)

### Q. Expo CLI が `RangeError [ERR_SOCKET_BAD_PORT]` で起動しない

Nix シェル外の異なる Node.js バージョン (v26.x 等) で実行されている可能性があります。`node -v` を実行し、`v24.16.0` であることを確認してください。必要に応じて `nix develop` または `direnv allow` を再実行してください。

### Q. Port 8081 が使用中で起動できない

既存の Metro プロセスがポートを占有している可能性があります。以下のコマンドでプロセスを特定して停止してください。

```bash
# ポート占有プロセスの確認
lsof -iTCP:8081 -sTCP:LISTEN -P -n

# プロセスの停止
kill <PID>
```

---

## 🧪 品質保証とテスト (Quality Assurance)

本プロジェクトには **Codex MVH (Minimum Viable Harness)** が組み込まれており、高速な品質チェックとアーキテクチャ保護が自動化されています。

```bash
# 全系統合検証 (Prettier, Protection Guard, Biome, Test, Typecheck, ESLint)
pnpm run mvh:verify
```

### 個別検証コマンド一覧

- **テスト実行**: `pnpm test` (Node.js 標準テストランナー `node --import tsx --test`)
- **TypeScript 型チェック**: `pnpm run typecheck` (`tsc --noEmit`)
- **Biome ガードチェック**: `pnpm run biome:check`
- **Prettier 整形チェック**: `pnpm run format:check` (整形実行は `pnpm run format`)
- **Expo ESLint**: `pnpm run lint`
- **Expo Health Check**: `pnpm run doctor`

---

## 📚 関連ドキュメント (Documentation)

より詳細な開発・設計・リリース情報については [docs/README.md](docs/README.md) を参照してください。

- 📐 **[技術スタック詳細 (docs/TECH_STACK.md)](docs/TECH_STACK.md)**
- 📐 **[アーキテクチャ設計方針 (docs/NEW_ARCHITECTURE_ALIGNMENT.md)](docs/NEW_ARCHITECTURE_ALIGNMENT.md)**
- 🧪 **[MVH ハーネス仕様 (docs/MVH_HARNESS.md)](docs/MVH_HARNESS.md)**
- 🧪 **[Development Build QA 手順 (docs/QA_DEVELOPMENT_BUILD.md)](docs/QA_DEVELOPMENT_BUILD.md)**
- 🚀 **[Android / iOS リリースガイド (docs/RELEASE_ANDROID_IOS.md)](docs/RELEASE_ANDROID_IOS.md)**
- 📝 **[ADR: 意思決定記録 (docs/adr/)](docs/adr/)**
