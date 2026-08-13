# Pop Reminder Documentation Hub

`pop-reminder` プロジェクトの公式ドキュメントポータルです。開発、品質管理、アーキテクチャ設計、リリース手順に関する詳細ドキュメントを整理しています。

---

## 📚 ドキュメント構成一覧

### 📐 アーキテクチャ & 技術仕様

- **[技術スタック (TECH_STACK.md)](TECH_STACK.md)**: 使用テクノロジー、ライブラリ、ディレクトリ構造、コンポーネント依存関係。
- **[Hexagonal Architecture 方針 (NEW_ARCHITECTURE_ALIGNMENT.md)](NEW_ARCHITECTURE_ALIGNMENT.md)**: Feature-First クリーンアーキテクチャ、Port & Adapter、データフローと状態所有権のガイドライン。
- **[Architecture Decision Records (ADR)](adr/)**:
  - [ADR 0001: Codex MVH ハーネス方針](adr/0001-harness-policy.md)
  - [ADR 0002: Feature-First Hexagonal Architecture](adr/0002-feature-first-hexagonal.md)

### 🧪 品質保証 & 開発ハーネス

- **[MVH ハーネスガイド (MVH_HARNESS.md)](MVH_HARNESS.md)**: Minimum Viable Harness の仕組み、Biome ガード、保護ファイルルール、検証コマンド。
- **[PR 自動レビューガイド](../.agents/skills/pr-review/SKILL.md)**: PRサイズ自動判定・CodeRabbit AIレビュー・自動マージ仕様。
- **[Development Build QA マニュアル (QA_DEVELOPMENT_BUILD.md)](QA_DEVELOPMENT_BUILD.md)**: 実機・Development Build でのローカル通知、SQLite、Android Widget の検証手順。
- **[QA チェックリスト (QA_CHECKLIST.md)](QA_CHECKLIST.md)**: リリース前に実施すべき各種 QA 項目。

### 🚀 リリース & 運営

- **[Android / iOS リリースガイド (RELEASE_ANDROID_IOS.md)](RELEASE_ANDROID_IOS.md)**: EAS Build、App Store / Google Play へのビルド・配信手順。
- **[RevenueCatセットアップ (REVENUECAT_SETUP.md)](REVENUECAT_SETUP.md)**: 買い切りPro商品、Paywall、ストア接続、購入復元の設定手順。
- **[ストア掲載情報ドラフト (STORE_LISTING_DRAFT.md)](STORE_LISTING_DRAFT.md)**: アプリストア用の説明文、キャッチコピー、キーワード案。
- **[プライバシーポリシー (PRIVACY_POLICY.md)](PRIVACY_POLICY.md)**: ローカルファースト思想とデータ収集方針。
- **[第三者ライセンス (THIRD_PARTY_LICENSES.md)](THIRD_PARTY_LICENSES.md)**: 同梱Vosk日本語モデルと音声認識Bridgeの配布元、バージョン、ハッシュ、ライセンス。

### 🎨 デザイン & UX

- **[UI/UX レビュー記録 (UI_UX_REVIEW_BEFORE.md)](UI_UX_REVIEW_BEFORE.md)**: アプリ改善前後のデザイン分析および変更履歴。

---

## 🧭 ロール別ガイドライン

| あなたの役割                   | 最初に読むべきドキュメント                                                                                       |
| :----------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **新規参加開発者**             | [README.md](../README.md) ➔ [TECH_STACK.md](TECH_STACK.md) ➔ [MVH_HARNESS.md](MVH_HARNESS.md)                    |
| **アーキテクチャの変更提案者** | [NEW_ARCHITECTURE_ALIGNMENT.md](NEW_ARCHITECTURE_ALIGNMENT.md) ➔ [ADR 0002](adr/0002-feature-first-hexagonal.md) |
| **QA / テスター**              | [QA_DEVELOPMENT_BUILD.md](QA_DEVELOPMENT_BUILD.md) ➔ [QA_CHECKLIST.md](QA_CHECKLIST.md)                          |
| **リリース責任者**             | [RELEASE_ANDROID_IOS.md](RELEASE_ANDROID_IOS.md) ➔ [STORE_LISTING_DRAFT.md](STORE_LISTING_DRAFT.md)              |
