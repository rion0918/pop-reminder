# Design QA: リマインド0件時のホーム画面刷新

## Comparison target

- source visual truth: `/Users/hasimotorion/.codex/generated_images/019f684d-c801-7cd2-a30d-12f308eac6d6/exec-b26a6cb4-4a10-4194-891f-392f3ef749fb.png`
- implementation screenshot: `/Users/hasimotorion/ghq/github.com/rion0918/pop-reminder/design-qa-assets/empty-home-390x844.png`
- compact implementation screenshot: `/Users/hasimotorion/ghq/github.com/rion0918/pop-reminder/design-qa-assets/empty-home-compact-360x780.png`
- interaction screenshot: `/Users/hasimotorion/ghq/github.com/rion0918/pop-reminder/design-qa-assets/empty-home-quick-add-390x844.png`
- viewport: 390×844、360×780
- state: 読込完了、エラーなし、リマインド0件、skyテーマ

## Full-view comparison evidence

- post-fix comparison: `/Users/hasimotorion/ghq/github.com/rion0918/pop-reminder/design-qa-assets/empty-home-comparison-390x844.png`
- before-fix comparison: `/Users/hasimotorion/ghq/github.com/rion0918/pop-reminder/design-qa-assets/empty-home-comparison-before-spacing-fix-390x844.png`
- 390×844では見出し、286pxの追加用バブル、案内文がモックと同じ順序と重心で収まり、期限色凡例とFABは表示されない。
- 360×780ではバブルが269pxへ縮小し、本文の折返し、下端のはみ出し、ページスクロールは発生しない。

Focused region comparisonは不要。390×844の結合画像で、見出しの折返し、泡の膜・光沢・色リム、案内文、ヘッダーまで判読でき、別クロップによる追加判断が不要な大きさだった。

## Findings

- P0/P1/P2の未解決差分なし。
- Fonts and typography: 既存ホームと同じシステムフォント、ウェイト、色を維持。見出しは2行、案内文は1行で切れない。生成モックよりわずかに太いが、既存デザインシステムを維持する意図した差分。
- Spacing and layout rhythm: 初回比較で縦方向が詰まっていたため修正済み。ボード高から上余白と案内文間隔を計算し、390×844ではモックの重心に合わせ、短い端末では間隔を縮める。
- Colors and visual tokens: 現在のskyテーマと既存の淡い青・ラベンダー・ピーチのガラス表現を維持。モック下部の強い青い霞は、背景を刷新しないという仕様に合わせて追加していない。
- Image quality and asset fidelity: ヘッダーは既存アプリアイコンを使用。追加用バブルは既存バブルと同じコードネイティブなガラス表現で、輪郭、ハイライト、反射に破綻や圧縮劣化なし。モックより彩度が控えめなのは既存UI再利用による許容差。
- Copy and content: 「最初のリマインドを\nふわっと残そう。」「泡をタップして追加」が一致。中央の＋、アイコン、文字、丸いタッチ表示はない。

## Comparison history

1. Initial comparison
   - finding: [P2] 見出し、泡、案内文の縦リズムがモックより上寄りかつ詰まっていた。
   - evidence: `design-qa-assets/empty-home-comparison-before-spacing-fix-390x844.png`
   - fix: ボード高に応じた上余白と案内文間隔を追加し、コンパクト高では自動的に縮むようにした。
2. Post-fix comparison
   - evidence: `design-qa-assets/empty-home-comparison-390x844.png`、`design-qa-assets/empty-home-compact-360x780.png`
   - result: 先のP2は解消。新しいP0/P1/P2差分なし。

## Primary interactions tested

- アクセシブル名「リマインダーを追加」のボタンが1件だけ存在することを確認。
- 泡全体をクリックし、入力シートとタイトル入力欄が表示されることを確認。
- 390×844と360×780で文字切れ、泡の収まり、全画面スクロールの有無を確認。
- Reduce Motion、保存中無効化、読込中・エラー優先、1件以上の既存UI維持はsource contractと190件のテストで確認。

## Console check

- QA画面の表示と操作は完了。追加用バブル自体からのconsole errorはない。
- 既存のWeb export graphが本番ルートの`src/db/client.ts`も含むため、`expo-file-system`の`Paths.document`に起因する既存Web互換エラーを1件確認した。今回の差分、ネイティブ実行、空状態コンポーネントの表示・操作には影響せず、本チケットではDB・依存関係・保護ファイルを変更しない。

## Implementation checklist

- [x] 0件確定時だけ追加用バブルを表示
- [x] 0件時の期限色凡例、FAB、104px余白を非表示
- [x] 全域タップ、アクセシビリティ、押下反応、Reduce Motion対応
- [x] Quick Add接続と保存中だけの無効化
- [x] 390×844とコンパクト幅の視覚確認
- [x] `pnpm run mvh:verify`

## Follow-up polish

- P3: モックは泡の青・ピンクの色リムがやや強い。既存バブルとの統一を優先して現状維持とする。

final result: passed
