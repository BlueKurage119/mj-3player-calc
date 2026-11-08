# Issue #47 D3. テンキー入力 設計書

- 状態: 設計案(未承認。v6)
- 版履歴:
  - v1〜v4: 初版〜ヒアリング反映。v4 は段階 1〜7 として実装済み(HEAD 9fc9818)。
  - v5: UI 監修の確定事項を反映。(1)入力方式トグルの見た目の高さを 40dp(M3E の S)に縮小し、当たり判定は `::after` で上下 4dp ずつ拡張して 48dp を維持(ステッパーと同じ作り)。ヘッダー行の箱は 48dp のまま(上下 4dp の余白に当たり判定を収め、シート上端・テンキーへ食い込ませないため)。シート高 321・`sheet-hand` の `min-height: 16rem` は不変。✕ は変更なし(見た目 40・当たり 48 は Material Web の既定どおり)。(2)`dialpad` アイコンだけ 20dp(呼び出し側で `size="1.25rem"`)。(3)段階 8 を追加し、条件 6・7・10・21 を更新、条件 23 を追加。
  - v6: パレット方式の縦配置を変更(ユーザー決定)。`sheet-hand` 内のパレットに `padding-block: 0.8rem`・`row-gap: 0.8rem`(各 12.8dp)を与え、内容領域 256dp いっぱいに均等分散する(12.8×2 + 48×4 + 12.8×3 = 256)。v5 までの「上詰め・下に 52 の空き」を廃止。シート高 321・`--sheet-height`・ヘッダー行 y=492 は不変。段階 9 を追加し、条件 10 を更新、条件 24 を追加。
- 対象: 底部シートの中身としてのテンキー(mighty 準拠の 4 列 × 5 行)、パレットとテンキーの切替(シートのヘッダー行)、入力バッファの手牌カードへの表示、物理キーボード対応、`BottomSheet` の `header` スロット追加、共通アイコン部品(`src/ui/icons/`)
- 範囲外: ドラ・裏ドラ・副露・抜き北の入力(D4)、状況役(D5)、D1 条件 21(要約カードの固定。保留)、牌タップ削除の接続、ヘルプ吹き出し、拒否の文言・トースト、長押しリピートの特別扱い、320px 幅への対応、既存 8 か所のアイコンの差し替え

## 1. 参照資料と判断の根拠

### 1.1 参照資料

- `AGENTS.md`、`docs/rules/01`・`02`・`05`・`06`・`07` 号
- `docs/requirements.md` §1 表(mighty は自作部分のみ移植可【確定】)・§3.1(パレットとテンキーの併用【確定】)・§4(タップ領域・隣接間隔)
- `docs/license-policy.md`
- `docs/design/issue-46-palette-input.md`(D2。§2.2〜2.9、§6 の D3 引き継ぎ)、`docs/design/issue-51-screen-skeleton.md`(D1。2.6 底部シート、受け入れ条件 20)、`docs/design/issue-40-md-wrappers.md`(`ConnectedButtonGroup`、アイコン供給は「最初に要る Issue で決める」)
- 既存実装: `src/ui/state/app-state.ts`・`hand-rules.ts`・`index.ts`・`AppStateProvider.tsx`、`src/ui/input/TilePalette.tsx`・`tile-palette.css`、`src/ui/expressive/BottomSheet.tsx`・`bottom-sheet.css`・`ConnectedButtonGroup.tsx`・`connected-logic.ts`・`connected-button-group.css`、`src/ui/screen/MainScreen.tsx`・`HandCard.tsx`・`main-screen.css`、`src/core/tile/index.ts`(`isAvailableTiles`・`isSanmaTile`)、`src/core/rule.ts`(`redCountOf`)
- 移植元(読むだけ): `../ref-repo/mj-mighty-calc/src/ui/Tenkey.tsx`(配列・バッファ解釈・物理キー)、`../ref-repo/mj-mighty-calc/src/index.css`(`.tenkey-*`)
- 拒否方式の参照: livewing/mahjong-calc のテンキー入力の挙動(統括の調査結果。1.3)

### 1.2 確定事項(Issue #47 のヒアリング。再検討しない)

D2 からの継続:

1. シートはキーボードに徹する(表示要素を増やさない)。パレットとテンキーは併存し、方式を切り替えても手牌は失われない。
2. D2 のアクション `add-hand-tile`・`remove-last-hand-tile`・`clear-hand`・`close-sheet` を共用する(Enter は閉じる+整列)。牌タップ削除は採らない。
3. 対象幅は 375px 以上(320 は非推奨)。バンドル予算は目標値。mighty の挙動を引用し発明しない。HEX 直書き禁止。見ればわかるラベルは省略。
4. 方式切替 UI は X 案: ハンドルの棒を廃止し、ヘッダー行(高さ 48dp)に「パレット/テンキーのトグル」(幅広)と「✕」を置く。`BottomSheet` に `header` スロットを足す改修は本 Issue の範囲。初期フォーカス・フォーカス復帰・Esc・`--sheet-height`・D1 条件 20 は維持する。

ヒアリング回答:

5. (Q1=T1) テンキー配列は mighty 準拠の 4 列 × 5 行。1 行目 `m p s z`、2 行目 `7 8 9 ⌫`、3 行目 `4 5 6 AC`、4 行目 `1 2 3` と Enter(4 列目の 4〜5 行を縦 2 マス)、5 行目は 2 列目に `0`。キー高さ 48dp、隙間 4dp。1〜7 に字牌の補助表示(東南西北白發中)、0 に「赤5」の補助表示。スートキーの補助表示(萬子・筒子・索子・字牌)も付ける。
6. (Q2=H-A) シート内容領域の最小高さを両方式の高い方(テンキー 256dp)に揃え、ヘッダーの位置を動かさない。パレットのシートが高くなる副作用は承認済み(ヒアリング時は +51dp と説明。本書の算出では +52dp。2.10)。
7. (Q3=B1) 入力バッファ(未確定の数字)は手牌カードの牌列の末尾に数字+キャレットで表示する。シートには出さない。バッファの桁数の上限は「手牌最大枚数 − 現在の手牌枚数」(手牌+バッファが上限なら数字キーは `disabled`)。牌幅計算の N は変えない。バッファが空なら何も出さない。
8. (Q4=S1) `AppState` に `sheetMode: 'palette' | 'tenkey'`(既定 `palette`)と `tenkeyBuffer: string` を追加する。方式はシートの開閉をまたいで保持し、localStorage には保存しない。
9. (拒否方式。Q5 の F2 を差し替え) livewing 準拠: スート確定時、使えない牌が 1 枚でもあれば確定全体を無効にし、バッファを保持する(部分入力しない)。文言・トースト・フィードバック行は出さない。数字キー側で先に防ぐ: 手牌+バッファが上限なら数字を受け付けない、同じ数字がバッファに 4 つあれば 5 つ目を受け付けない(いずれもキーは `disabled`)。z に 0・8・9 を含むと確定せずバッファを残す。バッファが消える契機は、手牌が変わる操作・Esc・方式切替・シートを閉じる。赤は 0 キー(0m・0p・0s)。
10. (Q6=K1。後の決定で一部変更) 物理キーは `0`〜`9`、`m`/`p`/`s`/`z`(大小問わず)、`Backspace`、`Enter`(閉じる+整列)、`Escape`(`BottomSheet` が処理済み)のみ。Q6 時点の「`Delete` または `a`(AC)」は、オーナー決定により両方式とも廃止した(物理キーでの全消去は無く、全消去は画面の AC キーのみ)。livewing の Ctrl/Cmd+Backspace も採らない。数字と m/p/s/z はテンキー方式のときだけ有効で、パレット方式は `Backspace`・`Enter` のみ。フォーカスがシートの外のボタン等にあるときはキーを奪わない。長押しリピートは特別扱いしない。
11. (Q7=A1) 新アクション `add-hand-tiles { tiles }`。純関数 `planAddTiles(state, tiles)` を reducer が使う。D2 の `add-hand-tile` は変えない。ヒアリング時の形は `{ accepted, rejected(理由つき) }` を返すものだったが、確定事項 9 により本書では形を変える(2.5 に差分を明記)。
12. (Q8) D1 条件 21 は保留のまま範囲外。
13. (Q9) ヘルプ吹き出しは移植しない。
14. (Q10) トグルは既存の `ConnectedButtonGroup`。表示はアイコン。✕ は既存の閉じるボタン(`closeButtonRef`・初期フォーカス・フォーカス復帰を維持)。
15. (アイコン) Material Symbols(outlined)を使う。パレット `keyboard_keys`、テンキー `dialpad`、✕ `close`、⌫ `backspace`、Enter `keyboard_return`。共通部品を `src/ui/icons/` に置き、出典・ライセンス(Apache-2.0)は部品の先頭コメントと `docs/license-policy.md` に書く。差し替え範囲は D3 の新規分まで(既存 8 か所は触らない)。
16. (要件§4) テンキーのキー間 4dp を 8dp 規定の例外として要件§4 に追記する(2.11)。

