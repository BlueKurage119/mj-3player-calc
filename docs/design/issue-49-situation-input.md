# Issue #49 D5. 状況の入力 設計書

- 対象: 自風・場風の入力、状況役カードと状況役シート、`handOptions` を書き換えるアクション、ルール変更・オールクリア時の正規化、要約カード(1行目・ドラ行・手牌行と段階表示)、ヘッダの常時表示
- 本書で決めないもの: ツモ／ロンの入力(結果側で並べる。Issue 本文の「含まない」)、結果の中身(Epic E)、設定画面の中身(D6)、バンドル予算値の改訂(§9.5。別途協議)
- 表記: 【確定】=ユーザー確定事項または仕様の【確定】と照合済み。本書の判断はすべて確定済み(2026-11-10 のユーザー回答を反映)
- 改訂: 977244c で承認後、ユーザーの直接監修(画面を見ながらの指示。監修中は設計承認を省略し設計書は事後改訂とする指示)で実装が変わったため、実装を正として本書を改訂した。変更点は §13

## 1. 参照資料と判断の根拠

| # | 資料 | 導いた判断 |
| --- | --- | --- |
| 1 | `gh issue view 49` | 範囲(風・積み棒/供託・状況役カード/シート・要約1行目・ルール出し分け・案内)。ツモ／ロンは入力させない |
| 2 | 統括担当経由のユーザー確定事項 Q1〜Q7(2026-11-10) | §2 の表 |
| 3 | [docs/mahjong-rules.md](../mahjong-rules.md) §2・§3・§4.1・§4.1.1・§4.2 | 一発は変更可・なしなら数えない。オープン立直は立直の選択肢に加える。燕返し・槓振り・人和の入力方法。抜き北への槍槓は付かない。抜き北で嶺上開花が付きうる |
| 4 | [docs/requirements.md](../requirements.md) §3.2・タップ領域の節 | 自風は東南西、親は自風から決まる。状況役の入力は底部シート。タップ領域 48dp |
| 5 | `src/core/input.ts` `HandOptions` | `riichi` の5値と7つの真偽値。海底・河底は `haitei` の1項目(ツモなら海底、ロンなら河底になるのは core 側) |
| 6 | `src/core/result.ts` `generateResult` | (a) `riichi` がオープン系で `rule.openRiichi=false` のとき **例外を投げる**。(b) `ippatsu` は `rule.ippatsu && handOptions.ippatsu` に正規化する。(c) `localYaku=false` なら燕返し・槓振りは無視される(`local-yaku.ts`) |
| 7 | `src/ui/state/app-state.ts` | `handOptions` を書き換えるアクションは現状ゼロ。`clear-all` は `handOptions` を初期化済み。`set-rule` は `nuki` だけ正規化している |
| 8 | [issue-51](issue-51-screen-skeleton.md) §11・§D5 | 枠 `wind-segment`・`situation`、`SheetTarget {type:'situation'}`。オールクリアは状況役を対象、風・積み棒・供託は残す |
| 9 | [issue-48](issue-48-meld-north-dora.md) 確定17・引き継ぎ | 入力欄の見出しは typescale label-medium。加槓は `kan closed:false` で区別しない |
| 10 | [issue-40](issue-40-md-wrappers.md) §D5 | 風は `ConnectedButtonGroup`。`FilterChip` ラッパーは `src/ui/md` に既存 |
| 11 | [issue-14](issue-14-local-yaku.md) Q6・[issue-29](issue-29-rule-items.md) Q1・[issue-12](issue-12-sanma-north.md) §8 | 状況入力の組合せ矛盾は core で検証しない。一発なしは core が入口で false 化。issue-12 §8 の「UI で案内」は本件で不要と判断(§2 #5) |

## 2. 確定事項

| # | 内容 | 出典 |
| --- | --- | --- |
| 1 | 状況役シートは LuckSheet 型(立直の区画+偶然役の区画、シート1枚で完結。監修で立直も chip 化。#24)。参照リポジトリのコードは流用せず、構成だけ参考にする | Q1 |
| 2 | 立直系は「なし・立直・ダブル立直」の3択 + 「オープン」トグル。オープンは `rule.openRiichi` が真のときだけ出す。組合せを `HandOptions.riichi` の5値に写像する | Q2・仕様 §4.2.2「オープンリーチは立直の選択肢に加えて与える」 |
| 3 | ルールにない項目は非表示(`rule.ippatsu=false`→一発、`rule.openRiichi=false`→オープン、`rule.localYaku=false`→燕返し・槓振り)。排他・無効化は最小限: **立直なしなら一発は無効**。それ以外の排他(天和・地和選択時の他役クリア、副露ありで立直無効等)は入れない(§3) | Q3 |
| 4 | 天和・地和は自風でラベル切替(親=「天和」)。子は `rule.localYaku` 真なら「地和/人和」(表記は Q-10 回答で更新)、偽なら「地和」。1ボタンで内部は `tenho`。人和の専用入力は設けない。燕返し・槓振りは `rule.localYaku` 真のときのみ | Q4・仕様 §4.2.2 |
| 5 | 抜き北へのロン(槍槓を選ばない)・抜き北の嶺上牌ツモ(嶺上開花を選ぶ)の案内は**出さない**。issue-12 §8 の「UI で案内」は、本 Issue でユーザーが不要と判断した | Q5 |
| 6 | 要約カード1行目は「風(例: 東場・南家)」と「積み棒・供託」、および抜き北(抜き北ありのルールのみ。#27)。状況役は載せない。積み棒・供託はアイコン+数値にしてよい | Q6・監修 |
| 7 | 風セグメント(場風・自風)は横並び2グループ。375px 幅で収まらなければ縦2段。見出しは label-medium | Q7・issue-48 確定17 |
| 8 | 入力側の積み棒・供託ステッパーの見出しは文字のまま変えない | Q-2(2026-11-10 回答) |
| 9 | 天和・地和を選んでも他の状況役を自動で外さない・無効化しない | Q-3(同) |
| 10 | 副露があっても立直系を無効化しない | Q-4(同) |
| 11 | ルール変更で非表示になった項目は false(オープン系は非オープン)に落とし、ルールを戻しても復元しない | Q-5(同) |
| 12 | 風セグメントは「場風・自風」の順 | Q-6(同) |
| 13 | 状況役が無いとき、カード本文は「なし」と表示する | Q-7(同) |
| 14 | 要約の積み棒・供託のアイコンは Material Symbols を使わず、MD の世界観に合う点棒アイコンを自作する。作図は製造担当、UI監修でユーザーが確認する | Q-1(同。統括判断で作図担当を製造担当に指定) |
| 15 | バンドル予算: 積算したうえで無駄遣いがなければ予算値はどれでもよい。予算値は課題ごとに再計算する想定。D5 は積算と無駄遣いの有無の判断を載せ、予算値は改訂しない | Q-A(2026-11-10 回答) |
| 16 | 予算改訂の文書は D5 に含めない(別途、別の統括と協議) | Q-A'(同) |
| 17 | 偶然役トグルは `md-filter-chip`+`md-chip-set`(既存ラッパー `FilterChip`/`ChipSet` 経由)。自作トグルは作らない | §9.3 案A(同) |
| 18 | 状況役カードは入力どおりに表示する(livewing の「効く役だけ表示」は採らない) | Q-8(同) |
| 19 | 海底・河底の chip ラベルは「海底/河底」(以前は「海底・河底」。Q-10 回答で項目内の区切りを半角スラッシュに変更) | Q-9・Q-10(同) |
| 20 | 区切り: 項目内は半角スラッシュ(「海底/河底」「地和/人和」)、項目間は中黒(例「立直・一発・海底/河底」) | Q-10(同) |
| 21 | 点棒アイコン: 供託=千点棒(赤点1つ)、積み棒=百点棒(黒点 縦2×横4=8個) | Q-11(同) |
| 22 | ~~chip 折り返し時のタップ領域は行間 1.5rem で確保する~~ → 監修で廃止。chip の行間は既定(0.5rem)とし、縦に並ぶ chip のタップ領域(48dp 基準)が重なることを**受け入れた例外**とする(§6.3)。requirements への例外追記はしない | Q-12・監修(ユーザー承認) |
| 23 | オープン立直のトグルは立直の区画(立直3択と同じ ChipSet)に置く。偶然役には入れない | ユーザー指示(2026-11-10)・監修 |
| 24 | 立直は専用グループ・ConnectedButtonGroup をやめ、chip の単一選択(なし・立直・ダブル立直)にする。オープン chip と同じ行に並べ、ダブル立直とオープンの間だけ横の隙間を chip 間の倍にする。区画には見出し「立直」「偶然役」を付ける | 監修 |
| 25 | ヘッダは常時表示(sticky)。要約カードはヘッダ直下に固定 | 監修 |
| 26 | 要約カードは常時表示せず、風セグメントがほとんど見えなくなってから段階的に表示する(風→ドラ→手牌)。見た目は secondary-container+影 | 監修 |
| 27 | 要約カードの中身: 1行目に抜き北を追加、ドラ行(ドラ・裏の横2列)、手牌行(手牌→副露→和了牌)。収まらないときは牌幅を一様に縮小。演算結果欄(旧 `summary-card__result`)は削除 | 監修 |
| 28 | 設定画面(D6)までの仮置きとして、起動時ルールで openRiichi・localYaku を有効にする(D6 で revert) | 監修 |

## 3. 排他・無効化の照合結果(07号)

| 候補 | 仕様の記述 | 採否 |
| --- | --- | --- |
| 立直なしなら一発は無効 | 確定事項 Q3 で明示 | 【確定】採用 |
| 一発なしルールで一発を非表示 | 仕様 §4.1「一発なしのときは一発を役として数えない」+ Q3 | 【確定】採用 |
| オープン系はルール許可時のみ | 仕様 §4.2.2 + core が例外を投げる | 【確定】採用(正規化必須。§5.3) |
| 天和・地和を選ぶと他の状況役をクリア/無効化 | 仕様に UI 排他の記述なし。issue-14 Q6 は「矛盾は検証せず独立に付ける」 | 【確定】不採用(§2 #9) |
| 副露ありで立直系を無効化 | 仕様に UI 排他の記述なし(暗槓の扱いも未記載) | 【確定】不採用(§2 #10) |
| 槍槓と嶺上開花・海底河底等の相互排他 | 仕様 §4.1.1 は複合し得る組合せを定義するのみで、UI 排他の記述なし | 【確定】不採用(§2 #3「それ以外の排他は入れない」) |

## 4. モジュール構成

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/state/situation-rules.ts` | 新規 | 純関数(§5.1)。React 非依存 |
| `src/ui/state/situation-rules.test.ts` | 新規 | 単体テスト |
| `src/ui/state/app-state.ts` | 改修 | アクション追加(§5.2)、`set-rule` の正規化(§5.3) |
| `src/ui/state/index.ts` | 改修 | 新規 export |
| `src/ui/screen/WindSegment.tsx` | 新規 | 場風・自風の2グループ(§6.1) |
| `src/ui/screen/SituationCard.tsx` | 新規 | 状況役カード(§6.2) |
| `src/ui/input/SituationSheet.tsx`・`situation-sheet.css` | 新規 | シート中身(§6.3)。見出し付きの区画「立直」(ChipSet: 3択 radio chip+オープン chip)と「偶然役」(ChipSet)の2つ。`src/ui/input/index.ts` から export |
| `src/ui/screen/SummaryCard.tsx`・`main-screen.css` | 改修 | 要約カード(§6.4)。`SummaryStatusRow`(1行目)・`SummaryDoraRow`(ドラ行)・`SummaryHandRow`(手牌行)、牌幅の一様縮小 `fitTileRow`(DOM を測って `--tile-width` を設定)と、それを描画のたび・幅変化時に呼ぶ `useFitTiles`。props は `rows: {status, dora, hand}`(旧 `sheetOpen` は廃止)。風セグメント・状況役カードの配置 |
| `src/ui/screen/MainScreen.tsx` | 改修 | 枠 `wind-segment`・`situation` に部品を置く。シート分岐に `situation` を追加。ヘッダ高さを ResizeObserver で測り `--app-header-height` に入れる。風・ドラ・手牌カードの見え方(`useInView`)から要約の行を決める(§6.4) |
| `src/ui/screen/AppHeader.tsx` | 改修 | 高さ計測用の ref(`headerRef`)を受け取る。sticky 化は `main-screen.css` |
| `src/ui/screen/use-in-view.ts` | 改修 | `minRatio` を追加。指定時は `isIntersecting && intersectionRatio >= minRatio` を「見えている」とし、threshold を `[0, minRatio]` にする。未指定時は従来どおり |
| `src/ui/md/Chip.tsx` | 改修 | `FilterChip` に `radio` を追加。真のとき、選択中の chip を押しても解除せず通知もしない(単一選択用) |
| `src/ui/state/AppStateProvider.tsx` | 改修(仮置き) | 起動時ルールで `openRiichi`・`localYaku` を強制的に true(D6 で revert。§12) |
| `src/ui/icons/custom-paths.ts`・`index.ts` | 新規・改修 | 自作の積み棒・供託アイコン path(§6.4)。Material Symbols 由来の `symbol-paths.ts` とはファイルを分ける |

- 表示部品の切り出し: テストは `renderToStaticMarkup`+純関数で行い、jsdom/Testing Library は追加しない(issue-48 C30 と同方針)。`AppStateProvider` は初期 state を注入できないため、`SituationCardContent`・`SituationSheetContent`・`SummaryStatusRow`(要約1行目)を **props 駆動の表示部品**として切り出し、state 接続は薄いラッパー(`SituationCard` 等)に置く(`IndicatorCardContent` と同じ流儀)
- `src/ui/md` は `Chip.tsx` の `radio` 追加(監修で必要になった単一選択)以外は変更しない

ファイル名・内部分割は製造担当が変えてよい。export 名と挙動は本書のとおりにする。

## 5. 状態とロジック

### 5.1 純関数(`situation-rules.ts`)

```ts
export type RiichiBase = 'none' | 'riichi' | 'double-riichi';
export type SituationToggleKey =
  | 'ippatsu' | 'rinshan' | 'chankan' | 'haitei' | 'tenho' | 'tsubameGaeshi' | 'kanFuri';

export function splitRiichi(r: HandOptions['riichi']): { base: RiichiBase; open: boolean };
export function composeRiichi(base: RiichiBase, open: boolean): HandOptions['riichi']; // base='none' なら open を無視して 'none'
export function isSituationKeyVisible(key: SituationToggleKey, rule: Rule): boolean;
//   ippatsu → rule.ippatsu / tsubameGaeshi・kanFuri → rule.localYaku / 他は常に true
export function isSituationKeyEnabled(key: SituationToggleKey, opts: HandOptions, rule: Rule): boolean;
//   visible かつ (key==='ippatsu' なら opts.riichi !== 'none')
export function tenhoLabel(table: Table, rule: Rule): string;
//   親 '天和' / 子かつ localYaku '地和/人和' / 子 '地和'
export function situationLabels(opts: HandOptions, table: Table, rule: Rule): string[];
//   カード表示用。順序: 立直系 → 一発 → 嶺上開花 → 槍槓 → 海底/河底 → 天和系 → 燕返し → 槓振り
//   立直系の文言: 立直 / ダブル立直 / オープン立直 / オープンダブル立直
//   非表示・無効の項目は含めない(正規化済みの値なら自然にそうなる)
export function normalizeHandOptions(opts: HandOptions, rule: Rule): HandOptions;
//   (1) !rule.openRiichi ならオープン系を非オープンへ(open-riichi→riichi, open-double-riichi→double-riichi)
//   (2) !rule.ippatsu または riichi==='none' なら ippatsu=false
//   (3) !rule.localYaku なら tsubameGaeshi=false・kanFuri=false
//   変化がなければ同一参照を返す
export function formatWinds(table: Table): string; // 例 '東場・南家'
```

### 5.2 アクション(`AppAction` に追加)

```ts
| { type: 'set-wind'; field: 'round' | 'seat'; wind: Wind }
| { type: 'set-riichi'; riichi: HandOptions['riichi'] }
| { type: 'set-situation'; key: SituationToggleKey; value: boolean }
```

- `set-wind`: `table[field]` を更新。同値なら同一 state を返す。`handOptions` は変えない(天和⇔地和はラベルだけが変わり、`tenho` の値は保つ)
- `set-riichi`: `normalizeHandOptions({ ...handOptions, riichi }, rule)` を適用。これで「オープン系をルール不許可で受けない」「立直なしで一発を false」が同時に満たされる
- `set-situation`: `value=true` で `isSituationKeyEnabled` が偽なら同一 state を返す(無視)。`value=false` は常に受ける
- 同値 no-op: `set-riichi`・`set-situation` は正規化後の `handOptions` が現在値と等しければ同一 state を返す
- いずれも `input`・`inputFocus`・`tenkeyBuffer` は変えない

### 5.3 ルール変更・オールクリア

- `set-rule`: 既存の `nuki` 正規化に加え、`handOptions = normalizeHandOptions(handOptions, nextRule)`。
  - オープン系の正規化は**必須**(core が例外を投げるため。§1 #6)
  - 一発・燕返し・槓振りは core も無視するが、UI では非表示になって利用者が外せなくなるため、表示状態と値を一致させる目的で false にする。core の正規化(`result.ts` の ippatsu)は削らず防御として残す(コアの正規化を UI に移すのではない)。ルールを戻しても値は復元しない(§2 #11)
- `clear-all`: 既存どおり `handOptions` を初期値へ(変更なし。テストを追加)。風・積み棒・供託は残す(issue-51 §11)

## 6. 画面

### 6.0 タップ領域の共通扱い(ConnectedButtonGroup)

- `.connected-button` は `connected-button-group.css` で高さ 2.5rem(40dp)固定。既存の入力方式トグルは `main-screen.css` の `.sheet-mode-toggle .connected-button::after`(上下を 3rem まで外側に拡張)で当たり判定だけ 48dp にしている
- 風セグメント(`main-screen.css`)にも同じ `::after` 拡張を与える(`.wind-segment .connected-button::after`)。見た目は 40dp のまま。`connected-button-group.css` は変更しない
- 立直は監修で chip 化したため ConnectedButtonGroup を使わない(旧 `.situation-riichi` の拡張は無い)

### 6.1 風セグメント(枠 `wind-segment`)

- `WindSegment`: 見出し+`ConnectedButtonGroup` を2組、左「場風」右「自風」。選択肢は 東・南・西(value は `Wind`)。`label`(aria)は「場風」「自風」
- 見出しは可視テキストで typescale label-medium(`.stepper__label` と同じトークン群)。グループの aria-label と重複するため、見出しは Stepper と同様 `aria-hidden`
- 横並び(各グループ `flex: 1`、間隔 8dp 以上)。折り返す場合は縦2段(`flex-wrap: wrap` で自動的に落ちる形でよい)。計算上 375px − 左右余白 32px − 間隔 8px = 335px、1グループ約 163px÷3 ≒ 54px 幅で収まる見込み(実測は C9)
- 並びは「場風 → 自風」(§2 #12)

### 6.2 状況役カード(枠 `situation`)

- 構造は D4 のカード(IndicatorCard)に揃える。クラス `situation-card`、選択中(`inputFocus.type==='situation'`)は `situation-card--selected` を付け、`main-screen.css` の既存の選択中規則(`.hand-card.hand-card--selected, .indicator-card.indicator-card--selected, .meld-card.meld-card--selected`)に `.situation-card.situation-card--selected` を追加する(基底規則に詳細度で負けないこと)
- 見出し「状況役」(title-small)。本文は `role="button"`・`tabIndex=0`・aria-label「状況役を入力」の要素(`situation-card__body`)
- `data-sheet-opener` は付けない(物理キーの入力先でないため)
- 本文: `situationLabels` を「・」で連結(長ければ折り返し)。例「立直・一発・海底/河底」。項目内の区切りは半角スラッシュ(§2 #20)。空なら「なし」(色 `--md-sys-color-on-surface-variant`。§2 #13)
- 操作: 本体クリック、および非選択中の Enter/Space で `open-sheet {type:'situation'}`(Space は preventDefault)。**選択中の Enter/Space は何もしない**(situation は `isSheetKeyboardTarget` の対象外で `useTenkeyKeyboard` が登録されないため、D4 の「選択中は素通し→フックが閉じる」を写すと無処理になる。それを明示的な仕様とする)
- クリア用ゴミ箱は置かない(オールクリアで足りるため)

### 6.3 状況役シート(`MainScreen` のシート分岐 `situation`)

- ヘッダーの入力方式切替は出さない。物理キー入力(テンキー)も対象外。**このシートは Enter で閉じない**(他のシートは物理キーのフック経由で閉じる)。閉じる操作は Esc と✕(および既存の BottomSheet の閉じ方)のみ
- 構成(上から。容器 `situation-sheet` は縦並び、区画間の gap 1.5rem):
  1. 区画「立直」: `<section class="situation-section" aria-label="立直">`。見出し span(`situation-heading`、typescale label-medium・色 `--md-sys-color-on-surface-variant`、`aria-hidden`)の下に `ChipSet`(className `situation-chips`)を1つ置き、次を同じ ChipSet に並べる(幅が足りなければ折り返す):
     - 「なし」「立直」「ダブル立直」: `FilterChip` の `radio` 指定による単一選択。選択中の chip を押しても解除せず通知もしない
     - 「オープン」: `rule.openRiichi` 真のときだけ。base='none' で disabled。操作は `splitRiichi`/`composeRiichi` で5値にして `set-riichi`
     - ダブル立直とオープンは性質が異なるため、その間の横の隙間だけ chip 間(0.5rem)の倍にする(ダブル立直 chip に `situation-double`: `margin-inline-end: 0.5rem`)
  2. 区画「偶然役」: 同じ作りの `<section aria-label="偶然役">`+見出し+`ChipSet`。一発(`isSituationKeyVisible` で出し分け、`isSituationKeyEnabled` で disabled)・嶺上開花・槍槓・海底/河底・`tenhoLabel(...)`・燕返し・槓振り(後2つは localYaku 時のみ)。**オープンは入れない**
  - 区画内の見出しと ChipSet の間隔 0.5rem。chip の行間(row-gap)は指定せず `md-chip-set` の既定(0.5rem)
- 配置図(openRiichi・localYaku 有効時、375px):

```
立直
[なし] [立直] [ダブル立直]  [オープン]   ← ダブル立直の右だけ 1rem
(1.5rem)
偶然役
[一発] [嶺上開花] [槍槓] [海底/河底]
[地和/人和] [燕返し] [槓振り]      ← 行間は既定 0.5rem
```

- 見ればわかるため、説明文は付けない。案内文も出さない(§2 #5)。区画見出しは監修で付けた(立直と偶然役の区別のため)
- Material Web の chip は `src/ui/md` の `ChipSet`/`FilterChip` ラッパー経由(06号 3。§2 #17)
- タップ領域(受け入れた例外。§2 #22): chip の host は高さ 32dp、shadow 内のタッチ領域は 48dp。行間 0.5rem のため、縦に並ぶ chip どうしのタッチ領域は 48dp 基準では重なる。監修でユーザーが承認した例外であり、この部分には requirements のタップ領域 48dp・間隔 8dp 以上を適用しない。同一行の横の間隔(8dp 以上)は満たす。旧設計の「立直グループ内 3択とオープンの行間 1rem」と「当たり判定間隔 8dp 以上」の矛盾は、専用グループの廃止で解消した
- 注意(`Chip.tsx` の挙動): md-filter-chip は click で自ら selected を反転し、再描画時に `useLayoutEffect` で props の値へ戻す。reducer が無視(no-op)すると再描画が起きず見た目だけ反転したままになり得るため、chip の操作は必ず state 変化を伴う場合だけ有効にする(無効な操作は `disabled` で塞ぐ。一発・オープンの disabled はこのため)

### 6.4 ヘッダと要約カード

ヘッダ:
- `.app-header` は常時表示(`position: sticky; top: 0`)。高さは `MainScreen` が ResizeObserver(`offsetHeight`)で測り、`.app-shell` の CSS 変数 `--app-header-height` に入れる

要約カードの配置:
- DOM 上は `main` の先頭(`<aside aria-label="要約">`)。`.summary-card` は `position: sticky; top: var(--app-header-height)`、**高さ 0**、`margin-block-end: -1rem`(main の gap を相殺)。中身は絶対配置の `.summary-card__inner`。これで表示切替でレイアウトが跳ねない
- 非表示時は opacity 0・`pointer-events: none`・`aria-hidden`。表示時 `summary-card--visible`(opacity の遷移はモーショントークン)
- 見た目: `.summary-card__inner` の背景 `--md-sys-color-secondary-container`、文字 `--md-sys-color-on-secondary-container`、影は `--md-sys-color-shadow` の 30%(`color-mix`)の box-shadow

表示規則(段階表示):
- 判定は `useInView`(IntersectionObserver)。`rootMargin` は上端をヘッダ高さ分削る(`-{headerHeight}px 0 0 0`)、`minRatio: 0.1`。つまりヘッダ下端で切った見えている割合が 10% 未満を「隠れた」とする
- 対象: 風=枠 `wind-segment`、ドラ=ドラ表示カード、手牌=**手牌カードのみ**(副露エリアは含まない)
- 行の表示: `status` = 風が隠れた / `dora` = 風が隠れた かつ ドラが隠れた / `hand` = 風が隠れた かつ 手牌が隠れた。いずれか真でカードを表示。ドラ・手牌の行は風が隠れた後にだけ加わる
- `SummaryCard` の props は `rows: {status, dora, hand}`。旧設計の `sheetOpen` と結果欄(`summary-card__result`、キーボード表示中だけ出ていた)は削除した(演算結果は要約に出さない)

1行目(`SummaryStatusRow`、`data-slot="summary-status"`):
  - 左: `formatWinds(table)`(例「東場・南家」)。typescale label-large
  - 右: ピル(背景は `--md-sys-color-on-secondary-container` の 16% の半透明、角 `--md-sys-shape-corner-full`)。積み棒・供託のピル = 自作点棒アイコン + 数値(`tabular-nums`)。ピルは `role="img"`・aria-label「積み棒 N」「供託 N」、中身は `aria-hidden`。**値が 0 でも表示する**
  - 点棒アイコンは pill の高さを変えずに縦横2倍(2rem。svg に `margin-block: -0.5rem`)
  - 抜き北: アイコンなしの「北 n」ピル(aria-label「抜き北 n」)。抜き北なしのルール(`isNukiEnabled(rule)` が偽)では出さない(props `nuki` が undefined)

ドラ行(`SummaryDoraRow`、`data-slot="summary-dora"`):
- ドラと裏ドラを横2列(grid で等分)。左にラベル「ドラ」、右にラベル「裏」。裏が空でも右の列は出す。各最大5枚

手牌行(`SummaryHandRow`、`data-slot="summary-input"`):
- 並びは「手牌 → 副露 → 和了牌」。副露は `meldTiles`(暗槓は両端が裏向き)、和了牌は手牌カードと同じ tertiary の枠(`summary-card__winning-tile`)で囲む

牌幅の一様縮小(ドラ行・手牌行):
- 牌の列が収まらないとき横スクロールにせず、行全体の牌幅を一様に縮める。ドラ行は左右2列を同じ幅に揃える
- 方式: `fitTileRow` が `--tile-width` を外して既定幅を測り、列の `scrollWidth - clientWidth`(はみ出し)を牌数で割って牌幅から引く(最大3回、複数列は最小値)。最小 10px
- `useFitTiles` が描画のたび(依存配列なしの `useLayoutEffect`)と、ResizeObserver による幅の変化時に測り直す
- 既定の牌幅 `--tile-width: 1.25rem` は `.summary-card__inner` に定義し、行側のインライン指定が効くようにする
- 三槓子の最悪ケース(暗槓3つ+手牌)でも破綻しないことはユーザーが監修で確認済み
- アイコン(§2 #14。自作):
  - 題材(§2 #21): 供託=千点棒で赤点1つ、積み棒=百点棒で黒点が縦2×横4(計8個)。棒は水平〜わずかに斜め
  - 赤の表し方(設計判断): **単一 path・塗りのみで、点の大きさと配置で区別する**(千点棒=中央に大きな点1つ、百点棒=小さな点 2×4)。色で赤を出す2層案は採らない
    - 比較: 2層案(棒の輪郭 path は `currentColor`、赤点 path は色トークン)は実物に近いが、(1) `SymbolIcon` の「viewBox 固定・path 1本・塗り」の前提を崩し、2色用の別部品が要る (2) MD3 のトークンに「赤」の意味の色は無く、近いのは `--md-sys-color-error` だけで、エラーの意味の色を装飾に流用することになる (3) 16dp では赤点が約 2〜3px になり、色だけでの識別は色覚差の影響を受ける。単一 path 案は既存部品のまま使え、形の違いで識別できる
    - 単一 path での表現: 点は棒の輪郭の内側を「抜く」(evenodd 相当の穴、または輪郭化した塗りの中の空白)形で描く。千点棒の点は直径を棒の高さの約 6 割、百点棒の点は約 2 割とする
    - 16dp での判別条件: 「大きな点1つ」と「小さな点の並び(または並びがつぶれた筋)」が見分けられること。百点棒の8点が 16dp で個々に分離して見えることまでは求めない(UI監修で確認)
  - 様式: `SymbolIcon` は `viewBox="0 -960 960 960"` 固定で path 1本を塗りで描く。よって **`0 -960 960 960` 座標系・単一 path・塗りのみ(線は輪郭化して塗りにする)** で作図する。太さは Material Symbols outlined の 400 weight 相当、角は丸める
  - 色: `SymbolIcon` の `currentColor` に任せ、色は親のトークン(`--md-sys-color-on-secondary-container`)で与える。HEX を書かない
  - サイズ: 要約では 2rem(監修で 16dp から縦横2倍。pill の高さは負の margin で保つ)
  - 置き場所: `src/ui/icons/custom-paths.ts`(新規)に `CUSTOM_HONBA_STICK`・`CUSTOM_DEPOSIT_STICK`(名前は変えてよい)。ファイル冒頭に「出典: 本プロジェクトで自作」と明記し、`index.ts` から export
  - UI監修でユーザーが見た目を確認し、差し戻すことがある(差し替えはこの定数で完結させる)
- 入力側のステッパー(積み棒・供託)の見出しは現行の文字のまま変えない(§2 #8)
- 既知事項: localYaku 有効時、天和・地和の入力は十三不搭の入力も兼ねる(仕様 §4.2.2、`result.ts` の `shisanputaHoras`)。ラベルに十三不搭は加えない(仕様が専用入力を設けないとしているため)

## 7. 受け入れ条件

単体テストは `npm test`(純関数・reducer・`renderToStaticMarkup`)、画面確認は dev サーバー(01号の禁止事項に従う)。375×812 で確認する。

| ID | 手順 | 合格条件 |
| --- | --- | --- |
| C1 | `situation-rules.test.ts`: `composeRiichi`/`splitRiichi` を base3×open2 で往復 | 6通りが仕様どおり。`composeRiichi('none', true)==='none'` |
| C2 | `isSituationKeyVisible`/`Enabled` を rule.ippatsu・localYaku の真偽と riichi none/riichi で網羅 | §5.1 の定義どおり |
| C3 | `tenhoLabel`: seat east/south/west × localYaku 真偽 | 東=「天和」、南・西=「地和/人和」(真)/「地和」(偽) |
| C4 | `normalizeHandOptions`: openRiichi=false で open-riichi/open-double-riichi、ippatsu=false ルール、riichi='none'+ippatsu=true、localYaku=false+燕返し/槓振り真 | §5.1 (1)〜(3) のとおり。変化なしの入力は同一参照(`toBe`) |
| C5 | reducer: `set-wind` round/seat | `table` が更新、同値で同一 state、`handOptions`・`input`・`inputFocus`・`tenkeyBuffer` は参照同一 |
| C6 | reducer: `set-riichi` | openRiichi=false で 'open-riichi' を送ると 'riichi' になる。'none' を送ると ippatsu=false。現在値と同じ値を送ると同一 state。`input`・`inputFocus`・`tenkeyBuffer`・`table` は参照同一 |
| C7 | reducer: `set-situation` | 立直なしで ippatsu=true は無視(同一 state)。localYaku=false で燕返し true は無視。false はいつでも受ける。現在値と同じ値で同一 state。`input`・`inputFocus`・`tenkeyBuffer`・`table` は参照同一 |
| C8 | reducer: `set-rule` / `clear-all` | openRiichi 真→偽で 'open-double-riichi'→'double-riichi'、続けて偽→真にしても 'double-riichi' のまま。ippatsu ルール偽で ippatsu=false、真に戻しても false のまま。localYaku 偽で燕返し・槓振り false、真に戻しても false のまま。nuki の既存正規化も維持。`clear-all` 後 `handOptions` が初期値で `table` 不変 |
| C9 | 画面: 風セグメント | 「場風」「自風」の見出しと東南西が見える。375px で各ボタンの見た目の高さ 40(`getBoundingClientRect()`)、当たり判定は `getComputedStyle(el,'::after').height` ≥ 48、またはボタン上端・下端の 4px 外側の点で `document.elementFromPoint` が当該ボタンを返す。幅 ≥ 48。見出しの computed font-size が `.stepper__label` と一致。自風=南を押すと要約1行目が「東場・南家」 |
| C10 | 画面: 状況役シート | 状況役カードを押すとシートが開き、見出し「立直」「偶然役」の2区画(`<section aria-label>`)が並ぶ。立直区画の ChipSet に「なし・立直・ダブル立直」の chip があり、openRiichi 有効時は「オープン」chip も同じ ChipSet(375px で同じ行、幅が足りなければ折り返し)にあり、偶然役の ChipSet には無い(静的描画テストでも確認)。ダブル立直 chip とオープン chip の host 間隔は、他の隣接 chip 間隔(8px)の倍の 16px。同一行で隣接する chip の host 間隔 ≥ 8。区画間の間隔 24px(1.5rem)。各 chip のタッチ領域の高さ 48(shadow 内 `.touch` の実測値を記録)。**縦に並ぶ chip のタッチ領域の重なりは受け入れた例外(§6.3)として判定しない** |
| C11 | 画面: ルール出し分け | 既定ルール(一発あり・openRiichi なし・localYaku なし): 一発あり、オープン・燕返し・槓振りなし、子で「地和」。次に localStorage の `mj3calc.rule`(`src/core/rule-storage.ts` の `RULE_STORAGE_KEY`)に、既定ルールの `openRiichi`・`localYaku` を true、`ippatsu` を false にした JSON を書いてリロード: オープン・燕返し・槓振りが出て、一発が消え、子で「地和/人和」。ルール変更時の値の正規化は C8 で担保する。**D6 までの仮置き(§12)中は、localStorage の値によらず openRiichi・localYaku が真になるため、画面では `ippatsu=false` で一発が消えることと、オープン・燕返し・槓振り・「地和/人和」が出ることだけを確認し、既定ルール側(偽)の出し分けは C2・C3・C14 の単体テストで担保する** |
| C12 | 画面: 一発・オープンの無効 | 立直=なしで一発 chip とオープン chip が disabled。立直を選ぶと有効、一発を選んだ後「なし」に戻すと一発が外れる |
| C13 | 自動テスト: 結果連動 | reducer で和了形の state に `set-riichi 'riichi'`→`set-situation ippatsu true` を適用し、`computeResult`(`src/ui/calc/compute.ts`)の `hora[].yaku` に riichi・ippatsu が含まれる。`seat='east'`・副露なし・和了形で `set-situation tenho true` → tenho が含まれる。画面では同操作で結果がエラー表示(計算できません)にならないことまでを確認する(役一覧の表示は Epic E) |
| C14 | 描画テスト: 状況役カード | `SituationCardContent` に立直+一発+海底/河底を与えた `renderToStaticMarkup` に「立直・一発・海底/河底」。シートの chip ラベル(view-model)に「海底/河底」、子・localYaku で「地和/人和」。空で「なし」。選択中で `situation-card--selected` が付き、`data-sheet-opener` が無い |
| C15 | 画面・描画テスト: 要約1行目 | 描画テスト: `SummaryStatusRow` の静的描画に「東場・東家」、`role="img"` で aria-label「積み棒 0」「供託 0」。`nuki` を与えると「北 n」と aria-label「抜き北 n」、undefined なら抜き北のピルが無い。状況役は出ない。画面: 風セグメントが隠れるまでスクロールして要約カードを出し、ステッパーで積み棒2にすると「2」。抜き北なしのルールで抜き北のピルが無い |
| C16 | 画面: 案内なし | シート・カードに抜き北に関する説明文が無い |
| C17 | 静的検査 | `npm run lint`・`typecheck`・`format:check`・`test` 成功。新規・変更 CSS(`main-screen.css`・`situation-sheet.css` ほか本 Issue で触れた CSS)に HEX 色・ms・cubic-bezier の直書きが無い |
| C18 | バンドル | `npm run build` の gzip 合計を D4 時点と比較して記録し、§9.2 の見込みとの差を PR に記載する。予算は目標値扱いで、超過量の記録のみとし軽微な超過では不合格にしない(§9.5) |
| C19 | 計算値: 選択中規則 | 状況役シートを開いた状態で `.situation-card` の computed `background-color` が `--md-sys-color-primary-container` の計算値と一致(D4-C29 相当)。CSS 上 `.situation-card.situation-card--selected` が基底規則より後または高い詳細度 |
| C20 | キー操作: 状況役カード本体 | 4通り: 非選択中 Enter → シートが開く/非選択中 Space → 開く・スクロールしない/選択中 Enter → 何も起きない(シートは開いたまま)/選択中 Space → 何も起きない。ハンドラは純関数(`handleSituationBodyKey` 等)として単体テストし、画面でも確認する |
| C21 | CSS 検査(自動)・計算値 | 自動: `situation-sheet.css` に `row-gap` の指定が無く、`.situation-double` に `margin-inline-end: 0.5rem` がある。`main-screen.css` に `.wind-segment .connected-button::after` がある。画面: `.situation-sheet` の computed gap 24px、`.situation-section` の gap 8px、`.situation-chips` の computed row-gap が既定値(8px) |
| C22 | 画面: ヘッダと要約の段階表示 | ヘッダはスクロールしても上端に残る。最上部では要約カードは非表示(`data-visible="false"`)。風セグメントがヘッダ下端で 10% 未満しか見えなくなると1行目だけが出る。さらにドラ表示カードが隠れるとドラ行、手牌カードが隠れると手牌行が加わる(風が見えている間はドラ・手牌が隠れても出ない)。要約カードはヘッダ直下(`top` = ヘッダ高さ)に固定され、表示切替で本文の位置が変わらない(切替前後で入力欄の `getBoundingClientRect().top` が同じ) |
| C23 | 画面・計算値: 要約の見た目 | `.summary-card__inner` の computed 背景色・文字色が `--md-sys-color-secondary-container`・`--md-sys-color-on-secondary-container` の計算値と一致し、box-shadow がある。点棒アイコンの svg が 32px で、pill の高さがアイコン導入前(数値のみの行高)と同じ |
| C24 | 画面: ドラ行・手牌行 | ドラ行に「ドラ」「裏」のラベルと2列があり、裏が空でも右列が出る。手牌行が「手牌 → 副露 → 和了牌」の順で、暗槓は両端が裏向き、和了牌が tertiary の枠で囲まれる |
| C25 | 画面: 牌幅の一様縮小 | 375px で暗槓3つ+手牌、およびドラ・裏各5枚のとき、各列の `scrollWidth <= clientWidth`(横スクロールが出ない)、行内の牌幅がすべて等しく(ドラ行は左右で等しく)10px 以上。収まる場合は既定幅(1.25rem)。画面幅を変えると測り直される |
| C26 | 描画テスト・画面: radio chip | 立直区画で選択中の chip(例「立直」)を押しても選択が外れず、`handOptions.riichi` が変わらない。別の chip を押すとそれに切り替わる。`Chip.tsx` の `radio` 未指定の chip(偶然役)は従来どおり押すと解除される |
| C27 | コード確認: 仮置きルール | `AppStateProvider` の初期化だけが openRiichi・localYaku を上書きし、core の規定値(`src/core` のルール既定値)は変わっていない(`git diff main -- src/core` に規定値の変更が無い)。仮置きであることと D6 で削除することがコメントにある |

## 8. テスト方針・UI監修・実機確認

- テスト: 純関数と reducer は単体テストで網羅(C1〜C8・C13・C20)。描画は `renderToStaticMarkup`+props 駆動の表示部品(§4)で行い、jsdom/Testing Library は追加しない。md-filter-chip の `selected`/`disabled` が静的マークアップに属性として出るかは未確認のため、シートの出し分け・disabled 判定は表示部品に渡す props を作る純関数(view-model。例 `situationSheetModel(handOptions, table, rule)` が chip ごとの `{key,label,selected,disabled}` を返す)を単体テストして判定する
- UI監修項目(追加): 自作点棒アイコンの意匠(供託=大きな点1つ、積み棒=小さな点 2×4。赤は色でなく形で表す。§2 #21・§6.4)
- UI監修項目(統括→ユーザー): 風セグメントの横並びの見え方、chip 群の並びと折り返し、要約1行目の自作点棒アイコン(判別性・MD 様式との調和。差し戻し時は path 定数の差し替え)、状況役カードの空表示
- UI監修の実施結果: 2026-11-10 にユーザーの直接監修を実施し、§13 の変更を加えた(三槓子の最悪ケースの一様縮小はユーザーが確認済み)
- 機械検証と画面確認の区別: 自動(`npm test`)= C1〜C8・C13・C14・C15(描画)・C17・C19(CSS 規則順)・C20(純関数)・C21(CSS 検査)・C26(view-model/静的描画の範囲)。画面確認 = C9〜C12・C15(画面)・C16・C18・C19(計算値)・C21(計算値)・C22〜C25・C26(操作)。C27 はコード確認
- 実機確認項目(逆発注): 375px 実機で風セグメントが1行に収まるか、chip のタップしやすさ、ダークテーマでのピルのコントラスト
- 実挙動未確認: md-filter-chip の touch target 高さ(C10)。要約カードの段階表示・一様縮小の実機(iOS Safari 等)での挙動

## 9. バンドル予算の積算

### 9.1 現状(実測。統括担当計測、main=ad1e7c6)

| 対象 | gzip |
| --- | --- |
| 初回 JS `index-*.js` | 114,553 B(gzip -9。vite 表示 114.88 kB) |
| 遅延チャンク `compute-*.js` | 9.63 kB |
| WASM | 30.21 kB |

- 現予算 102,000 B(issue-40 §2.7 の3倍則由来)。初回 JS の推移: D1 102,878 → D2 108,757 → D3 111,273 → D1-1 約 111,600 → D4 約 113.8〜114.1 kB
- 運用(ユーザー見解): 予算は「必要に応じて積み上げるもの・不要なバンドルを組み込ませない歯止め」。目標値として扱い、軽微な超過では検収を不合格にせず、超過量を PR に記載する

### 9.2 D5 の積算(見込み増分の内訳。未実測)

| 内訳 | 見込み | 根拠 |
| --- | --- | --- |
| 状態・純関数・WindSegment・SituationCard・要約1行目・自作アイコン path | 約 +2 kB | D3(+2.5 kB)・D4(+2.3 kB)の実績と同規模の UI/ロジック |
| 偶然役トグルの部品 | §9.3 の選択で +1〜7 kB | 下記 |
| 合計 | 約 +3〜9 kB → 初回 JS 約 117〜123 kB | — |

### 9.3 偶然役トグル: md-filter-chip と自作トグルの比較(無駄遣いの判断)

| 観点 | A: `md-filter-chip`+`md-chip-set`(ラッパー `FilterChip`/`ChipSet` 経由) | B: `expressive` に自作トグル(`aria-pressed` の button) |
| --- | --- | --- |
| 増分見込み | +4〜7 kB(上限側は単独導入の見積り) | 約 +1 kB |
| 依存の共有(コード読み) | chip の import は `lit`・`ripple`・`focus-ring`・`elevation`・内部の aria 委譲/イベント再送出。うち ripple・focus-ring は既存ラッパー(Ripple・FocusRing)、elevation は `md-menu`(ヘッダーメニュー)で既に本番に入っている。新規に入るのは chip 本体(chip/multi-action-chip/filter-chip/chip-set)とそのスタイル群が中心のため、実増分は見積り下限(+4 kB 前後)寄りの見込み | 既存の Ripple・FocusRing・shape-morph を再利用 |
| 06号4 との関係 | 適合(Material Web で表現できる部品はラッパー経由で使う) | 不適合(06号4は「Material Web で表現できない Expressive 部品」に限り自作を認める。filter chip は表現できる) |
| D6 以降の再利用 | 設定画面のルール項目は `rule-items.ts` 上 `select`・`number`・`switch` の3種のみで、chip を使う項目は無い。`Switch`/`Select` とは ripple・focus-ring・elevation 等の基盤を共有するが、chip 固有コードの再利用見込みは現時点で無い。D6 で設定画面を遅延読み込みにする場合、共有基盤は初回 JS に残るので D6 側の削減量には影響しない | 同上(再利用見込みなし) |
| dev 限定 MdGallery が chip を使っていること | ラッパーと型が既にあり、Material Web の版固定下で描画確認済みの部品であることを意味する。ただし dev 限定の遅延読み込みなので、本番バンドルには今まで含まれておらず、本番では初導入になる | — |
| 保守 | 見た目・状態(selected/disabled)・touch target を Material Web に任せられる | 選択状態の見た目・タップ領域・フォーカスを自前で保守 |

**決定: A(md-filter-chip)。§2 #17。** 理由: (1) 06号4 の必須制約に適合し、B は規約違反になる。(2) 依存の大半(lit・ripple・focus-ring・elevation)は既に本番に入っており、新規に入るのは chip 固有部分だけで、使う部品に対して必要な分しか増えないため「無駄遣い」には当たらないと判断する。(3) 差(約 +3〜6 kB)は B の規約例外化と自前保守のコストに見合わない。なお chip 固有コードは D5 でしか使わない見込みであることは事実として PR に記載する。実増分は C18 で計測し、見込み(+4〜7 kB)を大きく上回る場合は統括担当に報告する

計測手順(C18): `npm run build` 後、`gzip -9 -c dist/assets/index-*.js | wc -c` を取り、114,553 B との差を記録する

### 9.4 参考: 予算値の選択肢(D5 では決めない)

予算値は課題ごとに再計算する想定(§2 #15)のため、以下は参考として残す。

| 案 | 内容 | メリット | デメリット |
| --- | --- | --- | --- |
| 段階予算 | 目標 120 kB・上限 150 kB | 「積み上げ」と「歯止め」を両立 | 2値の運用ルールを文書化する手間 |
| 単純引上げ | 予算値を現実(例 120 kB)に引き上げ | 最小工数 | 次の Issue ですぐ再超過し得る |
| 現行維持 | 102,000 B のまま目標扱い | 文書変更なし | 毎回「超過」報告が続く |

- D6 での設定画面遅延読み込み: 設定画面(Select・Switch 等)を `React.lazy` で別チャンクにすれば、それら固有の部分は初回 JS から外れる。削減量は未計測のため D6 設計時に計測する

### 9.5 予算改訂の文書と D5 の検収

- 監修で要約カード(ドラ行・手牌行・一様縮小・段階表示)と radio chip が加わったため、§9.2 の見込みは監修前のもの。統括の暫定実測(UI監修終了時点、`gzip -9`)は 122,100 B(基準 114,553 B から +7,547 B)。正式な再計測は検収(C18)で実施する

- 予算改訂の文書は D5 の対象外とし、別途協議する(§2 #16)
- D5 の検収は超過量の記録のみとする。予算は目標値扱いで、軽微な超過では不合格にしない。超過量と §9.2・§9.3 の積算との差を PR に記載する

## 10. ユーザー確認事項(質問)

- Q-A・Q-A': 2026-11-10 回答済み(§2 #15・#16)
- Q-1〜Q-7: 2026-11-10 回答済み(§2 #8〜#14)
- Q-8・Q-9: 2026-11-10 回答済み(§2 #18・#19)
- 偶然役トグルの部品: 2026-11-10 回答済み(§2 #17)

- Q-10・Q-11・Q-12: 2026-11-10 回答済み(§2 #19〜#22)

未回答の質問は無い。

## 11. livewing との差異

参照: livewing/mahjong-calc の `src/components/HandOptions.tsx`(入力)・`src/components/InputGlance.tsx`(要約)。三麻の確定仕様(mahjong-rules.md)と 07号を優先し、採用はユーザー確認事項に分ける。

| 観点 | livewing | 本設計 | 扱い |
| --- | --- | --- | --- |
| 並び順 | 立直 → 一発 → 嶺上開花 → 槍槓 → 海底/河底 → 天和/地和 | 同順(オープンは立直区画内、燕返し・槓振りを末尾) | 一致。変更なし |
| 部品 | 各項目が「なし/役名」の2択セグメント+見出し | 立直は3択の radio chip+オープン chip、他は FilterChip。区画見出し「立直」「偶然役」 | 確定事項 Q1・監修(§2 #24) |
| 天和/地和のラベル | 自風東=天和、他=地和 | 同じ(localYaku 時は「地和/人和」) | 一致(人和は仕様 §4.2.2 による追加) |
| 一発の有効条件(入力) | 常に操作可(立直なしでも選べる) | 立直なしで disabled・false 化 | 確定事項 Q3 に従う。変更なし |
| 入力の排他 | なし(どの組合せも入力可) | 一発⇔立直のみ | 確定事項 Q3・Q-3・Q-4 と整合 |
| 要約の表示条件 | 入力値をそのまま出さず、効く役だけ表示: 天和選択中は他を出さない/立直・一発は門前(暗槓のみ許容)時のみ/嶺上開花は槓があるときのみ/海底/河底はダブル立直+一発のとき出さない/天和・地和は副露なしのときのみ | 入力どおりに表示 | 採らない(Q-8 回答済み。§2 #18)。参考: 採る場合は、嶺上開花の条件は三麻では「槓あり **または抜き北≥1**」(仕様 §2 抜きドラ(嶺上開花))、ダブル立直+一発と海底の関係は仕様 §4.1.1 に合わせる必要があり、livewing の条件はそのまま使えない |
| 海底・河底のラベル | 1項目「海底/河底」相当 | 「海底/河底」 | 一致(§2 #19) |
| 要約の風 | 「東場 · 東家」相当を中黒で連結 | 「東場・南家」 | 一致 |
| 要約の表示 | 常時表示の要約 | 風が隠れてから段階表示(風→ドラ→手牌)、牌は一様縮小 | 監修による独自仕様(§2 #26・#27) |

## 12. 後続 Issue への引き継ぎ

- D6(設定): `set-rule` が `handOptions` を正規化する。設定画面側で別途正規化しない
- **D6 で削除すべき仮置き**: `src/ui/state/AppStateProvider.tsx` の初期化で `openRiichi`・`localYaku` を強制的に true にしている(コミット 6404a90。revert で戻す)。core の規定値は変えていない。D6 の検収で、保存済みルールがそのまま初期 state になることを確認する
- Epic E(結果): ツモ／ロンの並記は結果側。`haitei` はツモで海底・ロンで河底として core が返す
- 仕様改訂(統括担当): §2 #5(抜き北の案内は出さない)を issue-12 §8 の扱いとして requirements/仕様へ反映するか判断

## 13. UI監修による変更履歴

977244c(設計承認)以降、ユーザーの直接監修(画面を見ながらの指示)で加えた変更。いずれも変更理由はユーザーの指示。

| # | 変更 | 対応コミット |
| --- | --- | --- |
| 1 | 設計どおりの初期実装(状態・純関数・画面部品・要約1行目・点棒アイコン) | 481e6fc・d1c7b53 |
| 2 | ヘッダを常時表示にし、要約カードをその直下に固定。要約カードを段階表示(風→ドラ→手牌)にし、点棒アイコンを縦横2倍 | 51d25a8 |
| 3 | 要約カードは風が「ほとんど見えなくなってから」(見えている割合 10% 未満)表示する(`useInView` の `minRatio`) | 3f82708 |
| 4 | 要約カードを secondary-container と影で本文から際立たせる | 126ae58 |
| 5 | 要約カードに抜き北・副露・和了牌を表示し、結果欄(`summary-card__result`)と `sheetOpen` を削除 | fc67094 |
| 6 | 手牌行の一様縮小とドラ・裏ドラの2段化(一度取り消して再適用) | 3261584・7718408・645b7f1 |
| 7 | ドラと裏ドラを横2列にし、手牌行の再フィットを毎描画で行う。ドラ・裏ドラも一様縮小 | 3b7b857・9d20e0d |
| 8 | 立直を専用グループ(ConnectedButtonGroup)でなく chip の単一選択にする(`FilterChip` の `radio`)。旧 C10 の間隔の矛盾が解消 | bbd6699 |
| 9 | 設定画面(D6)まで openRiichi・localYaku を有効にして起動する仮置き(D6 で revert) | 6404a90 |
| 10 | 状況役シートに見出し「立直」「偶然役」を付け、chip の行間を既定に戻す(縦のタップ領域の重なりは受け入れた例外) | 5e2630f |
| 11 | オープンを立直3択と同じ行に戻し、ダブル立直との横の隙間だけ倍にする | 1cc6875 |
| 12 | 監修用の仮の長文(結果パネルの空状態)を入れて取り除いた(最終状態に影響なし) | 4deceb2・9cf90f5・69b0e82 |
