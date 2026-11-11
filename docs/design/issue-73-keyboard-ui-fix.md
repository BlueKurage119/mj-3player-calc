# Issue #73 D7. キーボードのUI監修漏れを是正する 設計書

- 状態: 承認済み(v2)
- 版履歴:
  - v1: 初版。#64(BottomSheet 初回フォーカス)・#66(消すボタンのクラス共有)を併合。
  - v2: ユーザー承認。Q1〜Q7 の回答と、【設計案】を設計案のとおり採用することを §9 に反映(2026-11-11)。
- 対象: Issue #73 の 1-1〜1-7・2-1〜2-4・3、#64、#66(案A)
- 範囲外: #65(指導文書のみ。別ブランチ)、#62、抜き北ステッパー・状況役チップの拒否表現、パレットの disabled キーの拒否表現、`SYMBOL_CANCEL` 定数の削除

## 1. 参照資料と判断の根拠

### 1.1 参照資料

- `gh issue view 73`・`64`・`66`
- `docs/design/issue-46-palette-input.md`・`issue-47-tenkey-input.md`(v6 で手牌パレットの 0.8rem を決定)・`issue-48-meld-north-dora.md`(確定事項 13・41・43、A5・A8、2.3 の表、C12・C14a〜C14c・C14h)・`issue-55-hand-card-redesign.md`(C6・C7)・`issue-51-screen-skeleton.md`(D1 条件 20: 閉じたら元の要素へフォーカスを戻す)・`symbols-inline-svg.md`(#70)
- `docs/rules/02`・`06`・`09`、`docs/rules/advisory/G-04`・`G-08`・`G-11`
- コード(main 889b893): `src/ui/expressive/BottomSheet.tsx`・`bottom-sheet.css`、`src/ui/input/Tenkey.tsx`・`tenkey.css`・`TilePalette.tsx`・`tile-palette.css`・`tenkey-logic.ts`・`use-tenkey-keyboard.ts`、`src/ui/state/app-state.ts`・`hand-rules.ts`・`AppStateProvider.tsx`、`src/ui/screen/CardClearButton.tsx`・`HandCard.tsx`・`IndicatorCard.tsx`・`MeldArea.tsx`・`main-screen.css`、`src/ui/icons/*`、`src/ui/theme/tokens.css`、`@material/web` 2.5.0

### 1.2 ヒアリング済みの確定事項(ユーザー承認済み)

| 番号 | 内容 |
| --- | --- |
| K1 | #64・#66 を本書に併合する。#66 は案A(`card-clear-*` に一本化、手牌も `CardClearButton` を使う、外枠 onClick の判定も統一、見た目は不変、375px の当たり判定を issue-55 C6・C7 / issue-48 C14a〜C14c 相当で再実測)。#65・#62 は対象外 |
| K2 | (1-1)手牌・ドラ・裏ドラ・副露の全パレットで `padding-block`・`row-gap` を手牌と同じ 0.8rem に揃える |
| K3 | (1-2)パレットモードの AC(md tonal button)のホバー時の浮き上がり(elevation)を無効にする |
| K4 | (1-3)`.tenkey__key--digit` の背景を `surface-container-lowest` にする(トークンのみ。ライト・ダーク両方で視認性を確認) |
| K5 | (1-4)BottomSheet 共通の閉じるボタンを tonal(`secondary-container` 背景)にし、アイコンを `SYMBOL_CLOSE` に戻す |
| K6 | (1-5)赤なし(`rule.red === 0`)では、赤5p・赤5s キーと副露の赤トグルを非表示ではなく disabled(既存の disabled 表示)で描く。BS・入力終了のキー幅は赤ありと同じ位置に固定する。テンキー側に該当する赤の入力があれば同様に扱う |
| K7 | (1-6)#70 の取りこぼしを実物で洗い出し、見つかったものだけを是正する。無ければ無い事実と確認方法を書く |
| K8 | (1-7)状況役シートは固定の最小高さを持たず、内容高さ+下余白。`50dvh` 上限と超過時のスクロールは維持 |
| K9 | (2-1)BottomSheet に MD3 elevation level 2 相当の影を付けて要約カードより浮かせる。スクリムは入れない。z-index は現状(シート 20・要約カード 10)を前提にする |
| K10 | (2-2)入力が黙って拒否される経路に限り、対象カードを水平にシェイクする(振幅約 4px・約 250ms)。`prefers-reduced-motion` では `error` 色の枠を一瞬点滅させる代替。パレットの disabled キーは対象外 |
| K11 | (2-3)テンキーだけ最大幅(目安 22rem)を設け中央寄せ。パレットは変更しない |
| K12 | (2-4)副露フォーカス時の BS・AC・物理 Backspace を有効化する。BS=種別を残して牌だけ消す(空枠)。AC=副露カードごと削除(ゴミ箱と同じ結果)。物理 Backspace(バッファ空)も BS に揃える。issue-48 の改訂箇所を明示する |
| K13 | (3)影響を受ける既存テストと新規テストを設計に含める |

### 1.3 実物調査の結果(本書の判断の根拠)

- **R1 パレット間隔**: `main-screen.css` の `.sheet-slot[data-slot="sheet-hand"] .tile-palette { padding-block: 0.8rem; row-gap: 0.8rem }` だけが手牌に効き、他は `tile-palette.css` の `row-gap: 0.25rem`・padding なし。`TilePalette` はシート内でしか使われていない(`grep -rn "<TilePalette" src`)。
- **R2 AC の elevation**: `@material/web` 2.5.0 の `button/internal/filled-tonal-styles` に `--md-filled-tonal-button-hover-container-elevation` がある(既定は level 1)。押下・フォーカスの既定は 0。
- **R3 閉じるボタン**: `BottomSheet.tsx` は `IconButton variant="standard"` に `SYMBOL_CANCEL`(丸付き×)。`variant="tonal"` は `md-filled-tonal-icon-button` で、容器色の既定は `--md-sys-color-secondary-container`(`iconbutton/internal/filled-tonal-styles` で確認)。`SYMBOL_CANCEL` の使用箇所は `BottomSheet.tsx` だけ(テストは `CardClearButton.test.tsx` が参照)。
- **R4 赤の扱い**: `TilePalette.tsx` は `hasRed = state.rule.red > 0` が偽のとき `RED_TILES`・赤トグルを描かず、BS を span-3・入力終了を span-4 に広げる。テンキーは `'0'`(補助表示「赤5」)が赤5の入力で、`canAppendTenkeyDigitFor` は赤ルールを見ない。赤なしで `0` → `p` を押すと `tenkey-commit` の `planAddTiles` 等で失敗し、**バッファを残したまま黙って何も起きない**(コード読みで確認。実挙動未確認)。
- **R5 アイコン(#70 の取りこぼし調査)**: 次の方法で調べ、**是正対象は見つからなかった**。
  1. `grep -rn "SYMBOL_\|<svg\|md-icon\|material-icons\|Material Icons\|material-symbols" src/ui`(テスト除く): アイコンの描画は `SymbolIcon` 経由のみ。`<svg` 直書きは `SymbolIcon.tsx` と MdGallery の自作三角形(#70 で自作明記済み)だけ。`md-icon` 要素・アイコンフォントの使用は無い。
  2. `symbol-paths.ts` の `SYMBOL_BACKSPACE`・`SYMBOL_CLOSE`・`SYMBOL_KEYBOARD_RETURN` を、公式 `google/material-design-icons` の `symbols/web/<name>/materialsymbolsoutlined/<name>_24px.svg` の `d` と文字列比較し、3 つとも完全一致(2026-11-11 実測)。
  3. サイズ: `Tenkey.tsx`・`TilePalette.tsx` とも BS・入力終了は `SymbolIcon` 既定の 1.5rem(24dp)で、両者に不一致は無い。統括の例示「パレット24dp/テンキー20dp」の差は実物には無い(20dp=1.25rem はカードの消すボタン)。
  4. md 部品内蔵アイコン: 使用中の `@material/web` 部品(button・icon-button・chip 等)で、本アプリが内蔵アイコンを表示している箇所は無い(`Chip` の icon スロットは呼び出し側の `SymbolIcon`)。
  - 見た目上「Material Icons が残っている」と感じられた原因として考えられるのは、閉じるボタンの `SYMBOL_CANCEL`(丸付き×。K5 で是正)である。推測であり、統括に確認を回す(要ヒアリング Q1)。
- **R6 状況役シートの高さ**: `main-screen.css` 586〜590 行で `sheet-situation` にも `min-height: 16rem` が付いている。
- **R7 影**: テーマに elevation トークンは無い(`grep -rn elevation src/ui/theme` が 0 件)。`--md-sys-color-shadow` はライト・ダークとも定義済み。
- **R8 拒否経路**(`app-state.ts`・`use-tenkey-keyboard.ts`): 画面のテンキーの数字キーは `canAppendTenkeyDigitFor` が偽なら disabled なので拒否は起きない。黙って拒否されるのは次の 3 つ。
  - E1 `tenkey-commit` で、バッファが空でなく `resolveTenkeyBuffer` が `null`(例: `8z`)
  - E2 `tenkey-commit` で、牌に解決できたが手牌の上限・残り枚数・表示牌の上限・副露の成立で拒否(`planAddTiles`・`canAddIndicatorTile`・`canSetMeld`/`meldTileForKey` が失敗)。画面のスート(m/p/s/z)キーと物理キーの両方から到達する
  - E3 物理キーの数字で `tenkey-digit` が `canAppendTenkeyDigitFor` により拒否(パレットモードの物理キーも同じ。確定事項 41 の P4)
  - いずれも reducer は `return state`(同一参照)で、バッファは残る。
- **R9 副露**: `tenkey-backspace` の meld 分岐はバッファ空で `return state`。`tenkeyActionKeysFor` は meld で AC 常に disabled。パレットは meld で BS・AC とも disabled。ゴミ箱は `dispatch({ type: 'remove-meld', i })` で、reducer はフォーカス中の副露なら `inputFocus = null`(シートが閉じる)、`tenkeyBuffer = ''`。空枠(`tile === null`)の副露は対象を離れると削除される(issue-48 A5)。
- **R10 #66**: Issue 本文の事実をコードで再確認した(`CardClearButton.tsx` が `hand-card__*` を併記、`HandCard.tsx` は直書き、`IndicatorCard` の外枠は `.hand-card__clear-zone` のみ判定)。`HandCard` の消すボタンだけ、消した後に `bodyRef.current?.focus({ preventScroll: true })` を行う。
- **R11 #64**: `bottom-sheet.css` は `transition-property: transform, visibility`。`visibility` の遷移は開始時点(進行 0)では hidden のままなので、`useLayoutEffect` 内の `focus()` が効かない、という Issue の推測と整合する(機構は実挙動未確認)。
- **R12 バンドル基準値**: main 889b893 で `npm run build` 後、09 号の計測方法で **122,919 B**(2026-11-11 本書作成時に実測)。09 号の記録値 122,779 B と 140 B 異なる。原因は調べていない。

## 2. 設計

### 2.1 変更ファイル一覧

| ファイル | 変更 | 対応 |
| --- | --- | --- |
| `src/ui/input/tile-palette.css` | 変更 | K2・K3 |
| `src/ui/screen/main-screen.css` | 変更 | K2(手牌専用規則の削除)・K8・#66・K10 |
| `src/ui/input/tenkey.css` | 変更 | K4・K11 |
| `src/ui/expressive/BottomSheet.tsx`・`bottom-sheet.css` | 変更 | K5・K9・#64 |
| `src/ui/input/TilePalette.tsx` | 変更 | K6・K12 |
| `src/ui/input/Tenkey.tsx` | 変更なしの見込み(K6 は判定関数側) | — |
| `src/ui/state/hand-rules.ts` | 変更 | K6(`canAppendTenkeyDigitFor`) |
| `src/ui/state/app-state.ts` | 変更 | K12(`clear-meld-tile` 追加、`tenkey-backspace` の meld 分岐)・K10(拒否判定関数) |
| `src/ui/state/AppStateProvider.tsx` | 変更 | K10(拒否通番の提供) |
| `src/ui/input/tenkey-logic.ts` | 変更 | K12(`tenkeyActionKeysFor` の meld) |
| `src/ui/screen/reject-feedback.ts`(新規) | 新規 | K10(フック) |
| `src/ui/screen/CardClearButton.tsx`・`HandCard.tsx`・`IndicatorCard.tsx`・`MeldArea.tsx` | 変更 | #66・K10 |
| 各テスト | 変更・新規 | §3 |

`src/ui/md/` は変更しない。

### 2.2 パレット(K2・K3・K6・K12)

- `tile-palette.css` の `.tile-palette` を `padding-block: 0.8rem; row-gap: 0.8rem;` にする(`column-gap: 2px` は不変)。`main-screen.css` の `.sheet-slot[data-slot="sheet-hand"] .tile-palette` 規則は削除する(値の正本を 1 か所にする)。
- `.tile-palette__action` に `--md-filled-tonal-button-hover-container-elevation: 0;` を加える(K3。対象は AC の hover だけ。押下・フォーカスは既定で 0)。
- 赤なし(K6):
  - `hasRed` による分岐を「描くかどうか」から外す。常に `RED_TILES`(meld フォーカス時は赤トグル)を描き、`rule.red === 0` のときは各赤キー・赤トグルを `disabled` にする(判定関数の結果に関係なく強制)。
  - BS は常に `tile-palette__action--span-2`、入力終了は常に `--span-3`(赤ありと同じ)。
  - 赤トグルの `×{redCount}` 表示は赤なしでも描く(値は 0)。【設計案】
- 副露(K12): 下表のとおり。

| 対象 | BS(画面「1 枚削除」) | BS disabled | AC のアクション / aria-label | AC disabled |
| --- | --- | --- | --- | --- |
| meld i | `clear-meld-tile { i }` | `melds[i].tile === null` | `remove-meld { i }` / 「副露を削除」【設計案。要ヒアリング Q3】 | なし(常に有効) |

手牌・ドラ・裏ドラの行は issue-48 2.3 のまま。

### 2.3 テンキー(K4・K6・K11・K12)

- `tenkey.css`: `.tenkey__key--digit { background-color: var(--md-sys-color-surface-container-lowest); }`(文字色 `on-surface` は不変)。`.tenkey { max-width: 22rem; margin-inline: auto; }`【22rem は設計案】。
- K6 テンキー側: `canAppendTenkeyDigitFor` の引数型を `Pick<AppState, 'input' | 'tenkeyBuffer' | 'inputFocus' | 'rule'>` に広げ、`digit === '0' && state.rule.red === 0` なら偽を返す(先頭の形式チェックの直後)。これで画面の `0` キーは既存の disabled 表示になり、物理キー `0` は E3 の拒否(2.6 のシェイク)になる。呼び出し元(`Tenkey.tsx`・reducer)は `state` 全体を渡しているので型の変更だけで足りる見込み。
- K12 `tenkeyActionKeysFor` の meld 分岐:
  - `backspace.disabled = bufferEmpty && melds[i].tile === null`
  - `clear = { action: { type: 'remove-meld', i }, label: (2.2 と同じ文言), disabled: false }`
  - 引数型に変更なし(`input` から副露を引ける)。

### 2.4 状態(K12)

- `AppAction` に `{ type: 'clear-meld-tile'; i: number }` を追加。`i` が範囲外、または `tile === null` なら `return state`。それ以外は `melds[i] = { ...meld, tile: null }`、`tenkeyBuffer = ''`、`inputFocus` は不変(シートは開いたまま)。
- `tenkey-backspace` の meld 分岐(バッファ空)を、上の `clear-meld-tile` と同じ結果にする(共通の内部関数にしてよい)。
- AC の `remove-meld` は既存アクションをそのまま使う。ゴミ箱と同一アクションなので、状態の結果は同一(フォーカス中の副露なら `inputFocus = null` でシートが閉じる)。
- 空枠にしたあと対象を離れると、issue-48 A5 によりその副露は削除される(既存仕様。本書では変えない。要ヒアリング Q4)。

### 2.5 BottomSheet(K5・K9・#64)

- `BottomSheet.tsx`: 閉じるボタンを `variant="tonal"`・`<SymbolIcon d={SYMBOL_CLOSE} />` にする。import から `SYMBOL_CANCEL` を外す(定数自体は残す)。
- `bottom-sheet.css`:
  - #64(案B【設計案。要ヒアリング Q2】): 閉状態の `.bottom-sheet` は `transition: transform <D> <E>, visibility 0s linear <D>;`(閉じるときは移動が終わってから hidden)、`.bottom-sheet--open` は `transition: transform <D> <E>, visibility 0s;`(開くときは即 visible)。`<D>`・`<E>` は現行の `--md-sys-motion-spring-spatial-default-duration`・`-easing`。`prefers-reduced-motion` の `transition: none` は維持。`BottomSheet.tsx` の `focus()` のタイミングは変えない。
  - K9: `.bottom-sheet` に下記の影を付ける。MD3 elevation level 2 の仕様値(`0 1px 2px 0` 30% と `0 2px 6px 2px` 15%)を、シートが画面下端にあるため y を上向きに反転したもの【設計案】。色は `--md-sys-color-shadow` から `color-mix` で作り、HEX は書かない。

    ```css
    box-shadow:
      0 -1px 2px 0 color-mix(in srgb, var(--md-sys-color-shadow) 30%, transparent),
      0 -2px 6px 2px color-mix(in srgb, var(--md-sys-color-shadow) 15%, transparent);
    ```

    既存の `border-top`・背景 `surface-container-high`・z-index 20 は不変。閉状態は `visibility: hidden` なので影も見えない。

### 2.6 入力拒否のフィードバック(K10)

- 拒否の判定は reducer の外に置き、`appReducer` の戻り値と既存テストの同一参照比較(`toBe(state)`)は変えない。
- `app-state.ts` に純粋関数を追加する。

  ```ts
  export const isSilentReject = (prev: AppState, action: AppAction, next: AppState): boolean
  ```

  真になるのは `next === prev` かつ `prev.inputFocus` が hand・dora・uradora・meld のいずれかで、次のどれか: (a) `action.type === 'tenkey-digit'`(E3)、(b) `action.type === 'tenkey-commit'` かつ `prev.tenkeyBuffer !== ''`(E1・E2)。バッファ空の `tenkey-commit` は拒否扱いしない【設計案】。
- `AppStateProvider.tsx`: 内部の `useReducer` を `{ app: AppState; rejectSeq: number }` を持つ包み reducer にし、`isSilentReject` が真なら `rejectSeq + 1`。既存の `useAppState()`・`useAppDispatch()` の戻り値は不変。新たに `useRejectSeq(): number` を公開する(`state/index.ts` から export)。
- `src/ui/screen/reject-feedback.ts`(新規): `useRejectFeedback(ref: RefObject<HTMLElement | null>, isTarget: boolean): void`。`rejectSeq` が増え(初回マウント時は発火しない)、かつ `isTarget` のとき、要素の `data-reject` 属性を一度外して付け直し(`void el.offsetWidth` で再計算を挟む)、`animationend` で外す。
- 対象カードと `isTarget`: `HandCard`(focus が hand)、`IndicatorCard`(focus が自分の target)、`MeldArea` の各副露カード(focus が meld かつ同じ i)。付ける要素はカードの外枠(`.hand-card`・`.indicator-card`・`.meld-card`)。
- CSS(`main-screen.css`):

  ```css
  @keyframes card-reject-shake { /* 0 → -4px → 4px → -4px → 4px → 0 の translateX */ }
  @keyframes card-reject-flash { /* outline-color: error → transparent */ }
  .hand-card[data-reject], .indicator-card[data-reject], .meld-card[data-reject] {
    animation: card-reject-shake 250ms ease-in-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .hand-card[data-reject], .indicator-card[data-reject], .meld-card[data-reject] {
      animation: card-reject-flash 250ms linear;
      outline: 2px solid transparent;
      outline-offset: -2px;
    }
  }
  ```

  振幅 4px・250ms・枠 2px・`outline-offset` は【設計案】。色は `var(--md-sys-color-error)` のみ。
- 振動(`navigator.vibrate`)・音・文言は加えない。

### 2.7 消すボタンの一本化(#66 案A)

- `CardClearButton` に `variant?: 'hand' | 'compact'`(既定 `'compact'`)を追加。クラスは `card-clear-zone card-clear-zone--<variant>`・`card-clear-button` のみ(`hand-card__clear-*` を付けない)。
- `HandCard` は直書きをやめ `<CardClearButton variant="hand" aria-label="手牌をクリア" disabled={isEmpty} onClear={...} />`。`onClear` 内で `clear-hand` の dispatch と `bodyRef.current?.focus({ preventScroll: true })` を行う(現行の挙動を維持)。
- `main-screen.css`: `.hand-card__clear-zone` → `.card-clear-zone`(共通: `padding-inline-start: 0.5rem; display: flex; box-sizing: border-box; position: relative;`)、`.card-clear-zone--hand { padding-block-end: 0.5rem; }`、`.card-clear-zone--compact { padding-block-end: 0; }` と `.card-clear-zone--compact::after`(現行の `inset-block-end: -0.5rem` 等をそのまま移す)。`.hand-card__clear-button` → `.card-clear-button`(値は不変)。`.indicator-card .card-clear-zone, .meld-card .card-clear-zone` の打ち消し規則は削除する。算出値は 4 カードとも現行と同じになること(C10 で確認)。
- 外枠 onClick の判定は `HandCard`・`IndicatorCard`・`MeldArea` とも `closest('.card-clear-zone')` のみ。

### 2.8 状況役シート(K8)

- `main-screen.css` 586〜590 行のセレクタ群から `.sheet-slot[data-slot="sheet-situation"]` を外し、`min-height` を持たせない。下余白は `.bottom-sheet__content` の既存 `padding-bottom: 1rem` に加え、`.sheet-slot[data-slot="sheet-situation"] { padding-block-end: 0.5rem; }`【0.5rem は設計案。監修で確定】。`max-height: 50dvh`・`overflow-y: auto` は不変。

### 2.9 設計書の改訂(K12・#66)

本書の承認・マージに合わせ、統括が次の 1 行追記を行う(既存本文は書き換えない。issue-48 §5 の前例どおり。製造の対象外)。

| 設計書 | 追記する場所 | 追記内容(要旨) |
| --- | --- | --- |
| issue-48 | 冒頭(版履歴の位置) | 確定事項 13、A8 の「副露では何もしない」、2.3 の表の meld 行(パレット・テンキーとも)、受け入れ条件 C12 の末文・C14h の副露部分、および A11(HandCard は CardClearButton を使わない)は Issue #73 で変更(issue-73 §2.2〜2.4・2.7)。確定事項 41 の文言自体は不変(参照先の A8 が変わる) |
| issue-47 | 版履歴 | 数字キーの背景色・テンキーの最大幅、v6 の手牌専用 0.8rem の全対象化は Issue #73 で変更 |
| issue-46 | 冒頭 | 赤なし時の赤キー非表示は Issue #73 で disabled 表示に変更 |
| issue-51 | 冒頭 | BottomSheet の閉じるボタン(tonal・close)、影、visibility の遷移は Issue #73 で変更 |
| issue-55 | 冒頭 | `hand-card__clear-*` は Issue #73 で `card-clear-*` に改名 |

## 3. テスト(自動)

### 3.1 影響を受ける既存テスト(期待値の変更)

| ファイル | 箇所 | 変更 |
| --- | --- | --- |
| `src/ui/input/tenkey-logic.test.ts` | 238 行付近(meld の clear) | `action: { type: 'remove-meld', i }`・`disabled: false`・新ラベル |
| 同 | 259〜265 行(D4-C14g-3) | meld・バッファ空・牌あり → `tile === null` になる。牌なしは `toBe(meld)` のまま |
| `src/ui/input/TilePalette.test.tsx` | 赤なしの描画・meld の BS/AC disabled を見ている箇所 | 赤キーが存在し disabled、meld の BS は牌ありで有効・AC は有効 |
| `src/ui/screen/CardClearButton.test.tsx` | 115〜125 行(クラス名・CSS 文字列)、`SYMBOL_CANCEL` 参照箇所 | `card-clear-*`・修飾クラスに更新 |
| `src/ui/screen/HandCard.test.tsx` 77 行、`IndicatorCard.test.tsx` 43・79 行、`MeldArea.test.tsx` 106 行 | クラス名 | `card-clear-zone` に更新 |
| `src/ui/state/hand-rules.test.ts` | `canAppendTenkeyDigitFor` を呼ぶ箇所 | 引数に `rule` を追加 |

上記以外で失敗したテストは、製造担当が原因を確認し、本書の変更に起因するものだけ期待値を直す(その一覧を最終報告に書く)。

### 3.2 新規テスト

- `app-state.test.ts`: `clear-meld-tile`(牌あり→null・種別とフォーカス不変・バッファ空、牌なし→同一参照、範囲外→同一参照)。`isSilentReject` の真偽表(E1・E2・E3 が真、バッファ空 commit・成功した commit・フォーカス null が偽)。
- `hand-rules.test.ts`: `rule.red === 0` で `canAppendTenkeyDigitFor(…, '0')` が偽、`red > 0` では従来どおり。
- `TilePalette.test.tsx`: 赤なしで `aria-label` が赤5p・赤5s のキーが disabled で存在し、BS が `span-2`・入力終了が `span-3`。meld で赤トグルが disabled で存在。
- `reject-feedback` のフック: `rejectSeq` 増加で対象の要素に `data-reject` が付き、非対象には付かない(jsdom。アニメーションの見た目は C8 で確認)。
- `BottomSheet`: 閉じるボタンが `md-filled-tonal-icon-button`。

## 4. バンドル(09 号)

- 基準値: 122,919 B(R12)。
- 積算した増分: 拒否通番とフック 約 +350 B、`clear-meld-tile` と meld 分岐 約 +120 B、パレット・テンキーの分岐変更 約 ±50 B、`md-filled-tonal-icon-button` は `IconButton.tsx` で既に import 済みのため 0 B。合計 **約 +500 B**。
- 目標値: **123,419 B**。超過は不合格にしない。

## 5. 実挙動未確認の一覧

1. #64 の機構(visibility 遷移が原因か)と、案B で初回から `focus()` が効くか → C1
2. 影の見え方(上向き反転の妥当性、ダークでの視認性) → C6
3. `surface-container-lowest` の数字キーのダークでの見え方 → C4
4. 0.8rem 化した副露シート(種類バー+パレット)が 375×667 で `50dvh` を超えスクロールになるか(試算: ヘッダー 48+種類バー 約 56+パレット 4 行 192+行間 38.4+上下 25.6 ≒ 360px > 333.5px) → C2(要ヒアリング Q5)
5. 拒否経路 E1〜E3 の実際の画面挙動 → C8
6. AC で副露削除した後のフォーカスの行き先とゴミ箱との一致 → C12

## 6. 受け入れ条件

共通: ブラウザ幅 375px。dev(`npm run dev`)で確認し、**C2・C3・C4・C5・C6・C8・C10 は本番ビルド(`npm run build && npx vite preview`)でも同じ結果であること**(G-11)。サーバーは確認後に停止する。値の取得は DevTools の `getComputedStyle`・`getBoundingClientRect` による。

- [ ] **C0 静的検査**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて成功。`git grep -n "hand-card__clear" -- src` が 0 件。`git grep -n "SYMBOL_CANCEL" -- src/ui/expressive` が 0 件。`git grep -nE "#[0-9a-fA-F]{3,8}\b" -- src/ui/input/*.css src/ui/expressive/bottom-sheet.css` で本 Issue の差分行にヒットが無い(`git diff main -- <file>` と突き合わせる)。`git diff main --stat -- src/ui/md` が空。
- [ ] **C1 #64 初回フォーカス**: ページを再読み込みし、手牌カードを1回だけタップしてシートを開く。DevTools で shadow root を辿った `document.activeElement` が `.bottom-sheet__close-button`(またはその内部)である。「副露を追加」ボタン経由の初回オープンでも同じ。Escape で閉じると、フォーカスが開いた元の要素(手牌カード本体/`.meld-add`)に戻る(D1 条件 20)。`prefers-reduced-motion: reduce` をエミュレートしても同じ。
- [ ] **C2 パレット間隔(K2)**: 手牌・ドラ・裏ドラ・副露の各シートをパレットモードで開き、`.tile-palette` の `padding-top`・`padding-bottom`・`row-gap` がいずれも `12.8px`。副露シートについて、375×667 と 375×812 でシート高さ(`.bottom-sheet` の `height`)と、内容がスクロールするか(`.bottom-sheet__content` の `scrollHeight > clientHeight`)を記録する(合否はQ5の回答による。記録のみ)。
- [ ] **C3 AC の hover(K3)**: パレットモードの AC(`md-filled-tonal-button.tile-palette__action`)にマウスを乗せた状態で、shadow 内 `md-elevation` の算出 `--md-elevation-level` が `0`(または影の `box-shadow` が `none`)。乗せる前後で `getBoundingClientRect()` の値が同じ。
- [ ] **C4 数字キーの色(K4)**: ライト・ダークそれぞれで、`.tenkey__key--digit` の `background-color` が `:root` の `--md-sys-color-surface-container-lowest` の値と一致し、`.bottom-sheet` の `background-color`(`surface-container-high`)と異なる。両テーマのスクリーンショットを PR に添付し、数字キーとシート背景が区別できることを目視で確認(統括・ユーザーの監修で最終判断)。
- [ ] **C5 閉じるボタン(K5)**: 全シート(手牌・ドラ・裏ドラ・副露・状況役)で閉じるボタンが `md-filled-tonal-icon-button` で、shadow 内の容器の `background-color` が `--md-sys-color-secondary-container` の値と一致。内部 `svg path` の `d` が `SYMBOL_CLOSE` と一致。aria-label は「閉じる」。
- [ ] **C6 影(K9)**: 開いた `.bottom-sheet` の `box-shadow` が `none` でなく、2 層である。要約カード表示中にシートを開いたスクリーンショット(ライト・ダーク)を PR に添付。`.bottom-sheet` の `z-index` が `20`、`.summary-card` が `10` のまま。スクリム要素が追加されていない(`document.querySelectorAll('.bottom-sheet ~ *')` 等に新規の全面要素が無い)。
- [ ] **C7 赤なし(K6)**: 設定で赤を「赤なし」にする。(1)手牌・ドラ・裏ドラのパレットに aria-label が赤5p・赤5s のキーが存在し `disabled` 属性を持ち、`opacity` が `0.38`。(2)副露(ポン 5p)のパレットに赤トグル(aria-label「赤牌」)が `disabled` で存在。(3)BS と入力終了の `getBoundingClientRect()` の `left`・`width` が、赤ありの同じシートでの値と ±0.5px で一致(手牌・副露で確認)。(4)テンキーの `0` キーが `disabled`。赤ありに戻すと `0` キーと赤キーが有効に戻る。
- [ ] **C8 拒否のシェイク(K10)**: (1)手牌 14 枚の状態でテンキーに `1` を入れられない(画面キー disabled)ことを確認し、物理キー `1` を押すと手牌カードに `data-reject` が付き、`animation-name` が `card-reject-shake`、`animationend` 後に属性が外れる。(2)手牌 0 枚でテンキー `8` → `z` を押す(E1)と同様にシェイクし、バッファは残る。(3)赤なしで物理キー `0` を押す(E3)と同様。(4)ドラ・副露の各シートでも E2 の例(ドラ 5 枚で `1p` 確定、副露ポンで手牌と合わせて 5 枚目になる牌の確定)で対象カードだけがシェイクし、他のカードに `data-reject` が付かない。(5)パレットの disabled キーをクリックしても `data-reject` が付かない。(6)バッファ空で `m` を押しても付かない。(7)DevTools で `prefers-reduced-motion: reduce` をエミュレートし (1) を行うと、`animation-name` が `card-reject-flash` で、`transform` が変化しない。
- [ ] **C9 テンキー最大幅(K11)**: 幅 600px で `.tenkey` の `width` が `352px`(22rem)で、左右の余白の差が ±0.5px。375px では `.tenkey` の幅がシート内容幅(`.bottom-sheet__content` の `clientWidth` − 左右 padding)と一致。パレットの幅は main と同じ(600px 幅で比較)。
- [ ] **C10 消すボタン(#66)**: main とブランチの両方で、手牌・ドラ・裏ドラ・副露の各カードについて消すボタンと `.card-clear-zone`(main は `.hand-card__clear-zone`)の `getBoundingClientRect()` と `padding`、`::after` の有無と矩形を記録し、差が ±0.5px 以内。続けて issue-55 の C6・C7(手牌)と issue-48 の C14a〜C14c(ドラ・裏ドラ・副露)を、クラス名を `.card-clear-zone` に読み替えて実行し全て合格。手牌の消すボタンを押した後、フォーカスが `.hand-card__body` にある(現行どおり)。
- [ ] **C11 副露の BS(K12)**: ポン 1p を確定した副露のシートで、(1)パレットの「1 枚削除」が有効、押すと副露カードが空枠になり種別(ポン)と選択状態が残り、シートは開いたまま。空枠では「1 枚削除」が `disabled`。(2)テンキーモードで同じ操作を「1 文字削除」で行い同じ結果。バッファがあるときはバッファの1文字だけが消える。(3)物理 Backspace(バッファ空)で同じ結果。(4)空枠のままシートを閉じると副露カードが消える(A5。既存仕様の確認)。
- [ ] **C12 副露の AC(K12)**: 副露 2 つ(1 つ目にフォーカス)で AC(パレット・テンキーそれぞれ)を押すと、1 つ目の副露が消え、シートが閉じ、残った副露が 1 番目になる。同じ初期状態からゴミ箱を押した場合と、React DevTools 等で見た `input.melds`・`inputFocus`・`tenkeyBuffer` が一致する。両者の押下後の `document.activeElement` を記録する(一致しない場合は PR に事実を書く)。AC の aria-label が §2.2 の文言。
- [ ] **C13 状況役シート(K8)**: 状況役シートの `.sheet-slot` の `min-height` が `0px`(または `auto`)で、`.bottom-sheet` の高さが「ヘッダー + 内容 + 下余白」になっている(内容の下端からシート下端までが 1.5rem ±0.5px。safe-area 0 の環境)。375×667 で内容が 50dvh を超える場合はスクロールできる。
- [ ] **C14 アイコン(K7)**: §1.3 R5 の手順 1・2 を再実行し同じ結果である。
- [ ] **C15 バンドル**: 09 号の方法で初回 JS を測り、基準値 122,919 B・実測値・増分・積算(+500 B)との差を PR 本文に書く(超過は不合格にしない)。

## 7. 製造の分割(コミット単位の案)

1. `fix`: BottomSheet の visibility 遷移を開く側で即時にする(#64)。C1
2. `refactor`: 消すボタンのクラスを `card-clear-*` に一本化し、手牌も `CardClearButton` を使う(#66)。C10
3. `style`: パレットの間隔を全対象で 0.8rem にし、AC の hover の浮き上がりを無くす(K2・K3)。C2・C3
4. `style`: テンキーの数字キーの背景と最大幅を変える(K4・K11)。C4・C9
5. `style`: BottomSheet の閉じるボタンを tonal・close にし、影を付ける(K5・K9)。C5・C6
6. `feat`: 赤なしで赤キーを disabled 表示にし、テンキーの `0` も無効にする(K6)。C7
7. `feat`: 副露の BS・AC・物理 Backspace を有効にする(K12)。C11・C12
8. `style`: 状況役シートの最小高さを外す(K8)。C13
9. `feat`: 入力拒否時に対象カードをシェイクする(K10)。C8

各コミットで §3 の該当テストを同時に直す。

## 8. 後続 Issue への引き継ぎ

- `useRejectSeq` はテンキー経路だけを対象にしている。抜き北ステッパー等に広げる場合は `isSilentReject` の条件を拡張する。
- `SYMBOL_CANCEL` は未使用になる(テストからの参照のみ)。削除は別途判断。
- 09 号の基準値記録(122,779 B)と本書の実測(122,919 B)の差の確認。
- §2.9 の他設計書への追記(統括)。

## 9. 要ヒアリング事項(統括担当へ)

### 9.0 回答(v2。ユーザー回答 2026-11-11)

- Q1: ユーザーが見た「残存」は、すでに修正されていた。1-6 は追加の是正作業なし(§1.3 R5 の調査結果のみ記録)。
- Q2〜Q7: 設計案のとおり採用(Q2=案B、Q3=「副露を削除」、Q4=自動削除のまま、Q5=スクロール許容、Q6=バッファ空のスートキーは対象外、Q7=上向き反転・level 2 の仕様値)。本文中の【設計案】はすべて確定として扱う。数値(テンキー最大幅 22rem・シェイク 4px/250ms・下余白 0.5rem・影の値)は UI 監修で調整してよい。

### 9.1 質問(v1 の原文)

- Q1(1-6): 実物調査では Material Icons の残存・path の不一致・サイズ不一致は見つからなかった。ユーザーが見た「残存」は閉じるボタンの丸付き×(`cancel`)のことか、それとも具体的な別の画面・アイコンがあるか。
- Q2(#64): 修正方式を案B(開くときは visibility を即時 visible、閉じるときだけ遅延)で進めてよいか。
- Q3(2-4): 副露の AC の aria-label を「副露を削除」(ゴミ箱の「副露N を削除」に合わせる)に変えてよいか。従来の「副露をクリア」を維持するか。
- Q4(2-4): BS で空枠にした副露は、シートを閉じるか別の対象を開くと既存仕様(issue-48 A5)で自動的に削除される。この挙動のままでよいか。
- Q5(1-1): 0.8rem 化で副露シートが 375×667 では 50dvh を超え、スクロールが出る見込み(試算 約 360px > 333.5px)。スクロールを許容するか、副露シートだけ間隔を詰めるか。
- Q6(2-2): シェイクの対象に「バッファ空でスートキーを押した」場合を含めないでよいか(本書は含めない)。
- Q7(2-1): 影の向き(上向きに反転)と強さ(level 2 の仕様値)で監修してよいか。