### 1.3 参照実装の挙動(事実)

mighty(`../ref-repo/mj-mighty-calc/src/ui/Tenkey.tsx` を読んで確かめた事実):

| 項目 | mighty の挙動 |
| --- | --- |
| バッファ解釈 `resolve(buffer, suit)` | 数字 1 文字ずつ。字牌(z)は 1〜7 を東南西北白發中に変換し、0・8・9 は無視。数牌は 0 を赤 5、それ以外は n |
| スート確定 | バッファが空なら何もしない。空でなければ `resolve` の結果を親へ渡し、バッファを空にする |
| バックスペース | バッファが空でなければ末尾 1 文字を消す。空なら対象の末尾 1 枚を消す |
| AC | バッファを空にし、対象の牌を全消去(確認なし) |
| Enter・Esc | シートを閉じる(バッファは破棄) |
| 物理キー | `window` の keydown。`0`〜`9`、`m p s z`(小文字化して判定)、`Backspace`、`Delete` または `a`(本書では採らない。確定事項 10)、`Enter`・`Escape`。割り当てたキーは `preventDefault`。フォーカス判定・修飾キー判定は無い |
| 表示 | プレビュー末尾に `{buffer}‸` |
| スートキーの補助表示 | m=萬子、p=筒子、s=索子、z=字牌 |

livewing(統括の調査結果。本書では確定事項 9 として扱う): 確定は all-or-nothing でバッファを保持、文言なし、数字キー側の事前ガード(上限・同じ数字 4 個)、z の 0・8・9 で確定不可。**livewing のバックスペースの挙動は未調査**。

### 1.4 設計担当の判断と根拠

- **移植の範囲**: mighty の `Tenkey.tsx` は `TileInstance`(riichi 系の牌 ID)と `TileImage` に依存するので、コードは複製せず、配列・キー割り当て・バッファ表示を本プロジェクトの `Tile` 型で書き直す。確定の可否は livewing 準拠(確定事項 9)で、mighty の「拒否牌を飛ばして残りを追加+文言」は採らない。
- **バッファを state に置く理由**: 確定事項 8。手牌カード(シートの外)が表示し、reducer が手牌を変える操作で捨てるため。
- **バックスペースの二段挙動**: 【設計案】mighty の挙動(バッファ優先、空なら手牌末尾)を維持する。livewing のバックスペースは未調査のため、livewing と違う可能性がある。

## 2. 設計

### 2.1 モジュール構成

| ファイル | 変更 | 内容 |
| --- | --- | --- |
| `src/ui/icons/SymbolIcon.tsx` | 新規 | Material Symbols の共通アイコン部品。先頭に出典・ライセンスのコメント(2.8) |
| `src/ui/icons/symbol-paths.ts` | 新規 | アイコンごとの path 定数(2.8) |
| `src/ui/icons/index.ts` | 新規 | 公開口 |
| `src/ui/input/tenkey-logic.ts` | 新規 | UI 専用の純関数: 物理キー割り当て(`mapTenkeyKey`・`shouldHandleKeyTarget`)・`TENKEY_HONOR_HINTS`(2.6)。reducer から使うものは置かない(循環 import の回避) |
| `src/ui/input/tenkey-logic.test.ts` | 新規 | 上記のテスト |
| `src/ui/input/Tenkey.tsx` | 新規 | テンキー本体(2.4) |
| `src/ui/input/tenkey.css` | 新規 | テンキーの配置 |
| `src/ui/input/use-tenkey-keyboard.ts` | 新規 | 物理キーのフック(2.6) |
| `src/ui/input/index.ts` | 変更 | `Tenkey` 等の公開 |
| `src/ui/state/hand-rules.ts` | 変更 | reducer が使う純関数: `resolveTenkeyBuffer`・`canAppendTenkeyDigit`(2.3)、`planAddTiles`(2.5)。`src/ui/state` は `src/ui/input` を import しない |
| `src/ui/state/hand-rules.test.ts` | 変更 | 上記のテスト(D3-R・B・P) |
| `src/ui/state/app-state.ts` | 変更 | `sheetMode`・`tenkeyBuffer`、アクション追加、手牌が変わる操作でのバッファ破棄(2.2) |
| `src/ui/state/app-state.test.ts` | 変更 | 追加アクションのテスト(D3-S) |
| `src/ui/state/index.ts` | 変更 | 追加分の公開 |
| `src/ui/expressive/BottomSheet.tsx` | 変更 | `header` スロット、ハンドル棒を ✕ アイコンへ(2.7) |
| `src/ui/expressive/bottom-sheet.css` | 変更 | ヘッダー行の配置、ハンドル棒のスタイル削除 |
| `src/ui/expressive/connected-logic.ts` | 変更 | `ConnectedOption` に `icon?` を追加(2.8) |
| `src/ui/expressive/ConnectedButtonGroup.tsx` | 変更 | `icon` があればアイコンを描き、`label` を `aria-label` にする |
| `src/ui/screen/MainScreen.tsx` | 変更 | ヘッダーにトグル、`sheet-hand` に方式別の中身、物理キーのフック |
| `src/ui/screen/HandCard.tsx` | 変更 | バッファの表示(2.9) |
| `src/ui/screen/main-screen.css` | 変更 | `sheet-hand` の最小高さ、バッファの見た目 |
| `docs/license-policy.md` | 変更 | Material Symbols(Apache-2.0)の出典・利用範囲の追記(2.8) |
| `docs/requirements.md` | 変更 | §4 にテンキーの間隔の例外を追記(2.11) |

変更しない: `src/ui/input/TilePalette.tsx`・`tile-palette.css`、`src/core/**`、`AppStateProvider.tsx`(localStorage に `sheetMode` を保存しない)、既存 8 か所のアイコン(`TilePalette` 2、`Stepper` 2、`AppHeader` 1、`HandCard` 1、`SettingsScreen` 1、`MdGallery` 1。いずれも viewBox 24 の従来 Material Icons)。

`connected-logic.ts` は `.ts` なので、`icon` の型は `import type { ReactNode } from 'react'` で受ける。

### 2.2 状態とアクション(`app-state.ts`)

```ts
export type SheetMode = 'palette' | 'tenkey';
export type TenkeySuit = 'm' | 'p' | 's' | 'z';
export interface AppState {
  // 既存のフィールドはそのまま
  sheetMode: SheetMode; // 既定 'palette'。開閉をまたいで保持
  tenkeyBuffer: string; // '0'〜'9' のみ。既定 ''
}
// AppAction に追加
| { type: 'set-sheet-mode'; mode: SheetMode }
| { type: 'tenkey-digit'; digit: string }   // '0'〜'9' の 1 文字
| { type: 'tenkey-backspace' }
| { type: 'tenkey-commit'; suit: TenkeySuit }
| { type: 'add-hand-tiles'; tiles: Tile[] }
```

