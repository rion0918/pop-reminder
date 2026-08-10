# RevenueCat / ストア課金セットアップ

## 商品契約

- 商品名: Pro版ふわっと。
- 種別: 非消耗型の買い切り商品（自動更新なし）
- 機能: 忘れたくないことを無制限に追加できる（無料版は同時に6件まで）
- 日本価格: 800円
- Store Product ID: `fuwatto_pro_lifetime`
- RevenueCat Entitlement: `pro`
- RevenueCat Offering: `default`
- RevenueCat Package: `$rc_lifetime`

テーマ、時刻設定、検索、一覧、通知、Android Widgetは無料機能のままにする。将来のPro機能をすべて含むという表現は使用しない。

## RevenueCat Project

1. RevenueCatでProjectを作成する。
2. Android appへpackage name `com.rion0918.popreminder`を登録し、Google Playのサービスアカウントを接続する。
3. iOS appへbundle ID `com.rion0918.popreminder`を登録し、App Store Connect API keyを接続する。
4. Restore Behaviorを `Transfer to new App User ID` にする。
5. `pro` entitlementを作成する。
6. 各ストアの `fuwatto_pro_lifetime` をRevenueCatへ取り込み、`pro` entitlementへ紐付ける。
7. `default` offeringへ`$rc_lifetime` packageとして追加し、Default Offeringに設定する。

ログイン機能は追加せずRevenueCatの匿名App User IDを使用する。購入は同じAppleまたはGoogleのストアアカウントで復元できるが、AndroidとiOSの間では共有されない。

## ストア商品

### Google Play

1. package name `com.rion0918.popreminder` のAABを内部テストへアップロードする。
2. 非消耗型の一回限りの商品 `fuwatto_pro_lifetime` を作成する。
3. 日本向け価格を800円に設定し、商品を有効化する。
4. ライセンステスターを登録し、内部テスト版から購入・返金・再購入を確認する。

### App Store Connect

1. bundle ID `com.rion0918.popreminder` のApp内課金に非消耗型商品を追加する。
2. Product IDを `fuwatto_pro_lifetime` とし、日本向け価格を800円に設定する。
3. 表示名、説明、審査用スクリーンショットを登録する。
4. Sandbox testerで購入・復元・返金後の権利取消を確認する。

## RevenueCat Paywall

RevenueCat管理Paywallを`default` offeringへ接続し、閉じるボタン、購入復元、プライバシーポリシー、利用規約へのリンクを表示する。

- タイトル: `泡を、好きなだけ。`
- 説明: `Pro版ふわっと。なら、忘れたくないことを無制限に追加できます。`
- 補足: `買い切り・自動更新なし`
- CTA: ストアから取得したローカライズ済み価格を使用する

価格文字列をアプリコードやPaywall本文へ固定値として埋め込まない。

## API key / EAS

ローカルの`.env.local`またはEASの各environmentへ、対象Projectの公開SDK keyを設定する。

```dotenv
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_or_test_store_public_sdk_key
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_or_test_store_public_sdk_key
```

Development Buildとproductionで異なるRevenueCat Project/Appを使用する場合は、EAS profileごとに値を分ける。公開SDK key以外のRevenueCat secret key、Google service account、App Store Connect private keyはアプリの環境変数へ設定しない。

## 確認

- RevenueCat Test Storeで購入、復元、キャンセル、再起動後の権利状態を先に確認する。
- Expo GoではUIプレビューに留め、実購入・復元はDevelopment Buildで確認する。
- RevenueCat Customer画面で匿名App User ID、購入、`pro` entitlementが一致することを確認する。
- API key未設定またはRevenueCatへ接続できない場合、アプリがクラッシュせず件数制限をfail-openすることを確認する。
- 返金・取消後も既存リマインダーは残り、新規追加だけが無料上限で止まることを確認する。

公式手順: [Expo integration](https://www.revenuecat.com/docs/getting-started/installation/expo)、[Restoring purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases)
