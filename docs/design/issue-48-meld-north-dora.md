# Issue #48 D4. 副露・抜き北・ドラ表示牌の入力 設計書

Epic D(#5)の Sub-Issue。依存: D1(#51)・D2(#46)・D3(#47)・D1-1(#55)。

## 1. 参照資料と判断の根拠

### 1.1 参照資料

- Issue #48 本文(範囲・未決事項)
- [docs/requirements.md](../requirements.md) §2(入力項目。27〜29 行目の副露・抜き北・ドラ)・§4(タップ領域)
- [docs/issues-draft.md](../issues-draft.md) D4 の項
- 既存設計書: [issue-51](issue-51-screen-skeleton.md)(置き場 `data-slot`・`SheetTarget`・条件 9/20/21)、[issue-46](issue-46-palette-input.md)(パレット)、[issue-47](issue-47-tenkey-input.md)(テンキー・切替)、[issue-55](issue-55-hand-card-redesign.md)(手牌カードのゴミ箱)、[issue-12](issue-12-sanma-north.md)(抜きドラ・北の扱い)
- コード: `src/core/input.ts`(`Meld`・`instantiateMeld`)、`src/ui/state/app-state.ts`・`hand-rules.ts`(`usedTiles`・`maxHandLength`・`canAppendTenkeyDigit`・`planAddTiles`)、`src/ui/calc/compute.ts`(表裏ドラの結合)、`src/ui/screen/MainScreen.tsx`・`HandCard.tsx`、`src/ui/input/TilePalette.tsx`・`Tenkey.tsx`・`use-tenkey-keyboard.ts`、`src/ui/expressive/ConnectedButtonGroup.tsx`、`src/ui/tile/Tile.tsx`(`TileOrBack` で裏向きを描ける)
- 業務標準: 01(dev サーバー禁止事項)・02・06・07

### 1.2 確定事項(ユーザー確定。再検討しない)

| # | 内容 |
| --- | --- |
| 1 | 加槓と明槓は区別しない。副露の種類は「ポン・明槓・暗槓」の3つ。状態は core の `Meld`(`pon` / `kan closed:true\|false`)のまま |
| 2 | 副露の入力: 追加ボタン(点線枠「＋」)→空の副露カードが増え、シートが `{type:'meld', i}` で開く。シートは D2・D3 のキーボード(パレット/テンキー切替)の上に種類バー「ポン／明槓／暗槓」を常時置く(押したままの表示、既定はポン)。牌を1つ入力すると副露が確定する。副露カードにゴミ箱。副露の最大数は 4。使用枚数は `usedTiles`・`instantiateMeld` で判定し、使い切れない牌は disabled |
| 3 | ドラ・裏ドラ: 横並び2枚のカード(`data-slot="dora-uradora"`)。タップで `{type:'dora'\|'uradora'}` のシート。中身は手牌と同じパレット/テンキー切替。各最大5枚、各カードにゴミ箱。裏ドラのカードは常時表示。萬子は 1m・9m のみ(めくりは計算側)。計算コアへは `computeResult` が結合済み |
| 4 | 副露追加で手牌が `14−3×副露数` を超える場合、手牌の末尾から切り捨てて上限に合わせる(確認なし) |
| 5 | 抜き北は D1 実装済み。D4 では新規実装しない。`Rule.north==='yakuhai'` で無効+0 を受け入れ条件で再確認する |
| 6 | D1 条件 21(要約カード固定)は保留のまま。本 Issue で変えない |
| 7 | 含まない: core の `Chii` 型等の削除、状況役・風・積み棒・供託(D5)、設定(D6)、結果表示 |
| 8 | 「スマート入力モード(仮称)」は Issue #58(D4-1)として起票済み。本 Issue では所見のみ(5 章) |
| 9 | UI 監修・検収用 dev サーバーはポート 5201 を `--host` 付きで起動する。他のポートのサーバーは止めない |
| 10 | (設計後の回答 Q1=B案)手牌カードのゴミ箱の例外(40×24dp・左と下に 8dp の無反応帯)を、ドラ・裏ドラ・副露の各カードのゴミ箱にも広げる。要件 §4 を改訂する(1.3)。他の入力欄には広げない |
| 11 | (Q2=A案)副露の追加ボタンを押した時点で手牌を切り捨てる。何も入れずに閉じても戻さない(A5) |
| 12 | (Q3)確定済み副露の種類変更は牌を保持(A2)、牌タップで置き換え(A3)、牌確定でシートを閉じない(A4) |
| 13 | (Q4)副露のシートでは「1 枚削除」・「AC」・物理 Backspace を無効にし、副露の削除はカードのゴミ箱だけで行う(2.3) |
| 14 | 【確定事項 19 で置換(アイコン)】(UI 監修)全カード(手牌・ドラ・裏ドラ・副露)のゴミ箱のアイコンを Material Symbols「disabled_by_default」(四角囲みのバツ)に統一する。HandCard はアイコンの差し替えだけで、issue-55 の構造・当たり判定・aria-label・40×24dp・無反応帯・disabled 条件は変えない。空のときは従来どおり disabled 表示(非表示にしない) |
| 15 | (UI 監修)ドラ・裏ドラの表示牌は幅 20dp(目安)に縮小する。副露の牌は現状の大きさのまま |
| 16 | (UI 監修)カードの構造(上段=見出し+ボタン、無反応帯、牌の行)は保ち、余白だけを削って高さを減らす。ゴミ箱 40×24dp・左と下の 8dp 無反応帯・各タップ領域は守る(副露カードの構造は確定事項 18 で変更予定。ただし保留中) |
| 17 | (UI 監修2)ドラ・裏ドラの見出し `.indicator-card__title` をステッパーの見出し `.stepper__label` と同じ書体(typescale **label-medium** の font/size/line-height/weight トークン)にする。ユーザーの指示は「風牌の見出しと同じ大きさ」で、現存する入力欄の見出しはステッパーのものだけなので label-medium と解釈した。風セグメント(D5)の見出しも将来この書体に揃える想定。手牌の見出し(title-small)は変えない |
| 18 | (UI 監修2)副露カードの「牌の行」と「消すボタン」を1行にする(上段のボタンだけの行を無くす)。**算出の結果、槓4枚では1行に収まらないため保留**(2.5・6 章 Q5)。保留中は確定事項 16 の構造(上段にボタン)のまま |
| 19 | (UI 監修2)全カード(手牌・ドラ・裏ドラ・副露)の消すボタンのアイコンを既存 `SYMBOL_CLOSE`(Material Symbols の close、ただの✕)にする。HandCard.tsx はアイコンの差し替えのみ。`SYMBOL_DISABLED_BY_DEFAULT` は未使用になるので削除し、テスト D4-ICON も更新する。確定事項 14 のアイコン部分を置換(「空でも disabled で表示」は維持) |
| 20 | (UI 監修2)底部シートの閉じるボタン(`BottomSheet.tsx`、aria-label「閉じる」)のアイコンを Material Symbols Outlined の `cancel`(丸囲みの✕)にする。定数 `SYMBOL_CANCEL` を追加する |

### 1.3 要件・下書きの改訂(製造で反映)

- `docs/requirements.md` 27 行目(【確定】行)を次に改める。冒頭「更新日」行に Issue #48 の改訂を追記する。
  > 【確定】副露はポン・明槓・暗槓(加槓は明槓と同一扱い。入力上は区別しない。チーはない)
- `docs/issues-draft.md` D4 の項の「副露はポン・明槓・暗槓・加槓(チーは出さない)」を「副露はポン・明槓・暗槓(加槓は明槓と同一扱い。チーは出さない)」に改める。**改める判断の根拠**: 下書きは Issue の索引として参照され、要件と食い違うと後続 Issue(D5 の槍槓等)の設計で誤読を招くため。
- `docs/requirements.md` §4 のゴミ箱の文(Issue #55 で追加した「手牌カードのゴミ箱(手牌クリア)に限り、…この緩和はゴミ箱にだけ適用し、他の入力欄には広げない(Issue #55)。」)を次に置き換える。更新日行の Issue #48 の追記は「Issue #48 で§2 の副露の種類を改訂し、§4 のゴミ箱の例外をドラ・裏ドラ・副露のカードに拡大」とする。
  > 手牌・ドラ・裏ドラ・副露の各カードのゴミ箱(手牌クリア・表示牌クリア・副露の削除)に限り、タップ領域を高さ 24dp(見た目と同じ。縦は拡張しない)・幅 40dp(最低 32dp)とする。この大きさは WCAG 2.2 の AA(24px)を満たし、AAA(44px)は満たさない。誤操作を防ぐため、ゴミ箱の左と下に 8dp の無反応帯(押しても何も起きない領域)を置く。ゴミ箱の上と右は各カード本体のタップ領域(シートを開く)と 0dp で隣接し、隣接ターゲット間隔 8dp の例外とする。この緩和は各カードのゴミ箱にだけ適用し、他の入力欄には広げない(Issue #55・#48)。
- 根拠(07 号): 加槓は core に型が無く、`Kan{closed:false}` として符・役・点数が明槓と同一に計算される(`src/core/input.ts` の `Meld` 定義・`instantiateMeld`)。加槓固有の効果は槍槓(`HandOptions.chankan`、D5 の状況役)だけで、副露の入力値には影響しない。

### 1.4 設計担当の判断と根拠(【設計案】)

| # | 判断 | 根拠 |
| --- | --- | --- |
| A1 | 空の副露は `{type:'pon', tile:null}` で状態に持つ。種類バーは「対象の副露の `type`/`closed`」をそのまま表示・変更する(別の状態を持たない) | core の `Meld` は `tile: Tile \| null` を許す。種類と牌を1つの `Meld` で持てば、追加の状態とその同期が要らない |
| A2 | **種類の変更は確定済み副露にも効く**(牌は保持)。変更後の枚数(ポン3→槓4)が使用枚数を超える場合、その種類ボタンを disabled にする | 「牌を入れ直す」より操作が少ない。使用枚数の検査を種類にも掛ければ不整合が起きない |
| A3 | 確定済み副露で牌をタップすると牌を置き換える(種類は保持)。置き換え後の枚数判定は「その副露を除いた使用牌」で行う | 1副露=1牌の入力なので、置き換えが自然。自分自身の牌を数えると同じ牌に戻せなくなるため除外する |
| A4 | 牌を確定してもシートは閉じない(対象は同じ副露のまま) | 非モーダルシート方針(D1)と手牌シートの挙動に合わせる。種類の付け直しができる |
| A5 | **手牌の切り捨ては `add-meld` の時点で行う**(確定事項 4)。空の副露を残したまま対象を離れた(シートを閉じた・別の対象を開いた)場合、その空の副露は削除する。切り捨てた手牌は戻さない | 追加の瞬間に上限が下がるため、見出し n/m と実際の枚数を常に一致させる。空の副露を残すと計算が未成立のまま残り、ゴミ箱で消す手間が増える |
| A6 | 副露・ドラ・裏ドラのシートも、ヘッダーにパレット/テンキー切替(`SheetModeToggle`)を出す。`sheetMode` は共有(対象ごとに分けない) | 確定事項 2・3。D3 で `sheetMode` は開閉をまたいで保持する設計 |
| A7 | テンキーの桁上限は対象ごと: 手牌は従来どおり、ドラ・裏ドラは `5 − 既存枚数`、副露は 1 桁 | 各対象の上限枚数に合わせる |
| A8 | 物理キーボード(`useTenkeyKeyboard`)は手牌に加えドラ・裏ドラ・副露でも有効にする。Backspace(バッファ空)は、ドラ・裏ドラでは末尾1枚削除、副露では何もしない。パレットモードの Backspace も同じく対象別にする(2.3 の表)。Enter でシートを閉じる既存動作は、そのまま新しい対象に広げる | テンキーをシートに出す以上、物理キーの挙動を揃える。副露の牌を Backspace で消すと空の副露が生まれ A5 と紛らわしいため何もしない |
| A9 | 暗槓は両端2枚を裏向き(`{type:'back'}`)で描く。明槓は4枚、ポンは3枚を表向きで描く。種類の文字ラベルは出さない | 牌姿で種類が判別できる(AGENTS.md「見ればわかるラベルは省略」)。`Tile` は `TileOrBack` を描ける |
| A10 | ゴミ箱は副露カード=その副露の削除、ドラ/裏ドラカード=その表示牌の全消し。確認・Undo なし | 手牌カード(D1-1)と同じ操作感 |
| A11 | 【確定(Q1=B案)】ゴミ箱は手牌カードと同じ 40×24dp・左と下に 8dp の無反応帯。DOM は `HandCard` の `.hand-card__clear-zone` 方式(無反応帯の `padding-inline-start`・`padding-block-end` 8dp、外枠の `onClick` で `closest(無反応帯)` を無視)を流用する。【設計案】共通化: ゴミ箱+無反応帯を `CardClearButton`(`src/ui/screen/CardClearButton.tsx`。props: `aria-label`・`disabled`・`onClear`)に切り出し、ドラ・裏ドラ・副露で使う。手牌カードへの適用は任意(HandCard は変更しない方針のため、本 Issue では差し替えない。CSS の値は共通のクラスへ寄せてよい) | 確定事項 10。3 種のカードで同じ寸法・判定を保つには部品化が安全。HandCard を触らないのは issue-55 の受け入れ条件を再検証する範囲を増やさないため |
| A12 | 副露の並びは2列のグリッド。追加ボタンは末尾のセルに置き、副露が4つのときは出さない | 375px で槓の4枚(28px×4)とゴミ箱が1セル(約167px)に収まる。下記 2.5 の算出 |
| A13 | 副露カードの見出しは出さない(牌姿で分かる)。ドラ・裏ドラは見出し「ドラ」「裏ドラ」を出す(n/5 は出さない) | 両カードは牌が空のとき区別が付かないため見出しが要る。上限は disabled で分かる |

## 2. 設計

### 2.1 状態・アクション(`src/ui/state/app-state.ts`)

`AppState` の形は変えない(`input.melds`・`dora`・`uradora`・`inputFocus`・`sheetMode`・`tenkeyBuffer` を使う)。追加する型とアクション:

```ts
export type MeldKind = 'pon' | 'minkan' | 'ankan';
export type IndicatorTarget = 'dora' | 'uradora';

// AppAction に追加
| { type: 'add-meld' }
| { type: 'set-meld-kind'; i: number; kind: MeldKind }
| { type: 'set-meld-tile'; i: number; tile: Tile }
| { type: 'remove-meld'; i: number }
| { type: 'add-indicator-tile'; target: IndicatorTarget; tile: Tile }
| { type: 'remove-last-indicator-tile'; target: IndicatorTarget }
| { type: 'clear-indicators'; target: IndicatorTarget }
```

reducer の仕様:

| アクション | 動作 | 無効(state をそのまま返す)条件 |
| --- | --- | --- |
| `add-meld` | 次の順に処理する。(1) 直前の対象が空の副露なら A5 で削除する。(2) 直前の対象が手牌なら既存 `open-sheet` と同じ `sortHand` で整列する(手牌以外が対象なら `hand` は既に整列済み)。(3) その `hand` を `slice(0, maxHandLength(副露追加後のmelds))` で末尾から切り捨てる。(4) `melds` 末尾に `{type:'pon', tile:null}` を足す。(5) `inputFocus={type:'meld', i: 新index}`、`tenkeyBuffer=''` | `melds.length >= 4` |
| `set-meld-kind` | `pon`→`{type:'pon'}`、`minkan`→`{type:'kan', closed:false}`、`ankan`→`{type:'kan', closed:true}`。`tile` は保持 | i が範囲外、または `canSetMeld(state, i, 新Meld)` が偽 |
| `set-meld-tile` | `melds[i].tile = tile`。`tenkeyBuffer=''` | i が範囲外、または `canSetMeld` が偽 |
| `remove-meld` | `melds` から i を除く。`inputFocus` が `meld j` のとき: j===i → `null`(閉じる)、j>i → j−1 | i が範囲外 |
| `add-indicator-tile` | `input[target]` 末尾に足す。`tenkeyBuffer=''` | `canAddIndicatorTile` が偽 |
| `remove-last-indicator-tile` | 末尾1枚を除く | 0 枚 |
| `clear-indicators` | `input[target] = []` | — |
| `open-sheet`・`close-sheet`(変更) | 離れる対象が `meld i` で `melds[i].tile===null` なら、その副露を削除する(A5)。`open-sheet` の新しい対象が `meld j`(j>i)なら j−1 に補正する。手牌の整列は従来どおり | 従来どおり |
| `tenkey-digit`(変更) | 対象を `hand`・`dora`・`uradora`・`meld` に広げる。判定は `canAppendTenkeyDigit` を対象別に一般化(下記) | 対象がそれ以外 |
| `tenkey-backspace`(変更) | バッファ空のとき: 手牌=従来、ドラ・裏ドラ=末尾1枚削除、副露=何もしない | — |
| `tenkey-commit`(変更) | 手牌=従来。ドラ・裏ドラ=解決した牌列を逐次 `canAddIndicatorTile` で検査し全部通れば追加。副露=1枚に解決できたら `set-meld-tile` と同じ処理 | 解決失敗・検査失敗 |
| `clear-all` | 変更なし(`createInitialInput` で副露・ドラ・裏ドラも空になる) | — |

### 2.2 判定関数(`src/ui/state/hand-rules.ts` に追加)

```ts
export const MAX_MELDS = 4;
export const MAX_INDICATORS = 5;
export const meldOfKind = (kind: MeldKind, tile: Tile | null): Meld;
export const kindOfMeld = (meld: Meld): MeldKind;
/** melds[i] を next に置き換えても使用枚数が超えないか(melds[i] 自身は除いて数える) */
export const canSetMeld = (state: Pick<AppState,'input'|'rule'>, i: number, next: Meld): boolean;
/** 表示牌を1枚足せるか(枚数 < 5 かつ isAvailableTiles) */
export const canAddIndicatorTile = (state: Pick<AppState,'input'|'rule'>, target: IndicatorTarget, tile: Tile): boolean;
/** 対象別のテンキー桁追加判定。既存 canAppendTenkeyDigit は手牌の場合として残す */
export const canAppendTenkeyDigitFor = (state: Pick<AppState,'input'|'tenkeyBuffer'|'inputFocus'>, digit: string): boolean;
```

- `canSetMeld`: `usedTiles({...input, melds: melds.filter((_, k) => k !== i)}, red)` に `instantiateMeld(next, red)` を加えて `isAvailableTiles` で判定する(既存 `canAddHandTile` と同じ判定関数を使う。牌の存在しない 2m〜8m は `isAvailableTiles` が弾く)。`next.tile===null` なら常に真。
- `canAppendTenkeyDigitFor`: 共通条件(`/^[0-9]$/`・同じ数字 4 つまで)に加え、容量 = 手牌 `max − hand.length`、ドラ・裏ドラ `5 − 枚数`、副露 1。`tenkeyBuffer.length >= 容量` なら偽。
- 赤五のポン・槓は `instantiateMeld` に従う(赤牌をタップした場合は赤を含む面子として数える)。

### 2.3 シート(`MainScreen.tsx`)

- `header`: `inputFocus` が `hand`・`dora`・`uradora`・`meld` のとき `SheetModeToggle` を出す。
- 中身(`.sheet-slot` の子):
  - `hand`: 従来どおり。
  - `dora`/`uradora`: 従来のパレット/テンキーを対象指定で出す。
  - `meld`: 先頭に種類バー `MeldKindBar`、その下にパレット/テンキー。
- `TilePalette`・`Tenkey` は props で対象を受けず、`inputFocus` から対象を判断する(手牌のときの挙動は変えない)。パレットの disabled 判定とタップ時のアクション:

  | 対象 | disabled | タップ |
  | --- | --- | --- |
  | hand | `!canAddHandTile`(従来) | `add-hand-tile`(従来) |
  | dora/uradora | `!canAddIndicatorTile` | `add-indicator-tile` |
  | meld i | `!canSetMeld(state, i, meldOfKind(現在の種類, tile))` | `set-meld-tile` |

  パレットの機能キー(実物 `TilePalette.tsx` は「1 枚削除」`remove-last-hand-tile`、「AC」`aria-label="手牌をクリア"` `clear-hand`、「入力を終える」`close-sheet` の3つ)と、物理キー Backspace(`use-tenkey-keyboard.ts` の `case 'backspace'`。パレットモードでは現在 `remove-last-hand-tile` を直接 dispatch している)を、対象別に次のとおりにする。キーの構成・配置は変えない。

  | 対象 | 「1 枚削除」・パレットモードの物理 Backspace | 「AC」の aria-label / アクション / disabled | 「入力を終える」 |
  | --- | --- | --- | --- |
  | hand | `remove-last-hand-tile`(従来) | 「手牌をクリア」/ `clear-hand` / 従来どおり | `close-sheet` |
  | dora | `remove-last-indicator-tile {target:'dora'}`。0 枚で disabled | 「ドラ表示牌をクリア」/ `clear-indicators {target:'dora'}` / 0 枚で disabled | `close-sheet` |
  | uradora | 同上(`'uradora'`) | 「裏ドラ表示牌をクリア」/ `clear-indicators {target:'uradora'}` / 0 枚で disabled | `close-sheet` |
  | meld i | disabled(物理 Backspace は何もしない) | disabled(aria-label「手牌をクリア」は使わず「副露をクリア」とする。副露の削除はカードのゴミ箱で行う) | `close-sheet` |

  テンキーモードの物理 Backspace は `tenkey-backspace`(2.1 の表)に従う。

- `MeldKindBar`(新規、`src/ui/input/MeldKindBar.tsx`): `ConnectedButtonGroup` を流用し `label="副露の種類"`、選択肢「ポン」「明槓」「暗槓」。値は `kindOfMeld(melds[i])`。各ボタンの `disabled` は `!canSetMeld(state, i, meldOfKind(kind, melds[i].tile))`。押下で `set-meld-kind`。高さは ConnectedButtonGroup の既定(48dp)。パレット/テンキーとの間隔 8dp。

### 2.4 ドラ・裏ドラカード(`src/ui/screen/IndicatorCard.tsx`、新規)

- `data-slot="dora-uradora"` の置き場を `<div className="indicator-row">` にし、`IndicatorCard target="dora"` と `target="uradora"` を横並び(`display:grid; grid-template-columns: 1fr 1fr; gap: 8dp`)で置く。
- 構造は手牌カード(issue-55 2.1)に倣う: 外枠 `.indicator-card`(クリックでシートを開く、`role` なし)、上段に見出し(「ドラ」/「裏ドラ」)とゴミ箱、下段に `role="button"`・`tabIndex=0`・`aria-label="ドラ表示牌を入力"`/`"裏ドラ表示牌を入力"` の本体。ゴミ箱は `aria-label="ドラ表示牌をクリア"`/`"裏ドラ表示牌をクリア"`、0 枚で disabled、押下で `clear-indicators`(シートは開かない)。
- 牌幅(確定事項 15): `--tile-width: 1.25rem`(**20px** 固定)。375px 幅でカード幅 (343 − 8)/2 = 167.5px、本体幅 167.5 − 16 = 151.5px。5 枚の行幅 = 20 × 5 + gap 1 × 4 + 牌列 padding 2 × 2 = **108px** < 151.5px で1行に収まる(算出)。牌の高さ = 20 × 4/3 ≈ 26.7px。
- 抜き北・ステッパーは変更しない。

### 2.5 副露カードと追加ボタン(`src/ui/screen/MeldArea.tsx`、新規)

- `data-slot="melds"` の置き場を `<div className="meld-area">`(2列グリッド、gap 8dp)にする。副露0のときも追加ボタンを出す。
- 副露カード `.meld-card`: 手牌カードと同じ構造(外枠クリック=`open-sheet {type:'meld', i}`、本体 `role="button"`・`aria-label="副露{i+1}を入力"`、ゴミ箱 `aria-label="副露{i+1}を削除"` → `remove-meld`)。ゴミ箱は副露が空でも有効。牌の描画は A9。`tile===null` の間は牌の代わりに空の枠(牌1枚分の高さ)を出す。シートの対象になっている副露カードは見た目を変えない(手牌カードに合わせる)。
- 追加ボタン `.meld-add`: ネイティブ `<button>`、`aria-label="副露を追加"`、点線枠(`border: 1px dashed var(--md-sys-color-outline)`、角丸 `--md-sys-shape-corner-medium`)、中央に「＋」アイコン(`SymbolIcon`。パスは Material Symbols の add)。高さは副露カードと同じ(最低 48dp)。押下で `add-meld`。副露が4つのときは描画しない。
- 寸法(375px): セル幅 (343 − 8)/2 = 167.5px。槓4枚 28×4 + 3 = 115px は本体幅 151.5px に収まる。

### 2.6 タップ領域(要件 §4 との対応)

| 要素 | 大きさ | 根拠 |
| --- | --- | --- |
| ドラ・裏ドラ・副露カードの外枠(シートを開く領域) | 高さ 48dp 以上(外枠全体で満たす。本体単独の 48dp は求めない。2.4 の削減後も約 75〜85px) | §4 原則 |
| 各カードのゴミ箱 | **40×24dp**、左と下に 8dp の無反応帯(A11、issue-55 2.3 と同じ値)。上段の見出しの右に置く | 確定事項 10。要件 §4 改訂(1.3) |
| 追加ボタン | セル幅 × 48dp 以上 | §4 原則 |
| 種類バー | ConnectedButtonGroup 既定(高さ 48dp、ピル内隙間 2dp は §4 の例外) | §4 既定の例外 |
| パレット・テンキー | D2・D3 の規定のまま | §4 既存の例外 |

**高さの削減(確定事項 16、【設計案】)**: 削るのは余白だけとする。

| 項目 | 監修前(製造済み) | 新 |
| --- | --- | --- |
| カード(`.indicator-card`・`.meld-card`)の padding | 8dp 四方 | **上下 6dp**・左右 8dp(`padding: 0.375rem 0.5rem`)。ゴミ箱の右・上はカード本体のタップ領域のままで、当たり判定は変わらない |
| 本体(`__body`)の `min-height: 3rem` | あり | **削除**。シートを開くタップ領域はカード外枠全体(高さ ≥ 48dp)が担うため、本体単独で 48dp は不要 |
| 本体の padding 2px(和了牌枠・フォーカスリングの逃げ) | 2px | 維持(削らない) |
| 上段 24dp・無反応帯 8dp | — | 維持(確定事項 10) |

削減後の高さの目安(375px、算出、実測前):

| カード | 内訳 | 高さ |
| --- | --- | --- |
| ドラ・裏ドラ(牌 20dp) | 6 + 24 + 8 + (26.7 + 4) + 6 | **≈ 75px**(監修前 約 89px 以上) |
| 副露(牌 28dp、槓4枚 = 28×4+3+4 = 119px < 151.5px で1行) | 6 + 24 + 8 + (37.3 + 4) + 6 | **≈ 85px** |
| 副露(空、牌1枚分の空枠) | 同上 | ≈ 85px |

いずれもカード外枠は 48dp 以上で §4 原則を満たす。

当たり判定(各カード共通): ゴミ箱の矩形=押下で削除/クリア(シートは開かない)、ゴミ箱の左 8dp・下 8dp=何も起きない、それ以外のカード内=シートを開く。

### 2.7 色・形

**消すボタンのアイコン(確定事項 19。確定事項 14 の記述を置換)**: `CardClearButton` と `HandCard` のアイコンを `<SymbolIcon d={SYMBOL_CLOSE} size="1.25rem" />` にする(既存定数。新規取得は不要)。表示 20dp は確定事項 14 の設計案を引き継ぐ(✕のグリフは 200〜760/960 の範囲で表示約 11.7dp 角となり、40×24dp の当たり判定に余裕で収まる)。色・disabled の扱いは従来どおり。`SYMBOL_DISABLED_BY_DEFAULT` は `symbol-paths.ts`・`index.ts` から削除し、それを参照するテスト(D4-ICON)を `SYMBOL_CLOSE` の確認に改める。

**見出しの書体(確定事項 17)**: `.indicator-card__title` の `font-family`・`font-size`・`line-height`・`font-weight` を `--md-sys-typescale-label-medium-*` にする(`.stepper__label` と同じトークン)。色は現状のまま。上段の高さはゴミ箱の 24dp で決まるため、カードの高さは変わらない(算出)。

**シートの閉じるボタン(確定事項 20)**: `src/ui/icons/symbol-paths.ts` に `SYMBOL_CANCEL` を追加する。取得元は既存定数と同じ google/material-design-icons の `symbols/web/cancel/materialsymbolsoutlined/cancel_24px.svg`(Outlined、weight 400・fill 0)。パスは製造が公式 SVG から書き写す。ライセンスは既存のファイル冒頭ヘッダーでまかなう。`BottomSheet.tsx` の閉じるボタンの `<SymbolIcon d={SYMBOL_CLOSE} />` を `d={SYMBOL_CANCEL}` に替える。**変更はアイコンの `d` だけ**で、ボタンの寸法・当たり判定・aria-label・フォーカス処理・アイコンの size は変えない。`SYMBOL_CLOSE` はカードの消すボタンで引き続き使う。

色は `--md-sys-color-*` トークンのみ(HEX 禁止、06 号)。カード背景・角丸は手牌カードと同じトークンを使う。暗槓の裏牌は既存の `Tile` の裏画像。

### 2.8 変更ファイル一覧

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/state/app-state.ts` | 変更 | 2.1 |
| `src/ui/state/hand-rules.ts` | 変更 | 2.2 |
| `src/ui/state/index.ts` | 変更 | 追加分の再輸出 |
| `src/ui/input/TilePalette.tsx`・`Tenkey.tsx`・`use-tenkey-keyboard.ts` | 変更 | 対象の一般化(2.3・A8) |
| `src/ui/input/MeldKindBar.tsx` | 新規 | 種類バー |
| `src/ui/screen/IndicatorCard.tsx`・`MeldArea.tsx`・`CardClearButton.tsx` | 新規 | 2.4・2.5・A11 |
| `src/ui/screen/MainScreen.tsx`・`main-screen.css` | 変更 | 置き場の差し替え・シートの分岐・スタイル |
| `src/ui/icons/symbol-paths.ts` | 変更 | add アイコン(無ければ) |
| テスト(`app-state.test.ts`・`hand-rules.test.ts`・新規コンポーネントのテスト) | 追加 | 4 章の自動テスト |
| `docs/requirements.md`・`docs/issues-draft.md` | 変更 | 1.3 |

| `src/ui/icons/symbol-paths.ts`・`index.ts` | 変更(UI 監修・監修2) | `SYMBOL_CANCEL` の追加と再輸出、`SYMBOL_DISABLED_BY_DEFAULT` の削除(確定事項 19・20) |
| `src/ui/expressive/BottomSheet.tsx` | 変更(UI 監修2) | 閉じるボタンのアイコンの `d` を `SYMBOL_CANCEL` に差し替えるのみ(確定事項 20)。expressive 配下は従来変更しない方針だったが、この確定により加える |
| `.indicator-card__title` の CSS(`main-screen.css`) | 変更(UI 監修2) | 書体を label-medium に(確定事項 17) |
| D4-ICON のテスト | 変更(UI 監修2) | `SYMBOL_CLOSE` の確認に改める |
| `src/ui/screen/HandCard.tsx` | 変更(UI 監修) | **ゴミ箱アイコンの差し替えのみ**(2.7) |
| `src/ui/screen/CardClearButton.tsx`・`main-screen.css` | 変更(UI 監修) | アイコン差し替え、2.4・2.6 の余白と牌幅 |

`src/core/` は変更しない。`HandCard.tsx` はアイコンの差し替え以外を変更しない(見出しの m は `maxHandLength(melds)` で既に副露に追従する)。

### 2.9 バンドル

目標値(102,000 B)は超過中で、超過は容認する。本 Issue はコンポーネント3つと reducer の追加で数 KB 増の見込み。ビルド後の実測値を PR に記載する。

### 2.10 製造の段階化(コミット目安)

1. 状態・判定関数と単体テスト(2.1・2.2。UI なしで C1〜C8 が通る)
2. シート(種類バー・パレット/テンキーの対象の一般化・物理キー)とカード(2.3〜2.7)、コンポーネントテスト
3. `docs/requirements.md`(§2 副露・§4 ゴミ箱・更新日)・`docs/issues-draft.md` の改訂(1.3)

UI 監修の修正(既存3コミットは変えず、追加で1〜2コミット):

4. `fix`: ゴミ箱アイコンを disabled_by_default に統一(`symbol-paths.ts`・`CardClearButton`・`HandCard`)
5. `fix`: ドラ・裏ドラの牌幅 20dp とカードの余白削減(`main-screen.css`)。4 と 5 は1コミットにまとめてもよい
6. `fix`: UI 監修2(確定事項 17・19・20): 消すボタンを `SYMBOL_CLOSE` に、シートの閉じるボタンを `SYMBOL_CANCEL` に、ドラ・裏ドラ見出しを label-medium に。`SYMBOL_DISABLED_BY_DEFAULT` とその参照の削除、D4-ICON の更新。確定事項 18(副露の1行化)は Q5 の回答後に別コミットで行う

## 3. 実挙動未確認の一覧

| 項目 | 状況 | 確認方法 |
| --- | --- | --- |
| カード・牌の寸法(2.4〜2.6) | 算出のみ | C14 |
| 空の副露(`tile:null`)を含む入力での計算結果の表示 | core は `instantiateMeld` で [] を返し、`fu.ts` で null を扱う分岐があるが、結果パネルの表示は未確認。A5 で対象を離れると消えるため、問題になるのはシートを開いている間だけ | C17 で目視し、例外が出ないことを確認 |
| `ConnectedButtonGroup` の disabled 項目の見た目と、選択中の項目が disabled になる状況 | 選択中の種類自体は常に有効(自身を除いて数えるため)。他の種類が disabled になる見た目は未確認 | C12 |
| 暗槓の裏牌の見た目 | 未確認 | C14 で目視 |
| 実機(iOS Safari・Android Chrome)での指のタップ、シートとカードのスクロール | 実機未確認 | 監修時に実機で操作 |

## 4. 受け入れ条件

前提: 検収幅は 375×812。dev サーバーはポート 5201 を `npm run dev -- --port 5201 --host` で起動し、Browser pane で開く。**他のポートで動いているサーバーは止めない。終了時は自分が起動した 5201 のみ停止する**(01 号の dev サーバー禁止事項)。ルールは既定(北=抜きドラ、赤2枚)。

### 自動テスト(`npm test`)

- [ ] **C1 add-meld**: 初期状態で `add-meld` → `melds` が `[{type:'pon', tile:null}]`、`inputFocus` が `{type:'meld', i:0}`。4 回目まで増え、5 回目は state が同一(参照が等しい)。
- [ ] **C2 手牌の切り捨て**: 手牌 14 枚(入力順 a1…a14、`inputFocus=null`)で `add-meld` → 手牌が先頭 11 枚 a1…a11。手牌 10 枚なら変わらない。`inputFocus={type:'hand'}` で未整列の 14 枚から `add-meld` → 整列後の先頭 11 枚になる。
- [ ] **C3 set-meld-tile / 使用枚数**: 手牌に 1p を 1 枚持つ状態で副露0にポン 1p → 成立(手牌1+ポン3=4枚)。手牌に 1p を 2 枚持つ状態ではポン 1p は state 不変(2+3=5枚)。手牌に 1p を 1 枚持ちポン 1p を確定した状態で、別の副露(空)に 1p を入れようとすると state 不変(1+3+3=7枚)。2m を入れようとすると state 不変。確定済みのポン 1p に 2p を入れると牌が 2p に置き換わる。確定済みのポン 1p に同じ 1p を入れても成立する(自身を除いて数える)。
- [ ] **C4 set-meld-kind**: ポン 1p(他に 1p 無し)を明槓・暗槓に変えると `{type:'kan', closed:false}`・`{closed:true}` になり牌は 1p のまま。手牌に 1p が 1 枚ある状態ではポン 1p を明槓に変えられない(state 不変)。空の副露の種類変更は常に成立する。
- [ ] **C5 remove-meld と対象の補正**: 副露3つ、`inputFocus=meld 2` で `remove-meld i:0` → 副露2つ、`inputFocus=meld 1`。`inputFocus=meld 1` で `remove-meld i:1` → `inputFocus=null`。
- [ ] **C6 空の副露の削除(A5)**: `add-meld` 直後に `close-sheet` → `melds` が空。同じく `open-sheet {type:'dora'}` → `melds` が空で `inputFocus` が dora。牌を確定した副露は `close-sheet` で残る。index 補正の検証は、通常操作では作れない状態を直接組み立てて reducer に与える: `melds=[{pon,null},{pon,1p}]`・`inputFocus=meld 0` で `open-sheet meld 1` → `melds=[{pon,1p}]`、`inputFocus=meld 0`。
- [ ] **C7 表示牌**: `add-indicator-tile dora` で 5 枚まで入り、6 枚目は state 不変。2m は不可。ドラ 1p ×3 + 裏ドラ 1p ×1 の後、手牌に 1p を足せない(`canAddHandTile` が偽)。`remove-last-indicator-tile`・`clear-indicators` が対象の側だけを変える。
- [ ] **C8 テンキーの一般化**: `inputFocus=dora` で表示牌 3 枚のとき `tenkey-digit` は 2 桁まで、3 桁目は不変。`tenkey-commit p` で 2 枚追加。`inputFocus=meld 0` では 1 桁まで。`'1'`→`tenkey-commit p` で副露0が 1p になる。`inputFocus=meld 0` でバッファ空の `tenkey-backspace` は不変、`dora` では末尾1枚が消える。`inputFocus=hand` の既存テスト(D3)がすべて通る。物理キー(`useTenkeyKeyboard`、パレットモード)で Backspace を送ると: hand は `remove-last-hand-tile`、dora は `remove-last-indicator-tile {target:'dora'}` が dispatch され、meld では何も dispatch されない(フックのテストで dispatch を観測)。
- [ ] **C9 抜き北(確定事項 5)**: `rule.north='yakuhai'` で `step nuki +1` が不変、`set-rule` で yakuhai にすると `nuki` が 0 になる(既存テストの存在と合格を確認)。
- [ ] **C10 計算コアへの受け渡し**: `computeResult` に渡す `Input.dora` が `[...dora, ...uradora]` で、`melds` が状態のまま渡る(既存テストがあればその合格、無ければ追加)。

### 画面(375px、dev 5201)

- [ ] **C11 追加ボタン**: 初期表示で `[aria-label="副露を追加"]` が1つあり、計算値 `border-style` が `dashed`。押すとシートが開き、`[role="radiogroup"][aria-label="副露の種類"]` 内の `role="radio"`「ポン」が `aria-checked="true"`(実物 `ConnectedButtonGroup.tsx` の選択表現)。副露カードが1枚増える。副露が4枚で追加ボタンが存在しない。
- [ ] **C12 種類バーと牌の確定**: 種類バーがパレット(またはテンキー)の上にある(`getBoundingClientRect().bottom` < パレット先頭の `top`)。ポンのまま 1p をタップすると副露カードに 1p が3枚表示され、シートは開いたまま。明槓を押すと 4 枚、暗槓を押すと 4 枚で両端が裏(`img` の alt/クラスで裏牌を確認)。手牌に 1p が 1 枚ある状態で明槓・暗槓の `role="radio"` 要素が `disabled` 属性を持つ。1p を使い切った後のパレットで 1p のキーが `disabled` 属性を持つ。副露のシートで「1 枚削除」と「副露をクリア」が `disabled` 属性を持ち、物理 Backspace で副露の牌が消えない。
- [ ] **C13 切り捨て(画面)**: 手牌 14 枚の状態で追加ボタンを押すと、手牌カードの見出しが `手牌 (11/11)`。
- [ ] **C14 寸法と配置**: ドラ・裏ドラカードが同じ `top` で横並び、各幅 167.5±1px。ドラ満杯 5 枚で牌の `width` が 20±0.5px、本体の `scrollWidth === clientWidth`(1行)。副露の牌の `width` が 28±0.5px、槓4枚で `scrollWidth === clientWidth`。カード外枠の高さ: ドラ・裏ドラ 75±3px、副露 85±3px(算出値。外れた場合は実測値を報告し統括が判断)。各カード外枠・追加ボタンの高さ ≥ 48px。カードの `padding-top`・`padding-bottom` が 6px。CSS に HEX 値を追加していない(`git diff` で `#[0-9a-fA-F]{3,8}` の追加が無い)。
- [ ] **C14a ゴミ箱の矩形(375px、dev)**: ドラ・裏ドラ・副露(1つ以上)の各カードについて、ゴミ箱の `getBoundingClientRect()` の `width` が 40±0.5、`height` が 24±0.5。無反応帯(`.hand-card__clear-zone` 相当のクラス。A11 の部品の要素)の矩形 z とゴミ箱の矩形 r について `z.left = r.left − 8 ± 0.5`、`z.bottom = r.bottom + 8 ± 0.5`、`z.right = r.right ± 0.5`、`z.top = r.top ± 0.5`。
- [ ] **C14b 当たり判定(375px、dev、各カード別)**: ドラ(表示牌3枚)・裏ドラ(1枚)・副露(ポン確定済み)の各カードで、issue-55 C6 の表と同じ点(ゴミ箱中央、角丸の内側の四隅 ±4px、真上の外 r.top−1、真下の外 r.bottom+1・+7、無反応帯の外(下)z.bottom+1、左の外 r.left−1・−7、無反応帯の外(左)z.left−1、左下の角 (r.left−4, r.bottom+4))を `document.elementFromPoint` で評価し、同表と同じ期待(ゴミ箱/無反応帯/カード本体)になる。`.hand-card` は各カードの外枠に読み替える。
- [ ] **C14c 押下の結果(375px、dev)**: 各カードで、無反応帯の2点(真下 +1・左 −1)の要素へ `click()` を送るとシートが開かず状態が変わらない。真上の外・無反応帯の外(下・左)へ送るとシートがそのカードの対象で開く(各回の前に Esc)。ゴミ箱中央へ送ると、ドラ・裏ドラは表示牌が0枚、副露はその副露が消え、シートは開かない。表示牌0枚のドラ・裏ドラでゴミ箱(disabled)中央へ `click()` を送ってもシートが開かない。
- [ ] **C14d 消すボタンとシートのアイコン(375px、dev)**: 手牌・ドラ・裏ドラ・副露の各消すボタンの svg の `path` の `d` 属性が `SYMBOL_CLOSE` と一致する。`SYMBOL_DISABLED_BY_DEFAULT` と旧ゴミ箱のパス `M6 19c0 1.1…` がコードに残っていない(`grep`)。svg の矩形が 20±0.5 × 20±0.5 で、ボタンの矩形の内側にある。空のときもボタンが描画され `disabled` 属性を持つ。色の計算値が従来(on-surface-variant、disabled 時 不透明度 0.38)と同じ。底部シートを開き、`[aria-label="閉じる"]` 内の svg の `path` の `d` が `SYMBOL_CANCEL` と一致し、閉じるボタンの `getBoundingClientRect()` の幅・高さが main(本 Issue 前)と同じで、押すとシートが閉じる。`BottomSheet.tsx` の差分がアイコン定数の差し替え(import と `d`)だけである(`git diff`)。
- [ ] **C14f 見出しの書体(375px、dev)**: `.indicator-card__title` の計算値 `font-size`・`font-weight`・`line-height`・`font-family` が `.stepper__label` の計算値と一致する。`.hand-card__title` の計算値が本 Issue 前(title-small)から変わらない。ドラ・裏ドラカードの高さが C14 の合格値の範囲のまま。
- [ ] **C14e 手牌カードの非回帰**: issue-55 の C5(ゴミ箱 40×24)・C6(当たり判定の点)・C7(押下の結果)を再実行し合格。HandCard.tsx の差分がアイコン部分(import と svg 要素)だけである(`git diff` で確認)。
- [ ] **C15 ドラのシート**: ドラカードの本体を押すとシートが開き、ヘッダーにパレット/テンキー切替がある。パレットの 1m・9m・字牌が押せ、2m〜8m のキーは存在しない(D2 のまま)。5 枚入れると全牌キーが disabled。テンキーで `1` `9` → `m` で 1m・9m が入る。パレットモードで「1 枚削除」と物理キー Backspace でそれぞれ末尾1枚が消え、手牌は変わらない。「AC」の aria-label が「ドラ表示牌をクリア」で、押すとドラだけが空になり手牌は変わらない。0 枚で「1 枚削除」「AC」が `disabled` 属性を持つ。Enter でシートが閉じる。裏ドラも同様(aria-label「裏ドラ表示牌をクリア」)。手牌のシートでは「1 枚削除」・物理 Backspace・「手牌をクリア」が従来どおり手牌に効く。ゴミ箱で全消しされ、シートは開かない。
- [ ] **C16 副露の削除**: 副露カードのゴミ箱で副露が消え、手牌カードの見出しの m が 3 増える。開いている副露のゴミ箱を押すとシートが閉じる。
- [ ] **C17 空の副露**: 追加ボタン→何も押さずに Esc → 副露カードが消える。シートを開いている間、結果パネルにコンソールエラーが出ない(`read_console_messages` で error が 0)。
- [ ] **C18 抜き北(確定事項 5)**: 設定で北を共通役牌にすると、抜き北ステッパーが disabled で値 0(D4 の画面で再確認)。抜きドラに戻すと有効。
- [ ] **C19 D1 条件 20・21 の維持**: issue-51 条件 20 を手牌カードについて再実行し合格。ドラ・裏ドラ・副露カードの本体からシートを開き Esc で閉じた後、`document.activeElement` が開いたカードの本体(削除された空の副露を除く)。シートの開閉で `history.length` が変わらない。条件 21 は保留中のため判定方法を実行し、main と結果が同じであることだけを確認する(確定事項 6)。
- [ ] **C20 要件・下書き**: `docs/requirements.md` 27 行目が 1.3 の文言で、更新日行に Issue #48 がある。`docs/issues-draft.md` D4 の項に「加槓」が単独の種類として残っていない。 §4 のゴミ箱の文が 1.3 の文言に置き換わり、「他の入力欄には広げない」が残っている。牌の当たり判定の追記が無い。
- [ ] **C21 品質**: `npm run lint`・`typecheck`・`format:check`・`test`・`build` が通る。バンドルの実測値を PR に記載(目標超過は容認)。ホームディレクトリ名・絶対パスがコード・ドキュメントに無い。dev サーバーは 5201 のみ停止し、他のポートのプロセスが残っていることを `lsof -i -P | grep LISTEN` で確認。

## 5. 後続 Issue への引き継ぎ

- D5(状況役): 槍槓・嶺上開花の入力は `HandOptions` で扱う。加槓は状態上 `kan closed:false` のため、「加槓した」かどうかを副露から推定しない。嶺上開花の前提(槓がある)を副露から判定する場合は `kan` の有無で足りる。
- D5: 要約カード(D1 条件 21)は本 Issue で変えていない。
- core の `Chii` 型等の削除(別 Issue)は、副露の UI に影響しない(UI は `Pon`/`Kan` しか作らない)。
- Issue #58(D4-1 スマート入力モード(仮称)、依存 #48): 本 Issue は副露を「種類+牌」(`Meld`)の単位で持ち、種類(`set-meld-kind`)と牌(`set-meld-tile`)を独立に変えられるため、#58 は手牌の除去と `Meld` の追加をまとめるアクションを足すだけで載せられ、本 Issue の状態設計は #58 を妨げない。#58 の設計は本書では行わない。
- 各カードのゴミ箱の寸法は要件 §4 の例外(Issue #55・#48)に従う。寸法を変える場合は §4 の改訂が要る。

## 6. 要ヒアリング事項(統括担当へ)

設計時の Q1〜Q4 はユーザー回答で解決済み(1.2 の確定事項 10〜13)。

- **Q5(確定事項 18、副露の1行化)**: 算出では槓4枚が1行に収まらない。375px で副露カード幅 167.5px、左右 padding 8dp を除く本体幅 151.5px。必要幅 = 牌 28×4 + gap 1×3 + 牌列 padding 2×2 = 119px、+ 無反応帯(左)8dp + ボタン 40dp = **167px** で、**15.5px 超過**(ポン3枚なら 90+48 = 138px で収まる)。どれを採るか:
  - A: 副露の牌を縮める。1行に収まる牌幅は (151.5 − 48 − 4 − 3)/4 ≈ **24.1px 以下**(目安 24dp。ドラの 20dp と手牌の約 21.9px より大きい)。高さは 6 + max(24, 32 + 4) + 6 ≈ 48px(算出)。
  - B: 副露カードを1列(全幅 343px)に並べる。本体幅 327px で 28px のまま収まり、高さは 6 + (37.3 + 4) + 6 ≈ 53px(算出)。副露4つで縦に4段になり、入力側が伸びる。
  - C: 1行化を見送り、上段にボタンを置く現状(約 85px)のまま。