各アクションの挙動(「捨てる」= `tenkeyBuffer: ''`):

| アクション | 挙動 |
| --- | --- |
| `set-sheet-mode` | `mode` が現在と同じなら `state` をそのまま返す。違えば `sheetMode` を更新して捨てる |
| `tenkey-digit` | `inputFocus?.type !== 'hand'`、`sheetMode !== 'tenkey'`、`canAppendTenkeyDigit(state, digit)`(2.3)が偽、のいずれかなら `state` を返す。それ以外は末尾に追加する |
| `tenkey-backspace` | 【設計案】`tenkeyBuffer` が空でなければ末尾 1 文字を消す(手牌は変えない)。空なら `remove-last-hand-tile` と同じ処理(手牌も空なら `state` を返す) |
| `tenkey-commit` | `tiles = resolveTenkeyBuffer(buffer, suit)`。`tiles` が `null`(バッファが空、または z に 0・8・9 を含む)なら `state` をそのまま返す。`planAddTiles(state, tiles)` が `null` なら `state` をそのまま返す(バッファも手牌も他のフィールドも変えない)。可なら `hand` の末尾に全牌を追加してバッファを空にする |
| `add-hand-tiles` | `planAddTiles(state, tiles)` が `null` または空配列なら `state` を返す。可なら全牌を末尾に追加して捨てる |
| `add-hand-tile` | 可否の判定は変えない(D2 のまま)。手牌が変わったときは捨てる |
| `remove-last-hand-tile`・`remove-hand-tile` | 判定は変えない。手牌が変わったときは捨てる |
| `clear-hand` | 既存の処理に加え、捨てる(AC はこれを使う) |
| `clear-all` | 既存の処理に加え、捨てる。`sheetMode` は変えない |
| `close-sheet` | 既存の処理(手牌なら整列)に加え、捨てる(Esc・✕・Enter はいずれもこれ)。`sheetMode` は変えない。`inputFocus === null` のときは従来どおり `state` |
| `open-sheet` | 既存のまま。ただし対象が `hand` から別へ切り替わるときも捨てる(D4 用。D3 時点では UI から発生しない) |

- バッファを捨てる実装は、手牌を変える各 case(`add-hand-tile`・`add-hand-tiles`・`remove-last-hand-tile`・`remove-hand-tile`・`tenkey-backspace` が手牌を消す場合・`tenkey-commit` の成功・`clear-hand`・`clear-all`)と `set-sheet-mode`・`close-sheet` が、返す state に **`tenkeyBuffer: ''` を明示的に入れる**形に一本化する(参照の比較で自動的に捨てる仕組みは作らない。参照比較は「手牌が変わったときだけ捨てる」ことを確かめるテストの観点とする)。既存の reducer が「変化なしなら同一 `state`」を返す規約はそのまま守る。
- `set-rule` と、`step`(抜き・副露)など手牌以外の操作ではバッファを保持する。副露数が変わって上限を超えたバッファが残りうる(D4 で副露を入力する場合)が、確定時に `planAddTiles` が再判定して `null` を返すので実害はない。
- `createInitialState` に `sheetMode: 'palette'`、`tenkeyBuffer: ''` を足す。
- AC はテンキーでも `clear-hand` を送る。Enter は `close-sheet` を送る(バッファは確定せず破棄)。

### 2.3 バッファの純関数(`hand-rules.ts`)

```ts
export const resolveTenkeyBuffer = (buffer: string, suit: TenkeySuit): Tile[] | null;
  // buffer が空なら null。
  // suit==='z': 全文字が 1〜7 なら { type:'z', n } の列。0・8・9 を 1 つでも含めば null(確定不可。確定事項 9)。
  // 数牌: '0' → { type: suit, n: 5, red: true }、'5' → { n: 5, red: false }、他は { n }
export const canAppendTenkeyDigit = (
  state: Pick<AppState, 'input' | 'tenkeyBuffer'>,
  digit: string
): boolean;
  // /^[0-9]$/ でなければ偽。
  // hand.length + tenkeyBuffer.length >= maxHandLength(melds) なら偽(手牌+バッファが上限)。
  // tenkeyBuffer 内の digit の個数が 4 以上なら偽(同じ数字の 5 つ目)。
```

- 2m〜8m・赤五萬(0m)も `resolve` は作る。使えるかどうかは `planAddTiles` が決める(三麻で使わない牌は `isAvailableTiles` が偽)。
- 「同じ数字 4 個」は文字単位で数える(`0` と `5` は別の数字として数える。確定事項 9 の文言どおり。5 の在庫超過は確定時に `planAddTiles` が防ぐ)。
- 旧版の `tenkeyBufferMax` は `canAppendTenkeyDigit` に統合した(上限は「手牌+バッファ」で判定)。

### 2.4 テンキー(`Tenkey.tsx`・`tenkey.css`)

- 引数なし。`useAppState`・`useAppDispatch` を使う(`TilePalette` と同じ形)。
- CSS Grid: `grid-template-columns: repeat(4, minmax(0, 1fr))`、`grid-template-rows: repeat(5, 3rem)`、`gap: 0.25rem`。
- 配置(行・列は 1 始まり。括弧内は補助表示):

| 行 | 1 列 | 2 列 | 3 列 | 4 列 |
| --- | --- | --- | --- | --- |
| 1 | m(萬子) | p(筒子) | s(索子) | z(字牌) |
| 2 | 7(中) | 8 | 9 | ⌫ |
| 3 | 4(北) | 5(白) | 6(發) | AC |
| 4 | 1(東) | 2(南) | 3(西) | Enter(`grid-row: 4 / 6`) |
| 5 | (空) | 0(赤5) | (空) | (Enter の続き) |

- キーは自作の `<button type="button" class="tenkey__key">` に `md` の `Ripple`・`FocusRing` を入れる(`ConnectedButtonGroup` と同じ作り。md の Button は 2 段の文字と 48dp 高さの制御が未確認のため避ける)。`padding: 0; border: 0`、`height: 100%`。
- 文字: 主表示は `--md-sys-typescale-title-large-*`、補助表示は `--md-sys-typescale-label-small-*` を下に小さく(mighty の `<small>` 相当)。⌫・Enter は `SymbolIcon`(2.8)。
- 色(すべてトークン): 数字キー `surface-container-highest` / `on-surface`、スートキー・⌫・AC `secondary-container` / `on-secondary-container`、Enter `primary` / `on-primary`。角は `--md-sys-shape-corner-medium`。`disabled` は不透明度 0.38(D2 と同じ)。
- スートキーの補助表示(萬子・筒子・索子・字牌)【確定】(確定事項 5)。
- `aria-label`: 数字 `"1"`〜`"9"`・`"0"`(補助表示は `aria-hidden`)、スート `"萬子"`・`"筒子"`・`"索子"`・`"字牌"`、⌫ `"1 文字削除"`、AC `"手牌をクリア"`、Enter `"入力を終える"`(後 2 つは D2 のパレットと同じ)。
- `disabled`【確定】(確定事項 7・9): 数字キーは `canAppendTenkeyDigit(state, digit)` が偽のとき。つまり手牌+バッファが上限なら全数字、同じ数字がバッファに 4 個ならその数字のみ。スート・⌫・AC・Enter は常に有効(確定できないスートは reducer で無変化)。
- 押下: 数字 → `tenkey-digit`、スート → `tenkey-commit`、⌫ → `tenkey-backspace`、AC → `clear-hand`、Enter → `close-sheet`。

