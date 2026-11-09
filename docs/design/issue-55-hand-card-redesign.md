# Issue #55 D1-1. 手牌カードの見た目と当たり判定の再設計 設計書

- 版: v2(独立レビューの指摘を反映: フォーカス復元、牌列の最小高さの基準、要件追記文の隣接間隔、旧 CSS の削除、Ripple の配置、全消し後のフォーカス、C1 の前提)
- 対象: 手牌カード(`HandCard`)の見た目(見出し・ゴミ箱・入力欄の背景/枠・牌の大きさ・和了牌の強調)と当たり判定の配置。要件 §4 へのゴミ箱の例外の追記
- 対象外: 牌指定削除の機能(`remove-hand-tile` は未接続のまま)、牌の当たり判定の要件追記、要約カード(D1 条件 21 の保留分)

## 1. 参照資料と判断の根拠

### 1.1 参照資料

- `AGENTS.md`、`docs/rules/` の 01・02・06 号
- Issue #55 本文(範囲 1〜5)と添付スケッチ(改訂案: 上部左に見出し、右に小さなゴミ箱、下に枠なし・背景なしの牌の行、和了牌の強調)
- 統括担当から渡されたヒアリング確定事項 1〜8(1.2)
- 現状実装: `src/ui/screen/HandCard.tsx`、`src/ui/screen/main-screen.css` の `.hand-card` 系、`src/ui/state/hand-rules.ts`(`maxHandLength`・`splitWinningTile`)、`src/ui/md/IconButton.tsx`、`src/ui/tile/tile.css`(牌は `width: var(--tile-width)`・`aspect-ratio: 3 / 4`)
- 既存設計書: `docs/design/issue-51-screen-skeleton.md`(2.9・確定事項 9・10・条件 9・19・20・21)、`docs/design/issue-46-palette-input.md`、`docs/design/issue-47-tenkey-input.md`(2.9 バッファ、条件 16)
- `docs/requirements.md` §4(タップ領域)

### 1.2 確定事項(ユーザー確定。再検討しない)

| # | 確定事項 | 本書での反映 |
| --- | --- | --- |
| 1 | ゴミ箱: 見た目の高さ 24dp。縦の当たり判定は拡張しない(24dp)。幅の当たり判定は目標 40dp・最低 32dp。要件 §4 のタップ領域の例外に追記する | 2.3・2.7 |
| 2 | 見出し「手牌 (n/m)」をゴミ箱の左に置く。n = 手牌の枚数、m = 14 − 3 × 副露数(`maxHandLength`)。テンキーのバッファは数えない。空のときは「手牌 (0/14)」でゴミ箱は `disabled`。mj-mighty-calc 準拠。AGENTS.md「見ればわかるラベルは省略」の例外としてオーナーが決定 | 2.2 |
| 3 | 手牌入力欄(`.hand-card__body`)の白背景・枠線をなくす(カードと同色)。カードの padding を 12dp → 8dp に詰め、牌を1行のまま大きくする。入力の前後で色は変えない | 2.4・2.5 |
| 4 | 当たり判定 = ゴミ箱以外の全体。牌自体のタップは暫定でシートを開く(`remove-hand-tile` は未接続。牌指定削除は保留)。ゴミ箱の下と左に 8dp の無反応帯(どこにも反応しない)。ゴミ箱は確認なし・Undo なしの全消し | 2.3・2.6 |
| 5 | 和了牌(満杯時の末尾1枚)はターシャリ色の枠で強調。強調は満杯時のみ(現行 `splitWinningTile` どおり)。和了牌の前の隙間は 9px → 4dp にし、枠が区切りを兼ねる。色は `md-sys-color` トークンのみ | 2.5 |
| 6 | D3 のバッファ(数字+キャレット)は牌列末尾・和了牌の後ろ・枠の外。牌幅計算の N は変えない | 2.5 |
| 7 | 要件 §4 にゴミ箱の例外を追記する。牌の当たり判定(幅約 22dp)の追記は牌指定削除を実装する Issue に回す | 2.7・5 |
| 8 | 旧 D1 設計書(issue-51)は編集しない。本書で置換関係を表で明記する | 1.4 |

