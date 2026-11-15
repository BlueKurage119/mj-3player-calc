# Issue #108 設計書: G1 オフライン対応とインストール(manifest・アイコン・更新処理)

- 対象Issue: #108(Epic G #8 の Sub-Issue)
- 基準: `main` e93d239(2026-11-16 時点)
- 状態: 設計承認済み。ユーザー判断事項はすべて【確定】(§9)

## 1. 参照資料と設計判断の根拠

### 1.1 ヒアリング確定事項(統括担当より。再検討しない)

| # | 確定事項 | 本設計での反映 |
| --- | --- | --- |
| H1 | 更新は現状維持(通知なしの自動更新、`registerType: 'autoUpdate'`)。新版通知UIは作らない | §3.4 |
| H2 | アイコンは自作SVGから再現可能なスクリプトでPNG生成。ファイル名・サイズ・manifest は素材の中身に依存させない | §3.2 |
| H3 | `display=standalone`、`start_url`・`scope`=`/mj-3player-calc/`、`lang=ja`、`name`=「三麻点数計算機」、`short_name`=「三麻計算機」、`orientation` は固定しない、`base` は変更しない、`description`・`apple-touch-icon`・`theme-color` を `index.html` に追加 | §3.1・§3.3 |
| H4 | 実機でしか確認できない項目は受け入れ条件で区別 | §8.2 |
| H5 | (ユーザー回答・設計承認時)製造段階のアイコンは仮で C案「北牌」とする。最終デザイン(点棒を逆三角形に組み数字の3を併記、ユーザー案)は UI監修中に支給または作成され、この PR(#108)内で差し替える。A案は見送り | §3.2・§5 |
| H6 | (ユーザー回答)ステータスバー色はシード色で固定。`meta theme-color` は `media` で出し分けず1つの固定値、manifest の `theme_color` も同値。シード定義を単一の正本とし手書きHEXの二重管理を避ける | §3.3・§4 |
| H7 | (ユーザー回答)§9 の Q1〜Q7 の回答 | §9 |

### 1.2 参照した資料

- `docs/rules/02`(設計)・`05`(テスト命名)・`06`(UI・色トークン)・`07`(麻雀ルール。本Issueはルール・点数に触れないため該当なし)・`09`(バンドル目標値)
- `docs/rules/advisory/G-01`・`G-09`・`G-11`(本番ビルドでの確認。本Issueの確認はすべて `npm run build` の成果物で行う)
- Issue #108 本文、`docs/issues-draft.md` G1、`docs/requirements.md` §1・§4
- `vite.config.ts`、`index.html`、`tsconfig.node.json`、`scripts/gen-theme-tokens.ts`、`src/ui/theme/tokens.css`(生成物)、`src/ui/theme/apply-theme.ts`、`src/ui/share/share-theme.ts`、`src/ui/screen/main-screen.css`、`docs/license-policy.md`

## 2. 設計時の実測(main e93d239、2026-11-16)

`npm run build:wasm` → `npm run build` を実行し、`dist/` を確認した(確認後に `dist/` は削除)。

| 項目 | 実測結果 |
| --- | --- |
| precache | `PWA v0.21.2 / generateSW / precache 46 entries (1006.75 KiB)` |
| WASM | `assets/decomposer_bg-*.wasm` が `dist/sw.js` の precache に載っている |
| 牌SVG | `dist/assets/*.svg` 30 個すべてが precache に載っている(`url:"…svg"` 30 件) |
| PNG | 現状 0 個(アイコンが無いため) |
| SW登録 | `src/` に `registerSW` の呼び出しは無いが、`injectRegister` の既定により `dist/index.html` に `<script id="vite-plugin-pwa:register-sw" src="/mj-3player-calc/registerSW.js">` が注入されている。内容は `navigator.serviceWorker.register('/mj-3player-calc/sw.js', { scope: '/mj-3player-calc/' })` |
| manifest | **既に自動生成されている**(`manifest` 未指定時のプラグイン既定値)。`name`/`short_name`=`mj-3player-calc`、`theme_color`=`#42b883`、`background_color`=`#ffffff`、`lang`=`en`、`start_url`・`scope`=`/mj-3player-calc/`、`icons` なし。`<link rel="manifest">` も注入済み |
| scope と base | `base`=`/mj-3player-calc/` と manifest の `start_url`・`scope`、SW 登録の `scope` がすべて一致 |
| ナビゲーション | `NavigationRoute(createHandlerBoundToURL("index.html"))` があり、オフライン時のナビゲーションは precache の `index.html` で応答する |
| 初回JS(09号) | `assets/index-BY5wZHx_.js` 1本(`modulepreload` なし)、`gzip -9` で **128,638 B** |
| シード色の定義 | `scripts/gen-theme-tokens.ts` 11行目 `export const SEED = '#1B5E20';`。同ファイルは `@material/material-color-utilities` を import しており、`gen:theme` は vite-node に `--options.deps.inline=@material/material-color-utilities` を付けて実行している |

設計上の帰結: 「manifest が無い」のではなく「既定値の不適切な manifest が出ている」。本Issueは `manifest` を明示指定して既定値を上書きし、アイコンを追加することが中心になる。WASM・牌SVGのプリキャッシュとSW登録は既に成立しているので、変更せず受け入れ条件で回帰確認する。

## 3. 設計

### 3.1 manifest(`vite.config.ts` の `VitePWA({ manifest })`)

```ts
manifest: {
  name: '三麻点数計算機',
  short_name: '三麻計算機',
  description: '三人麻雀の点数計算機。和了形・聴牌形の役と打点、向聴数と何切るを表示する',
  lang: 'ja',
  start_url: '/mj-3player-calc/',
  scope: '/mj-3player-calc/',
  display: 'standalone',
  theme_color: SEED,                 // §4。シード色
  background_color: lightSurface,    // §4。tokens.css ライトの --md-sys-color-surface
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}
```

- `orientation` は書かない。`id` は書かない(既定で `start_url` 相当)。
- `icons[].src` は相対パス(manifest の URL 基準で `/mj-3player-calc/icons/…` に解決される)。
- `description` は上記文言で【確定】(Q4)。`index.html` の `meta description` と同文にする。
- `short_name`「三麻計算機」は `name` から「点数」を落とした短縮で、別アプリと誤解される語を含まない。

### 3.2 アイコン素材と生成

#### ファイル構成(素材の中身に依存しない固定の契約)

| パス | 役割 | 生成元 |
| --- | --- | --- |
| `assets-src/icon/icon.svg` | 通常アイコンの原画(仮=C案、正方形 viewBox 0 0 512 512、地は全面塗り) | 自作 |
| `assets-src/icon/icon-maskable.svg` | maskable 用原画(モチーフを中心直径 80% の円=セーフゾーン内に収め、地は全面塗り) | 自作 |
| `public/icons/icon-192.png` | 192×192 | `icon.svg` |
| `public/icons/icon-512.png` | 512×512 | `icon.svg` |
| `public/icons/icon-maskable-512.png` | 512×512 | `icon-maskable.svg` |
| `public/icons/apple-touch-icon-180.png` | 180×180、透過なし(iOS は透過部を黒にするため) | `icon-maskable.svg` |
| `public/favicon.svg` | ファビコン | `icon.svg` のプレースホルダを解決したSVG |

- 最終デザインへの差し替え手順は §5.2。
- 生成PNGと `favicon.svg` はコミットする(ビルド時生成にしない。CI にネイティブ依存を増やさないため)。`public/` は Vite がそのまま `dist/` にコピーし、`globPatterns` の `png`・`svg` で precache に載る。
- `assets-src/` は `src/` の外に置く(Vite のモジュールグラフに入れないため)。ディレクトリ名は製造で変えてよい。

#### 原画の色(Q1【確定】(b))

- 原画SVGの色(地・牌地・枠)は値でなく `var(--md-sys-color-<役割>)` の形のプレースホルダで書く(例 `fill="var(--md-sys-color-primary)"`)。
- `gen-icons.ts` は `src/ui/theme/tokens.css` の `:root`(ライト)ブロックから役割名→値の対応を取り出し、原画中のプレースホルダを置換してから描画する。`favicon.svg` も置換後の内容を書き出す(ブラウザのファビコンは CSS 変数を解決しないため)。
- 未知の役割名・tokens.css の読み取り失敗は例外で終了する(非0終了)。プレースホルダを含まない原画(支給素材)はそのまま描画する。
- tokens.css の読み取り関数は §4 の `vite.config.ts` 側と共用する(例 `scripts/theme-colors.ts` に `readTokenValues(cssText, block: 'light' | 'dark')` を置く)。
- 根拠: 06号の色トークン義務の対象は `src/ui/` のUIで、アイコン原画は `src/ui/` 外の画像素材であるが、値を直書きすると seed 変更(`npm run gen:theme`)に追随せず二重管理になる。#102 の `src/ui/share/share-theme.ts` が Canvas 描画の色を値でなく役割名(`ShareColorRole`)で定義している先例に揃える。

#### 生成スクリプト

- `scripts/gen-icons.ts`、`package.json` に `"icons:gen": "vite-node scripts/gen-icons.ts"` と `"check:icons": "npm run icons:gen -- --check"` を追加。
- 実行器は既存 `gen:theme` と同じ `vite-node` に揃える(追加依存なし)。`vite-node` は `package.json` の直接依存ではなく `vitest` 経由の推移依存だが、`node_modules/.bin/vite-node` は存在し `gen:theme` も同じ仕組みで動いている。
- `gen:theme` の `--options.deps.inline=@material/material-color-utilities` は同ライブラリの ESM 解決のための指定で、`gen-icons.ts` は同ライブラリを使わない(tokens.css を `node:fs` で文字列として読むだけ)ため inline 指定は不要の見込み。`@resvg/resvg-js` はネイティブの CJS パッケージで外部モジュールとして読む。**実挙動未確認**。動かない場合は製造で inline 指定を追加してよい。
- ラスタライザ: `@resvg/resvg-js`(2.6.2、MPL-2.0、devDependency、キャレットなしで固定)。SVG を忠実にラスタライズでき、ネイティブ libvips を要する `sharp` より依存が軽い。配布物に含まれない。`docs/license-policy.md` に記録する【確定】(Q6)。`CREDITS.md` は配布物の第三者素材の一覧であり、記載しない。
- 処理: 各原画のプレースホルダを解決 → `fitTo: { mode: 'width', value: N }` で描画 → PNG を書く。`apple-touch-icon-180.png` は `background` に地色を指定するか原画の全面塗りでアルファなしにする(製造で選択。G1-T5 で検査)。`--check` は生成結果と既存ファイルのバイト一致を比較し、差分があれば非0終了。
- 型検査: `tsconfig.node.json` は `files` を明示列挙しているため、`files` に `./scripts/gen-icons.ts`(と共用モジュールを別ファイルにする場合はそれ)を追加する。追加しないと `npm run typecheck`(`tsc -b`)の対象にならない。
- 原画に文字(フォント)を使わない(C案の北はパスで描かれた牌画像)。

#### 権利

- 牌形(地・牌地・枠)は本プロジェクトで新規に描いた図形で、権利はリポジトリの MIT ライセンスに従う。
- 北の絵柄は `src/ui/tile/assets/Pei.svg` の流用。出典は FluffyStuff/riichi-mahjong-tiles の `Regular/Pei.svg`(CC0 1.0、コミット `26e127ba2117f45cdce5ea0225748cc0cfad3169`)で、既存収録分(SVGO最適化済み)をアイコン用に縮小・再配置したもの。CC0 のため義務はないが、`CREDITS.md` の牌画像素材の「加工内容」に追記する(G1-AC15)。絵柄の色は06号の牌画像の例外として原画のまま。
- 原画には、北の絵柄の出典を XML コメントで記す。

### 3.3 `index.html` の追加要素

```html
<meta name="description" content="<§3.1 と同文>" />
<meta name="theme-color" content="%THEME_COLOR%" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
```

- `theme-color` は `media` で出し分けず1本【確定】(H6)。値はシード色で、ビルド時に `transformIndexHtml` の小プラグインがプレースホルダ `%THEME_COLOR%` を置換する(§4)。プレースホルダ名は製造で変えてよい。
- `href` は Vite が `public/` 参照に `base` を付与するため `/favicon.svg` と書けば `/mj-3player-calc/favicon.svg` になる見込み。`base` 付きで直接書いてもよい。いずれも G1-AC6 で `dist/index.html` の最終値を確認する。
- 旧論点 Q2(アプリ内テーマ設定と `media` 出し分けの食い違い)は、固定値にしたため解消した。ステータスバーはライト・ダークどちらのテーマでもシード色(濃緑)になる。

### 3.4 更新処理

- `registerType: 'autoUpdate'`、`workbox.skipWaiting/clientsClaim/cleanupOutdatedCaches/globPatterns` は変更しない(H1)。
- SW 登録は `injectRegister` 既定に依存している(§2 で注入を実測済み)。依存を明示するため `injectRegister: 'script'` を書き足す(挙動は現状と同じ。G1-AC6・AC7 で確認)。

### 3.5 横向き

- 対策しない【確定】(Q3)。`orientation` も指定しない。
- コード読解による参考情報: 画面は `--app-max-width: 600px` で中央寄せ、ボトムシートは `max-height: 50dvh`。横向き(高さ約 360〜430px)ではボトムシートの内部スクロールが必要になる可能性がある。**実挙動未確認**。問題が出たら別Issueで扱う。

## 4. 色の取得方式

### 4.1 規約の適用範囲【確定】(Q1)

manifest と `meta theme-color` は 06号の色トークン義務の対象外(解釈B)。ただし手書きHEXの二重管理を避けるため、ソースにHEXを書かず、正本から機械的に取得する。

### 4.2 正本と取得方法

| 値 | 正本 | 取得方法 |
| --- | --- | --- |
| シード色(`theme_color`・`meta theme-color`) | `SEED` 定数 | 下記 |
| `background_color` | `src/ui/theme/tokens.css` `:root` の `--md-sys-color-surface` | §3.2 の `readTokenValues` を `vite.config.ts` から呼ぶ |
| アイコン原画の色 | `src/ui/theme/tokens.css` `:root` の各トークン | `gen-icons.ts` が同関数で解決 |

シード色の取り込み:

- `SEED` を依存のない小モジュール `scripts/theme-seed.ts`(`export const SEED = '#1B5E20';` のみ)へ移し、これを単一の正本とする。`scripts/gen-theme-tokens.ts` はここから import する(`export { SEED }` で再 export し、既存の参照を壊さない)。`vite.config.ts` も同モジュールから import する。
- 移す理由: `vite.config.ts` から `gen-theme-tokens.ts` を直接 import すると、`@material/material-color-utilities` の読み込み(`gen:theme` が inline 指定を要しているもの)が設定ファイルの読み込み時に発生し、失敗するおそれがある。依存のない定数モジュールならこの問題が起きない。**実挙動未確認**(製造で `npm run build` が通ることで確認)。
- `gen-theme-tokens.ts` の生成結果(`tokens.css`)は変わらない。`npm run check:theme` が成功し続けることを受け入れ条件にする(G1-AC1)。
- `tsconfig.node.json` の `files` に `./scripts/theme-seed.ts` を追加する(`vite.config.ts` から辿られるため型検査には入るが、明示する)。
- 失敗時: `SEED` が `/^#[0-9A-Fa-f]{6}$/` に一致しない、tokens.css が読めない、`--md-sys-color-surface` が見つからない場合は `vite.config.ts` 内で例外を投げ、ビルドを失敗させる。

### 4.3 使う値

| 用途 | 値の正本 | 現在値(参考。手書きしない) |
| --- | --- | --- |
| `meta theme-color`(1本) | `SEED` | #1B5E20 |
| manifest `theme_color` | `SEED` | #1B5E20 |
| manifest `background_color`(スプラッシュの地色) | tokens.css ライトの `--md-sys-color-surface`【確定】 | #f7fbf1 |

`background_color` の得失: アプリ画面の地色と同じなので、ライト端末ではスプラッシュから画面へ色が途切れない。一方、manifest は1値しか持てないため、ダーク端末ではスプラッシュが一瞬明るく見える。

## 5. アイコン意匠

### 5.1 製造段階の仮アイコン(C案「北牌」)

| 要素 | 内容 | 色 |
| --- | --- | --- |
| 地 | 正方形の全面塗り | プレースホルダ `primary-container` |
| 牌地 | 中央の角丸矩形((256,256) 中心で x -140〜140、y -185〜185、rx 34) | プレースホルダ `surface-container-lowest` |
| 枠 | 牌地の線(幅 10) | プレースホルダ `on-primary-container` |
| 北の絵柄 | `Pei.svg` の中身を入れ子の `<svg viewBox="0 0 300 400">` で牌地内(中心基準で x -126、y -168、幅 252、高さ 336)に配置 | 原画のまま(06号 牌画像の例外。プレースホルダにしない) |

- 元になる原画: 設計時にスクラッチ領域で作成したモック `icon-mock/mock-C.svg`(リポジトリ外。製造担当には統括担当がファイルを渡す)。モックは色を値で転記しているため、製造では上表のプレースホルダに置き換える。
- maskable 版は、牌形と絵柄の全体を (256,256) 中心に 0.8 倍。地は全面塗りのまま。
- 既知の弱点: 48px 以下では北の絵柄が潰れて判別しにくい(モックで目視確認)。小サイズでの判別性は最終デザインで再評価する。
- モックはコミットしない【確定】(Q7)。

### 5.2 最終デザインへの差し替え手順(UI監修中・この PR 内)

最終デザインはユーザー案「点棒を逆三角形に組み、数字の3を併記」。UI監修中に SVG の支給または作成を受け、この PR(#108)に含めて次のとおり差し替える。差し替え後は CREDITS.md・本設計書・PR本文の仮アイコンの記述を削除し、権利・出典を更新する。

1. SVG で原画を用意する(支給は SVG【確定】Q5)。数字の「3」はパス化する。地・枠の色はプレースホルダ(`var(--md-sys-color-<役割>)`)で書くことを推奨(値のままでも描画できる)。
2. `assets-src/icon/icon.svg`(通常版)と `assets-src/icon/icon-maskable.svg`(モチーフを中心直径 80% の円内に収めた版)を置き換える。ファイル名は変えない。
3. `npm run icons:gen` を実行し、`public/icons/icon-192.png`・`icon-512.png`・`icon-maskable-512.png`・`apple-touch-icon-180.png` と `public/favicon.svg` を再生成する。`npm run check:icons` が終了コード0になることを確かめる。
4. コミット対象は `assets-src/icon/` の2ファイルと上記の生成物5ファイル。manifest・`index.html`・`vite.config.ts` は変更不要。
5. 北の絵柄を使わなくなる場合は、`CREDITS.md` の「アプリアイコン(仮)に再配置」の追記を削除する。

### 5.3 A案「三つの点」(見送り)

正三角形配置の円3つと中央の菱形。モックでは小サイズでの判別性が最も高かったが、最終デザインの候補ではない(ユーザー判断)。記録のみ残す。

## 6. 変更対象ファイル一覧

| ファイル | 変更 |
| --- | --- |
| `vite.config.ts` | `manifest` 追加、§4 の色取得、`transformIndexHtml` プラグイン、`injectRegister: 'script'`。`base`・`workbox` は変更しない |
| `index.html` | §3.3 の要素を追加 |
| `scripts/theme-seed.ts` | 新規(`SEED` の正本) |
| `scripts/gen-theme-tokens.ts` | `SEED` を `theme-seed.ts` から import・再 export(生成結果は不変) |
| `scripts/theme-colors.ts`(名前は製造で可) | 新規(tokens.css の読み取り・プレースホルダ解決) |
| `scripts/gen-icons.ts` | 新規 |
| `assets-src/icon/icon.svg`・`icon-maskable.svg` | 新規(仮=C案) |
| `CREDITS.md` | 牌画像素材の「加工内容」に、Pei.svg をアプリアイコン(仮)に縮小・再配置した旨を追記 |
| `public/icons/*.png`・`public/favicon.svg` | 新規(生成物) |
| `package.json` | `icons:gen`・`check:icons`、devDependency `@resvg/resvg-js` 2.6.2 |
| `tsconfig.node.json` | `files` に `./scripts/gen-icons.ts`・`./scripts/theme-seed.ts`・`./scripts/theme-colors.ts` を追加 |
| `docs/license-policy.md` | `@resvg/resvg-js`(MPL-2.0、devDependency、配布物に含まれない)を記録 |
| テスト(例 `scripts/theme-colors.test.ts`・`src/pwa/icons.test.ts`) | §7 |

並行Issue #69(G4)は `index.html`・`vite.config.ts`・`public/` に触れない見込みのため衝突はない想定。

## 7. テスト(Vitest)

テスト名は 05号の命名規約に従い `G1-T<番号>: <説明>` とする。

| 記号 | 内容 |
| --- | --- |
| G1-T1 | `readTokenValues` に tokens.css 実物を入力し、ライトの `--md-sys-color-surface`・`primary-container`・`surface-container-lowest`・`on-primary-container` が取れる |
| G1-T2 | 同関数が、指定トークンの欠落・ブロックの欠落で例外を投げる |
| G1-T3 | `public/icons/` の4ファイルが存在し、先頭8バイトが PNG シグネチャ |
| G1-T4 | 各PNGの IHDR の幅・高さがファイル名どおり(192/512/512/180) |
| G1-T5 | `apple-touch-icon-180.png` の IHDR カラータイプが 2(RGB、アルファなし)。他3ファイルは 2 または 6 |
| G1-T6 | `public/favicon.svg` が、`assets-src/icon/icon.svg` のプレースホルダを解決した内容と一致する |
| G1-T7 | プレースホルダ解決関数が tokens.css のライト値に置換し、未知の役割名で例外を投げ、プレースホルダの無いSVGはそのまま返す |
| G1-T8 | `SEED`(`scripts/theme-seed.ts`)が `#` + 16進6桁で、`gen-theme-tokens.ts` が再 export する `SEED` と同一 |

- `check:icons`(再生成してバイト比較)は Vitest・CI では回さず、ローカルの受け入れ条件(G1-AC2)に固定する。理由: resvg の出力は同一環境では決定的だが、macOS と Linux(CI)の間で PNG のバイトが一致するかは未検証であり、CI で偽の失敗を出すおそれがあるため。CI では環境に依存しない構造の検査(G1-T3〜T6)だけを行う。

## 8. 受け入れ条件

前提: 各項目は `npm run build:wasm`(未ビルド時)→ `npm run build` 後の `dist/` で確認する(G-11)。

### 8.1 ビルド成果物・PR で確認する項目(16件)

- **G1-AC1** `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test`・`npm run check:theme` がすべて成功する。あわせて `npx tsc -p tsconfig.node.json --listFilesOnly | grep -E 'gen-icons.ts|theme-seed.ts'` が2件出る。
- **G1-AC2** `npm run icons:gen` を実行しても `git status --porcelain` に差分が出ない。`npm run check:icons` が終了コード0。ローカル(macOS)でのみ実行し、CIでは回さない(§7)。
- **G1-AC3** `dist/manifest.webmanifest` を `node -e` 等でJSONとして読み、次がすべて一致: `name`=「三麻点数計算機」、`short_name`=「三麻計算機」、`description`=§3.1 の文言、`lang`=`ja`、`display`=`standalone`、`start_url`=`scope`=`/mj-3player-calc/`、`orientation` キーが無い、`icons` に 192(any)・512(any)・512(maskable)の3件。
- **G1-AC4** manifest の `theme_color` が `scripts/theme-seed.ts` の `SEED` と一致し(大文字小文字は区別しない)、`background_color` が `src/ui/theme/tokens.css` の `:root` の `--md-sys-color-surface` と一致する。
- **G1-AC5** `grep -nE '#[0-9a-fA-F]{3,8}\b' vite.config.ts index.html` が0件(HEXの手書きが無い)。
- **G1-AC6** `dist/index.html` に次がある: `meta name="description"`(manifest と同文)、`meta name="theme-color"` がちょうど1件で `media` 属性が無く、値が `SEED` と一致、`link rel="apple-touch-icon" href="/mj-3player-calc/icons/apple-touch-icon-180.png"`、`link rel="icon" href="/mj-3player-calc/favicon.svg" type="image/svg+xml"`、`link rel="manifest" href="/mj-3player-calc/manifest.webmanifest"`、`script id="vite-plugin-pwa:register-sw"`。プレースホルダ(`%…%`)が残っていない。
- **G1-AC7** `dist/registerSW.js` が `register('/mj-3player-calc/sw.js', { scope: '/mj-3player-calc/' })` を含む。
- **G1-AC8** `dist/sw.js` の precache に、`assets/decomposer_bg-*.wasm` 1件、牌SVG 30件(`grep -oE 'url:"assets/[^"]+\.svg"' dist/sw.js | wc -l` が `ls dist/assets/*.svg | wc -l` と一致)、`favicon.svg`、`icons/icon-192.png`・`icons/icon-512.png`・`icons/icon-maskable-512.png`・`icons/apple-touch-icon-180.png`、`manifest.webmanifest`、`index.html` が載っている。ビルドログの `precache N entries` を記録する。
- **G1-AC9** `sips -g pixelWidth -g pixelHeight -g hasAlpha public/icons/*.png` で、寸法がファイル名どおり、`apple-touch-icon-180.png` の `hasAlpha` が `no`。
- **G1-AC10** `vite preview` で `/mj-3player-calc/` を開き、DevTools の Application > Manifest にエラー・警告(アイコン取得失敗、maskable 無し等)が出ない。Service Worker が `activated` で scope が `/mj-3player-calc/`。(G-02 の制約に従いプレビューサーバーは確認後に停止する)
- **G1-AC11** G1-AC10 の状態で DevTools の Network を Offline にして再読み込みし、画面が表示され、手牌入力→結果表示(WASM を使う向聴数表示)まで動く。
- **G1-AC12** 初回JS(09号)を実測し記録する。基準値 128,638 B(§2)、積算増分は約 0〜+100 B(manifest・アイコンは JS に入らない。`injectRegister: 'script'` は別ファイル。`vite.config.ts` の処理はビルド時のみ)、**目標値 128,738 B**。超過は不合格にしない。PR本文に、基準値・実測値・増分・積算した増分との差・超過した場合の超過量と原因を記載する(09号 必須事項7)。
- **G1-AC13** `docs/license-policy.md` に `@resvg/resvg-js` の名前・バージョン 2.6.2・ライセンス MPL-2.0・devDependency で配布物に含まれない旨が書かれている。`package.json` の版指定がキャレットなしの `2.6.2`。
- **G1-AC14** ホームディレクトリ名・絶対パスが変更ファイルに無い。`git status --porcelain` で未コミットの差分が無いことを確かめたうえで、`git diff main --name-only` の各ファイル(PNG を除く)に `grep -nE '/Users/|/home/'` を実行し、本設計書のこの行(検索パターン自体)を除いて0件。ヒットは目視で確認する。

- **G1-AC15** `CREDITS.md` の牌画像素材(FluffyStuff / riichi-mahjong-tiles、CC0 1.0)の「加工内容」に、`Regular/Pei.svg`(既存収録分を SVGO 最適化したもの)をアプリアイコン(仮)用に縮小・再配置した旨が追記されている。`assets-src/icon/icon.svg` と `icon-maskable.svg` に北の絵柄の出典コメントがある。
- **G1-AC16** (PR記載事項)PR本文に「仮アイコン。最終デザイン(点棒の逆三角形+3)は UI監修中にこの PR 内で差し替え」と明記されている(差し替え後は仮アイコンの記述を削除し、最終アイコンの権利・出典に更新する)。

### 8.2 実機確認(検収では未確認。6件)

G2(#109)は PR #115 でマージ済み。本Issueのマージ・デプロイ後、公開URL https://bluekurage119.github.io/mj-3player-calc/ で実機確認できる。検収の合否には含めず、PR本文に「未確認」と記す。

- Android Chrome でインストールでき、ホーム画面のアイコン(maskable の切り抜き)とラベル「三麻計算機」が崩れない。スプラッシュの地色。
- iOS Safari の「ホーム画面に追加」で 180px アイコンが表示され、黒背景にならない。standalone で起動する。
- 機内モードでの起動・計算。
- 新版デプロイ後、次回起動(または再読み込み)で新版に切り替わる(通知なし)。
- ステータスバーが、アプリのテーマ(ライト・ダーク)によらずシード色になる。
- 横向き表示の状態(対策はしないが、記録として)。

## 9. ユーザー判断事項

### 9.1 【確定】(ユーザー回答 2026-11-16、統括担当経由)

| Q | 論点 | 確定内容 |
| --- | --- | --- |
| Q1 | 色の規約解釈と方式 | manifest・meta は06号の対象外(解釈B)。ただし手書きHEXの二重管理を避け、正本から取得する(§4)。アイコン原画は(b)トークン名プレースホルダを `gen-icons.ts` が tokens.css から解決(§3.2) |
| Q2 | アプリ内テーマとの食い違い | ステータスバー色をシード色固定にしたため論点自体が解消(§3.3) |
| Q3 | 横向き | 何もしない(§3.5) |
| Q4 | description 文言 | 「三人麻雀の点数計算機。和了形・聴牌形の役と打点、向聴数と何切るを表示する」 |
| Q5 | 支給素材の形式 | SVG |
| Q6 | devDependency のライセンス記録 | `docs/license-policy.md` に記録。`CREDITS.md` には書かない(配布物に含まれないため) |
| Q7 | モックの扱い | コミットしない |
| — | アイコン意匠 | 製造段階は仮で C案「北牌」(設計承認時)。最終デザインは「点棒を逆三角形に組み数字の3を併記」で、UI監修中にこの PR 内で差し替え。A案は見送り、B案は不採用 |
| — | ステータスバー色 | シード色で固定。`meta theme-color` は1本、manifest `theme_color` も同値 |

### 9.2 設計承認時の確認事項

- 【確定】manifest の `background_color` は tokens.css ライトの `--md-sys-color-surface`(設計承認時)。ダーク端末ではスプラッシュが一瞬明るく見える点は承知のうえ。

## 10. 後続Issueへの引き継ぎ

- G2(#109、PR #115 でマージ済み。公開URL https://bluekurage119.github.io/mj-3player-calc/): manifest の `start_url`・`scope` と SW の scope は `base`(`/mj-3player-calc/`)に依存する。配信パスを変える場合は `base` と manifest を同時に変える。
- G3(#110): 実機確認(§8.2)はリリース前の受け入れ確認に含める。初回JSの基準値は本Issueのマージ後の実測値に更新する(09号8)。
- テーマの seed を変える場合は `scripts/theme-seed.ts` だけを変え、`npm run gen:theme` と `npm run icons:gen` を実行する(ステータスバー色・アイコン・tokens.css が追随する)。
- 新版通知UIは作らない決定(H1)。将来導入する場合は `registerType: 'prompt'` と `virtual:pwa-register/react` が必要になり、初回JSが増える。
