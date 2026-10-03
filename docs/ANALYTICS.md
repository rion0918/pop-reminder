# ふわっと。改善のための分析

対象は PostHog US Cloud の `riomaru / pop-reminder`（project ID: `549328`）。プロジェクトのタイムゾーンは UTC。匿名の利用状況の共有に同意したユーザーだけが集計対象になる。

## 改善の判断に使う問い

| 問い                                     | 指標・分析                                                                         | 判断に使う場面                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| アプリを使い、リマインダーを作っているか | `app active` と `reminder created` の日次ユニークユーザー                          | リリース後の利用規模・作成する人の変化               |
| 最初の利用で作成まで進めるか             | 最初に観測した `app active` → 作成、7日以内のユーザーファネル                      | 初回導線の改善。インストールからの転換率とは異なる   |
| 再び使う必要を感じているか               | 最初の作成 → 別の週の作成、週次リテンション                                        | 作成が継続するか。毎日の利用を前提にしない           |
| 追加が簡単か                             | 訪問IDごとの開く → 保存操作 → 一件以上作成、未保存で閉じる結果、初回保存の所要秒数 | 入力・日付指定・権限案内の摩擦                       |
| どの追加方法が使われるか                 | 作成の経路・入力方法                                                               | ホーム、Widget、傾けて音声入力、手入力と音声の優先度 |
| 保存と通知予約に問題があるか             | 保存失敗の理由、作成時の通知予約結果                                               | 入力・保存の不具合、通知権限・予約失敗の改善         |
| 音声入力が使えるか                       | 開始と一回の終了結果（成功・空・キャンセル・拒否・利用不可・時間切れ・エラー）     | Android／iOS、ビルドごとの成功と失敗の偏り           |
| Pro導線で何が起きるか                    | 表示要求と結果を `placement`・`outcome` で比較                                     | 上限到達／設定の導線、キャンセル、購入、復元、エラー |

これらは今回設計した運用指標であり、Data Catalogで承認された指標ではない。接続にはData Catalogの読み書き権限がないため、既存の承認済み定義との照合は未確認。

## 保存したPostHog分析