**見出しとスケッチの差異(明記)**: 添付スケッチの見出しは「手牌」のみだが、本書は Issue 本文と確定事項 2 に従い「手牌 (n/m)」とする。

### 1.3 設計担当の判断と根拠(【設計案】。些末な実装ディテールを含む)

- **ゴミ箱の幅の当たり判定は 40dp(目標値)を採る**【設計案】。根拠: 上段はゴミ箱と見出しだけで、375px 幅のカード内幅は 327px(2.4)。見出し「手牌 (14/14)」は title-small(14px)で約 80px なので、40dp + 左の無反応帯 8dp を取っても 200px 近く余る。最低値 32dp まで削る理由が無い。
- **ゴミ箱は Material Web の `md-icon-button` ではなく、ネイティブ `<button>` を自作スタイルで使う**【設計案】。根拠: `md-icon-button` は状態レイヤーが既定 40×40 で、内部に 48dp のタッチ領域(`.touch` 要素)を持つ版がある。確定事項 1 は「縦は 24dp で拡張しない」ことを求めており、シャドウ DOM 内のタッチ領域がはみ出すと検証(2.6)が不確定になる。Material Web の `md-icon-button` は 48dp の `.touch` 要素をシャドウ DOM 内に持ち、これを外から無効化するトークン・属性は公開されていない(設計時の知見。本 v2 の作業時点では Material Web の実物ファイルを参照できず、版固有の確認はしていない。**実挙動未確認**)。ネイティブ要素なら矩形 = 当たり判定が自明で、`elementFromPoint` の検証も単純になる。押下の見た目は既存の `Ripple`・`FocusRing` ラッパー(`src/ui/md/`)を中に置いて MD3 の状態表現を保つ。製造担当が `md-icon-button` のトークン(`--md-icon-button-state-layer-height` 等)とタッチ領域の無効化で 40×24 を厳密に作れることを実物で確認できた場合は、それを使ってもよい(条件 C4〜C8 を満たすこと)。
- **和了牌の枠は `outline` で描く**【設計案】。根拠: `border` は牌の幅を変えて牌幅計算に影響する。`outline` はレイアウトに影響しない。ただし `.hand-card__tiles` は `overflow-x: auto` で上下も切り取られるため、牌列に 2px の内側余白を持たせて枠が切れないようにする(2.5)。
- **バッファと和了牌は同時に出ない**(確認済みの事実): 和了牌は `hand.length === max` のときだけ、バッファは `canAppendTenkeyDigit` により `hand.length + buffer.length < max` のときだけ増える(`hand-rules.ts`)。よって確定事項 6 の「和了牌の後ろ・枠の外」は DOM 順(和了牌の後にバッファ)を守れば常に満たされる。例外として、副露数が変わって上限を超えたバッファが残る場合(issue-47 2.2)は理論上同時に出るが、DOM 順により枠の外になる。

### 1.4 置換関係(issue-51 は編集しない)

| issue-51 の箇所 | 本書での扱い | 置き換え先 |
| --- | --- | --- |
| 2.9 手牌カード(全体) | **置き換える**。カード全体が1つのボタン、バケツ A 案(上段 48dp)、バケツ 48dp 以上、デッドゾーン 8dp の構造を本書の構造に差し替える | 2.1〜2.6 |
| 確定事項 9(牌タップでの削除は不採用。カード全体がシートを開く 48dp 以上のタップ領域) | **置き換える**。「牌のタップは暫定でシートを開く(牌指定削除は保留)」「ゴミ箱以外の全体が当たり判定」に変わる | 1.2 #4 |
| 確定事項 10(カード内にバケツ、確認なし) | **置き換える**。ゴミ箱は 24dp 高・幅 40dp・下と左に無反応帯 8dp。確認なし・Undo なしは継承 | 1.2 #1・#4 |
| 条件 19(手牌カードとバケツ) | **置き換える** | 4 の C1〜C10 |
| 条件 9・20・21 | 置き換えない(引き続き有効)。本書の変更で壊れないことを C12〜C14 で確認する | 4 |

