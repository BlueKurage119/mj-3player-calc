# Issue #89 設計書: 結果欄の牌タップによる打牌・ツモと、手牌タップによる削除(F1-1)

- 対象 Issue: #89(Epic F #7 の Sub-Issue。F1 #88 の関連)
- ブランチ: `feature/issue-89-tile-tap-delete`(main `fa55cee` から)
- 依存: **F1(#88、ブランチ `feature/issue-88-discard-list`、未マージ)が main に取り込まれていること**。製造は F1 のマージ後、main を取り込んでから着手する(5章)。
- 範囲: 手牌の牌の2段階タップ削除、結果本体(`TempaiBody`・`ShantenBody`・`DiscardBody`)の牌のタップによるツモ・打牌、要件§4 の例外追加と D1・D2・E1 設計書への事後注記
- 範囲外: バナー(`ResultGlance`・`ResultBanner`)の牌、副露・ドラ・裏ドラ・抜き北の牌、和了表示(`HoraBody`)の牌、`DiscardItem` 内の待ち・受け入れの牌、アンドゥ、ロン・ツモの区別、タップ後のスクロール

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- `AGENTS.md`、`docs/rules/02-design-protocol.md`・`05`・`06`・`07`・`09` 号
- Issue #89 本文、統括のヒアリング報告(F1-1。1〜3章=事実と論点、5章=オーナー確定、6章=未確定点)
- `docs/requirements.md` §4(68行目のタップ領域の【確定】)
- 設計書 `issue-46-palette-input.md`(D2)、`issue-51-screen-skeleton.md`(D1)、`issue-75-result-switch.md`(E1)、F1 の `issue-88-discard-list.md`(ブランチ上の第4版)
- コード: `src/ui/state/app-state.ts`・`hand-rules.ts`、`src/ui/screen/HandCard.tsx`・`main-screen.css`・`MainScreen.tsx`・`ResultPanel.tsx`、`src/ui/result/slots.tsx`・`ResultBody.tsx`・`result.css`、`src/ui/tile/Tile.tsx`・`tile.css`、`src/ui/input/tenkey-logic.ts`、F1 ブランチの `src/ui/result/discard.tsx`・`result.css`・`ResultBody.tsx`

### 1.2 確定事項(オーナー確定。再検討しない)

| # | 内容 | 反映先 |
| --- | --- | --- |
| 1 | 手牌の牌の削除は2段階: タップで牌の色が変わる(選択)→同じ牌をもう一度タップで削除。別の牌をタップでその牌に選択が移る。別の場所をタップで選択解除。アンドゥは設けない | 2.3・2.4 |
| 2 | 手牌の牌のタップ領域は現状の大きさのまま。要件§4 に例外を追加(実測値は受け入れ条件で測る) | 2.4・2.8・6章 |
| 3 | 結果欄でタップ可にするのは本体のみ(`TempaiBody`・`ShantenBody` の待ち牌・有効牌=ツモ、`DiscardBody` の打牌候補=打牌)。バナーは対象外 | 2.5・2.6 |
| 4 | 結果欄の牌は牌のみをボタンにする(枚数表示 ×N は含めない)。この例外も要件§4 に追加 | 2.5・2.8 |
| 5 | 対象は手牌のみ(副露・ドラ・裏ドラ・抜き北は対象外) | 範囲 |
| 6 | 1本の設計書・1本の PR | 本書 |

### 1.3 統括が決めた既定(ヒアリング済み事項として扱う)

| # | 内容 | 反映先 |
| --- | --- | --- |
| A | ツモ=`add-hand-tile`(末尾追加) | 2.2・2.5 |
| B | 打牌=手牌から同じ牌(赤は赤同士)を1枚削除。ツモ切り優先の有無は設計者が決める | 2.2 |
| C | ロン・ツモの区別は入力仕様外なので変えない | 範囲外 |
| D | 枚数上限・残り枚数・赤牌の整合は既存の `canAddHandTile` を通す | 2.2 |
| E | タップ後のスクロールはしない。テンキーの数字入力バッファは既存の `tenkeyBuffer: ''`(破棄)に合わせる | 2.2 |
| F | 色は HEX 直書き禁止(トークン)。UI 文言は日本語、見ればわかるラベルは省略 | 2.4・2.5 |

### 1.4 実物で確認した事実

- `app-state.ts`: `add-hand-tile`(`canAddHandTile` で拒否時は `state` をそのまま返す)・`remove-hand-tile { index }`(範囲外 index は無視。D2 の準備工事、UI 未接続)がある。どちらも `tenkeyBuffer: ''` にする。履歴(アンドゥ)は無い。
- `HandCard.tsx`: 外枠 `div.hand-card` の `onClick` がシートを開く(`.card-clear-zone` 内は除外)。牌列 `.hand-card__tiles` は `role="button"`・`tabIndex=0`・`data-sheet-opener` の `.hand-card__body` の中にある。牌は `Tile`(`onClick` なし=`span role="img"`)。和了牌は `splitWinningTile` の `winning` を `span.hand-card__winning-tile`(`--md-sys-color-tertiary` の outline)で包む。`splitWinningTile` は各牌に元の `hand` の index を返す。
- 手牌の牌幅: `--tile-width: min(1.75rem, (100cqi - 4px - (max-1)*1px - 0.25rem) / max)`、牌の間隔 `gap: 1px`。375px 幅・`max=14` で概算 21〜22px(実挙動未確認。条件 A3 で測る)。
- `Tile.tsx`: `onClick` を渡すと `button.tile`(`aria-pressed={selected}`)。`selected` は `outline: 2px solid var(--md-sys-color-primary); outline-offset: 1px`(色の変化ではなく枠)。`button.tile::after` に scrim の状態層がある。
- `tenkey-logic.ts`: 物理キーは `.bottom-sheet` 内か `[data-sheet-opener]` 内にフォーカスがあるときだけ拾う。よって `data-sheet-opener` の外に置いたボタンでは Enter/Space はブラウザ既定(click)になる。
- `slots.tsx`(main): `TempaiBody`・`ShantenBody` は `.result-body__wait`(`Tile` と `×N` の span)を `.result-body__tiles`(`gap: 0.5rem 0.75rem`)に並べる。`GlanceTiles` には `onTileClick?` があり、バナーと F1 の `TempaiDiscardDetail` が使う。
- F1(ブランチ)`discard.tsx`: `DiscardBody({ discards })` → `ul.discard-list` → `DiscardItem({ discard })` → `span.discard-item__tile`(「打」ラベル+`Tile`。`--tile-width: 2.25rem`)と `div.discard-item__detail`(待ち・受け入れの牌)。`ResultBody` は `view.kind === 'discard'` で `<DiscardBody discards={view.discards} />`。
- 結果は `MainScreen` → `ResultPanel`(`resultState`・`dispatchTimestampRef`・`context`)→ `ResultBody`。E1 4章の申し送りで「打牌・自摸の操作は `MainScreen` から props で渡し、スロット部品から `dispatch` を直接呼ばない」。`MainScreen` の `trackedDispatch` が 100ms 計測用の時刻を記録する。

## 2. 設計

### 2.1 モジュール構成

| ファイル | 区分 | 変更 |
| --- | --- | --- |
| `src/ui/state/hand-rules.ts` | 改修 | 純関数 `findDiscardIndex` を追加 |
| `src/ui/state/app-state.ts` | 改修 | action `discard-hand-tile { tile }` を追加 |
| `src/ui/state/index.ts` | 改修 | `findDiscardIndex` を再輸出 |
| `src/ui/screen/HandCard.tsx` | 改修 | DOM 組み替え(2.3)、選択状態と2段階削除(2.4) |
| `src/ui/screen/hand-selection.ts` | 新規 | 選択の遷移の純関数(2.4) |
| `src/ui/screen/main-screen.css` | 改修 | 開くボタン・牌ボタン・選択色 |
| `src/ui/result/slots.tsx` | 改修 | `TempaiBody`・`ShantenBody` に `onTsumo?` |
| `src/ui/result/discard.tsx`(F1) | 改修 | `DiscardBody`・`DiscardItem` に `onDiscard?` |
| `src/ui/result/ResultBody.tsx`・`src/ui/screen/ResultPanel.tsx`・`MainScreen.tsx` | 改修 | `tileActions` の受け渡し |
| `src/ui/result/result.css` | 改修 | 必要なら結果の牌ボタンの微調整のみ |
| テスト | 新規・改修 | 2.7 |
| `docs/requirements.md`・`docs/design/issue-46/51/75` | 改訂 | 2.8(製造フェーズの着手時) |

### 2.2 状態層

**`findDiscardIndex(hand: Tile[], tile: Tile): number`**(`hand-rules.ts`)

- 同じ牌の判定: `type` と `n` が等しく、かつ数牌の 5 なら赤の有無(`red === true` か否か。`undefined` は非赤)も等しい。字牌・5 以外は赤を見ない。既存の牌比較ヘルパーがあればそれを使ってよい(意味は上の通り)。
- **末尾から探し、最初に一致した index を返す(ツモ切り優先)【設計案】**。理由: 手牌は入力順で、末尾は直前に加えた牌(ツモ牌・和了牌の位置)。同じ牌が複数あるとき、どれを消しても残る手牌の牌の集合は同じなので計算結果は変わらない。違いは残る手牌の末尾の牌(14枚時の和了牌の表示位置)だけで、打牌後は 13 枚以下になり和了牌の分離表示も消えるため、実害はない。末尾から探すのは「ツモ切り」を自然に表すため。
- 一致なしは `-1`。赤の不一致を同種の別の牌で代替しない(既定 B)。

**action `{ type: 'discard-hand-tile'; tile: Tile }`**(`app-state.ts`)

- `findDiscardIndex(state.input.hand, action.tile)` が `-1` なら `state` をそのまま返す。そうでなければ `remove-hand-tile` と同じ結果(その index を除き、`tenkeyBuffer: ''`)を返す(共通化は製造の判断)。
- 理由: 画面側で index を引くと、描画時点の `hand` を閉包で持つことになる。reducer 内で引けば常に最新の状態で決まり、単体テストもしやすい。

**ツモ**: 既存の `add-hand-tile` をそのまま送る(`canAddHandTile` が上限・残り枚数・赤を検査。拒否時は無変化)。拒否時の揺れ演出(`useRejectFeedback`)は手牌カード選択中だけの既存仕様で、結果欄からのタップでは出さない(無変化が反応)。

### 2.3 `HandCard` の DOM 組み替え(D2 2.10 の d)

牌をボタンにすると `role="button"` の本体の中に button が入れ子になるため、次の形に組み替える【設計案】。

```
div.hand-card(onClick: 牌ボタン・ゴミ箱以外ならシートを開く。従来どおり)
├ div.hand-card__top-row
│ ├ button.hand-card__opener(type=button, data-sheet-opener, aria-label="手牌を入力",
│ │   onKeyDown=handleHandBodyKey, 中身はタイトル文字列 "手牌 (n/max)")
│ └ CardClearButton(従来どおり)
└ div.hand-card__body(role・tabIndex・aria-label・data-sheet-opener・onKeyDown を外す。style の --hand-max は残す)
  └ div.hand-card__tiles(role="group" aria-label="手牌の牌")
     ├ Tile(onClick あり=button)× 本体
     ├ span.hand-card__winning-tile > Tile(onClick あり)  … 和了牌
     └ span.hand-card__buffer(従来どおり)
```

- キーボードでシートを開く入口はタイトルのボタン(`hand-card__opener`)に移す。`bodyRef` はこの要素に付け替え、`handleCardClick`・`handleClear` の `focus({ preventScroll: true })` もこれを対象にする。`handleHandBodyKey`(選択中は Enter/Space を素通し)はそのまま流用する。
- フォーカスリングは `.hand-card__opener:focus-visible` に出す(従来の `.hand-card__body:focus-visible` の見た目を移す。カード全体に出すなら `.hand-card:has(.hand-card__opener:focus-visible)` でもよい。製造の判断)。opener の見た目はタイトルの文字のまま(ボタンの背景・枠を付けない)。
- ポインタの当たり判定は従来どおりカード外枠のクリックで開く。`handleCardClick` の除外条件に `target.closest('.hand-card__tiles button.tile')` を足す(牌のタップではシートを開かない)。
- 物理キー: 牌ボタンは `data-sheet-opener` の外になるので、フォーカス中の Enter/Space はテンキー処理に拾われず、ブラウザ既定の click になる(1.4)。
- 却下した案: (a) 牌列を本体ボタンの外に絶対配置で重ねる(当たり判定が二重になり、空の手牌の扱いが複雑)。(b) 本体を `role="group"` にして tabIndex だけ残す(非ボタンのフォーカス可能要素が Enter で開くのは a11y 上不適切)。
- `formatHandCardTitle` の文字列は変えない。既存テストのうち `role="button"` 名「手牌を入力」を引くものは、opener を引くように直す。

### 2.4 手牌の選択と2段階削除

**置き場: `HandCard` のローカル状態【設計案】**

| 案 | 内容 | 得失 |
| --- | --- | --- |
| **a(採用)** | `HandCard` の `useState` | 選択は手牌カードの見た目だけに関わり、計算・他の部品は参照しない。`AppState` と reducer の全 action に解除処理を足さずに済む |
| b | `AppState.handSelection` | 全 action で解除を書く必要があり、変更が広い。他部品から参照する用途が無い |

- 状態は `{ index: number; hand: Tile[] } | null` とし、**描画時に `sel.hand === input.hand`(参照の一致)のときだけ選択とみなす**。手牌が変わればどの経路(パレット・テンキー・クリア・結果欄のツモ/打牌・削除・赤の変更)でも自動で解除される。`useEffect` での解除は不要。

**遷移(`hand-selection.ts` の純関数)**

`nextHandTap(selected: number | null, tapped: number): { selected: number | null; remove: number | null }`

| 現在 | 操作 | 結果 |
| --- | --- | --- |
| なし | 牌 i をタップ | i を選択 |
| i | 牌 i をタップ | `remove-hand-tile { index: i }` を送る。選択なし(手牌が変わるので自動でも解除) |
| i | 牌 j(≠i)をタップ | j を選択 |
| i | 牌ボタン以外をポインタで押す(画面のどこでも。カード本体・ゴミ箱・シート・結果欄・ヘッダ等) | 選択なし |
| i | Esc | 選択なし(Esc が別の機能も持つ場合はその動作も従来どおり行う) |

- 「別の場所」の検出: 選択中だけ `document` に `pointerdown`(capture)を登録し、`event.target` が `.hand-card__tiles button.tile` の内側でなければ解除する(HelpTooltip の外側 pointerdown と同じ方式)。
- **カード本体(牌以外)のタップは「選択解除」と「シートを開く(従来動作)」を同時に行う【設計案】**(下の要ヒアリング Q1)。理由: 解除のためだけに1タップを消費させない。従来動作を変えない。
- ゴミ箱(手牌クリア)を押した場合も解除し、クリアは従来どおり実行される。
- 削除は `remove-hand-tile`(既存。`tenkeyBuffer: ''`)。シートの開閉状態は変えない。

**見た目(選択色)**

- `Tile` の `selected` を渡す(`aria-pressed="true"` を得るため)が、見た目は手牌カード内で上書きする。理由: 既存の `selected` は 2px の枠(offset 1px)で、牌の間隔 1px の手牌では隣の牌に枠が重なり、確定事項1の「色が変わる」とも異なる。
- `main-screen.css` で `.hand-card__tiles .tile[aria-pressed="true"]` の outline を消し、`::after` の状態層を `background: var(--md-sys-color-primary); opacity: 0.38` にする【設計案】(値は UI 監修で調整可。HEX 不可)。押下中・ホバーの状態層(scrim)と重ねない(選択中は primary を優先)。
- 和了牌の tertiary の枠(`.hand-card__winning-tile`)は選択中も残す。

**a11y**

- 牌ボタンの `aria-label`: 非選択は牌名(`tileLabelOf`)、選択中は「`牌名`、もう一度押すと削除」【設計案】。`aria-pressed` で選択状態を伝える。
- 牌ボタンは Tab 順に入る(14枚なら最大 14 停止)。ロービングタブインデックスは入れない【設計案】(過剰設計を避ける。UI 監修で要否を判断)。

### 2.5 結果本体の牌のボタン化(ツモ)

- `TempaiBodyProps`・`ShantenBodyProps` に `onTsumo?: (tile: CoreTile) => void` を足す。渡されたとき、`.result-body__wait` 内の `Tile` に `onClick={() => onTsumo(t)}` と `aria-label={`${tileLabelOf(t)}をツモ`}` を渡す(牌だけが button。`×N` の span は button の外のまま=確定事項4)。未指定時は従来どおり非ボタン(既存テストを壊さない)。
- `count > 0` の牌だけが表示されるので、通常 `canAddHandTile` は拒否しない。拒否されても無変化。
- 牌の見た目(幅 24px 前後)は変えない。当たり判定の拡張もしない(確定事項4。要件§4 に例外)。横方向の隣のボタンとの間には `×N` の文字と `column-gap: 0.75rem` があり、縦は `row-gap: 0.5rem`(8px)。いずれも実測で確認する(条件 B3)。

### 2.6 打牌候補のボタン化(F1 の構造に依存)

- `DiscardBodyProps`・`DiscardItemProps` に `onDiscard?: (tile: CoreTile) => void` を足す。渡されたとき、`span.discard-item__tile` 内の `Tile` に `onClick={() => onDiscard(discard.tile)}`・`aria-label={`${tileLabelOf(discard.tile)}を切る`}` を渡す【設計案】。「打」のラベルは button の外(牌のみボタン)。
- `DiscardItem` 内の待ち・受け入れの牌(`TempaiDiscardDetail` の `GlanceTiles`、`ShantenDiscardDetail` の `Tile`)はボタンにしない(打牌前の手牌に加える操作は意味がないため。`onTileClick` を渡さない)。
- 打牌候補の牌は幅 2.25rem(36px)。隣の候補(`li` の縦並び)との間隔は実測する(条件 C3)。
- **F1 の構造が変わった場合の影響箇所**: 本節は F1 第4版のブランチ上の実装に合わせている。マージ時に (1) `DiscardItem` の名前・props、(2) 打牌牌の要素(`span.discard-item__tile` と `Tile`)、(3) `ResultBody` から `DiscardBody` への props の渡し方、(4) `--tile-width` が変わっていたら、本節・2.7・条件 C1〜C4・2.8 の要件文言の数値(36px)を F1 の実物に合わせて読み替える。構造が大きく変わった(例: 打牌牌が既に button の中にある)場合は製造を止め、統括へ差し戻す。

### 2.7 受け渡し(`MainScreen` → `ResultPanel` → `ResultBody`)

```ts
// src/ui/result/ResultBody.tsx
export interface ResultTileActions {
  tsumo: (tile: CoreTile) => void;
  discard: (tile: CoreTile) => void;
}
// ResultBodyProps に tileActions?: ResultTileActions を追加
// tempai/shanten → onTsumo={tileActions?.tsumo}、discard → onDiscard={tileActions?.discard}
```

- `ResultPanel` に `tileActions?: ResultTileActions` を足し、`ResultBody` へ渡す。
- `MainScreen` で `tsumo: tile => trackedDispatch({ type: 'add-hand-tile', tile })`、`discard: tile => trackedDispatch({ type: 'discard-hand-tile', tile })` を作って渡す(100ms 計測の時刻記録を通すため `trackedDispatch` を使う)。スロット部品から `dispatch` を直接呼ばない(E1 申し送り)。
- スクロールしない(既定 E)。シートの開閉状態も変えない。

### 2.8 文書の改訂(製造フェーズの着手時に行う。設計フェーズでは改訂しない)

Issue 本文に従い、【確定】の扱いの変更はオーナーの確認を取ってから行う(統括が確認する)。

**(1) `docs/requirements.md` §4(68行目の【確定】の段落)**: ゴミ箱の例外の文の後(「…他の入力欄には広げない(Issue #55・#48)。」の後、「牌・数値の入力(…)は底部シートで行い」の前)に次を挿入し、冒頭の更新日の行に「Issue #89 で§4 に手牌の牌と結果欄の牌のタップ領域の例外を追加」を追記する。数値は条件 A3・B3・C3 の実測値で置き換える(下の〔 〕)。

> 手牌カードの牌(タップで選択、もう一度のタップで削除)に限り、タップ領域を牌の見た目と同じ大きさとする(375px 幅・14枚で幅約〔A3 の実測〕dp・高さ約〔同〕dp)。この幅は WCAG 2.2 の AA(24px)を満たさない場合がある。牌の間隔は 1dp とし、隣接ターゲット間隔 8dp の例外とする。誤操作は2段階の操作(選択→削除)で防ぐ。結果欄の本体の牌(聴牌・向聴の待ち牌・有効牌、何切るの打牌候補)に限り、タップ領域を牌の見た目と同じ大きさとする(待ち牌・有効牌は幅約〔B3〕dp、打牌候補は幅約〔C3〕dp)。枚数表示はタップ領域に含めない。隣接ターゲット間隔は〔B3・C3 の実測。8dp 未満ならその値と例外である旨〕とする。これらの緩和は手牌と結果欄の本体の牌にだけ適用し、他の入力欄・バナーの牌には広げない(Issue #89)。

**(2) `docs/design/issue-46-palette-input.md`(D2)**: 次の各箇所の直後に事後注記を1行ずつ置く(本文は消さない)。
- 7行目(範囲外「牌タップ削除の接続」)、32行目(確定事項10)、149行目(「牌タップで削除|移さない」の表行。表の直後)、194行目の 2.10 節(d の行を含む表の直後)、255行目(引き継ぎ)、260行目(範囲外)。
- 注記文: 「【事後注記】Issue #89([issue-89-tile-tap.md](issue-89-tile-tap.md))で、オーナーの方針変更により手牌の牌のタップ削除を2段階(選択→もう一度のタップで削除)で採用した。2.10 の d の DOM 組み替えも同 Issue で行った。」(2.10 の後ろだけ全文、他の箇所は「Issue #89 で採用(2.10 の注記参照)」と短縮してよい)

**(3) `docs/design/issue-51-screen-skeleton.md`(D1)**: 34行目(確定事項9)の表の直後と、281行目(2.9「牌のタップで削除しない」)の直後に事後注記: 「【事後注記】Issue #89([issue-89-tile-tap.md](issue-89-tile-tap.md))で牌のタップ削除(2段階)を採用し、キーボードでシートを開く入口をカード本体からタイトルのボタンに移した。ポインタではカード全体で開く動作を維持する。」

**(4) `docs/design/issue-75-result-switch.md`(E1)**: 29行目(確定事項9)の表の直後、185行目(2.5 の牌タップ)の直後、225行目(4章の申し送り)の直後に事後注記: 「【事後注記】Issue #89([issue-89-tile-tap.md](issue-89-tile-tap.md))で本体(聴牌・向聴・何切る)の牌のタップによるツモ・打牌を実装した。バナーは対象外のまま(申し送り(2)のバナー分割は未実施)。操作は `MainScreen` から props(`tileActions`)で渡した。」

行番号は main `fa55cee` 時点。F1 のマージ等でずれていれば、引用した文言で位置を特定する。

### 2.9 初回 JS(09号)

`HandCard`・`slots.tsx`・`ResultBody`・状態層はすべて初回チャンク。増分の積算【設計案】: 状態層(`findDiscardIndex`・action)約 0.15 kB、`hand-selection.ts`・`HandCard` の選択と pointerdown 約 0.35 kB、結果本体・受け渡し約 0.2 kB。計 約 +0.7 kB(gzip)。CSS は JS 外。条件 E2 で実測し、PR に記録する。

### 2.10 UI 監修の観点

- 選択色(primary・不透明度)が牌の絵柄を潰さず、ライト・ダークの両方で判別できるか。和了牌の tertiary 枠との見分け。
- 手牌の牌(約 22px・間隔 1px)の押しやすさ。誤選択の頻度。
- タイトルが opener になったことの見た目(ボタンらしさを足さない方針の妥当性)とフォーカスリングの位置。
- 結果欄の牌が押せることの示唆(ホバーの状態層のみ。追加のラベルは付けない=見ればわかるラベルは省略)。

## 3. テスト方針(05号)

- `hand-rules.test.ts`: `findDiscardIndex` — 一致なし `-1`、末尾優先(同じ牌が先頭と末尾にあるとき末尾の index)、赤5と非赤5の区別(赤の打牌は赤だけ、非赤は非赤だけ)、字牌。
- `app-state.test.ts`: `discard-hand-tile` — 一致で1枚減る・`tenkeyBuffer` が `''`、一致なしで同じ参照の `state`。`add-hand-tile` の拒否(上限・残り0)が結果欄経路でも無変化であることは既存テストで担保済みなら追加不要。
- `hand-selection.test.ts`: 2.4 の遷移表の全行。
- `HandCard` のテスト(Testing Library): 牌が button として取れる/1回目のタップで `aria-pressed="true"`・手牌は不変/同じ牌の2回目で1枚減る(和了牌の位置の牌も)/別の牌で選択が移る/牌以外(カード本体)の pointerdown で解除され、かつシートが開く/Esc で解除/手牌が外部で変わると解除/牌のタップでシートが開かない/opener の Enter で開く(非選択時)・既存の `handleHandBodyKey` テストの維持。
- `TempaiBody`・`ShantenBody`・`DiscardBody` のテスト: `onTsumo`/`onDiscard` を渡すと牌だけが button(`×N`・「打」は button 外)、押すとその牌で呼ばれる/未指定なら button が無い/`DiscardItem` 内の待ち・受け入れの牌は button でない。
- 結合(`MainScreen` か `ResultPanel`): 聴牌の待ち牌タップで手牌が 14 枚になる、打牌候補タップで 13 枚になる。

## 4. 後続 Issue への引き継ぎ

- バナーの牌タップを採る場合は、E1 申し送り(2)のバナー分割が未実施のまま残る。
- 副露・ドラ・裏ドラの牌タップは未対応。同じ2段階の部品(`hand-selection.ts`)を流用できる形にしてある。
- アンドゥは無い。必要になれば reducer の外側で直前状態を持つ形を検討する。
- `discard-hand-tile` は何切る以外(例: 牌譜入力)でも使える。

## 5. 製造の前提と手順

1. F1(#88)が main にマージされていることを確認し、`feature/issue-89-tile-tap-delete` に main を取り込む。F1 未マージなら着手しない。
2. 2.6 の「影響箇所」を F1 の実物と照合する。
3. 2.8 の文書改訂は、統括がオーナーの確認を取った後に行う(実測値の〔 〕は検収前に製造が実測して埋め、検収で再確認する)。

## 6. 受け入れ条件

前提: `npm run build` 後に `npx vite preview` で確認する(本番ビルド。dev での確認だけでは合格にしない)。計測は DevTools のデバイスエミュレーションで幅 375px(主)・360px(余裕確認)。寸法は `getBoundingClientRect()` で取る。

**A. 手牌の牌**
- A1: 手牌に13枚入力し牌を1回タップ → 手牌の枚数表示は不変、その牌だけ色が変わる(`aria-pressed="true"`)、シートは開かない(閉じていた場合)。
- A2: 同じ牌をもう一度タップ → その牌が1枚消え、タイトルが「手牌 (12/14)」になる。別の牌をタップ → 選択が移り、元の牌の色が戻る。
- A3: 375px 幅・14枚で、各牌ボタンの幅・高さ、隣の牌ボタンとの間隔を記録する(数値を PR に書く。期待は幅約 21〜22px・間隔 1px 前後。この値が 2.8 の要件文言に入っていることを確認)。360px でも同様に記録する(合否は問わない)。和了牌(14枚目)も押せて2段階で消える。
- A4: 選択中にカード本体(牌の無い余白)を押す → 選択が解除され、シートが開く。選択中に結果欄・ヘッダ・シートを押す → 解除される。Esc → 解除。
- A5: 選択中にパレットで牌を加える → 選択が解除される。ゴミ箱で手牌クリア → クリアされ選択も無い。
- A6: キーボード: Tab で opener(タイトル)に到達し Enter でシートが開く。Tab で牌ボタンに到達し Enter/Space で選択→もう一度で削除。テンキー方式でシートを開いたまま牌ボタンにフォーカスして数字キーを押しても手牌に牌が入らない。
- A7: 選択色が `main-screen.css` でトークン(`var(--md-sys-color-*)`)で指定され、HEX が無い(`grep` で確認)。ライト・ダーク両方で選択牌が判別できる(スクリーンショットを PR に添付)。

**B. 結果欄の待ち牌・有効牌(ツモ)**
- B1: 13枚の聴牌形で結果本体の待ち牌をタップ → 手牌が14枚になり末尾(和了牌の位置)にその牌が入る。結果が和了等に切り替わる。画面はスクロールしない。
- B2: 向聴形の有効牌でも同様に手牌に加わる。`×N` の文字を押しても何も起きない。バナー(`ResultBanner`)の牌は button でない。
- B3: 375px 幅で牌ボタンの幅・高さ、左右・上下の隣の牌ボタンとの間隔を記録する(PR に記載。2.8 の文言に反映されていること)。
- B4: テンキーで数字を打った状態(バッファ表示あり)で待ち牌をタップ → バッファが消え、牌が加わる。

**C. 打牌候補(打牌)**
- C1: 14枚の手牌で何切るの打牌候補の牌をタップ → その牌が1枚消えて13枚になる。結果が聴牌・向聴に切り替わる。
- C2: 赤5を含む手牌で、赤5の候補を押すと赤5が、非赤5の候補を押すと非赤5が消える(手牌に両方ある場合)。
- C3: 打牌候補の牌ボタンの幅・高さ、上下の隣の候補の牌ボタンとの間隔を記録する(PR に記載)。
- C4: 候補内の待ち・受け入れの牌、「打」の文字は button でない(押しても何も起きない)。

**D. 文書**
- D1: `docs/requirements.md` §4 に 2.8(1) の例外が実測値入りで追加され、更新日の行が更新されている。
- D2: issue-46・issue-51・issue-75 の 2.8 で指定した各箇所に事後注記があり、既存本文は削除されていない(`git diff` で確認)。

**E. 共通**
- E1: `npm run lint`・`typecheck`・`format:check`・`test` がすべて成功する。3章のテストが存在する。
- E2: 09号の方法で初回 JS の gzip 合計を実測し、main(F1 マージ後)との差分を PR に記録する。
- E3: 変更ファイルにホームディレクトリ名が含まれない(docs を含めて検査)。

## 7. 実挙動未確認・要確認の一覧

- 手牌の牌の実寸(概算 21〜22px)と、`button.tile` 化で寸法・間隔が変わらないこと(A3)。
- 選択色(primary・0.38)の視認性(A7・UI 監修)。
- 牌ボタンの `pointerdown` が `document` の capture で先に処理されても、続く click で選択が成立すること(順序: pointerdown で「牌ボタン内」と判定して解除しない → click で遷移)。
- F1 の `Discard.tile` が赤5を `red: true` で返すか(core が赤を区別するか)。区別しない場合、C2 は成立しない(打牌候補が非赤5で表示され、赤5しか無い手牌では `-1` で無変化になる)。製造時に確認し、成立しなければ統括へ報告する。
- F1 マージ後の行番号・構造(2.6)。
