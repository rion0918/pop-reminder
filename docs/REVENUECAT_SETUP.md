# RevenueCat / ストア課金セットアップ

## 商品契約

- 商品名: Pro版ふわっと。
- 種別: 非消耗型の買い切り商品（自動更新なし）
- 機能: 忘れたくないことを無制限に追加できる（無料版は同時に6件まで）
- 日本価格: 300円
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

Google Payments 販売アカウントの設定を先に完了する。本人確認、契約への同意、口座情報の入力は運営者が行う。販売アカウントが未設定の場合、Play Console の「1 回限りのアイテム」にアクセスできない。

1. package name `com.rion0918.popreminder` のAABを内部テストへアップロードする。
2. 非消耗型の一回限りの商品 `fuwatto_pro_lifetime` を作成する。
3. 日本向け価格を300円に設定し、商品を有効化する。
4. 購入確認に使うGoogleアカウントを、配布トラックのテスターとPlay Consoleのライセンステスターの両方に登録する。公開に使用する開発者アカウント自身はGoogleのライセンステスターとして扱われる。クローズドテストへの参加だけではテスト購入にならない。端末に複数アカウントがある場合は、購入ダイアログを展開して実際の購入用アカウントを確認する。Google Playで選択中のアカウントと一致するとは限らず、通常はアプリをダウンロードしたアカウントが使われる。[Google公式のテスト手順](https://developer.android.com/google/play/billing/test?hl=ja)
5. Play Storeから対象版をインストールし、購入画面にテスト用の支払い方法が表示されることを確認して、購入・復元・返金後の権利取消を確認する。実際の支払い方法が表示されたら購入せず、ライセンステスターと購入に使われるアカウントを確認する。

テスト用支払い方法が出ない場合は、購入ダイアログのアカウントと、設定を再読み込みした後のライセンステスターのリスト選択を照合する。支払い方法の一覧にもテストカードがないか確認する。登録直後は反映待ちやGoogle Play Storeのキャッシュも原因候補となるため、[RevenueCatの案内](https://revenuecat.github.io/codelabs/troubleshooting/google-play/)に従い、15〜30分程度待つ・Google Play Storeのキャッシュだけを削除する・端末を再起動する方法で再確認する。アプリのリマインダーを保持するため、「ふわっと。」のストレージ消去やアンインストールは行わない。

### App Store Connect

1. bundle ID `com.rion0918.popreminder` のApp内課金に非消耗型商品を追加する。
2. Product IDを `fuwatto_pro_lifetime` とし、日本向け価格を300円に設定する。
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
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_public_sdk_key
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_public_sdk_key
```

AndroidのPlay配布用AABでは、RevenueCatの対象Android appから取得した`goog_`で始まる公開SDK keyをEASの`production` environmentへ設定する。RevenueCat Test Storeの`test_`キーはDevelopment Buildでの予備確認に使う。本番用の変数を変更した後は、その値を取り込んだAABを新しくビルドする。

現在の実装は、キー未設定またはリリースビルドでの`test_`キー指定時にRevenueCatを初期化せず、購入権利を`unavailable`として件数制限をfail-openする。この状態で起動・追加が成功しても、課金の確認が完了したことにはならない。クラウド・ローカルのどちらのビルドでも、最終的に使われるAndroid用キーを値を表示せずに照合し、配布版でPaywallとGoogle Playのテスト購入が動くことを確認する。

Development Buildとproductionで異なるRevenueCat Project/Appを使用する場合は、EAS profileごとに値を分ける。公開SDK key以外のRevenueCat secret key、Google service account、App Store Connect private keyはアプリの環境変数へ設定しない。

## 確認

- RevenueCat Test Storeで購入、復元、キャンセル、再起動後の権利状態を先に確認する。
- Expo GoではUIプレビューに留め、実購入・復元はDevelopment Buildで確認する。
- RevenueCat Customer画面で匿名App User ID、購入、`pro` entitlementが一致することを確認する。
- Google Playの購入画面で日本価格300円と買い切りであることを確認する。Paywallの価格はストアから取得し、アプリコードへ300円を固定しない。
- API key未設定またはRevenueCatへ接続できない場合、アプリがクラッシュせず件数制限をfail-openすることを確認する。
- 返金・取消後も既存リマインダーは残り、新規追加だけが無料上限で止まることを確認する。

公式手順: [Expo integration](https://www.revenuecat.com/docs/getting-started/installation/expo)、[Restoring purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases)、[Google Playのライセンステスト](https://support.google.com/googleplay/android-developer/answer/6062777?hl=ja)