issue-47 の 2.9(バッファの表示)は有効のまま。幅の数値(内側幅 301px 等)は本書 2.4 の値に読み替える。issue-47 条件 16 は C11 で再確認する。

## 2. 設計

### 2.1 DOM 構造(`src/ui/screen/HandCard.tsx`)

```
div.hand-card                         … onClick でシートを開く(ポインタ用。role なし)
├─ div.hand-card__top-row
│  ├─ span.hand-card__title           … 「手牌 (n/m)」
│  └─ div.hand-card__clear-zone       … 無反応帯(左 8dp・下 8dp の padding)。ハンドラなし
│     └─ button.hand-card__clear-button  type="button" aria-label="手牌をクリア" disabled={isEmpty}
│        ├─ (Ripple / FocusRing)
│        └─ svg(既存のゴミ箱パス)
└─ div.hand-card__body  ref=bodyRef role="button" tabIndex=0 aria-label="手牌を入力"  … キーボード用(Enter/Space)。牌幅計算の container 基準(2.4)
   └─ div.hand-card__tiles
      ├─ Tile × body
      ├─ span.hand-card__winning-tile > Tile   (満杯時のみ)
      └─ span.hand-card__buffer aria-hidden    (バッファがあるときのみ)
```

- **入れ子のボタンを作らない**: `role="button"` を持つのは `.hand-card__body` だけで、ゴミ箱 `<button>` はその外(兄弟の上段)に置く。外枠 `.hand-card` には role を付けない(付けるとゴミ箱が入れ子になる)。
- **外枠のクリック(ポインタ)**: `.hand-card` の `onClick` で、`event.target` が `.hand-card__clear-zone` の内側(`closest('.hand-card__clear-zone')` が非 null)なら何もしない。それ以外は、**dispatch の前に `bodyRef.current?.focus({ preventScroll: true })` を呼び**、その後 `dispatch({ type: 'open-sheet', target: { type: 'hand' } })`。理由: `BottomSheet` は開いた時点の `document.activeElement` を記録し Esc で戻すため、見出し・余白のクリックでは `body` 要素が記録され、D1 条件 20(Esc でフォーカスが手牌カードに戻る)が後退する。`bodyRef`(`useRef<HTMLDivElement | null>`)を追加する。牌・見出し・カードの余白・`.hand-card__body` のクリックはすべてここに泡立って1回だけ開く。
- **`.hand-card__body` の `onClick` は削除する**(外枠と二重に dispatch しないため)。`onKeyDown`(Enter/Space で `preventDefault` してから `open-sheet`)は残す。`.hand-card__body` の `onKeyDown` はゴミ箱からは発火しない(兄弟のため)。
- **`stopPropagation` は不要**: ゴミ箱のクリック(マウス・タップ・キーボードの Enter/Space による合成クリック)は外枠へ泡立つが、`closest` の判定で無視される。ゴミ箱の `onClick` は `if (!isEmpty) { dispatch({ type: 'clear-hand' }); bodyRef.current?.focus({ preventScroll: true }); }`。【設計案】全消し直後はゴミ箱が即 `disabled` になりフォーカスが `body` 要素へ落ちるため、`.hand-card__body` へ移す(キーボード利用者が続けて Enter でシートを開ける)。製造が保険として `stopPropagation` を残すことは妨げない。
- **disabled のゴミ箱**: ネイティブの `disabled` ボタンはクリックイベントを発火しない(ブラウザにより親への配送の扱いが異なり得るが、いずれでも `closest` の判定で無視される)。
- 外枠 `div` に `onClick` を付けることは Biome の a11y 規則(`useKeyWithClickEvents`・`noStaticElementInteractions` 等)に掛かる。`biome-ignore` を付け、理由を「キーボード操作は `.hand-card__body`(role=button)が担う。外枠のクリックはポインタの当たり判定拡張(設計書 issue-55 2.1)」と書く。
- `cardRef`・スクロール追従の `useEffect` は変更しない。

