# Issue #158 設計書: iOS 27 ステータスバー強制ブラー(透け)対策

- 状態: 確定版(Q1〜Q4・製造前確認事項ともユーザー確定済み)
- 設計担当モデル: Claude Opus 5.5
- 親Issue: #157(項目1)
- base: `develop/v2.0`(起点 `4e0ea37`)
- 製造用ブランチ: `feature/issue-158-statusbar-blur`
- 同一PRに含めないもの: 円形プログレス(LoadingIndicator)置換 #159

## 1. 参照資料と確定事項

### 1.1 参照資料

- Issue #158 本文(`gh issue view 158`)
- [issue-142-header-bottom-finish.md](issue-142-header-bottom-finish.md)(§7 引き継ぎ: 本件を後続Issueへ切り離した経緯)
- 参考記事: https://qiita.com/na-trium-144/items/0add98a80ca2391e3f17 (統括担当の要約による。設計担当は記事本文・WebKitソースを直接確認していない → 「未確認」)
- 業務標準 02・06・09 号
- 関連コード: `index.html`、`vite.config.ts`、`scripts/build-config.ts`、`scripts/theme-colors.ts`、`src/ui/App.tsx`、`src/ui/screen/*.tsx`、`src/ui/screen/main-screen.css`、`src/ui/screen/scoring-table.css`、`src/ui/screen/use-scrolled.ts`、`src/ui/engine/engine.css`、`src/ui/expressive/bottom-sheet.css`、`src/ui/theme/apply-theme.ts`

### 1.2 ヒアリング済み確定事項(前提。再検討しない)

1. 対象は全6画面(MainScreen / EngineScreen(EngineView) / ScoringTableScreen / SettingsScreen / HelpScreen / LicenseScreen)× Safari / PWAスタンドアロン × ライト / ダーク(プレビュー環境含む)。実機確認はオーナーが行う。
2. #159 は同一PRに含めない。
3. ステータスバー色を動的に変えられない場合の既定は `--md-sys-color-surface-container`。プレビュー環境は `--md-sys-color-quaternary` を維持。
4. base は `develop/v2.0`。

## 2. 原因調査

### 2.1 コードから裏取りできた事実