### 2.5 確定の可否(`planAddTiles`。`hand-rules.ts`)

```ts
export const planAddTiles = (
  state: Pick<AppState, 'input' | 'rule'>,
  tiles: Tile[]
): Tile[] | null;
  // 全牌を受け付けられるなら tiles(そのままの順)を返す。1 枚でも不可なら null。
```

- 判定: 先頭から 1 枚ずつ、「その時点の手牌(元の手牌+それまでに通した牌)」に対して `canAddHandTile` を適用する。1 枚でも偽なら `null`。これにより、手牌上限の超過(`hand.length < maxHandLength` の偽)・三麻で使わない牌・同種 5 枚目・赤の枚数超過・通常の 5 の枚数超過がすべて `null` になる。理由は区別しない(文言を出さないため)。
- **確定事項 11 との差分**: ヒアリング時(Q7=A1)は `{ accepted, rejected(理由つき) }` を返し、拒否牌を飛ばして残りを追加する形だった。確定事項 9(livewing 準拠)により、本書では (a) `rejected` と理由を返さない、(b) all-or-nothing(1 枚でも不可なら全体無効、部分追加しない)、に変える。`add-hand-tiles { tiles }` というアクション名と、reducer が `planAddTiles` を使うことは確定事項 11 のまま。
- **整合条件**: `planAddTiles` が非 `null` ⇔ `canAddHandTile` を逐次適用して全牌が真。D3-P8 で確かめる。
- 手牌上限: 通常はバッファ上限(2.3)で起きないが、`add-hand-tiles` を他から送る場合も同じ判定で `null` になる。
- z の 0・8・9: `resolveTenkeyBuffer` が `null` を返すので `planAddTiles` まで進まない(バッファ保持)。

### 2.6 物理キー(`tenkey-logic.ts`・`use-tenkey-keyboard.ts`)

```ts
export type TenkeyKeyCommand =
  | { kind: 'digit'; digit: string }
  | { kind: 'suit'; suit: TenkeySuit }
  | { kind: 'backspace' }
  | { kind: 'enter' };
export const mapTenkeyKey = (
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing'>,
  mode: SheetMode
): TenkeyKeyCommand | null;
export const shouldHandleKeyTarget = (target: EventTarget | null): boolean;
```

| キー | テンキー方式 | パレット方式 |
| --- | --- | --- |
| `0`〜`9` | digit | null |
| `m` `p` `s` `z`(大小問わず) | suit | null |
| `Backspace` | backspace | backspace |
| `Enter` | enter | enter |
| その他(`Delete`・`a`・`Escape` を含む) | null | null |
| `ctrlKey`・`metaKey`・`altKey`・`isComposing` のいずれかが真 | null | null |

- 物理キーでの全消去は割り当てない(確定事項 10)。`Delete`・`a` は両方式とも null。
- 【設計案・mighty に無い追加】修飾キー(`ctrlKey`・`metaKey`・`altKey`)付きと `isComposing` を除外する。理由: `Cmd+A`・`Ctrl+R` 等のブラウザ操作を奪わないため。Safari の IME 変換中は `isComposing` が偽で `keyCode === 229` になる場合があるので、`keyCode === 229` も除外対象に含めるかを製造時に検討する。`Shift` は除外しない(`M` 等の大文字を受けるため。Shift 付きの数字は `key` が記号になり割り当てに当たらない)。
- コマンドから dispatch: digit → `tenkey-digit`、suit → `tenkey-commit`、backspace → テンキー方式は `tenkey-backspace`・パレット方式は `remove-last-hand-tile`、enter → `close-sheet`。
- フック `useTenkeyKeyboard(): void` を `MainScreen` で呼ぶ。`inputFocus?.type === 'hand'` の間だけ `window` に `keydown` を登録する。
- `shouldHandleKeyTarget`: `target` が `null`・`document.body`・`document.documentElement` なら真。`Element` で `closest('.bottom-sheet')` があれば真。それ以外(シートの外のボタン等)は偽。テストは `closest` を持つ擬似オブジェクトで行えるよう、`document` への参照は引数の比較だけにする(vitest の環境に DOM がある前提を置かない)。shadow DOM 内のイベントは `target` がホスト要素に付け替えられるので、md の部品でも `closest` で判定できる見込み(実挙動未確認。条件 20)。
- 判定が真でコマンドが null でなければ `preventDefault()` して dispatch する。シート内のボタン(直前に押したテンキーのキー等)にフォーカスがあっても Enter はシートを閉じる(mighty と同じ。button の Enter による click は keydown の `preventDefault` で抑えられる前提。実挙動未確認。条件 20)。Space・矢印は割り当てないので、トグル(radio)の操作と衝突しない。
- `Escape` は割り当てない。`BottomSheet` の Esc 処理(`defaultPrevented` でなければ閉じる)が `close-sheet` を送り、バッファも捨てられる。
- `event.repeat` は判定しない(確定事項 10)。

### 2.7 `BottomSheet` の改修

```ts
export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  'aria-label': string;
  header?: ReactNode | undefined; // 追加。ヘッダー行の左側。中身は呼び出し側が決める
  children: ReactNode;
  className?: string | undefined;
}
```

- `.bottom-sheet__header` の中身を `<div class="bottom-sheet__header-slot">{open ? header : null}</div>` と閉じるボタンの 2 つにする。DOM 順はスロット → 閉じるボタン(Tab 順も同じ)。
- 閉じるボタンは既存の `IconButton`(`ref={closeButtonRef}`・`label="閉じる"`・`onClick={onClose}`・`className="bottom-sheet__close-button"`)のまま、子をハンドル棒から `SymbolIcon`(`close`)に替える。`.bottom-sheet__handle-bar` のスタイルは削除する。
- CSS: `.bottom-sheet__header { display: flex; align-items: center; gap: 0.5rem; min-height: 3rem; padding-inline: 1rem 0.5rem; }`(`justify-content: center` を外す)。スロットは `flex: 1 1 auto; min-width: 0`。`header` が無いときもスロットは空で残り、✕ は右端に来る(D4 の別対象のシート用)。
- 変えないもの: `useLayoutEffect` の初期フォーカス(開いたら `closeButtonRef` へ)・フォーカス復帰(開く前の要素へ)、Esc の `keydown`、`--sheet-height` の ResizeObserver、`aria-hidden`/`inert`、`max-height: 50dvh`、履歴操作をしないこと、`.bottom-sheet__content` の padding。
- 呼び出し(`MainScreen`): `header={inputFocus?.type === 'hand' ? <SheetModeToggle /> : undefined}`。`SheetModeToggle` は `MainScreen.tsx` 内の小関数でよい。
- `sheet-hand` の中身: `sheetMode === 'tenkey' ? <Tenkey /> : <TilePalette />`。

### 2.8 方式トグルとアイコン

`ConnectedOption` の拡張(既存の利用箇所は `label` だけなので互換):

```ts
export interface ConnectedOption<T extends string = string> {
  value: T;
  label: string;                // icon があるときは aria-label に使う
  icon?: ReactNode | undefined; // 追加
  disabled?: boolean | undefined;
}
```

