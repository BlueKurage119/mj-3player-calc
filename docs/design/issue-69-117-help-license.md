# Issue #69・#117 設計書: 第三者ライセンスのアプリ内表示(#69)と G4 ヘルプ画面(#117)

- 対象 Issue: #69(第三者ライセンスの配布物内表示)、#117(G4 ヘルプ画面。Epic G #8)
- 版: 第2版(2026-11-16。独立レビューの指摘〔ヘルプ文面の実挙動との照合、テスト方式、URL・著作権表記の確定、タップ領域〕と6章の確定を反映)
- 基準: `origin/main` e93d239(PR #116 マージ後)
- 製造・PR: **#69 と #117 で別**。#69 を先に製造・検収・マージし、#117 は #69 マージ後の main から切る(4章)
- 範囲外: `vite.config.ts`・`public/`・`index.html`(G1 #108 が作業中のため触らない。3.9)、プリセット・本場・供託など v2 機能の説明、チュートリアル、動画

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- `AGENTS.md`、`docs/rules/02-design-protocol.md`・`06-ui-md3-protocol.md`・`07-mahjong-rule-protocol.md`・`09-bundle-budget-protocol.md`、`docs/rules/advisory/G-01`・`G-09`・`G-10`
- Issue #69・#117 本文、`docs/requirements.md` §3.7・§4、`docs/issues-draft.md` の G4・#69
- `CREDITS.md`、`LICENSE`、`LICENSES/Apache-2.0.txt`、`docs/license-policy.md`、`docs/mahjong-rules.md`
- コード: `src/ui/App.tsx`、`src/ui/state/app-state.ts`、`src/ui/screen/AppHeader.tsx`・`SettingsScreen.tsx`・`ScoringTableScreen.tsx`、`src/ui/settings/rule-help.ts`、`src/core/rule-items.ts`、`src/ui/input/tenkey-logic.ts`・`use-tenkey-keyboard.ts`、`src/ui/result/classify.ts`、`src/ui/expressive/Disclosure.tsx`、`src/ui/md/Button.tsx`、`wasm/decomposer/Cargo.toml`
- 設計書: `issue-89-tile-tap.md`(結果欄の牌タップ)、`issue-102-share-image.md`(共有)、`issue-101-scoring-table.md`

### 1.2 確定事項(ユーザー承認済み。再検討しない)

| # | 内容 | 反映先 |
| --- | --- | --- |
| 1 | 設計書は1本。製造・PR は #69 と #117 で別。#69 を先にマージ | 4章 |
| 2 | ライセンスはメニュー項目にしない。#69 の入口は設定画面の最下部のリンク。#117 でメニューに「ヘルプ」を追加し(`AppHeader.tsx`、`Screen` 型、lazy)、ヘルプ画面内にライセンス画面へのリンクを足す。設定のリンクとは併存(6章 Q1 確定) | 2.3・3.4・6章 |
| 3 | ライセンス全文は画面内に表示し、遅延チャンクに入れる。`public/`・`vite.config.ts` は触らない | 2.4・2.6 |
| 4 | 配布物に入る依存(本番バンドル・WASM)を実測して列挙し、`CREDITS.md` の追記範囲を設計に含める(配布物に入るものだけ) | 1.3・2.7 |
| 5 | ヘルプにキーボード操作の説明を入れる | 3.3 節2 |
| 6 | ヘルプ・ライセンス画面の文面は監修対象。全文を本書に載せる。UI モックの構成を明示する | 2.5・3.3・5章 |

### 1.3 実測(2026-11-16。main e93d239 を作業用の一時ディレクトリに展開し、`vite build` で計測。一時ディレクトリはリポジトリ外で、終了後に不要)

**初回 JS(09号の計測方法)**: `dist/index.html` の `<script type="module" src>` は `assets/index-zUoIrMB0.js` の1本(`modulepreload` なし)。`gzip -9 -c | wc -c` = **128,640 B**。統括の申告値と一致。09号の「現在の基準値」125,908 B は古い(E4 後〜H2 #102 までの増分が未反映)。本書の基準値は 128,640 B とする。

参考(遅延チャンク、gzip -9 ではなく vite 表示の gzip): `SettingsScreen-*.js` 14.74 kB、`ScoringTableScreen-*.js` 1.74 kB、`share-module-*.js` 12.18 kB、`HoraDetail-*.js` 5.94 kB、WASM `decomposer_bg-*.wasm` 68.82 kB(生)。

**プローブ**(同じ一時ディレクトリで、ダミーの `LicenseScreen.tsx` を `lazy()` で追加。Apache-2.0 全文と `LICENSE` を `?raw` で取り込み、20件の項目と `Disclosure` 2つを描画):

| 計測 | 値 |
| --- | --- |
| 初回 JS | 128,726 B(+86 B。`lazy()` の1行と、tree-shaking 回避の仮コードを含む) |
| 遅延チャンク `LicenseScreen-*.js`(gzip -9) | 4,912 B(生 13.26 kB) |
| `LICENSES/Apache-2.0.txt` 単体 | 生 11,357 B / gzip -9 3,982 B |

**配布物に入る第三者コード**(本番ビルドを `--sourcemap` で作り、全 `.js.map` の `sources` から `node_modules` のパッケージを抽出。`dist/` の非 JS 成果物は目視):

| 区分 | パッケージ(版) | ライセンス | 上流の著作権表示 |
| --- | --- | --- | --- |
| JS | react 19.3.1・react-dom 19.3.1・scheduler 0.28.0 | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| JS | @material/web 2.5.0 | Apache-2.0 | Copyright 2018-2023 Google, Inc. |
| JS | lit-html 3.3.3・lit-element 4.2.2・@lit/reactive-element 2.1.2 | BSD-3-Clause | Copyright (c) 2017 Google LLC. All rights reserved. |
| JS | tslib 2.9.1 | 0BSD | Copyright (c) Microsoft Corporation.(0BSD は表示義務なし) |
| JS | uqr 0.1.2 | MIT | Copyright (c) Project Nayuki / Copyright (c) 2023 Anthony Fu |
| JS(ビルド時に注入される小さな補助コード) | vite 6.4.4(preload 補助)、vite-plugin-wasm 3.6.0(WASM 読み込み補助) | MIT | Copyright (c) 2019-present, VoidZero Inc. and Vite contributors / Copyright (c) 2022 Menci |
| `sw.js`・`workbox-*.js`・`registerSW.js` | workbox 7.4 系(core・precaching・routing)、vite-plugin-pwa 0.21.2 | MIT | Copyright 2018 Google LLC / Copyright (c) 2020-PRESENT Anthony Fu |
| WASM | decomposer(livewing/mahjong-calc) | MIT | Copyright 2021 livewing.net(既存) |
| WASM | Rust 標準ライブラリ(std・core・alloc。内部の hashbrown・dlmalloc を含む) | MIT OR Apache-2.0 | 上流の COPYRIGHT は「各貢献者に帰属」 |
| WASM | wasm-bindgen・js-sys | MIT OR Apache-2.0 | Copyright (c) 2014 Alex Crichton |
| WASM | serde(同一リポジトリの serde_core を含む) | MIT OR Apache-2.0 | 上流の LICENSE-MIT に記名なし |
| WASM | serde-wasm-bindgen 0.4.5 | MIT | Copyright (c) 2019 Cloudflare, Inc. |
| WASM | itertools 0.10.5・either | MIT OR Apache-2.0 | Copyright (c) 2015(記名なし) |
| 素材 | 牌画像(FluffyStuff)、牌の下地・裏(livewing)、Material Symbols | CC0 / MIT / Apache-2.0 | 既存の `CREDITS.md` のとおり |

- WASM の根拠: リポジトリ内の `wasm/decomposer/pkg/decomposer_bg.wasm`(68,821 B)の文字列に `serde-wasm-bindgen-0.4.5/src`・`js-sys-0.3.106/src`・`itertools-0.10.5/src`・`hashbrown-0.17.1/src`・`dlmalloc-0.2.14/src`・`library/std|core|alloc` の panic 位置が残っていた。wasm-bindgen(グルーと実行時の補助)・serde(serde-wasm-bindgen の依存)・either(itertools の依存)は依存関係から含めた。**それぞれが WASM に実際にリンクされているかの機械的な確認はしていない(実挙動未確認)**。リンクされていなくても、掲載は過剰になるだけで義務違反にはならない。
- `cargo tree` の proc-macro(serde_derive・wasm-bindgen-macro・syn・quote・proc-macro2・unicode-ident)はビルド時だけ使い、WASM に入らないので載せない。futures-*・slab・serde_json・zmij・itoa・memchr・bumpalo・cfg-if は `cargo tree` に出るが、上記の文字列に痕跡がなく、ビルド時の依存か未使用と判断して載せない(実挙動未確認。残留リスク 7章)。
- **`wasm/decomposer/Cargo.lock` はリポジトリに無い**。crate の版はビルドのたびに変わりうるため、Rust crate の版は画面・`CREDITS.md` に書かない。
- `@material/material-color-utilities` は `npm run gen:theme` でのみ使い、配布物に入らない(sourcemap に無い)。フォントの同梱・`public/` は無い。

## 2. #69 第三者ライセンスの表示(先行 PR)

### 2.1 方式の要点

- 新しい画面 `license` を追加する。設定画面の最下部にリンク(テキストボタン)を置き、押すとライセンス画面に遷移する。
- 画面は遅延チャンク。ライセンス全文は `LICENSES/*.txt` と `LICENSE` を Vite の `?raw` で取り込み、同じ遅延チャンクに入れる(`public/`・`vite.config.ts` は変更しない)。
- 掲載内容は1つのデータ定義(`license-data.ts`)にまとめ、画面と単体テストが同じデータを見る。

### 2.2 ファイル構成

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/state/app-state.ts` | 変更 | `Screen` に `'license'` を追加。`returnScreen`(2.3) |
| `src/ui/App.tsx` | 変更 | `const LicenseScreen = lazy(() => import('./screen/LicenseScreen'))` と `screen === 'license'` の分岐(既存の settings と同じ形) |
| `src/ui/screen/SettingsScreen.tsx` | 変更 | 最下部にリンク(2.3) |
| `src/ui/screen/LicenseScreen.tsx` | 新規 | 画面本体(`export default`)。描画本体は props だけで描く `LicenseView` に分け、テスト可能にする(`ScoringTableView` と同じ流儀) |
| `src/ui/license/license-data.ts` | 新規 | 掲載データ(2.5)。全文テキストの `?raw` import もここに置く |
| `src/ui/license/license.css` | 新規 | 画面のスタイル(トークンのみ) |
| `src/ui/license/license-data.test.ts`・`src/ui/screen/LicenseScreen.test.tsx` | 新規 | 2.8 |
| `LICENSES/MIT.txt` | 新規 | MIT の許諾文(著作権行を含まない本文。SPDX の MIT 本文)。各項目の著作権行と組み合わせて表示する |
| `LICENSES/BSD-3-Clause.txt` | 新規 | lit の `LICENSE` をそのまま複製(著作権行 `Copyright (c) 2017 Google LLC. All rights reserved.` を含む) |
| `CREDITS.md` | 変更 | 2.7 |
| `src/ui/settings/settings.css` | 変更 | 「ライセンス」ボタンの `min-height: 3rem`(2.4) |
| `src/ui/state/app-state.test.ts` | 変更 | D1-7(161行付近の `AppState` 型リテラル)と D1-9(254行付近の `createInitialState` の完全一致)に `returnScreen: 'main'` を追従。navigate のテストを追加(2.8) |
| `docs/design/issue-69-117-help-license.md` | 変更可 | 本設計書(製造時の事後注記がある場合) |

- `?raw` の型は `tsconfig.app.json` の `"types": ["vite/client"]` で解決する(プローブでビルド成功を確認。`npm run typecheck` は未実行)。`src/` 外の `LICENSES/` を相対パスで import する。
- `license-data.ts` を `src/ui/license/` に置くのは、画面(`screen/`)と分け、#117 のヘルプからも参照できるようにするため。

### 2.3 状態と遷移

```ts
export type Screen = 'main' | 'settings' | 'scoring-table' | 'license'; // #117 で 'help' を追加
// AppState に追加
returnScreen: Screen; // ライセンス画面の「戻る」の行き先。初期値 'main'
// AppAction の navigate を拡張(既存の呼び出しは変更不要)
| { type: 'navigate'; screen: Screen; returnTo?: Screen }
```

- reducer: `navigate` で `returnTo` があれば `returnScreen` に保存する。無ければ `returnScreen` は変えない。同一画面への navigate は従来どおり state をそのまま返す。
- 設定画面のリンク: `dispatch({ type: 'navigate', screen: 'license', returnTo: 'settings' })`。
- ライセンス画面の戻るボタン: `dispatch({ type: 'navigate', screen: state.returnScreen })`。
- 設定画面に戻ったときのスクロール位置は先頭に戻る(既存の画面切替と同じ。保持しない)。
- `returnScreen` は永続化しない。

設定画面のリンクの配置: `RuleSection` の後に `<Divider />` を挟み、`<Button variant="text">ライセンス</Button>` を1つ置く(`src/ui/md` のラッパー経由)。左寄せ、上下余白は `--md-sys-*` のトークン。説明文は付けない(06号「見ればわかるラベルは省略」)。

### 2.4 画面構成(UI 監修対象)

```
┌───────────────────────────────┐
│ ←  ライセンス                   │  ← 設定画面と同じ app-header(戻る+タイトル)
├───────────────────────────────┤
│ 三麻点数計算機                   │  ← 節見出し(titleSmall)
│  MIT License                    │
│  Copyright (c) 2026 BlueKurage119│
│  Copyright 2021 livewing.net     │
│ ─────────────────────────────── │
│ 素材                             │  ← 節見出し
│  牌画像 …(1項目=名称・ライセンス・著作権・URL)│
│ ─────────────────────────────── │
│ ライブラリ                        │
│  React / Material Web / Lit / … │
│ ─────────────────────────────── │
│ 手牌分解器(WASM)                │
│  …                              │
│ ─────────────────────────────── │
│ ライセンス全文                     │
│  ▸ MIT License                  │  ← Disclosure。既定は閉じる
│  ▸ Apache License 2.0           │
│  ▸ BSD 3-Clause License         │
└───────────────────────────────┘
```

- 節見出しは計5つ(`CREDIT_GROUPS` の4節+「ライセンス全文」)。第1節「三麻点数計算機」は見出しのみで、項目の名称行を出さない(`name` 省略。2.6)。
- タップ領域(要件§4): `disclosure.css` は変更せず、`license.css` で `.license-screen .disclosure` の summary に `min-height: 3rem`、Disclosure を並べる容器に `gap: 0.5rem` を指定する。設定画面の「ライセンス」ボタンも `min-height: 3rem` 以上とし、この規則は `SettingsScreen.tsx` が読み込む `src/ui/settings/settings.css` に1規則追加する(2.2 の表に記載)。
- 1項目の表示: 1行目に名称(bodyLarge)、2行目にライセンス名、3行目以降に著作権表示(bodySmall、`--md-sys-color-on-surface-variant`)、最後に URL(リンク。`target="_blank" rel="noopener noreferrer"`、`--md-sys-color-primary`)。URL は文字列をそのまま表示する(オフライン時にも出典が読めるように)。
- 全文は `<pre>`(`white-space: pre-wrap`、`overflow-wrap: anywhere`。375px 幅で横スクロールを出さない)。フォントは `--md-sys-typescale-body-small-*`。等幅にしない。
- 色・形状・余白はトークンのみ(06号)。新しい Material Web 部品は使わない(`IconButton`・`Button`・`Divider`、自作の `Disclosure` のみ)。

### 2.5 掲載文面(確定案。監修対象)

画面の文言は次の全文とする。英語のライセンス名・著作権行は原文のまま。

**表の文字列は確定値であり、製造担当は上流と再照合せず、そのままハードコードする。**(URL は設計時に `node_modules/*/package.json` の `repository`・`Cargo.toml` の `repository` と照合済み。React は `repository` が `github.com/react/react` で、統括が `gh api` で実在を確認済み)

**節「三麻点数計算機」**(見出しのみ。項目の名称行なし)
- MIT License
- Copyright (c) 2026 BlueKurage119
- Copyright 2021 livewing.net
- https://github.com/BlueKurage119/mj-3player-calc(`git remote` の origin)

**節「素材」**

| 名称 | ライセンス | 著作権表示 | URL |
| --- | --- | --- | --- |
| 牌画像(FluffyStuff/riichi-mahjong-tiles) | CC0 1.0 Universal | (なし) | https://github.com/FluffyStuff/riichi-mahjong-tiles |
| 牌の下地・裏(livewing/mahjong-calc) | MIT License | Copyright 2021 livewing.net | https://github.com/livewing/mahjong-calc |
| Material Symbols | Apache License 2.0 | Copyright Google LLC (6章 Q3 確定) | https://github.com/google/material-design-icons |

**節「ライブラリ」**

| 名称 | ライセンス | 著作権表示 | URL |
| --- | --- | --- | --- |
| React(react・react-dom・scheduler) | MIT License | Copyright (c) Meta Platforms, Inc. and affiliates. | https://github.com/react/react |
| Material Web(@material/web) | Apache License 2.0 | Copyright 2018-2023 Google, Inc. | https://github.com/material-components/material-web |
| Lit(lit-html・lit-element・@lit/reactive-element) | BSD 3-Clause License | Copyright (c) 2017 Google LLC. All rights reserved. | https://github.com/lit/lit |
| tslib | 0BSD | Copyright (c) Microsoft Corporation. | https://github.com/Microsoft/tslib |
| uqr | MIT License | Copyright (c) Project Nayuki / Copyright (c) 2023 Anthony Fu | https://github.com/unjs/uqr |
| Vite | MIT License | Copyright (c) 2019-present, VoidZero Inc. and Vite contributors | https://github.com/vitejs/vite |
| vite-plugin-wasm | MIT License | Copyright (c) 2022 Menci | https://github.com/Menci/vite-plugin-wasm |
| vite-plugin-pwa | MIT License | Copyright (c) 2020-PRESENT Anthony Fu | https://github.com/vite-pwa/vite-plugin-pwa |
| Workbox | MIT License | Copyright 2018 Google LLC | https://github.com/googlechrome/workbox |

**節「手牌分解器(WASM)」**

| 名称 | ライセンス | 著作権表示 | URL |
| --- | --- | --- | --- |
| decomposer(livewing/mahjong-calc) | MIT License | Copyright 2021 livewing.net | https://github.com/livewing/mahjong-calc |
| Rust 標準ライブラリ | MIT License(MIT OR Apache-2.0 から選択) | Copyrights in the Rust Standard Library are retained by their contributors. | https://github.com/rust-lang/rust |
| wasm-bindgen・js-sys(js-sys は wasm-bindgen と同じリポジトリで管理されるため1項目にまとめる) | MIT License(同上) | Copyright (c) 2014 Alex Crichton | https://github.com/wasm-bindgen/wasm-bindgen |
| serde | MIT License(同上) | (上流に記名なし) | https://github.com/serde-rs/serde |
| serde-wasm-bindgen | MIT License | Copyright (c) 2019 Cloudflare, Inc. | https://github.com/cloudflare/serde-wasm-bindgen |
| itertools | MIT License(同上) | Copyright (c) 2015 | https://github.com/rust-itertools/itertools |
| either | MIT License(同上) | Copyright (c) 2015 | https://github.com/rayon-rs/either |

- 「(同上)」は画面では「MIT License(MIT OR Apache-2.0 から選択)」と毎回書く。著作権表示が「(なし)」「(上流に記名なし)」の項目は、その行を画面に出さない。
- Rust 標準ライブラリの著作権表示は、設計時にローカルの Rust ツールチェーン(stable)同梱の `COPYRIGHT-library` の原文の1文をそのまま採った(確定値)。
- URL は `package.json`/`Cargo.toml` の `repository` の値から `git+`・`.git` を除いたもの(大文字小文字も原文どおり)。

**節「ライセンス全文」**: 見出しは「ライセンス全文」、Disclosure の summary は「MIT License」「Apache License 2.0」「BSD 3-Clause License」。中身は `LICENSE`(本アプリ。MIT の許諾文を含む)ではなく `LICENSES/MIT.txt`(許諾文のみ)・`LICENSES/Apache-2.0.txt`・`LICENSES/BSD-3-Clause.txt` を表示する。MIT の Disclosure の先頭には「各項目の著作権表示と、次の許諾文が適用されます。」の1文を置く(監修対象)。CC0・0BSD は全文を載せない(表示義務がないため)。

### 2.6 データ定義

```ts
// src/ui/license/license-data.ts
import apacheText from '../../../LICENSES/Apache-2.0.txt?raw';
import bsd3Text from '../../../LICENSES/BSD-3-Clause.txt?raw';
import mitText from '../../../LICENSES/MIT.txt?raw';

export type LicenseId = 'MIT' | 'Apache-2.0' | 'BSD-3-Clause' | '0BSD' | 'CC0-1.0' | 'MIT-dual';
export interface CreditEntry {
  name?: string;           // 2.5 の「名称」。第1節「三麻点数計算機」の唯一の項目だけ省略(見出しのみ)
  license: LicenseId;      // 'MIT-dual' は「MIT License(MIT OR Apache-2.0 から選択)」と表示
  copyrights: readonly string[]; // 空配列なら行を出さない
  url: string;
}
export interface CreditGroup { title: string; entries: readonly CreditEntry[] }
export const CREDIT_GROUPS: readonly CreditGroup[];      // 2.5 の4節(順序も 2.5 のとおり)
export const LICENSE_LABELS: Record<LicenseId, string>;  // 表示名
export const LICENSE_TEXTS: readonly { id: 'MIT' | 'Apache-2.0' | 'BSD-3-Clause'; title: string; text: string }[];
```

`license-data.ts` は `LicenseScreen` からのみ import する(#117 のヘルプは画面遷移だけで、データを import しない)。これにより全文テキストは初回 JS に入らない。

### 2.7 `CREDITS.md` の追記範囲

既存の4節(牌画像、牌の下地・裏、Material Symbols、`@material/web`)は変えない。次を追記する。

1. 冒頭の説明の直後に1文: 「アプリ内の『設定 → ライセンス』でも同じ内容を表示しています。」(#117 後もこの導線は残る。6章 Q1 確定)
2. 節「配布物に含まれるライブラリ(JavaScript)」: React、Lit、tslib、uqr、Vite・vite-plugin-wasm の補助コード、vite-plugin-pwa・Workbox。各項目に提供元 URL・ライセンス・著作権表示・版(npm のもの。Rust は版を書かない)。2.5 の表と同じ内容。
3. 節「配布物に含まれる Rust crate(手牌分解器 WASM)」: 2.5 の「手牌分解器(WASM)」節と同じ内容。デュアルライセンスは MIT を選択したこと、`Cargo.lock` を管理していないため版を固定していないことを書く。
4. `LICENSES/MIT.txt`・`LICENSES/BSD-3-Clause.txt` を追加したことを、Lit・MIT の項に「全文は `LICENSES/…` を参照」として書く。

`docs/license-policy.md` は変更しない(#69 の範囲外。後続 7章)。

### 2.8 テスト(製造担当が追加)

テスト名は05号の `<Issue記号>-<記号と番号>: <説明>` に従う。**Issue記号は #69 を `G3L`、#117 を `G4` と定義する**(#69 は issues-draft で G3 の関連として扱われるため)。本リポジトリに jsdom・Testing Library は無く、既存の画面テストは `renderToStaticMarkup` による HTML の検査である。ボタン押下・開閉のイベントは単体テストで検証せず、受け入れ条件の実操作(L-6〜L-8)で確認する。`Disclosure` は閉じていても本文を HTML に出力する点に注意し、「閉じている」ことは HTML の文字列では判定しない。

| 名前 | ファイル | 内容 |
| --- | --- | --- |
| `G3L-T1` | `license-data.test.ts` | `CREDIT_GROUPS.map(g => g.title)` が `['三麻点数計算機','素材','ライブラリ','手牌分解器(WASM)']` と完全一致 |
| `G3L-T2` | 同 | 第1節を除く全項目の `name` の配列が 2.5 の表の名称列と完全一致し、各 `url` が `https://` で始まる。第1節の唯一の項目は `name` が `undefined` |
| `G3L-T3` | 同 | `LICENSE_TEXTS` の `id` が `['MIT','Apache-2.0','BSD-3-Clause']`。各 `text` が対応する `LICENSES/*.txt` の内容(`fs.readFileSync`)と完全一致 |
| `G3L-T4` | `LicenseScreen.test.tsx` | `renderToStaticMarkup(<LicenseView onBack={() => {}} />)` に、タイトル「ライセンス」、節見出し5つ(4節+「ライセンス全文」)、summary 3つ、2.5 の全著作権行が含まれる(HTML 全体との完全一致は脆いため部分一致。05号どおり直前に日本語コメントで理由を書く) |
| `G3L-T5` | `app-state.test.ts` | `createInitialState` の `returnScreen` が `'main'`。`navigate` に `returnTo: 'settings'` を付けると `screen: 'license'`・`returnScreen: 'settings'`。続けて `returnTo` なしの navigate では `returnScreen` が変わらない |
| (既存の追従) | `app-state.test.ts` | D1-7 の型リテラルと D1-9 の初期値の完全一致に `returnScreen: 'main'` を追加 |

### 2.9 バンドル積算(#69)

| 内訳 | 初回 JS 増分の見込み | 根拠 |
| --- | --- | --- |
| `lazy()` 1行・`screen === 'license'` の分岐 | +60〜90 B | プローブ +86 B(仮コード込み) |
| reducer の `returnTo`・`returnScreen` | +30〜50 B | 数行の追加 |
| 設定画面のリンク | 0 B | `SettingsScreen` は遅延チャンク |
| 合計 | **約 +150 B**(G-09 の余裕を見て上限目安 +300 B) | |

- **目標値: 128,640 + 300 = 128,940 B 以下**(目標値。超過で不合格にしない。09号)。
- 遅延チャンク `LicenseScreen-*.js`: プローブ 4,912 B(Apache+MIT 全文・20項目)。BSD-3(約 1.5 KB 生)と CSS・`LicenseView` の実装分を足し、**約 6〜8 KB(gzip -9)** を見込む。超過しても不合格にしないが、実測を記録する。
- `Disclosure` は現在 `HoraDetail` のみが使う。`LicenseScreen` からも import すると、Rollup が共有チャンクに切り出すことがあり得る(初回 JS には入らない見込み。実挙動未確認)。検収で初回 JS の構成ファイルが `index-*.js` 1本のままかを確認する。

### 2.10 #69 の受け入れ条件

| # | 実行すること | 合格の条件 |
| --- | --- | --- |
| L-1 | `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` | すべてエラーなし。2.8 のテストが含まれ通過 |
| L-2 | `git diff --name-only origin/main...HEAD` | `vite.config.ts`・`public/`・`index.html`・`package.json`・`package-lock.json` が含まれない。変更は 2.2 の表のファイル(`app-state.test.ts` と本設計書を含む)に限る |
| L-3 | `npm run build` 後、09号の方法で初回 JS を測る | 実測値・基準値 128,640 B との差・積算(+150 B)との差を PR 本文に記録。`dist/index.html` の初回 JS が `index-*.js` 1本で、`modulepreload` が増えていない |
| L-4 | `grep -l "Apache License" dist/assets/*.js` と `grep -l "Redistribution and use" dist/assets/*.js` | どちらも `LicenseScreen-*.js`(または #69 で新たに生じた遅延チャンク)だけがヒットし、`index-*.js` はヒットしない。`LicenseScreen-*.js` の gzip -9 サイズを PR に記録 |
| L-5 | `npm run dev`、375px 幅で メニュー → 設定 → 最下部までスクロール | 最下部に Divider とテキストボタン「ライセンス」がある。説明文はない |
| L-6 | L-5 のボタンを押す | ライセンス画面に遷移し、ヘッダーに戻るボタンと「ライセンス」。2.5 の4節が 2.5 の順で並び、各項目の名称・ライセンス名・著作権表示・URL が 2.5 の表と一字一句一致(「(なし)」等の行は出ない) |
| L-7 | L-6 の画面で戻るボタンを押す | 設定画面に戻る(メイン画面ではない) |
| L-8 | ライセンス画面の Disclosure 3つを順に開く | MIT は 2.5 の前置き1文+MIT 許諾文、Apache は `LICENSES/Apache-2.0.txt` の全文、BSD は Lit の LICENSE 全文が出る。375px 幅で横スクロールが出ない(`document.documentElement.scrollWidth <= 375`) |
| L-9 | ライセンス画面の任意の URL を押す | 新しいタブで開く(`target="_blank"`、`rel` に `noopener`) |
| L-10 | ライト・ダーク(設定のテーマ)を切り替えてライセンス画面を見る | 文字・背景がトークンで切り替わる。`grep -nE "#[0-9a-fA-F]{3,8}\b" src/ui/license/license.css` がヒットしない |
| L-11 | `grep -rn "<md-" src/ui/license src/ui/screen/LicenseScreen.tsx` | ヒットしない(06号: ラッパー経由) |
| L-12 | `npm run build && npx vite preview` で L-5〜L-8 を再確認 | 本番ビルドでも同じ表示(メモリ「UI検証は本番ビルドでも」) |
| L-13 | `CREDITS.md` を読む | 2.7 の1〜4が追記され、既存4節が変わっていない(`git diff origin/main -- CREDITS.md` が追記のみ) |
| L-14 | ホームディレクトリ名・絶対パスの検査(`git diff origin/main` の追加行を目視) | 含まれない |
| L-16 | 375px 幅で DevTools により要素の大きさを測る(`getBoundingClientRect()`) | ライセンス画面の各 Disclosure の summary の高さ 48px 以上・間隔 8px 以上、設定画面の「ライセンス」ボタンの高さ 48px 以上 |
| L-15 | UI 監修(dev と本番ビルド) | ユーザーの承認を得る |

## 3. #117 G4 ヘルプ画面(後続 PR)

### 3.1 方式の要点

- ヘッダーのメニューに「ヘルプ」を追加し、新しい画面 `help` に遷移する(遅延チャンク)。
- 4つの節を `Disclosure`(折りたたみ。既定は全部閉じる)で並べ、最後にライセンス画面へのリンクを置く。
- 文面は `HelpScreen.tsx` に JSX で直接書く(表・キー表記を含むため。文字列定数に分けない)。設定ラベル・ツモ損の説明は、ずれを防ぐため `RULE_ITEMS` と `TSUMO_LOSS_DESCRIPTIONS` から引く(3.3 の該当箇所に注記)。

### 3.2 ファイル構成

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/state/app-state.ts` | 変更 | `Screen` に `'help'` |
| `src/ui/App.tsx` | 変更 | `const HelpScreen = lazy(() => import('./screen/HelpScreen'))` と分岐 |
| `src/ui/screen/AppHeader.tsx` | 変更 | `HeaderMenuItemId` に `'help'`、`HEADER_MENU_ENTRIES` の「点数計算表」の直後に `{ type: 'item', id: 'help', label: 'ヘルプ' }`、`HEADER_MENU_ACTIONS.help = { type: 'navigate', screen: 'help' }` |
| `src/ui/screen/HelpScreen.tsx` | 新規 | 画面本体(`export default`)と、props だけで描く `HelpView`(`onBack`・`onOpenLicense`) |
| `src/ui/help/help.css` | 新規 | スタイル(トークンのみ) |
| `src/ui/screen/HelpScreen.test.tsx`・`AppHeader.test.tsx`(追記) | 新規・変更 | 3.6 |
| `docs/design/issue-69-117-help-license.md` | 変更可 | 本設計書(監修で文面が変わった場合の 3.3 の改訂) |

- ヘルプ画面のライセンスリンク: `dispatch({ type: 'navigate', screen: 'license', returnTo: 'help' })`。ライセンス画面の戻るでヘルプに戻る(2.3 の仕組みをそのまま使う)。
- ヘルプ画面の戻る: `navigate` で `'main'`。
- `HelpScreen` は `license-data.ts` を import しない(全文を引き込まないため)。

### 3.3 文面(確定案。監修対象)

画面タイトル「ヘルプ」。各節の見出しは Disclosure の summary。〔 〕内は製造担当への注記で、画面には出さない。

#### 節1「結果の見方」

> 入力中の手牌に応じて、結果の表示が切り替わります。副露した牌も枚数に含めます。
>
> - **和了の形(14枚)**: 役・飜・符・点数を、ロンとツモの両方について表示します。手牌の最後の牌を和了牌とします。
> - **聴牌(13枚)**: 和了牌ごとに、役と点数をロンとツモの両方について表示します。
> - **聴牌でない13枚**: 向聴数と、有効牌の種類・残り枚数を表示します。
> - **和了の形でない14枚**: 何切るとして、切る牌ごとに向聴数と受け入れを表示します。
> - **13枚に満たないとき**: 途中の形のまま表示します。点数は出ません。
>   - 13枚と同じく1枚待ちの枚数(10・7・4・1枚): 聴牌なら待ち牌を、聴牌でなければ向聴数と有効牌を表示します。
>   - 14枚と同じく1枚多い枚数(11・8・5・2枚): 和了の形なら案内を、和了の形でなければ何切るを表示します。
>   - それ以外の枚数(12・9・6・3枚): 何も表示しません。
>
> 待ち牌・有効牌の一覧(和了の点数が出ない聴牌と、向聴)では、牌をタップするとその牌をツモします。何切るでは、各候補の先頭の「打」の牌をタップするとその牌を切ります。
>
> 役がドラ(赤ドラ・抜きドラ・裏ドラを含む)と一発だけのときは、和了になりません(「役なし」と表示します)。
>
> 「符 ○・基本点 ○」の行を開くと、符の内訳を確認できます(国士無双・十三不塔では出ません)。
>
> ツモの点数の支払い方は、設定の「ツモ損」に従います。

〔出典: `classify.ts` の分類、`core/result.ts`(手牌枚数 `% 3` が 0 なら `null`、1 なら聴牌/向聴、2 なら和了/何切る)、`slots.tsx` の `JustHoraBody`(案内「和了です。牌をすべて入力して点数を計算します。」)、`issue-89-tile-tap.md` 確定事項1・3・7(タップできるのは `TempaiBody`・`ShantenBody` の待ち牌・有効牌と `DiscardBody` の打牌候補のみ。13枚聴牌の `HoraBody` の和了牌、何切る一覧内の待ち・受け入れ牌は不可)、`HoraItem.tsx` 31行(`FuBreakdown` は面子手・七対子のみ)、`mahjong-rules.md` §4.0【確定】。「ツモ損」は `RULE_ITEMS` の `tsumoLoss.label` から引く〕

#### 節2「入力のしかた」

> 手牌・ドラ・裏ドラ・副露のカードをタップすると、画面の下に入力パネルが開きます。入力方式は「パレット」と「テンキー」を切り替えられます。切り替えても、入力中の牌は消えません。
>
> - 萬子は1と9だけを入力できます。同じ牌は5枚以上入力できません(赤牌を含めて数えます)。
> - 手牌の牌をタップすると選択され、もう一度タップすると削除されます。
> - 裏ドラは、立直(ダブル立直・オープン立直を含む)のときだけ数えます。
> - 場風・自風は、画面上部のボタンで切り替えます。自風が東のときが親です。
> - 立直・一発などは、「状況役」のカードで指定します。
> - 抜き北の枚数は、設定の「北の扱い」が「抜きドラ」のときに指定できます。
> - メニューの「ランダム14枚」「ランダム清一色」で、手牌を作り直せます。
>
> **テンキーの入力**
>
> 数字を打ってから、萬子・筒子・索子・字牌のキーで確定します(例: 「123」→ 筒子 で 1筒2筒3筒)。字牌の数字は 1=東、2=南、3=西、4=北、5=白、6=發、7=中です。0 は赤5です。
>
> **キーボードの操作**(入力パネルが開いているとき)
>
> | キー | 操作 |
> | --- | --- |
> | 0〜9 | 数字を入力 |
> | M・P・S・Z | 萬子・筒子・索子・字牌で確定 |
> | Backspace | 数字を1文字消す。数字がないときは牌を1枚消す |
> | Enter | 入力パネルを閉じる |
>
> パレットの入力方式でも同じキーが使えます。

〔出典: 要件 §3.1【確定】、`MainScreen.tsx` の `WindSegment`(場風・自風)、`SituationCard.tsx` 46行(カード名「状況役」。立直・偶然役のシートを開く)、`tenkey-logic.ts`(`mapTenkeyKey`・`TENKEY_HONOR_HINTS`)、`app-state.ts` の `tenkey-backspace`・`tenkey-commit`、`use-tenkey-keyboard.ts`。「北の扱い」「抜きドラ」は `RULE_ITEMS` から引く。キーは大文字・小文字どちらも効く(`toLowerCase`)が、表記は大文字にする。Ctrl・Alt 等との同時押しと変換中の入力は無視される仕様だが、文面には書かない。副露パネルでの数字キーの挙動・「ランダム」が作り直す範囲(副露・ドラ等を消す)は H-8 で実挙動と照合する〕

#### 節3「三麻のルール上の注意」

> 三人麻雀では、萬子は 1萬と9萬だけを使います(全108枚)。萬子のドラ表示牌は、1萬ならドラは9萬、9萬ならドラは1萬です。萬子では順子を作れないため、三色同順は成立しません。
>
> **ツモ損**
>
> 三人麻雀のツモでは、四人麻雀の北家にあたる支払いがありません。その扱いを設定の「ツモ損」で選びます。
>
> - ツモ損あり: 通常どおり計算し、北家の負担分は誰も払わない
> - 北家分折半: 北家の負担額を、ツモられた2人で折半して上乗せする
> - ロン打点折半: ロンの打点を、親子に関わらず2人で折半して支払う
>
> | 満貫ツモ | 親 | 子 |
> | --- | --- | --- |
> | ツモ損あり | 4000オール(8000点) | 2000・4000(6000点) |
> | 北家分折半 | 6000オール(12000点) | 3000・5000(8000点) |
> | ロン打点折半 | 6000オール(12000点) | 4000オール(8000点) |
>
> **北の扱い**
>
> - 抜きドラ: 抜いた北1枚につき1飜です。抜いても門前のままです。抜かずに手牌で使う北は客風牌で、役牌になりません。
> - 共通役牌: 北の刻子・槓子で1飜役「役牌：北」になります。
>
> **ローカル役**
>
> 設定の「ローカル役」で、採用しているローカル役を一括でオン・オフします。既定はオフです。オープン立直は、設定の「オープン立直」で別にオン・オフします。

〔出典: `mahjong-rules.md` §1・§2・§3.1(満貫ツモの例の表)・§4.1・§4.2【確定】、`rule-help.ts`(`north`・`localYaku`)。3方式の説明は `TSUMO_LOSS_DESCRIPTIONS` を、方式名・設定名は `RULE_ITEMS` を引く。個々のローカル役の名前・飜数は載せない(6章 Q2 確定)〕

#### 節4「点数計算表・共有画像」

> **点数計算表**
>
> メニューの「点数計算表」で、符・飜ごとのロンとツモの点数を確認できます。親・子を切り替えられます。表は、設定の「ツモ損」「切り上げ満貫」「数え役満」「連風牌の雀頭」に合わせて変わります。
>
> **共有画像**
>
> 和了の結果では、「点差」の行の横に、共有・保存・コピーのボタンが表示されます。和了の内容を画像にして、共有したり、保存したり、クリップボードにコピーしたりできます。端末やブラウザが対応していないボタンは表示されません。役なしのときは表示されません。

〔出典: `ScoringRule`(`tsumoLoss`・`roundedMangan`・`accumlatedYakuman`・`doubleWindFu`)、`ScoringTableScreen.tsx` の親子切替、`issue-102-share-image.md` 2.4・Q3・Q4。設定名は `RULE_ITEMS` から引く。ボタンは `PointDiff.tsx` 44行で点差の Disclosure の外に常時描画される(点差を開く必要はない。`shareContext` がある和了カードのみ)〕

文面全体は、改訂時に上記の各出典(コード)と再照合した。

#### 末尾

Divider の後に `<Button variant="text">ライセンス</Button>`(2.3 の設定画面のリンクと同じ見た目)。

### 3.4 画面構成(UI 監修対象)

```
┌───────────────────────────────┐
│ ←  ヘルプ                        │  ← app-header(戻る+タイトル)
├───────────────────────────────┤
│ ▸ 結果の見方                     │  ← Disclosure(既定は閉)
│ ▸ 入力のしかた                    │
│ ▸ 三麻のルール上の注意             │
│ ▸ 点数計算表・共有画像             │
│ ─────────────────────────────── │
│ ライセンス                        │  ← テキストボタン
└───────────────────────────────┘
```

- 本文は bodyMedium、表は `<table>`(罫線は `--md-sys-color-outline-variant`)、数値列は `tabular-nums`。375px 幅で表が収まらない場合は表だけ横スクロール(`overflow-x: auto` のラッパー)にし、ページ全体には横スクロールを出さない。
- 箇条の太字は `<strong>`。色はトークンのみ。
- タップ領域(要件§4): `disclosure.css` は変更せず、`help.css` で summary に `min-height: 3rem`、Disclosure を並べる容器に `gap: 0.5rem`、末尾の「ライセンス」ボタンに `min-height: 3rem` を指定する。
- メニューの並び: 設定 / 点数計算表 / **ヘルプ** / ― / ランダム14枚 / ランダム清一色 / ― / オールクリア。

### 3.5 バンドル積算(#117)

基準値は **#69 マージ後の main の実測値**(09号「マージ後は、その Issue の実測値が次の基準値」)。製造担当が着手時に実測する。

| 内訳 | 初回 JS 増分の見込み | 根拠 |
| --- | --- | --- |
| `lazy()` 1行・`screen === 'help'` の分岐 | +60〜90 B | #69 のプローブと同じ |
| メニュー項目1つ(定義・アクション) | +30〜50 B | 文字列と1行 |
| 合計 | **約 +120 B**(上限目安 +300 B) | |

- 目標値: #69 マージ後の基準値 + 300 B(目標値。超過で不合格にしない)。
- 遅延チャンク `HelpScreen-*.js`: 本文 約 2,500 字(UTF-8 で約 7〜8 KB 生)と JSX の構造で、**約 3〜4 KB(gzip -9)** を見込む(未実測。実測を記録する)。

### 3.6 テスト(製造担当が追加)

2.8 と同じく `renderToStaticMarkup` による HTML の検査と純粋関数のテストに限る(イベントは H-5〜H-10 の実操作で確認)。

| 名前 | ファイル | 内容 |
| --- | --- | --- |
| `G4-T1` | `AppHeader.test.tsx` | `getHeaderMenuEntries()` が 3.4 の並び(divider を含む)と完全一致 |
| `G4-T2` | 同 | `selectHeaderMenuItem('help', close, dispatch)` で `close` が呼ばれ、`dispatch` に `{ type: 'navigate', screen: 'help' }` が渡る(既存の項目のテストと同じ純粋関数の形) |
| `G4-T3` | `HelpScreen.test.tsx` | `renderToStaticMarkup(<HelpView onBack={() => {}} onOpenLicense={() => {}} />)` で、summary 4つが 3.3 の見出しの順に出現する(`indexOf` の昇順で判定) |
| `G4-T4` | 同 | 同じ HTML に、各節の1文目、キーボードの表の「Backspace」「Enter」、末尾の「ライセンス」が含まれる(`Disclosure` は閉でも本文を出力するため検査できる。HTML 全体の完全一致は脆いので部分一致とし、05号どおり直前に日本語コメントで理由を書く) |
| `G4-T5` | 同 | 同じ HTML に、`RULE_ITEMS` の `tsumoLoss`・`north`・`localYaku`・`openRiichi` の `label` と、`TSUMO_LOSS_DESCRIPTIONS` の3つの値がそのまま含まれる(部分一致。理由は G4-T4 と同じ) |
| `G4-T6` | `app-state.test.ts` | `navigate` に `screen: 'license', returnTo: 'help'` で `returnScreen: 'help'` |

### 3.7 #117 の受け入れ条件

| # | 実行すること | 合格の条件 |
| --- | --- | --- |
| H-1 | lint・typecheck・format:check・test | すべてエラーなし。3.6 のテストが通過 |
| H-2 | `git diff --name-only origin/main...HEAD` | `vite.config.ts`・`public/`・`index.html`・`package*.json` が含まれない。変更は 3.2 の表のファイル(本設計書を含む)に限る |
| H-3 | `npm run build` 後、初回 JS を実測 | 実測値・基準値(#69 マージ後の main)・差・積算との差を PR 本文に記録。初回 JS が `index-*.js` 1本 |
| H-4 | `HelpScreen-*.js` の gzip -9 を測り、`grep -l "Apache License" dist/assets/HelpScreen-*.js` | サイズを PR に記録。grep はヒットしない(全文を引き込んでいない) |
| H-5 | 375px 幅でメニューを開く | 3.4 の並びで「ヘルプ」がある。押すとヘルプ画面、戻るでメイン画面 |
| H-6 | ヘルプの4節を開き、本文を 3.3 と照合 | 〔 〕の注記を除き、3.3 と一字一句一致(UI 監修で修正した場合は修正後の確定文面と一致) |
| H-7 | 結果の見方の各項目を実操作で確認: (a) 14枚和了形 (b) 13枚聴牌 (c) 13枚非聴牌 (d) 14枚非和了 (e) 10枚の聴牌形と向聴形、11枚の和了形(案内)と非和了形(何切る)、12枚(何も出ない) (f) 部分入力の聴牌の待ち牌・向聴の有効牌のタップでツモ、何切るの「打」の牌のタップで打牌、13枚聴牌の和了牌と何切る一覧内の待ち・受け入れ牌はタップしても何も起きない (g) ドラだけの和了形 (h) 「符 ○・基本点 ○」の行を開くと符の内訳が出る、国士無双ではその行が出ない | 各文と実挙動が一致。一致しない文があれば不合格とし、文面の修正案を統括へ返す |
| H-8 | 入力のしかたを実操作で確認: 萬子の2〜8が入らない、同じ牌の5枚目が入らない、手牌の2段階削除、立直なしで裏ドラが数えられない、北の扱いが共通役牌のとき抜き北を指定できない、場風・自風は画面上部のボタンで切り替わり自風東で親になる、「状況役」のカードで立直等のシートが開く、パレット方式とテンキー方式の両方でキーボードの表の4行の操作、例「123」→P で 1筒2筒3筒 | すべて文面どおり |
| H-9 | 点数計算表を開き親子を切り替え、設定の「切り上げ満貫」を変えて表が変わることを確認。和了形で、点差を開かずに点差の行の横に共有・保存・コピーのボタン(対応するもの)があることを確認し、役なしの和了形で出ないことを確認 | 文面どおり |
| H-10 | ヘルプの「ライセンス」→ ライセンス画面 → 戻る | ヘルプ画面に戻る。設定の「ライセンス」→ 戻るでは設定画面に戻る(#69 の挙動が壊れていない。設定のリンクは残っている) |
| H-11 | ライト・ダーク両方で表示、`grep -nE "#[0-9a-fA-F]{3,8}\b" src/ui/help/help.css`、`grep -rn "<md-" src/ui/help src/ui/screen/HelpScreen.tsx` | トークンで切り替わる。grep はどちらもヒットしない |
| H-12 | 375px 幅で各節を開いた状態で `document.documentElement.scrollWidth <= 375` | 真(表は表の中だけでスクロール) |
| H-13 | `npm run build && npx vite preview` で H-5・H-6・H-10 を再確認 | dev と同じ |
| H-14 | ホームディレクトリ名・絶対パスの検査 | 含まれない |
| H-16 | 375px 幅で DevTools により要素の大きさを測る(`getBoundingClientRect()`) | 各 Disclosure の summary の高さ 48px 以上、隣接する Disclosure の間隔 8px 以上、「ライセンス」ボタンの高さ 48px 以上 |
| H-15 | UI 監修(dev と本番ビルド) | ユーザーの承認 |

## 4. 製造順と PR の分け方

1. **#69**: ブランチ `feature/issue-69-license-screen` を main から切る。2章のすべて。PR に L-1〜L-15 の結果。マージ後、初回 JS の実測値が #117 の基準値になる。
2. **#117**: #69 マージ後の main から `feature/issue-117-help-screen` を切る。3章のすべて。#69 の `Screen` 型・`returnTo`・`LicenseScreen` を前提とする。
3. 本設計書は #69 の PR に含める(統括の判断で別でもよい)。#117 で文面が監修により変わった場合は、#117 の PR で本書 3.3 を改訂する。

## 5. 監修用モックの作り方(承認時に添える)

- ライセンス画面(2.4)とヘルプ画面(3.4)のワイヤーは本書の図のとおり。画像化する場合は、統括担当(またはそのサブエージェント)が、2.5・3.3 の文面を流し込んだ単一の HTML(MD3 のトークン値をインラインの CSS 変数で与え、375×812 の枠で描画)を作り、スクリーンショットを撮る。HTML はリポジトリに置かない。
- ヘルプのモックは「全節を閉じた状態」と「節2(入力のしかた)を開いた状態」の2枚、ライセンスのモックは「上端」と「MIT の全文を開いた状態」の2枚を推奨する。
- 実画面での監修は L-15・H-15(dev と本番ビルド)で行う。

## 6. ユーザー確認事項(確定済み)

ユーザーは推奨どおりと回答済み(統括経由、2026-11-16)。

| # | 論点 | 確定 |
| --- | --- | --- |
| Q1 | ヘルプ内のライセンスリンクと設定画面のリンク | **A. 併存**。設定画面のリンクは #117 後も残す。権利表示の入口が複数あって見つけやすく、#69 の実装・テスト・`CREDITS.md` を変えずに済むため |
| Q2 | ローカル役の一覧をヘルプに載せるか | **載せない**。設定の「ローカル役」で一括オン・オフすること、既定がオフであることだけを書く(3.3 節3) |
| Q3 | Material Symbols の著作権表示 | **「Copyright Google LLC」と書く**(2.5 の表のとおり。上流 LICENSE の著作権者欄は雛形だが、提供元が Google であることに合わせた) |
| Q4 | デュアルライセンスの Rust crate | **MIT を選択**し、MIT 全文1つで足りる構成とする |

## 7. 後続への引き継ぎ・残留リスク

- 09号の「現在の基準値」(125,908 B)は古い。本書の実測 128,640 B(main e93d239)で更新するのが望ましい。09号の改訂は本 Issue の範囲外(統括の判断)。
- 依存を追加・更新する Issue では、本書 1.3 の手順(sourcemap の `sources` と WASM の文字列)で配布物の依存を洗い直し、`license-data.ts` と `CREDITS.md` を更新する。この手順を業務標準に入れるかは統括の判断。
- `wasm/decomposer/Cargo.lock` が無く、crate の版がビルドごとに変わりうる。将来 crate が増えた場合に掲載漏れが起きうる。`Cargo.lock` の管理は別 Issue の候補。
- futures-*・serde_json 等を「WASM に入らない」と判断したのは文字列の痕跡が無いことによる(実挙動未確認)。厳密な確認は `wasm-objdump` 等でのデバッグビルド解析が要る。
- G1(#108)は `vite.config.ts`・`public/`・`index.html` を触る。本設計はこの3つを変更しないため、ファイル上の衝突はない。ただし G1 が PWA のプリキャッシュ設定を変えた場合も、新しい遅延チャンクは既存の `globPatterns`(`**/*.{js,css,html,wasm,svg,png}`)でプリキャッシュされる前提(オフラインでもライセンス・ヘルプが開ける)。G1 が `globPatterns` を変えるなら、この前提を G1 側で維持すること。
- `docs/license-policy.md` の表に、2.5 の依存(React・Lit・uqr・Rust crate 等)を追記するかは範囲外。統括の判断。
- ヘルプ文面の正確性は、H-7〜H-9 の実操作照合に依存する。製造担当は文面を変えず、ずれを見つけたら統括へ報告する(文面はユーザー監修対象のため)。
