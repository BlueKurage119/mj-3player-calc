# Issue #102 設計書: H2. SNS共有向けの和了画面

- 対象 Issue: #102(Epic H #100 の Sub-Issue。Version 1)
- 作業ブランチ: `feature/issue-102-share-image`
- 確度の表記: 【確定】= ヒアリング済み・実物で確認済み、【設計案】= 設計担当の案(承認時に確認が必要)、「実挙動未確認」= 実機・実ブラウザで確かめていない

## 1. 参照した資料と、導いた判断

| 資料 | 導いた判断 |
| --- | --- |
| 統括担当のヒアリング済み確定事項(下記 1.1) | 設計の前提。再検討しない |
| `gh issue view 102` | 未決事項の一覧。すべて 1.1 と本書で扱う |
| `docs/requirements.md` §3.6 | 「和了結果を SNS で共有しやすい形にする」【確定】。内容・方式は着手時決定 |
| `docs/design/issue-76-hora-result.md`、`src/ui/result/hora/*` | 画像の文言・数値は既存の `format.ts`(`limitName`・`yakuLabel`・`yakuHanText`・`formatPoints` 等)を再利用し、画面と画像で表記を一致させる |
| `src/ui/result/slots.tsx` | `HoraDetail` は `lazy()` の遅延チャンク。`HoraItem`・`PointDiff` もそこに入るため、共有ボタンの増分は初回 JS に乗らない |
| `src/ui/result/hora/HoraDetail.tsx` の `ResultContext` | 現状は `{ table, rule }` だけで、手牌・副露・ドラ表示牌・抜き北を持たない。画像に必要なので拡張する(3.3) |
| `src/ui/tile/tile-image.ts`・`tile.css`・`base/Front.svg` | 牌は base(Front/Back)+ face の 2 枚重ね、face は 0.9 倍・中央。`Front.svg` は `viewBox="0 0 300 400"` のみで **width/height 属性がない**(図柄 SVG にはある)。canvas 描画時の対策が要る(3.5) |
| `src/core/rule-preset.ts` | ルール名は画像に出さない(ヒアリング回答 Q6)。依存しない |
| `docs/rules/06-ui-md3-protocol.md` | 色はトークン。テーマは `:root`(ライト)と `:root[data-theme="dark"]`。canvas では CSS 変数が使えないので、ライトの値を CSSOM から読む(3.6) |
| `docs/rules/09-bundle-budget-protocol.md` | 基準値の実測・積算・目標値・受け入れ条件での実測記録 |
| `CREDITS.md`・`docs/license-policy.md` | 画像中の第三者素材は牌(CC0)と下地(MIT)のみ。素材クレジットは #69 に任せ、画像にはアプリ名と QR のみ |

### 1.1 ヒアリング済みの確定事項(統括担当から受領)