[ふわっと。｜改善の判断（計測v2）](https://us.posthog.com/project/549328/dashboard/2165800) に13件を保存した。01〜12は新ビルドの受信待ち、13は既存データの参考値。原則直近30日、週次リテンションは8週間。PostHogの内部・テストユーザー除外はプロジェクトに設定された条件を使う。

| 分析                                   | 保存先                                                             |
| -------------------------------------- | ------------------------------------------------------------------ |
| 01 利用と作成｜日次の利用者数          | [Insight](https://us.posthog.com/project/549328/insights/vGwvHvFf) |
| 02 初回価値｜計測開始から7日以内の作成 | [Insight](https://us.posthog.com/project/549328/insights/HgqMPiBf) |
| 03 継続価値｜週ごとの作成リテンション  | [Insight](https://us.posthog.com/project/549328/insights/MP6SA3Z3) |
| 04 追加の完了｜入口別の24時間完了率    | [Insight](https://us.posthog.com/project/549328/insights/mbOCmFGu) |
| 05 追加の速さ｜最初の保存までの秒数    | [Insight](https://us.posthog.com/project/549328/insights/Cgt5lQia) |
| 06 追加の経路｜入口と入力方法          | [Insight](https://us.posthog.com/project/549328/insights/erUWdUoP) |
| 07 保存の問題｜失敗理由                | [Insight](https://us.posthog.com/project/549328/insights/Qp2Zxf8u) |
| 08 音声入力｜開始数と終了結果          | [Insight](https://us.posthog.com/project/549328/insights/p2N24WOu) |
| 09 通知｜保存成功時の予約結果          | [Insight](https://us.posthog.com/project/549328/insights/F6s3lZVl) |
| 10 通知権限｜追加と設定の要求結果      | [Insight](https://us.posthog.com/project/549328/insights/ueFj0L7O) |
| 11 Pro導線｜要求数と購入・復元・中断   | [Insight](https://us.posthog.com/project/549328/insights/TtgwlAQr) |
| 12 未保存の終了｜観測できた閉じ方      | [Insight](https://us.posthog.com/project/549328/insights/TplbglPO) |
| 13 過去の参考｜追加・作成・削除の回数  | [Insight](https://us.posthog.com/project/549328/insights/dCj6Aqg2) |

追加の24時間完了率は、直近30日で開いてから24時間以上経った訪問を分母にし、開いてから24時間以内に一件以上保存した訪問を分子にする。`person_id`と`quick_add_id`で関連付ける。SQLは固定の直近30日を上限にし、`{filters}`でダッシュボードの追加条件・テストユーザー除外を適用する。期間を30日より広げる場合はSQLの期間条件も更新する。

初回作成ファネルの起点は、`analytics_version=2`と`environment=production`を満たす最初の`app active`。週次リテンションは、対象期間内で最初に作成した週から各後続週の作成を確認する。匿名IDの初回観測は新規インストールとは限らない。

2026-10-03の保存確認では13件すべてのクエリが実行できた。新しいプロパティはまだ未受信であり、構文と保存を確認した段階。実機からの受信、共有撤回、ストア配信後のデータ蓄積はDevelopment Build QAと配信後の確認を行う。新イベント定義は受信確認前なのでPostHogで`verified=false`として登録した。

## 計測バージョン2

全ての手動イベントと画面表示に `analytics_version=2`、`environment`、`platform` を付ける。取得できる場合は `app_version` と `app_build` も付ける。`environment` は `__DEV__` に基づくビルド区分で、ストア配信済みかを示す値ではない。本番分析には `environment=production` とPostHogの内部・テストユーザー除外を使う。リリースモードでのQAはこの区分だけでは除外できない。

| イベント                          | 発火点・プロパティ                                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app active`                      | 同意の復元／許可で計測が有効になったときと、backgroundからactiveへ戻ったとき。`source=measurement_started/resume`。inactiveからの復帰だけでは発火しない                            |
| `quick add opened`                | 追加画面を新しく開いたとき。一回の訪問に一回。`quick_add_id`、`source`、入口の`input_mode`                                                                                         |
| `quick add submitted`             | 有効なタイトルの保存操作。`quick_add_id`、`source`、`input_mode`、`date_preset`、`all_day`                                                                                         |
| `reminder created`                | 保存成功。従来の通知結果に加え、訪問ID、入力方法、`first_in_quick_add`。最初の保存にだけ開いてからの`elapsed_seconds`                                                              |
| `reminder creation failed`        | 保存自体が失敗したとき。`reason=active_limit/save_failed`。保存後の後処理の失敗は含めない                                                                                          |
| `quick add closed`                | 観測できた画面終了。`outcome=created/dismissed`、作成件数、訪問全体の所要秒数。プロセス終了による未観測の閉鎖は含まない                                                            |
| `voice input started`             | 音声開始を試みたとき。訪問ID・経路・入力方法                                                                                                                                       |
| `voice input result`              | 一回の開始に対して一回の終了結果。`outcome=success/empty/cancelled/permission-denied/unavailable/timeout/error`。successは文字が返ったことを意味し、認識精度や保存成功を意味しない |
| `notification permission updated` | 追加時／設定のOS権限要求が返ったとき。`source=quick_add/settings`、`status`、`can_ask_again`                                                                                       |
| `pro paywall requested`           | Paywallの表示要求の直前。`placement=active_limit/settings`。実際に画面が表示されたとは限らない                                                                                     |
| `pro paywall result`              | Paywall処理の結果。`purchased`と`restored`を分け、`not-presented`を表示済みの分母に入れない                                                                                        |

`reminder edited`、`reminder deleted`、`pro gate reached`、`pro restore result` は従来の発火点を維持する。削除イベントの回数と削除件数（`count`の合計）は異なる。削除をタスクの完了とは解釈しない。通知の`scheduled`はOSへの予約成功であり、実際の配信・閲覧は計測していない。

追加画面は保存後も開き続ける。一回の訪問で複数件保存できるため、作成回数／開いた回数を完了率として扱わない。`quick_add_id`は一回の訪問だけに使う一時的な匿名IDで、リマインダーIDと無関係。音声を試した後の保存は`input_mode=voice`、保存後はtextへ戻し、次の音声開始でvoiceにする。入力方法は音声を試したかを示すもので、最終的なタイトルの全てが音声由来とは限らない。

## 読み方とリリース後の確認

- 新しいイベントと環境区分はこの変更を含むビルドから蓄積される。過去のイベントへ補完しない。更新前のデータを本番／開発として判定できない。
- 利用開始は計測を許可した後の最初の観測。匿名IDは再インストールなどで変わり、同じ人の端末をまたいだ利用は統合しない。共有を拒否した人は分母にも入らない。
- 直近のファネル参加者やリテンションのコホートは観測期間が短く、まだ結果が確定していない。少人数の率の変化を改善効果と断定しない。
- リリース比較は同じ期間と成熟したコホートを使い、`platform`、`app_version`、`app_build`で対象を揃える。
- タイトル、具体的な予定日時、リマインダーID、音声・文字起こし、モーション値、端末モデル、OSバージョン、位置情報は送信しない。撤回時は未終了の追加・音声の計測状態を破棄する。
- 実機受信は [Development Build QA](QA_DEVELOPMENT_BUILD.md#151-匿名の利用状況posthog) に従って確認する。

PostHogの分析方法は [Funnels](https://posthog.com/docs/product-analytics/funnels) と [Retention](https://posthog.com/docs/product-analytics/retention) を参照する。アプリのバージョンとビルド番号は [Expo Application](https://docs.expo.dev/versions/v54.0.0/sdk/application/) の定数を使う。