- `ConnectedButtonGroup` は `icon` があれば `<span>{opt.label}</span>` の代わりに `<span aria-hidden="true" class="connected-button__icon">{icon}</span>` を描き、button に `aria-label={opt.label}` を付ける。`icon` が無ければ従来どおり(`aria-label` も付けない)。
- トグル: `<ConnectedButtonGroup label="入力方式" className="sheet-mode-toggle" value={sheetMode} options={[{ value: 'palette', label: 'パレット', icon: <SymbolIcon d={SYMBOL_KEYBOARD_KEYS} /> }, { value: 'tenkey', label: 'テンキー', icon: <SymbolIcon d={SYMBOL_DIALPAD} size="1.25rem" /> }]} onValueChange={mode => dispatch({ type: 'set-sheet-mode', mode })} />`
- 選択状態: 視覚は既存の選択中スタイル(`primary` 背景・全丸への形状モーフ)。支援技術には既存の `role="radiogroup"`(`aria-label="入力方式"`)・`role="radio"`・`aria-checked`。フォーカスは既存の `FocusRing` とロービングタブインデックス(選択中のボタンが Tab 停止点、矢印で移動して即切替)。
- 高さとタップ領域(v5): 見た目は Connected button group の既定 2.5rem(40dp、M3E の S サイズ)に戻す。`main-screen.css` の `.sheet-mode-toggle .connected-button { height: 3rem; --expressive-morph-height: 3rem; }` を削除する(既定値 `height: 2.5rem`・`--expressive-morph-height: 2.5rem` が効く。形状モーフも既定値どおり)。当たり判定はステッパー(`stepper.css` の `.stepper__button::after`。透明な `::after` を絶対配置で外へ広げる)と同じ作りで、`main-screen.css` に `.sheet-mode-toggle .connected-button::after { content: ""; position: absolute; inset-inline: 0; top: calc(min(0px, (100% - 3rem) / 2)); bottom: calc(min(0px, (100% - 3rem) / 2)); }` を足す(40dp なら上下 −4px。`.connected-button` は既に `position: relative`。`::before`/`::after` は既存の connected-button では未使用、Ripple・FocusRing は子要素なので衝突しない)。左右は広げない(ボタン間 2dp で隣と重なるため)。拡張した上下 4dp はヘッダー行の箱(下記)の中に収まり、シート上端の外やテンキー 1 行目には食い込まない。
- ヘッダー行(v5): `.bottom-sheet__header` は `min-height: 3rem` のまま変えない。中身(トグル 40・✕ の container 40)は `align-items: center` で上下 4dp の余白ができ、見た目はヘッダー帯の中に 40dp の部品が並ぶ。行の箱を 40 に縮めない理由: 縮めると 48dp の当たり判定がシート上端の外(背面のページ)か、テンキー 1 行目の当たり領域に 4〜8dp 食い込み、要件§4 の隣接ターゲット間隔 8dp・当たり領域の重なりの両方に反する。この判断は 8 章の要ヒアリングで確認する。
- ✕(v5): 変更なし。`IconButton`(`md-icon-button`)は container 40dp が既定で、`.bottom-sheet__close-button { min-width: 3rem; min-height: 3rem; }` によりホストが 48 × 48(当たり判定)、見た目の丸は中央の 40dp。ヘッダー行 48 の箱に収まり、トグルとの間は header の `gap: 0.5rem`(8dp)で隣接ターゲット間隔を満たす。
- 幅はヘッダー行の残り(375 幅で 375 − 16 − 8 − 8 − 48 = 約 295。ボタン 1 つ約 146)。ボタン間 2dp は要件§4 の Connected button group の例外内。

共通アイコン部品(`src/ui/icons/`):

```ts
// SymbolIcon.tsx
export interface SymbolIconProps { d: string; size?: string | undefined } // size 既定 '1.5rem'
export function SymbolIcon(props: SymbolIconProps): React.JSX.Element;
  // <svg viewBox="0 -960 960 960" width={size} height={size} aria-hidden="true"><path d={d} fill="currentColor" /></svg>
// symbol-paths.ts
export const SYMBOL_KEYBOARD_KEYS: string;
export const SYMBOL_DIALPAD: string;
export const SYMBOL_CLOSE: string;
export const SYMBOL_BACKSPACE: string;
export const SYMBOL_KEYBOARD_RETURN: string;
```

| 用途 | アイコン名(Material Symbols outlined) | 選んだ理由 |
| --- | --- | --- |
| パレット | `keyboard_keys` | 牌キーを並べたキーボードの比喩【確定】 |
| テンキー | `dialpad` | 数字キーの比喩【確定】 |
| 閉じる | `close` | 確定事項 4 |
| ⌫ | `backspace` | テンキーの ⌫ |
| Enter | `keyboard_return` | テンキーの Enter |

- 出典: `https://github.com/google/material-design-icons` の `symbols/web/<名>/materialsymbolsoutlined/<名>_24px.svg`(Apache License 2.0)。viewBox は `0 -960 960 960`、`fill="currentColor"`、表示サイズ 1.5rem(`dialpad` のみ 1.25rem。下記)、`aria-hidden="true"`。
- アイコンの大きさ(v5): `dialpad` だけ 20dp。`MainScreen.tsx` の `SheetModeToggle` で `<SymbolIcon d={SYMBOL_DIALPAD} size="1.25rem" />` とする。`keyboard_keys`(トグル)・`close`(`BottomSheet`)・`backspace`・`keyboard_return`(`Tenkey`)は既定 1.5rem のまま。方法の根拠: `ConnectedOption.icon` は ReactNode で、呼び出し側が組み立てた要素をそのまま描くので props で渡すのが最小。`.connected-button__icon` の CSS で指定する案は、SVG の `width`/`height` 属性を上書きする子孫セレクタと位置指定(`:nth-child` 等)が要り、選択肢の並びに依存するので採らない。
- path は製造担当が上記の SVG からそのまま写す(本書に path を書くと写し間違いの元になるため書かない)。自作・改変しない。
- `keyboard_keys` は 80 × 80(viewBox 単位)の正方形が 2 段 × 5 列+バー 1 本の塗りで、24dp 表示では 1 個あたり約 2dp 角になる(潰れの懸念。5 章)。
- `SymbolIcon.tsx` の先頭コメントに出典(リポジトリ URL・パスの形)と Apache License 2.0 を書く。`docs/license-policy.md` の「1. ライセンスの実態」の表に、行「google/material-design-icons(Material Symbols)| Apache-2.0 | 上流の `LICENSE` | `src/ui/icons/` でインライン SVG として使用可(出典をコード先頭コメントに記載)」を追加する(行の文言は製造担当が表の列に合わせる)。
- 既存 8 か所(2.1)の従来 Material Icons(viewBox 24)は本 Issue では触らない(案 C。7 章に申し送り)。テンキーの ⌫・Enter は Symbols 版を使うので、`TilePalette` の ⌫・Enter と path が異なるのは許容する。

### 2.9 手牌カードのバッファ(`HandCard.tsx`)

- 牌列(`.hand-card__tiles`)の末尾、和了牌の後ろに、`tenkeyBuffer` が空でないとき `<span class="hand-card__buffer" aria-hidden="true">{tenkeyBuffer}‸</span>` を出す(mighty の `{buffer}‸`。空のときは要素自体を出さない。確定事項 7)。
  - 見た目: `title-medium` 相当、`color: var(--md-sys-color-primary)`、`flex-shrink: 0`、`margin-inline-start: 0.25rem`(mighty 4px)。
  - 幅への影響: 牌幅の N は変えない。バッファ桁数は `max − k`(k = 手牌枚数)以下なので、最悪は k = 0(14 桁、約 140px)と k = 13(1 桁)。k = 13 の 375 幅: 牌 13 × 20 + 隙間 12 + 隙間 1 + 余白 4 + 数字とキャレット約 16 ≈ 293px < 内側幅 301px(D2 の算出。実挙動未確認、条件 16)。`overflow-x: auto` の保険は既存。
- バッファは牌列の中に入るので、`.hand-card__body` の構造(横並びの flex)は変えない。H3 のスクロール(`useEffect` の依存 `[isHandFocused]` と `--sheet-height` の監視)も変えない。
- バッファは手牌カード本体(`role="button"`・`aria-label="手牌を入力"`)の中にあり、読み上げ対象外にする。

### 2.10 画面寸法(375 幅。CSS からの算出で実挙動未確認。条件 9・10 で実測)