### 2.2 見出し

- 文言: `` `手牌 (${input.hand.length}/${maxHandLength(input.melds)})` ``。半角括弧・半角スペース1つ・半角スラッシュ。`tenkeyBuffer` は数えない。
- 書体【設計案】: `md-sys-typescale-title-small-*`(14px / 20px)。色 `--md-sys-color-on-surface-variant`。`white-space: nowrap`。
- 要素は `span`(見出し要素にしない。画面内の他カードとの見出し階層を作らないため)【設計案】。

### 2.3 ゴミ箱と無反応帯

| 項目 | 値 |
| --- | --- |
| ボタンの矩形(= 当たり判定) | 幅 40dp(`2.5rem`)× 高さ 24dp(`1.5rem`)。`padding: 0`、`border: none`、背景 `transparent` |
| アイコン | 既存の svg パス。表示 24×24dp(`1.5rem`)。色 `--md-sys-color-on-surface-variant`、disabled 時は `--md-sys-color-on-surface` を不透明度 0.38(MD3 の disabled 規定) |
| 状態表現 | 押下・ホバーは `Ripple`、フォーカスは `FocusRing`(どちらも親基準で配置されるため、ボタンに `position: relative` を付ける)。形状 `--md-sys-shape-corner-full`。`-webkit-tap-highlight-color: transparent`(リップルと二重に見せない) |
| 無反応帯 `.hand-card__clear-zone` | `padding-inline-start: 0.5rem; padding-block-end: 0.5rem;`。ハンドラは持たない(外枠の判定で無視される)。ゴミ箱の上と右には置かない(カード padding 8dp の部分はシートを開く。確定事項 4 は下と左のみ) |
| 確認・Undo | なし。押すと即 `clear-hand` |

上段 `.hand-card__top-row` は `display: flex; align-items: flex-start; justify-content: space-between;`。見出しはゴミ箱と縦中央を揃える(見出しの `line-height` 20px をボタン 24px に合わせ `padding-block-start: 2px` 等。数 px の差は製造の判断でよい)。

### 2.4 カードと入力欄の寸法

| 項目 | 現行 | 新 |
| --- | --- | --- |
| `.hand-card` の padding | 12dp | 8dp(`0.5rem`) |
| `.hand-card` の gap | 8dp | 0(上段と牌列の間は無反応帯の 8dp が担う) |
| `.hand-card__top-row` の `justify-content` | `flex-end` | `space-between` |
| `.hand-card__clear-button` の `min-width`・`min-height: 3rem` | あり | **削除**(残ると C5 が不合格) |
| `.hand-card__body` 背景・枠線・角丸 | 白(surface-container-lowest)・outline-variant 枠 | `background: none; border: none;`(カードと同色)。角丸はフォーカスリング用に残してよい |
| `.hand-card__body` padding / min-height | 8dp / 56dp | 0 / なし。`container-type: inline-size` と `--tile-width` の定義を `.hand-card__tiles` からここへ移す。`style={{'--hand-max': max}}` も body に付ける |
| `.hand-card__tiles` | `container-type`・`--tile-width` を持つ | それらを外す。`padding: 2px`(和了牌の枠が切れないため)、`min-height: calc(var(--tile-width) * 4 / 3)`(空でも牌1枚分の高さ。`--tile-width` は1段上の body を基準に解決されるので自身の高さで循環しない) |
| フォーカスリング | `outline 2px primary, offset 2px` | 変更なし(キーボードフォーカス時のみ見える) |
| 入力の前後(シートを開いている間)の色 | — | 変えない(`inputFocus` で見た目を切り替えない) |

**幅の算出**(375px 幅): 画面の左右余白 16dp ずつ → カード幅 343px(現行 issue-47 の内側幅 301 = 343 − 24 − 16 − 2 と一致)。新しい `.hand-card__body` の幅 = 343 − 8 × 2 = 327px(= `100cqi`)。牌列の `padding: 2px` を引いた内容幅 = 323px。

**牌幅の式**(N = `--hand-max`。変えない):