| # | 事実 | 根拠(実行・閲覧したもの) |
| --- | --- | --- |
| F1 | 現 `4e0ea37` の `src/` には `background-clip` を使うダミー要素が**存在しない**。#142 で試行したダミー要素はマージされておらず、試行時のコード(配置位置・スタイル)はリポジトリに残っていない | `grep -rn "background-clip" src` → 0件。`git log --all -G "background-clip" -- src` → 0件 |
| F2 | 全6画面とも、上端の要素は `<header className="app-header">` で `position: sticky; top: 0; z-index: 15`(`main-screen.css` 18行〜)。`position: fixed` ではない | `main-screen.css` 26行。各画面 tsx で `<header` を確認(MainScreen は `AppHeader`、他5画面は各自の `<header>`) |
| F3 | `position: fixed` の要素はアプリ全体で2つだけ。`.result-banner`(MainScreen のみ・既定 `opacity: 0; visibility: hidden`)と `.bottom-sheet`(`bottom: 0` の下端配置)。**画面上端に常時存在する fixed 要素はどの画面にもない** | `grep -rn "position: fixed" src` |
| F4 | `#root` の祖先(`html`/`body`)および各画面ルート(`.app-shell` / `.settings-screen` / `.scoring-table-screen` 等)に `transform` / `filter` / `contain` / `will-change` は無い。fixed の包含ブロックを変える要因はコード上見当たらない | `grep -rnE "transform\|contain:\|will-change" src --include=*.css`(ヒットは小要素のみ) |
| F5 | MainScreen 以外の5画面は `React.lazy` + `<Suspense fallback={null}>` で描画され、画面遷移のたびに DOM が丸ごと入れ替わる。MainScreen だけは常時ロード | `src/ui/App.tsx` |
| F6 | ヘッダー背景は `color-mix(surface-container X%, surface)`(X = `--app-header-scroll` × 100)。スクロール0で `surface`、32px で `surface-container`。点数計算表画面は一部ボタンも同変数に追従 | `main-screen.css` 19〜24行、`scoring-table.css` 134〜145行、`use-scrolled.ts` |
| F7 | `<meta name="theme-color">` はビルド時に `prefers-color-scheme` light/dark の2本が注入され、色は本番 `surface`・プレビュー `quaternary`。manifest の `theme_color` は `surface`(light) | `index.html`、`scripts/build-config.ts` 52〜54行、`vite.config.ts` 23〜27行・86〜88行 |
| F8 | アプリ内テーマ手動切替(`data-theme`)は `theme-color` meta を更新しない。手動でOSと逆のテーマを選ぶと、ステータスバー色(OS追従)とアプリ配色がずれる | `grep -n "theme-color\|meta" src/ui/theme/apply-theme.ts` → 0件 |
| F9 | `<md-dialog>` 表示中はスクリム(fixed・z-index 30)が全面に出る(#142 で調整済み)。ダイアログ表示中のみの要素 | #142 設計書・コミット `af31301` |

### 2.2 画面間の差分表

| 画面 | ロード | 上端要素 | 上端以外の fixed | ヘッダー色の変化 | 備考 |
| --- | --- | --- | --- | --- | --- |
| MainScreen | 常時 | `AppHeader`(sticky) | ResultBanner(非表示時 hidden)・BottomSheet(下端) | surface→surface-container | 唯一、fixed 要素を持つ |
| EngineScreen | lazy | `<header>`(sticky)+ `.engine-card` sticky(z18) | なし | 同上 | |
| ScoringTableScreen | lazy | `<header>`(sticky) | なし | 同上+ボタン色 | 横スクロール表あり |
| SettingsScreen | lazy | `<header>`(sticky) | なし | 同上 | |
| HelpScreen | lazy | `<header>`(sticky) | なし | 同上 | |
| LicenseScreen | lazy | `<header>`(sticky) | なし | 同上 | |

### 2.3 実機でしか確定できない仮説

- H1(最有力): 現状は**全画面で**記事の判定条件(上端・高さ10px超・背景色あり・fixed)を満たす要素が無く、全画面がブラー対象。#142 試行で「効く画面・効かない画面」に割れたのは、ダミー要素が全画面で常時存在する位置に置かれていなかった(画面コンポーネント内に置いた、lazy 画面の Suspense 境界内だった等)可能性。ただし F1 のとおり試行コードが残っておらず、**コードからは割れの原因を特定できない**。
- H2: WebKit の判定が描画時(初回レイアウト・ページロード時)にのみ行われ、SPA の画面遷移(F5 の DOM 入替え)後に再判定されない/タイミングがずれる可能性。H1 の対策(常時存在する1要素)で同時に回避される。
- H3: 判定がスクロール位置・sticky 要素の重なりを考慮している可能性(記事要約に記載なし)。
- H4: ステータスバー色は `theme-color` meta(または上端 fixed 要素の背景色)から**ページ読込時に1回**決まり、以後動的に変わらない(#142 実機観察と整合)。
- いずれも iOS 27 実機での確認が必要(実挙動未確認)。

### 2.4 統括見立てとの照合結果

- 見立て2(sticky は条件を満たさない)はコードと整合(F2・F3)。
- 見立て2の「画面ごとの割れ」は、現コードに割れを生む差分が無いため、試行時の配置に起因した可能性が高い(H1)。断定はしない。
- 見立て3(`theme-color` と `data-theme` のずれ)は事実(F8)。本Issueの透け対策そのものとは独立した問題だが、固定色運用にするならステータスバー色の正しさに直結する → 要判断事項 Q3。
- 見立て4(動的追従不可)は前提として受け入れる。固定色運用時のヘッダー色との整合 → 要判断事項 Q2。

## 3. 解決案

### 案A: 全画面共通の fixed ダミー要素を1箇所に配置

- `index.html` の `<body>` 直下、`<div id="root">` の**外・前**に静的要素 `<div class="status-bar-guard" aria-hidden="true"></div>` を置く。React・Suspense・画面遷移の影響を受けず、初回描画から常時存在する(H1・H2 を同時に回避)。
- スタイル(新規 `src/ui/theme/status-bar-guard.css`、`main.tsx` で `tokens.css` と同様に直接 import。`build-css.test.ts` は `ui/theme/` を対象外としているため、§5 で専用の規約テストを追加する):
  - `position: fixed; top: 0; inset-inline: 0; z-index: 16; pointer-events: none;`
  - `height: max(env(safe-area-inset-top, 0px), 0.75rem);`(10px 超を常に満たす。0.75rem = 12px)
  - `background-color: var(--md-sys-color-surface-container);`(プレビュー: `:root[data-app-env="preview"]` で `var(--md-sys-color-quaternary)`)
  - 描画を消す: `-webkit-background-clip: text; background-clip: text; color: transparent;`
  - `opacity` / `visibility` / `display: none` は使わない(判定から外れるため)
- メリット: 変更が小さい。既存のヘッダー・下端フェード・#142 の UX を変えない。JS増分ゼロ(CSS数十バイト)。
- デメリット: WebKit の非公開ヒューリスティックに依存(将来の iOS で無効化され得る)。当初案の z-index 0 では sticky ヘッダー(z15)より背面となり「最前面」判定に効かない懸念があったため、第1段階で z-index 16 に変更した(§6)。
- リスク: 低。不可視・pointer-events なしのため既存 UI への副作用は原理上ない。

### 案B: `.app-header` 自体を `position: fixed` 化

- 全6画面のヘッダーを fixed にし、本文に `padding-top: var(--app-header-height)` を入れる。ヘッダー背景が判定対象になる。
- メリット: 実在要素が条件を満たすので、ダミーより意図が明確。
- デメリット: 6画面すべてのレイアウト変更(高さ計測の導入、EngineScreen の `--engine-header-height`・`.engine-card` sticky、MainScreen の sticky 要素 `top: var(--app-header-height)` との再整合)。#142 で詰めた下端フェード・z-index 階層の再検証が必要。iOS の fixed とキーボード/アドレスバー伸縮の既知の挙動差も新たに抱える。
- リスク: 高。回帰範囲が全画面。

### 案C: ヘッダー色を固定色化し動的追従をやめる

- `--app-header-bg` を `--md-sys-color-surface-container` 固定にし、`--app-header-scroll` による color-mix を廃止(`use-scrolled` の `data-scrolled` は残すか要検討)。`theme-color` meta も `surface-container` に変更。
- 単独では透けを止めない(判定要素が無いまま)。**A と組み合わせる前提**の色整合策。
- メリット: ステータスバー(固定色)とヘッダーが常に同色になり、スクロール0で「ステータスバー=surface-container、ヘッダー=surface」の段差が出ない。
- デメリット: #142 で確定した「スクロールで surface→surface-container に変化する」UX を撤回する。#142 設計書・`--app-header-scroll` 関連の規約テストの改訂が必要。

### 比較

| 観点 | A | B | C(単独) | A+C |
| --- | --- | --- | --- | --- |
| 透け抑止 | 期待できる(実機未確認) | 期待できる(実機未確認) | 効果なし | 期待できる |
| 変更規模 | 小(html 1行+CSS 1本+テスト) | 大(6画面) | 中(CSS・hook・テスト・#142設計の改訂) | 中 |
| 初回JS増分 | 0 B(CSSのみ) | 数百B程度(高さ計測) | ほぼ0〜減 | 0 B程度 |
| UX変化 | なし | レイアウト挙動変化の恐れ | スクロール時の色変化が消える | 同左 |
| 色整合(上端の段差) | スクロール0で段差あり(Q2) | 同左 | 解消 | 解消 |
| 回帰リスク | 低 | 高 | 中 | 中 |

### 採用案(ユーザー確定)

**案A を採用(C は採らない)。** theme-color を `surface-container` に変更し、ヘッダーのスクロール色変化(#142)は維持する。スクロール0でのステータスバーとヘッダー(surface)の段差は許容する。§4・§5 は確定した内容に基づく。

## 4. 変更対象と仕様(推奨案)

| ファイル | 変更 |
| --- | --- |
| `index.html` | `<body>` 直下・`#root` の前に `<div class="status-bar-guard" aria-hidden="true"></div>` を追加 |
| `src/ui/theme/status-bar-guard.css`(新規) | §3 案Aのスタイル。色は MD3 トークンのみ(06号。HEX直書き禁止) |
| `src/main.tsx` | `status-bar-guard.css` を直接 import(バレル経由にしない) |
| `scripts/build-config.ts` | 型 `StatusBarColorRole` を `'surface-container' \| 'quaternary'` に変更し、本番の `statusBarColorRole` を `'surface'` → `'surface-container'`。プレビューは `'quaternary'` のまま |
| `scripts/build-config.test.ts` | 本番の期待値を `'surface-container'` に更新 |
| `scripts/theme-colors.ts` | 原則変更不要。`readStatusBarColors(cssText, role)` は role を任意のトークン名として読むため、`surface-container` も読める(コードで確認済み)。既定引数 `'surface'` と JSDoc「既定: surface」は変更しない(呼び出し側で役割を明示するため) |
| `scripts/theme-colors.test.ts` | `readStatusBarColors(tokensCss, 'surface-container')` が light/dark とも値を返すケースを追加 |
| `vite.config.ts` | `manifestThemeColor` を `readStatusBarColors(tokensCss, 'surface').light` → `statusBarColors.dark` に変更(= 本番は surface-container のダーク値、プレビューは quaternary のダーク値)。`theme_color` / `background_color` の両方に使う |
| テスト(新規/更新) | §5 M1〜M4・M8 |

### 4.1 manifest 値の整理(Q4 確定の具体化)

| ビルド | index.html theme-color(light / dark) | manifest `theme_color` = `background_color` |
| --- | --- | --- |
| 本番 | surface-container の light 値 / dark 値 | surface-container の **dark 値** |
| プレビュー | quaternary の light 値 / dark 値 | quaternary の **dark 値** |

- manifest は1値しか持てず動的変更もできないため、ステータスバー色の役割のダーク値を採る(ユーザー確定)。
- 影響: PWA 起動時スプラッシュ背景・タスク切替時の色がライトテーマ利用時もダーク色になる。ユーザー確定として受け入れる。

- プレビュー環境: ガード要素は `:root[data-app-env="preview"] .status-bar-guard { background-color: var(--md-sys-color-quaternary); }`。`theme-color` は従来どおり quaternary。ヘッダー上端の quaternary ボーダーは変更しない。
- `--app-header-scroll`・下端フェードは変更しない(Q2 で C を選んだ場合のみ変更)。
- `theme-color` と `data-theme` のずれ(F8)は**範囲外・対応しない**(ユーザー確定。別Issue化もしない)。既知の制約: アプリ内で OS 設定と逆のテーマを手動選択すると、ステータスバー色は OS 設定側の surface-container になり、アプリ配色とずれる。

## 5. 受け入れ条件

### 5.1 機械検証(検収担当が実行)

- [ ] M1: `npm run build` 後、`dist/index.html` に `class="status-bar-guard"` を持つ要素が `<div id="root">` より前に1つだけ存在する(`grep -n` で行番号比較)。
- [ ] M2: 規約テスト(新規 `src/ui/theme/status-bar-guard.test.ts` 等)で `status-bar-guard.css` を文字列検査し、以下を全て満たす: `position: fixed`・`top: 0`・`z-index: 16`・`pointer-events: none`・`background-clip: text`(`-webkit-` 版も)・`background-color: var(--md-sys-color-surface-container)`・preview 時 `var(--md-sys-color-quaternary)`・`height` に `max(` を含む。`opacity`・`visibility`・`display: none` を含まない。`#[0-9a-fA-F]{3,8}` を含まない。
- [ ] M3: 本番ビルドの CSS アセットに `status-bar-guard` セレクタが含まれる(本番ビルドで CSS が落ちないこと。`grep -l status-bar-guard dist/assets/*.css` が1件以上)。
- [ ] M4: `npm run build` の `dist/index.html` の `theme-color` meta 2本の `content` が、`tokens.css` の `--md-sys-color-surface-container` の light / dark 値と一致する。プレビュービルド(`scripts/build-config.ts` のプレビュー判定条件で実行)では quaternary の値と一致する。既存の theme-color 関連テストを更新して自動化すること。
- [ ] M8: `npm run build` 後の `dist/manifest.webmanifest` の `theme_color` と `background_color` が、`tokens.css` の `--md-sys-color-surface-container` の dark 値と一致する。プレビュービルドでは `--md-sys-color-quaternary` の dark 値と一致する。
- [ ] M5: `npm run lint` / `npm run typecheck` / `npm run format:check` / `npm test` が全て終了コード0。
- [ ] M6: 09号に従い、起点 `4e0ea37` と製造後の初回JS(gzip)を同一手順で実測し、増分を PR に記録する(目標値。超過で不合格にしない)。見込み: JS 変更は無く増分 0 B(CSS・HTML・manifest のみ変化)。
- [ ] M7: 差分にホームディレクトリ名が含まれない(docs 含む)。

### 5.2 オーナー実機確認(iOS 27。検収担当は実施しない。PRにチェック表を載せる)

各セルで「ステータスバー裏にコンテンツが透けない(ブラー/透過がない)」「ステータスバー色が期待色」を確認。手順: 各画面で本文を十分スクロールし、上端にコンテンツが潜り込む状態で目視。画面遷移後(Main→各画面→Main)にも再確認。

| 画面 | Safari ライト | Safari ダーク | PWA ライト | PWA ダーク | プレビュー PWA ライト | プレビュー PWA ダーク |
| --- | --- | --- | --- | --- | --- | --- |
| MainScreen | | | | | | |
| EngineScreen | | | | | | |
| ScoringTableScreen | | | | | | |
| SettingsScreen | | | | | | |
| HelpScreen | | | | | | |
| LicenseScreen | | | | | | |

- 期待色: 本番 = surface-container、プレビュー = quaternary(OS 設定のライト/ダークに対応した値)。アプリ内テーマを OS と逆にした場合のずれは既知の制約のため確認対象外。
- 追加確認(PWA): 起動時スプラッシュ背景がダーク値(本番 surface-container dark / プレビュー quaternary dark)になる。
- 追加確認: ダイアログ(md-dialog)表示中・BottomSheet 表示中に上端の表示が崩れない。タップが上端で阻害されない(ヘッダー戻るボタンが押せる)。

## 6. 効かなかった場合のフォールバック手順(順に試す)

1. ガード要素の `z-index` を `16`(ヘッダーより前面。pointer-events なし・不可視なので操作は阻害しない)に上げる。H3(最前面判定)対策。**実施済み(実機確認待ち)。**
2. ガード要素の高さを `calc(env(safe-area-inset-top, 0px) + 0.75rem)` に増やし、ヘッダー上端と重なる量を確保。
3. `background-clip: text` をやめ、ガードを可視の帯(背景 = 期待色、ステータスバー領域のみ)にする。セーフエリアを塗りつぶす実装として成立する。
4. 案B(ヘッダー fixed 化)へ切替。設計書を改訂して再承認を受ける。
- 各段階はオーナー実機確認1回ごとに1つずつ進める(同時に複数を変えない)。

## 7. 確定済みの判断(ユーザー確定の記録)

- Q1(採用案): **案A**。
- Q2(色整合): **(a)** スクロール0での段差を許容し、#142 のスクロール色変化を維持。
- Q3(theme-color と手動テーマのずれ F8): **範囲外・対応しない**。別Issue化もしない。既知の制約として §4 に記録。
- Q4(manifest): manifest は動的変更できないため、`theme_color` / `background_color` を**ステータスバー色の役割のダーク値**に合わせる(本番 surface-container dark / プレビュー quaternary dark。§4.1)。

## 8. 後続Issueへの引き継ぎ

- 新規画面を追加する場合、ガード要素は `index.html` 側にあるため画面側の対応は不要。
- 実機確認の結果(どのフォールバック段階で解決したか)を本設計書に追記し、H1〜H4 の真偽を記録すること。

## 9. 外部事実の確認記録

| 事実 | 実行したコマンド | 結果 |
| --- | --- | --- |
| Issue #158 の内容 | `gh issue view 158` | 本文確認済み(§1.2 と一致) |
| ダミー要素が現コードに無い | `grep -rn "background-clip" src` / `git log --all --oneline -G "background-clip" -- src` | 0件 / 0件 |
| fixed 要素の全数 | `grep -rn "position: fixed" src` | `bottom-sheet.css` と `main-screen.css`(.result-banner)の2件 |
| theme-color の注入元と色ロール | `sed -n 1,60p vite.config.ts`、`grep -n statusBarColorRole scripts/build-config.ts` | 本番 surface / プレビュー quaternary |
| WebKit の判定条件(10px超・fixed・背景色・background-clip:text で可) | 実行なし | **未確認**(統括担当の記事要約に依拠) |
| iOS 27 でステータスバー色が動的に変わらない | 実行なし | **未確認**(#142 オーナー実機観察に依拠) |
| 初回JS基準値 | 実行なし | **未実測**(M6 で製造・検収が実測) |

## 10. 製造前の確認事項(ユーザー確定済み)

1. プレビュー環境の manifest も quaternary の dark 値とする(本番=surface-container の dark 値)。確定。
2. `background_color` も `theme_color` と同じダーク値とする。スプラッシュ背景がライト利用時も暗色になることを了承済み。確定。