- シート内幅 = 375 − 16 × 2 = **343**(`.bottom-sheet__content` の左右 padding)。360 幅は 328。
- キー幅 = (内幅 − 3 × 4) / 4 → 375: (343 − 12) / 4 = **82.75**、360: (328 − 12) / 4 = 79.0。いずれも 48dp 以上。
- グリッド高 = 5 × 48 + 4 × 4 = **256**。パレットの素の高さ = 4 × 48 + 3 × 4 = 204(`tile-palette.css` の既定。v6 の上書き後はシート内で 256)。
- `.sheet-slot[data-slot="sheet-hand"]` に `min-height: 16rem`(256)を付ける(確定事項 6)。
- (v6)パレットの縦配置: `main-screen.css` に `.sheet-slot[data-slot="sheet-hand"] .tile-palette { padding-block: 0.8rem; row-gap: 0.8rem; }` を足す。0.8rem = 12.8dp で、12.8 × 2 + 48 × 4 + 12.8 × 3 = **256** となり内容領域ちょうどに収まる(ヘッダー下端〜先頭キー 12.8、行間 12.8、最終行〜内容下端 12.8)。`tile-palette.css`(D2)は変更しない(詳細度 0-3-0 が既定の 0-1-0 に勝つ)。メディアクエリ・px 直書きは使わない。キー 48dp は不変で、行間 4 → 12.8 により隣接ターゲット間隔は要件§4 の 8dp を満たすようになる(改善。列間 2px は D2 のまま変えない)。
- (v6)不採用案: A 上下中央寄せ(上下 padding 26・行間 4。トグルとキーの近さは解消するが行が詰まったまま)、B 行間のみ 21.3 に拡大(上端 0 のままでトグルとの近さが残る)、D シートをパレット実高さ 269 に詰める(方式の切替でシート高が 52 変わり、等高の前提が崩れる)。
- シート高 = 上枠 1(thin) + ヘッダー 48 + 内容 256 + 下 padding 16 + safe-area = **321 + safe-area**。どちらの方式でも同じ。v5 でもヘッダー行の箱は 48(トグル 40 + 上下余白 4、✕ のホスト 48)なので不変。v4 実装の実測(headless Chrome): 375×812・375×667・360 幅とも 321、ヘッダー行 y=492・高さ 48。
- `min-height: 16rem` は v5 でも据え置く。テンキーのグリッド高 256 は変わらず、`sheet-hand` の最小高はテンキーを基準に両方式を等高にする前提が保たれる(v6 でパレットは 256 に分散して等高。トグルの縮小はヘッダー内の変更で内容高に影響しない)。
  - 50dvh: 812 高で 406、667 高で 333.5 → 収まる(667 高の余裕 12.5)。safe-area 34 を足すと 355 で、812 高の実機で収まる。667 高の機種(ホームボタン機)は safe-area 0 の想定(実機未確認)。
  - D2 の見込み 268 との差は +53(内容の最小高の差 52 + 枠 1。D2 の見込みは枠を数えていない)。
- 隣接ターゲット間隔: テンキーのキー間 4dp は要件§4 の 8dp を下回るため、2.11 の例外を追記する。

### 2.11 要件§4 への追記【確定(オーナー承認済み)】

