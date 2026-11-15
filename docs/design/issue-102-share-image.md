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
| `src/ui/share/share-layout.ts` | `layoutShareImage(data, theme, measureTextWidth?): ShareLayout`(純関数。文字幅は引数の計測関数で得る。3.4.6) | share |
| `src/ui/share/share-theme.ts` | `ShareTheme` 型と `SHARE_THEME_V1`(見た目の定数。3.4.4) | share |
| `src/ui/share/render-share-image.ts` | `renderShareImage(layout, theme, colors): Promise<Blob>` | share |
| `src/ui/share/svg-image.ts` | `ensureSvgSize(svgText, w, h): string`(純関数)と `loadSvgImage(url, w, h)`(URL 単位でキャッシュ) | share |
| `src/ui/share/light-colors.ts` | `readLightColors(sheets?): ShareColors`(Container 系 4 色を含む `ShareColors` の全色をライト値で解決) | share |
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
  dora: TileOrBack[];            // 常に長さ 5。入力済みの表示牌を先頭から、残りは { type: 'back' }(Back.svg)
  uradora: TileOrBack[];         // 常に長さ 5。立直系なら入力済みを表向き+残り裏、立直なしは 5 枚とも裏(3.4.2(a))
  nuki: number | null;           // 抜き北が無効なら null、有効なら 0 以上(0 でも「北×0」を出す)
  yaku: { label: string; han: string }[];
  rankText: string | null;       // 真の役満(yakumanPoint > 0)のときだけ null(3.4.1)
  limitName: string | null;
  totalText: string;             // 大きな数字。`${formatNumber(payment.total)}点`(本場・供託を含まない。ロン・ツモ共通。例「1,500点」)
  declarationText: string | null; // ツモの申告。`formatPoints(payment)`(例「500・1,000」「1,000オール」。区切りは実物の `TSUMO_SEPARATOR` = 「・」)。ロンは null
  situation: string;             // ヘッダー文字行(3.4.1)
  appName: string;
  url: string | null;            // SHARE_URL(QR・投稿文に使う完全 URL)
  urlLabel: string | null;       // 画像に描く URL 文字(3.4.2)
}
export interface ShareColors {   // `--md-sys-color-*` のライト値
  surface; onSurface; onSurfaceVariant; surfaceContainerHighest;
  primaryContainer; onPrimaryContainer; tertiaryContainer; onTertiaryContainer; // 印(3.4.5)。tokens.css に存在
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
| 1 | 見出し | **3.4.8【確定】**: 左に文字「<場風>場・<自風>家」のみ、右に本場・供託・北のピル。卓の名称・局数は出さない | 3.4.8 |
| 2 | ドラ・裏ドラ・抜き北 | **3.4.8【確定】**: 「ドラ」「裏ドラ」のラベルピル+牌 5 枚のチップ(北は見出しのピル)。5 枚固定・未入力は裏向き・立直なしは裏ドラ 5 枚裏向き・北は抜き有効なら 0 でも出す、は維持 | 3.4.8 |
| 3 | 牌列 | 3.3 の並び(門前 → 副露 → 和了牌)。区切りは間隔のみ | 牌は SVG のまま |
| 4 | ツモ/ロンの印 | **和了牌の背面に敷く**印(土台。文字「ツモ」/「ロン」)。和了牌は印の手前に全面描画し、牌より大きい印がはみ出して和了牌だと分かる。大きく・薄く(3.4.5)。色の系統は E2 確定事項21 に合わせ、淡い Container 系: ロン=`primaryContainer` 地・`onPrimaryContainer` 文字、ツモ=`tertiaryContainer` 地・`onTertiaryContainer` 文字【設計案・UI 監修で調整可】 | 同左(新色なし) |
| 5 | 役一覧 | **3.4.8【確定】**: 通常は 2 列×最大 6 行のチップ+飜数の塗りバッジ(縦読み)、真の役満は 1 列×最大 5 行の大きめチップ(バッジなし) | 3.4.8 |
| 6 | 符・飜と申告の行 | 左に `rankText`(大きく。初期 72px)、同じ行の右に `declarationText`(ツモのみ。ロンは右側を空ける)。寸法・縮小は 3.4.6。`rankText` は `HoraItem.tsx` と同じ判定: `score.yakumanPoint === 0` のとき `` `${displayFu !== null ? `${displayFu}符 ` : ''}${score.han}飜` ``、真の役満(`yakumanPoint > 0`。core の `hora-score.ts` で han 0・fu null)のときだけ出さない。**数え役満(yakumanPoint 0・13 飜以上)は「◯符 N飜」を出す**(E2・デザイン案と同じ。既定)。真の役満では `rankText` が無いので、ツモは申告だけを左寄せで出し、ロンはこの行を出さずに詰める | 符・飜 → `onSurface`、申告 → `onSurfaceVariant` |
| 7 | 点数 | `totalText`(合計。ラベルなしの「N点」。最大の要素)。左寄せ | `onSurface`・太字 |
| 8 | 点数の格 | `limitName`(満貫等。無ければ出さない)。点数と同じ行の右端に大きく(変更なし) | `error`(E2 と同じ) |
| 9 | 下部の帯 | y=1150〜1350 の全幅帯。左にアプリ名(大)とその下に URL の文字、右下に QR(168×168) | 帯 → `surfaceContainerHighest`、文字 → `onSurface`/`onSurfaceVariant` |

- 支払い内訳(`payDetail`。本場込みの各家の支払い)と親/子の表記はデザイン案に無いため**出さない**(自風「◯家」で親子が分かる)。`ShareData` から `dealer`・`payDetail` を除く。【設計案・UI 監修で調整可】
- ただし**ツモの申告(`formatPoints(payment)`。本場を含まない)は符・飜の右に出す**(ユーザー確定)。大きな数字は合計 `payment.total`(本場・供託を含まない)。
- ルール名は出さない(Q6)。

#### 3.4.2 表示条件

- ドラ・裏ドラ(ユーザー確定): 欄は常に表示し、それぞれ常に 5 枚並べる。入力していない牌は裏向き(`tileImageOf({ type: 'back' })` = `src/ui/tile/base/Back.svg`。実物で確認)。表示牌の入力上限はドラ・裏ドラとも 5 枚(`src/ui/state/app-state.test.ts` 1282 行付近で、テンキー確定後の `input.dora.length` が 5 で止まることを確認)。
  - (a) 立直なしで裏ドラ表示牌が入力されている場合: **5 枚とも裏向き**(裏ドラは数えないため、入力済みを見せない)【確定】。立直ありのときは入力済みを表向き+残りを裏向き。
  - (c) 寸法: 1 行に並べる。表示牌の牌幅 `dora.tileWidth = 40`(高さ 53)、牌間 4。概算幅: 「ドラ」72 + 8 + 牌 5×40+4×4=216 → 296、間隔 32、「裏ドラ」108 + 8 + 216 → 332、間隔 32、「北×4」約 100 → 合計約 792(北なしは約 660)で、利用幅 952 に収まる(超える場合は `dora.tileWidth` を 36 に縮める)。北×N はドラ欄と同じ行の右に置く。
- (旧「裏ドラは立直のときだけ出す」「ドラ 0 枚はラベルのみ」は上記で置き換え)
- 北: `nukiEnabled` のときは 0 でも「北×0」を出す(デザイン案どおり)。北が役牌ルールのときは出さない。【設計案・UI 監修で調整可】(前版の「0 なら省略」から変更)
- QR: 公開 URL `https://bluekurage119.github.io/mj-3player-calc/`(スキーム・末尾スラッシュ付きの完全 URL)のみを符号化する(A 案)。`SHARE_URL` が null・空文字・`https://` で始まらない値のときは、将来の保険として QR も URL 文字も描かず領域を空けたままにする(単体テストで担保)。
  - **URL 文字の表記(既定)**: スキームなし・末尾スラッシュなしの `bluekurage119.github.io/mj-3player-calc`(39 文字)。`shareUrlLabel` が `^https?://` と末尾 `/` を除いて作る。28px のサンス体で 1 文字平均 0.55〜0.6em とすると約 600〜655px で、最大幅 760px に縮小なしで収まる(最小 24px までの縮小は保険)。スキーム付き・末尾スラッシュ付き(48 文字)だと約 740〜810px で、28px では収まらない場合があり、約 26px への縮小が要る【設計案・UI 監修で調整可】。位置・大きさは v2 の B 案(URL+牌列コード)でも変えない。
  - **QR 領域**: 右端 x=1016(=1080−右余白 64)、領域は x=848〜1016・y=1166〜1334(168×168。帯 y=1150〜1350 の上下内側 16)。
  - **地と明暗**: 帯は `surfaceContainerHighest` だが、QR 領域 168×168 全体を `surface`(ライトの白地)で塗り、モジュールは `onSurface` で描く。帯の色の上に直接は描かない。
  - **uqr の API(`node_modules/uqr/dist/index.d.ts` で確認)**: `encode(data, { ecc?: 'L'|'M'|'Q'|'H', border?: number }): { size: number; data: boolean[][] }`。既定の border の値に依存しないよう、`qrMatrix` は **`border: 0` を明示**し、`ecc: 'M'` とする。
  - **クワイエットゾーン**: 描画側で 4 モジュール分(規格値。最低でも 2 以上)を確保する。モジュール幅 = `floor(168 / (size + 2×4))` px(整数に丸めてにじみを防ぐ)。余りは均等に周囲の白地へ回す。型番が上がりモジュール幅が 3px 未満になる場合は ecc を 'L' に下げる(B 案への備え)。
  - **左の文字との境界**: アプリ名・URL 文字は x=64 から、最大幅 = 848 − 24 − 64 = 760px。超える場合はフォントを縮小し(最小 24px)、なお超えるなら末尾を「…」で切る。

#### 3.4.3 v1 で整える見た目の土台(4 点)【設計案・UI 監修で調整可】

1. 文字の階層: 点数(合計)120px 太字、点数の格 96px 太字、符・飜と申告 72px(3.4.6)、役名・飜 40px、ヘッダー・ドラ欄 36px、帯のアプリ名 56px 太字・URL 28px。
2. 揃え: 役名は左余白、飜は 1 本の右揃え線(x=720)。点数と格のベースラインを揃える。
3. 余白: 要素間 32、役一覧の行高 = min(64, 利用可能高さ / 役数)、最低フォント 30px。
4. 帯の区切り: 帯は `surfaceContainerHighest`、本体は `surface`。線は使わない。

牌幅: 牌列 = `min(64, 利用可能幅 / 換算枚数)`(間隔 0.3 枚分を換算に含む)、ドラ欄 = 40。

#### 3.4.5 ロン/ツモの印(和了牌の背面の土台)【確定。案 A】

方針(ユーザー確定): 印を下に敷き、その上に和了牌を重ねて描く。和了牌の牌面は全面が見える。前版の「印を牌の上に重ねる」「可視割合の下限」は破棄。

- **描画順**: 背景 → 印 → 牌列(和了牌を含む全牌) → 印の文字。印の文字は牌と重ならない位置にあるので、牌より後に描いても牌を隠さない。
- **形の案**:
  | 案 | 形 | 評価 |
  | --- | --- | --- |
  | **A(確定)** | 角丸の縦長矩形(角丸 = `--md-sys-shape-corner-large` 相当の値を `share-theme.ts` に定数化) | 牌の形に沿い、左右のはみ出しを小さくできるので隣の牌に被らない |
  | B(却下) | 円(牌の外接円より大きい) | 直径 ≥ 牌の対角線(W=64 で約 107)となり、左右に約 22 ずつはみ出して左隣に被りやすい |
  | C(却下) | 上端だけ広い「札」形 | 文字の場所を広く取れるが描画が複雑 |
- **寸法(案 A。W = 牌列の牌幅〔最大 64〕、H = 4W/3)**:
  - 左右のはみ出し `badgePadX = 12`、下のはみ出し `badgePadBottom = 12`、上のはみ出し(文字帯)`badgeLabelBand = 48`。印の矩形 = x: 牌左 − 12 〜 牌右 + 12、y: 牌上 − 48 〜 牌下 + 12(W=64 で 88×145)。
  - 文字「ツモ」/「ロン」: 文字帯の中央(牌の上端より上)に 32px 太字、色は onXContainer。文字の矩形は牌と交差しない。
  - 色: ロン=`primaryContainer`、ツモ=`tertiaryContainer`(淡色。新色なし)。不透明度は 1(必要なら UI 監修で下げる)。
  - 「大きく」の希望には、`badgePadX`・`badgeLabelBand` を定数で広げて応える。ただし `badgePadX` は下記の制約で上限がある。
- **他要素と重ならない条件**:
  1. 左隣: 和了牌の前の間隔 = `max(0.3W, badgePadX + 8)`(W=64 で 20)。印の左端が左隣の牌の右端より 8 以上右。
  2. 右余白: 和了牌は並びの常に末尾(14 枚・13 枚〔末尾に足す〕・副露ありで共通)。牌列は**左基準**で x=64 から並べ、利用幅は `952 − badgePadX`(= 940。padX=12 のとき)。牌幅 W = min(64, 940 / 換算枚数) とし、牌列の右端 ≤ 1004、印の右端 ≤ 1016 になる(中央寄せはしない。`share-layout.ts` の既存試作の「幅 952 の中央」は採らない)。
  - 循環しない: 印の寸法は W に対する定数のはみ出し量(padX・下・上帯)だけで決まり、W は padX(定数)を差し引いた利用幅から決まる。W が印に依存し返すことはない。
  3. 上: 印(帯を含む矩形)と文字は、**ドラ・裏ドラの牌の矩形と「北×N」の文字矩形に交差しない**。ヘッダー文字行など他の行の文字との縦位置の重なりは許容するが、文字矩形との交差面積は当該文字矩形の 10% 以下(読める範囲)とする。交差する場合は牌列を下へずらす。
  - 縦寸法の目安(W=64): ヘッダー y=64〜112、ドラ行 y=136〜189、牌列上端 = max(ドラ行下端 + 16, 上の非交差を満たす最小値) ≈ 205、牌列 205〜290、印の下端 302。牌列は 14 牌相当で常にほぼ全幅(和了牌の左端 ≥ 約 900)なので、印(x≥約 888)はドラ・裏ドラの牌(x≤約 692)・北の文字(x≤約 864)と横方向で離れる。
  4. 下: 牌列の下端 + `badgePadBottom` + 要素間 32 ≤ 役一覧の上端(≈ 334)。
  - 下側の目安: 帯 y=1150、点数行(120px)≈ 998〜1118、符飜行(72px)≈ 894〜966、`yakuBottom` ≈ 862。役一覧の可用高さ ≈ 528 → 役 8 行までは行高 64、15 行で約 35px(フォント 30px の最小値を満たす)。
  5. 印は和了牌以外の牌の矩形と交差しない(1 で保証)。ツモ・ロンで寸法は同じ。
- **縦方向への影響**: 牌列ブロックの高さ = `badgeLabelBand + H + badgePadBottom`(W=64 で 48+85+12 = 145)。役一覧の開始位置はこの分だけ下がる(役一覧の行高の計算で吸収)。
- **追加の強調**: 不要(土台が強調を兼ねる)。

#### 3.4.6 符・飜と申告の行の寸法と縮小【設計案・UI 監修で調整可】

- 利用幅 952(= 1080 − 64×2)。初期フォント 72px。`rankText` を左、`declarationText` をその右へ間隔 0.8em を空けて置く(右寄せではなく左から続ける)。
- 概算幅(全角相当で見積もり): 符・飜「110符 13飜」約 4.7em、申告「4,000・8,000」「16,000オール」約 5.8〜6.3em、間隔 0.8em。合計約 11.8em。72px で約 850px(収まる)、80px で約 944px(余裕がほぼ無い)ため初期値を 72px とした。
- 縮小: `layoutShareImage` の引数 `measureTextWidth: (text: string, fontPx: number, weight: number) => number` で幅を求め、符・飜と申告を**同じフォントで一体に**縮める。72px から 4px 刻みで下げ、最小 48px。48px でも 952 を超える場合は申告を次の行に送る(同じ 48px、左寄せ)。
- 役満(`rankText === null`): ツモは申告だけ 72px で出す。ロンは行ごと省き、下の点数行を詰める。
- 計測関数: 描画時は `ctx.measureText(text).width`(`ctx.font` を設定して)を渡す。省略時は `share-theme.ts` の係数(全角 1.0em・半角数字と記号 0.6em)による算術見積もりを使う(jsdom で動く。単体テストはこちらか、テスト用の固定幅関数を渡す)。
- `ShareLayout` に持たせる: `rank: { x, y, fontPx } | null`、`declaration: { x, y, fontPx } | null`(2 行時は `y` が 1 行目 + 行高)、`rankBlockHeight`(1 行/2 行/省略で変わる)、`yakuTop`・`yakuBottom`(役一覧の可用範囲。`yakuBottom` = 符飜ブロック上端 − 要素間。符飜ブロックが 2 行になると上へずれ、役一覧の可用高さが縮む。符飜ブロックと点数行は帯の上から下詰めで配置)。

#### 3.4.8 見出し・ドラ欄・役明細【確定。寸法は UI 監修で調整可】

ユーザー確定(UI 監修): 見出しは「東場・南家」のみ文字、右に要約カードのようなアイコンのピル。ドラ・裏ドラ・北もそれに合うデザイン。役明細は 2 列×最大 6 行で役ごとにチップ、飜数はバッジ。真の役満は別レイアウト。印(ロン/ツモ)・牌列・符・飜・申告・合計・帯は据え置き。寸法の既定値は統括のモック(`h2-mock/gen5.py`)の実値に揃え、すべて `SHARE_THEME_V1` の定数とする(3.4.7)。本節の縦寸法は 3.4.2・3.4.5 の旧目安より優先する。

**実物の事実**: 要約カードの `SummaryStatusRow`(`src/ui/screen/SummaryCard.tsx`)は、左に `formatWinds(table)` の文字、右にピル(積み棒 = `CUSTOM_HONBA_STICK`+数、供託 = `CUSTOM_DEPOSIT_STICK`+数、抜き北 = 「北 N」の文字ピル〔抜き有効時のみ〕)。`CUSTOM_*` は `src/ui/icons/custom-paths.ts` の自作パスで CREDITS の件数に影響せず、既存のため新規アイコンは不要(初回 JS 増分なし)。

1. **見出し**(y=48〜120): 左に `formatWinds(table)` と同じ文字(例「東場・南家」。52px 太字、`onSurface`、ベースライン 104)。右端 x=1016 から左へ、**北のピル(抜き有効時。0 でも「北 0」)→ 供託のピル → 本場のピル**の順に置く(右から北・供託・本場)。ピル: 高さ 72、角丸 36、地 = `onSecondaryContainer` を不透明度 0.16(要約カードの `.summary-card__pill` の `color-mix(... on-secondary-container 16%, ...)` と同じ。新色なし)、アイコン・文字 = `onSecondaryContainer`、アイコン 64px、数字・「北 N」は 44px(半太字)、ピル間 16。
   - 北の置き場: **案 1(見出しのピル)に確定**。案 2(ドラ欄の右)は却下。
2. **ドラ欄**(y=150〜225): 左から「ドラ」ラベルのピル(高さ 52、文字 30px)→ 間隔 8 → 牌のチップ(牌 5 枚。牌幅 44、高さ約 59、内側余白 左右 10・上下 8、チップは 240×約 75、角丸 14、地 `surfaceContainer`、枠 `outlineVariant` 2px)→ 間隔 20 → 「裏ドラ」ラベルのピル → 牌のチップ。5 枚固定・未入力は裏向き・立直なしは裏ドラ 5 枚とも裏向き、は維持。幅: 約 94+8+240+20+124+8+240 ≈ 734(952 に収まる)。
3. **牌列と印**: 牌列上端 = ドラ欄下端 225 + 16 + 印の文字帯 52 = 293。印は角丸 20、はみ出し 左右 14・下 12・上帯 52、文字 32px(3.4.5 の値をモックに揃えて改める)。印は x≥約 888、ドラ欄は x≤約 798 で交差しない。
4. **役明細(通常。数え役満を含む)**: 2 列×最大 6 行 = 12 個。領域 y=408〜852。チップ 468×64、角丸 16、地 `surfaceContainer`、列間 16(64+468+16+468 = 1016)、行間 12(6 行 = 64×6+12×5 = 444 → 852)。左に役名(既定 34px、`onSurface`、左余白 20)、右に飜数の塗りバッジ(高さ 44、角丸 22、地 `primary`・文字 `onPrimary` 30px 太字、右余白 12)。
   - 並び順: **縦読み(左列を上から 6 個、続けて右列)に確定**。
   - 役名の幅: 役名の領域 = 468 − 20 − 16 − バッジ幅 − 12。`measureTextWidth` で測り、34px から縮めて最小 26px、なお超えるときは末尾を「…」で切る。最長の役名は表示名(`labels.ts`)で 9 文字の「オープンダブル立直」「国士無双十三面待ち」で、これらが最小 26px 以下で収まることを合格条件とする(9×26 = 234 ≤ 領域約 322〔バッジ「1飜」幅約 94 のとき〕)。9 文字を超える表示名は無い(実物で確認)。
   - 13 個以上は設計・テストの対象外。安全策として先頭 12 個だけを描く(例外にしない)。
5. **役明細(真の役満。`score.yakumanPoint > 0`)**: 飜数バッジなし。1 列×最大 5 行(役満の複合は理論上 5 個が最大)。チップ 952×76、角丸 20、地 `surfaceContainer`、役名 44px(最小 32px)、行間 12。5 行 = 76×5+12×4 = 428 → y=408〜836 で、`yakuBottom` 852 に収まる。安全策として先頭 5 個だけを描く。
   - 一覧には `hora.yaku` の役満をそのまま全部出す。E2 確定事項7(複合なしのルールでも成立した役満を全部一覧に出す)と同じで、倍数・限度名は点数行の格(例「役満」「ダブル役満」)で示す。
   - 数え役満(`yakumanPoint === 0` かつ 13 飜以上)は通常の役明細(2 列・飜数バッジあり)で、符・飜の行も現行どおり。
6. 縦寸法のまとめ: 見出し 48〜120、ドラ欄 150〜225、牌列 293〜(W=64 で 378)、印の下端 390、役明細 408〜852、符・飜(72px)ベースライン 940、点数(120px)ベースライン 1068、帯 1150〜1350。
7. 色はすべて既存トークン(`surfaceContainer`・`outlineVariant`・`onSecondaryContainer`・`primary`・`onPrimary`・`onSurface`・`onSurfaceVariant`)と不透明度。`ShareColors` に `surfaceContainer`・`outlineVariant`・`onSecondaryContainer` を含め、`readLightColors` で解決する。

#### 3.4.7 定数の置き場

3.4.3〜3.4.6 で導入した数値(文字サイズ、余白、はみ出し量 padX・下・上帯、間隔 0.3W・0.8em、72・48・4px 刻み、不透明度、計測の係数、牌幅上限 64・表示牌 40、QR 寸法 等)と色の役割割り当ては、すべて `share-theme.ts` の `SHARE_THEME_V1` に持たせる。`share-layout.ts`・`render-share-image.ts`・`share-data.ts` に残してよい数値は、H2-AC22 が許容する 0・1・2(半分・両側の計算)と配列添字だけ。

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
| H2-AC7 | Chrome デスクトップで、立直なし・ドラ 1 枚・抜き北 1・14 枚の和了形を入力し、ロンとツモのカードでそれぞれ「画像を保存」 | 2 つの PNG がそれぞれ 1080×1350。上から 見出し(左に「<場風>場・<自風>家」の文字のみ、右に本場・供託・北のピル。「N本場」「供託N」の文字が無い)・ドラ欄(ドラ 1 枚表向き+裏 4 枚、裏ドラ 5 枚とも裏向き)・牌列・役明細(2 列のチップ、飜数は塗りバッジ、左列を上から縦読み)・符飜・点数と格・下部の帯 の順。和了牌の背面に敷かれた印(和了牌は全面が見え、上に「ロン」/「ツモ」の文字)がロン=primaryContainer 地、ツモ=tertiaryContainer 地。大きな数字はラベルなしの「N点」で `payment.total` と一致(例: 子の 30符1飜ロンなら「1,000点」、ツモなら「1,100点」ではなく合計の値。画面の和了カードの合計と照合)し、画像中で最大の文字。ツモ画像では符・飜の右に申告(画面の見出しと同じ書式。例「300・500」)が同じ行にあり、ロン画像では符・飜の右が空いている。ルール名・卓の名称・支払い内訳(本場込み)・親/子の文字が無い。本場 1 を入れても大きな数字が変わらない |
| H2-AC8 | H2-AC7 の手で立直をかけ裏ドラ表示牌を 1 枚入力して保存。立直を外して(裏ドラ表示牌は残したまま)保存。抜き北 0 で保存。ルールの北を役牌にして保存 | 1 つ目は裏ドラが 1 枚表向き+4 枚裏向き。2 つ目は裏ドラ 5 枚とも裏向き(3.4.2(a)。確定)。3 つ目は「北×0」が出る。4 つ目は北の表示が無い。いずれもドラ・裏ドラが各 5 枚 |
| H2-AC9 | 14 枚の和了形と、13 枚の双碰待ち(例: `11m22p` を含み和了牌 `1m`)でそれぞれ保存し、要約カードと見比べる | 並びが「門前部分 → 副露 → 和了牌」。14 枚では要約カードと同じ牌・同じ順。13 枚では門前部分が入力 13 枚すべて(`1m` が 2 枚残る)で、末尾に和了牌 `1m`。下線・枠が無い(和了牌は印の土台で区別)。ドラ・裏ドラ欄は各 5 枚。単体テスト H2-AC9-a/b がある |
| H2-AC10 | 暗槓 1・ポン 1 を含む 14 枚相当の和了形、13 枚の聴牌入力(和了牌を末尾に足す)、立直・ドラ 5 枚・裏ドラ 5 枚・北×4 の形で、ロン・ツモそれぞれ保存 | 副露が要約カードと同じ牌・順で描かれ、牌姿が 1 行に収まる。全画像で、印が和了牌の背面にあり和了牌の牌面が全面見える(印が牌面に被っていない)。印と「ツモ」「ロン」の文字が、和了牌以外の牌・ドラ/裏ドラの牌・「北×N」の文字・右余白(x>1016。牌列は x=64 起点で右端 ≤ 1004)・役一覧に重ならず、ヘッダー文字行と重なる場合も文字が読める(交差面積 10% 以下)。、文字が牌に隠れていない。単体テストで、(1) `layoutShareImage` の印・文字の矩形と各要素の矩形の非交差、文字の矩形と和了牌の矩形の非交差、(2) `renderShareImage` をモック canvas で実行し、印の塗り命令が和了牌の `drawImage` より先に呼ばれること(描画順)を確認している |
| H2-AC11 | 真の役満(例: 大三元)と、数え役満(13 飜以上の通常役。例: 立直・門前清自摸和・混一色・対々和・三暗刻・ドラで 13 飜以上になる手)でそれぞれ保存 | 真の役満: 符・飜の文字が無い。ツモは申告だけが行の左に出て、ロンは符・飜の行が無く点数行が詰まる。数え役満: 画面の和了カードと同じ「◯符 N飜」が出て、ツモではその右に申告が同じ行(または 3.4.6 の縮小で 48px 以上の 1 行、収まらなければ次の行)にある。いずれも格が error 色で点数行の右端 |
| H2-AC12 | ダークテーマで H2-AC7 の手を保存し、ライトでの画像と並べる | 配色が同じ |
| H2-AC13 | `share-config.ts` を変更せずにビルドし、和了カードから画像を保存 | `grep -rn "SHARE_URL" src/ui/share/share-config.ts` で値が `https://bluekurage119.github.io/mj-3player-calc/`。帯に URL 文字 `bluekurage119.github.io/mj-3player-calc` が 1 行で出る。画像を画像編集ソフトで開き、QR 領域が x=848〜1016・y=1166〜1334 の白地(`surface`)で、黒いモジュールの外側に 4 モジュール分以上の白地があること、URL 文字の右端が x=824 以下であることを確認。さらに PNG を等倍で画面表示し、iOS 標準カメラと Android 標準カメラ(どちらか片方でも可)で読むと `https://bluekurage119.github.io/mj-3player-calc/` が表示される。`grep -rn "SHARE_URL =" src` が 1 件。URL 未設定・無効値時の保険動作(QR・URL 文字を描かない、投稿文が本文のみ)は単体テストで確認する(H2-AC14) |
| H2-AC14 | 単体テストを確認 | 少なくとも: `buildShareData`(H2-AC9-a/b、赤5、ドラ・裏ドラが常に長さ 5(未入力は back)、立直なしで裏ドラ入力ありでも 5 枚とも back、立直ありで入力済みが表向き、抜き北が有効かつ 0 枚で `nuki === 0`、抜き北無効で `nuki === null`、ドラ 0 枚で `dora` が back 5 枚、場況、真の役満で `rankText` null、数え役満で `rankText` が「◯符 N飜」、`totalText` が `payment.total` の「N点」(本場・供託を含まない)、ロンで `declarationText` null・ツモで `formatPoints(payment)`)、`qrMatrix`(`encode` に `border: 0` を渡す)、`shareUrlLabel`(確定 URL → `bluekurage119.github.io/mj-3player-calc`)、URL が null・空・`https://` 以外で `urlLabel`/QR が無く投稿文が本文のみ、確定 URL で投稿文が `"三麻点数計算機\nhttps://bluekurage119.github.io/mj-3player-calc/"`、`layoutShareImage`(役 15 行でもフッターと重ならない、副露 4 組でも牌が余白内、印・文字の矩形が和了牌以外の牌・ドラ/裏ドラの牌・北の文字・役一覧・右余白と交差せず、ヘッダー文字矩形との交差面積が 10% 以下、文字が和了牌と交差しない(14 枚・13 枚・副露 4 組・ドラ等各 4 枚の各入力、ツモ・ロン)。`renderShareImage`(モック canvas)で印の描画が和了牌の `drawImage` より前、計測関数を差し替えて(例: 1 文字 = fontPx の固定幅関数)、符・飜+申告が 72px で 952 を超える入力で 4px 刻みに一体縮小され `rank.fontPx === declaration.fontPx ≥ 48`、48px でも超える入力で `declaration.y > rank.y` かつ `yakuBottom` が 1 行時より小さい、計測関数省略時も例外なく座標が返る、役満ロンで符・飜の行が無い)、`ensureSvgSize`、`readLightColors`、`detectShareSupport`(canShare 無し・偽・真、ClipboardItem 無し)、`ShareControls`(`context.share` 未指定で出ない、非対応のボタンが出ない、コピー押下で `ClipboardItem` と `clipboard.write` が `await` 前に同期に呼ばれる、共有の `NotAllowedError` 後の再押下で `share` が同期に呼ばれる) |
| H2-AC15 | Firefox デスクトップのプレビューで和了カードを表示 | 共有ボタンが無い。保存で PNG が保存される。コピーは Firefox 127+ なら出て貼り付けできる |
| H2-AC16 | Android Chrome または iOS Safari の実機で共有・コピー | 共有シートが画像付きで開き(再押下を求められた場合は 2 回目で開く)、牌が欠けていない。コピーした画像を他アプリに貼り付けられる。実機が無い環境は PR に「実挙動未確認」と環境名を書く |
| H2-AC17 | `git diff main -- CREDITS.md src/ui/icons/symbol-paths.ts` アイコン 3 個の追加(計 16 個)と、CREDITS の「16 アイコン分」への更新 |
| H2-AC18 | `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/ui/share src/ui/result/hora/*.css src/ui/result/hora/*.tsx` | ヒットなし |
| H2-AC19 | `package.json` を確認 | `uqr` がキャレットなしの固定版。ライセンス(MIT)を PR に記載し、CREDITS 掲載要否を #69 の方針に照らして PR に書く |
| H2-AC20 | `npm run lint`・`typecheck`・`format:check`・`npm test`、ホームディレクトリ名の grep | すべて通過・ヒットなし |
| H2-AC21 | UI 監修 | 統括経由でユーザーが確認する: (1) 375px での点差の行(トグルの控えめさ・ボタン並び)、(2) 画像をデザイン案と並べ、構成・配置が一致し 3.4.3 の 4 点(文字の階層・揃え・余白・帯)が整っていること。牌幅式の最大 64 で牌列の左右に余白が多く見える点も確認。監修での変更は `share-theme.ts` の値と 3.8 の範囲で行う |
| H2-AC23 | 次の手でそれぞれ保存: (1) 役が 12 個の通常手、(2) オープンダブル立直を含む手、(3) 国士無双十三面待ち(真の役満単独)、(4) 役満の複合(例: 大三元+字一色)、(5) 数え役満 | (1) 2 列で左列に上から 6 個、右列に残り。各役がチップで飜数が塗りバッジ。(2) 役名が省略されずチップ内に収まる(26px 以上)。(3)(4) 1 列の大きめチップで飜数バッジが無く、成立した役満がすべて並ぶ(複合なしルールでも全部)。格が点数行に出る。(5) 2 列・飜数バッジあり・符飜の行あり。単体テストで、`measureTextWidth` を差し替えて「オープンダブル立直」「国士無双十三面待ち」が通常チップの最小 26px 以下で役名領域に収まること、真の役満で 1 列レイアウト・5 行の下端 ≤ 852 |
| H2-AC22 | `grep -nE "[0-9]+(\.[0-9]+)?|--md-sys|'(primary|tertiary|surface|onSurface|error)" src/ui/share/share-layout.ts src/ui/share/render-share-image.ts src/ui/share/share-data.ts` を実行し、各ヒット行を目視 | 寸法・フォントサイズ・倍率(1 桁も含む)・トークン名・色の役割名の直書きが無く、すべて `share-theme.ts` の定数参照。許容するのは 0・1・2(半分・両側の計算)と配列添字のみ。ロン/ツモ等の色の役割割り当て(Container 系を含む)と 3.4.7 の全数値が `share-theme.ts` 側に定義されている。`createShareImage` 以外に結果→画像の公開入口が無い |

## 5. 後続 Issue への引き継ぎ

- **G2(#109)**: 完了済み。確定した公開 URL を `SHARE_URL` の初期値にしている。URL が変わる場合は `share-config.ts` の 1 か所を直すだけで QR・URL 文字・投稿文が追随する。
- **#112**: 共有画像は固定ライト。ダーク版を作るなら `readLightColors` を差し替え可能にする。
- **#69**: 画像に素材クレジットは入れない。`uqr` と追加アイコンの掲載要否を #69 で扱う。
- **v2(聴牌・何切るの共有)**: `ShareData` は和了専用。牌描画・色取得・共有動作を再利用する。
- **E2 の監修でバッジ色を入れ替えた場合**: `share-theme.ts` の役割割り当て(ロン/ツモ → トークン)も同時に入れ替える(色は `share-data.ts` には持たない)。
- **#58・#85・#105・#106**: 範囲外。

## 5.0 ユーザー回答の扱い

- 3.4 の【設計案・UI 監修で調整可】の各項目(支払い内訳・親/子を出さない、北×0、点数の格の色など)。3.4.8(見出し・ドラ欄・役明細)はユーザー確定(北は見出しのピル、縦読み、2 列×6 行、真の役満は 1 列×5 行)。寸法は UI 監修で調整可について、ユーザーは「推奨どおり」と回答したが、項目ごとの個別の回答はない。UI 監修(H2-AC21)で調整しうる。
- 印は案 A(角丸矩形の台)に確定。はみ出し量の数値は UI 監修で調整可。ドラ・裏ドラの常時 5 枚表示(未入力は裏向き)と、立直なしでは裏ドラを入力があっても 5 枚とも裏向きにする扱いはユーザー確定。
- 設計書の独立レビューは、UI 監修の繰り返しの後に 1 回まとめて行う(統括の方針)。

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