```
--tile-width: min(1.75rem, calc((100cqi - 4px - (N - 1) * 1px - 0.25rem) / N));  /* .hand-card__body に定義 */
```

`4px` は牌列の左右 padding 2px × 2、`0.25rem` は和了牌の前の隙間 4dp。和了牌の前の隙間は `gap 1px + margin 3px` ではなく `margin-inline-start: calc(0.25rem - 1px)` として、gap と合わせて 4dp にする(式の `(N−1)·1px` に含まれる gap 1px と二重に数えないため)。

| 幅 | 牌列の内容幅(`100cqi − 4px`) | 牌幅(N=14) | 現行の牌幅 |
| --- | --- | --- | --- |
| 375px | 323px | (323 − 13 − 4) / 14 = **21.86px** | (301 − 13 − 8) / 14 = 20.0px |
| 360px(参考) | 308px | (308 − 17) / 14 = 20.79px | 18.93px |

牌の高さは 375px で約 29.1px。カードの高さ(375px・満杯)≈ 8 + 24 + 8 + (29.1 + 4) + 8 ≈ 81px(現行約 129px)。数値は算出値で**実挙動未確認**(C9 で実測)。

### 2.5 和了牌の強調とバッファ

- `.hand-card__winning-tile`: `display: inline-flex; margin-inline-start: calc(0.25rem - 1px); outline: 2px solid var(--md-sys-color-tertiary); outline-offset: 0; border-radius: var(--md-sys-shape-corner-extra-small);`。HEX 値を書かない。
- 強調の条件は現行のまま(`splitWinningTile` が `winning` を返すとき = 満杯時)。`hand-rules.ts` は変更しない。
- 和了牌の前の見た目の隙間は 4dp − 枠 2px = 約 2px になり、枠が区切りを兼ねる。
- バッファ `.hand-card__buffer` は DOM の末尾(和了牌の後ろ)・和了牌の `span` の外に置く(現行どおり)。`margin-inline-start: 0.25rem` を維持する。
- 13 枚+バッファ1桁の 375px 幅: 牌 13 × 21.86 = 284.2 + gap 13 + 余白 4 + 数字とキャレット約 16 ≈ 317px < 323px(算出。C11 で実測)。

### 2.6 当たり判定のまとめ

| 領域 | 押したとき |
| --- | --- |
| ゴミ箱の矩形(40×24dp) | 手牌が空でなければ全消し。シートは開かない |
| ゴミ箱の左 8dp・下 8dp(`.hand-card__clear-zone` の padding。左下の角 8×8 も含む) | 何も起きない |
| それ以外のカード内すべて(見出し・牌・和了牌・バッファ・カードの余白・ゴミ箱の上と右の余白) | シートを開く |

ゴミ箱の当たり判定は角丸(`--md-sys-shape-corner-full`)の形状に従う。矩形の四隅でも角丸の外側(最大でもおよそ半径 12dp の円の外)は無反応帯側になり、誤ってシートが開くことはない(検収の実測で判明)。

### 2.7 要件 §4 への追記(製造で `docs/requirements.md` に反映)

§4 のタップ領域の段落の、テンキーの文の直後に次を追記する。冒頭の「更新日」行にも Issue #55 の追記を加える。

