# Issue #89 設計書: 結果欄の牌タップによる打牌・ツモと、手牌タップによる削除(F1-1)

- 対象 Issue: #89(Epic F #7 の Sub-Issue。F1 #88 の関連)
- ブランチ: `feature/issue-89-tile-tap-delete`(main `fa55cee` から)
- 版: 第3版(2026-11-14。独立レビューの指摘2〜8を反映。指摘1は 2.11 に【未確定】として記録)
- 依存: F1(#88)は main に `a519454` でマージ済みで、本ブランチに取り込み済み。本書はマージ済みの `src/ui/result/discard.tsx` を前提とする(F1 ブランチ上の版と同一であることを確認済み)。
- 範囲: 手牌の牌の2段階タップ削除、結果本体(`TempaiBody`・`ShantenBody`・`DiscardBody`)の牌のタップによるツモ・打牌、要件§4 の例外追加と D1・D2・E1 設計書への事後注記
- 範囲外: バナー(`ResultGlance`・`ResultBanner`)の牌、副露・ドラ・裏ドラ・抜き北の牌、和了表示(`HoraBody`)の牌、`DiscardItem` 内の待ち・受け入れの牌、アンドゥ、ロン・ツモの区別、タップ後のスクロール

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- `AGENTS.md`、`docs/rules/02-design-protocol.md`・`05`・`06`・`07`・`09` 号
- Issue #89 本文、統括のヒアリング報告(F1-1。1〜3章=事実と論点、5章=オーナー確定、6章=未確定点)
- `docs/requirements.md` §4(68行目のタップ領域の【確定】)
- 設計書 `issue-46-palette-input.md`(D2)、`issue-51-screen-skeleton.md`(D1)、`issue-75-result-switch.md`(E1)、F1 の `issue-88-discard-list.md`(ブランチ上の第4版)
- コード: `src/ui/state/app-state.ts`・`hand-rules.ts`、`src/ui/screen/HandCard.tsx`・`main-screen.css`・`MainScreen.tsx`・`ResultPanel.tsx`、`src/ui/result/slots.tsx`・`ResultBody.tsx`・`result.css`、`src/ui/tile/Tile.tsx`・`tile.css`、`src/ui/input/tenkey-logic.ts`、`src/ui/result/discard.tsx`(F1)、`src/ui/expressive/BottomSheet.tsx`、`src/ui/input/use-tenkey-keyboard.ts`、`src/core/result.ts`・`src/core/tile/index.ts`、`src/ui/result/classify.ts`、既存テスト `src/ui/screen/HandCard.test.tsx`・`buffer-selection.test.tsx`、`package.json`

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
- 打牌候補の牌と赤5【確定。コード読解で確認】: `src/core/result.ts` の打牌候補は `input.hand` の牌そのもの(末尾を除く手牌を `compareTiles` で重複除去したものと、末尾の牌)である。`compareTiles`(`src/core/tile/index.ts`)は数牌の 5 で赤の有無を区別するので、手牌に赤5と非赤5があればそれぞれ別の候補になり、候補の `red` は手牌の牌と一致する。よって `findDiscardIndex` は候補に対して必ず一致を見つける(ただし非赤は `red` が `undefined` と `false` のどちらもあり得るので、2.2 のとおり「`red === true` か否か」で比べる)。
- 13枚の完全入力の聴牌: `generateResult` は手牌13枚で向聴 0(または七対子・国士の聴牌)のとき `hora-shanten`/`hora`(待ちごとの和了)を返し(`src/core/result.ts` 166〜205行付近。副露込みで13枚のときも 235〜251行付近で同じ)、`classifyResult` はこれを `kind: 'hora'` にする(`classify.ts` 28行付近)。結果欄は `HoraBody` で描画され、`TempaiBody`(`kind: 'tempai'`)は部分入力の手牌でしか出ない。2.11 参照。
- `BottomSheet.tsx`: シートが開いている間、`window` の `keydown` で Escape を受け、`!event.defaultPrevented` のときだけ `preventDefault()` して閉じる。`use-tenkey-keyboard.ts` は `window` の `keydown` で、`mapTenkeyKey` が Backspace・Enter・数字・`m/p/s/z` だけを拾う(Space は `null` で preventDefault しない)。
- テスト環境: `package.json` に jsdom・`@testing-library/*` は無い。既存の UI テストは `renderToStaticMarkup` による文字列検査と純関数の単体テストで書かれている(E1 設計書の受け入れ条件6でも依存追加をしない方針)。
- F1 `discard.tsx`(main): `DiscardBody({ discards })` → `ul.discard-list` → `DiscardItem({ discard })` → `span.discard-item__tile`(「打」ラベル+`Tile`。`--tile-width: 2.25rem`)と `div.discard-item__detail`(待ち・受け入れの牌)。`ResultBody` は `view.kind === 'discard'` で `<DiscardBody discards={view.discards} />`。
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
| `src/ui/screen/HandCard.test.tsx` | 改修 | D1-1-C4 の期待値を新しい DOM に合わせる(2.3 の表) |
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

牌をボタンにすると `role="button"` の本体の中に button が入れ子になるため、次の形に組み替える【確定】(キーボードでシートを開く入口をタイトルのボタンへ移すことはオーナー確定。2026-11-14)。

```
div.hand-card(onClick: 牌ボタン・ゴミ箱以外ならシートを開く。従来どおり)
├ div.hand-card__top-row
│ ├ span.hand-card__opener(role=button, tabIndex=0, data-sheet-opener, aria-label="手牌を入力",
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
- `formatHandCardTitle` の文字列は変えない。
- **opener はネイティブ `<button>` にしない。`<span role="button" tabIndex={0}>` とする【設計案。指摘4への対策】**。理由: ネイティブ button だと、選択中(シートが手牌で開いている間)の Space で `handleHandBodyKey` が素通し(preventDefault しない)するため、ブラウザの合成 click が外枠の `handleCardClick` にバブリングし、`open-sheet`(`tenkeyBuffer` のリセット)が走る。Enter は `useTenkeyKeyboard` が preventDefault するので起きないが、Space は `mapTenkeyKey` が `null` で止まらない。`span role="button"` なら合成 click が起きず、従来の `.hand-card__body` と同じ挙動を保てる。キー操作は従来どおり `handleHandBodyKey`(非選択時の Enter/Space で開く)だけが担う。上の木はこの形で書いてある。
- 属性の順序: JSX で `role` → `tabIndex` → `aria-label` → `data-sheet-opener` → `className` の順に書く(既存テスト D4-C30a の文字列一致を保つため)。`biome-ignore lint/a11y/useSemanticElements` の注記は従来の本体から移す。

**壊れる既存テストと更新後の期待値**(実物で確認)

| テスト | 行 | 現在の期待 | 更新後 |
| --- | --- | --- | --- |
| `HandCard.test.tsx` D1-1-C4 | 56〜74行付近 | `.hand-card__body` の開始タグに `role="button"`、その中に `<button` が無い | `.hand-card__opener` の開始タグに `role="button"`・`tabindex="0"`・`aria-label="手牌を入力"`・`data-sheet-opener=""` があり、その中に `<button` が無い。`.hand-card__body` の開始タグに `role=` が無い。外枠に `role=` が無い(従来どおり)。ゴミ箱の disabled(従来どおり) |
| `HandCard.test.tsx` D1-1-C4-static | 87〜100行付近 | `className="hand-card__body"` の開始タグに `onClick` が無い | 変更不要(本体に onClick を付けない。opener にも onClick を付けない旨を同じ方法で1行追加してよい) |
| `buffer-selection.test.tsx` D4-C30a | 299〜315行付近 | `'role="button" tabindex="0" aria-label="手牌を入力" data-sheet-opener=""'` を含む(または本体に `data-sheet-opener`) | 上の属性順を守れば変更不要(1つ目の条件で一致する)。属性順を変えた場合は opener の開始タグに4属性があることを個別に確かめる形に直す |

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
| i | Esc | 選択なし(シートが開いていればシートも閉じる。下記) |

- 「別の場所」の検出: 選択中だけ `document` に `pointerdown`(capture)を登録し、`event.target` が `.hand-card__tiles button.tile` の内側でなければ解除する(HelpTooltip の外側 pointerdown と同じ方式)。
- **カード本体(牌以外)のタップは「選択解除」と「シートを開く(従来動作)」を同時に行う【確定】**(オーナー確定。2026-11-14)。理由: 解除のためだけに1タップを消費させない。従来動作を変えない。
- ゴミ箱(手牌クリア)を押した場合も解除し、クリアは従来どおり実行される。
- 削除は `remove-hand-tile`(既存。`tenkeyBuffer: ''`)。シートの開閉状態は変えない。

**見た目(選択色)**

- `Tile` の `selected` を渡す(`aria-pressed="true"` を得るため)が、見た目は手牌カード内で上書きする。理由: 既存の `selected` は 2px の枠(offset 1px)で、牌の間隔 1px の手牌では隣の牌に枠が重なり、確定事項1の「色が変わる」とも異なる。
- 選択色は primary 系・tertiary 系の既存トークンから選ぶ【確定】(オーナー確定。2026-11-14)。推奨は次の1つ。UI 監修での微調整(トークン・不透明度の変更。primary 系・tertiary 系の範囲内)は可。
- `main-screen.css` で `.hand-card__tiles .tile[aria-pressed="true"]` の outline を消し、`::after` の状態層を `background: var(--md-sys-color-on-primary-fixed-variant); opacity: 0.38` にする(推奨)。押下中・ホバーの状態層(scrim)と重ねない(選択中は選択色を優先)。HEX 不可。
- **状態層との詳細度の扱い【設計案。指摘5】**: `tile.css` の `button.tile:hover::after`(詳細度 0,2,2 相当)・`:focus-visible::after`・`:active::after` は `opacity` を 0.08〜0.1 にし、`background` は scrim。選択中が常に勝つよう、`main-screen.css` に次の順で書く(`main-screen.css` は `tile.css` より後に読み込まれるが、順序に頼らず詳細度で勝たせる)。
  - `.hand-card__tiles button.tile[aria-pressed="true"]::after`(詳細度 0,3,2)と、同じ前置きの `:hover::after`・`:focus-visible::after`・`:active::after`(0,4,2)を1つのセレクタ群にまとめ、`background`・`opacity` を選択色の値で固定する。
  - `.hand-card__tiles button.tile[aria-pressed="true"]`・同 `:focus-visible` で `outline: none` を指定する(`tile.css` の `.tile[aria-pressed="true"]:focus-visible` の枠を打ち消す)。ただしキーボードのフォーカス位置が見えなくならないよう、選択中の `:focus-visible` には `outline: 2px solid var(--md-sys-color-secondary); outline-offset: -2px`(内側。隣の牌に重ならない)を付ける。
  - 非選択の牌のホバー・フォーカス・押下は `tile.css` の既定のまま。
- **Esc の登録先と `BottomSheet` との共存【設計案。指摘6】**: 選択中だけ `document` に `keydown` を登録し、`event.key === 'Escape'` で選択を解除する。`preventDefault()` は呼ばない。`document` のリスナーは `window`(`BottomSheet` の Esc、`useTenkeyKeyboard`)より先にバブリング段階で呼ばれる。preventDefault しないので、シートが開いていれば続けて `BottomSheet` が閉じる。結果、選択中の Esc 1回で「選択解除+シート閉じる」となる(シートが閉じていれば選択解除だけ)。二つの処理は別の状態(HandCard のローカル状態とシートの開閉)を変えるので、二重に動いても同じ処理が2回走ることはない。シートが閉じても手牌は変わらないので、選択の解除は Esc の処理が担う。
- **純関数への切り出し(`hand-selection.ts`。指摘2)**: 次の3つを純関数にし、`HandCard` はイベントからそれを呼ぶだけにする。
  - `nextHandTap(selected, tapped)`(上の表の牌タップの行)
  - `isHandTileTarget(target: { closest?(sel: string): unknown } | null): boolean` — `closest('.hand-card__tiles button.tile')` が非 null なら真。外側 pointerdown で解除するかの判定に使う(偽なら解除)
  - `isSelectionCancelKey(key: string): boolean` — `'Escape'` のときだけ真
- **選択状態の描画の検証用**: `HandCard` に内部用の省略可能 props `initialSelectedIndex?: number` を足す(`useState` の初期値を `{ index: initialSelectedIndex, hand: input.hand }` にする。本番では渡さない)。`renderToStaticMarkup` で選択中の `aria-pressed`・`aria-label` を検証するため。
- 候補の比較(`src/ui/theme/tokens.css` の実値。ライト / ダーク):

| 候補 | ライト | ダーク | 評価 |
| --- | --- | --- | --- |
| `primary` | #3c6939(暗) | #a1d399(明) | ダークでは明るい緑になり、明るい牌の地に重ねても差が小さい |
| `primary-container` | #bcf0b4(明) | #245023(暗) | ライトで差が小さい(上と逆) |
| `tertiary`・`tertiary-container` | #38656a / #bcebf0 | #a0cfd4 / #1e4d52 | primary と同じく、どちらかのテーマで差が小さい。さらに和了牌の枠が `tertiary` なので、選択と和了牌の区別がつきにくい |
| **`on-primary-fixed-variant`(推奨)** | #245023 | #245023 | fixed 系はテーマで値が変わらない |

- 推奨の理由: 牌の画像はテーマによらず明るい地(実挙動の見え方は A7 で確認)なので、重ねる色はどちらのテーマでも暗い方がよい。primary・tertiary の通常トークンはダークで明るくなり、選択の差が出にくい。fixed 系の暗い緑(#245023)は両テーマで同じ値になり、見え方がそろう。tertiary 系は和了牌の枠の色と紛れるため避ける。
- コントラストの観点: (1) 牌の図柄が判別できること。不透明度 0.38 は図柄の上に暗い緑を重ねるだけで、図柄の線・赤牌の赤はまだ見える想定(A7 で、萬子・筒子・索子・字牌・赤5の各1枚を選択状態にして判別できることを目視で確かめる)。(2) 通常の牌との差。選択牌は地が緑がかった暗い色になり、隣の明るい牌と明度で区別できる。差が弱い・図柄が潰れる場合は、UI 監修で不透明度(0.28〜0.48 の範囲を目安)を調整する。
- 和了牌の tertiary の枠(`.hand-card__winning-tile`)は選択中も残す。

**a11y**

- 牌ボタンの `aria-label`: 非選択は牌名(`tileLabelOf`)、選択中は「`牌名`、もう一度押すと削除」【設計案】。`aria-pressed` で選択状態を伝える。
- 牌ボタンは Tab 順に入る(14枚なら最大 14 停止)。ロービングタブインデックスは入れない【設計案】(過剰設計を避ける。UI 監修で要否を判断)。

### 2.5 結果本体の牌のボタン化(ツモ)

- `TempaiBodyProps`・`ShantenBodyProps` に `onTsumo?: (tile: CoreTile) => void` を足す。渡されたとき、`.result-body__wait` 内の `Tile` に `onClick={() => onTsumo(t)}` と `aria-label={`${tileLabelOf(t)}をツモ`}` を渡す(牌だけが button。`×N` の span は button の外のまま=確定事項4)。未指定時は従来どおり非ボタン(既存テストを壊さない)。
- `count > 0` の牌だけが表示されるので、通常 `canAddHandTile` は拒否しない。拒否されても無変化。
- 牌の見た目(幅 24px 前後)は変えない。当たり判定の拡張もしない(確定事項4。要件§4 に例外)。横方向の隣のボタンとの間には `×N` の文字と `column-gap: 0.75rem` があり、縦は `row-gap: 0.5rem`(8px)。いずれも実測で確認する(条件 B3)。

### 2.6 打牌候補のボタン化(F1 のマージ済みの構造に依存)

- `DiscardBodyProps`・`DiscardItemProps` に `onDiscard?: (tile: CoreTile) => void` を足す。渡されたとき、`span.discard-item__tile` 内の `Tile` に `onClick={() => onDiscard(discard.tile)}`・`aria-label={`${tileLabelOf(discard.tile)}を切る`}` を渡す【設計案】。「打」のラベルは button の外(牌のみボタン)。
- `DiscardItem` 内の待ち・受け入れの牌(`TempaiDiscardDetail` の `GlanceTiles`、`ShantenDiscardDetail` の `Tile`)はボタンにしない(打牌前の手牌に加える操作は意味がないため。`onTileClick` を渡さない)。
- 打牌候補の牌は幅 2.25rem(36px)。隣の候補(`li` の縦並び)との間隔は実測する(条件 C3)。
- **前提とする F1 の実物(main `a519454` 時点)**: (1) `DiscardItem({ discard })`・`DiscardBody({ discards })`、(2) 打牌牌は `span.discard-item__tile` 内の非ボタンの `Tile`、(3) `ResultBody` は `<DiscardBody discards={view.discards} />`、(4) `.discard-item__tile` の `--tile-width: 2.25rem`(`result.css`)。製造着手時にこの4点が変わっていれば(別 Issue で main が更新された場合)、本節・2.7・条件 C1〜C4・2.8 の数値を実物に合わせて読み替える。打牌牌が既に button の中にあるなど、牌だけをボタンにできない構造になっていた場合は製造を止め、統括へ差し戻す。

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

> 手牌カードの牌(タップで選択、もう一度のタップで削除)に限り、タップ領域を牌の見た目と同じ大きさとする(375px 幅・14枚で幅約〔A3 の実測〕dp・高さ約〔同〕dp)。この幅は WCAG 2.2 の AA(24px)を満たさない場合がある。牌の間隔は 1dp とし、隣接ターゲット間隔 8dp の例外とする。誤操作は2段階の操作(選択→削除)で防ぐ。結果欄の本体の牌(聴牌・向聴の待ち牌・有効牌、何切るの打牌候補)に限り、タップ領域を牌の見た目と同じ大きさとする(待ち牌・有効牌は幅約〔B3〕dp・高さ約〔B3〕dp、打牌候補は幅約〔C3〕dp・高さ約〔C3〕dp)。枚数表示はタップ領域に含めない。隣接ターゲット間隔は〔B3・C3 の実測。8dp 未満ならその値と例外である旨〕とする。これらの緩和は手牌と結果欄の本体の牌にだけ適用し、他の入力欄・バナーの牌には広げない(Issue #89)。

**(2) `docs/design/issue-46-palette-input.md`(D2)**: 次の各箇所の直後に事後注記を1行ずつ置く(本文は消さない)。
- 7行目(範囲外「牌タップ削除の接続」)、32行目(確定事項10)、149行目(「牌タップで削除|移さない」の表行。表の直後)、194行目の 2.10 節(d の行を含む表の直後)、255行目(引き継ぎ)、260行目(範囲外)。
- 注記文: 「【事後注記】Issue #89([issue-89-tile-tap.md](issue-89-tile-tap.md))で、オーナーの方針変更により手牌の牌のタップ削除を2段階(選択→もう一度のタップで削除)で採用した。2.10 の d の DOM 組み替えも同 Issue で行った。」(2.10 の後ろだけ全文、他の箇所は「Issue #89 で採用(2.10 の注記参照)」と短縮してよい)

**(3) `docs/design/issue-51-screen-skeleton.md`(D1)**: 34行目(確定事項9)の表の直後と、281行目(2.9「牌のタップで削除しない」)の直後に事後注記: 「【事後注記】Issue #89([issue-89-tile-tap.md](issue-89-tile-tap.md))で牌のタップ削除(2段階)を採用し、キーボードでシートを開く入口をカード本体からタイトルのボタンに移した。ポインタではカード全体で開く動作を維持する。」

**(4) `docs/design/issue-75-result-switch.md`(E1)**: 29行目(確定事項9)の表の直後、185行目(2.5 の牌タップ)の直後、225行目(4章の申し送り)の直後に事後注記: 「【事後注記】Issue #89([issue-89-tile-tap.md](issue-89-tile-tap.md))で本体(聴牌・向聴・何切る)の牌のタップによるツモ・打牌を実装した。バナーは対象外のまま(申し送り(2)のバナー分割は未実施)。操作は `MainScreen` から props(`tileActions`)で渡した。」

行番号は main `fa55cee` 時点(`fa55cee` から本ブランチの HEAD までにこれら4文書の変更が無いことを `git diff --stat` で確認済み)。ずれていれば、引用した文言で位置を特定する。

### 2.9 初回 JS(09号)

`HandCard`・`slots.tsx`・`ResultBody`・状態層はすべて初回チャンク。増分の積算【設計案】: 状態層(`findDiscardIndex`・action)約 0.15 kB、`hand-selection.ts`・`HandCard` の選択と pointerdown 約 0.35 kB、結果本体・受け渡し約 0.2 kB。計 約 +0.7 kB(約 700 B。gzip)。CSS は JS 外。条件 E2 で実測し、PR に記録する。

- **基準値**: **126,855 B**(F1 マージ後の `origin/main` `a519454` の初回 JS。統括の実測値。09号の方法)。設計担当は再実測していない(実挙動未確認。E2 で検収担当が main を同じ方法で測り、この値と一致するか確かめる)。
- **目標値**: 126,855 + 700 = **127,555 B**。超過しても不合格にしない(09号)。
- **09号の「現在の基準値」**: 現行の記載は 125,908 B(Epic E 完了後。F1 マージ前)で、F1 の増分(約 +947 B)が反映されていない。本 Issue では 09号を改訂しない。基準値の更新(F1 マージ後の値への差し替え)が要るかは統括の判断とする(4章に申し送り)。

### 2.10 UI 監修の観点

- 選択色(`on-primary-fixed-variant`・不透明度 0.38。primary 系・tertiary 系の範囲で調整可)が牌の絵柄を潰さず、ライト・ダークの両方で判別できるか。和了牌の tertiary 枠との見分け。
- 手牌の牌(約 22px・間隔 1px)の押しやすさ。誤選択の頻度。
- タイトルが opener になったことの見た目(ボタンらしさを足さない方針の妥当性)とフォーカスリングの位置。
- 結果欄の牌が押せることの示唆(ホバーの状態層のみ。追加のラベルは付けない=見ればわかるラベルは省略)。

### 2.11 13枚の完全入力の聴牌で待ち牌が押せない件【未確定】オーナー判断待ち(独立レビュー指摘1。本版では着手しない)

- 事実(1.4): 手牌13枚(副露込みで13枚を含む)の聴牌は `kind: 'hora'` になり、結果欄は `HoraBody`(待ちごとの和了の一覧)で描画される。`TempaiBody` は部分入力でしか出ない。`HoraBody` は本書の範囲外なので、**本書のままでは、ふつうの13枚聴牌から結果欄でツモする操作ができない**。
- 影響: 受け入れ条件 B1(13枚の聴牌形で待ち牌をタップ)と3章の結合テストの「聴牌の待ち牌タップで14枚」は、現状の範囲では成立しない。本版では B1 と結合テストを部分入力の聴牌(`TempaiBody` が出る手牌)に置き換えて書き、13枚の場合は判断後に追記する。
- 選択肢の候補:

| 案 | 内容 | 得るもの | 失うもの・コスト |
| --- | --- | --- | --- |
| a | 範囲を変えない(ツモは部分入力の聴牌と向聴の有効牌のみ) | 本書のまま。追加なし | 最もよく使う13枚聴牌でツモできず、機能の価値が下がる |
| b | `HoraBody` の和了一覧の和了牌(待ち牌)もタップ可にする(牌のみボタン) | 13枚聴牌からツモできる。表示は変えない | `HoraBody`・`HoraItem`(遅延チャンク `HoraDetail` との境界)の改修。待ちごとの行の当たり判定・間隔の実測と要件§4 の例外の対象追加。E2(和了表示)の設計書への注記 |
| c | 13枚の聴牌の結果を別表示にする(例: 待ち牌の列を `HoraBody` の上に足す、または `TempaiBody` 相当で出す) | 待ち牌の列を `TempaiBody` と共通にでき、操作がそろう | 結果表示の仕様変更(E1〜E3 の確定に触れる)。表示の重複・画面の長さの増加。設計の追加が大きい |

## 3. テスト方針(05号)

jsdom・Testing Library は使わない(依存を追加しない。1.4)。純関数の単体テストと `renderToStaticMarkup` による DOM 文字列の検査で書く。クリック・pointerdown・Esc の実挙動は画面確認(6章 A・B・C)と、reducer の結合テストで担保する。

- `hand-rules.test.ts`: `findDiscardIndex` — 一致なし `-1`、末尾優先(同じ牌が先頭と末尾にあるとき末尾の index)、赤5と非赤5の区別(赤の打牌は赤だけ、非赤は非赤だけ。非赤の `red` が `undefined`・`false` のどちらでも一致)、字牌。
- `app-state.test.ts`: `discard-hand-tile` — 一致で1枚減る・`tenkeyBuffer` が `''`、一致なしで同じ参照の `state`。
- `hand-selection.test.ts`: `nextHandTap` の遷移表の牌タップの全行、`isHandTileTarget`(牌ボタン内なら真、カード本体・ゴミ箱・null なら偽。`closest` を持つ簡易オブジェクトで検査)、`isSelectionCancelKey`(`'Escape'` のみ真)。
- `HandCard.test.tsx`(`renderToStaticMarkup`): 手牌ありで牌が `<button` として出る/`initialSelectedIndex` を渡すとその牌だけ `aria-pressed="true"` と選択中の `aria-label`、他は `aria-pressed="false"`/和了牌(14枚目)も button/`.hand-card__opener` に4属性があり中に `<button` が無い/`.hand-card__body` に `role=` が無い(2.3 の表の更新を含む)。`handleHandBodyKey` の既存テストは維持。
- `slots`・`discard` のテスト(`renderToStaticMarkup`): `onTsumo`/`onDiscard` を渡すと牌だけが `<button`(`×N`・「打」の文字は button の外)で `aria-label` が「〜をツモ」「〜を切る」/未指定なら `<button` が無い/`DiscardItem` 内の待ち・受け入れの牌は button でない。
- 結合(状態層+core。純関数のみ): (1) `TempaiBody` が出る部分入力の聴牌、および向聴形の13枚から、`generateResult`→`classifyResult` で得た `tileAvailabilities` の牌で `add-hand-tile` を送ると手牌が1枚増え末尾がその牌になる。(2) 14枚から `kind: 'discard'` の `discards` の各牌で `discard-hand-tile` を送ると手牌が13枚になり、赤5の候補なら赤5が、非赤5の候補なら非赤5が消える。(13枚の完全入力の聴牌は 2.11 の判断待ち)

## 4. 後続 Issue への引き継ぎ

- バナーの牌タップを採る場合は、E1 申し送り(2)のバナー分割が未実施のまま残る。
- 副露・ドラ・裏ドラの牌タップは未対応。同じ2段階の部品(`hand-selection.ts`)を流用できる形にしてある。
- アンドゥは無い。必要になれば reducer の外側で直前状態を持つ形を検討する。
- 2.11(13枚の聴牌のツモ)はオーナー判断待ち。
- 09号の「現在の基準値」(125,908 B)は F1 マージ前の値のまま。更新の要否は統括が判断する(2.9)。
- `discard-hand-tile` は何切る以外(例: 牌譜入力)でも使える。

## 5. 製造の前提と手順

1. 本ブランチには F1 マージ後の main(`a519454`)が取り込み済み。着手時に main が更に進んでいれば取り込む。
2. 2.6 の「前提とする F1 の実物」4点を照合する。
3. 2.8 の文書改訂は、統括がオーナーの確認を取った後に行う(実測値の〔 〕は検収前に製造が実測して埋め、検収で再確認する)。

## 6. 受け入れ条件

前提: `npm run build` 後に `npx vite preview` で確認する(本番ビルド。dev での確認だけでは合格にしない)。計測は DevTools のデバイスエミュレーションで幅 375px(主)・360px(余裕確認)。寸法は `getBoundingClientRect()` で取る。

**A. 手牌の牌**
- A1: 手牌に13枚入力し牌を1回タップ → 手牌の枚数表示は不変、その牌だけ色が変わる(`aria-pressed="true"`)、シートは開かない(閉じていた場合)。
- A2: 同じ牌をもう一度タップ → その牌が1枚消え、タイトルが「手牌 (12/14)」になる。別の牌をタップ → 選択が移り、元の牌の色が戻る。
- A3: 375px 幅・14枚で、各牌ボタンの幅・高さ、隣の牌ボタンとの間隔を記録する(数値を PR に書く。期待は幅約 21〜22px・間隔 1px 前後。この値が 2.8 の要件文言に入っていることを確認)。360px でも同様に記録する(合否は問わない)。和了牌(14枚目)も押せて2段階で消える。
- A4: 選択中にカード本体(牌の無い余白)を押す → 選択が解除され、シートが開く。選択中に結果欄・ヘッダ・シートを押す → 解除される。シートが閉じた状態で Esc → 選択だけ解除。シートが開いた状態で Esc → 選択が解除され、シートも閉じる(1回の Esc で両方。2回目の Esc で何も起きない)。選択中の牌にホバー・キーボードフォーカスしても選択色が保たれ、フォーカスは内側の枠で見える。
- A5: 選択中にパレットで牌を加える → 選択が解除される。ゴミ箱で手牌クリア → クリアされ選択も無い。
- A6: キーボード: Tab で opener(タイトル)に到達し Enter でシートが開く。シートを手牌で開いたまま opener にフォーカスして Space を押しても、シートが開き直されず、テンキーの入力途中の数字(バッファ表示)が消えない(指摘4)。Tab で牌ボタンに到達し Enter/Space で選択→もう一度で削除。テンキー方式でシートを開いたまま牌ボタンにフォーカスして数字キーを押しても手牌に牌が入らない。
- A7: 選択色が `main-screen.css` でトークン(`var(--md-sys-color-*)`)で指定され、HEX が無い(`grep` で確認)。ライト・ダーク両方で、萬子・筒子・索子・字牌・赤5の各1枚を選択状態にし、図柄が判別でき、かつ隣の通常の牌と区別できる(スクリーンショットを PR に添付)。

**B. 結果欄の待ち牌・有効牌(ツモ)**
- B1: 結果欄が「聴牌」(`TempaiBody`)になる部分入力の手牌(製造が実例を特定し PR に記す)で待ち牌をタップ → 手牌が1枚増え、末尾にその牌が入る。結果が切り替わる。画面はスクロールしない。(13枚の完全入力の聴牌は 2.11 の判断待ちのため本条件に含めない)
- B2: 向聴形の有効牌でも同様に手牌に加わる。`×N` の文字を押しても何も起きない。バナー(`ResultBanner`)の牌は button でない。
- B3: 375px 幅で牌ボタンの幅・高さ、左右・上下の隣の牌ボタンとの間隔を記録する(PR に記載。2.8 の文言に反映されていること)。
- B4: テンキーで数字を打った状態(バッファ表示あり)で待ち牌をタップ → バッファが消え、牌が加わる。

**C. 打牌候補(打牌)**
- C1: 14枚の手牌で何切るの打牌候補の牌をタップ → その牌が1枚消えて13枚になる。結果が聴牌・向聴に切り替わる。
- C2: 赤5と非赤5の両方を含む14枚の手牌で、打牌候補に両方が別々に出る(どちらも最善の候補に残る手牌を選ぶ)。赤5の候補を押すと赤5が、非赤5の候補を押すと非赤5が消える(赤の有無はタイトル・牌画像で確認)。
- C3: 打牌候補の牌ボタンの幅・高さ、上下の隣の候補の牌ボタンとの間隔を記録する(PR に記載)。
- C4: 候補内の待ち・受け入れの牌、「打」の文字は button でない(押しても何も起きない)。

**D. 文書**
- D1: `docs/requirements.md` §4 に 2.8(1) の例外が実測値入りで追加され、更新日の行が更新されている。
- D2: issue-46・issue-51・issue-75 の 2.8 で指定した各箇所に事後注記があり、既存本文は削除されていない(`git diff` で確認)。

**E. 共通**
- E1: `npm run lint`・`typecheck`・`format:check`・`test` がすべて成功する。3章のテストが存在する。
- E2: 09号の方法で初回 JS の gzip 合計を実測し、基準値(main `a519454`。126,855 B。検収担当も同じ方法で main を測って確かめる)・実測値・増分・目標値 127,555 B との差を PR に記録する。超過は不合格にしない。
- E3: 変更ファイルにホームディレクトリ名が含まれない(docs を含めて検査)。

## 7. 実挙動未確認・要確認の一覧

- 手牌の牌の実寸(概算 21〜22px)と、`button.tile` 化で寸法・間隔が変わらないこと(A3)。
- 選択色(`on-primary-fixed-variant`・0.38)の視認性と、牌の画像の地がダークテーマでも明るいこと(A7・UI 監修)。
- 牌ボタンの `pointerdown` が `document` の capture で先に処理されても、続く click で選択が成立すること(順序: pointerdown で「牌ボタン内」と判定して解除しない → click で遷移)。
- 赤5の打牌候補の扱いはコード読解で確定し 1.4 に移した。画面での確認は C2。
- 基準値 126,855 B は統括の実測で、設計担当は再実測していない(E2)。
- Esc の処理順(`document` → `window`)と、opener の Space が合成 click を起こさないこと(A4・A6)。
