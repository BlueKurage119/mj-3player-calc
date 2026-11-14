# Issue #46 D2. パレット入力 設計書

> 追記(Issue #73): 赤なし時(`rule.red === 0`)の赤キー非表示は、Issue #73 で「disabled 表示」に変更した。詳細は [issue-73](issue-73-keyboard-ui-fix.md)。

- 状態: 設計承認済み(オーナー、2026-11-08)。要ヒアリング1〜4(常時整列+和了牌の右端分離、360幅の34.7dp許容、cqi使用、シート切替時の整列)は、オーナーが設計書全体を承認したことで設計案として承認された。ただしオーナーが個別に「推奨どおり」と述べたものではないため、後で変更の余地がある。2.8 の要件§4 改訂文言は承認に含まれ、`docs/requirements.md` に反映済み。準備工事 2.10 は a・b・c を実施し、d は実施しない(統括判断)
- 対象: 底部シートの中身(`data-slot="sheet-hand"`)の牌パレット、手牌を書き換えるアクション、手牌カードの表示(整列・和了牌の分離・1 行表示)とシート表示時のスクロール
- 範囲外: テンキー・入力方式の切替・物理キーボード(D3)、ドラ・裏ドラ・副露・抜き北の入力(D4)、状況役(D5)、D1 条件 21(要約カードの固定)の修正(保留)、牌タップ削除の接続
  【事後注記】Issue #89 で採用(2.10 の注記参照)。

## 1. 参照資料と判断の根拠

### 1.1 参照資料

- `AGENTS.md`、`docs/rules/01`・`02`・`06`・`07` 号
- `docs/requirements.md` §3.1・§4(タップ領域 48dp【確定】、ステッパーの緩和)
- `docs/issues-draft.md` Epic D(D2・D3・D4)
- `docs/design/issue-51-screen-skeleton.md`(D1。2.2 状態型、2.6 底部シート、2.9 手牌カード、§5A、§6 の D2 引き継ぎ)
- `docs/design/issue-41-tile-images.md`(C3 受け入れ条件 7・9: SVG の出力と precache)
- 既存実装: `src/ui/state/app-state.ts`、`src/ui/screen/HandCard.tsx`・`MainScreen.tsx`・`main-screen.css`、`src/ui/expressive/BottomSheet.tsx`・`bottom-sheet.css`、`src/ui/tile/Tile.tsx`・`tile.css`、`src/core/tile/index.ts`(`isAvailableTiles`・`tileAvailableCount`・`compareTiles`)、`src/core/input.ts`(`instantiateMeld`)、`src/core/rule.ts`(`redCountOf`)、`src/core/result.ts`(`allInputTiles`)
- 参照実装(読むだけ。コードは複製しない): `../ref-repo/mj-mighty-calc/src/ui/Tenkey.tsx`、`../ref-repo/mj-mighty-calc/src/App.tsx`

### 1.2 確定事項(Issue #46 のヒアリング。再検討しない)

1. シートはキーボードに徹する。シートの中身はパレットのみで、ミニ手牌等の表示・補助 UI を置かない。
2. パレットは 4 行 × 9 列。1 行目 索子 1〜9、2 行目 筒子 1〜9、3 行目 萬子(一萬・九萬)+字牌 7 種、4 行目 赤と機能キー。牌キーのタップ領域は要件§4 の 48dp 規定を牌パレットに限り緩和する(最終文言は 2.8)。
3. 赤牌は 4 行目の専用ボタン(赤五筒・赤五索)。`rule.red` が 0 なら赤ボタンを出さず、機能キーの幅配分を変える。トグル案は採らない。
4. 4 行目の機能キー: バックスペース(手牌の末尾 1 枚を削除)、AC(`clear-hand` を再利用、確認なし)、Enter。
5. Enter はシートを閉じ、手牌を自動整列する。整列は「手牌が満杯(`14 − 3 × 副露数` 枚)なら末尾 1 枚(和了牌)を除いて整列、満杯でなければ全体を整列」。
6. 枚数が尽きた牌(同じ牌の 5 枚目、赤の使い切り)のキー、および手牌満杯時の全牌キーは `disabled`(文言・バッジなし)。バックスペース・AC・Enter は常に有効。数え方は手牌+副露(`instantiateMeld`)+ドラ・裏ドラ+北×抜き北。`isAvailableTiles`・`tileAvailableCount` を使い、reducer でも二重に防ぐ。手牌の最大枚数は関数化する。
7. 手牌カードの視認(H3): シートが開いたとき・シートの高さが変わったときに、手牌カードを `scroll-margin-bottom: calc(var(--sheet-height) + 0.5rem)` で `scrollIntoView` してシートの上に見せる。
8. D1 条件 21 は保留(D2 範囲外)。
9. 手牌カードで 14 枚を 1 行に収める(牌幅は幅から計算)。
10. 牌タップ削除は実装しない。準備工事のみ(2.10)。
  【事後注記】Issue #89 で採用(2.10 の注記参照)。
11. 牌 SVG の出力・precache の確認を受け入れ条件に含める。
12. 製造は AGY に任せる前提。段階化(コミット単位)を書く。
13. 実機確認(シートの操作性、牌の押しやすさ、H3 のスクロール)は C-02 の逆発注項目。

### 1.3 設計担当の判断と根拠

- **mighty との関係**: mighty-calc には牌パレットが無く、入力はテンキーのみ(`Tenkey.tsx`)。4 行 9 列の配置は参照元の無い新規設計。整列・和了牌の分離・閉じるときの整列・末尾削除・AC はmighty の挙動(`App.tsx` の閉じる処理、`Tenkey.tsx` のプレビュー)に揃え、発明を最小にする。
- **3 行目の並び**: mighty の整列順(`compareTiles` と同じ m→p→s→z、字牌は東南西北白發中)に合わせ、`1m 9m 東 南 西 北 白 發 中` とする。
- **`rule.red` の値**: 型は色ごとの枚数 `0 | 1 | 2`(`redCountOf` は p・s に同値、m は 0)。オーナー表現の「0/2/4 枚」は合計枚数で、それぞれ `red = 0 / 1 / 2` に対応する。
- **数え方と `result.ts` の関係**: `result.ts` の `allInputTiles` は手牌+副露+`input.dora`+北×抜き北を数える。UI の `computeResult` は `dora` と `uradora` を結合して core に渡すので、計算時には裏ドラも数えられる。UI 側の状態は `dora` と `uradora` を別に持つため、`usedTiles` は両方を数える。その結果は計算時の結合結果と一致する。`result.ts` は変更しない。

## 2. 設計

### 2.1 モジュール構成

| ファイル | 変更 | 内容 |
| --- | --- | --- |
| `src/ui/state/hand-rules.ts` | 新規 | 最大枚数・使用中の牌・追加可否・整列の純関数(2.3) |
| `src/ui/state/hand-rules.test.ts` | 新規 | 上記の単体テスト |
| `src/ui/state/app-state.ts` | 変更 | アクション追加、`close-sheet` で整列(2.2) |
| `src/ui/state/app-state.test.ts` | 変更 | 追加アクションのテスト |
| `src/ui/state/index.ts` | 変更 | `hand-rules` の公開 |
| `src/ui/input/TilePalette.tsx` | 新規 | パレット本体(2.4) |
| `src/ui/input/tile-palette.css` | 新規 | パレットの配置 |
| `src/ui/input/index.ts` | 新規 | 公開口(D3 も同じ場所に置く想定) |
| `src/ui/screen/MainScreen.tsx` | 変更 | `sheet-hand` スロットに `TilePalette` を入れる |
| `src/ui/screen/HandCard.tsx` | 変更 | 整列表示・和了牌の分離・1 行表示・H3・準備工事(2.6・2.7・2.10) |
| `src/ui/screen/main-screen.css` | 変更 | 手牌の牌幅計算・和了牌の隙間 |

`BottomSheet.tsx`・`core/` は変更しない。

### 2.2 状態とアクション(`app-state.ts`)

`AppAction` に以下を追加する。いずれも入力方式に依存せず、D3 のテンキーも同じアクションを使う。

```ts
| { type: 'add-hand-tile'; tile: Tile }
| { type: 'remove-last-hand-tile' }
| { type: 'remove-hand-tile'; index: number } // 準備工事。D2 では UI から送らない
```

- `add-hand-tile`: `canAddHandTile(state, tile)` が偽なら `state` をそのまま返す(二重防御)。真なら `hand` の末尾に追加(入力順で保持)。
- `remove-last-hand-tile`: 空なら `state` を返す。それ以外は末尾 1 枚を除く。
- `remove-hand-tile`: `index` が範囲外なら `state` を返す。範囲内ならその 1 枚を除く。除いた後の並びは変えない(整列は閉じるときに行う。2.5)。
- `clear-hand`: 既存のまま(AC が再利用)。
- `close-sheet`: 閉じる前の `inputFocus.type === 'hand'` なら `hand` を `sortHand(hand, maxHandLength(melds))` に置き換えてから閉じる。並びが変わらない場合も新しい配列を作ってよい。`inputFocus === null` のときは従来どおり `state` を返す。
- `open-sheet` で対象が `hand` 以外へ切り替わる場合(D4 以降)も整列する。【設計案】D2 時点では `hand` 以外の対象を開く UI が無いので、`open-sheet` の前の対象が `hand` で次が別の対象なら整列する、を reducer に入れておく(D4 で別対象が加わったときの抜け漏れ防止)。

### 2.3 純関数(`hand-rules.ts`)

```ts
export const maxHandLength = (melds: Meld[]): number => 14 - 3 * melds.length;
export const usedTiles = (input: AppInput, red: Rule['red']): Tile[]; // 手牌+instantiateMeld(副露)+dora+uradora+北×nuki
export const canAddHandTile = (state: Pick<AppState, 'input' | 'rule'>, tile: Tile): boolean;
  // hand.length < maxHandLength(melds) && isAvailableTiles(rule.red, usedTiles(...), [tile])
export const isHandFull = (input: AppInput): boolean;
export const sortHand = (hand: Tile[], max: number): Tile[];
  // hand.length === max なら先頭 max-1 枚を compareTiles で整列し末尾 1 枚を後ろに残す。そうでなければ全体を整列
export const splitWinningTile = (
  hand: Tile[],
  max: number
): {
  body: { tile: Tile; index: number }[];
  winning: { tile: Tile; index: number } | null;
};
  // 表示用。index は元の hand の位置。hand.length === max なら body=先頭 max-1 枚を整列、winning=末尾(index=max-1)。
  // そうでなければ body=全体を整列、winning=null
```

- 赤ボタン(`{type:'p'|'s', n:5, red:true}`)の可否も `canAddHandTile` で判定する。`rule.red = 0` のとき `isAvailableTiles` は赤を拒否する(`fiveCounts[1] <= 0`)。
- 通常の 5(`red:false`)は `4 − redCountOf` 枚まで(既存関数の挙動)。
- 抜き北は北の数として数える(`{type:'z', n:4}` を `nuki` 枚)。

### 2.4 パレット(`TilePalette.tsx`)

- 引数なし。`useAppState`・`useAppDispatch` を使う。
- CSS Grid `grid-template-columns: repeat(9, minmax(0, 1fr))`、`column-gap: 2px`、`row-gap: 0.25rem`、各行高さ 3rem(48dp)。
- 赤ボタン(赤五筒・赤五索)は牌キーとして扱う(1 列、375 幅で約 36dp)。
- 牌キーの寸法は、button 既定の padding・border を 0 にする前提で決めている(`.tile-palette__key { padding: 0; border: 0; }`)。
- 牌キー: `<button type="button" class="tile-palette__key" aria-label={tileLabelOf(tile)} disabled={!canAddHandTile(...)}>` の中に `Tile`(`onClick` なし)を置く。押下で `add-hand-tile`。牌画像は幅 100% を上限に、`--tile-width: min(100%, 2.25rem)` 相当で中央配置(高さ 48dp に収まる)。押下の状態層は既存のトークン(`--md-sys-color-on-surface` 等)で付ける。`disabled` 時は不透明度を下げる(MD3 の disabled 不透明度 0.38)。
- 行の内容:
  1. `1s … 9s`(5s は `red:false`)
  2. `1p … 9p`(5p は `red:false`)
  3. `1m 9m 1z 2z 3z 4z 5z 6z 7z`
  4. 機能行(下表)
- 4 行目の列配分(9 列):

| `rule.red` | 赤五筒 | 赤五索 | バックスペース | AC | Enter |
| --- | --- | --- | --- | --- | --- |
| 1・2 | 1 | 1 | 2 | 2 | 3 |
| 0 | なし | なし | 3 | 2 | 4 |

- 機能キーは `md` ラッパーの `Button`(Enter は filled、他は tonal)または `IconButton` を `grid-column: span N` で置く。文言・アイコン: バックスペース=⌫ アイコン(`aria-label="1 枚削除"`)、AC=「AC」(`aria-label="手牌をクリア"`)、Enter=改行アイコン(`aria-label="入力を終える"`)。ラベルの細部は製造の判断でよい。機能キーは 2 列以上を占めるので、幅は 48dp 以上になる。高さはグリッドの行の高さ(48dp)いっぱいに伸ばす(`height: 100%`)。md Button の実高さがその指定で 48dp になるかは実挙動未確認(条件 5・6 で測る)。
  - バックスペース → `remove-last-hand-tile`
  - AC → `clear-hand`
  - Enter → `close-sheet`(整列は reducer が行う)
- 機能キーは手牌が空でも `disabled` にしない(確定事項 6 の「常に有効」に従う。空のときのバックスペース・AC は reducer で無変化)。

### 2.5 閉じるときの整列

- 整列は `close-sheet` で行うため、**Enter・シート先頭の閉じるボタン・Esc のいずれで閉じても整列する**(mighty と同じ「閉じる操作はすべて整列」)。Enter だけ整列にすると閉じ方で結果が変わり、利用者が迷うため。
- 「オールクリア」(`clear-all`)は手牌を空にするので整列不要。

### 2.6 手牌カードの表示(整列・和了牌・1 行)

【設計案(要ヒアリング)】表示は常に整列する(mighty 準拠)。状態の `hand` は入力順のまま持ち、表示側で `splitWinningTile(hand, maxHandLength(melds))` を通す。満杯なら和了牌(入力の末尾)を右端に分離する。代案は「シートを閉じる(整列する)まで入力順で表示」。代案にする場合は `HandCard` で `splitWinningTile` を通さず `hand` をそのまま並べ、満杯時の末尾にだけ隙間を付ける(差分は数行)。

mighty のシート内プレビューから手牌カードへ移すもの/移さないもの:

| mighty の表示・挙動 | D2 | 理由 |
| --- | --- | --- |
| 整列した表示 | 移す(上記【設計案】) | 入力中も手牌が読みやすい |
| 和了牌の右端分離と隙間(mighty は 10px) | 移す。隙間 9px(通常の隙間 1px+追加の 0.5rem) | 1 行に収めるため mighty より狭くする(2.7 の計算) |
| 和了牌の発光表示 | 移さない | D2 の手牌カードは隙間だけで区別できる。強調色の追加は Epic E の結果表示と合わせて判断する |
| 入力中の枚数表示 N/cap | 移さない | 確定事項 1(補助表示を増やさない)と、満杯時はキーが disabled になり見ればわかるため |
| 入力途中のバッファ表示 | 移さない | パレットにバッファが無い(テンキーは D3) |
| 牌タップで削除 | 移さない(準備工事のみ) | D1 確定 |
| 使用済みのエラー文言 | 移さない | disabled で代える(確定事項 6) |

【事後注記】Issue #89 で採用(2.10 の注記参照)。

### 2.7 1 行表示の寸法

算出(375px 幅。CSS からの計算で、実挙動未確認。受け入れ条件 13 で実測する):
- `.main-screen` 左右 16 → 手牌カード外寸 343。`.hand-card` padding 12 → 319。`.hand-card__body` padding 8 と枠線 thin(1px 想定) → **牌列の内側幅 約 301px**(統括見積もりの約 309 より狭い)。360px 幅では約 286px。
- 現行(牌 23 + 隙間 2): 14 × 23 + 13 × 2 = 348 > 301 で、横スクロールになっている(D1 の算出は隙間と body の余白を数えていない)。

D2 の牌幅の決め方:
- `.hand-card__tiles` に `container-type: inline-size` を付け、牌幅を `--tile-width: min(1.75rem, calc((100cqi − (N − 1) × 1px − 0.5rem) / N))` とする。`N` は `maxHandLength(melds)`(D2 では 14)で、`HandCard` が `style={{ '--hand-max': N }}` として渡す。牌の間の隙間は 1px(`gap`)。和了牌の前だけ `margin-inline-start: 0.5rem` を足すので、和了牌の前の隙間は 1 + 8 = **9px** になる。式の内訳は「全牌の間の隙間 (N − 1) × 1px」+「和了牌の前の追加 8px」で、和了牌前の 9px と一致する。
- 375 幅: (301 − 13 − 8) / 14 = **20.0px**、高さ 26.7px。360 幅: (286 − 13 − 8) / 14 ≈ **18.9px**。
- 上限 1.75rem(28px)は、副露で N が減ったときの牌の大きさの上限。N=11 なら 375 幅で (301 − 10 − 8) / 11 ≈ **25.7px**。
- `overflow-x: auto` は残す(想定外に溢れたときの保険)。`flex-wrap: nowrap` のまま。
- 牌幅を `cqi` で決めるのは、カード幅(600px 上限〜375px)に追従させるため。`cqi` の対応は iOS Safari 16+・Chrome 105+(`docs/requirements.md` の対象環境の範囲内か、製造前に統括が確認する。実挙動未確認)。

### 2.8 要件§4 の改訂文言(オーナー承認済み。`docs/requirements.md` §4 に反映済み)

既存の文言(要件§4 のとおり。引用):

> 【確定】タップ領域は原則 48dp 以上とする(本プロジェクトの設計方針。WCAG 2.2 は AA 24px・AAA 44px)。ただし入力欄の細部(ステッパーの増減ボタン等、画面幅の都合で入り切らないもの)に限り、目標 44dp・最低 40dp とする。隣接ターゲット間隔は 8dp 以上を維持する(Connected button group のピル内の隙間 2dp は例外)。牌・数値の入力(パレット・テンキー・状況役)は底部シートで行い、片手で操作できるようにする

追加する文言【設計案。オーナー承認の対象】:

> 牌パレット(底部シートの 9 列の牌キー。赤五筒・赤五索のボタンを含む)に限り、タップ領域を高さ 48dp・幅は 9 等分(375px 幅で約 36dp。最低 36dp)とする。この幅は WCAG 2.2 の AA(24px)を満たし、AAA(44px)は満たさない。この緩和は牌キーにだけ適用し、他の入力欄には広げない。ステッパーの緩和とは別枠とする。
> 牌パレット全体(牌キー・赤ボタン・機能キー)は、隣接ターゲット間隔 8dp の例外とし、列の間隔を 2dp、行の間隔を 4dp とする。機能キーは 2 列以上を占め、幅・高さとも 48dp 以上とする。
> 画面幅の対象は 375px 以上で、この幅を検収の基準とする。360px は余裕の確認として寸法を測るが、牌キーの幅が約 34.7dp となり 36dp を下回ることは許容し、合格基準には含めない。

#### 2.8.1 承認の対象(要件§4 への追加。すべて未承認)

1. 牌キー(赤ボタンを含む)の幅を最低 36dp(高さ 48dp)に緩める。
2. パレット全体(牌キー・赤ボタン・機能キー)の列の間隔を 2dp、行の間隔を 4dp とし、8dp 規定の例外にする。
3. 360px 幅は余裕の確認とし、34.7dp は合格基準に含めない。

寸法(375 幅): シート内幅 = 375 − 左右 padding 16 × 2 = 343。(343 − 8 × 2) / 9 = **36.3dp**。360 幅: (328 − 16) / 9 = 34.7dp。

### 2.9 H3: 手牌カードの視認

- `HandCard` の外枠に `ref` を付け、CSS で `scroll-margin-bottom: calc(var(--sheet-height) + 0.5rem)`。
- `scroll-margin-top`: 要約カードが固定表示されているとき(`.summary-card--visible`)はその高さを足す。D2 では `scroll-margin-top: 0.5rem` とし、要約カードは D1 条件 21 が保留で現状 sticky が効いていない前提で扱わない。**条件 21 を修正するときに H3 の `scroll-margin-top` を再確認する**(6 章)。
- 発火: `inputFocus?.type === 'hand'` になったとき、および `--sheet-height` が変わったとき。監視とスクロールは **`inputFocus?.type === 'hand'` の間だけ**行う。`BottomSheet` は閉じるときとアンマウント時に `--sheet-height` を `0px` に戻すため、閉じている間も監視していると、閉じるたびに scrollIntoView が走ってしまう。直前の `--sheet-height` の値を保持し、前回と同じ値なら何もしない。`BottomSheet` は変更しない。`HandCard` は `useEffect` 内で `requestAnimationFrame` 後に `scrollIntoView({ block: 'nearest', behavior })` を呼ぶ。シート高さの変化は `MutationObserver` で `document.documentElement` の `style` 属性を監視して `--sheet-height` の値が変わったら再実行する(`BottomSheet` が `style.setProperty` で書くため)。
- `behavior`: `prefers-reduced-motion: reduce` なら `'auto'`、それ以外は `'smooth'`。
- 開くアニメーションは `translateY` で動かすだけで、シートの高さは変わらない。このため開く途中でも `--sheet-height` は最終の高さになる見込みで、開いた直後から最終位置で計算できる(実挙動未確認。受け入れ条件 15 で確認)。
- 下余白 `.main-screen__bottom-spacer`(高さ `--sheet-height`)は D1 のものを使い、変更しない。

### 2.10 牌タップ削除の準備工事

| 項目 | 内容 | 必要な理由 | 省いた場合のやり直しコスト |
| --- | --- | --- | --- |
| a. `remove-hand-tile { index }` アクションとテスト | 2.2。D2 の UI からは送らない | 削除の意味(入力順の index で消す、並びは変えない)を状態層で先に固め、表示の整列と index の対応を決めておく | 小。後から追加しても reducer の数行とテスト。省いてもよい |
| b. 表示から元の index を辿れる形 | `splitWinningTile` の返り値の各牌に元の `hand` の index を持たせる(2.3 の型) | 表示は整列済みなので、タップされた表示位置から状態の index を引けないと削除できない。key の安定化(現行は `${tile}-${表示順}`)にも使える | 中。後から足すと `splitWinningTile`・`HandCard`・テストを作り直す |
| c. `HandCard` の牌を 1 か所で描く | 牌 1 枚の描画を内部関数 `renderHandTile({tile, index})` にまとめる。`onClick` は渡さない | 将来 `Tile` に `onClick` を渡すだけで切り替えられる | 小。省いてもよい |
| d. カード本体ボタンとの入れ子を避ける構造 | 実施しない(記録のみ) | 現行は牌列がカード本体の `role="button"` の中にあるため、牌をボタンにすると入れ子のボタンになる。構造の組み替えはタップ削除を採るときに行う | 中。採るときに `HandCard` の DOM を組み替える |

【事後注記】Issue #89([issue-89-tile-tap.md](issue-89-tile-tap.md))で、オーナーの方針変更により手牌の牌のタップ削除を2段階(選択→もう一度のタップで削除)で採用した。2.10 の d の DOM 組み替えも同 Issue で行った。

推奨: b のみ必須、a・c は軽量なので実施、d は実施しない。a・c を省く判断は統括に委ねる(要ヒアリングではなく作り込み判断)。

## 3. 製造の段階化(コミット単位)

1. `hand-rules.ts` とテスト(2.3。`splitWinningTile` の `{ tile, index }` 形の返り値を含む)
2. `app-state.ts` のアクション追加・`close-sheet` の整列・テスト(2.2)
3. `TilePalette` と CSS、`MainScreen` への差し込み(2.4)
4. `HandCard` の整列表示・和了牌分離・1 行表示(2.6・2.7・2.10 c)
5. H3 のスクロール(2.9)

各コミット前に `npm run lint`・`typecheck`・`format:check`・`test`。

## 4. 実挙動未確認の一覧

- 手牌カードの内側幅(CSS からの算出 301px / 360 幅 286px)。
- シートの高さ: 見込みは 閉じるボタン行 48 + 4 行 × 48 + 行間 3 × 4 + 下 padding 16 = 268px(+ safe-area)。50dvh(812 高で 406、667 高で 333)に収まる見込み。
- `cqi` による牌幅の追従、`scrollIntoView` と `scroll-margin` の組み合わせ(iOS Safari)。
- 開く途中の `--sheet-height` の値。
- D2 で `?gallery=tiles` が無い状態での SVG 出力・precache(条件 16・17 で確認)。
- 機能キー(md Button)の実高さが 48dp になるか(条件 5・6 で確認)。

## 5. 受け入れ条件

検収幅は 375×812(DevTools のデバイス表示)。360×800 は余裕の確認として、寸法をあわせて測って報告する(合否には含めない)。dev サーバーは自分で起動したものだけをポート指定で止める。

1. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて成功する。
2. `hand-rules.test.ts` に以下のケースがあり通る: `maxHandLength([])===14`、ポン 1 つで 11。`canAddHandTile` が (a) 同じ牌 4 枚の手牌に 5 枚目で偽、(b) `red=1` で赤五筒 1 枚使用後の赤五筒で偽・通常五筒で真、(c) `red=0` で赤五索が偽、(d) 手牌 14 枚で任意の牌が偽、(e) ドラに 1p 2 枚+裏ドラに 1p 1 枚+手牌 1p 1 枚で 1p が偽、(f) `nuki=2`+手牌北 2 枚で北が偽、(g) 2m が偽。`sortHand` が 14 枚で末尾を残し、13 枚で全体を整列する。`splitWinningTile` について: 入力順 `[9s, 1m, 5p]`(max 14)で `body` の並びが 1m・5p・9s になり、各要素の `index` がそれぞれ 1・2・0(元の位置)であること。満杯 14 枚では `winning.index === 13` で、`body` の各 `index` が 0〜12 を重複なく含むこと。
3. `app-state.test.ts` に以下があり通る: `add-hand-tile` が不可の牌で同一 `state` を返す。`remove-last-hand-tile` が空で同一 `state`。`remove-hand-tile` が範囲外で同一 `state`、範囲内で並びを保って 1 枚除く。`close-sheet`(対象 hand)が 14 枚で末尾を残して整列、13 枚で全体整列。
4. 手牌カードを押すとシートが開き、シート内に 4 行 × 9 列のキーだけがある(閉じるボタン行を除き、牌・機能キー以外の表示が無い)。1〜3 行目の並びが 2.4 のとおり(各キーの `aria-label` を DevTools で確認)。
5. 375 幅で、牌キーの `getBoundingClientRect()` が 幅 36.0〜36.6px・高さ 48px、隣接キーの左端差 − 幅 = 2px(±0.5)。上下の行の間隔は 4px(±0.5)。機能キーの高さは 48px(±0.5)、幅は 48px 以上。360 幅の牌キーの幅(見込み 34.4〜35.0px)は測って報告する(合否に含めない)。
6. 既定ルール(`red` 既定値)で 4 行目が [赤五筒][赤五索][⌫ 2 列][AC 2 列][Enter 3 列]。設定で赤 0 にすると(D6 前は DevTools で `set-rule` 相当を行うかテストで代替。検収担当は `TilePalette` のテストで `red=0` の描画を確認してよい)赤が消え [⌫ 3][AC 2][Enter 4]。どちらの配置でも機能キーの高さが 48px(±0.5)。
7. 牌キーを押すと手牌カードに牌が 1 枚増える。5 以外の牌(例: 1s)を 4 回押すとそのキーが `disabled` になり、文言・バッジは出ない。
8. 赤五筒を `red` の色ごと枚数ぶん押すと赤五筒キーが `disabled`。通常の五筒は `4 − red` 枚で `disabled`。
9. 14 枚入れると全牌キー(赤を含む)が `disabled`、⌫・AC・Enter は有効。
10. ⌫ で手牌の入力の末尾 1 枚が消え(満杯時は分離表示の和了牌が消える)、AC で手牌が空になる(確認なし)。空のときに ⌫・AC を押してもエラーにならない。
11. 入力順 `9s 1p 1m 5p …` で入れた途中でも、手牌カードの表示は m→p→s→z の順(【設計案】2.6。案が変わった場合はその案で確認)。
12. Enter・閉じるボタン・Esc のそれぞれで閉じた後、React DevTools(または `app-state` のテスト)で `input.hand` が整列済み。14 枚のとき末尾の牌は入力の最後の牌のまま。
13. 375 幅で 14 枚入力時、`.hand-card__tiles` の `scrollWidth === clientWidth`(横スクロール無し)で全牌が 1 行。牌幅を記録する(19.5〜20.5px 見込み)。和了牌の前の隙間(和了牌の左端 − 直前の牌の右端)が 9px(±0.5)。内側幅(`clientWidth`)の実測値を報告する。360 幅でも同じ値を測って報告する(合否に含めない)。
14. シート表示中の `--sheet-height` を 375×812 で実測し、50dvh 以下であること。360×800 の値もあわせて報告する。
15. 手牌カードがシートに隠れる位置(上の入力欄を DevTools で一時的に高くする等。コードは変えない)でシートを開くと、手牌カードの下端がシート上端より 8px 以上上に来る。シートが開いた状態で牌を入れても手牌カードが隠れない。シートを閉じたとき(Enter・閉じるボタン・Esc)は、閉じる直前と比べて `window.scrollY` が手牌カードへのスクロールで変わらない(閉じるときに scrollIntoView が走らない)。
16. `npm run build` 後、`dist/assets` に牌 SVG が出力されている(`ls dist/assets/*.svg | wc -l` が 30 以上。C3 条件 7 相当)。
17. `for f in dist/assets/*.svg; do grep -q "$(basename $f)" dist/sw.js || echo $f; done` の出力が空(C3 条件 9 相当)。
18. バンドル予算(目標値): D1 条件 12 と同じ測り方で、`dist/index.html` の `<script type="module" src>` と `<link rel="modulepreload" href>` が指す JS をそれぞれ `gzip -9 -c <file> | wc -c` で測り、その合計が 102,000 B 以下であることを目標とする。この項目は不合格にしない。超過した場合は、超過量を事実として最終報告と PR 本文に書く。
19. 変更したファイル(`git diff main --name-only`)にホームディレクトリ名・絶対パスが無いことを目視で確認する。色の HEX 直書きが新規 CSS に無い(`rg -n '#[0-9a-fA-F]{3,6}\b' src/ui/input src/ui/screen/main-screen.css` が空)。

実機確認(C-02 の逆発注): シート内の操作性、牌キーの押しやすさ(360 幅を含む)、H3 のスクロール。

## 6. 後続 Issue への引き継ぎ

- **D3**: `add-hand-tile`・`remove-last-hand-tile`・`clear-hand`・`close-sheet` を共用する。拒否は `canAddHandTile` で判定し、テンキーのフィードバック(文言の要否)は D3 で決める。`src/ui/input/` に置く。物理キーは Esc と衝突させない。
- **D4**: 副露を足すと `maxHandLength` が減り、表示の牌幅も `--hand-max` で大きくなる。ドラ・裏ドラ・副露の入力は `usedTiles` に既に数えられる。別対象のシートへの切り替え時の整列(2.2 の【設計案】)を確認する。副露追加で手牌が上限を超える場合の扱いは D4 で決める。
- **D1 条件 21 を直すとき**: H3 の `scroll-margin-top` に要約カードの高さを足すかを再確認する。
- **牌タップ削除を採るとき**: 2.10 の d(カード本体ボタンとの入れ子回避の DOM 組み替え)を行い、`Tile` に `onClick` を渡して `remove-hand-tile` を送る。
  【事後注記】Issue #89 で採用(2.10 の注記参照)。
- **requirements.md §4**: 2.8 の文言を承認後に反映する。

## 7. D2 に含めない範囲

テンキー・方式切替・物理キー、ドラ・副露・抜き北・状況役の入力、和了牌の強調色、枚数表示、牌タップ削除の接続、要約カードの修正、シート高上限の変更。

【事後注記】Issue #89 で採用(2.10 の注記参照)。
