# Issue #12 設計書: A4. 北の扱い

- 対象Issue: #12(Epic A #2 の Sub-Issue)
- 製造ブランチ: `feature/issue-12-sanma-north`
- 変更対象(全ファイル):
  - 変更: `src/core/rule.ts`・`src/core/input.ts`・`src/core/yaku.ts`・`src/core/hora.ts`・`src/core/fu.ts`・`src/core/result.ts`
  - 新規: `src/core/north.test.ts`
  - テスト変更: `src/core/result.test.ts`・`src/core/golden.test.ts`(固定条件の `Rule` に `north: 'nukidora'` を足す行と、`Input` の組み立てに `nuki: 0` を足す箇所のみ。期待値は変えない)
  - 統括担当がコミット: 本設計書、`docs/mahjong-rules.md`(§2 を統括担当が改訂済み)
  - 変更しない: `src/core/golden-cases.ts`・`src/core/score.ts`・`src/core/bonus.ts`・`src/core/table.ts`・`src/core/tile/**`・`src/ui/**`

## 1. 目的

1. 北の扱い(抜きドラ／共通役牌)をルール設定 `Rule.north` で切り替えられるようにする(所定値は抜きドラ)
2. 抜き北の枚数を入力 `Input.nuki` で受け取り、抜きドラ・ドラ・門前・嶺上開花・残り枚数に反映する
3. 共通役牌の設定で、北の刻子・槓子を1飜役、北の雀頭を2符(平和にならない)にする
4. 不正な入力(北の枚数超過、設定と抜きの矛盾)を `generateResult` が `null` で拒否する

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項

#### (1) ヒアリング確定(統括担当経由・オーナー承認「全て提案通りで問題ありません。」、Q1 回答「Q1はつけます。また、補足として北待ちで北を抜いても振り聴になりません。」)

| # | 確定事項 | 設計への反映 |
| --- | --- | --- |
| H1 | 設定は `Rule.north: 'nukidora' \| 'yakuhai'`、所定値 `'nukidora'`。`compareRules` にも加える | §4.1 |
| H2 | 抜き北の枚数は `Input.nuki: number`(0〜4の整数、省略不可)。既存テスト・golden の `Input` 組み立てに `nuki: 0` を足す(期待値は変えない) | §4.2・§6 |
| H3 | 不正な入力では `generateResult` が `null` を返す(具体条件は D4) | §4.6 |
| H4 | 抜きドラは新しい役名 `'nuki-dora'`(飜=抜き枚数)。数え役満の飜に含まれる | §4.3・§4.4 |
| H5 | ドラ表示牌が西なら、抜き北もドラになる(抜き北1枚につき `nuki-dora` 1+`dora` 1) | §4.4 |
| H6 | 抜き北は副露ではなく門前を保つ(`melds` に入れない) | §4.2 |
| H7 | 抜き北へのロン: 計算コアは特別な扱いをしない(通常のロンとして入力し、槍槓フラグは立てない運用。UIで案内) | §8 |
| H8 | 抜き北が1枚以上あれば、槓がなくても `rinshan` フラグで嶺上開花が付く | §4.4 |
| H9 | (Q1)七対子でも、`nuki > 0` かつ `rinshan` フラグがあれば嶺上開花を付ける | §4.4 |
| H10 | 北待ちで北を抜いても振聴にならない | §4.7(計算コアへの影響なし) |
| H11 | A2 引き継ぎ: 抜き北を `allInputTiles` に加え、残り枚数・有効牌から差し引く | §4.6 |

#### (2) 仕様から導出([mahjong-rules.md](../mahjong-rules.md) §2・§3.3 の【確定】)

| # | 内容 | 設計への反映 |
| --- | --- | --- |
| S1 | 共通役牌では北の刻子・槓子で1飜、北の雀頭は2符で平和にならない(三元牌と同じ) | §4.4・§4.5 |
| S2 | 抜きドラの設定では手牌の北は客風牌(現状どおり) | 変更なし |
| S3 | 抜いた北は手牌の枚数に数えない。ドラ扱いであり、断么九・混一色・字一色などの牌姿の判定に含めない | §4.4(抜き北を `allTiles` に入れない) |
| S4 | 抜きの順序・一発等の消滅は管理しない | 天和・地和・一発の判定は変更しない |
| S5 | 数え役満の飜数には抜きドラを含むすべてのドラを含める(§3.3) | §4.3 |