> テンキー(底部シートの 4 列 × 5 行のキー)は隣接ターゲット間隔 8dp の例外とし、キーの間隔を 4dp とする。キーの大きさは高さ 48dp・幅は 4 等分(375px 幅で約 82dp)とする(Issue #47)。

- 反映先: `docs/requirements.md` §4 の【確定】の段落(「タップ領域は原則 48dp 以上とする」で始まる段落)の、「…合格基準には含めない(Issue #46)。」の直後、「牌・数値の入力(パレット・テンキー・状況役)は…」の文の前に上の文を挿入する。併せて、同ファイル先頭の更新日の説明にも Issue #47 の追記を足す。
- 反映時期: 製造の段階 5(テンキー本体のコミット)に含める。

## 3. テスト(自動)

テスト名は `D3-<記号と番号>: <説明>`(05 号)。

| 記号 | ファイル | 内容 |
| --- | --- | --- |
| D3-R1〜R7 | `hand-rules.test.ts` | `resolveTenkeyBuffer`: (R1)`'123','m'` → 1m 2m 3m、(R2)`'406','p'` → 4p・赤5p(`red:true`)・6p、(R3)`'5','s'` → `red:false`、(R4)`'1234','z'` → 東南西北、(R5)`'567','z'` → 白發中、(R6)`'18','z'`・`'10','z'`・`'9','z'` → `null`、(R7)`'','m'` → `null` |
| D3-B1〜B4 | 同 | `canAppendTenkeyDigit`: (B1)手牌 0・バッファ空で `'1'` が真、(B2)手牌 11+バッファ 3 桁で偽、手牌 14 で偽、(B3)ポン 1 つ+手牌 5+バッファ 5 桁で真・6 桁で偽、(B4)バッファ `'1111'` で `'1'` が偽・`'2'` が真、`'x'` が偽 |
| D3-P1〜P8 | 同 | `planAddTiles`: (P1)全部可で同じ列、(P2)`2m` を含むと `null`、(P3)同じ牌の 5 枚目を含むと `null`、(P4)`red=1` で赤五筒の 2 枚目を含むと `null`、(P5)`red=0` の赤で `null`、(P6)`red=1`・通常五筒 3 枚使用で通常五筒を含むと `null`、(P7)手牌 13 枚に 2 枚で `null`、(P8)整合: 複数の手牌と牌列の組で、非 `null` ⇔ 逐次の `canAddHandTile` がすべて真 |
| D3-K1〜K6 | `tenkey-logic.test.ts` | `mapTenkeyKey`: (K1)テンキーで `'7'`→digit、`'M'`→suit m、(K2)パレットで `'7'`・`'m'` → null、(K3)両方式で `Backspace`→backspace・`Enter`→enter、(K4)両方式で `Delete`・`'a'`・`'A'` → null、(K5)`metaKey` 付き `Backspace`・`ctrlKey` 付き `'1'`・`isComposing` の `'1'` → null、(K6)`Escape` → null |
| D3-F1〜F2 | 同 | `shouldHandleKeyTarget`: (F1)`null` で真、(F2)`closest` を持つ擬似要素で `.bottom-sheet` の有無により真偽 |
| D3-S1〜S13 | `app-state.test.ts` | (S1)初期値 palette・''、(S2)`set-sheet-mode` 同値で同一 state、別値で更新しバッファを捨てる、(S3)`tenkey-digit` がパレット方式・シート閉・不正文字・手牌+バッファ上限・同じ数字 5 つ目で同一 state、(S4)テンキー方式で末尾に追加、(S5)`tenkey-backspace` がバッファ優先で手牌は不変、空なら手牌末尾、(S6)`tenkey-commit` 空バッファで同一 state、(S7)`'406'`+`p`(red=1)で 4p・赤5p・6p が入りバッファ空、(S8)使えない牌を含む確定(`'2'`+`m`、在庫超過)で同一 state(バッファ保持・手牌不変)、(S9)`'18'`+`z` で同一 state、(S10)`add-hand-tiles` が全部可で追加、1 枚でも不可なら同一 state、(S11)手牌が変わる操作(`add-hand-tile`・`remove-last-hand-tile`・`remove-hand-tile`・`clear-hand`・`clear-all`)と `close-sheet` でバッファが空、`sheetMode` は保持、(S12)`close-sheet` 後に `open-sheet` しても `sheetMode` が保持、(S13)D2 の既存テストが無変更で通る |

## 4. 製造の段階化(コミット単位)

1. `TenkeySuit` 型と `AppState.tenkeyBuffer`(`createInitialState` の初期値 `''`。`app-state.ts` の最小の追加で、アクション・挙動は段階 3)を足したうえで、`resolveTenkeyBuffer`・`canAppendTenkeyDigit`・`planAddTiles` とテスト(2.3・2.5。`hand-rules.ts`。D3-R・B・P)。これらが依存する型・フィールドを段階 1 に含めることで、段階 1 のコミットだけで `typecheck`・`test` が通る
2. `tenkey-logic.ts` とテスト(2.6 の純関数、`TENKEY_HONOR_HINTS`。D3-K・F)
3. `app-state.ts` の残りの状態(`sheetMode`)・アクション・テスト(2.2。D3-S。`TenkeySuit`・`tenkeyBuffer` は段階 1 で追加済み)
4. `src/ui/icons/`(`SymbolIcon`・path 定数)、`docs/license-policy.md` の追記、`ConnectedOption.icon`、`BottomSheet` の `header` スロットとトグルの差し込み(2.7・2.8。この時点ではテンキー方式の中身は空でよい)
5. `Tenkey.tsx`・`tenkey.css`、`sheet-hand` の最小高さ、方式による中身の切替、`docs/requirements.md` §4 の追記(2.4・2.10・2.11)
6. 物理キーのフック(2.6)
7. `HandCard` のバッファ表示(2.9)
8. (v5)UI 監修の修正。変更ファイルは `src/ui/screen/main-screen.css`(`.sheet-mode-toggle .connected-button` の `height`/`--expressive-morph-height` 3rem を削除し、`::after` の当たり判定拡張を追加)と `src/ui/screen/MainScreen.tsx`(`dialpad` に `size="1.25rem"`)の 2 つだけ。`bottom-sheet.css`・`BottomSheet.tsx`・`SymbolIcon.tsx`・`connected-button-group.css`・`tenkey.css` は変えない。純関数・状態の変更が無く自動テストの対象外なので、テストの追加・赤確認は不要(条件 6・23 のブラウザ実測で確かめる)。1 コミットでよい

9. (v6)パレットの縦配置。変更ファイルは `src/ui/screen/main-screen.css` のみ(2.10 の規則を 1 つ足す)。`TilePalette.tsx` はクラス名 `tile-palette` を持つ既存の要素をそのまま使え、`MainScreen.tsx`・`tile-palette.css`・`bottom-sheet.css` の変更は不要。純関数・状態の変更が無いのでテストの追加・赤確認は不要(条件 10・24 のブラウザ実測で確かめる)。1 コミットでよい

各コミット前に `npm run lint`・`typecheck`・`format:check`・`test`。

### 4.1 製造担当(AGY 含む)への境界

- 本書に無い UI 要素(ヘルプ、枚数表示、拒否の文言・トースト・フィードバック行、バッファのシート内表示等)を足さない。確定できないときは何も表示しない。
- `TilePalette.tsx`・`tile-palette.css`・`src/core/**`・既存 8 か所のアイコンを変更しない。`add-hand-tile` の可否判定を変えない。
- `BottomSheet` のフォーカス・Esc・`--sheet-height` の処理を書き換えない(2.7 の「変えないもの」)。
- アイコンの path は 2.8 の出典から写し、自作・改変しない。
- 物理キーに全消去(`Delete`・`a`・修飾キー+Backspace)を割り当てない。
- 色は `--md-sys-*` トークンのみ。dev サーバーはポート指定で起動し、自分で起動したものだけを止める。

## 5. 実挙動未確認の一覧

- 2.10 の寸法(キー幅 82.75、シート高 321、内容の最小高で両方式が等高になること。v6: パレットの padding・行間 12.8 で 256 ちょうどになり、はみ出し・スクロールが出ないこと)。
- (v5)トグルの `::after` で上下に広げた当たり判定が、`elementFromPoint` でボタンの外 4dp(ヘッダー行の上端・下端付近)を拾うか。拾わない場合は製造担当が独断で直さず報告する。
- `keyboard_keys` の 24dp 表示での視認性(小さな四角 1 個が約 2dp 角で、潰れて見分けにくい恐れ)。
- shadow DOM 内の要素にフォーカスがあるときの `keydown` の `target`(`closest('.bottom-sheet')` で判定できるか)。
- シート内のボタンにフォーカスがある状態で物理 Enter を押したとき、`preventDefault` でボタンの click が抑えられ、シートだけが閉じるか。
- 手牌 13 枚+バッファ 1 桁で 1 行に収まるか(2.9)。
- 手牌カードに Enter で開いたとき、その同じキーイベントが、`inputFocus` の変化の直後に登録される `window` のリスナーに届いてシートがすぐ閉じないか。
- Enter の長押し(`event.repeat`)で開閉が繰り返されないか。確定事項 10 により `repeat` は判定しないので、問題があれば要ヒアリングに戻す。
- iOS Safari で button がタップでフォーカスを持たないとき、外付けキーボードの入力が `body` 扱いで受けられるか(実機項目)。

## 6. 受け入れ条件

検収幅は 375×812(DevTools のデバイス表示)。360×800・375×667 は寸法を測って報告する(375×667 の 50dvh は合否に含める。360 は含めない)。

自動:

1. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて成功する。3 章の D3-R・B・P・K・F・S の各テストが存在し通る(`npx vitest run -t "D3-"` の件数を報告)。
2. `git diff main --name-only` に `src/ui/input/TilePalette.tsx`・`src/ui/input/tile-palette.css`・`src/core/`・`src/ui/expressive/Stepper.tsx`・`src/ui/screen/AppHeader.tsx`・`src/ui/screen/SettingsScreen.tsx` が含まれない。`HandCard.tsx` の差分に既存のゴミ箱アイコンの変更が無い。
3. `rg -n '#[0-9a-fA-F]{3,6}\b' src/ui/input src/ui/icons src/ui/expressive/bottom-sheet.css src/ui/expressive/connected-button-group.css src/ui/screen/main-screen.css` が空。変更ファイルにホームディレクトリ名・絶対パスが無いことを目視で確認する。
4. `rg -n "localStorage" src/ui` のヒットが既存箇所だけで、`sheetMode` を保存していない。`rg -n "tenkeyFeedback|rejected" src/ui` が空。
5. `src/ui/icons/SymbolIcon.tsx` の先頭コメントと `docs/license-policy.md` に Material Symbols の出典と Apache License 2.0 がある。`rg -n 'viewBox="0 -960 960 960"' src/ui/icons` がヒットする。`docs/requirements.md` §4 に 2.11 の文言がある。

ブラウザ(DevTools):

6. 手牌カードを押すとシートが開き、ヘッダー行に「入力方式」の radiogroup(radio 2 つ、アイコンのみで文字なし)と「閉じる」ボタンがある。ハンドルの棒が無い。開いた直後のフォーカスが「閉じる」ボタン(`document.activeElement` を shadow root まで辿って確認)。初回は「パレット」が `aria-checked="true"`。(v5)radio の各 `getBoundingClientRect().height` が 40(±0.5)、ヘッダー行(`.bottom-sheet__header`)の高さが 48(±0.5)、radio の上端・下端がそれぞれヘッダー行の上端 +4・下端 −4(±0.5)。各 radio の当たり判定: radio の中心 x で、radio の上端 −3 と下端 +3 の点の `document.elementFromPoint` がその radio(またはその子孫)。「閉じる」のホスト(`md-icon-button`)の矩形が 48 × 48 以上でヘッダー行の内側に収まる。各 radio の `aria-label` が「パレット」「テンキー」。
7. 「テンキー」を押すと中身がテンキーに替わり、手牌は変わらない。ヘッダー行の `top` が切替の前後で同じ(±0.5)。`--sheet-height` が両方式で同じ値。
8. テンキーの配置が 2.4 の表のとおり(各キーの `aria-label` と `getBoundingClientRect()` の行・列で確認)。Enter が 4〜5 行目にまたがる。1〜7 に 東南西北白發中、0 に「赤5」、m・p・s・z に 萬子・筒子・索子・字牌 の補助表示がある。
9. 375 幅でキー幅 82.25〜83.25、高さ 48(±0.5)、隣接キーの左端差 − 幅 = 4(±0.5)、上下の間隔 4(±0.5)。360 幅のキー幅を報告する。
10. `--sheet-height` が 375×812 で 406 以下、375×667 で 333 以下。値を報告する(見込み 321。v5 でも不変、v4 実測 321)。パレット方式でも同じ値。(v6)パレットの先頭キーはヘッダー下端から 12.8 下(375×812 の見込みで先頭キー top ≈ 552.8。v5 までの 540 から変更)。
11. テンキーで `1` `2` `3` を押すと手牌カードの牌列末尾に `123‸` が出る。`m` を押すと 1m 2m 3m が入り、バッファ表示が消える。バッファが空のときバッファ要素が DOM に無い。
12. `4` `0` `6` `p` で 4p・赤5p・6p が入る(赤の牌画像)。
13. 確定できない場合、手牌が変わらずバッファ表示がそのまま残り、文言等は何も出ない: (a)`2` `m`(三麻で使わない牌)、(b)1s を 4 枚入れた後に `1` `s`(在庫不足)、(c)`1` `8` `z`(z に 8)・`1` `0` `z`、(d)手牌 13 枚で `1` `2` は入らないこと(手牌+バッファの上限で 2 つ目の数字キーが `disabled`)。いずれも続けて ⌫ でバッファを直して確定し直せる。
14. `1` を 4 回押すと `1` キーだけが `disabled` になり、他の数字キーは有効。手牌 11 枚では数字を 3 つまで入れられ、3 つ目の後は数字キーがすべて `disabled`。手牌 14 枚では数字キーがすべて `disabled`。
15. バッファが消える契機: バッファ入力中に (a)「パレット」へ切替、(b)Esc、(c)「閉じる」、(d)Enter、(e)AC、のそれぞれでバッファ表示が消える(再度開いても無い)。手牌は (a)〜(c) で残る。
16. 手牌 13 枚+バッファ 1 桁、手牌 12 枚+バッファ 2 桁、手牌 0 枚+バッファ 14 桁のそれぞれで `.hand-card__tiles` の `scrollWidth === clientWidth`(1 行に収まる)。
17. ⌫: バッファがあれば 1 文字消え手牌は変わらない、空なら手牌の末尾 1 枚が消える。AC: バッファと手牌が空になる(確認なし)。Enter: シートが閉じ、手牌が整列する。
18. テンキー方式で閉じて再度開くとテンキー方式のまま。ページを再読み込みするとパレット方式に戻る。
19. 物理キー(シートを開いた状態、フォーカスは閉じるボタン): テンキー方式で `1` `2` `3` `M` → 1m 2m 3m。`Backspace`・`Enter` が 2.6 の表のとおり働く。両方式で `Delete`・`a` を押しても手牌・バッファは変わらない。パレット方式で `1`・`m` は何も起きず、`Backspace` で末尾 1 枚削除、`Enter` で閉じる。`Cmd+Backspace`/`Ctrl+Backspace` で手牌が変わらない。
20. テンキーの `5` をクリックした後(フォーカスがそのキー)に物理 `Enter` を押すとシートが閉じ、`5` は追加されない。シートを開いたまま背面のステッパーのボタンにフォーカスを移して `1` を押してもバッファが増えない。トグルにフォーカスして矢印キーで方式が切り替わる。
21. D1 条件 20 の回帰(v5 の修正後に再実施): スクリムが無く背面のステッパーが押せる(シート上端の 1〜4px 上の点の `elementFromPoint` がシート内の要素でない、すなわち当たり判定がシートの外へはみ出していない)。開いている間ページ末尾の下余白がシート高と等しい。Esc で閉じ、フォーカスが手牌カードに戻る(テンキー方式でも)。「閉じる」で閉じる。シートを開いた後の `history.length` が開く前と同じ。
22. バンドル予算(目標値。不合格にしない): D2 条件 18 と同じ測り方で合計を測り、102,000 B を超えたら超過量を最終報告と PR 本文に書く。
23. (v5)アイコンの大きさ: 「テンキー」radio 内の svg の `getBoundingClientRect()` が 20 × 20(±0.5)、「パレット」radio・「閉じる」・テンキーの ⌫・Enter の svg が 24 × 24(±0.5)。`git diff 9fc9818 --name-only` が `src/ui/screen/main-screen.css`・`src/ui/screen/MainScreen.tsx`・本書だけ。
24. (v6)パレットの縦配置(パレット方式、375×812・375×667・360×800 の各々): 先頭行キーの top = ヘッダー行の下端 + 12.8(±0.5)。最終行(⌫/AC/Enter)の下端とシート(`.bottom-sheet`)下端の間 = 12.8 + 下 padding 16 + safe-area(±0.5)。各行の間隔(上の行の下端〜下の行の top)が 12.8(±0.5)。`--sheet-height` は 321。テンキー方式に切り替えたときのシート高・キー位置は v5 と同じ(不変)。`git diff f273fab --name-only` が `src/ui/screen/main-screen.css`・本書だけ。

実機確認(C-02 の逆発注): テンキーの押しやすさ(360 幅を含む)、方式トグルとアイコン(`keyboard_keys` の潰れ)の分かりやすさ、確定できないときに何も出ないことの分かりやすさ、外付けキーボードでの入力、667 高の機種でのシート高。

## 7. 後続 Issue への引き継ぎ

- **D4**: `BottomSheet` の `header` は対象ごとに `MainScreen` が決める(D3 は手牌のときだけトグル)。ドラ・副露でテンキーを使うかは D4 で決める。使う場合、`canAppendTenkeyDigit` の上限・`planAddTiles` の上限を対象別に拡張する。`open-sheet` で手牌から別対象へ移るときバッファを捨てる処理は D3 で入れてある。
- **D1 条件 21**: H3 の `scroll-margin-top` の再確認は D2 から継続。
- **別 Issue 候補: 既存 8 か所の Symbols 化**: `TilePalette` 2、`Stepper` 2、`AppHeader` 1、`HandCard` 1、`SettingsScreen` 1、`MdGallery` 1 の従来 Material Icons を `src/ui/icons/` の `SymbolIcon` へ差し替える。アイコンの Web フォント化は保留(インライン SVG を継続)。出典・Apache-2.0 の表記も、既存 8 か所について別 Issue で整える(現状は出典コメントが無い)。

## 8. 要ヒアリング事項(本書の【未確定】)

- (v5)ヘッダー行の箱の高さ: 本書は「部品の見た目 40dp・行の箱 48dp(上下 4dp の余白に当たり判定を収める)」とした(シート高 321 不変)。監修指示の「ヘッダー行 48→40」を行の箱まで 40 にする意味なら、シートは 8dp 低く(313)なる代わりに、当たり判定 48dp がシート上端の外かテンキー 1 行目に食い込む。どちらにするか確認する。本書の推奨は前者。

### ヒアリング履歴

- 旧 7(パレット方式の物理 `Delete`): 解決。両方式とも `Delete`・`a` を廃止し、物理キーでの全消去は無し(確定事項 10)。
- 旧 1(拒否文言 ④⑤⑥): livewing 準拠で不要化。
- 旧 2(要件§4 の追記): 回答済み。追記する(2.11)。
- 旧 3(アイコンの出典・ライセンス表記): 回答済み。共通部品の先頭コメント+`docs/license-policy.md`(2.8)。
- 旧 4(フィードバック行の確保): livewing 準拠で不要化。
- 旧 5(`tenkeyFeedback` の追加): livewing 準拠で不要化。
- 旧 6(文言⑥の表現): livewing 準拠で不要化。
