# Issue #41 C3. 牌画像 設計書

- 対象 Issue: #41(Epic C #4 の Sub-Issue)
- 依存: C1(#39)。製造は C1 マージ後の `main` から `feature/issue-41-tile-images` を切って行う
- 前提とする C1 設計書: `docs/design/issue-39-md3-theme.md`(トークン `--md-sys-color-*`・`--md-sys-shape-corner-*`、`src/ui/theme/` の構成)

## 0. 改訂履歴

- 改訂1(UI 監修1回目): 牌の下地・裏を livewing/mahjong-calc 準拠に変更、絵柄を 0.9 倍に縮小、状態層を scrim に変更しフォーカスにも適用、`--tile-width` の不具合修正。製造済み実装(7de4c3d・f8600cb・a547c29)への差分は **2.8** にまとめた。受け入れ条件 1・4・6・7・8・10・11・12 を改訂。

## 1. 参照資料と設計判断の根拠

### 1.1 ヒアリングで確定した事項(統括担当より)

1. 上流 SVG を必要な分だけ直接取り込み、SVGO で最適化してコミットする。npm `riichi-mahjong-tiles` は使わない。
2. 絵柄セットは `Regular` のみ。
3. 横向きの牌は作らない(副露も縦のまま)。
4. 牌画像のダークテーマは扱わない(どちらのテーマでも Regular の白い牌)。
5. SVG は JS に埋め込まずファイルとして出力し、vite-plugin-pwa の precache 対象に含める。予算は実測に基づく(G-09)。
6. 範囲: 1m・9m・筒子 1〜9・索子 1〜9・字牌 7 種、赤牌は 5p・5s のみ、裏向きの牌。
7. クレジットはドキュメントに記載。アプリ内表示は Epic G。

### 1.2 参照資料

- 上流: FluffyStuff/riichi-mahjong-tiles、コミット `26e127ba2117f45cdce5ea0225748cc0cfad3169`(2024-06-15。本設計時に shallow clone して確認)。`LICENSE.md` は CC0。
- `docs/license-policy.md`(上流は CC0、クレジットは礼儀として残す)
- `docs/mahjong-rules.md` §1 赤ドラ「`5p`・`5s` のみ」、`docs/requirements.md` §3.5 → `Man5-Dora` を取り込まない根拠
- `docs/rules/06-ui-md3-protocol.md`「色トークン使用義務の例外(牌画像)」
- `docs/rules/advisory/G-09-bundle-budget-underestimate.md`
- `src/core/tile/index.ts` の `Tile`・`TileOrBack`・`Back` 型
- `vite.config.ts`(`globPatterns` に既に `svg` を含む)

### 1.3 実測結果(設計時、作業用ディレクトリで実施。リポジトリには何も残していない)

対象 31 ファイル(`Front` `Back` `Man1` `Man9` `Pin1`〜`Pin9` `Pin5-Dora` `Sou1`〜`Sou9` `Sou5-Dora` `Ton` `Nan` `Shaa` `Pei` `Haku` `Hatsu` `Chun`)。

**ファイル数と牌の種類数は異なる**。牌の種類は 30 種(1m・9m、筒子 1〜9+赤 5p、索子 1〜9+赤 5s、字牌 7、裏)。ファイルは 31(重ね用の `Front` と、白でも参照しない `Haku` を含み、裏は `Back` 1 ファイル)。アプリが実際に参照するのは `Haku` を除く 30 ファイル。

| 項目 | 値 |
| --- | --- |
| 上流そのまま合計 | 664,443 B |
| `npx svgo@3.3.2`(既定プリセット)後の合計 | 267,871 B(参考。viewBox が消える設定) |
| **`removeViewBox: false` 適用後の合計(採用設定)** | **268,553 B**(独立レビューで実測) |
| 既定プリセット後・ファイルごと gzip -9 の合計 | 33,776 B(参考) |
| 最大ファイル | `Sou1.svg` 24,582 B(既定プリセット時) |
| `Haku.svg` | 88 B(採用設定。図柄が空。白は Front のみで表す) |
| `Front.svg` / `Back.svg` | 1,982 B / 1,988 B(採用設定) |

判明した注意点:

- **SVGO 3 の既定プリセットは `viewBox` を消す**(上流は `viewBox="0 0 300 400"` と `width/height` を併記しているため `removeViewBox` が効く)。`viewBox` が無いと `<img>` で縮小表示したとき図柄が拡縮されず切れる。よって **`removeViewBox` を無効化する**(確定)。
- 最適化後も `<mask id="b">` 等の `id` が残る。`<img>` で表示すれば文書ごとに独立するため衝突しない。**インライン SVG として DOM に埋め込まない**(確定。確定事項 5 とも整合)。
- `Haku.svg`・`Front.svg`・`Back.svg` は Vite の `assetsInlineLimit`(既定 4096 B)未満のため、そのままでは data URI として JS に埋め込まれる。対策は 2.4。

## 2. 設計

### 2.1 ファイル構成

```text
svgo.tiles.config.mjs              SVGO 設定(removeViewBox 無効化)
scripts/
  optimize-tiles.sh                上流 Regular/ から 31 ファイルを選んで SVGO で最適化し出力する
src/ui/tile/
  assets/                          最適化済み SVG 31 ファイル(コミットする。手で編集しない)
    README.md                      出典・コミット・ライセンス・再生成手順
  tile-image.ts                    Tile → 画像 URL の対応(純関数)
  tile-image.test.ts
  Tile.tsx                         牌 1 枚の表示部品
  tile.css                         部品の装飾(トークンのみ)
  TileGallery.tsx                  検収用の一覧表示(2.7。バレルから export しない)
  index.ts                         バレル(公開 API は 2.3 末尾)
src/ui/
  App.tsx                          変更: `?gallery=tiles` のときだけ TileGallery を遅延読み込みで表示(2.7)
  app-mode.ts                      新規: URL パラメーターの読み取り(純関数)
  app-mode.test.ts                 新規
CREDITS.md                         第三者素材のクレジット一覧(新規)
```

`src/ui/expressive/` ではなく `src/ui/tile/` に置く(牌は Expressive 固有部品ではないため)。

### 2.2 最適化手順(スクリプト化する)

再取り込み時の再現性のため、手順をスクリプト化する(確定。設計担当の判断)。

- `svgo` を devDependencies に**キャレットなしで固定**(設計時実測は `3.3.2`。製造時にこの版を使う)。
- `package.json` に `"tiles:optimize": "sh scripts/optimize-tiles.sh"` を追加。引数に上流リポジトリの `Regular` ディレクトリのパスを取る(例: `npm run tiles:optimize -- <clone先>/Regular`)。上流はリポジトリに取り込まない・submodule にしない。
- スクリプトは 1.3 の 31 ファイル名の固定リストだけを作業用一時ディレクトリにコピーし、`svgo --config svgo.tiles.config.mjs -f <一時dir> -o src/ui/tile/assets` を実行する。リストに無いファイル(`Man2`〜`Man8`・`Man5`・`Man5-Dora`・`Blank` 等)は出力しない。一時ディレクトリは終了時に削除する。
- `svgo.tiles.config.mjs`: `preset-default` を使い、`overrides: { removeViewBox: false }`。他はプリセットどおり。
- 出力ファイル名は上流と同じ(`Pin5-Dora.svg` 等)。
- `src/ui/tile/assets/` は Biome の対象外でよい(SVG は Biome の対象言語でない)。`README.md` には上流 URL・コミットハッシュ・CC0・再生成コマンドを書く。

### 2.3 Tile → URL の対応(`tile-image.ts`)

```ts
import type { TileOrBack } from '../../core/tile';

/** 牌 1 枚の画像。face が null のときは base だけを描く(白・裏) */
export interface TileImage {
  base: string;          // Front.svg または Back.svg の URL
  face: string | null;   // 図柄の URL
}

/** 三麻で使わない牌(2m〜8m、赤 5m)は例外を投げる */
export function tileImageOf(tile: TileOrBack): TileImage;

/** 既定の aria-label(2.5)。三麻で使わない牌は tileImageOf と同様に例外を投げる */
export function tileLabelOf(tile: TileOrBack): string;
```

- バレル `src/ui/tile/index.ts` の公開 API は `Tile`・`TileProps`(型)・`TileImage`(型)・`tileImageOf`・`tileLabelOf` の 5 つだけ。`TileGallery` は export しない。

- 各 SVG は `import frontUrl from './assets/Front.svg?no-inline';` の形で取り込む(2.4)。
- 対応表:
  - `{ type: 'back' }` → `{ base: Back, face: null }`
  - `m` の `n=1` → `Man1`、`n=9` → `Man9`。それ以外の `m` は `Error('三麻で使わない牌: ...')`
  - `p`・`s` の `n=1..9` → `Pin{n}`/`Sou{n}`。`n=5` かつ `red: true` → `Pin5-Dora`/`Sou5-Dora`
  - `z` の `n=1..7` → `Ton` `Nan` `Shaa` `Pei` `Haku` `Hatsu` `Chun`(確認済み: `src/core/hora.ts` の風牌・三元牌の扱い、`src/core/local-yaku.ts` で `n===5` が白)
  - 白(`z7` ではなく `n=5`)は `face` に `Haku.svg` を使ってよい(中身は空)が、余計なリクエストを避けるため `face: null` とする(確定)。`Haku.svg` は取り込みリストに残す(再生成時の整合のため)。
- `Front` の上に `face` を重ねる(確定事項)。

### 2.4 ファイル出力とプリキャッシュ

- インライン化回避: `?no-inline` クエリで取り込む(確定。Vite 6.4 で `?no-inline` が効き、4KB 未満の SVG も `dist/assets` に出ることを独立レビューが一時ディレクトリで実測済み)。万一効かない場合の代替として、`vite.config.ts` の `build.assetsInlineLimit` を関数形にし `/src/ui/tile/assets/` 配下の `.svg` に `false` を返す方式がある。代替を採った場合は製造報告に書く。
- 型: 追加不要(確定)。`tsconfig.app.json` が読む `vite/client` 型に `declare module '*?no-inline'` が既にある(`node_modules/vite/client.d.ts` 258 行目で確認)。`vite-env.d.ts` は新設しない。
- 出力の前提: Vite は参照されたモジュールの SVG だけを出力する。C3 では本番の `App.tsx` が `TileGallery` を動的 import で参照する(2.7)ため、コミットされたコードのままの `npm run build` で SVG が `dist/assets` に出力される(確定事項)。動的 import 先のチャンクから参照される資産も通常どおり `dist/assets` に出力される想定(実物未確認。受け入れ条件 7 で確認)。
- precache: `vite.config.ts` の `globPatterns` は `**/*.{js,css,html,wasm,svg,png}` で、`dist` 配下のファイルをビルド後に走査して一覧化する方式のため、動的 import のチャンク(`.js`)も SVG も対象に入る見込み(変更不要)。受け入れ条件 9 で SVG とギャラリーのチャンクの両方が `dist/sw.js` に載ることを確認する。
- 予算: **`dist/assets` 上の SVG(`Haku` を除く 30 ファイル)の合計 ≤ 320,000 B**(採用設定での 31 ファイル実測 268,553 B の約 1.2 倍)。G-09 の「3 倍」はコード量が実装で膨らむ場合の目安であり、本件は中身が固定の素材で実測値がほぼそのまま最終値になるため、SVGO の版差・設定差の余裕として 1.2 倍とした。超えた場合は不要ファイル混入・`removeViewBox` 以外の設定差を先に調べて報告する。

### 2.5 表示部品(`Tile.tsx`)

```ts
export interface TileProps {
  tile: TileOrBack;
  selected?: boolean;         // 既定 false
  onClick?: () => void;       // 指定時のみ button として振る舞う
  'aria-label'?: string;      // 既定は牌名(下記)
}
export function Tile(props: TileProps): JSX.Element;
```

- 構造: ルート要素(`onClick` ありなら `<button type="button">`、なしなら `<span role="img">`)の中に `<img src={base} alt="">` と、`face` があれば同位置に重ねた `<img src={face} alt="">`。画像は装飾扱い(`alt=""`)とし、名前はルートの `aria-label` で与える。
- 既定の `aria-label`: `1萬` `9萬` `1筒`…`赤5筒` `1索`…`赤5索` `東` `南` `西` `北` `白` `發` `中` `裏`。`tile-image.ts` に `tileLabelOf(tile): string` として置く。
- `selected` は `onClick` ありのとき `aria-pressed` に反映する。
- 寸法: 幅は CSS 変数 `--tile-width`(既定 `2.5rem`)、縦横比は `aspect-ratio: 3 / 4` で決める。利用側が変数で大きさを変える。
- 装飾(`tile.css`。色・角はトークンのみ。HEX・`rgb()` 直書き禁止):
  - 角丸: `border-radius: var(--md-sys-shape-corner-extra-small)`、`overflow: hidden`
  - 背景: 透明(牌面の白・影は `Front.svg` が持つ。06 号例外 1)
  - 枠(通常): なし
  - 選択状態: `outline: 2px solid var(--md-sys-color-primary); outline-offset: 1px;`
  - フォーカス: `:focus-visible` で `outline: 2px solid var(--md-sys-color-secondary)`、選択とフォーカスが重なる場合は選択を優先
  - 押下可能時のホバー/押下の状態層(改訂1で scrim に変更、2.8.4): 擬似要素に `background: var(--md-sys-color-on-surface)` と `opacity` 0.08(hover)/0.10(pressed) を重ねる。main(C1 マージ後、976f3a3)の `src/ui/theme/tokens.css`・`static-tokens.css` に状態層トークンは無いことを確認済みのため、値を直接指定する(値自体は出典未照合。5 章)
  - `button` の既定スタイル(枠・余白・背景)はリセットする
- 横向き・ダークテーマ用の牌は作らない(4 章)。

### 2.6 クレジット

- `CREDITS.md`(新規)に「牌画像: FluffyStuff/riichi-mahjong-tiles(CC0 1.0)。義務はないが謝意として記載」、上流 URL、取り込んだコミット、加工内容(SVGO 最適化・31 ファイルの抜粋)を書く。
- `LICENSE` は変更しない(MIT の著作権表示を維持)。`docs/license-policy.md` も変更しない。

### 2.7 動作確認用の表示

C3 では画面に牌を並べる正式な UI は作らない。`Tile.tsx` の利用例として `src/ui/tile/TileGallery.tsx`(30 種の牌+選択状態・押下可能の例を並べる部品)を置き、本番の `src/ui/App.tsx` から URL パラメーター `?gallery=tiles` のときだけ表示する(確定事項。C2 のデバッグ用切替 `?theme=dark` と同じ考え方)。パラメーターが無いときの表示は従来どおり(`<h1>三麻点数計算機</h1>`)で変えない。検収はコミットされたコードのまま行い、コードを書き換えない。

- `src/ui/app-mode.ts`: `export function isTileGalleryMode(search: string): boolean`。`new URLSearchParams(search).get('gallery') === 'tiles'` のときだけ `true`。`App.tsx` は `window.location.search` を渡すだけにし、判定はこの純関数でテストする(設計担当の判断。現状のテスト環境に DOM・React Testing Library が無いため、依存を足さずに分岐をテストできる形にした)。
- 遅延読み込みにする(確定。設計担当の判断): `const TileGallery = lazy(() => import('./tile/TileGallery'))` とし、`<Suspense fallback={null}>` で包む。`TileGallery.tsx` は default export も持たせる(`lazy` の要件)。理由: (1) 通常の利用者はギャラリーを開かないので、初回表示の JS に `Tile` 一式と 30 個の SVG URL 参照を含めない。(2) SVG はどのみち別ファイルで出力され precache されるため、遅延読み込みにしても出力・precache への影響は無い見込み(受け入れ条件 7・9 で確認)。(3) D1 で分岐を外すときにチャンク単位で消えるので影響範囲が明確。
- パラメーターの値は `tiles` のみ受け付ける。他の値(`?gallery=foo`)は通常表示。
- 既存の `App.tsx` 用テストは無い(設計時に確認)。

### 2.8 改訂1(UI 監修1回目)による差分

製造担当はこの節を、製造済みの実装に対する変更指示として読む。2.1〜2.7 の記述とこの節が食い違う場合はこの節を優先する。

#### 2.8.1 確定事項(統括担当より)

1. 牌の表の下地と裏を livewing/mahjong-calc(MIT、v2.1.4、コミット `6550200`)の `src/components/tile/images/light/bg.svg`・`src/components/tile/images/back.svg` 準拠にする。裏はオレンジ。絵柄は引き続き FluffyStuff の Regular を使い、下地の上に重ねて 0.9 倍(中央基準)に縮小する。裏には絵柄を重ねない。
2. 牌と牌の間の余白は部品に入れない(下地と絵柄の間の余白のみ)。`TileGallery` の並びには gap を入れてよい。
3. 状態層はテーマによらず牌を暗くする(`--md-sys-color-scrim`)。フォーカス時も 0.10 を重ねる。
4. `--tile-width` が親から効かない不具合を直す。

#### 2.8.2 下地・裏の SVG の持ち方(設計担当の判断)

- livewing の 2 ファイルを**内容そのままで**リポジトリに置く(取り込み。同等品の自作ではない)。理由: 中身は矩形 2〜3 個で、出典どおりの値を保てば検収で一字一句照合でき、出典表示も明確になる。自作扱いにすると色・角丸の値の出典が曖昧になる。
- 置き場所: `src/ui/tile/base/`(新設)。`src/ui/tile/assets/` には置かない。理由: `assets/` は「FluffyStuff 由来・スクリプトで再生成・手で編集しない」領域であり、混ぜると受け入れ条件 4(再生成で差分なし)とファイル数の検査の意味が崩れる。
  - `src/ui/tile/base/Front.svg`: 次の 1 行と同一内容(末尾改行 1 つ)
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#d4d4d4" rx="30"/><rect x="4" y="4" width="292" height="392" fill="white" rx="26"/></svg>`
  - `src/ui/tile/base/Back.svg`: 次の 1 行と同一内容(末尾改行 1 つ)
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#fb923c" rx="30"/></svg>`
  - ファイル名は `Front`・`Back` のまま(上流 livewing の名前 `bg`・`back` ではなく、既存の `tile-image.ts` の変数名・テストの `toContain('Front.svg')`/`toContain('Back.svg')` を活かすため)。SVGO にはかけない(既に最小)。
  - `src/ui/tile/base/README.md`(新設): 出典(livewing/mahjong-calc、MIT、Copyright 2021 livewing.net、v2.1.4、コミット `6550200`、元パス `src/components/tile/images/light/bg.svg`・`src/components/tile/images/back.svg`)、改名の事実、手で値を変えないこと。
  - 色は SVG 側に持つ(06 号の例外規定)。CSS・TSX に色を書かない。
- 上流 FluffyStuff の `Front.svg`・`Back.svg` は使わなくなるので**取り込みから外す**:
  - `scripts/optimize-tiles.sh` の `TILES` から `Front.svg`・`Back.svg` を削除(29 ファイルになる)。
  - `src/ui/tile/assets/Front.svg`・`assets/Back.svg` を `git rm` する(ユーザー確定事項 1 による削除指示)。
  - `src/ui/tile/assets/README.md`・`CREDITS.md` の「31ファイル」「表裏ベース」の記述を「29ファイル(図柄のみ)」に直す。
- `tile-image.ts`: `import frontUrl from './base/Front.svg?no-inline';`・`import backUrl from './base/Back.svg?no-inline';` に変える(どちらも 4096 B 未満なので `?no-inline` は必須)。`TileImage.base` のコメントを「`base/Front.svg` または `base/Back.svg`」に直す。対応表・公開 API は変えない。既存テスト C3-T01 等の `toContain('Front.svg')`・`toContain('Back.svg')` はそのまま通る(変更不要)。
- サイズ: 下地・裏の合計は約 300 B で、上流 Front/Back(計 3,970 B)より小さい。出力 SVG は図柄 28(29 から `Haku` を除く)+下地・裏 2 = **30 ファイル**で、ファイル数は改訂前と同じ。予算 320,000 B は据え置く(余裕が増えるだけ)。

#### 2.8.3 クレジット・ライセンス

- `LICENSE` は既に `Copyright 2021 livewing.net` を含む(確認済み)ため**変更しない**。`docs/license-policy.md` §1 の方針(MIT、著作権表示を保持)どおり。
- `CREDITS.md` に節「牌の下地・裏(livewing/mahjong-calc)」を追加: 提供元・URL(https://github.com/livewing/mahjong-calc)・v2.1.4・コミット `6550200`・ライセンス MIT(Copyright 2021 livewing.net、全文はリポジトリの `LICENSE`)・使用内容(表の下地 `bg.svg`・裏 `back.svg` を内容そのままで `Front.svg`・`Back.svg` に改名して使用、絵柄を下地に重ねて 0.9 倍に縮小する配置を参考にした)。既存の FluffyStuff 節の加工内容を「図柄 29 ファイル」に直す。

#### 2.8.4 `tile.css` の変更

- `.tile` から `--tile-width: 2.5rem;` を削除し、`width: var(--tile-width, 2.5rem);` にする(不具合修正。宣言が要素自身にあると親の指定が上書きされる)。
- 絵柄の縮小: `.tile__face { transform: scale(0.9); }`(`transform-origin` は既定の中央のままでよい)。`.tile__base` は縮小しない。0.9 は色ではないので CSS の数値で持つ。
- 角丸: 下地 SVG が `rx="30"` の角丸を持つため、`.tile` の `border-radius: var(--md-sys-shape-corner-extra-small)` と `overflow: hidden` は残す(状態層を角の外にはみ出させないため)。ただし角丸が SVG の角と合わない場合に下地の灰色の縁が欠けて見えることがあり得る(5 章。目視で問題があれば報告のみで、値は変えない)。
- 状態層:
  - `button.tile::after` の `background` を `var(--md-sys-color-scrim)` に変える(ライト・ダークとも黒。テーマによらず暗くする)。
  - 不透明度: `:hover` 0.08、`:active` 0.10(据え置き)、**`button.tile:focus-visible::after { opacity: 0.1; }` を追加**。ホバーとフォーカスが重なる場合は 0.10 でよい(規則の順序で `:focus-visible` を `:hover` の後、`:active` と同じ値)。
  - フォーカスの輪郭(secondary)・選択の輪郭(primary)は変えない。
- 余白: 部品には `margin`・`padding`・`gap` を入れない(現状どおり `margin: 0; padding: 0`)。

#### 2.8.5 `TileGallery.tsx`

- 牌の並びの gap は現状 `0.5rem`(確認済み)でよい。見づらければ製造担当の判断で変えてよい(色ではない)。
- 受け入れ条件 11.a2 の確認のため、`--tile-width` を親要素に指定した行を 1 つ追加する: 同じ牌(例: 東・裏)を `style={{ '--tile-width': '1.5rem' }}` と `'4rem'` の親で並べる(TypeScript では `as React.CSSProperties` 等で型を通す)。

## 3. 受け入れ条件

1. (改訂1)`ls src/ui/tile/assets/*.svg | wc -l` が `29`。ファイル名が 1.3 の一覧から `Front`・`Back` を除いたものと一致し、`Front`・`Back`・`Man2`〜`Man8`・`Man5*`・`Blank`・`Black` 系が含まれない。`ls src/ui/tile/base/*.svg` が `Back.svg`・`Front.svg` の 2 つで、内容が 2.8.2 の各 1 行と一致する(`diff` で確認)。
2. `grep -L 'viewBox="0 0 300 400"' src/ui/tile/assets/*.svg` の出力が空(全ファイルに viewBox がある)。
3. `grep -l 'inkscape\|sodipodi' src/ui/tile/assets/*.svg` の出力が空(最適化済み)。
4. 上流を shallow clone し `npm run tiles:optimize -- <clone先>/Regular` を実行した後、`git status --porcelain src/ui/tile/assets src/ui/tile/base` が空(再生成で差分が出ず、`Front.svg`・`Back.svg` も生成されない)。clone 先はリポジトリ外に置き、確認後削除する。
5. `package.json` の `svgo` がキャレット・チルダなしの固定版。
6. `npm test` で `tile-image.test.ts` が通り、テスト名に接頭辞 `C3`(05 号の命名規約)を付け、少なくとも次を検証している: `back`→`{base: Back, face: null}`、`m1`/`m9`/`p1`/`s9` の URL、`p5 red:true`→`Pin5-Dora`、`s5 red:false`→`Sou5`、`z1..z7` の 7 種(白は `face: null`)、`m5`・`m2` で例外、(改訂1)`back` と表の牌の `base` がそれぞれ `/base/` 配下の URL であること(`toContain('base/Back.svg')` 等。Vite のテスト時の URL 形式に合わせ、通らなければ `Back.svg` の包含のみでよい)、`tileLabelOf` が `赤5筒`・`發`・`裏` を返し、`m2` で例外。
   加えて `app-mode.test.ts`(接頭辞 `C3`)が通り、`''`・`'?theme=dark'`・`'?gallery=foo'` で `false`、`'?gallery=tiles'`・`'?theme=dark&gallery=tiles'` で `true` を検証している。
7. コミットされたコードのまま(作業ツリーに差分が無いことを `git status --porcelain` で確認してから)`npm run build` 後、`ls dist/assets/*.svg | wc -l` が `30`(改訂1: 図柄 28+下地・裏 2。白は `face: null` のため `Haku.svg` は出力されない)、かつ `grep -c 'data:image/svg' dist/assets/*.js` がすべて 0(インライン化されていない)。
8. `dist/assets/*.svg` の合計バイトが 320,000 以下(`cat dist/assets/*.svg | wc -c`)。
9. `dist/sw.js`(または workbox の precache マニフェスト)に `dist/assets` 内の各 SVG ファイル名が含まれる(`for f in dist/assets/*.svg; do grep -q "$(basename $f)" dist/sw.js || echo $f; done` の出力が空)。あわせて遅延読み込みのチャンクが分かれていること・precache に載ることを確認する: `grep -l 'Pin5-Dora' dist/assets/*.js` で見つかる JS ファイルが 1 つ以上あり、それが `dist/index.html` から `<script>` で直接読まれるエントリの JS と別ファイルであること、かつそのファイル名が `dist/sw.js` に含まれること。
10. `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' src/ui/tile/*.css src/ui/tile/*.tsx src/ui/tile/*.ts` の出力が空(`*.ts` はテストファイルを含む。テストに色値を書く必要は無いため除外しない)。`tile.css` の色指定は `transparent`・`none` を除き、すべて `var(--md-sys-color-*)`。(改訂1)`grep -n 'on-surface' src/ui/tile/tile.css` が空で、`--md-sys-color-scrim` を含む。`grep -n -- '--tile-width:' src/ui/tile/tile.css` が空(`.tile` 自身で宣言していない)。
11. コミットされたコードのまま `npm run build && npm run preview` を実行し、ブラウザで次を目視・確認する(コードは書き換えない):
    0. パラメーター無しの URL では従来どおり見出し「三麻点数計算機」だけが表示され、牌が表示されない。以下 a〜f は `?gallery=tiles` を付けた URL で確認する。
    a. 30 種の牌(白・裏を含む)がすべて図柄の欠けなく表示される。(改訂1)表の牌は灰色の細い縁のある白い角丸の下地の上に図柄があり、下地と図柄の間に余白がある(図柄が 0.9 倍)。裏はオレンジの平らな面で図柄が無い。牌と牌の間の余白は部品自身には無い(DevTools で `.tile` の `margin`・`padding` が 0)。
    a2. (改訂1)ギャラリーの `--tile-width` を親に指定した行で、`1.5rem` と `4rem` の牌の幅が実際に異なり(`getBoundingClientRect().width` が 24px と 64px 前後。ルート文字サイズ 16px の場合)、図柄が枠に合わせて拡縮する(viewBox が効いている)。
    b. 赤 5 筒・赤 5 索が赤い図柄で、通常の 5 筒・5 索と区別できる。
    c. 選択状態の牌に primary 色の輪郭が出る。`getComputedStyle(el).outlineColor` が `--md-sys-color-primary` の解決値と一致する(rgb 文字列で返る。ライト時の期待値は `rgb(60, 105, 57)`)。
    d. `onClick` ありの牌が Tab でフォーカスでき、`aria-label` と `aria-pressed` が読み取れる(アクセシビリティツリーで確認)。(改訂1)フォーカス中の牌で `getComputedStyle(el, '::after').opacity` が `0.1`。
    e. ダークでも牌の下地は白(裏はオレンジ)のまま表示される(仕様どおり)。ブラウザペインでは prefers-color-scheme のエミュレーション切替で `change` が発火しない(advisory C-01)ため、切替後に再読み込みし、`document.documentElement.dataset.theme === 'dark'` を確かめてから確認する。(改訂1)ダークでも押下可能な牌のホバー・フォーカスで牌が**暗く**なる: `getComputedStyle(el, '::after').backgroundColor` がライト・ダークとも `--md-sys-color-scrim` の解決値(黒)と一致し、目視でも暗くなる。
    f. DevTools のネットワークを Offline にして再読込しても全牌が表示される(precache から配信)。
    確認後、`git status` で作業ツリーに差分が無いことを確認する(`dist/` は管理外)。
12. `CREDITS.md` が存在し、上流 URL・CC0・取り込みコミットハッシュを含む。`src/ui/tile/assets/README.md` に再生成コマンドがある。`LICENSE` に差分が無い(`git diff main -- LICENSE` が空)。(改訂1)`CREDITS.md` に livewing/mahjong-calc・MIT・`6550200` を含む節があり、`src/ui/tile/base/README.md` に出典がある。
13. `npm run lint` / `npm run typecheck` / `npm run format:check` / `npm test` がエラーなし。

## 4. 後続 Issue への引き継ぎ

- **横向きの牌(副露)**: C3 では作らない。副露も縦のまま表示する前提。必要になったら CSS の回転(`transform: rotate(90deg)` と、回転後の寸法に合わせた外枠)で対応する。画像の追加は不要。
- **牌画像のダークテーマ**: C3 では扱わず、どちらのテーマでも Regular の白い牌を表示する。v2 以降の作業とする。ユーザーの方針案:「ダークテーマ用にRegularから色を変更して作るようにします（黒地に白基調・赤と緑はわかりやすくパステルカラーにするとか？）」。実施時は 06 号例外 3 に従い「牌画像の差し替え」として別の SVG 一式を `src/ui/tile/assets-dark/` 等に置き、`tileImageOf` にテーマ引数を足す形を想定する。C1 の引き継ぎにある `AppSettings` への項目追加もその時に判断する。
- **状態層の向き(改訂1)**: 現在の白い牌では状態層を scrim で重ね、テーマによらず牌を暗くする。今後ダーク用の牌画を作るときは、逆に明るくする(ユーザー方針)。その際は状態層の色をテーマ(牌画)に応じて切り替える。
- **アプリ内クレジット表示**: Epic G で `CREDITS.md` の内容を画面に出す。
- **D 系(入力・結果表示)**: 牌の表示は `Tile` を使う。大きさは `--tile-width` で調整し、色・枠を利用側で再定義しない。2m〜8m を渡すと例外になるため、入力側で三麻の牌だけを扱うこと。
- **`?gallery=tiles` の分岐**: C3 の検収・目視確認用に本番の `App.tsx` に置いた暫定の分岐。D1 で画面の骨格ができたら、この分岐を外す(または開発時のみに限る等、扱いを見直す)。外す場合は `app-mode.ts`・そのテスト・`TileGallery` もあわせて整理してよい。外した後は本番で `Tile` が参照される画面があることで SVG の出力が保たれるため、C3 の受け入れ条件 7・9 相当(SVG 30 件の出力と precache)を D1 側でも確認すること。

## 5. 実挙動未確認の箇所

- 本番ビルド後の SVG 合計サイズ(設計時の値は SVGO 単体の出力。Vite は SVG を再加工しない想定)。
- 状態層の不透明度 0.08/0.10 は MD3 の state layer の値の記憶に基づく(出典未照合。C1 に状態層トークンが無いことは確認済み)。
- 遅延読み込みのチャンクから参照される SVG が `dist/assets` に出力されること、動的 import のチャンクと SVG が `dist/sw.js` の precache に載ること(Vite・workbox の通常動作からの見込み。受け入れ条件 7・9 で確認)。
- (改訂1)`.tile` の `border-radius`(extra-small)と下地 SVG の `rx="30"`(幅 300 に対し 10%)が一致しないため、牌の大きさによって角の灰色の縁が欠けて見える、または角の外に透明部分が見える可能性がある。設計時に実物未確認。目視で気になる場合は検収で報告し、値の変更はユーザー判断とする。
- (改訂1)`--md-sys-color-scrim` は `src/ui/theme/tokens.css` のライト・ダークとも `#000000`(設計時に確認済み)。
- 受け入れ条件 11 の目視項目は設計時に実行していない(`outlineColor` の期待値 `rgb(60, 105, 57)` は primary `#3c6939` からの換算)。

確認済みとして解消した項目: `?no-inline` の効き(Vite 6.4 で実測)、その型定義が不要なこと(`vite/client` 型)、`z1..z7` と東南西北白發中の対応(`src/core/hora.ts`・`src/core/local-yaku.ts`)、`removeViewBox: false` 適用後のサイズ(268,553 B)。