#### (3) 設計案(2026-10-30 設計承認で確定)

| # | 内容 | 理由 |
| --- | --- | --- |
| D1 | 役牌：北の役名を `'north'` とする | 既存の `'white'`・`'green'`・`'red'` と同じ牌名の命名 |
| D2 | D4(b) の北の合計に含めるドラ表示牌は `input.dora` の全要素(裏ドラ表示牌が入る場合も含む) | 既存の `allInputTiles` が `input.dora` 全体を物理的な牌として差し引いているのと揃える |
| D3 | 手牌由来のドラと抜き北由来のドラは1つの `dora` にまとめる。オーナー補足(原文):「ドラ表示「西」に由来するドラは「dora」、抜き北そのものは「nuki-dora」」。すなわち表示牌が西のときの抜き北のドラは `dora` に入れ、抜いた枚数ぶんの飜は `nuki-dora` に入れる | 既存の `d > 0` で1件だけ出す挙動を保つ |
| D4 | 不正な入力の具体条件: (a) `yakuhai` なのに `nuki > 0`、(b) 北の合計(手牌+副露+抜き+ドラ表示牌)が5枚以上、(c) `nuki` が0〜4の整数でない | ヒアリング3の提案どおり |

### 2.2 実物調査の結果(コード読解)

| 調査項目 | 結果 |
| --- | --- |
| 入力の検証 | `result.ts` の `isValidSanmaInput` が 2m〜8m を含む手牌・副露・ドラ表示牌を `null` にする。テストの牌姿は萬子を 1m・9m に限る |
| `Input`(`input.ts`) | `hand`・`melds`・`dora` のみ。`dora` はドラ表示牌の配列 |
| 門前判定 | `hora.ts:174` `menzen = input.melds.every(m => m.type === 'kan' && m.closed)`。`melds` だけを見る |
| 嶺上開花 | 通常形 `hora.ts:489` の条件が `input.melds.some(m => m.type === 'kan') && options.rinshan`。`hora.ts:742` で嶺上開花が付いたら `tsumo` のみ返す。七対子 `generateChitoitsuHora` には嶺上開花の処理が無く、`ronAndTsumo` で両方返す |
| 平和 | `hora.ts` 約400〜415行。雀頭の条件は `head < z+4`(三元牌を除外)かつ場風・自風でない。北(`z+3`)の雀頭は許される |
| 雀頭の符 | `fu.ts:146`(`type: 'head'`)と `fu.ts:169`(単騎待ちの `block`)の2箇所が `head >= z+4 ? 2 : 場風/自風判定`。平和ツモの判定 `fu.ts:218` も `head < z+4`。`fu()` は引数に `rule` を受け取る |
| 役牌 | `hora.ts` 約472〜488行で白發中を `allTilesCounts[z+4+i] >= 3` で判定。`allTilesCounts` は手牌+副露+和了牌 |
| ドラ | 通常形 `hora.ts:685-695`、七対子 `hora.ts:911-919`。いずれも「表示牌ごとに `nextIndex` の牌の枚数」を合計。`nextIndex(西=z+2)` は北(`z+3`)(`tile/index.ts:185-188`) |
| 国士無双 | `generateKokushiHora` は役満だけを返し、ドラを数えない。役満は通常役(ドラ含む)を置き換えるので、抜きドラ・ドラの加算は不要 |
| 七対子 | `generateChitoitsuHora(table, hand, options, dora, rule)`。ドラ・赤ドラを独自に数える。**抜きドラ・西表示牌のドラ・嶺上開花の加算が必要** |
| 数え役満 | `score.ts` の `calculateBasePoint(fu, han, roundedMangan, accumlatedYakuman)` は飜を引数で受け取るだけで、本番コードの呼び出し元は `uniqueHoras`(`accumlatedYakuman: false` 固定の比較用)のみ。新しい役名を `type: 'yaku'` で足せば、飜の合計(`sumBy(yaku, han)`)に含まれる |
| 役なし判定 | 計算コアに「ドラだけでは和了にならない」判定は無い。現状どおり変更しない(§8) |
| 振聴 | `src/` に振聴の判定・語は無い(統括担当が grep で確認) |
| 残り枚数 | `result.ts:92` `allInputTiles = [...handAndMelds, ...input.dora]` を `tileAvailableCount` に渡す。`tileAvailableCount` は `4 - 枚数` を返し、0 になっても牌を一覧から除かない(`null` は三麻に無い牌・赤の不在のみ) |
| 入力の再帰 | `result.ts` の14枚形・打牌候補の再帰呼び出しは `{ ...input, hand }` で、`nuki` はそのまま引き継がれる |
| テストの `Input` 組み立て | `result.test.ts` に17箇所、`golden.test.ts:147` に1箇所。固定条件の `Rule` は `result.test.ts:50-61`・`golden.test.ts:88-99` |
| 既存テストの記号 | `C6`・`D1`・`N11`・`R1〜R3`・`T1〜T3`・`V1〜V3`・`V6`・`W1` が使用済み。本Issueは接頭辞 `A4-` を付ける |
| golden の北 | 全ケースが抜き北なし。`golden-cases.ts:272` の表示牌 `'34z'`(西・北)は抜き北0枚なら値が変わらない |

