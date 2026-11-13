# Issue #88 F1. 打牌候補の一覧(v1) 設計書

- 親: Epic F(#7)
- 依存: E1(#75)・E2(#76)・E3(#77)・E4(#78)(いずれもマージ済み)。**main `13bf0bf` を起点とする。** E1 の `classify.ts`(`kind: 'discard'`)・`ResultBody`・`ResultGlance`、E2 の `hora-summary.ts`(`isNoYaku`・`formatNumber`)、E3 の待ちの組(`.result-body__wait`)、E4 の `summarizeAcceptance`・見出し(`.result-body__title`)・バッジ(`.result-glance__badge`)を前提にする
- 並行: F1-1(#89。牌タップ)が `slots.tsx`・`result.css` を触る(4章)
- ブランチ: `claude/issue-88-discard-list-7a4e07`(統括担当の指定に従う)
- 版: 第2版(2026-11-14)

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- `gh issue view 88`(範囲・含まない・未決事項)、`docs/issues-draft.md` の F1、`docs/requirements.md` §3.4
- 設計書: [issue-78-shanten-result.md](issue-78-shanten-result.md)(E4。書式・`summarizeAcceptance`・9章のバッジとバナーの流儀)、[issue-77-tempai-result.md](issue-77-tempai-result.md)(E3)、[issue-76-hora-result.md](issue-76-hora-result.md)(E2)、[issue-75-result-switch.md](issue-75-result-switch.md)(E1)
- 実装: `src/ui/result/slots.tsx`(`DiscardBody`・`DiscardGlance` の仮表示、`ShantenBody`・`TempaiBody`・`GlanceTiles`・`HoraGlance` の13枚形の待ちの重複除去)、`hora-summary.ts`、`result.css`、`ResultBody.tsx`・`ResultGlance.tsx`、`e4-shanten.test.tsx`
- core(読むだけ): `src/core/result.ts` 53〜77行(`Discard`・`DiscardShanten`)と 295〜351行(14枚の分岐。`minsBy` で最小向聴の候補だけを返す)、`src/core/tile/index.ts` 92行(`compareTiles`)、`src/core/payment.ts`(`total` は本場・供託を含まない。加算は `bonus`)
- 参考実装(読み取り専用。相対パス): `../ref-repo/mahjong-calc`(livewing)の `src/components/DiscardItem.tsx`、`../ref-repo/mj-mighty-calc` の `src/core/analysis.ts` 250〜299行・`src/ui/AnalysisPanel.tsx` の `formatDiscardRange`(**GPL。コードは移植せず、挙動の仕様だけを使う**)
- 業務標準 01・02・06・07・09、指導文書 G-04・G-08・G-10・G-11

### 1.2 確定事項(オーナー決定。再検討しない)

| # | 内容 |
| --- | --- |
| 1 | 範囲: 打牌候補ごとに、打牌の牌と、打牌後の状態を出す。向聴(`next.type === 'hora-shanten'` かつ `info.type === 'shanten'`)の候補は「N種 M枚」(`summarizeAcceptance` を再利用。赤五と通常五は同じ1種)と有効牌「牌×N」(`count > 0` のみ。E3・E4 と同じ並べ方・表記)。聴牌・和了になる候補(`next.type === 'tempai'` または `info.type === 'hora'`)は、待ち牌(牌のみ。枚数なし。`horaTile` の重複除去・牌順。`tempai` 型は `count > 0` のみ)と打点のレンジ。livewing の `DiscardItem` 準拠(聴牌候補に枚数を出さないのも livewing と同じ)。**core は変更しない** |
| 2 | 見出し: 一覧の先頭に「N向聴」または「聴牌」を1つ出す。core が最小向聴の候補だけを返し全候補が同じ向聴数なので、向聴数ごとの区切り・候補ごとの向聴バッジは作らない。E4 の `result-body__title` の流儀 |
| 3 | 並び順: 全候補が向聴のとき、受け入れ枚数(`count > 0` の合計)の降順、同数は牌順(`compareTiles` と同じ順)。聴牌・和了のときは core の順のまま |
| 4 | バナー(`DiscardGlance`): E4 のバッジ(`result-glance__badge`)「N向聴」または「聴牌」+打牌の牌(`GlanceTiles`)。省略せず全件、本体と同じ順。聴牌のバッジは E3・E4 と同じ扱い |
| 5 | 打点のレンジ: mj-mighty-calc の挙動に合わせる。待ち牌(`horaTile`)ごとにロン・ツモ両方を見て、役がつく側の受け取り合計(`score.payment.total`。本場抜き)を集め、ロン・ツモ混在の最小〜最大。表記は `（5,200〜12,000点）`、最小=最大なら `（5,200点）`。ロンもツモも役なしになる待ち牌が1つでもあるときだけ「役なし/」を前置(`（役なし/1,000〜3,900点）`)。全待ちがそうなら「役なし」のみ。片側だけ役なしの待ちは、役なし側の点を除いてレンジに入れ、前置しない。役満の印は付けない(数字のみ)。役なし判定は E2 の `isNoYaku`。レンジの計算は純関数にして、初回 JS に含まれる側(`hora-summary.ts` の流儀。遅延チャンクのモジュールを import しない)に置く |
| 6 | 含まない: 振聴、聴牌確率・期待値(F3)、牌タップ操作(F1-1 = #89)、core の変更 |
| 7 | 色はトークン(HEX 直書き禁止。06号)。UI 文言は日本語。見ればわかる説明書き・ラベルは省略(「打」「待ち」「受け入れ」等のラベルを付けない)。E4 の UI 監修で確定した流儀(バッジ・折り返し・バナーの高さ等)に揃える |

### 1.3 参考実装の照合(2026-11-14 に実物を確認)

| 論点 | livewing `DiscardItem.tsx` | mighty `analysis.ts`・`formatDiscardRange` | F1 |
| --- | --- | --- | --- |
| (a) 待ち牌 | `tempai` は `count > 0` の牌、`hora` は `hora.map(h => h.horaTile)`、向聴は `count > 0` の有効牌。いずれも `sort(compareTiles)` → `uniqueSorted`(赤五は別の牌として残る) | 打牌後に和了形になる待ちだけ | 確定事項1。聴牌候補は牌のみ、向聴候補は「牌×N」(E4 と同じ) |
| (b) 種類・枚数 | 向聴のときだけ「N 種」「N 枚」 | 全候補で残り枚数の合計 | 確定事項1(向聴のみ。`summarizeAcceptance`) |
| (c) 打点 | 待ちごとでなく `hora` 全件の min/max(ロン・ツモ混在)。「懸賞役のみ」(dora・red-dora)の和了が1件でもあれば「役なし / 」を前置 | 待ちごとにロン・ツモの最高点を集めて min/max。ロン・ツモとも役なしの待ちがあれば「役なし/」。全待ちが役なしなら `役なし`(括弧なし) | 確定事項5(mighty の挙動) |
| (d) 並び | core の順(`minsBy` の結果) | 残り枚数の降順、同数は牌番号順。打牌後に待ちのない候補を除く | 確定事項3 |
| (e) ラベル | 「打」「待ち」/「受け入れ」 | 行の中にラベルなし | 確定事項7(付けない) |

### 1.4 実行して確かめた事実

使い捨てテスト(`src/ui/result/` に一時ファイルを置き、`e4-shanten.test.tsx` の補助関数〔`southTable`・`defaultOptions`・`parseTiles`〕で `generateResult` を呼び、`console.log` で出力。実行後に削除済み)で 2026-11-14 に実測した。`DEFAULT_RULE`(赤 5p・5s 各1)、場東・自風南(子)、状況なし、ドラ表示なし、抜き北0。牌の表記は `0s` = 赤5索。点は `score.payment.total`。「役」= `isNoYaku` が false、「役なし」= true。

| ID | 手牌(14枚)・副露 | core の `discards`(core の順) | 本機のレンジ表記(2.2 の規則) |
| --- | --- | --- | --- |
| D1 | `123p456p789s11z345z` | 3z: 1向聴 `[1z:2, 4z:3, 5z:3]` / 4z: 1向聴 `[1z:2, 3z:3, 5z:3]` / 5z: 1向聴 `[1z:2, 3z:3, 4z:3]` | (向聴。レンジなし)各「3種 8枚」。並び替え後も 3z・4z・5z |
| D2 | `1199p1199s1234z56z` | 1p・9p・1s・9s: 2向聴 `[1m:4, 9m:4, 7z:4]`(各12枚) / 1z〜6z: 2向聴、自分以外の字牌5種×3(各15枚) | 並び替え後: 1z,2z,3z,4z,5z,6z,1p,9p,1s,9s(**core の順と異なる**) |
| D3 | `123p456p789s11z34z9p` | 3z: 1向聴 `[7p:4, 8p:4, 9p:3, 1z:2, 4z:3]`(5種16枚) / 4z: 同形(5種16枚) / 9p: 1向聴 `[1z:2, 3z:3, 4z:3]`(3種8枚) | 並び 3z・4z・9p |
| D4 | `234p567p34s678s99p1z` | 1z: hora{2s ロン1000 役/ツモ1100 役、5s ロン1000/ツモ1100 役、0s ロン2000/ツモ2000 役} | 待ち 2s・5s・0s、`（1,000〜2,000点）` |
| D5 | `123p789p12s789s11z5z` | 5z: hora{3s ロン2600 役(chanta)/ツモ3000 役} | 待ち 3s、`（2,600〜3,000点）` |
| D6 | `123p456p789s12s99p1z` | 1z: hora{3s ロン700 **役なし**/ツモ800 役(tsumo)} | 待ち 3s、`（800点）`(片側だけ役なし。前置しない) |
| D7 | `234s678s55z99s1z`・ポン 1p | 1z: hora{9s ロン500 役なし/ツモ600 役なし、5z ロン1000 役(white)/ツモ1100 役} | 待ち 9s・5z(`compareTileOrder` の順。core の `hora` の順も 9s → 5z。第2版で再実行して確認)、`（役なし/1,000〜1,100点）` |
| D13 | `123p1z5z`(5枚。部分入力) | 1z: **tempai** `[5z:3]` / 5z: **tempai** `[1z:3]` | 見出し・バッジ「聴牌」、各行は待ち牌だけ(1z の行に 白、5z の行に 東)でレンジなし |
| D8 | `234s678s99s22p1z`・ポン 1p | 1z: hora{2p ロン500/ツモ500、9s ロン500/ツモ600。すべて役なし} | 待ち 2p・9s、`役なし` |
| D9 | `1m9m19p19s123456z1z2p` | 2p: hora{7z ロン32000/ツモ24000。kokushi、`yakumanPoint` 1} | 待ち 7z、`（24,000〜32,000点）`(役満の印なし) |
| D10 | `123p456p789p34s15z0s` | 1z: hora{5z ロン5200/ツモ5900} / 5z: hora{1z ロン5200/ツモ5900} | 各 `（5,200〜5,900点）` |
| D11 | `234p567p34s678s0s5s1z` | 8s: hora{1z ロン1300 役なし/ツモ1500 役} / 0s: hora{1z ロン700 役なし/ツモ800 役} / 5s: hora{1z ロン1300 役なし/ツモ1500 役} / 1z: hora{2s 3900/3900、5s 3900/3900、8s 2600/3000} | 8s `（1,500点）`、0s `（800点）`、5s `（1,500点）`、1z 待ち 2s・5s・8s `（2,600〜3,900点）`。**赤5索と5索が別候補**で結果も違う |
| D12 | `1111p456p789s111z2z` | 1p: hora{2z ロン1600/ツモ2400} / 2z: **hora{}(空)** | 1p `（1,600〜2,400点）`、2z は待ちなし(2.3 の「和了牌なし」) |

- 期待値の出典(07号): 点数は core の計算結果を実行して確かめた事実であり、本 Issue は表示の整形だけを行う(新たな点数・ルール解釈を入れない)。点数表との個別照合はしていない(E2 で core の点数は検証済み)。テストの期待値はこの表を出典とする。
- D4 の手牌は E3-07 の13枚 `234p567p34s678s99p`(既存テストで待ち 2s・5s・0s を確認済み)に 1z を足したもの。待ちの集合が E3-07 と一致することを確認した。
- 和了形の14枚(例 `234p567p34s678s99p2s`)は core が `hora-shanten`(hora)を返し E2 の表示になる。`discard` に来るのは非和了の14枚(3n+2 枚)だけ。13枚の just-hora 判定は core 側(`tempai` に最後の牌が含まれるとき)。
- `tempai` 型の候補が現れる条件(第2版で実コードに合わせて整理): `result.ts` 286行の分岐は `hand.length % 3 === 2`。手牌+副露が14枚相当の入力は1枚切ると13枚相当になり、core は打点まで計算する(166行・236行の分岐)ため `next.type === 'tempai'` は返らない。`tempai` 型は、手牌+副露が14枚未満の 3n+2 枚(5・8・11枚の部分入力)で、1枚切って聴牌になり、最後の牌が待ち牌でない場合に現れる(265行)。D13(5枚)で実際に再現した。全0枚の `tempai` 候補はテストで値を手で与えて確かめる。
- 候補0件: core は打牌候補に最後の牌を必ず加え、`minsBy` は空でない配列から1件以上を返すため、`discards` は空にならない(`result.ts` 331〜351行)。空配列は防御的に扱う(2.3)。

### 1.5 ルール解釈(07号)

- 新たな麻雀ルールの解釈を組み込まない。向聴数・有効牌・残り枚数・和了の点は core の値、役なしの判定は E2 の `isNoYaku`(役満なし・通常役が懸賞役〔dora・red-dora・nuki-dora・ippatsu〕だけ)をそのまま使う。
- `isNoYaku` と mighty の役なし判定(`ok`)の差: 本機は一発・抜き北を懸賞役として役に数えないが、mighty は自機のルール定義に従う。一発は立直と同時にしか付かず(立直が役になる)、抜き北は両者とも懸賞役のため、実際の表示が分かれる牌姿は想定しにくい。**どちらにしても本機は E2(バナー・本体の「役なし」)と同じ `isNoYaku` に揃える**(本機の中での判定の一貫性を優先。mighty の挙動に合わせるのは集計と表記)。
- 振聴(打牌した牌が待ちに含まれる等)は扱わない(確定事項6)。mighty は振聴の候補で捨てた牌を待ちに足すが、本機は core の `hora` をそのまま使う。

## 2. 設計

### 2.1 モジュール構成

| ファイル | 変更 | 内容 |
| --- | --- | --- |
| `src/ui/result/discard-summary.ts` | 新規 | 純関数(2.2)。初回 JS 側。import は `../../core/*` の `import type`、`./hora-summary`(`isNoYaku`・`formatNumber`)、`./slots` の `summarizeAcceptance` は**使わない**(循環を避けるため、`summarizeAcceptance` は 2.3 の部品側で呼ぶ) |
| `src/ui/result/discard.tsx` | 新規 | `DiscardBody`・`DiscardItem`・`DiscardGlance`(2.3・2.4)。`./slots` から `GlanceTiles`・`summarizeAcceptance` を import |
| `src/ui/result/slots.tsx` | 改修 | 仮表示の `DiscardBody`・`DiscardGlance` とその Props を削除し、ファイル末尾に `export { DiscardBody, DiscardGlance } from './discard';` を置く(`ResultBody.tsx`・`ResultGlance.tsx` は変更しない)。`Discard` の型 import が不要になれば消す |
| `src/ui/result/result.css` | 改修 | 末尾に `/* ===== F1 打牌候補(#88) ===== */` の区画を追記(2.5)。向聴バッジの淡色の規則のセレクタに `.result-glance--discard[data-discard-next="shanten"] .result-glance__badge` を加える |
| `src/ui/result/f1-discard.test.tsx` | 新規 | 2.7 のテスト |

- 既存テストの更新(第2版。仮表示の「何切る」の廃止で必ず失敗するため): 2.7.1 の2箇所に限り変更する。
- 変更しないもの: `src/core/`、`classify.ts`(`kind: 'discard'` の `discards` をそのまま渡しており、F1 に足りないものはない)、`hora-summary.ts`、`hora/` 配下、`ResultBody.tsx`・`ResultGlance.tsx`、`slots.tsx` の Discard 以外の部品、2.7.1 以外の既存テスト。
- 循環 import: `slots.tsx` → `discard.tsx`(再エクスポート)→ `slots.tsx`(`GlanceTiles`・`summarizeAcceptance`)は ES モジュールの循環になる。どちらも関数宣言で、モジュール評価時に呼ばないため実害はないが、**製造担当は循環を避けたい場合、再エクスポートをやめて `ResultBody.tsx`・`ResultGlance.tsx` の import 元を `./discard` に替えてよい**(その場合2ファイルの import 1行ずつだけが差分になる。6章 条件2で許す)。どちらを採ったかを最終報告に書く。
- `src/ui/result/` から core への import は `import type` のみ(E4 2.1 の規律)。`compareTiles` は値の import になるため使わず、同じ順序の比較関数を UI で持つ(2.2)。

### 2.2 純関数(`discard-summary.ts`)

```ts
import type { Discard, ScoredHora } from '../../core/result';
import type { Tile } from '../../core/tile';

/** core の compareTiles と同じ順(m < p < s < z、数の昇順、同じ数の五は通常 → 赤) */
export const compareTileOrder = (a: Tile, b: Tile): number;

/** 候補の次の状態。'shanten' は向聴、'tempai' は聴牌・和了(next.type==='tempai' か info.type==='hora') */
export type DiscardNextKind = 'shanten' | 'tempai';
export const discardNextKind = (d: Discard): DiscardNextKind;

/** 見出しとバッジの文字。先頭の候補で決める(全候補が同じ向聴数)。空なら null */
export const discardHeading = (discards: Discard[]): string | null; // '1向聴' | '聴牌' | null

/** 確定事項3の並び。全候補が向聴なら受け入れ枚数(count>0 の合計)降順・同数は compareTileOrder。そうでなければ入力の順のまま(新しい配列を返す) */
export const sortDiscards = (discards: Discard[]): Discard[];

/** 聴牌候補の待ち牌。hora は horaTile、tempai は count>0 の牌。compareTileOrder で並べ、同じ牌(赤五は別)を除く */
export const discardWaits = (d: Discard): Tile[];

export type DiscardRange =
  | { kind: 'none' } // 待ちの和了が無い(hora が空、tempai 型)。レンジを出さない
  | { kind: 'no-yaku' } // すべての待ちでロン・ツモとも役なし
  | { kind: 'points'; min: number; max: number; hasNoYakuWait: boolean };

/** 確定事項5。hora: ScoredHora[] から集計する */
export const discardRange = (hora: ScoredHora[]): DiscardRange;

/** 'none' → null、'no-yaku' → '役なし'、points → '（1,000〜2,000点）' / '（800点）' / '（役なし/1,000〜1,100点）' */
export const formatDiscardRange = (range: DiscardRange): string | null;
```

- `compareTileOrder`: 種類の順 m・p・s・z(core は `localeCompare` で m < p < s < z)、次に `n`、数牌の五同士は `red` が false を先。core の `compareTiles` と同じ結果になることをテストで確かめる(F1-01。テストファイルからは core の `compareTiles` を値で import してよい)。
- `sortDiscards` の受け入れ枚数は `info.tileAvailabilities` の `count > 0` の合計(`summarizeAcceptance(...).total` と同値。`discard-summary.ts` では `slots` を import しないため、その場で合計する)。安定ソートで、同数かつ同じ牌は起こらない。
- `discardRange` の手順(mighty の挙動の仕様化):
  1. `hora` が空なら `{ kind: 'none' }`。
  2. `horaTile` で組に分ける(同じ牌の判定は `compareTileOrder(a,b) === 0`。赤五は別の待ち)。
  3. 各待ちの各 `by`(ron・tsumo)について、`isNoYaku` が false の和了のうち `score.payment.total` の最大を1つ取り(E2 `pickBestByBy` と同じ選び方)、集合 totals に入れる。
  4. ある待ちで、ロン・ツモとも(存在する側すべてで)役のある和了が無ければ `hasNoYakuWait = true`。
  5. totals が空なら `{ kind: 'no-yaku' }`。そうでなければ `{ kind: 'points', min, max, hasNoYakuWait }`。
  6. `yakumanPoint` は見ない(役満の印を付けない。確定事項5)。
- 呼び出し側の規則(第2版): `discardRange` の引数は `ScoredHora[]` で、`tempai` 型の候補は `hora` を持たない。`tempai` 型では `discardRange` を呼ばずに `{ kind: 'none' }` とする(`[]` を渡しても同じ結果)。
- `formatDiscardRange`: 数字は `formatNumber`。括弧は全角「（」「）」、区切りは「〜」(U+301C)、前置は「役なし/」(半角スラッシュ。mighty の表記)。`no-yaku` は括弧なしの「役なし」(mighty `formatDiscardRange` 7行と同じ)。
- 本場: `payment.total` は本場・供託を含まない(`payment.ts` 37行)。確定事項5の「本場抜き」と一致する。

### 2.3 本体(`DiscardBody`・`DiscardItem`)

```html
<div data-result-kind="discard" class="result-body result-body--discard">
  <h2 class="result-body__title">{discardHeading}</h2>
  <ul class="discard-list">
    <!-- sortDiscards の順。key は打牌の牌(赤は r)+添字 -->
    <li class="discard-item" data-discard-next="shanten">
      <span class="discard-item__tile"><Tile tile={d.tile}/></span>
      <div class="discard-item__detail">
        <span class="result-body__summary tabular-nums" data-kinds="{kinds}" data-total="{total}">{kinds}種 {total}枚</span>
        <div class="result-body__tiles">
          <!-- summarizeAcceptance の available。E4 ShantenBody と同一の組 -->
          <span class="result-body__wait" data-tile-count="{count}"><Tile/><span class="result-body__wait-count tabular-nums">×{count}</span></span>
        </div>
      </div>
    </li>
    <li class="discard-item" data-discard-next="tempai">
      <span class="discard-item__tile"><Tile tile={d.tile}/></span>
      <div class="discard-item__detail">
        <div class="glance-tiles discard-item__waits"><!-- discardWaits の各牌を <Tile/> --></div>
        <span class="discard-item__range tabular-nums" data-range-kind="points|no-yaku">{formatDiscardRange}</span>
      </div>
    </li>
  </ul>
</div>
```

- 部品分け: `DiscardBody`(見出し+`ul`)→ `DiscardItem`(`li` 1件。Props `{ discard: Discard }`)。向聴と聴牌の中身は `DiscardItem` 内の分岐(`discardNextKind`)。#89 が打牌の牌をボタン化するときは `DiscardItem` の `.discard-item__tile` だけを触ればよい(4章)。
- 待ち牌の並びは `GlanceTiles`(`tiles={discardWaits(d)}`)を使ってよい(DOM が `<div class="glance-tiles">` になる)。その場合 `discard-item__waits` の修飾は CSS 側で `.discard-item__detail > .glance-tiles` として当てる。製造担当がどちらかに決めてよい(テストは `.discard-item__detail` 内の牌の `aria-label` の並びで判定する)。
- 聴牌候補の例外:
  - `range.kind === 'none'` かつ待ち牌が0枚(`hora` が空〔D12 の 2z〕、`tempai` 型で全0枚): 待ちの並びの代わりに `<span class="result-body__text">和了牌なし</span>` を1つ出す(E3 の `HoraBody`・`TempaiBody` の文言。livewing の `result.no-hora-tiles` に相当)。レンジは出さない。
  - `tempai` 型で `count > 0` の牌がある: 待ち牌だけを出し、レンジは出さない(core が点を計算していないため。livewing も `tempai` 型では打点を出さない)。
  - `range.kind === 'no-yaku'`: 待ち牌+「役なし」(`data-range-kind="no-yaku"`)。
- 向聴候補で全0枚: E4 確定事項9 と同じく「0種 0枚」と空の `.result-body__tiles`。
- `discards` が空(到達しない。1.4): `<div data-result-kind="discard" class="result-body result-body--discard"></div>`(見出しも `ul` も出さない)。
- 見出しは `.result-body__title` だけ(E4 の「N種 M枚」の横並びは候補ごとに出すため、見出し行 `.result-body__heading` は使わない)。

### 2.4 バナー(`DiscardGlance`)

```html
<div data-result-kind="discard" data-discard-next="shanten|tempai" class="result-glance result-glance--discard">
  <span class="result-glance__badge">{discardHeading}</span>
  <GlanceTiles tiles={sortDiscards(discards).map(d => d.tile)} />
</div>
```

- 打牌の牌を全件、本体と同じ順(確定事項4)。`onTileClick` は渡さない(#89 の領分)。
- バッジの色: 聴牌は既定(primary)、向聴は E4 9.4 の淡色(`data-discard-next="shanten"` のセレクタを既存規則に追加)。
- 高さ・折り返しは E4 9.1・9.4 の規則(`.result-glance` の `min-height`、`.result-glance > .glance-tiles { flex: 1 1 0; min-width: 0 }`)がそのまま効く。
- `discards` が空: バッジも牌も出さない(外枠だけ)。先頭の要素がなく決まらないため、`data-discard-next` 属性も省略する(第2版)。
- `.result-glance__label` は使われなくなる。CSS の規則は残す(削除は本 Issue の範囲外。4章)。

### 2.5 CSS(`result.css` 末尾の区画)【設計案。UI 監修で変えられる】

| セレクタ | 内容 |
| --- | --- |
| `.discard-list` | `list-style:none; margin:0; padding:0; display:flex; flex-direction:column;` |
| `.discard-item` | `display:flex; align-items:flex-start; gap:0.75rem; padding-block:0.5rem;` |
| `.discard-item + .discard-item` | `border-top: 1px solid var(--md-sys-color-outline-variant);`(候補間の区切り。`md-divider` は Material Web の import が初回 JS に入るため使わない) |
| `.discard-item__tile` | `flex-shrink:0;`(打牌の牌。大きさは本体の `--tile-width: 1.5rem` のまま) |
| `.discard-item__detail` | `flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:0.25rem;` |
| `.result-body--discard .result-body__tiles` | E4 と同じ `gap: 0.5rem 0.75rem`(既存の `--tempai`・`--shanten` の規則にセレクタを加える) |
| `.discard-item__range` | body-medium のタイポトークン5種、色 `--md-sys-color-on-surface-variant`(`.result-body__summary` と同じ) |

- 375px での見た目(設計案): 左に打牌の牌1枚、右に縦2段(向聴: 「3種 8枚」/ 有効牌の組を折り返し。聴牌: 待ち牌の並び / 「（1,000〜2,000点）」)。候補の間に細い線。右の領域だけで折り返し、打牌の牌の下に回り込まない(E4 9.1 の流儀)。
- HEX を書かない。色・字形はすべて MD3 トークン。

### 2.6 初回 JS(09号)

- 基準値: **125,908 B**(09号「現在の基準値」。82de410 の実測。起点の `13bf0bf` との差は docs のみ〔#87〕で JS は同一。設計担当は再計測していない)。
- 変更はすべて初回 JS(`slots.tsx` から参照される `discard.tsx`・`discard-summary.ts`)。遅延チャンクにしない(小さい。`HoraDetail` チャンクを import しない)。
- 増分の積算(見積り): `discard-summary.ts`(比較・並び替え・待ちの重複除去・レンジ集計・表記)+350〜550 B、`DiscardBody`・`DiscardItem`(2分岐と例外)+200〜330 B、`DiscardGlance` +40〜70 B、仮表示の削除 −40 B。合計 **+550〜910 B**。
- **目標値: 初回 JS 126,818 B 以下**(+910 B)。超過は不合格にしない。製造担当の最終報告と PR 本文に、基準値・実測値・増分・積算との差・超過時の超過量と原因を書く(09号 7)。

### 2.7 テスト(`f1-discard.test.tsx`。命名 `F1-<番号>: …`。`renderToStaticMarkup` と純関数。jsdom 不要)

| ID | 対象 | 内容 |
| --- | --- | --- |
| F1-01 | `compareTileOrder` | 1m・9m・1p・5p・赤5p・9p・1s・5s・赤5s・1z・7z の全ての組で、符号が core の `compareTiles` と一致する |
| F1-02 | `sortDiscards`・`discardHeading` | D2 の core 出力で並びが 1z,2z,3z,4z,5z,6z,1p,9p,1s,9s・見出し「2向聴」。D3 で 3z,4z,9p。D11 で入力順のまま(8s,0s,5s,1z)・見出し「聴牌」。空配列で `[]`・`null` |
| F1-03 | `discardWaits` | D4 の 1z 候補で 2s・5s・赤5s(重複なし、この順)。手で与える `tempai` 型 `[1z:2, 2z:0, 3z:1]` で 1z・3z。`hora: []` で `[]` |
| F1-04 | `discardRange`・`formatDiscardRange`(テーブル) | D4 `（1,000〜2,000点）`、D5 `（2,600〜3,000点）`、D6 `（800点）`、D7 `（役なし/1,000〜1,100点）`、D8 `役なし`、D9 `（24,000〜32,000点）`、D11 の 0s `（800点）`・1z `（2,600〜3,900点）`、D12 の 2z(`hora: []`)は `none`・`null`。各 `kind`・`min`・`max`・`hasNoYakuWait` も検証 |
| F1-05 | `discardRange`(手で与える値) | 同じ待ち・同じ by に役ありと役なしが混在する組で、役ありの最大だけを採る。役満(`yakumanPoint` 1)の和了でも出力が数字だけ(「役満」を含まない) |
| F1-06 | `DiscardBody` | D3 で見出し「1向聴」、`li.discard-item` が3件で `data-discard-next="shanten"`、打牌の牌の `aria-label` が順に 西・北・9筒、1件目の「5種 16枚」(`data-kinds="5" data-total="16"`)、`.result-body__wait` が5組・`data-tile-count` 4,4,3,2,3、「×0」を含まない |
| F1-07 | `DiscardBody` | D4 で見出し「聴牌」、1件、`data-discard-next="tempai"`、`.discard-item__detail` 内の牌の `aria-label` が 2索・5索・赤5索、レンジ「（1,000〜2,000点）」、`×` と「種」「枚」を含まない |
| F1-08 | `DiscardBody` | D7 で「（役なし/1,000〜1,100点）」、D8 で `data-range-kind="no-yaku"` の「役なし」、D12 で2件(1p・2z の順)・2z の行に「和了牌なし」があり `.discard-item__range` が無い |
| F1-09 | `DiscardBody` | D13 の core 出力で2行とも待ち牌1枚・`.discard-item__range` が無い。手で与える `tempai` 型の候補で、`count > 0` の牌だけを出し `.discard-item__range` が無い。全0枚では「和了牌なし」。向聴の全0枚では「0種 0枚」で組が0個 |
| F1-10 | `DiscardGlance` | D2 でバッジ「2向聴」1件・`data-discard-next="shanten"`・牌10枚が F1-02 の順。D11 でバッジ「聴牌」・牌4枚(8索・赤5索・5索・東)。マークアップ全体に「打」「待ち」「受け入れ」「何切る」「result-glance__label」を含まない |
| F1-11 | 空配列 | `DiscardBody`・`DiscardGlance` に `[]` で外枠だけ(`<h2` も `result-glance__badge` も無い) |
| F1-12 | 結合 | `generateResult` → `classifyResult` で D1〜D13 が `kind: 'discard'` になり、1.4 の表の候補・向聴数・点数と一致する(14枚和了 `234p567p34s678s99p2s` は `kind: 'hora'`) |

- 補助関数(`southTable`・`defaultOptions`・`parseTiles`)は `e4-shanten.test.tsx` から複製する。

#### 2.7.1 既存テストの更新(第2版。行番号は `13bf0bf` 時点)

| ファイル | 箇所 | 現在 | 変更後 |
| --- | --- | --- | --- |
| `src/ui/result/ResultGlance.test.tsx` | 267行 `it('E1-6: discard のとき「何切る」が表示される'` | 名前 | 「E1-6: discard のとき空の discards でバナーの外枠だけを出す」 |
| 同 | 276行 | `expect(markup).toContain('何切る')` | `expect(markup).not.toContain('何切る')` と `expect(markup).not.toContain('result-glance__badge')` と `expect(markup).not.toContain('data-discard-next')`。277行 `toContain('data-result-kind="discard"')` は残す |
| `src/ui/screen/ResultPanel.test.tsx` | 188行 E1-7 の名前 | 変えない(「何切る」を含まない) | — |
| 同 | 200行 | `expect(html).toContain('何切る')` | `expect(html).not.toContain('何切る')`。198・199・201・202行はそのまま |

- 上記以外の既存テストファイルは変更しない。
- 牌の `aria-label` の表記は `src/ui/tile/tile-image.ts` の `tileLabelOf` に従う(E4-03 と同じ。1.4 の表の打牌順の「西・北」は 3z・4z)。

## 3. 範囲外

- 振聴の表示、聴牌確率・和了確率・期待値(F3)、牌タップ(打牌・ツモ。#89)、core の変更(確定事項6)。
- 向聴数の異なる候補の表示(core が返さない)。
- `.result-glance__label` の CSS の削除、`ShantenBody`・`TempaiBody` との組の描画の共通化(リファクタリング。別 Issue で扱うなら統括担当が判断)。

## 4. 後続への引き継ぎ

- **#89(F1-1)との競合を避ける分担**: F1 の部品は新規 `discard.tsx` に置き、`slots.tsx` の変更は仮表示の削除と再エクスポート1行(末尾)に限る。`result.css` は末尾の区画と、既存2規則のセレクタ追加(`--shanten` の淡色バッジ、`--tempai`/`--shanten` の組の間隔)だけ。#89 は打牌の牌のボタン化を `DiscardItem` の `.discard-item__tile`(`<Tile onClick>`)と `DiscardGlance` の `GlanceTiles` の `onTileClick` で行える。`DiscardItem` の Props に `onDiscard?: (tile) => void` を足す余地を残す(本 Issue では足さない)。後にマージする側がもう一方を取り込んで再テストする。
- F3: 候補ごとの確率・期待値は `DiscardItem` の `.discard-item__detail` に段を足す。並び替えは `sortDiscards` を差し替える。
- 振聴: 河の入力が入ったら、`discardWaits` に捨て牌を足すか表示で印を付ける(mighty の挙動が参考)。

## 5. 実挙動未確認

- 画面表示(375px での候補1件の配置、区切り線、D2 の10件の縦の長さ、バナーの10枚の折り返し)。実装前のため未確認。受け入れ条件は DOM 構造と文字で判定し、見た目は UI 監修(9章)で確かめる。
- `tempai` 型で全0枚の候補が実際に現れる牌姿(1.4。テストは手で値を与える)。
- 一発・抜き北を伴うときに mighty と役なし判定が分かれる牌姿(1.5)。
- 初回 JS の増分(2.6 は見積り)。実機(iOS Safari・PWA)の見え方(7章)。

## 6. 受け入れ条件

検収担当は上から順に実行する。期待値は 1.4 による。

1. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラーなし。
2. `git diff --stat origin/main...HEAD -- src/core src/ui/result/classify.ts src/ui/result/hora src/ui/result/hora-summary.ts` が空。`git diff origin/main...HEAD -- src/ui/result/slots.tsx` の変更が、`DiscardBody`・`DiscardGlance`・その Props の削除、再エクスポート1行、不要になった import の整理だけ。`ResultBody.tsx`・`ResultGlance.tsx` は差分なし(2.1 の代替案を採った場合は `DiscardBody`/`DiscardGlance` の import 元の1行ずつだけ)。既存テストファイルの差分は 2.7.1 の行だけ(`git diff origin/main...HEAD -- src/ui/result/ResultGlance.test.tsx src/ui/screen/ResultPanel.test.tsx` で確認)。
3. import 規律: `grep -rnE "^import [^t].*from '(\.\./)+core/" src/ui/result --include='*.ts' --include='*.tsx' | grep -v '\.test\.'` が 0件(`import { type …` だけの行は目視で除く)。`grep -n "hora/" src/ui/result/discard.tsx src/ui/result/discard-summary.ts` が `import type` 以外で0件(遅延チャンクを import しない)。
4. `npx vitest run src/ui/result` の出力に `F1-01`〜`F1-12` がすべて現れ通過し、`E4-`・`E3-`・`E2-`・`E1-` 系も通過している。加えて `npx vitest run src/ui/screen/ResultPanel.test.tsx` で E1-7 が通過し、`ResultGlance.test.tsx` の E1-6(discard)が 2.7.1 の新しい名前で通過している。
5. 初回 JS: `npm run build` 後、`dist/index.html` の `<script type="module" src>` が指すファイルを `gzip -9 -c <file> | wc -c` で測り記録。目標 126,818 B 以下(基準 125,908 B)。超過は不合格にせず、PR に 2.6 の記載事項を書く。
6. 画面(dev。`npm run dev` を Browser pane で表示し、ペインを**表示した状態**で行う〔C-01〕。`resize_window` で 375×812。既定ルール・南家。他者の dev サーバーを止めない。`pkill` 禁止):
   - (a) 手牌 `123p456p789s11z34z9p`(D3): 本体に見出し「1向聴」、候補3件が 西・北・9筒 の順、各行の打牌の牌の上に「打」、1件目に「受け入れ」「5種 16枚」と有効牌 7筒・8筒・9筒・東・北の5枚(「×」が無い。第3版 UI-1)。
   - (b) 手牌 `1199p1199s1234z56z`(D2): 候補10件が 東・南・西・北・白・發・1筒・9筒・1索・9索 の順、字牌の行は「5種 15枚」、数牌の行は「3種 12枚」。
   - (c) 手牌 `234p567p34s678s99p1z`(D4): 見出し「聴牌」、候補 東 の1件、「打」「待ち」の見出し、「待ち」の横に「（1,000〜2,000点）」、待ち牌 2索・5索・赤5索。「×」「種」「受け入れ」が無い(第3版 UI-1)。
   - (d) 手牌 `234s678s55z99s1z`・ポン 1筒(D7): 「（役なし/1,000〜1,100点）」。手牌 `234s678s99s22p1z`・ポン 1筒(D8): 「役なし」。
   - (e) 手牌 `1m9m19p19s123456z1z2p`(D9): 「（24,000〜32,000点）」で「役満」の文字が無い。
   - (f) 手牌 `234p567p34s678s0s5s1z`(D11): 候補が 8索・赤5索・5索・東 の順で、5索と赤5索が別の行。
   - (g) 手牌 `1111p456p789s111z2z`(D12): 南の行に「和了牌なし」。
   - いずれも「何切る」の文字が無く、「×」が本体に無い(第3版 UI-1。「打」「受け入れ」「待ち」は 9.1 のとおり各行にある)。`read_page`/`get_page_text`/`find`(`data-discard-next`・`data-kinds`・`data-range-kind`)で判定してよい。375px で横スクロールが出ない(`document.documentElement.scrollWidth <= 375`)。
   - バナー: 375×500 にし、シートを閉じて `scrollTo(0,0)`、`button[aria-label="計算結果へ移動"]` が visible になってから確認する(E3・E4 と同じ手順。または `javascript_tool` で `.result-glance` の `textContent` と牌要素の数を読む)。(a) でバッジ「1向聴」+牌3枚、(b) でバッジ「2向聴」+牌10枚、(c) でバッジ「聴牌」+牌1枚。(b) で `.result-glance__badge` と `.result-glance .glance-tiles` の `getBoundingClientRect()` を読み、牌の並びの `left` がバッジの `right` 以上・牌の並びの `top` がバッジの `top` 以下(バッジの下に回り込まない)。
7. 本番ビルド: `npm run build && npx vite preview` で 6(a)(c)(d) を再確認し、候補間の区切り線と2段の配置(CSS)が dev と同じに効いている(G-11)。
8. ダークテーマ: 6(a)(c) をダークで表示し、「5種 16枚」・レンジ・区切り線・バッジが背景に溶けない(目視)。`git diff origin/main...HEAD -- src | grep -E '#[0-9a-fA-F]{3,8}\b'` で新規の HEX が無い。
9. ホームディレクトリ名: `git diff origin/main...HEAD | grep -n "$(basename "$HOME")"` が空(docs も対象)。
10. 起動した dev/preview サーバーは自分で止める(01号)。
11. UI 監修(9章)の各項目の受け入れ条件をすべて満たす。

## 7. 実機確認(検収後にユーザーが行う。合否に含めない。C-02)

- iPhone の PWA で 6(b)(c) を表示し、候補の行が読みやすく、区切り線が見え、バナーの打牌の牌が折り返されること。

## 8. 未決事項(要ヒアリング)

- なし。
- (参考。未決事項ではない)2.3〜2.5 の見た目(打牌の牌の大きさ、聴牌候補の待ちとレンジを1段にするか2段にするか、区切り線の有無と色、打牌の牌と右の領域の区別の付け方)は【設計案】であり、UI 監修(9章)で変更できる。

## 9. UI 監修による変更

UI 監修のたびに「9.N」として項目を追記する。各項目は「指示・変更内容・根拠・対象・意匠・テスト・バンドル・受け入れ条件」の順に書く。既存章の記述と食い違う場合は、この章を優先し、既存章の該当箇所に「第N版 UI-N」と注記する。

### 9.1 UI-1(第3版): 打牌の牌の拡大・有効牌の枚数の廃止・見出しの追加

#### 9.1.1 指示(オーナー。引用。バナーは対象外)
「打牌候補と待ちor有効牌の区別がつきにくいです。F1-1で打牌候補をタップして手牌を編集しますので、打牌候補は有効牌等より大きくしてください。」「何切る(14枚表示)の聴牌以外の場面では、枚数(xN)は表示せず有効牌のみ表示してください。」「livewingに合わせ、「打」「受け入れ」「待ち」の見出しをつけてはいかがでしょうか?」「バナーの表示は特に問題ありませんでした。」

- 3つ目は提案の形だが、採用する(livewing の `DiscardItem` と同じ構成)。1.2 確定事項7の「ラベルを付けない」は、本体の打牌候補に限り、この指示で変える。バナー(`DiscardGlance`)は変えない。
- 2つ目の「×N」の廃止は、`DiscardItem` の向聴の候補の有効牌だけが対象。E4 の `ShantenBody`(単独の向聴の結果。「牌×N」)は変えない。1.2 確定事項1の「有効牌『牌×N』」は、打牌候補では「有効牌(牌のみ)」に変える。「N種 M枚」は残す(livewing と同じ)。

#### 9.1.2 変更内容
- **打牌の牌の拡大**: `.discard-item__tile` の牌を `--tile-width: 2.25rem`(本体の有効牌・待ち牌の 1.5rem の1.5倍。livewing の `w-12` と `w-8` の比と同じ)にする。`Tile` は `--tile-width` を親から受ける(`src/ui/tile/tile.css`)。値は UI 監修で調整する(CSS 1行)。
- **「打」の見出し**: `.discard-item__tile` を縦並びにし、牌の上に「打」(`<span class="discard-item__label">打</span>`)を中央揃えで置く。
- **右の領域の見出し行**: `.discard-item__detail` の1段目を、見出し+付記の1行(`.discard-item__head`。`display:flex; align-items:baseline; gap:0.5rem`)にし、2段目に牌の並びを置く。
  - 向聴: 1段目「受け入れ」+「N種 M枚」(`.result-body__summary`。`data-kinds`・`data-total` はそのまま)。2段目は有効牌の牌のみ(`Tile` を並べる。`.result-body__wait`・`.result-body__wait-count`・`data-tile-count`・「×」を出さない)。全0枚は「受け入れ」+「0種 0枚」で2段目は牌なし。
  - 聴牌・和了: 1段目「待ち」+レンジ(`.discard-item__range`。`data-range-kind` はそのまま)。2段目は待ち牌の牌。レンジが無い(`none`)ときは1段目が「待ち」だけ。待ち牌が0枚のとき(`和了牌なし`の例外)は、1段目が「待ち」、2段目が「和了牌なし」(`.result-body__text`)。
- 見出し(「打」「受け入れ」「待ち」)の見た目: `.discard-item__label` に label-large のタイポトークン5種(font・size・line-height・weight・tracking)と色 `--md-sys-color-on-surface`。HEX を書かない。
- 変えない: 一覧の見出し(「N向聴」「聴牌」)・並び順・候補間の区切り線・バナー・純関数(`discard-summary.ts`)・core。

#### 9.1.3 対象ファイル
- `src/ui/result/discard.tsx`(`DiscardItem` の2つの中身〔`ShantenDiscardDetail`・`TempaiDiscardDetail`〕と `.discard-item__tile` まわりの DOM)、`src/ui/result/result.css`(F1 の区画。2.5 の `.discard-item__tile`・`.discard-item__detail` の規則の改修と、`.discard-item__label`・`.discard-item__head` の追加)、`src/ui/result/f1-discard.test.tsx`。それ以外は変えない。

#### 9.1.4 テストの変更(`f1-discard.test.tsx`)
| ID | 変更 |
| --- | --- |
| F1-06 | `.result-body__wait` が5組・`data-tile-count`・「×0」の検証を、「`li` 1件目の `.discard-item__detail` 内の有効牌の `aria-label` が 7筒・8筒・9筒・東・北の5枚」「`×` を含まない」「`result-body__wait`・`data-tile-count` を含まない」に替える。3件の各 `li` に「打」の見出し、1件目に「受け入れ」を含む |
| F1-07 | D4 の `li` に「打」「待ち」の見出しがあり、「受け入れ」を含まない。レンジが「待ち」と同じ1段目(`.discard-item__head` 内)にあり、牌の並びが2段目。`×`・「種」「枚」を含まない |
| F1-08 | D12 の 2z の行は「待ち」+「和了牌なし」で `.discard-item__range` が無い(従来どおり) |
| F1-09 | 向聴の全0枚で「0種 0枚」・有効牌の牌が0個(「×0」の検証は `×` を含まないに統合)。他は従来どおり |
| F1-10・F1-11 | 変えない(バナーに「打」「待ち」「受け入れ」「何切る」を含まない) |
| F1-13(新設) | 打牌の牌の拡大: `result.css` に `.discard-item__tile` の `--tile-width` の宣言があり、値が `.result-body` の `--tile-width`(1.5rem)より大きい(文字列のテスト。既存の CSS 検査テストの流儀に従う) |

#### 9.1.5 バンドル(09号)
増分の見積り: ラベル2種・見出し行の DOM +60〜120 B、`×N` の組の削除 −40〜−80 B。合計 +0〜+80 B の見込み(CSS は初回 JS の外)。目標値は 2.6 のまま(126,818 B 以下)。実測を最終報告に書く。

#### 9.1.6 受け入れ条件
1. 6章 条件1〜5・9 が引き続き通過(初回 JS の実測と基準 125,908 B との差を記録)。
2. 6章 6(a)(c) の手牌で、各行の打牌の牌の上に「打」。向聴の行は「受け入れ」+「N種 M枚」+有効牌が牌のみ(本体に「×」が無い)。聴牌の行は「待ち」+「（…点）」+待ち牌。打牌の牌の `getBoundingClientRect().width` が有効牌の牌の幅の約1.5倍(1.4〜1.6倍)。375px で横スクロールが出ない。
3. 6(e) の国士の手(D9)と 6(g)(D12)で、「待ち」の見出しが出て D12 の南の行に「和了牌なし」。
4. バナーは第2版のまま(「打」「待ち」「受け入れ」が無い)。
5. 本番ビルド(`vite preview`)でも 2 が成り立つ(G-11)。

## 10. 改訂履歴

- 第1版(2026-11-14): 新規作成。
- 第2版(2026-11-14): 独立レビュー4点を反映。(1) 仮表示の廃止で失敗する既存テスト(`ResultGlance.test.tsx` 276行・`ResultPanel.test.tsx` 200行)を更新対象として 2.1・2.7.1・6章 条件2・4に明記。(2) D7 の待ちの並びを 9s・5z に訂正(再実行で確認)。(3) `tempai` 型の候補が現れる条件を実コードに合わせて整理し、5枚の部分入力 D13 で再現(F1-09 に追加)。(4) `tempai` 型では `discardRange` を呼ばず `none`、空配列のバナーは `data-discard-next` を省略、と明記。8章の参考記述を未決事項と区別した。
- 第3版(2026-11-14): UI 監修(9.1 UI-1)を反映。打牌の牌を有効牌の1.5倍にし、向聴の候補の有効牌から「×N」を廃止、「打」「受け入れ」「待ち」の見出しを追加(livewing の `DiscardItem` と同じ構成)。9章を新設して 9.1 を記載し、1.2 確定事項1・7の該当箇所は 9.1 が優先、6章 6(a)(c) と末尾の文言を更新。
