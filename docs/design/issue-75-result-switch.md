# Issue #75 E1. 牌姿に応じた表示の切り替え 設計書

- Epic: E(結果表示, #6)
- ブランチ: `feature/issue-75-result-switch`
- 後続: E2 #76(和了の結果)・E3 #77(聴牌の結果)・E4 #78(和了形・聴牌形以外の結果)・Epic F(何切る)

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- `docs/issues-draft.md` Epic E(E1〜E4 の範囲)
- `docs/design/issue-51-screen-skeleton.md` 2.7(結果側の枠)・確定事項5〜8・受け入れ条件21・22、2.12(DEV 計測)
- 実コード: `src/core/result.ts`(`Result` 型と生成条件)、`src/ui/calc/result-state.ts`・`use-result.ts`(動的 import)、`src/ui/screen/ResultPanel.tsx`・`MainScreen.tsx`・`main-screen.css`・`use-in-view.ts`・`HandCard.tsx`(`--sheet-height` の監視)、`src/ui/expressive/BottomSheet.tsx`・`bottom-sheet.css`
- livewing/mahjong-calc(リポジトリ外の参照用クローン `../ref-repo/mahjong-calc`)の `src/components/Result.tsx`・`ResultGlance.tsx`
- 業務標準 02号・06号・07号・09号

### 1.2 確定事項(Issue #75 のヒアリング。再検討しない)

| # | 確定事項 | 本書での反映 |
| --- | --- | --- |
| 1 | 振り分けは `Result.type` と `info.type` だけで行う。枚数判定なし、`src/core/` 変更なし。振り分け関数は1か所。livewing の構成に合わせる。`hora-shanten`/`hora` は13枚の聴牌も14枚の和了も同じ `hora[]` | 2.1・2.2 |
| 2 | `just-hora` の文言は「和了です。牌をすべて入力して点数を計算します。」(本体・バナーとも)。`discard-shanten` は E1 では種類名程度の枠、一覧は Epic F | 2.3・2.5 |
| 3 | `null` は何も出さない(案内文なし)。読み込み中・エラーは現状維持 | 2.3 |
| 4 | 計算部の動的 import は維持。表示部は静的参照の小さい部品 | 2.8 |
| 5 | 要約カードには結果を載せない | 2.6・3 |
| 6 | 固定バナーの表示条件・位置・タップでスクロール | 2.5 |
| 7 | 結果パネルの banner⇄expanded 遷移をやめ常に展開。issue-51 を事後注記で改訂。`ResultPanel` のテストも設計に含める | 2.4・2.6・2.7 |
| 8 | バナー内容: 向聴は「N向聴 受け入れ」+有効牌。和了形は打点(詳細は E2)。E1 はスロットと渡す構造まで | 2.2・2.5 |
| 9 | 有効牌・待ち牌のタップは E1 では実装しない。将来の打牌・自摸対応を塞がない | 2.2・4 |
| 10 | 入力欄の残り高さの基準は仮に 160px とし、製造時に実測して確定する(実測値が大きく食い違えば統括担当へ報告) | 2.5・6 |
| 11 | E1 時点のバナー仮表示: `tempai` は「聴牌 待ち+待ち牌」、`discard` は「何切る」とだけ表示 | 2.5 |
| 12 | E2/E3 の境界: 和了の一覧(待ち牌ごとのまとめ)は E3、和了1件の中身は E2。14枚の和了は E3 の一覧部品が E2 の部品を1種ぶん並べる | 3・4 |

### 1.3 事実確認の結果(実物との照合)

- `Result` の生成(`src/core/result.ts`):
  - 手牌枚数が 3 の倍数、手牌外の牌、入力不正 → `null`
  - 13枚(`length % 3 === 1` かつ 13)で聴牌 → `hora-shanten`/`hora`(待ち牌×ツモ/ロンの `ScoredHora[]`)、未聴牌 → `hora-shanten`/`shanten`
  - 13枚未満(副露分を除いた手牌が 13 に満たない `length % 3 === 1`)で聴牌 → `tempai`(待ち牌と残り枚数のみ。打点なし)、未聴牌 → `hora-shanten`/`shanten`
  - 14枚相当(`length % 3 === 2`)で和了 → `hora-shanten`/`hora`(最後の牌を和了牌とする `hora[]` に絞り込み済み)。直前が `tempai` で和了牌を引いた → `just-hora`。それ以外 → `discard-shanten`
  - したがって13枚の聴牌と14枚の和了は `Result` からは区別できない(確定事項1のとおり、E1 は区別しない)。
- `ResultPanel` の既存テストは**存在しない**(`src/ui/screen/` に `ResultPanel.test.tsx` が無い。確定事項7の「既存テストの修正」は実物と食い違う)。本書では新規作成とする(2.7)。
- issue-51 の受け入れ条件「21」は要約カード(既に D5 の事後注記あり)、結果側の2状態は条件「22」。本書の改訂対象は 2.7・確定事項6・条件21(事後注記の追記)・条件22。
- `--sheet-height` は `BottomSheet` が `document.documentElement` のインラインスタイルに px 整数で書く(閉じている間 `0px`)。シートは `max-height: 50dvh`、自身で `env(safe-area-inset-bottom)` を内側余白に持つ。
- 初回 JS の基準値(09号): 本ブランチの起点(`0aa542d`、main と同一内容)で `npm run build` → `<script type="module" src>` が指す `assets/index-*.js` = **123,289 B**(gzip -9)。`registerSW.js`(140 B)は `type="module"` の script でも modulepreload でもないため、09号の計測方法により合計に含めない。
- コンポーネントのテスト基盤は無い: `package.json` に `jsdom`・`happy-dom`・`@testing-library/*` が無い(テスト系は `vitest` のみ)。既存の方針は `renderToStaticMarkup` と純関数の単体テスト(issue-51 の `evaluateResult` の項、issue-49 の「表示部品の切り出し」の項)。`renderToStaticMarkup` は effect を実行しない。
- `HandCard.tsx`(60〜98行)の再スクロールは、`MutationObserver` で `:root` の style を監視し、`--sheet-height` の値が変わったときだけ発火する。

## 2. 設計

### 2.1 モジュール構成

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/result/classify.ts` | 新規 | 振り分け関数(唯一の振り分け箇所) |
| `src/ui/result/classify.test.ts` | 新規 | 振り分けの単体テスト |
| `src/ui/result/ResultBody.tsx` | 新規 | 本体(livewing `Result.tsx` 相当)。種類ごとのスロットへ振り分ける |
| `src/ui/result/ResultGlance.tsx` | 新規 | バナーの中身(livewing `ResultGlance.tsx` 相当)。種類ごとのスロットへ振り分ける |
| `src/ui/result/slots.tsx` | 新規 | 種類ごとの本体・バナー部品の仮実装(E2〜E4・F が差し替える) |
| `src/ui/result/result.css` | 新規 | 本体・バナーのスタイル |
| `src/ui/screen/ResultPanel.tsx` | 改修 | 2状態を廃止し常に展開。`ResultBody` を描く |
| `src/ui/screen/ResultBanner.tsx` | 新規 | 固定バナーの位置・タップ。表示判定は下の純関数を呼ぶだけ |
| `src/ui/screen/result-banner-logic.ts` | 新規 | バナーの表示判定とタップ処理の純関数(2.5) |
| `src/ui/screen/HandCard.tsx` | 改修 | 再スクロールの比較対象に `--result-banner-height` を加える(2.5) |
| `src/ui/screen/use-sheet-height.ts` | 新規 | `--sheet-height` を数値で購読するフック |
| `src/ui/screen/ResultPanel.test.tsx`・`result-banner-logic.test.ts`・`src/ui/result/ResultGlance.test.tsx` | 新規 | 2.7(`renderToStaticMarkup` と純関数。jsdom 等は追加しない) |
| `src/ui/screen/MainScreen.tsx`・`main-screen.css` | 改修 | バナーの配置、2状態の CSS 削除 |

`src/core/` は変更しない。`src/ui/result/` は `src/core/result` から**型のみ**を `import type` で参照する(計算部を初回 JS に引き込まないため。2.8)。

### 2.2 振り分け(`classify.ts`)

```ts
import type { Result, ScoredHora, Discard } from '../../core/result';
import type { TileAvailability } from '../../core/tile';

export type ResultView =
  | { kind: 'none' }                                       // result === null
  | { kind: 'just-hora' }
  | { kind: 'hora'; hora: ScoredHora[] }                   // hora-shanten / hora(13枚の聴牌・14枚の和了の両方)
  | { kind: 'tempai'; tileAvailabilities: TileAvailability[] } // tempai(打点なしの聴牌)
  | { kind: 'shanten'; shanten: number; tileAvailabilities: TileAvailability[] } // hora-shanten / shanten
  | { kind: 'discard'; discards: Discard[] };              // discard-shanten

export const classifyResult = (result: Result): ResultView;
export type ResultKind = ResultView['kind'];
```

- 判定は `result === null` → `result.type` → (`hora-shanten` のときのみ)`result.info.type` の順。枚数・`input` は見ない【確定】。
- `TileAvailability`・`Discard`・`ScoredHora` が `src/core/` から型として export されていない場合は、`src/core/` を変えずに `Extract<…>` 等で `Result` から導出する(製造で型の export 状況を確認すること)。
- `ResultBody`・`ResultGlance`・`ResultBanner` の表示判定は、必ず `classifyResult` の戻り値の `kind` で分岐する。`result.type` を他所で直接見ない【確定(1か所)】。
- 中身の境界【設計案。確定事項1の具体化】:
  - `kind: 'hora'` の `hora[]` の **1件**(1つの和了牌×ツモ/ロン)の中身(役・翻符・点数・支払い) = **E2**。livewing の `HoraItem` に相当する部品 `HoraItem({ hora: ScoredHora })` を E2 が作る。
  - `kind: 'hora'` の **一覧の並べ方**(待ち牌ごとのまとめ、残り枚数、`hora.length === 0` のときの表示)と `kind: 'tempai'` = **E3**。
  - `kind: 'shanten'` = **E4**。`kind: 'discard'` の一覧 = **Epic F**(E1 は種類名の枠だけ)。
  - 14枚の和了は `hora[]` の和了牌が1種に絞られた状態なので、E3 の一覧部品が E2 の `HoraItem` を和了牌1種ぶん並べる形で表示される。E3 が「和了牌が1種のときは待ち牌の見出しを省く」等の見せ分けをするかは E3 で決める(`hora[]` の中身だけで判定でき、枚数判定は要らない)。

### 2.3 本体(`ResultBody`)と種類ごとの表示(E1 時点)

`ResultBody({ view: ResultView })` が `kind` ごとに `slots.tsx` の本体部品を描く。E1 の仮実装は次のとおり。

| kind | E1 の本体表示 | 後で中身を作る Issue |
| --- | --- | --- |
| `none` | 何も描かない(要素なし。パネルは `data-state="empty"`)【確定】 | — |
| `just-hora` | 「和了です。牌をすべて入力して点数を計算します。」【確定】 | — |
| `hora` | 見出し「和了」と、`hora[]` の件数分の仮行(和了牌の牌画像 + 「ツモ」/「ロン」)【設計案】 | E2・E3 |
| `tempai` | 見出し「聴牌」と待ち牌の牌画像【設計案】 | E3 |
| `shanten` | 「N向聴」と受け入れ牌の牌画像【設計案】 | E4 |
| `discard` | 「何切る」の見出しのみ【確定(種類名程度)。文言は設計案】 | F |

- 各本体部品のルート要素に `data-result-kind="<kind>"` を付ける(検収・後続の目印)。
- 読み込み中・エラーは `ResultPanel` 側で現状どおり(進捗表示、「計算できません」)【確定】。
- 文言は日本語。「向聴」は `shanten === 0` にはならない(0 は `hora`/`tempai` に振り分けられる)。

### 2.4 結果パネル(`ResultPanel`)の改修

- `useInView`・番兵(`.result-panel__sentinel`)・`data-view`・`result-panel--banner`/`--expanded`・クリック/キー処理・`tabIndex` を削除し、常に展開表示とする【確定】。
- `min-height` は現行の展開状態の `16rem`、角丸は `--md-sys-shape-corner-extra-large` を固定で使う。遷移(`transition-property: min-height, border-radius`)は削除。
- `data-state` は現行の `loading`/`error`/`empty`/`ok` を維持。`ok` のとき `ResultBody` を描く。
- DEV 計測(`[d1-latency]` の `useLayoutEffect`)は維持。
- `<section>` に `id="result-panel"` と `scroll-margin-top: calc(var(--app-header-height, 0px) + 0.5rem)` を付ける(バナーからのスクロール先)。
- `ResultPanel` は `sectionRef` を受け取れるよう `forwardRef` 相当(React 19 なので `ref` prop)にし、`MainScreen` が同じ ref をバナーの表示判定に使う。

### 2.5 固定バナー(`ResultBanner`)

#### 表示条件【確定。数値は設計案】

次をすべて満たすときだけ表示する。

1. `resultState.status === 'ok'` かつ `classifyResult(result).kind !== 'none'`(読み込み中・エラー・`null` では出さない)
2. 結果パネルが「見えていない」: `useInView(panelRef, { rootMargin: \`0px 0px -${sheetHeight}px 0px\` }, true)` が false。シートに隠れた部分は見えていない扱い。
3. 入力欄の残り高さが足りる: `window.innerHeight − headerHeight − sheetHeight − bannerHeight ≥ MIN_INPUT_VISIBLE`。
   - `MIN_INPUT_VISIBLE = 160`(px)【設計案・実挙動未確認】。根拠: 手牌カード1枚とその前後の余白が見える程度を想定。375×812・シート最大(50dvh = 406)・ヘッダ約64・バナー約56 で残り約286 となり表示される。横向き(高さ 375 前後)でシートを開くと残り 0 未満となり出さない。
   - `bannerHeight` はバナー自身を `ResizeObserver` で測る(初回は表示前に測れないため、非表示時も `visibility: hidden` で配置して測る)。`headerHeight` は `MainScreen` の既存値を渡す。
   - `innerHeight` は `resize` で更新する。

判定とタップ処理は `src/ui/screen/result-banner-logic.ts` の純関数に切り出す(テストのため。2.7)。

```ts
export const MIN_INPUT_VISIBLE = 160;

export interface BannerVisibilityInput {
  resultState: ResultState;   // src/ui/calc/result-state
  panelInView: boolean;       // useInView の結果
  viewportHeight: number;     // window.innerHeight
  headerHeight: number;
  sheetHeight: number;        // --sheet-height の数値(閉じていれば 0)
  bannerHeight: number;       // バナー自身の実測値
}
export const shouldShowBanner = (i: BannerVisibilityInput): boolean;

// バナーのクリックハンドラ本体。panel が null なら何もしない
export const scrollToResultPanel = (
  panel: Pick<HTMLElement, 'scrollIntoView'> | null,
  behavior: ScrollBehavior
) => void;
```

`ResultBanner` はフックで値を集めて `shouldShowBanner` を呼び、`onClick` で `scrollToResultPanel(panelRef.current, getScrollBehavior())` を呼ぶだけにする。

#### 位置【確定】

- シートが閉じている(`sheetHeight === 0`): `position: fixed; bottom: 0`、`padding-bottom: max(0.5rem, env(safe-area-inset-bottom))`。
- シートが開いている: `bottom: var(--sheet-height)`(シート上端に接する)。safe-area 余白はシートが持つので付けない。
- 横幅はシートと同じく `max-width: var(--app-max-width, 37.5rem); margin-inline: auto; inset-inline: 0`。`z-index: 19`(要約カード 10 より上、シート 20 より下)。
- 背景 `--md-sys-color-surface-container-high`、文字 `--md-sys-color-on-surface`、上辺 `thin solid --md-sys-color-outline-variant`、上側角丸 `--md-sys-shape-corner-large`。HEX 直書きなし(06号)。
- 表示/非表示は `opacity` と `visibility` の切替(`--md-sys-motion-spring-effects-fast-*`)。`prefers-reduced-motion: reduce` で遷移なし。非表示中は `pointer-events: none`・`aria-hidden="true"`。
- バナー表示中は `:root` に `--result-banner-height`(px、非表示時 `0px`)を書き、既存の `scroll-margin-bottom: calc(var(--sheet-height) + 0.5rem)`(main-screen.css 116行)を `calc(var(--sheet-height) + var(--result-banner-height, 0px) + 0.5rem)` にする。理由: 手牌カードの `scrollIntoView` でカードがバナーの裏に隠れないようにする。
- `HandCard.tsx` の `MutationObserver`(60〜98行)は、比較対象を `--sheet-height` と `--result-banner-height` の2つにする(どちらかの値が前回から変わったら `triggerScroll`)。理由: シートを開いたまま入力してバナーが初めて現れたとき、`--sheet-height` は変わらないため、現状では再スクロールされず、手牌カードの下端がバナーの裏に入りうる。既存の `HandCard.test.tsx` は `renderToStaticMarkup` と静的検査(`.hand-card__body` に onClick が無いこと等)だけで、effect を実行しないので影響しない。この変更の確認は受け入れ条件16の画面確認で行う。

#### 内容(スロット)

`ResultGlance({ view })` が `kind` ごとに `slots.tsx` のバナー部品を描く。バナー部品の props は対応する `ResultView` の要素そのもの(例: `HoraGlance({ hora: ScoredHora[] })`)。

| kind | E1 のバナー表示 | 中身を決める Issue |
| --- | --- | --- |
| `just-hora` | 「和了です。牌をすべて入力して点数を計算します。」【確定】 | — |
| `hora` | 仮表示「和了」+ `hora[]` の件数だけ「和了牌の牌画像」【設計案】。打点(ロン・ツモ)の出し方は E2【確定(詳細は E2)】。13枚で待ちが複数のときも同じ `hora[]` 全体を受け取る | E2(待ちが複数の場合の見せ方は E2・E3 で調整) |
| `tempai` | 「聴牌 待ち」+ 残り枚数が1枚以上(`count > 0`)の待ち牌【確定(ユーザー)】。全て0枚のときは「和了牌なし」とする【設計案。E3 で確定】。参考: livewing の実物は「聴牌」と `count > 0` の牌だけを出し(「待ち」のラベルは無い)、全て0枚なら「和了牌無し」 | E3 |
| `shanten` | 「N向聴 受け入れ」+ 有効牌の牌画像(livewing どおり)【確定】 | E4 で調整可 |
| `discard` | 「何切る」のみ【設計案】 | F |

- 牌画像は既存の牌表示部品(手牌カードで使っているもの)を流用し、新しい画像経路は作らない。牌は1行に収まらなければ折り返す(livewing どおり)。
- バナー全体は1つの `<button type="button" aria-label="計算結果へ移動">`(押すと `panelRef.current.scrollIntoView({ behavior, block: 'start' })`。`behavior` は既存の `getScrollBehavior()` を使い reduced-motion に従う)【確定(issue-51 確定事項8を維持)】。
- 牌のタップ(打牌・自摸)は E1 では実装しない【確定】。4章の引き継ぎに従い、牌を button の子に入れても将来分離できる構造にする(バナー部品の中で牌列を `GlanceTiles({ tiles, onTileClick?: (tile) => void })` という部品に切り出し、E1 では `onTileClick` を渡さない)。

### 2.6 issue-51 設計書への事後注記(本 Issue の製造で追記する)

製造担当は `docs/design/issue-51-screen-skeleton.md` に次の事後注記を**追記**する(既存本文は書き換えない)。

- 2.7 の末尾: 「【事後注記】E1(Issue #75、[issue-75-result-switch.md](issue-75-result-switch.md))で banner/expanded の2状態は廃止し、結果パネルは常に展開表示とした。結果パネルが見えない間の入口は固定バナー(`ResultBanner`)に移した。バナーのタップで結果側へスクロールする仕様(確定事項8)は固定バナーで維持する。」
- 1.2 の確定事項6の行の直後: 同趣旨の一文の事後注記。
- 受け入れ条件21 の既存の事後注記の後: 「E1 で結果の置き場を再定義した。要約カードには結果を載せない(issue-75 確定事項5)。」
- 受け入れ条件22 の直後: 「【事後注記】E1 で2状態を廃止した。この条件は issue-75 の受け入れ条件に置き換える。」
- ユーザー確定事項の表の項目4(展開しきい値)の直後: 「【事後注記】E1 で廃止。」

### 2.7 テスト

- `classify.test.ts`: 各 `Result` の形(`null`・`just-hora`・`hora-shanten`/`hora`(0件・複数件)・`hora-shanten`/`shanten`・`tempai`・`discard-shanten`)を手書きのオブジェクトで与え、期待する `kind` と中身(同一参照)になる。
- `ResultPanel.test.tsx`(新規。既存テストは無い): `loading`/`error`/`ok+null`/`ok+各kind` で `data-state` と `data-result-kind`、`just-hora` の文言、`data-view` 属性と `result-panel--banner` クラスが**存在しない**こと。
- 方針: jsdom・Testing Library は追加しない。表示は `renderToStaticMarkup`、判定とハンドラは純関数でテストする(1.3)。
- `result-banner-logic.test.ts`: `shouldShowBanner` が (a) loading・error・`ok`+`null` で false、(b) `panelInView: true` で false、(c) `viewportHeight − headerHeight − sheetHeight − bannerHeight` が 159 で false・160 で true(境界)、(d) すべて満たすと true。`scrollToResultPanel` はモックの `{ scrollIntoView: vi.fn() }` を渡して `{ behavior, block: 'start' }` で1回呼ばれ、`null` では例外にならない。
- `ResultGlance.test.tsx`: `renderToStaticMarkup` で `shanten` のとき「N向聴」「受け入れ」と牌が並び、`just-hora` の文言が出て、`tempai` の全0枚で「和了牌なし」になる。

### 2.8 初回 JS(09号)

- 基準値: **123,289 B**(1.3。`registerSW.js` は含めない)。
- 増分の積算【設計案】: 振り分け関数 約0.2 kB、本体・バナーの仮スロット6種 約1.0 kB、`ResultBanner`・`use-sheet-height` 約0.6 kB、CSS は JS 外。2状態の削除で約 −0.2 kB。計 約 +1.6 kB(gzip)。
- 目標値: **約 124,900 B**。超過は不合格にしない(09号)。
- `src/ui/result/` から `src/core/result`・`src/core/tile` へは `import type` のみとし、計算部(動的 import の `./compute` 経由のチャンク)を初回 JS に取り込まない【確定(確定事項4)】。牌の比較等の実行時関数が要る場合は既存の初回 JS に含まれるものだけを使う。

## 3. 範囲外(E2〜E4・F を侵さない線引き)

- 役・翻・符・点数・支払い・抜き北表示・赤牌の注意(E2)、待ち牌ごとの打点と残り枚数の表(E3)、向聴の有効牌の種類と枚数の詳細(E4)、打牌候補の一覧(F)は作らない。E1 の各スロットは2.3・2.5の仮表示に留める。
- 有効牌・待ち牌のタップによる打牌・自摸(E3・E4)。
- 要約カードの結果欄の復活(確定事項5)。
- `src/core/` の変更。

## 4. 後続 Issue への引き継ぎ

- **E2**: `slots.tsx` の `hora` 本体のうち1件分を `HoraItem({ hora: ScoredHora })` として実装し、バナーの `HoraGlance({ hora: ScoredHora[] })` に打点(ロン・ツモ)を出す。`hora[]` が複数の和了牌を含む(13枚の聴牌)場合のバナーの見せ方は E2 で決める(E3 と調整)。
- **E3**: `hora` の一覧(待ち牌ごとのまとめ・残り枚数・0件時の「和了牌なし」相当)と `tempai`(本体・バナー)。
- **E4**: `shanten`(本体・バナー)。
- **F**: `discard`(本体・バナー)。
- **牌タップ(打牌・自摸)の申し送り**: ユーザーから「有効牌・待ち牌のタップで打牌・自摸に対応できるようにする見込み」との申し送りがある。E1 は次で構造を開けておく。(1) 牌列は `GlanceTiles({ tiles, onTileClick? })` に切り出し済み。(2) 現状バナー全体が1つの button なので、牌タップを入れるときはバナーを「スクロール用の button」と「牌ごとの button 群」に分割する(button の入れ子は不可)。(3) 打牌・自摸の操作は reducer の action として `MainScreen` から props で渡す形にし、スロット部品から `dispatch` を直接呼ばない。
- 種類の判定は必ず `classifyResult` を使い、新しい種類が増えたら `ResultView` に追加する。

## 5. 受け入れ条件

検収はリポジトリのルートで行う。Browser pane は 375×812(`resize_window` preset mobile)で `npm run dev` の画面を見る(dev サーバー起動は 01号の規定に従う)。手牌入力は手牌カードを押して底部シートのパレットから行う。

1. **コマンド**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラーなく終わる。
2. **core 不変**: `git diff main --stat -- src/core` の出力が空。
3. **振り分けの一意性**: `grep -rn "\.type === '\(hora-shanten\|just-hora\|tempai\|discard-shanten\)'\|info\.type" src/ui` のヒットが `src/ui/result/classify.ts` のみ(テストファイルを除く)。
4. **初回 JS に計算部を含まない**: `grep -n "^import [^t]" src/ui/result/*.ts*` で `src/core/` を指す行が無い(`import type` のみ)。`npm run build` 後、`dist/index.html` が参照する JS に `computeResult` の定義を含むチャンクが入っていない(`dist/assets` で `generateResult` を含むファイル名が `index.html` に現れない)。
5. **初回 JS の記録**: 09号の方法で初回 JS の合計(B)を測り、基準値 123,289 B・目標値 約124,900 B と並べて最終報告に書く。超過しても不合格にしない。
6. **単体テスト**: `npx vitest run src/ui/result src/ui/screen/ResultPanel.test.tsx src/ui/screen/result-banner-logic.test.ts src/ui/screen/HandCard.test.tsx` が全件通過し、2.7 の各ケース(`shouldShowBanner` の 159/160 の境界、`scrollToResultPanel` の呼び出し引数を含む)が含まれる(テスト名で確認)。`package.json` に `jsdom`・`happy-dom`・`@testing-library/*` が追加されていない。
7. **空**: 初期状態(手牌なし)で `section[aria-label="計算結果"]` の `data-state` が `empty`、その中に `[data-result-kind]` が無く、文字が無い。バナー要素が非表示(`aria-hidden="true"` かつ `getComputedStyle(...).visibility === 'hidden'`)。
8. **常に展開**: 結果パネルに `data-view` 属性・`result-panel--banner` クラスが無い。ページ先頭でも末尾でも結果パネルの `getBoundingClientRect().height` が 16rem(256px)以上で同じ値。
9. **向聴**: 手牌に `1m 9m 1p 2p 5p 1s 4s 7s 東 南 西 白 發`(13枚)を入れる。結果パネルに `[data-result-kind="shanten"]` があり「N向聴」が出る。ページ先頭(結果パネルが画面外)でシートを閉じると、画面下端にバナーが表示され(`visibility` が `visible`)、「向聴」「受け入れ」の文字と牌画像が1枚以上ある。バナー下端が `innerHeight`(±1px)。
10. **just-hora**: 5枚の手 `1p 2p 3p 5s 5s` をこの順に入力する(最後の牌が `5s`)。`handWithoutLast` は `1p 2p 3p 5s`(4枚、`length % 3 === 1` で13枚でないため、`5s` 単騎の聴牌として `tempai`)で、最後の `5s` が待ち牌なので `just-hora` になる。結果パネルとバナーに「和了です。牌をすべて入力して点数を計算します。」が出る(`[data-result-kind="just-hora"]`)。補足: 4枚 `1p 2p 3p 5s` の時点では `[data-result-kind="tempai"]`、6枚目を加えると `length % 3 === 0` で `null`(空)になる。8枚の例: `1p 2p 3p 4p 5p 6p 5s 5s`(最後が `5s`。`handWithoutLast` は7枚で `5s` 単騎の `tempai`)でも `just-hora` になる。
11. **和了・聴牌の種類**: `1m 9m 1p 2p 3p 4p 5p 6p 7p 8p 9p 東 東`(13枚)で `[data-result-kind="hora"]`、さらに `東` を加えた14枚でも `[data-result-kind="hora"]`。7枚 `1p 2p 3p 4p 5p 6p 東`(`length % 3 === 1` で13枚でない聴牌)で `[data-result-kind="tempai"]`。何切る形(和了でない14枚)で `[data-result-kind="discard"]` と「何切る」。
12. **シート上端のバナー**: 条件9 の手でシートを開いた状態(結果パネルが画面外またはシートに隠れる位置)で、バナーの `getBoundingClientRect().bottom` がシートの `getBoundingClientRect().top` より 8px(`--result-banner-gap`。7章)上にあり(±1px)、バナーとシートが重ならない。
13. **パネルが見えると消える**: 条件9 の状態でページ末尾までスクロールし、結果パネルが見えている(シートより上に入っている)とバナーが非表示になる。シートを開いた状態でも、結果パネルがシートに隠れて見えないときはバナーが表示される。
14. **高さ不足で出さない**: `resize_window` で 812×375 相当(幅 812・高さ 375)にし、条件9 の手でシートを開く。`innerHeight − ヘッダ高 − --sheet-height − バナー高 < 160` を console で確かめたうえで、バナーが非表示。幅 375・高さ 812 に戻すと表示される。確認後 preset desktop で戻す。
15. **タップでスクロール**: 条件9 のバナーを押すと、結果パネルの上端がヘッダの下(`top` ≈ ヘッダ高 + 8px、±4px)に来るまでスクロールし、その後バナーが非表示になる。
16. **手牌カードが隠れない**: 375×812 でページ先頭(`scrollY = 0`)から手牌カードを押してシートを開く(この時点では手牌が空なのでバナーは出ない)。シートを開いたまま、パレットで条件9の13枚を入力する。入力の途中で結果が `null` でなくなった時点でバナーが現れる。入力を終えたら、スクロール位置はそのまま(手動でスクロールしない)で次を測る。(a) `getComputedStyle(document.documentElement).getPropertyValue('--result-banner-height')` がバナーの `getBoundingClientRect().height` と ±1px で一致する。(b) 手牌カード(`.hand-card`)の `getBoundingClientRect().bottom` が、バナーの `getBoundingClientRect().top` 以下である。あわせて、`HandCard.tsx` の `MutationObserver` のコールバックが `--result-banner-height` の変化も比較していることをコードで確認する。
17. **ダーク・トークン**: Browser pane の `prefers-color-scheme` のエミュレーションは `change` イベントを発火しないため使わない。console で `document.documentElement.dataset.theme = 'dark'` を設定するか、設定画面でダークに切り替える。バナーと結果パネルの背景・文字が切り替わることを確認する。注意: リロードすると入力が消えるので、手牌を入れ直してから確かめる。`git diff main -- src | grep -nE "#[0-9a-fA-F]{3,8}\b"` が CSS の色値としてヒットしない。
18. **issue-51 の事後注記**: `docs/design/issue-51-screen-skeleton.md` の差分が追記のみ(`git diff main -- docs/design/issue-51-screen-skeleton.md` に `-` 行が無い)で、2.6 の5か所に事後注記がある。
19. **実機逆発注(C-02)**: 最終報告に、iOS Safari / Android Chrome でのバナーの safe-area 余白・シート上端への追従・表示切替のちらつきをユーザーに確認してもらう手順を書く。

## 6. 実挙動未確認・要確認の一覧

- 【実挙動未確認】`MIN_INPUT_VISIBLE = 160` とバナー高さ約56px は CSS からの見積もり。製造時に 375×812 で実測し、値が大きく食い違う場合(バナー高 > 80px 等)は統括担当へ報告する。
- 【実挙動未確認】`rootMargin` にシート高を負値で渡す方式で、シートに隠れた結果パネルを「見えていない」と判定できるか。シート高の変化時に observer を作り直す(`useInView` は `rootMargin` を依存に持つため再生成される)。
- 【実挙動未確認】iOS Safari でのシート開閉中(transform 遷移中)のバナー追従。`--sheet-height` は遷移完了前に最終値が入るため、一瞬シートより上に浮く可能性がある。
- 【実挙動未確認】条件10・11 の具体的な手牌例は `src/core/result.ts` の分岐から導いたもので、画面では未確認。検収で別の手を使ってもよい(期待する `kind` が出ることが本旨)。

## 7. UI監修による変更(2026-11-12。ユーザーの直接指示。設計承認を省略した監修中の変更)

製造後のユーザー UI 監修で次の2点が指示され、実装に反映した。上の記述と食い違う箇所は本章を優先する。

- **和了の表示から「ツモ」「ロン」の区別を外す。** 本体(`HoraBody`)・バナー(`HoraGlance`)とも、和了牌の牌だけを出す。ツモとロンで同じ牌が重なるため、牌の重複を除く(並びは最初に現れた順)。2.3・2.5 の「牌画像 + ツモ/ロン」「打点(ロン・ツモ)」の記述は、E1 の仮表示としては本章に置き換わる。打点の出し方は引き続き E2 で決める。
- **バナーの見た目を入力側の要約カードに合わせ、シート(キーボード)から少し離す。** 背景 `--md-sys-color-secondary-container`・文字 `--md-sys-color-on-secondary-container`・角丸 `--md-sys-shape-corner-medium`(四隅)・影・内側余白 `0.5rem 0.75rem`(要約カードの `.summary-card__inner` と同じ)。左右は 1rem 内側に入れる。下端は `--result-banner-gap`(0.5rem)だけ離す(閉じているときは `max(gap, safe-area)`、開いているときは `--sheet-height + gap`)。`--result-banner-height` には gap を含める(`calc(<高さ>px + var(--result-banner-gap))`)。2.5 の「上辺の線・上側だけの角丸」の記述は置き換わる。