> 手牌カードのゴミ箱(手牌クリア)に限り、タップ領域を高さ 24dp(見た目と同じ。縦は拡張しない)・幅 40dp(最低 32dp)とする。この大きさは WCAG 2.2 の AA(24px)を満たし、AAA(44px)は満たさない。誤操作を防ぐため、ゴミ箱の左と下に 8dp の無反応帯(押しても何も起きない領域)を置く。ゴミ箱の上と右は手牌カード本体のタップ領域(シートを開く)と 0dp で隣接し、隣接ターゲット間隔 8dp の例外とする。この緩和はゴミ箱にだけ適用し、他の入力欄には広げない(Issue #55)。

タグは既存段落の【確定】に含める(ユーザー確定事項 1・7 のため)。牌の当たり判定は追記しない(確定事項 7)。

### 2.8 変更ファイル一覧

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/screen/HandCard.tsx` | 変更 | 2.1〜2.3 の構造・見出し・ゴミ箱 |
| `src/ui/screen/main-screen.css` | 変更 | `.hand-card` 系(2.3〜2.5) |
| `docs/requirements.md` | 変更 | §4 の追記と更新日(2.7) |
| テスト(`src/ui/screen/HandCard.test.tsx` 等。配置は製造の判断) | 追加 | C1〜C3 の自動テスト |

`hand-rules.ts`・reducer・`src/ui/md/` のラッパーは変更しない(ネイティブ `<button>` を採る場合)。

### 2.9 バンドル予算

予算は目標値(102,000 B。現状 111,273 B で超過)。本 Issue は CSS と JSX の小変更で、増減は数百 B 程度の見込み。軽微な増減は容認し、ビルド後の実測値を PR に記載する。

### 2.10 コミット単位(目安)

1. `HandCard` の構造と CSS(2.1〜2.6)とテスト
2. `docs/requirements.md` §4 の追記

## 3. 実挙動未確認・実機未確認の一覧

| 項目 | 状況 | 確認方法 |
| --- | --- | --- |
| 牌幅・カード高さ・内容幅の数値(2.4) | 算出のみ | C9(dev/Browser pane の 375px で実測) |
| `md-icon-button` のタッチ領域の挙動 | 版固有の実物は未確認。ネイティブ `<button>` を採る前提で回避 | `md-icon-button` を使う場合のみ製造が実物で確認 |
| 和了牌の枠が `overflow-x: auto` で切れないこと | 算出のみ | C10 |
| disabled ボタンのクリックの親への配送 | ブラウザ差があり得る | C7(どちらでもシートが開かないことを確認) |
| **実機でのみ確認できる項目**(Browser pane では代替不可) | — | 実機(iOS Safari・Android Chrome)で目視・操作 |
| ・指でのタップの当たり(24dp 高のゴミ箱を狙って押せるか、無反応帯で誤クリアを防げるか) | 実機未確認 | 指でゴミ箱・その左下・牌を各数回押す |
| ・タッチ時のリップル・タップハイライト(`-webkit-tap-highlight-color`)の見え方 | 実機未確認 | 目視 |
| ・ターシャリ枠の視認性(ライト・ダーク、屋外の明るさ) | 実機未確認 | 目視 |
| ・22px 前後の牌の判読性 | 実機未確認 | 目視 |

## 4. 受け入れ条件

前提: 検収幅は 375×812(必要な項目のみ 360 を参考計測)。dev サーバーと Browser pane の扱いは 01 号に従う。手牌は底部シートのパレットで入れる。

- [ ] **C1 見出しの文言(自動テスト)**: 状態はいずれも `createInitialState` を基に `input.hand`・`input.melds`・`tenkeyBuffer` を直接与えてレンダリングする(手牌 13 枚は例: 1m 2m 3m 4m 5m 6m 7m 8m 9m 1p 1p 1p 2p のような三麻で有効な牌)。手牌 0 枚・副露 0 で `.hand-card__title` の `textContent` が `手牌 (0/14)`。手牌 13 枚で `手牌 (13/14)`。副露 1 の状態(テストで state を直接与える)で手牌 5 枚なら `手牌 (5/11)`。テンキーのバッファ `'12'` があっても n が変わらない。
- [ ] **C2 ゴミ箱の動作(自動テスト)**: 手牌ありでゴミ箱を `click` すると `clear-hand` が dispatch され、`open-sheet` は dispatch されない。手牌 0 枚でゴミ箱が `disabled` 属性を持つ。
- [ ] **C3 シートを開く(自動テスト)**: `.hand-card__title`・牌(`.hand-card__tiles` の子)・`.hand-card` 自身を `click` するとそれぞれ `open-sheet { type: 'hand' }` が**1回だけ** dispatch される。`.hand-card__clear-zone` 自身(ボタン以外の padding 部分)を `click` しても何も dispatch されない。`.hand-card__body` にフォーカスして Enter・Space でそれぞれ1回 `open-sheet`。
- [ ] **C4 構造(コード確認)**: `role="button"` を持つ要素の子孫に `button` 要素が無い(`document.querySelectorAll('[role=button] button, button button').length === 0`)。`.hand-card` に `role` 属性が無い。`.hand-card__body` に `onClick` が無い(コードで確認)。
- [ ] **C5 ゴミ箱の矩形(375px、dev)**: `document.querySelector('.hand-card__clear-button').getBoundingClientRect()` の `width` が 40±0.5、`height` が 24±0.5。
- [ ] **C6 当たり判定(375px、dev、手牌 13 枚)**: `r = ゴミ箱の getBoundingClientRect()`、`z = .hand-card__clear-zone の getBoundingClientRect()`、`c = .hand-card の getBoundingClientRect()` を取り、次の各点で `document.elementFromPoint(x, y)` を評価する(`btn` = ゴミ箱、`.closest()` で判定)。

  | 点 | 座標 | 期待 |
  | --- | --- | --- |
  | ゴミ箱中央 | (r.left + r.width/2, r.top + r.height/2) | `closest('.hand-card__clear-button')` が `btn` |
  | ゴミ箱の内側の四隅(角丸の内側) | (r.left+4, r.top+4)・(r.right−4, r.top+4)・(r.left+4, r.bottom−4)・(r.right−4, r.bottom−4) | 4点とも `btn` |
  | ゴミ箱の真上の外 | (r.left + r.width/2, r.top − 1) | `btn` でない(`.hand-card` の内側でシートを開く領域) |
  | ゴミ箱の真下の外(無反応帯) | (r.left + r.width/2, r.bottom + 1) と (…, r.bottom + 7) | `btn` でなく、`closest('.hand-card__clear-zone')` が非 null |
  | 無反応帯の外(下) | (r.left + r.width/2, z.bottom + 1) | `closest('.hand-card__clear-zone')` が null、`closest('.hand-card')` が非 null |
  | ゴミ箱の左の外(無反応帯) | (r.left − 1, r.top + r.height/2) と (r.left − 7, …) | `btn` でなく、`closest('.hand-card__clear-zone')` が非 null |
  | 無反応帯の外(左) | (z.left − 1, r.top + r.height/2) | `closest('.hand-card__clear-zone')` が null、`closest('.hand-card')` が非 null |
  | 左下の角 | (r.left − 4, r.bottom + 4) | `closest('.hand-card__clear-zone')` が非 null |

  加えて `z.left` が `r.left − 8 ± 0.5`、`z.bottom` が `r.bottom + 8 ± 0.5`、`z.right` が `r.right ± 0.5`、`z.top` が `r.top ± 0.5`。
- [ ] **C7 押下の結果(375px、dev)**: 手牌 13 枚で C6 の「無反応帯」の2点に `elementFromPoint` で得た要素へ `click()` を送るとシートが開かず手牌が 13 枚のまま。「無反応帯の外(下)」「無反応帯の外(左)」「ゴミ箱の真上の外」へ送るとシートが開く(各回の前に Esc で閉じる)。ゴミ箱中央へ送ると手牌が 0 枚になりシートは開かない。続けて手牌 0 枚(disabled)でゴミ箱中央の要素へ `click()` を送り、シートが開かず、`elementFromPoint` が引き続きゴミ箱(または無反応帯の内側)を返す。
- [ ] **C8 牌のタップ(375px、dev)**: 手牌 13 枚で、先頭の牌の中央を `elementFromPoint` で取り `click()` するとシートが開き、手牌は 13 枚のまま(削除されない)。
- [ ] **C9 見た目の寸法(375px、dev)**: `.hand-card` の `padding` が 8px。手牌 0 枚で `.hand-card__tiles` の `getBoundingClientRect().height` が 29.1 + 4(padding)≈ 33±1px(牌列の内容高さ ≈29px)。`.hand-card__body` の計算値で `background-color` が透明(`rgba(0, 0, 0, 0)`)、`border-top-width` が 0px。シートを開く前と開いた後で `.hand-card` と `.hand-card__body` の `background-color` が同じ。手牌 14 枚(満杯)で牌1枚の `width` が 21.86±0.5px(360px では参考値として記録のみ)。`.hand-card__tiles` の `scrollWidth === clientWidth`。
- [ ] **C10 和了牌の強調(375px、dev)**: 手牌 14 枚で `.hand-card__winning-tile` が1つ存在し、計算値の `outline-style` が `solid`、`outline-width` が 2px、`outline-color` が `getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-tertiary')` と同じ色。和了牌の左端と直前の牌の右端の差が 4±0.5px。和了牌の矩形の上端 − 2 と下端 + 2 が `.hand-card__tiles` の矩形の内側(枠が切れない)。手牌 13 枚では `.hand-card__winning-tile` が存在しない。CSS に HEX 値を追加していない(`git diff` で `#[0-9a-fA-F]{3,8}` の追加が無い)。
- [ ] **C11 D3 バッファとの整合(375px、dev、テンキー)**: issue-47 条件 16 を再実行する: 手牌 13 枚+バッファ1桁、12 枚+2桁、0 枚+14 桁で `.hand-card__tiles` の `scrollWidth === clientWidth`。バッファがある間、`.hand-card__buffer` が `.hand-card__tiles` の最後の子で、`.hand-card__winning-tile` の子孫でない。牌幅がバッファの有無で変わらない(手牌 13 枚でバッファ無しと1桁ありの牌の `width` が同じ)。見出しの n がバッファで変わらない。
- [ ] **C12 D1 条件 20 の維持**: issue-51 条件 20 を再実行する。加えて、(a) 見出し、(b) カードの余白(ゴミ箱の真上の外の点)、(c) 牌、(d) `.hand-card__body` へのフォーカス+Enter のそれぞれでシートを開き、Esc で閉じた後に `document.activeElement` が `.hand-card__body` であること。シートを開く前後で `history.length` が同じこと。手牌ありでゴミ箱を押した直後に `document.activeElement` が `.hand-card__body` であること。
- [ ] **C13 D1 条件 21 の維持(保留中の扱いに従う)**: issue-51 条件 21 が保留中である現状を変えない。条件 21 の判定方法(入力側の先頭がスクロールで外に出たとき要約カードの `top` = 0±1px、シートを開いている間 `data-slot="summary-result"` が存在)を実行し、本 Issue の前(main)と結果が同じであることを確認する(main で不合格の項目は不合格のままでよい。差分が出ないことを見る)。
- [ ] **C14 D1 条件 9 の維持**: `npm test` で reducer の `open-sheet`/`close-sheet` のテストが通る。
- [ ] **C15 要件 §4**: `docs/requirements.md` §4 に 2.7 の追記文があり、更新日行に Issue #55 が記載されている。牌の当たり判定の追記が無い。
- [ ] **C16 品質**: `npm run lint`・`typecheck`・`format:check`・`test`・`build` が通る。ビルド後のバンドルサイズの実測値を PR に記載する(目標超過は容認)。ホームディレクトリ名・絶対パスがコード・ドキュメントに無い。

## 5. 後続 Issue への引き継ぎ

- 牌指定削除: `remove-hand-tile` の接続と、牌の当たり判定(375px で幅約 22dp)を要件 §4 に追記すること(確定事項 7)。その際、外枠の `onClick` で牌(`.hand-card__tiles` の牌要素)を `closest` で判定して分岐する形が自然。牌間の 1px と和了牌前の 4dp の扱いも決める。
- 要約カード(D1 条件 21)の保留分は本 Issue では扱っていない。
- UI 監修でカードの寸法を変える場合、牌幅の式の `0.25rem`(和了牌前の隙間)と `.hand-card__tiles` の `padding: 2px`(枠の逃げ)を連動させること。

## 6. 要ヒアリング事項(統括担当へ)

- 本書の【設計案】のうち、ユーザー判断が要るものは 1.3 の「ネイティブ `<button>` 採用」と 2.2 の見出しの書体・色。統括担当の判断で不要なら設計案のまま進める。
