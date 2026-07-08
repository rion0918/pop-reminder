# pop-reminder

忘れたくないことを、ふわっと泡にして残せるシンプルなリマインダーアプリです。Expo / React Native / Expo Router を使い、SQLite / Drizzle、ローカル通知、Android widget を扱います。

## セットアップ

この README の手順は、Nix 開発シェルに入ってから実行する前提です。`flake.nix` で Node.js、pnpm、OpenJDK 17、Android SDK 向けの PATH をそろえます。

direnv を使う場合は、初回だけ許可します。

```bash
direnv allow
```

以降は、このリポジトリに移動すると `.envrc` から Nix 開発シェルが自動で有効になります。

direnv を使わない場合は、作業を始めるたびに手動で Nix 開発シェルへ入ります。

```bash
nix develop
```

依存関係と hook は、Nix 開発シェルの中でセットアップします。

```bash
pnpm install
pnpm run mvh:setup
```

## 起動方法

以下のコマンドは、Nix 開発シェルの中で実行します。direnv が有効なら、リポジトリに `cd` した時点で同じ状態になります。

このプロジェクトは `expo-dev-client` を含むため、`pnpm start` で表示される QR は development build 用になることがあります。Expo Go で起動したい場合は、必ず `pnpm run start:expo-go` を使ってください。

| 目的                     | コマンド                    | 使う場面                                                           |
| ------------------------ | --------------------------- | ------------------------------------------------------------------ |
| Development build に接続 | `pnpm run start:dev-client` | 実機 QA、通知、SQLite、Android widget などネイティブ機能を確認する |
| Expo Go で確認           | `pnpm run start:expo-go`    | JS / UI をすばやく確認する                                         |
| 通常の Expo 起動         | `pnpm start`                | Expo CLI の既定モードで起動する。迷う場合は上の2つを使い分ける     |
| Android にビルドして起動 | `pnpm run android`          | Android エミュレータまたは実機へローカルビルドを入れる             |
| iOS にビルドして起動     | `pnpm run ios`              | iOS Simulator または実機へローカルビルドを入れる                   |
| Web で起動               | `pnpm run web`              | Web 表示を確認する。ネイティブ機能の確認には使わない               |

### Development build で起動する

通知や Android widget など、ネイティブ機能まで確認する場合の基本ルートです。

1. development build を端末にインストールします。EAS Build を使う場合は、`eas` コマンドを利用できる状態にしておいてください。

```bash
eas build --profile development --platform android
```

iOS の development build を作る場合は、platform を `ios` にします。

```bash
eas build --profile development --platform ios
```

2. Metro を development build モードで起動します。

```bash
pnpm run start:dev-client
```

3. 表示された QR を、Expo Go ではなく端末にインストール済みの「ポップ・リマインダー」development build で開きます。QR の URL が `exp+pop-reminder://expo-development-client/...` の場合は development build 用です。

ローカルのネイティブ環境が整っている場合は、EAS Build の代わりに次のコマンドでも端末へビルドして起動できます。

```bash
pnpm run android
pnpm run ios
```

### Expo Go で起動する

Expo Go で確認したい場合は、development build 用 QR と混ざらないように次のコマンドを使います。

```bash
pnpm run start:expo-go
```

Expo Go で `Something went wrong. Sorry about that. You can go back to Expo home or try to reload the project.` と表示される場合は、development build 用 QR を Expo Go で開いていないか確認してください。

### Web で起動する

```bash
pnpm run web
```

Web は表示確認用です。通知、SQLite の実機挙動、Android widget などは development build またはネイティブ実行で確認してください。

### Development build が起動しない時

まず、Nix 開発シェルの中にいるか確認します。

```bash
node --version
```

`flake.nix` の開発シェルでは Node.js `v24.16.0` を使います。Node.js `v26.x` など別のバージョンで `pnpm run start:dev-client` を実行すると、Expo CLI が `RangeError [ERR_SOCKET_BAD_PORT]` で止まることがあります。その場合は `nix develop` に入り直すか、direnv を使っている場合は `direnv allow` 後にターミナルを開き直してください。

次に、Metro の既存プロセスが `8081` を使っていないか確認します。

```bash
lsof -iTCP:8081 -sTCP:LISTEN -P -n
```

同じリポジトリの `start:dev-client` が既に起動している場合は、その QR を使えます。古い Metro、Expo Go 用、別プロジェクトの Metro が残っている場合は、そのターミナルで `Ctrl+C` してから `pnpm run start:dev-client` を起動し直してください。

## 検証

変更後は、Nix 開発シェルの中で MVH 全体を通します。

```bash
pnpm run mvh:verify
```

個別に確認したい場合の主なコマンドです。

| コマンド                | 内容                                     |
| ----------------------- | ---------------------------------------- |
| `pnpm test`             | Node.js 標準テストランナーでテストを実行 |
| `pnpm run typecheck`    | TypeScript の型チェック                  |
| `pnpm run lint`         | Expo ESLint                              |
| `pnpm run format:check` | Prettier の整形チェック                  |
| `pnpm run biome:check`  | Biome と独自ルールのチェック             |
| `pnpm run doctor`       | Expo Doctor                              |

## 関連ドキュメント

- [技術スタック](docs/TECH_STACK.md)
- [Development Build QA チェックリスト](docs/QA_DEVELOPMENT_BUILD.md)
- [Android / iOS Release Runbook](docs/RELEASE_ANDROID_IOS.md)
- [Codex MVH ハーネス](docs/MVH_HARNESS.md)
