# Pop Reminder 🫧

忘れたくないことを、ふわっと泡にして残せるシンプルで心地よいリマインダーアプリです。  
Expo SDK 54 / React Native 0.81 / Expo Router をベースに、SQLite (Drizzle ORM) によるローカル永続化、ローカル通知、Android Widget、プラットフォーム別アニメーションを備えています。

![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-000000?style=for-the-badge&logo=expo&logoColor=white)
![React Native 0.81](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js 24](https://img.shields.io/badge/Node.js-24.16-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![pnpm 10](https://img.shields.io/badge/pnpm-10.8-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

---

## ✨ 主な機能

- 🫧 **泡 (Bubble) UI**: 浮遊するシャボン玉風UIと、削除時の破裂アニメーション・触覚フィードバック。
- ⏱️ **クイック追加**: 4つの時間帯プリセットで即座にリマインダーを登録。
- 🔔 **予告付きローカル通知**: 予定時刻に加え事前通知でリマインド。
- 📱 **Android Widget**: ホーム画面で確認・完了操作が可能なホーム画面ウィジェット。
- 🔒 **リマインダーは端末内に保存**: SQLite データベース保存によるプライバシーファースト設計。

---

## 🚀 クイックスタート

Nix / direnv 環境（推奨）または Node.js `24.16.0` / pnpm `10.8.1` を使用します。

```bash
# 1. 開発環境の有効化 (direnv 利用時)
direnv allow

# または手動で Nix シェルに入る場合
nix develop

# 2. 依存パッケージとハーネスのセットアップ
pnpm install
pnpm run mvh:setup
```

匿名の利用状況計測を有効にする場合は、`.env.example` を参考にローカル環境または EAS の環境変数を設定します。project token はリポジトリへコミットしません。host を省略した場合も US Cloud (`https://us.i.posthog.com`) を使用します。

```dotenv
EXPO_PUBLIC_POSTHOG_API_KEY=your_project_token
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

API key が未設定の場合、分析機能は完全な no-op になり、設定画面の「匿名の利用状況を共有」は OFF・操作不可になります。

買い切りProの実購入を確認する場合は、RevenueCatの公開SDK keyも環境ごとに設定します。未設定または取得不能の場合は、購入済みユーザーを誤って制限しないよう無料件数制限をfail-openします。

```dotenv
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_public_sdk_key
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_public_sdk_key
```

RevenueCatのダッシュボードとストア商品は [RevenueCatセットアップ](docs/REVENUECAT_SETUP.md) に従って構成し、実購入・復元はExpo GoではなくDevelopment Buildで確認します。

---

## 📱 開発コマンド

| コマンド                    | 用途                                                             |
| :-------------------------- | :--------------------------------------------------------------- |
| `pnpm run start:dev-client` | **Development Build 起動 (推奨)**: 通知・SQLite・Widget 動作確認 |
| `pnpm run start:expo-go`    | **Expo Go 起動**: UI / JS 迅速確認                               |
| `pnpm run android`          | Android エミュレータ / 実機でビルド・起動                        |
| `pnpm run ios`              | iOS シミュレータ / 実機でビルド・起動                            |
| `pnpm start`                | Expo CLI 標準起動                                                |

---

## 🧪 品質保証・テスト

本プロジェクトでは品質ゲート・ルール保護を自動化しています。

```bash
# 全系統合検証 (Prettier, Protection Guard, Biome, Test, Typecheck, ESLint)
pnpm run mvh:verify
```

### 個別コマンド

- **テスト実行**: `pnpm test`
- **型チェック**: `pnpm run typecheck`
- **Biome チェック**: `pnpm run biome:check`
- **コード整形**: `pnpm run format:check` / `pnpm run format`
- **Linter**: `pnpm run lint`

---

## 📚 ドキュメント

プロジェクトの各種設計・運用仕様については [`docs/`](docs/README.md) を参照してください。

- 📐 **[アーキテクチャ & 設計方針](docs/NEW_ARCHITECTURE_ALIGNMENT.md)**: Hexagonal Architecture、レイヤー境界、データフロー
- 🛠️ **[技術スタック詳細](docs/TECH_STACK.md)**: 使用ライブラリ・ディレクトリ構成
- 🧪 **[MVH ハーネスガイド](docs/MVH_HARNESS.md)**: ガードルール・開発ハーネス仕様
- 📱 **[QA & 実機検証手順](docs/QA_DEVELOPMENT_BUILD.md)**: Development Build・通知・Widget テスト手順
- 🚀 **[リリースガイド](docs/RELEASE_ANDROID_IOS.md)**: EAS Build / ストア配信手順
- 💳 **[RevenueCatセットアップ](docs/REVENUECAT_SETUP.md)**: 買い切りPro / Paywall / 購入復元
- 📝 **[ADR (意思決定記録)](docs/adr/)**: アーキテクチャ採択・ハーネス方針の記録