1. 画像はゲームの和了画面相当(牌姿・和了牌の区別、ドラ・裏ドラ表示牌、役と飜数、符・飜、限度名、点数、ロン/ツモ、自家(親/子)、抜き北の枚数、場況を小さく)。ロン・ツモ別にカード(`HoraItem`)単位で 1 枚ずつ。独自デザイン。第三者素材は牌画像(CC0)・livewing 下地(MIT)のみ。
2. 縦長 4:5、幅 1080(= 1080×1350)。共有用に固定ライト。
3. 生成方式は A(自作 canvas)と C(html-to-image 等)を実測・難易度で比較し推奨案を書く。遅延チャンクとし初回 JS に影響させない。
4. Web Share API(files)優先、非対応は保存(`a[download]`)。可能ならクリップボードコピー。
5. 画像にアプリ名と QR。URL は定数 1 か所。公開 URL は G2(#109)で確定済み: `https://bluekurage119.github.io/mj-3player-calc/`(ユーザー確認済み)。投稿文は `navigator.share` の `text` に URL。QR 生成は自作/小ライブラリを比較。
6. 入口は `PointDiff` の行。点差を控えめなトグルにし、その横に共有ボタン。点差の情報量は減らさない。
7. v1 は和了形のみ。範囲外: #58・#85・#105・#106、ダーク牌画像(#112)、聴牌・何切るの共有。

## 2. 実測・実物調査の結果

### 2.1 初回 JS の基準値【確定】

- `origin/main` = `846ed4c`(このブランチの HEAD と同一)を 2026-11-15 に `vite build` し、`dist/index.html` の `<script type="module" src>` が指す `assets/index-DVojNQjO.js` を `gzip -9 -c | wc -c` で計測: **128,074 B**(統括の直近実測 128,073 B と 1 B 差。`registerSW.js` は module でないため含めない。`modulepreload` なし)。
- 参考: 遅延チャンク `HoraDetail-*.js` = 4,686 B。

### 2.2 生成方式・QR の候補の実測(esbuild `--bundle --minify --format=esm` → `gzip -9`)

一時ディレクトリ(スクラッチパッド)で導入し、必要な関数だけを import して計測した。プロジェクトには導入していない。

| 候補 | 用途 | gzip | ライセンス |
| --- | --- | --- | --- |
| `html-to-image@1.11.13`(`toBlob`) | DOM→画像(方式 C) | 5,469 B | MIT |
| `modern-screenshot@4.6.6`(`domToBlob`) | DOM→画像(方式 C) | 9,550 B | MIT |
| `qrcode-generator@1.4.4` | QR | 8,133 B | MIT |
| `uqr@0.1.2`(`encode` のみ) | QR | 4,084 B | MIT |
| 自作 QR エンコーダ(バイトモード・EC レベル M・型番 1〜5 固定) | QR | 見込み 1,800〜2,500 B(未実装のため積算値) | — |
| 自作 canvas 描画(方式 A) | 画像 | 見込み 3,000〜4,000 B(積算値) | — |

### 2.3 方式 A と C の比較

| 観点 | A: 自作 canvas | C: html-to-image |
| --- | --- | --- |
| 遅延チャンク増分 | 描画 3〜4 kB | ライブラリ 5.5 kB + 画像用 DOM テンプレート(React 部品)1〜2 kB |
| 牌画像 | SVG を `Image` で読込み `drawImage`。`Front.svg` に width/height がないため、SVG 文字列を取得して属性を補う処理が要る | `<img>` の SVG を data URL に埋め込んで `foreignObject` 化。同様に内部で fetch |
| Safari | canvas への SVG 描画は一般に可(実挙動未確認) | `foreignObject` 内の画像が初回描画で欠ける既知の不具合があり、複数回呼ぶ回避策が知られる(実挙動未確認) |
| テーマ固定 | 色を明示的に渡すので固定ライトが自然 | 表示中の DOM/CSS 変数を継承するため、ダーク時にライトを強制する仕組みが別途要る |
| フォント | `ctx.font` にシステムフォントを指定。Web フォントを使っていないので待ち不要 | CSS をそのまま使える |
| 難易度 | 座標計算・折り返しを自前で書く。役が多いとき(最大 ~15 行)の行高調整が要る | レイアウトは CSS で楽。ただし不具合時の原因追跡がライブラリ内部に及ぶ |
| テスト | 描画命令をモック canvas で検証可能。レイアウト計算を純関数に分離できる | jsdom では動かず単体テストが困難 |

**採用: 方式 A(自作 canvas)【確定。Q1 回答】**。根拠: 増分が小さい、Safari の `foreignObject` 問題を避けられる、固定ライトを素直に実現できる、レイアウト計算を純関数としてテストできる。

**QR: `uqr` の `encode` を遅延チャンクで使う【確定。Q2 回答】**。自作より約 2 kB 大きいが、QR は誤りがあっても目視で気づきにくく、自作の誤り訂正(リード・ソロモン)実装・検証のコストに見合わない。どちらも初回 JS には影響しない。

### 2.4 共有 API の対応状況(公開資料に基づく。すべて実挙動未確認)

| 環境 | `navigator.share({ files })` | `navigator.clipboard.write([ClipboardItem png])` | `a[download]` |
| --- | --- | --- | --- |
| iOS/iPadOS Safari 15+ | 対応 | 対応(ユーザー操作内で `ClipboardItem` に Promise を渡す必要) | 対応(13+。「ダウンロード」へ保存) |
| Android Chrome | 対応 | 対応 | 対応 |
| Windows/ChromeOS Chrome・Edge | 対応 | 対応 | 対応 |
| macOS Safari | 対応 | 対応 | 対応 |
| macOS Chrome | 版により未対応(`canShare` で判定) | 対応 | 対応 |
| Firefox(デスクトップ・Android) | 未対応 | 127+ で対応 | 対応 |
| ホーム画面に追加した PWA(iOS) | 対応とされる | 同上 | 新しい表示で開く場合がある |

判定は機能検出のみで行い、UA 判定はしない: `navigator.canShare?.({ files: [file] }) === true` なら共有を出す。`typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write` ならコピーを出す。保存は常に出す。

### 2.5 実物で確認した事実(改訂 1・2)

| 事実 | 確認方法 | 設計への反映 |
| --- | --- | --- |
| 手牌 13 枚(聴牌入力)でも `info.hora` が返り `HoraItem` が出る。14 枚相当(`hand.length % 3 === 2`)では core が**入力の最後の牌**を和了牌として除いて計算する | `src/core/result.ts`(`a.pop()`) | 3.3 |
| 要約カード `SummaryHandRow`(`src/ui/screen/SummaryCard.tsx`)は `splitWinningTile(input.hand, maxHandLength(input.melds))` で、手牌が上限枚数のとき「最後の入力牌を和了牌、残りを整列した門前部分」に分け、**門前部分 → 副露(`meldTiles(meld, rule.red)`)→ 和了牌**の順に並べる。上限未満(13 枚相当)では和了牌を出さず全部を門前部分として整列 | 実物 | 3.3 で同じ関数・同じ並びを使う |
| 副露の展開は `meldTiles(meld, red): TileOrBack[]`(`src/ui/screen/MeldArea.tsx`。`tile === null` は空配列) | grep | 3.3 |
| 裏ドラは `options.riichi !== 'none'` のときだけ数える(`src/core/hora.ts`)。立直の状態は `AppState.handOptions.riichi` | grep | 3.4 |
| 抜き北の入力は `isNukiEnabled(rule)`(`rule.north !== 'yakuhai'`)のときだけ有効 | `src/ui/state/app-state.ts` | 3.4 |
| `src/ui/md` に `IconButton`・`Menu` のラッパーが既にある。`md-menu` 等の本体は初回 JS に既に入っている | 実物と dist の grep | 3.8 は `IconButton` のみ使用 |
| ロン/ツモのバッジ色は E2 確定事項21(ロン=primary、ツモ=tertiary)。限度名は error 色の太字 | `docs/design/issue-76-hora-result.md` 2.6 | 3.4 |
| 05 号のテスト名規約: `<Issue記号>-<記号と番号>: <説明>`。Issue記号は `H2` | `docs/rules/05-*.md` | 4 章 |
| `src/ui/icons/symbol-paths.ts` の既存定数は 13 個。`CREDITS.md` は「10 アイコン分」のまま(過去の更新漏れ) | 実物 | 3 個追加で 16 個。CREDITS を 16 に更新(H2-AC17) |

### 2.6 ヒアリング回答(統括担当経由。すべて確定)

| 論点 | 回答 |
| --- | --- |
| Q1 生成方式 | A(自作 canvas) |
| Q2 QR | `uqr` |
| Q3 保存・コピーの出し方 | メニューにしない。点差の行に「共有・保存・コピー」のアイコンボタンを並べ、点差トグルを控えめにする。UI 監修対象 |
| Q4 役なしカード | 共有ボタン類を出さない |
| Q5 牌姿 | 要約カードと同じ並び「門前部分 → 副露部分 → 和了牌」。下線・枠は使わない |
| Q6 ルール名 | 画像に出さない |
| Q7 読み込み | 共有部品は押下時に初めて読み込む(3.7 のとおり Q3 回答と両立させる) |

## 3. 設計

### 3.1 モジュール構成(新規は `src/ui/share/`)

| ファイル | 役割 | 所属チャンク |
| --- | --- | --- |
| `src/ui/share/share-config.ts` | `SHARE_URL: string \| null = 'https://bluekurage119.github.io/mj-3player-calc/'`(公開 URL の唯一の定義箇所。null 型は将来の保険)・`shareUrlLabel(url)`(表示用文字列。3.4.2)・`APP_NAME = '三麻点数計算機'`(`index.html` の `<title>` と同じ)・画像寸法定数 | share(`APP_NAME` 等を HoraDetail から参照しても可) |
| `src/ui/share/share-data.ts` | `buildShareData(hora, context): ShareData`(純関数) | share |
| `src/ui/share/share-layout.ts` | `layoutShareImage(data, theme): ShareLayout`(純関数) | share |
| `src/ui/share/share-theme.ts` | `ShareTheme` 型と `SHARE_THEME_V1`(見た目の定数。3.4.4) | share |
| `src/ui/share/render-share-image.ts` | `renderShareImage(layout, theme, colors): Promise<Blob>` | share |
| `src/ui/share/svg-image.ts` | `ensureSvgSize(svgText, w, h): string`(純関数)と `loadSvgImage(url, w, h)`(URL 単位でキャッシュ) | share |
| `src/ui/share/light-colors.ts` | `readLightColors(sheets?): ShareColors` | share |
| `src/ui/share/qr.ts` | `qrMatrix(text): boolean[][]`(`uqr` の `encode` のラッパー) | share |
| `src/ui/share/share-actions.ts` | `shareFile`・`saveFile` | share |
| `src/ui/share/share-module.ts` | 上記を束ねて export し、`createShareImage(hora, context): Promise<File>` を提供 | share |
| `src/ui/share/support.ts` | `detectShareSupport(): { share: boolean; copy: boolean }`(同期。3.7) | HoraDetail |
| `src/ui/share/index.ts` | `loadShareModule = () => import('./share-module')`・`detectShareSupport` の再 export | HoraDetail |
| `src/ui/result/hora/ShareControls.tsx` | 共有・保存・コピーのアイコンボタン(3.8) | HoraDetail |
| `src/ui/result/hora/PointDiff.tsx`(改修) | 点差トグルを控えめにし、横に `ShareControls`(型は 3.8) | HoraDetail |

**改修する既存ファイル(製造委託での変更可の範囲。これ以外の既存ファイルは変更禁止。新規は上表の `src/ui/share/*`・`ShareControls.tsx` とそのテスト)**

| ファイル | 変更内容 |
| --- | --- |
| `src/ui/screen/MainScreen.tsx` | `context` に `share` を足す(3.3)。`handOptions` の取り出し |
| `src/ui/result/hora/HoraDetail.tsx` | `ResultContext` に `share?`、`ShareInput` 型の追加(3.3) |
| `src/ui/result/hora/HoraItem.tsx` | `displayFu` 算出の切り出し先の呼び出しへ置換。`PointDiff` に `hora`・`context` を渡す |
| `src/ui/result/hora/format.ts` | `displayFu` 算出関数の追加(切り出し先。挙動不変) |
| `src/ui/result/hora/PointDiff.tsx` | 3.8 |
| `src/ui/result/hora/hora.css` | `.point-diff` の行レイアウト・トグル幅・ボタン間隔 |
| `src/ui/icons/symbol-paths.ts` | `SYMBOL_SHARE`・`SYMBOL_DOWNLOAD`・`SYMBOL_CONTENT_COPY` の追加 |
| `src/ui/icons/index.ts` | 上記 3 定数の名前付き再 export |
| `CREDITS.md` | Material Symbols の件数を 16 に更新 |
| `package.json`・`package-lock.json` | `uqr` の固定版追加 |
| 既存テスト | 変更しない(H2-AC5)。新規テストの追加のみ |

`uqr` は `package.json` の `dependencies` にキャレットなしの固定版(`0.1.2`。製造時点で 2 週間以上前の版であることを確認)で追加する。

### 3.2 型

```ts
// share-data.ts
export interface ShareData {
  by: 'ron' | 'tsumo';
  bodyTiles: Tile[];             // 門前部分(整列済み。3.3)
  meldTiles: TileOrBack[][];     // 副露ごと(展開後に空の副露は除外)
  horaTile: Tile;                // 末尾に置く和了牌
  dora: Tile[];                  // ドラ表示牌(0 枚でもラベル「ドラ」を出し牌の位置は空ける。デザイン案どおり)
  uradora: Tile[] | null;        // 立直系でない、または空なら null
  nuki: number | null;           // 抜き北が無効なら null、有効なら 0 以上(0 でも「北×0」を出す)
  yaku: { label: string; han: string }[];
  rankText: string | null;       // 真の役満(yakumanPoint > 0)のときだけ null(3.4.1)
  limitName: string | null;
  pointsText: string;
  situation: string;             // ヘッダー文字行(3.4.1)
  appName: string;
  url: string | null;            // SHARE_URL(QR・投稿文に使う完全 URL)
  urlLabel: string | null;       // 画像に描く URL 文字(3.4.2)
}
export interface ShareColors {   // `--md-sys-color-*` のライト値
  surface; onSurface; onSurfaceVariant; surfaceContainerHighest;
  primary; onPrimary; tertiary; onTertiary; error;      // 各 string
}
```

ルール名・`findRulePreset` には依存しない(Q6)。

### 3.3 `ResultContext` の拡張と牌姿の算出

```ts
export interface ResultContext {
  table: Table;
  rule: Pick<Rule, 'roundedMangan' | 'accumlatedYakuman'>;
  share?: ShareInput | undefined; // 追加。未指定なら共有ボタン類を出さない
}
export interface ShareInput {
  hand: Tile[]; melds: Meld[]; dora: Tile[]; uradora: Tile[]; nuki: number;
  riichi: HandOptions['riichi'];
  red: Rule['red'];
  nukiEnabled: boolean;           // isNukiEnabled(rule)。MainScreen で既に import 済み
}
```

- `MainScreen.tsx` は `useAppState()` から `handOptions` も取り出し、`context` に `share: { hand: input.hand, melds: input.melds, dora: input.dora, uradora: input.uradora, nuki: input.nuki, riichi: handOptions.riichi, red: rule.red, nukiEnabled: isNukiEnabled(rule) }` を足す。初回 JS には値の受け渡しのみが増える。
- **牌姿(要約カードと同じ)**: `const { body, winning } = splitWinningTile(hand, maxHandLength(melds))`。
  - `winning !== null`(14 枚相当): `bodyTiles = body.map(b => b.tile)`、`horaTile = winning.tile`。core も最後の入力牌を和了牌として計算するので `hora.horaTile` と一致する(一致しない場合は `hora.horaTile` を優先し、`bodyTiles` は `body` のまま)。
  - `winning === null`(13 枚相当): `bodyTiles = body.map(b => b.tile)`(13 枚相当すべて。同種の牌があっても除かない。例: 双碰)、`horaTile = hora.horaTile` を末尾に足す。要約カードはこの場合和了牌を出さないが、画像は和了画面なので末尾に和了牌を置く(意図的な差分)。
  - 並び: `bodyTiles` → 各副露 `meldTiles(meld, red)`(空は除外) → `horaTile`。区切りは間隔だけで表し、下線・枠は付けない(Q5)。間隔は門前と副露の間・副露同士・和了牌の前にそれぞれ牌幅の 0.3 倍。
  - 描画枚数 = `bodyTiles.length` + 各副露の枚数の合計(槓は 4 枚)+ 1。
  - `splitWinningTile`・`maxHandLength`・`meldTiles` は既存関数をそのまま import する(share チャンクに取り込まれる。`meldTiles` の移動は不要)。

### 3.4 画像の内容とレイアウト(ユーザーのデザイン案に準拠)

正本はユーザーのデザイン案(簡易デザイン。文言・配置のみが正本で、サンプルの数値は誤り。数値は実データから出す)。v1 は案どおりの簡易な構成とし、見た目は 3.4.3 の 4 点だけ整える。

#### 3.4.1 構成(上から。寸法 1080×1350、`devicePixelRatio` に依存させない、左右余白 64)

| # | 要素 | 内容 | 色(ShareTheme の役割 → トークン) |
| --- | --- | --- | --- |
| 1 | ヘッダー文字行 | `situation` = 「<場風>場 <N>本場 供託<N> <自風>家」(例「南場 1本場 供託0 南家」)。0 も省略しない。卓の名称・局数は出さない(局数はアプリの入力に無い。`Table` は round/seat/continue/deposit のみ) | 本文 → `onSurface` |
| 2 | ドラ・裏ドラ・抜き北 | 1 行に「ドラ」+表示牌、「裏ドラ」+表示牌、「北×N」。表示条件は 3.4.2 | ラベル → `onSurfaceVariant` |
| 3 | 牌列 | 3.3 の並び(門前 → 副露 → 和了牌)。区切りは間隔のみ | 牌は SVG のまま |
| 4 | ツモ/ロンの印 | 牌列の右上に重ねる円形の印(文字「ツモ」/「ロン」)。色は E2 確定事項21 に合わせる: ロン=`primary` 地・`onPrimary` 文字、ツモ=`tertiary` 地・`onTertiary` 文字 | 同左 |
| 5 | 役一覧 | 左に役名、右に飜(`yakuHanText`)。抜き北は既存どおり「抜きドラ N飜」として含まれる | `onSurface` |
| 6 | 符・飜 | `rankText`。`HoraItem.tsx` と同じ判定: `score.yakumanPoint === 0` のとき `` `${displayFu !== null ? `${displayFu}符 ` : ''}${score.han}飜` ``、真の役満(`yakumanPoint > 0`。core の `hora-score.ts` で han 0・fu null)のときだけ出さない。**数え役満(yakumanPoint 0・13 飜以上)は「◯符 N飜」を出す**(E2・デザイン案と同じ。既定) | `onSurfaceVariant` |
| 7 | 点数 | `pointsText`(最大の要素)。左寄せ | `onSurface`・太字 |
| 8 | 点数の格 | `limitName`(満貫等。無ければ出さない)。点数と同じ行の右側に大きく | `error`(E2 と同じ) |
| 9 | 下部の帯 | y=1150〜1350 の全幅帯。左にアプリ名(大)とその下に URL の文字、右下に QR(168×168) | 帯 → `surfaceContainerHighest`、文字 → `onSurface`/`onSurfaceVariant` |

- 支払い内訳(`payDetail`)と親/子の表記はデザイン案に無いため**出さない**(自風「◯家」で親子が分かる)。`ShareData` から `dealer`・`payDetail` を除く。→ 判断事項
- ルール名は出さない(Q6)。

#### 3.4.2 表示条件

- ドラ: 表示牌が 0 枚でもラベル「ドラ」を出し、牌の位置は空ける(デザイン案どおり。ユーザー判断待ち)。
- 裏ドラ: 立直系(`riichi !== 'none'`)かつ 1 枚以上のときだけ出す(P4 の確定どおり)。デザイン案は常時表示に見えるが、裏ドラは立直時だけ数えるため。→ 判断事項
- 北: `nukiEnabled` のときは 0 でも「北×0」を出す(デザイン案どおり)。北が役牌ルールのときは出さない。→ 判断事項(前版の「0 なら省略」から変更)
- QR: 公開 URL `https://bluekurage119.github.io/mj-3player-calc/`(スキーム・末尾スラッシュ付きの完全 URL)のみを符号化する(A 案)。`SHARE_URL` が null・空文字・`https://` で始まらない値のときは、将来の保険として QR も URL 文字も描かず領域を空けたままにする(単体テストで担保)。
  - **URL 文字の表記(既定)**: スキームなし・末尾スラッシュなしの `bluekurage119.github.io/mj-3player-calc`(39 文字)。`shareUrlLabel` が `^https?://` と末尾 `/` を除いて作る。28px のサンス体で 1 文字平均 0.55〜0.6em とすると約 600〜655px で、最大幅 760px に縮小なしで収まる(最小 24px までの縮小は保険)。スキーム付き・末尾スラッシュ付き(48 文字)だと約 740〜810px で、28px では収まらない場合があり、約 26px への縮小が要る(ユーザー判断待ち)。位置・大きさは v2 の B 案(URL+牌列コード)でも変えない。
  - **QR 領域**: 右端 x=1016(=1080−右余白 64)、領域は x=848〜1016・y=1166〜1334(168×168。帯 y=1150〜1350 の上下内側 16)。
  - **地と明暗**: 帯は `surfaceContainerHighest` だが、QR 領域 168×168 全体を `surface`(ライトの白地)で塗り、モジュールは `onSurface` で描く。帯の色の上に直接は描かない。
  - **uqr の API(`node_modules/uqr/dist/index.d.ts` で確認)**: `encode(data, { ecc?: 'L'|'M'|'Q'|'H', border?: number }): { size: number; data: boolean[][] }`。既定の border の値に依存しないよう、`qrMatrix` は **`border: 0` を明示**し、`ecc: 'M'` とする。
  - **クワイエットゾーン**: 描画側で 4 モジュール分(規格値。最低でも 2 以上)を確保する。モジュール幅 = `floor(168 / (size + 2×4))` px(整数に丸めてにじみを防ぐ)。余りは均等に周囲の白地へ回す。型番が上がりモジュール幅が 3px 未満になる場合は ecc を 'L' に下げる(B 案への備え)。
  - **左の文字との境界**: アプリ名・URL 文字は x=64 から、最大幅 = 848 − 24 − 64 = 760px。超える場合はフォントを縮小し(最小 24px)、なお超えるなら末尾を「…」で切る。

#### 3.4.3 v1 で整える見た目の土台(4 点)【設計案・UI 監修で調整可】

1. 文字の階層: 点数 120px 太字、点数の格 96px 太字、役名・飜 40px、ヘッダー・ドラ欄・符飜 36px、帯のアプリ名 56px 太字・URL 28px。
2. 揃え: 役名は左余白、飜は 1 本の右揃え線(x=720)。点数と格のベースラインを揃える。
3. 余白: 要素間 32、役一覧の行高 = min(64, 利用可能高さ / 役数)、最低フォント 30px。
4. 帯の区切り: 帯は `surfaceContainerHighest`、本体は `surface`。線は使わない。

牌幅: 牌列 = `min(64, 利用可能幅 / 換算枚数)`(間隔 0.3 枚分を換算に含む)、ドラ欄 = 40。

#### 3.4.4 v2 の再スキンに備えた構造(確定設計)

- **入口は 1 つ**: 結果 → 画像は `createShareImage(hora, context): Promise<File>`(`share-module.ts`)だけを通る。内部は `buildShareData`(内容)→ `layoutShareImage(data, theme)`(座標)→ `renderShareImage(layout, theme, colors)`(描画)の 3 段。
- **見た目の定数を分離**: 配色の役割(上表の「役割 → トークン名」)・フォントサイズ・余白・寸法・QR 枠は `src/ui/share/share-theme.ts` の `SHARE_THEME_V1: ShareTheme` に集約し、`share-layout.ts`・`render-share-image.ts` に数値・トークン名を直書きしない。
- v2 は `share-theme.ts` の差し替え(と必要なら `share-layout.ts`/`render-share-image.ts` の差し替え)だけで済み、`buildShareData`・共有動作・入口は変えない。
- 色はトークン名で持ち、`readLightColors` が実値に解決する(新しい色は足さない。06 号)。

### 3.5 牌の描画

`tileImageOf(tile)` の base を全面、face を 0.9 倍・中央(`tile.css` と同じ)。`loadSvgImage` は fetch → `ensureSvgSize`(ルート `<svg` に `width` が無ければ `width="300" height="400"` を挿入) → Blob URL → `Image.decode()`。失敗は例外とし 3.8 のエラー表示へ。

### 3.6 固定ライトの色の取得

`document.styleSheets` の規則を走査し、`selectorText === ':root'` かつ `--md-sys-color-surface` を持つ規則から `--md-sys-color-<名前>` を読む(`tokens.css` は `:root` がライト)。見つからなければ `getComputedStyle(document.documentElement)` で代替。`readLightColors(sheets?)` は引数で規則一覧を差し替えられるようにする。

### 3.7 共有・保存・コピーの動作(Q3・Q7 の両立)

Q7(押下時に初めて読み込む)のため、事前生成はしない。各ボタンの押下時の動作を次のとおり確定する。

- **出し分け(表示時に同期判定。share チャンクは読まない)**: `detectShareSupport()` は
  - `share`: `typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([], 'probe.png', { type: 'image/png' })] })`
  - `copy`: `typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function'`
  - 保存は常に出す。
  - `share` が偽なら共有ボタンを出さない。`copy` が偽ならコピーボタンを出さない。
- **コピー**: クリックハンドラ内で**同期に** `navigator.clipboard.write([new ClipboardItem({ 'image/png': loadShareModule().then(m => m.createShareImage(...)) })])` を呼ぶ(Safari はユーザー操作の同期区間で `ClipboardItem` を作れば、中身は Promise でよい)。成功時は `role="status"` で「コピーしました」を 4 秒。
- **保存**: 押下 → `loadShareModule()` → 生成 → `saveFile`(`a[download]` + `click()`、1 秒後に `revokeObjectURL`)。
- **共有**: 押下 → 読み込み・生成 → `navigator.share({ files: [file], text })`。`share()` がユーザー操作の失効で `NotAllowedError` になった場合は、生成済みの `File` をそのボタンに保持し、`role="status"` で「準備ができました。もう一度押してください」を出す。保持中の再押下では `await` を挟まず同期に `share()` を呼ぶ。`AbortError`(利用者が閉じた)は無視。その他の例外は「画像を作成できませんでした」。
- 保持した `File` は、そのカードの `hora` または `context.share` が変わったら破棄する。
- 処理中は 3 つのボタンをすべて `disabled`。
- ファイル名: `mj3calc-<ron|tsumo>-<yyyyMMdd-HHmmss>.png`。`text` は「本文 + 改行 + URL」とし、確定値では `"三麻点数計算機\nhttps://bluekurage119.github.io/mj-3player-calc/"`(本文は `APP_NAME`。URL は QR と同じ完全 URL)。`SHARE_URL` が無効値なら本文だけを渡す。

### 3.8 入口(`PointDiff` の行。UI 監修対象)

- 行は横並び: 左に点差トグル(`Disclosure` に `className="point-diff__toggle"` を渡して内容幅にする。文言「点差」・開閉アイコンは現状維持)。右端寄せでアイコンボタン群を **共有 → 保存 → コピー** の順に並べる(`src/ui/md` の `IconButton`。`aria-label` は「画像を共有」「画像を保存」「画像をコピー」。アイコンは Material Symbols の `share`・`download`・`content_copy`)。
- 点差の一覧(`pointDiffRows` の全行)はトグルを開いたとき行の下に全幅で出し、内容不変。
- **寸法(375px 幅)**: カード内の利用幅は約 327px(製造時に実測し PR に記録)。必要幅 = トグル(文言+アイコン+左右余白で約 80px)+ ボタン 48×3 + 間隔 8×3(トグルとボタン群の間 8、ボタン間 8×2)= 248px で収まる。ボタンの当たり領域は 48×48 以上、隣接ボタンの当たり領域は重ならず間隔 8px 以上。間隔の値は既存の他ボタン群と同じトークン(無ければ 8px を CSS 変数として 1 か所に定義)。
- 非対応で欠けたボタンの位置は詰める(右端寄せのまま)。
- 役なしカード: 共有ボタン類を出さない(Q4。役なしでは `PointDiff` 自体を出していない)。
- `context?.share` 未指定ならボタン類を出さない。
- アイコンの path は無改変で `symbol-paths.ts` に追加し(既存 13 個 + 3 = 16 個)、`icons/index.ts` から名前付きで再 export する。`CREDITS.md` の「10 アイコン分」を「16 アイコン分」に更新する(既存 13 個との差 3 個は過去の更新漏れで、本 Issue でまとめて直す)。
- `PointDiffProps`: `{ payment: Payment; hora?: ScoredHora | undefined; context?: ResultContext | undefined }`。`hora` と `context?.share` の両方があるときだけ `ShareControls` を出す。`ShareControlsProps`: `{ hora: ScoredHora; context: ResultContext & { share: ShareInput } }`。

### 3.9 遅延読み込みとバンドル積算(09 号)

| 区分 | 内訳 | 見込み |
| --- | --- | --- |
| 初回 JS | `MainScreen` の `share` オブジェクト組み立て(`isNukiEnabled` は既に import 済み) | +30〜+80 B |
| HoraDetail チャンク(基準 4,686 B) | `ShareControls`・`PointDiff` 改修・アイコン 3 個・`detectShareSupport`・`displayFu` 切り出し・`IconButton` 参照(本体は初回 JS 既存) | +1,000〜+1,600 B |
| share チャンク(新規) | 描画・レイアウト・色取得 3〜4 kB、`uqr` 4.1 kB、`splitWinningTile` 等は初回 JS 既存のため参照のみ | 約 7,000〜8,500 B |

- **初回 JS の目標値: 128,074 + 80 = 128,154 B 以下**(目標値。超過は不合格にしない)。

## 4. 受け入れ条件

記号は `H2-ACn`。単体テストは 05 号に従い `H2-ACn: <説明>` と名付ける(例 `H2-AC9-a: 14枚で最後の入力牌を和了牌として末尾に置く`、`H2-AC9-b: 13枚の双碰で同種牌を門前部分に残す`)。「プレビュー」は `npm run build && npm run preview` を指す。

| 記号 | 手順 | 合格の条件 |
| --- | --- | --- |
| H2-AC1 | `npm run build` 後、2.1 と同じ方法で初回 JS を計測 | 基準 128,074 B・実測・増分・積算との差を PR 本文に記録。`grep -l "renderShareImage" dist/assets/index-*.js` がヒットしない |
| H2-AC2 | `dist/assets/` を列挙し gzip を計測。プレビューで DevTools の Network を開き、和了結果を表示 → 保存ボタンを押す | share 用の別チャンクがあり、share・HoraDetail チャンクの gzip を PR に記録。share チャンクは結果表示時には取得されず、押下後に初めて取得される |
| H2-AC3 | プレビューで和了形(ロン・ツモ両方が出るもの)を入力。375×812 で表示 | 各和了カード最下段に「点差」トグルとボタン群が同じ 1 行に並ぶ。`document.documentElement.scrollWidth <= 375` |
| H2-AC4 | H2-AC3 の状態で各ボタンとトグルの `getBoundingClientRect()` を取得 | 各ボタン 48×48 以上。隣接要素(トグル・ボタン同士)の矩形が重ならず、間隔 8px 以上。利用幅の実測値を PR に記録 |
| H2-AC5 | 点差トグルを押す。`npm test` を実行 | 改修前と同じ行数・文言の点差一覧が行の下に出る。`format.test.ts` の E2-PD1、`HoraDetail.test.tsx` の E2-18・E2-21 が改名・削除なしで通る |
| H2-AC6 | 役なしになる形を入力 | 役なしカードに共有・保存・コピーのボタンが無い |
| H2-AC7 | Chrome デスクトップで、立直なし・ドラ 1 枚・抜き北 1・14 枚の和了形を入力し、ロンとツモのカードでそれぞれ「画像を保存」 | 2 つの PNG がそれぞれ 1080×1350。上から ヘッダー文字行(「<場風>場 <N>本場 供託<N> <自風>家」)・ドラ欄・牌列・役一覧・符飜・点数と格・下部の帯 の順。右上の印がロン=primary、ツモ=tertiary。点数が画像中で最大の文字。裏ドラ欄・ルール名・卓の名称・支払い内訳・親/子の文字が無い。数値が画面の和了カードと一致 |
| H2-AC8 | H2-AC7 の手で立直をかけ裏ドラ表示牌を 1 枚入力して保存。抜き北 0 で保存。ルールの北を役牌にして保存 | 1 つ目は裏ドラ欄が出る。2 つ目は「北×0」が出る。3 つ目は北の表示が無い |
| H2-AC9 | 14 枚の和了形と、13 枚の双碰待ち(例: `11m22p` を含み和了牌 `1m`)でそれぞれ保存し、要約カードと見比べる | 並びが「門前部分 → 副露 → 和了牌」。14 枚では要約カードと同じ牌・同じ順。13 枚では門前部分が入力 13 枚すべて(`1m` が 2 枚残る)で、末尾に和了牌 `1m`。下線・枠が無い。単体テスト H2-AC9-a/b がある |
| H2-AC10 | 暗槓 1・ポン 1 を含む和了形で保存 | 副露が要約カードと同じ牌(暗槓の裏向き含む)・順で描かれ、牌姿が 1 行に収まり右端が余白内 |
| H2-AC11 | 真の役満(例: 大三元)と、数え役満(13 飜以上の通常役。例: 立直・門前清自摸和・混一色・対々和・三暗刻・ドラで 13 飜以上になる手)でそれぞれ保存 | 真の役満は符・飜の文字が無く、格(役満)が error 色。数え役満は画面の和了カードと同じ「◯符 N飜」が出て、格が error 色 |
| H2-AC12 | ダークテーマで H2-AC7 の手を保存し、ライトでの画像と並べる | 配色が同じ |
| H2-AC13 | `share-config.ts` を変更せずにビルドし、和了カードから画像を保存 | `grep -rn "SHARE_URL" src/ui/share/share-config.ts` で値が `https://bluekurage119.github.io/mj-3player-calc/`。帯に URL 文字 `bluekurage119.github.io/mj-3player-calc` が 1 行で出る。画像を画像編集ソフトで開き、QR 領域が x=848〜1016・y=1166〜1334 の白地(`surface`)で、黒いモジュールの外側に 4 モジュール分以上の白地があること、URL 文字の右端が x=824 以下であることを確認。さらに PNG を等倍で画面表示し、iOS 標準カメラと Android 標準カメラ(どちらか片方でも可)で読むと `https://bluekurage119.github.io/mj-3player-calc/` が表示される。`grep -rn "SHARE_URL =" src` が 1 件。URL 未設定・無効値時の保険動作(QR・URL 文字を描かない、投稿文が本文のみ)は単体テストで確認する(H2-AC14) |
| H2-AC14 | 単体テストを確認 | 少なくとも: `buildShareData`(H2-AC9-a/b、赤5、裏ドラ非立直で null、抜き北が有効かつ 0 枚で `nuki === 0`、抜き北無効で `nuki === null`、ドラ 0 枚で `dora` が空配列、場況、真の役満で `rankText` null、数え役満で `rankText` が「◯符 N飜」)、`qrMatrix`(`encode` に `border: 0` を渡す)、`shareUrlLabel`(確定 URL → `bluekurage119.github.io/mj-3player-calc`)、URL が null・空・`https://` 以外で `urlLabel`/QR が無く投稿文が本文のみ、確定 URL で投稿文が `"三麻点数計算機\nhttps://bluekurage119.github.io/mj-3player-calc/"`、`layoutShareImage`(役 15 行でもフッターと重ならない、副露 4 組でも牌が余白内)、`ensureSvgSize`、`readLightColors`、`detectShareSupport`(canShare 無し・偽・真、ClipboardItem 無し)、`ShareControls`(`context.share` 未指定で出ない、非対応のボタンが出ない、コピー押下で `ClipboardItem` と `clipboard.write` が `await` 前に同期に呼ばれる、共有の `NotAllowedError` 後の再押下で `share` が同期に呼ばれる) |
| H2-AC15 | Firefox デスクトップのプレビューで和了カードを表示 | 共有ボタンが無い。保存で PNG が保存される。コピーは Firefox 127+ なら出て貼り付けできる |
| H2-AC16 | Android Chrome または iOS Safari の実機で共有・コピー | 共有シートが画像付きで開き(再押下を求められた場合は 2 回目で開く)、牌が欠けていない。コピーした画像を他アプリに貼り付けられる。実機が無い環境は PR に「実挙動未確認」と環境名を書く |
| H2-AC17 | `git diff main -- CREDITS.md src/ui/icons/symbol-paths.ts` アイコン 3 個の追加(計 16 個)と、CREDITS の「16 アイコン分」への更新 |
| H2-AC18 | `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/ui/share src/ui/result/hora/*.css src/ui/result/hora/*.tsx` | ヒットなし |
| H2-AC19 | `package.json` を確認 | `uqr` がキャレットなしの固定版。ライセンス(MIT)を PR に記載し、CREDITS 掲載要否を #69 の方針に照らして PR に書く |
| H2-AC20 | `npm run lint`・`typecheck`・`format:check`・`npm test`、ホームディレクトリ名の grep | すべて通過・ヒットなし |
| H2-AC21 | UI 監修 | 統括経由でユーザーが確認する: (1) 375px での点差の行(トグルの控えめさ・ボタン並び)、(2) 画像をデザイン案と並べ、構成・配置が一致し 3.4.3 の 4 点(文字の階層・揃え・余白・帯)が整っていること。牌幅式の最大 64 で牌列の左右に余白が多く見える点も確認。監修での変更は `share-theme.ts` の値と 3.8 の範囲で行う |
| H2-AC22 | `grep -nE "[0-9]+(\.[0-9]+)?|--md-sys|'(primary|tertiary|surface|onSurface|error)" src/ui/share/share-layout.ts src/ui/share/render-share-image.ts src/ui/share/share-data.ts` を実行し、各ヒット行を目視 | 寸法・フォントサイズ・倍率(1 桁も含む)・トークン名・色の役割名の直書きが無く、すべて `share-theme.ts` の定数参照。許容するのは 0・1・2(半分・両側の計算)と配列添字のみ。ロン/ツモ等の色の役割割り当ても `share-theme.ts` 側に定義されている。`createShareImage` 以外に結果→画像の公開入口が無い |

## 5. 後続 Issue への引き継ぎ

- **G2(#109)**: 完了済み。確定した公開 URL を `SHARE_URL` の初期値にしている。URL が変わる場合は `share-config.ts` の 1 か所を直すだけで QR・URL 文字・投稿文が追随する。
- **#112**: 共有画像は固定ライト。ダーク版を作るなら `readLightColors` を差し替え可能にする。
- **#69**: 画像に素材クレジットは入れない。`uqr` と追加アイコンの掲載要否を #69 で扱う。
- **v2(聴牌・何切るの共有)**: `ShareData` は和了専用。牌描画・色取得・共有動作を再利用する。
- **E2 の監修でバッジ色を入れ替えた場合**: `share-theme.ts` の役割割り当て(ロン/ツモ → トークン)も同時に入れ替える(色は `share-data.ts` には持たない)。
- **#58・#85・#105・#106**: 範囲外。

## 5.1 v2 持ち越し(事実のみ。Issue 化はしていない)

- 共有画像のデザイン強化(v1 は簡易デザイン。`share-theme.ts` と描画の差し替えで行う想定)。
- QR の B 案(公開 URL+牌列コードで手牌を復元)。位置・大きさは v1 の枠をそのまま使う。
- 自由記述コメント欄(卓の名称等を含む)。

## 6. 実挙動未確認の箇所(まとめ)

- 2.4 の全環境の共有・コピー・保存の挙動。
- canvas への SVG 描画(width/height 補完後)の Safari・Firefox での結果。
- 押下後に読み込み・生成してから呼ぶ `share()` が各環境で受理されるか(受理されない場合は 3.7 の再押下で回避。初回で通るかは未確認)。
- 押下後の `a[download]` が iOS Safari で保存として動くか。
- 375px での利用幅(約 327px は推定)。
- 2.2・3.9 の自作部分の増分(積算値)。