### 2.3 期待値の出典と計算過程

- 出典: [mahjong-rules.md](../mahjong-rules.md) §2・§3.3 の【確定】(飜の根拠)と、Wikipedia「麻雀の得点計算」の符計算(副底20符、門前ロン10符、ツモ2符、役牌の雀頭2符、単騎・嵌張・辺張待ち2符、么九牌の明刻4符・暗刻8符、10符単位の切り上げ、平和ツモは20符、七対子は25符)
- 下表は設計担当の手計算。独立レビュー担当の手計算(Y3=32→40、Y4=30、Y5=24→30、N6=15飜)と一致した
- **電脳麻将など外部の計算機との突き合わせは未検証**

| 例 | 計算過程 |
| --- | --- |
| A4-Y03(H'・共通役牌・ロン) | 20+門前ロン10+北の雀頭2+両面0=32 → 40 |
| A4-Y04(H'・抜きドラ・ロン) | 平和ロン 20+10=30 |
| A4-Y05(H'・共通役牌・ツモ) | 20+雀頭2+ツモ2=24 → 30(平和ツモにならない) |
| A4-Y06(H'・抜きドラ・ツモ) | 平和ツモ 20 |
| A4-Y07/Y08(T・ロン) | 共通役牌: 20+10+単騎2+北の雀頭2=34。抜きドラ: 20+10+単騎2+0=32 |
| A4-Y09/Y10(T・ツモ) | 共通役牌: 20+単騎2+雀頭2+ツモ2=26。抜きドラ: 20+2+0+2=24 |
| A4-N06(C) | 立直1+七対子2+抜きドラ4+ドラ(西表示牌2枚×抜き北4枚)8=15 飜 |

## 3. 範囲

- 含む: §4 の各項目とテスト
- 含まない: UI(抜き北の入力欄・抜き北へのロンの案内)、ルール設定画面(B1)、保存(B2)、役なし判定、振聴の判定、支払い(A5)

## 4. 設計

### 4.1 ルール(`rule.ts`)

```ts
export interface Rule {
  // 既存の項目はそのまま
  north: 'nukidora' | 'yakuhai';
}
/** 北の扱いの所定値(mahjong-rules.md §2) */
export const DEFAULT_NORTH: Rule['north'] = 'nukidora';
```

`compareRules` に `a.north === b.north &&` を加える。

### 4.2 入力(`input.ts`)

```ts
export interface Input {
  hand: Tile[];
  melds: Meld[];
  dora: Tile[];
  /** 抜き北の枚数(0〜4の整数)。副露ではない。手牌の枚数に数えない */
  nuki: number;
}
```

`melds` には入れない。よって門前判定・門前ロン加符・平和の `melds.length === 0` は変更不要。

### 4.3 役名(`yaku.ts`)

`yakuNames` に `'north'` を `'red'` の直後、`'nuki-dora'` を `'red-dora'` の直後(末尾)に加える。いずれも `NormalYaku`(`type: 'yaku'`)。

### 4.4 役(`hora.ts`)

`generateHora`(通常形):

1. **役牌：北**: `rule.north === 'yakuhai'` かつ `allTilesCounts[z+3] >= 3`(手牌・副露のポン・槓を含む)なら `{ name: 'north', han: 1 }`(ron/tsumo とも)。白發中の直後に置く
2. **平和**: 雀頭の条件に「`rule.north === 'yakuhai'` なら `head !== z+3`」を加える
3. **嶺上開花**: 条件を `(input.melds.some(m => m.type === 'kan') || input.nuki > 0) && options.rinshan` にする。`hora.ts:742` の tsumo のみ返す処理はそのまま
4. **抜きドラ**: `input.nuki > 0` なら `{ name: 'nuki-dora', han: input.nuki }`(ron/tsumo とも)
5. **ドラ**: 既存の `d` に `input.nuki × (input.dora のうち西(3z)の枚数)` を加える(D3)
6. 抜き北は `allTiles`・`allTilesCounts` に入れない(S3。断么九・混一色・字一色などの判定は現状どおり)

`generateChitoitsuHora`: 引数に `nuki: number` を加える(`result.ts` から `input.nuki` を渡す)。
- 抜きドラ・ドラの加算は通常形の 4・5 と同じ
- `nuki > 0 && options.rinshan` なら嶺上開花 `{ name: 'rinshan', han: 1 }`(ron: false, tsumo: true)を付け、そのときは tsumo の和了だけを返す(H9。通常形の `hora.ts:742` と同じ扱い)
- 七対子の北の対子は役牌の対象外(刻子ではない。符は25符固定)

`generateKokushiHora`: 変更しない(役満のためドラは数えない)。役満が成立したときは既存どおり通常役(抜きドラを含む)は置き換えられる。

### 4.5 符(`fu.ts`)

`fu()` 内で `northHead = rule.north === 'yakuhai' && head === z+3` を求め、
- 雀頭の符の2箇所(`fu.ts:146` の `type: 'head'`、`fu.ts:169` の単騎の `block`)の `head >= z+4 ? 2` を `head >= z+4 || northHead ? 2` にする
- 平和ツモの条件(`fu.ts:218`)に `!northHead` を加える

北の刻子・槓子の符は既存の字牌の扱い(明刻4・暗刻8 等)のまま。

### 4.6 入力の検証と残り枚数(`result.ts`)

`generateResult` の冒頭(`isValidSanmaInput` の直後)で、次のいずれかなら `null` を返す(この順に判定。非整数で (b) の加算をしないため):

- (c) `!Number.isInteger(input.nuki) || input.nuki < 0 || input.nuki > 4`
- (a) `rule.north === 'yakuhai' && input.nuki > 0`
- (b) 北の合計 = 手牌の北 + `instantiateMeld` 後の副露の北 + `input.nuki` + `input.dora` の北(D2) が5以上

`allInputTiles` を `[...handAndMelds, ...input.dora, ...北×input.nuki]` にする。北の牌は `{ type: 'z', n: 4 }`。`generateChitoitsuHora` の呼び出しに `input.nuki` を渡す。

### 4.7 振聴(H10)への影響

計算コアには振聴の判定が無いため、H10 による変更は無い。影響の確認結果:

- **待ちの表示**: 聴牌の待ちは手牌の形(`waitingTiles`)だけで決まり、`nuki` は関与しない。北待ちで北を抜いても待ちから北は消えない
- **残り枚数**: H11 により北の残り枚数は抜いた枚数だけ減る。`tileAvailableCount` は0でも牌を一覧から除かないため、北の残りが0になっても待ちとして表示され続ける(A4-A01 の nuki 3 で確認)
- 結論: **影響なし**(待ちの判定は変わらず、残り枚数の減少は H11 の確定どおり)

## 5. テスト(製造担当が追加、`north.test.ts`)

固定条件は `result.test.ts` と同じ(`Rule.red` は `m:0, p:1, s:1`、`table` は東場・南家、`continue: 0, deposit: 0`)。`Rule.north` はケースごとに指定。牌姿は MPSZ 表記、最後の1枚が和了牌。各テスト名の先頭に `A4-` 付きの記号を付ける(例 `'A4-N01: ...'`)。役の比較は `[name, han]` の組の集合で行う。

### 5.1 牌姿(各牌姿は手で枚数と分解を確かめた)

| 記号 | 牌姿 | 内訳(合計14) | 用途 |
| --- | --- | --- | --- |
| P | `99m123p45p123s789s6p` | 雀頭9m・123p・456p(45p+6p 両面)・123s・789s | 平和形 |
| C | `11m99m11p22p33p44s77z` | 7種の対子、最後7z単騎 | 七対子 |
| K | `444z111m123p456p9s9s` | 北の暗刻・1m暗刻・123p・456p・9s単騎 | 役牌：北 |
| H | `44z123p45p123s789s6p` | 雀頭北・123p・456p(両面)・123s・789s | 北の雀頭(両面待ち) |
| T | `123p456p123s789s4z4z` | 4面子+北の単騎 | 北の雀頭(単騎待ち) |
| M | 手牌 `123p456p123s9m9m`(11枚)+副露 北のポン | 4面子(うち北の明刻)+9m単騎 | 副露した北 |
| S | `234p567p234s88s67s8s` | 234p・567p・234s・雀頭8s・678s(67s+8s 両面) | 断么九(抜き北を数えない) |
| X | `19m19p19s1234566z7z` | 国士無双(手牌13枚 `19m19p19s123456z6z`、6z が雀頭、7z 単騎待ち。十三面待ちではない。統括担当が手計算で確認: 14枚、么九13種すべて、6z が2枚) | 役満と抜き北(北は手牌1+抜き2=3枚で D4(b) に掛からない) |
| A | `111m4z`(4枚) | 1m暗刻+北単騎の聴牌 | 残り枚数 |

### 5.2 テスト項目と期待値

すべて `options.riichi: 'riichi'`(M は副露のため `'none'`)、他のフラグは `false`(指定のあるものを除く)。「抜」は nukidora、「共」は yakuhai。

| 記号 | 条件 | 期待 |
| --- | --- | --- |
| A4-N01 | P、抜、nuki 2、dora `[]`、ロン | 役 = riichi1・pinfu1・nuki-dora2 |
| A4-N02 | P、抜、nuki 2、dora `3z`、ロン | 役 = riichi1・pinfu1・nuki-dora2・dora2 |
| A4-N03 | P、抜、nuki 0、dora `3z`、ロン | 役 = riichi1・pinfu1(nuki-dora・dora なし) |
| A4-N04 | P、抜、nuki 2、ツモ | 役に tsumo1・pinfu1 がある(門前が保たれる) |
| A4-N05 | P、抜、nuki 2、ロン | 符の内訳に `menzen-ron`(10符)がある |
| A4-N06 | C、抜、nuki 4、dora `3z,3z`、ロン | 役 = riichi1・chitoitsu2・nuki-dora4・dora8、`type:'yaku'` の飜の合計が15。参考に `calculateBasePoint(25, 15, false, true)` が 8000 |
| A4-N07 | P、抜、nuki 1、`rinshan: true`、ツモ | 和了は tsumo のみ1件、役に rinshan1 |
| A4-N08 | P、抜、nuki 0、`rinshan: true` | 役に rinshan が無い |
| A4-N09 | C、抜、nuki 1、`rinshan: true`、ツモ | 和了は tsumo のみ1件、役に rinshan1・nuki-dora1 |
| A4-N10 | S、抜、nuki 1、ロン | 役に tanyao1・nuki-dora1 がある |
| A4-N11 | X、抜、nuki 2、ロン | 役 = 役満 kokushi(point 1)のみ(nuki-dora は無い) |
| A4-Y01 | K、共、nuki 0、ロン | 役に north1 |
| A4-Y02 | K、抜、nuki 0、ロン | 役に north が無い |
| A4-Y03 | H、共、ロン | 役に pinfu が無い。符の合計 32(切り上げ後40) |
| A4-Y04 | H、抜、ロン | 役に pinfu。符30 |
| A4-Y05 | H、共、ツモ | 符の内訳に `pinfu-tsumo` が無く `tsumo`(2符)がある。符の合計24(切り上げ後30) |
| A4-Y06 | H、抜、ツモ | 符の内訳に `pinfu-tsumo` がある(20符) |
| A4-Y07 | T、共、ロン | 待ちの `block.fu` が2、符の合計34 |
| A4-Y08 | T、抜、ロン | 待ちの `block.fu` が0、符の合計32 |
| A4-Y09 | T、共、ツモ | 待ちの `block.fu` が2、符の合計26 |
| A4-Y10 | T、抜、ツモ | 待ちの `block.fu` が0、符の合計24 |
| A4-Y11 | M、共、ロン | 役に north1 |
| A4-Y12 | M(副露を北の明槓 `closed:false` に変え、手牌は同じ)、共、ロン | 役に north1 |
| A4-Y13 | M、抜、ロン | 役に north が無い |
| A4-Y14 | K、共、nuki 0、dora `3z`、ロン | 役に north1・dora3 |
| A4-V01 | P、共、nuki 1 | `null`。同じ牌姿で nuki 0 なら `null` でない |
| A4-V02 | P、抜、nuki `-1`・`1.5`・`5` | いずれも `null` |
| A4-V03 | K(北3枚)、抜、nuki 2 | `null`(3+2=5)。nuki 1 なら `null` でない |
| A4-V04 | P、抜、nuki 4、dora `4z` | `null`(4+1=5) |
| A4-V05 | P、抜、nuki 4、dora `[]` | `type:'hora-shanten'` かつ `info.type === 'hora'`(4枚ちょうどは許す) |
| A4-V06 | M(北のポン)、抜、nuki 2 | `null`(副露3+2=5)。nuki 1 なら `null` でない |
| A4-A01 | A、抜、nuki 0 / 2 / 3 | `type: 'tempai'`、待ちに 4z があり、残り枚数がそれぞれ 3 / 1 / 0 |
| A4-R01 | `compareRules` | `north` だけが異なる2つの `Rule` で `false`、同じなら `true` |

## 6. 既存テスト・ゴールデンへの影響

- `result.test.ts`・`golden.test.ts` の固定条件の `Rule` に `north: 'nukidora'` を足す(各1行)
- 両ファイルの `Input` の組み立てに `nuki: 0` を足す(`result.test.ts` 17箇所、`golden.test.ts:147` 1箇所)。期待値は変えない
- 抜き北0枚・所定値 `nukidora` では §4 の変更はいずれも現状と同じ挙動になる(ドラの加算は0、嶺上開花の追加条件は偽、役牌・符・平和の変更は `yakuhai` のときのみ)。結論: **期待値が変わる箇所は見つからなかった**(コード読解による。受け入れ条件4で実行確認)

## 7. 受け入れ条件

検収担当は `feature/issue-12-sanma-north` で次を1項目ずつ確かめる。

1. **変更範囲**: `git diff --name-only main...HEAD` が冒頭の「変更対象」に収まる。`git diff main...HEAD -- src/core/golden-cases.ts` が空
2. **既存テストの差分**: `git diff main...HEAD -- src/core/result.test.ts src/core/golden.test.ts` の追加行が `north: 'nukidora'` と `nuki: 0` を含む行(と整形による行の分割)だけで、`expect` を含む行の変更が無い
3. **型**: `npm run typecheck` が成功する
4. **全テスト**: `npm test` が全件成功する(golden を含む)
5. **新規テスト**: `npx vitest run src/core/north.test.ts --reporter=verbose` で §5.2 の記号 A4-N01〜N11・A4-Y01〜Y14・A4-V01〜V06・A4-A01・A4-R01 がすべて表示され成功する。A4-N09 の期待値は「tsumo のみ1件、rinshan1・nuki-dora1」である
6. **変異試験(red 確認)**: 次の各変更を1つずつ一時的に加えて `npx vitest run src/core/north.test.ts` を実行し、指定のテストが失敗することを確かめ、変更を元に戻す(`git diff` が空に戻ることを確認)
   - 通常形の嶺上開花の条件から `|| input.nuki > 0` を外す → A4-N07 が失敗
   - ドラへの `nuki × 西` の加算を外す(通常形・七対子の両方) → A4-N02・A4-N06 が失敗
   - 七対子の抜きドラ・ドラの加算を外す → A4-N06 が失敗
   - 七対子の嶺上開花を外す → A4-N09 が失敗
   - `fu.ts` の `northHead` を常に `false` にする → A4-Y03・A4-Y05・A4-Y07・A4-Y09 が失敗
   - 平和の `head !== z+3` の条件を外す → A4-Y03 が失敗
   - §4.6 の (b) の副露分を外す → A4-V06 が失敗
   - `'north'` 役を付ける条件を外す → A4-Y01・A4-Y11・A4-Y12 が失敗
   - §4.6 の (a)・(c) の検証を外す → A4-V01・A4-V02 が失敗
   - `fu.ts:218` の `!northHead` だけを外す(雀頭符は残す) → A4-Y05 が失敗
7. **所定値**: `grep -n "north" src/core/rule.ts` に `'nukidora' | 'yakuhai'`、`DEFAULT_NORTH` が `'nukidora'`、`compareRules` 内の `a.north === b.north` が出る
8. **役名**: `grep -n "'north'\|'nuki-dora'" src/core/yaku.ts` が `yakuNames` 内の2行を返す
9. **国士**: `git diff main...HEAD -- src/core/hora.ts` で `generateKokushiHora` の本体に変更が無い
10. **lint**: `npm run lint` が成功する
11. **整形**: `npm run format:check` が成功する

## 8. 後続Issueへの引き継ぎ

- **UI(Epic D)**: 抜き北の枚数の入力欄(0〜4)。`Rule.north === 'yakuhai'` のときは入力欄を無効にし0にする。抜き北へのロンは通常のロンとして入力し、槍槓を選ばないよう案内する。抜き北の嶺上牌でのツモは `rinshan` を選ぶよう案内する。結果表示に `north`(役牌：北)・`nuki-dora`(抜きドラ)の表示名を用意する
- **振聴(将来、判定を入れる場合)**: 北待ちで北を抜いても振聴にしない(H10)
- **役なし判定(UI または後続)**: 計算コアには役なし判定が無い。追加する際は `nuki-dora` を `dora`・`red-dora` と同じく役に数えない
- **点数計算の呼び出し元(A5 等)**: 数え役満は `calculateBasePoint` に `type:'yaku'` の飜の合計(`nuki-dora` を含む)と `rule.accumlatedYakuman` を渡すこと
- **嶺上開花と役満(意図的な既存挙動の維持)**: 嶺上開花の和了で手が役満になるときは、役満が通常役を置き換えて `rinshan` が役から消えるため、ツモだけに絞る判定(`hora.ts` の「役に `rinshan` が含まれるか」)が働かず、ロンの候補も残る。これは mahjong-calc と同じ挙動に意図的に揃えたもので、北抜き・七対子でも同じ判定に従う。根拠: ref-repo の `src/lib/hora.ts:742` が同じ条件であること、オーナーが mahjong-calc の画面で役満の手にロンの候補が出ることを確認したこと(2026-10-30。PR #19 の Codex 指摘への対応として決定)
- **B1**: `Rule.north` の選択肢を設定画面に出す
- **B2**: 保存済みの旧ルールに `north` が無ければ `'nukidora'` で補う
- **B3**: プリセットごとの `north` の値

## 9. 実挙動未確認

- §5.2 の期待値はコード読解と §2.3 の手計算による(独立レビュー担当の手計算とは一致)。電脳麻将など外部の計算機との突き合わせは未検証
- §5.1 の各牌姿の分解(特に K の 1m 暗刻・9s 単騎、T の単騎の扱い)はコード読解による見込み。S の 8s の分解は手計算済み。製造時のテスト実行で確認する
- `parseTiles` の北の表記が `4z`、北の牌が `{ type: 'z', n: 4 }` であることはコード読解による
- §6 の golden への影響なし、§4.7 の振聴の影響なしはコード読解による

## 10. 承認の記録

- 2026-10-30 オーナーが設計を承認した(D1〜D3 は記載どおり、D3 に補足あり)。条件として牌姿 X を通常の国士に差し替えた。製造方式は AGY スキル式とし、PR の作成と Codex レビューへの対応までを委任する
