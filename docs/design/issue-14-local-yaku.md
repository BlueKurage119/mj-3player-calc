# Issue #14 設計書: A6. ローカル役とオープンリーチ

- 対象Issue: #14(Epic A #2 の Sub-Issue)
- 製造ブランチ: `feature/issue-14-local-yaku`
- 変更対象(全ファイル):
  - 新規: `src/core/local-yaku.ts`・`src/core/local-yaku.test.ts`
  - 変更: `src/core/rule.ts`・`src/core/input.ts`・`src/core/yaku.ts`・`src/core/hora.ts`・`src/core/result.ts`
  - テスト変更: `src/core/result.test.ts`・`src/core/golden.test.ts`・`src/core/north.test.ts`・`src/core/golden-cases.ts`(固定条件の `Rule`・`HandOptions` に §4.1・§4.2 の新項目を所定値で加える行だけ)
  - 統括担当がコミット: 本設計書、`docs/mahjong-rules.md` §4.2・§6(コミット 2983fd2 で反映済み)
  - 変更しない: `src/core/score.ts`・`fu.ts`・`payment.ts`・`bonus.ts`・`table.ts`・`src/core/tile/**`・`wasm/**`・`src/ui/**`

## 1. 目的

1. ルール設定 `Rule.localYaku`(ローカル役の一括オン・オフ)と `Rule.openRiichi` を追加する(所定値はどちらも `false`)
2. [麻雀ルール仕様](../mahjong-rules.md) §4.2 の採用ローカル役(八連荘を除く)を計算コアで判定する
3. オープン立直(2飜)・オープンダブル立直(3飜)を立直の入力に加える
4. 燕返し・槓振りの状況入力をコアの入力に加える(UI は範囲外)。人和は天和・地和の入力を子のロンで用いて判定する
5. 天和で和了牌を特定しない扱い(国士13面・純正九蓮・四暗刻単騎)に既存コードを合わせる(§4.7)
6. `localYaku = false`・`openRiichi = false` のとき、既存の結果を一切変えない

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項

| # | 確定事項 | 出典 | 設計への反映 |
| --- | --- | --- | --- |
| 1 | 採用役・飜数・門前限定・喰い下がり、オープン立直の飜数、一括オン・オフ、八連荘と大数隣は採用しない | [mahjong-rules.md](../mahjong-rules.md) §4.2【確定】 | §3・§4.3 |
| 2 | 各役の成立条件 | 同 §4.2.1【確定】 | §3 |
| 3 | 状況の入力(燕返し・槓振りは入力追加、人和は天和・地和の入力を子のロンで用いる、石の上にも三年はダブル立直+海底・河底、十三不搭は天和・地和入力、オープン立直は立直の選択肢) | 同 §4.2.2【確定】 | §4.2・§4.5 |
| 4 | 期待値は §4.2.1 の定義と手計算(電脳麻将は不対応) | 同 §6【確定】 | §5 |
| 5 | `Rule.localYaku: boolean`・`Rule.openRiichi: boolean`、所定値 false。B2 の補完対象 | 統括担当(ヒアリング済み) | §4.1・§7 |
| 6 | 立直の入力に `'open-riichi' \| 'open-double-riichi'` を追加。`Rule.openRiichi` が false で指定されたら例外 | 同 | §4.2・§4.6 |
| 7 | 燕返し・槓振りは boolean の入力を `HandOptions` に追加(コアのみ)。人和は専用入力を設けない | 同、ヒアリング回答 Q1 | §4.2 |
| 7a | 人和は `tenho` を子がロンで用いたとき成立。親のロンでは何も付かない | mahjong-rules.md §4.2.2【確定】(4f7cf21) | §3・§4.4 |
| 7b | 十三不搭は天和・地和と複合しない。国士形は国士優先で十三不搭なし | 同 §4.2.2【確定】、回答 Q2 | §4.5 |
| 7c | 一色三順はほかの面子を副露した手では喰い下がりで2飜(例: 11122233s西西 ロン3s、中ポン) | 同 §4.2【確定】、回答 Q4 | §3・§5 |
| 7d | 天和は和了牌が特定されないため、国士無双は13面待ち・九蓮宝燈は純正・四暗刻は単騎として扱う。地和(子のツモ)は対象外 | 同 §4.2【確定】 | §4.7 |
| 7e | 五門斉は七対子でも成立。人和・状況入力・石の上にも三年は推奨案どおり | 回答 Q3・Q5〜Q7 | §3 |
| 8 | 一色三順と三暗刻+三連刻の読み分けは既存の最高打点選択(`uniqueHoras`)で扱う | 同 | §4.4・§5(A6-L09系) |
| 9 | 十三不搭は天和・地和オンかつ十三不搭形で和了。和了形でないので判定経路を新設する | 同 | §4.5 |
| 10 | テストに出典をコメントで残す | 同、[業務標準07](../rules/07-mahjong-rule-protocol.md) | §5 |
| 11 | `localYaku = false` で既存結果が一切変わらないことを受け入れ条件にする | 同 | §6 |

### 2.2 実物調査の結果(コード読解)

| 調査項目 | 結果 |
| --- | --- |
| 立直の入力の置き場所 | 立直・一発・嶺上・槍槓・海底・天和は `Input` ではなく `HandOptions`(`input.ts`)にある。`generateResult(table, input, handOptions, rule)` が受け取る。確定事項6・7 の「Input」は、計算コアへの入力のうち状況を表す `HandOptions` に置く(§4.2。回答 Q1 で確定) |
| 和了の生成 | 面子手 `generateHora`・七対子 `generateChitoitsuHora`・国士 `generateKokushiHora`(`hora.ts`)が、和了牌ごとにツモ・ロンの `Hora` を作る。役は `{ yaku, ron, tsumo }` で積み、役満が1つでもあれば通常役を捨てる |
| 最高打点選択 | `uniqueHoras` が同一和了牌・同一ツモ/ロンの候補から、役満数→飜(5飜以上)→基本点→飜の順で1つ選ぶ。分解の読み分けはこれに任せられる |
| ダブル立直の分岐 | `options.riichi === 'double-riichi'` を見る箇所が `hora.ts` に3つある(槍槓の付与条件 L513・海底の付与条件 L527・七対子の海底 L897)。立直の飜は `options.riichi === 'double-riichi' ? 2 : 1`(L371・L857) |
| 天和・地和 | `options.tenho` かつ副露なしで、親なら天和・子なら地和を付け、ツモのみを返す(早期 return)。国士・七対子にも同様の分岐がある |
| 天和時の待ちの扱い(確定事項7d の照合) | **既存コードは確定事項7dを満たしていない**。国士(`generateKokushiHora`)は13枚の欠けの有無で `kokushi`/`kokushi-13` を決め、天和でも単騎待ちなら `kokushi`。九蓮(`hora.ts` L290〜333)は和了牌を除いた形で `pure-churen`/`churen` を決める。四暗刻(L178〜200)は和了の待ち(単騎か双碰か)で `suanko-tanki`/`suanko` を決める。いずれも天和でも実際の和了牌に依存する。§4.7 で修正する。既存テスト `result.test.ts` A3-T1 系(L490〜518)は、通常形と13面の国士だけで、修正の影響を受けない |
| 13枚入力の流れ | `result.ts` で 13枚のとき、面子手・七対子・国士のいずれかが聴牌なら和了一覧を返し、それ以外は向聴数を返す。14枚入力は最後の1枚を和了牌として13枚の結果から抽出する |
| 役満の複合 | `Rule.multipleYakuman` は計算コアで参照されていない。役満は常に `point` の合計で数える(既存挙動。本Issueでも変えない) |
| UI | `src/ui/App.tsx` は1行のみで、役名の表示対応表はまだない |

## 3. 判定する役(§4.2.1 の定義の実装上の読み)

記法: 「全牌」は手牌+和了牌+副露の牌(抜き北は含まない)。数字は牌の `n` で比べ、赤は区別しない。△▲は仕様表のとおり。

| 役 | 名前(`yaku.ts`) | 飜/役満 | 判定 | ロン/ツモ | 適用する経路 |
| --- | --- | --- | --- | --- | --- |
| 燕返し | `tsubame-gaeshi` | 1 | 入力 `tsubameGaeshi` | ロンのみ | 面子・七対子 |
| 槓振り | `kan-furi` | 1 | 入力 `kanFuri` | ロンのみ | 面子・七対子 |
| 推不倒 | `toiputao` | 1 | 全牌が 1234589p・245689s・白 のみ | 両方 | 面子・七対子 |
| 十二落抬 | `shiiaru-raotai` | 1 | 副露4つかつ暗槓なし(=手牌1枚の単騎) | 両方 | 面子 |
| 五門斉 | `uumensai` | 2 | 全牌に萬子・筒子・索子・風牌・三元牌がすべてある | 両方 | 面子・七対子 |
| 三連刻 | `sanrenko` | 2 | 同色で数の連続する刻子(槓子含む)3つ | 両方 | 面子 |
| 一色三順 △ | `isshoku-sanjun` | 門前3・副露あり2 | 同色同数の順子3組。成立時は一盃口を付けない。門前は既存の `menzen` で判定 | 両方 | 面子 |
| 人和 | `renho` | 役満1 | 入力 `tenho` かつ子(`!isDealer`)かつ副露なし | ロンのみ | 面子・七対子・国士 |
| 四連刻 | `surenko` | 役満1 | 同色で数の連続する刻子(槓子含む)4つ | 両方 | 面子 |
| 一色四順 | `isshoku-yonjun` | 役満1 | 同色同数の順子4組 | 両方 | 面子 |
| 紅孔雀 | `beni-kujaku` | 役満1 | 全牌が 1579s・中 のみ | 両方 | 面子 |
| 紅一点 | `koitten` | 役満1 | 全牌が 23468s・中 のみ、かつ中を含む | 両方 | 面子 |
| 黒一色 | `kokuiso` | 役満1 | 全牌が 248p・東南西北 のみ | 両方 | 面子・七対子 |
| 大車輪 ▲ | `daisharin` | 役満1 | 全牌が 2〜8p 各2枚(14枚) | 両方 | 面子・七対子 |
| 大竹林 ▲ | `daichikurin` | 役満1 | 全牌が 2〜8s 各2枚(14枚) | 両方 | 面子・七対子 |
| 石の上にも三年 ▲ | `ishino-ue` | 役満1 | ダブル立直系(§4.3)かつ海底・河底が付く条件(既存の付与条件と同じ) | 両方(ツモ=海底・ロン=河底) | 面子・七対子・国士 |
| 十三不搭 ▲ | `shisanputa` | 役満1 | §4.5 | ツモのみ | 新経路 |
| 金門橋 ▲ | `kinmonkyo` | 役満1 | 門前で、同色の順子 123・345・567・789 と任意の雀頭 | 両方 | 面子 |
| 東北新幹線 ▲ | `tohoku-shinkansen` | 役満1 | 門前で、東と北の一方が刻子(暗槓含む)・他方が雀頭、残り3面子が同色の 123・456・789 | 両方 | 面子 |
| 純正緑一色 | `junsei-ryuiso` | 役満2 | 緑一色の条件を満たし、發を含まない。成立時は `ryuiso` を付けない | 両方 | 面子 |
| 大七星 ▲ | `daichisei` | 役満2 | 七対子で字牌7種。成立時は `tsuiso` を付けない | 両方 | 七対子 |
| オープン立直 | `open-riichi` | 2 | 立直入力 `'open-riichi'`(門前のとき) | 両方 | 面子・七対子 |
| オープンダブル立直 | `open-double-riichi` | 3 | 立直入力 `'open-double-riichi'`(門前のとき) | 両方 | 面子・七対子 |

- ▲(門前限定)は、既存の `menzen`(副露が暗槓だけ)で判定する。大車輪・大竹林・大七星は形から副露がありえないので判定を省いてよい
- 一色三順は、ほかの面子を副露した手(門前でない手)では喰い下がりで2飜とする(確定事項7c)
- 上位役の置き換え: 四連刻と三連刻、一色四順と一色三順・二盃口は、役満が通常役を捨てる既存の仕組みで自然に排他になる。純正緑一色→緑一色、大七星→字一色、一色三順→一盃口は明示的に外す
- 人和は子のロンのみ。親が `tenho` でロンしても何も付かない(既存どおりロンの和了を作らない)
- 人和の「それまでに鳴きがない」は入力から確かめられないため、自分の副露が1つもない(暗槓も不可)ことだけを条件にする(回答 Q5)
- 状況入力(燕返し・槓振り・天和/地和)の組み合わせの矛盾(例: 人和と燕返し、槍槓と槓振りの同時指定)は検証せず、それぞれ独立に付ける(回答 Q6)
- `localYaku = false` のときは、上表のオープン立直2行以外を一切付けず、`tsubameGaeshi`・`kanFuri` の入力は無視する(例外にしない。回答 Q6)。子の `tenho` でもロンの和了を作らない(既存どおり)
- 石の上にも三年はオープンダブル立直でも成立する(回答 Q7)

## 4. 設計

### 4.1 `rule.ts`

```ts
/** ローカル役の所定値(mahjong-rules.md §4.2) */
export const DEFAULT_LOCAL_YAKU = false;
/** オープン立直の所定値(mahjong-rules.md §4.2) */
export const DEFAULT_OPEN_RIICHI = false;

export interface Rule {
  // 既存項目は変更しない
  /** ローカル役(§4.2 の表、八連荘を除く)を一括で採用する */
  localYaku: boolean;
  /** オープン立直・オープンダブル立直を採用する */
  openRiichi: boolean;
}
```

`compareRules` に `a.localYaku === b.localYaku && a.openRiichi === b.openRiichi` を加える。

### 4.2 `input.ts`(`HandOptions`)

```ts
export interface HandOptions {
  riichi:
    | 'none'
    | 'riichi'
    | 'double-riichi'
    | 'open-riichi'
    | 'open-double-riichi';
  ippatsu: boolean;
  rinshan: boolean;
  chankan: boolean;
  haitei: boolean;
  tenho: boolean;
  /** 燕返し: 他家の立直宣言牌でロン(ローカル役) */
  tsubameGaeshi: boolean;
  /** 槓振り: 他家の槓・北抜き直後の打牌でロン(ローカル役) */
  kanFuri: boolean;
}
```

新項目は必須プロパティとする(既存テストの固定 `HandOptions` に `false` で加える)。

### 4.3 `yaku.ts`

- `yakuNames` に `open-riichi`・`open-double-riichi`・`tsubame-gaeshi`・`kan-furi`・`toiputao`・`shiiaru-raotai`・`uumensai`・`sanrenko`・`isshoku-sanjun` を追加
- `yakumanNames` に `renho`・`surenko`・`isshoku-yonjun`・`beni-kujaku`・`koitten`・`kokuiso`・`daisharin`・`daichikurin`・`ishino-ue`・`shisanputa`・`kinmonkyo`・`tohoku-shinkansen`・`junsei-ryuiso`・`daichisei` を追加
- 既存の名前の順序・値は変えない(末尾に追加する)

### 4.4 `local-yaku.ts`(新規)と `hora.ts` の変更

`local-yaku.ts` に役判定を集め、`hora.ts` からは呼び出すだけにする(既存の分岐への差し込みを最小にするため)。関数分割は製造に任せるが、次の性質を守る。

- 判定関数は純関数とし、`rule.localYaku === false` なら空配列を返す(呼び出し側で分岐してもよいが、`localYaku = false` で既存の役配列と完全に同じ順序・内容になること)
- 戻り値は既存と同じ `{ yaku: Yaku; ron: boolean; tsumo: boolean }` / `{ yakuman: Yakuman; ron: boolean; tsumo: boolean }` の形にし、既存の `yaku`・`yakuman` 配列の**末尾に**追加する
- 置き換え(純正緑一色・大七星・一色三順)は、上位役が成立したときだけ下位役を配列から除く

ダブル立直系の扱い: `hora.ts` に `isDoubleRiichi = r === 'double-riichi' || r === 'open-double-riichi'` 相当を置き、§2.2 の3箇所の `=== 'double-riichi'` をこれに置き換える。立直の飜は `riichi 1・double-riichi 2・open-riichi 2・open-double-riichi 3` の対応表で決め、役名は入力値をそのまま使う。`openRiichi` が false なら §4.6 で例外になるので、`'open-*'` が届くのは `openRiichi = true` のときだけ。

経路ごとの差し込み:

| 経路 | 差し込み |
| --- | --- |
| `generateHora` | 天和・地和の早期 return の前に形の役満を判定する。`tenho` の早期 return は、親なら従来どおりツモ(天和)だけを返す。子は、ツモ(地和+形の役満)に加え、`rule.localYaku` のときだけロン(人和+形の役満。ロンで成立しない四暗刻(双碰)等は既存の `ron` フラグに従う)も返す。通常役は既存の通常役の後に追加 |
| `generateChitoitsuHora` | 既存は役満があるとツモ・ロンに同じ役満を返す。子の `tenho` で人和(ロンのみ)を返せるよう、役満をツモ用・ロン用に分けて組み立てる。大七星は `tsuiso` を置き換える |
| `generateKokushiHora` | 子の `tenho` かつ `localYaku` で、ロン(国士+人和)を加える。石の上にも三年を国士の役満に加える。天和の扱いは §4.7 |

A6-L30 のため、面子手の局所役判定は1つの関数として export する(例: `judgeMentsuLocalYaku(ctx)`。`ctx` は面子の一覧(種類と先頭牌)・雀頭・副露・和了牌・門前か・ツモ/ロン・卓・`HandOptions`・`Rule` を持つ)。名前と引数の細部は製造に任せるが、`generateHora` を経ずに一色三順の飜を検査できること。

読み分け(一色三順 ⇔ 三暗刻+三連刻、大車輪の七対子 ⇔ 面子手など)は、分解結果ごとに役を付け、`uniqueHoras` の既存の選択に任せる。`uniqueHoras` は変更しない。

### 4.5 十三不搭の判定経路

- 形の定義(14枚): 13種の牌が各1枚・1種だけ2枚(3枚以上なし)。かつ同じ色の数牌どうしは、どの2種も数が3以上離れている(順子・搭子・嵌張がない)
- `local-yaku.ts` に `isShisanputa(counts)` と `generateShisanputaHora(table, hand, options, rule): Hora[]` を置く。手牌13枚に加えると十三不搭形になる牌をすべて和了牌とし、それぞれ `by: 'tsumo'`・役 `[{ type: 'yakuman', name: 'shisanputa', point: 1 }]` の和了を返す。天和・地和は付けない(確定事項7b)
- 呼び出し条件: `rule.localYaku && handOptions.tenho && input.melds.length === 0 && input.hand.length === 13`
- `result.ts` の13枚の分岐で、既存の聴牌判定(面子手・七対子・国士のいずれかが0向聴)に「十三不搭の和了牌が1つ以上ある」を OR で加え、和了一覧に十三不搭の和了を合流させてから `uniqueHoras` を通す。14枚入力は既存の抽出処理でそのまま扱える
- `hora.ts` の `SpecialHora.type` に `'shisanputa'` を加える。符は既存どおり特殊形として扱う(役満なので点数に影響しない)
- 国士無双の形は十三不搭の形も満たす。両方を生成し、`uniqueHoras` で国士+天和(役満2)が十三不搭(役満1)より選ばれる。念のため `generateShisanputaHora` は国士の形(`countKokushiShanten` が0の13枚)のとき空配列を返す(確定事項7b)

### 4.7 天和の待ちの扱いの修正(確定事項7d)

条件はすべて「`options.tenho` かつ親(`isDealer(table)`)」のとき。子(地和)と天和なしは変えない。`localYaku` によらず適用する(ローカル役ではないため)。

- `generateKokushiHora`: 天和の分岐で、役満名を常に `kokushi-13`、point を `rule.kokushi13DoubleYakuman ? 2 : 1` とする
- `generateHora` の九蓮: 九蓮の形が成立したら、天和のときは常に `pure-churen`(point は `rule.pureChurenDoubleYakuman ? 2 : 1`)とする
- `generateHora` の四暗刻: 四暗刻の形(門前・全ブロックが刻子か対子)が成立したら、天和のときは待ちによらず `suanko-tanki`(point は `rule.suankoTankiDoubleYakuman ? 2 : 1`)とする
- 和了牌の一覧(どの牌で和了とするか)は変えない

### 4.6 `result.ts` の入口検証

`generateResult` の先頭で、`handOptions.riichi` が `'open-riichi'` または `'open-double-riichi'` かつ `rule.openRiichi === false` なら `Error` を投げる(既存の `null` を返す入力検証より前)。メッセージは製造に任せる。

## 5. テスト(`src/core/local-yaku.test.ts`)

- テスト名は `A6-Lxx:`(ローカル役)・`A6-Txx:`(天和の待ちの扱い)・`A6-Oxx:`(オープン立直)・`A6-Rxx:`(ルール・例外・無効時)で始める(業務標準05 の命名規約)
- 各テストに出典コメントを残す: 役の成否・飜数は「mahjong-rules.md §4.2・§4.2.1」、符・基本点は「手計算(Wikipedia『麻雀の得点計算』の式、mahjong-rules.md §6)」
- 既定の条件: 自風南・場風東・0本場・`Rule` は既存テストの固定条件に `localYaku: true`・`openRiichi: true` を加えたもの。`HandOptions` はすべて off。和了は `generateResult` の和了一覧から和了牌と `by` で1件取り出して検査する
- 「役」は名前と飜(役満は point)の集合で比べる(順序は問わない)。基本点は `calculateBasePoint(sumOfFu(fu), 飜, false, false)`、役満は `8000 × point合計`

| ID | 手牌(13枚)+和了牌 | 副露・条件 | 期待 |
| --- | --- | --- | --- |
| A6-L01 | 234p567p345s678s9s + 9s | 燕返し on | ロン: {燕返し1}。ツモ: {門前清自摸和1}(燕返しなし) |
| A6-L02 | 同上 | 槓振り on | ロン: {槓振り1}。ツモに槓振りなし |
| A6-L03 | 同上 | 天和/地和 on・自風南 | ロン: {人和 役満1}、ツモ: {地和 役満1}。自風東(親)ではロンの和了が無く、ツモ: {天和 役満1} |
| A6-L04 | 123p345p456s白白白9p + 9p | — | ロン: {推不倒1, 白1}=2飜 |
| A6-L05 | 5p + 5p | ポン1m・9m・西・白 | ロン・ツモとも {十二落抬1, 対々和2, 白1}=4飜。西を暗槓に替えると十二落抬なし |
| A6-L06 | 111m234p456s西西西白 + 白 | — | ロン: {五門斉2} |
| A6-L07 | 11m22p33s東東白白55p6s + 6s | 七対子 | ロン: {七対子2, 五門斉2}=4飜 |
| A6-L08 | 888p999p345s1m + 1m | ポン7p | ロン: {三連刻2} |
| A6-L09 | 222p333p44p567s99s + 4p | — | ロン: {平和1, 一色三順3}=4飜30符、基本点1920(一盃口なし。三連刻の読み 2飜40符640 より高い) |
| A6-L10 | 同上 | — | ツモ: 5飜、基本点2000(一色三順+平和+ツモ と 三暗刻+三連刻+ツモ が同点。役の内訳は検査しない) |
| A6-L11 | 111p222p333p567s9s + 9s | — | ロン: {三暗刻2, 三連刻2}=4飜50符、基本点2000(一色三順の読み 3飜40符1280 より高い) |
| A6-L12 | 11122233s西西 + 3s | ポン中(仕様 §4.2 の例) | ロン: 5飜、基本点2000(一色三順2+中1+混一色2 と 三連刻2+中1+混一色2 が同点。内訳は検査しない) |
| A6-L13 | 西 + 西 | ポン2s・3s・4s、明槓5s | ロン: {四連刻 役満1} |
| A6-L14 | 2222p3333p444p99s + 4p | — | ロン: {一色四順 役満1} |
| A6-L15 | 777s999s中 + 中 | ポン1s・5s | ロン: {紅孔雀 役満1} |
| A6-L16 | 234s234s666s中中中8s + 8s | — | ロン: {紅一点 役満1} |
| A6-L17 | 234s234s666s888s4s + 4s | — | ロン: {純正緑一色 役満2}(緑一色なし)。`localYaku=false` では {緑一色 役満1} |
| A6-L18 | 22p44p88p東東南南西西北 + 北 | 七対子 | ロン: {黒一色 役満1} |
| A6-L19 | 2233445566778p + 8p | — | ロン: 役満合計1 で {大車輪} を含む |
| A6-L20 | 2233445566778s + 8s | — | ロン: 役満合計1 で {大竹林} を含む |
| A6-L21 | 234p567p345s678s9s + 9s | ダブル立直・海底 on | ツモ・ロンとも {石の上にも三年 役満1}。立直(通常)では付かない |
| A6-L22 | 同上 | オープンダブル立直・海底 on | ツモ・ロンとも {石の上にも三年 役満1} |
| A6-L23 | 1m9m1p4p7p2s5s8s東南西北白 + 白 | 天和 on・自風東(自風南でも同じ) | ツモ: {十三不搭 役満1}(天和・地和なし)。和了牌は手牌の13種それぞれ(13件)。ロンはない。14枚入力(+白)でも同じ和了が返る |
| A6-L24 | 同上 | 天和 off | 和了ではなく向聴数の結果(`info.type === 'shanten'`) |
| A6-L25 | 1m9m1p9p1s9s東南西北白發中 + 中 | 天和 on・自風東 | ツモ: {国士無双 役満1, 天和 役満1}(十三不搭は付かない) |
| A6-L26 | 123p345p567p78p99s + 9p | — | ロン・ツモ: {金門橋 役満1} |
| A6-L27 | 123s456s789s東東東北 + 北 | — | ロン: {東北新幹線 役満1} |
| A6-L28 | 123s456s789s北北北東 + 東 | — | ロン: {東北新幹線 役満1} |
| A6-L29 | 東東南南西西北北白白發發中 + 中 | 七対子 | ロン: {大七星 役満2}(字一色なし) |
| A6-L30 | 11122233s西西 + 3s、中ポンの一色三順の読み | `local-yaku.ts` の面子手の判定関数を直接呼ぶ(§4.4) | 一色三順2飜(喰い下がり)。同じ順子3組で門前(副露なし)なら3飜 |
| A6-T01 | 1m9m1p9p1s9s東南西北白白發 + 中 | 天和 on・自風東、`kokushi13DoubleYakuman` を true/false の2通り | ツモ: {国士無双十三面(`kokushi-13`) 役満2/1, 天和 役満1} |
| A6-T02 | 1112345567899p + 9p | 天和 on・自風東、`pureChurenDoubleYakuman` true/false | ツモ: {純正九蓮宝燈 役満2/1, 天和 役満1} |
| A6-T03 | 111p222p333s東東西西 + 東 | 天和 on・自風東、`suankoTankiDoubleYakuman` true/false | ツモ: {四暗刻単騎 役満2/1, 天和 役満1} |
| A6-T04 | A6-T01〜T03 と同じ牌姿 | 天和/地和 on・自風南(地和) | ツモ: {国士無双 1, 地和 1}・{九蓮宝燈 1, 地和 1}・{四暗刻 1, 地和 1}(和了牌どおり。変更なし) |
| A6-T05 | A6-T01〜T03 と同じ牌姿 | 天和 off・自風東 | 既存どおり 国士無双・九蓮宝燈・四暗刻(ツモ)。`localYaku` の値によらない |
| A6-O01 | 234p567p345s678s9s + 9s | オープン立直 | ロン: {オープン立直2}=2飜40符、基本点640 |
| A6-O02 | 同上 | オープンダブル立直 | ロン: {オープンダブル立直3}=3飜40符、基本点1280 |
| A6-O03 | 同上 | オープン立直、`localYaku=false` | ロン: {オープン立直2}(ローカル役の設定と独立) |
| A6-R01 | 同上 | `openRiichi=false` でオープン立直・オープンダブル立直(各1) | `generateResult` が例外を投げる |
| A6-R02 | A6-L01〜L29 の各牌姿・条件 | `localYaku=false` | どの和了にも §4.3 で追加したローカル役の名前が現れない(`test.each`) |
| A6-R03 | 同上 | `localYaku=false` | 結果が、同じ入力で `tsubameGaeshi`・`kanFuri` を false にしたものと `toEqual` で一致する(入力の無視) |
| A6-R04 | — | — | `compareRules` が `localYaku`・`openRiichi` の違いを区別する |

手計算の根拠(要点):
- L09: 234p×3+567s+99s、4p は 23p の両面待ちで平和。ロン門前平和 30符。4飜30符 = 30×2^6 = 1920。別読み 222p・333p(暗刻)+444p(ロンで明刻)は三暗刻にならず三連刻2飜、符 20+10+4+4+2=40、2飜40符=640
- L11: 9s 単騎のため三暗刻が崩れない。符 20+10+8+4+4+2=48→50、4飜50符=3200→満貫2000。別読み 一色三順3飜、符 20+10+2=32→40、40×2^5=1280
- L12: 副露あり。一色三順の読み(123s×3+西西+中ポン、辺張) 一色三順2+中1+混一色2=5飜→満貫2000。三連刻の読み(111s・222s暗刻+333s明刻) 三連刻2+中1+混一色2=5飜→満貫2000。副露ありでは三連刻の読みの符が常に高いため、一色三順の2飜は A6-L30 で判定関数を直接検査する
- T01〜T03: 仕様 §4.2(7d)と既存のルール設定項目(`kokushi13DoubleYakuman` 等)の定義から。役満の point は設定が true なら2
- O01・O02: 単騎 符 20+10+2=32→40。2飜=640、3飜=1280

## 6. 受け入れ条件

- [ ] `npx vitest run src/core/local-yaku.test.ts --reporter=verbose` が成功し、§5 の表の全IDが `A6-Lxx:`・`A6-Txx:`・`A6-Oxx:`・`A6-Rxx:` で始まるタイトルとして現れる(`grep -o "A6-[LTOR][0-9]*:" src/core/local-yaku.test.ts | sort -u` で A6-L01〜L30・A6-T01〜T05・A6-O01〜O03・A6-R01〜R04 が過不足なく出る)
- [ ] §5 の期待値(役・飜・符・基本点)がテストのソースに数値で直書きされ、各テストに出典コメントがある(ソースを目視)
- [ ] **既存結果の不変**: `git diff main -- src/core/result.test.ts src/core/golden.test.ts src/core/north.test.ts src/core/golden-cases.ts` が、固定の `Rule` に `localYaku: false,`・`openRiichi: false,`、固定の `HandOptions` に `tsubameGaeshi: false,`・`kanFuri: false,` を加える追加行だけである(期待値の変更・削除行がない)。かつこれらのテストの件数と結果が main と同じ(`npx vitest run` の該当ファイルの件数を main と比べる)
- [ ] A6-T01〜T05 が成功する(天和は国士13面・純正九蓮・四暗刻単騎、地和と天和なしは従来どおり)。`result.test.ts` の A3-T1 系が無変更で成功する
- [ ] A6-R02・A6-R03 が成功する(`localYaku=false` でローカル役が現れず、状況入力が無視される)
- [ ] `grep -n "localYaku\|openRiichi\|DEFAULT_LOCAL_YAKU\|DEFAULT_OPEN_RIICHI" src/core/rule.ts` で、型2項目・所定値定数2つ(値は `false`)・`compareRules` の2条件が出る
- [ ] `grep -n "'double-riichi'" src/core/hora.ts` の各出現が、オープンダブル立直も同等に扱う判定(§4.4 の `isDoubleRiichi` 相当)または飜の対応表の中だけである(素の `=== 'double-riichi'` 比較が残っていない)
- [ ] `uniqueHoras` の本体に差分がない(`git diff main -- src/core/hora.ts` で `uniqueHoras` 関数内の行が変わっていない)
- [ ] `git diff main -- src/core/score.ts src/core/fu.ts src/core/payment.ts src/core/bonus.ts src/core/table.ts src/core/tile src/ui wasm` が空
- [ ] `yaku.ts` の既存の名前の順序が変わっていない(`git diff main -- src/core/yaku.ts` が追加行だけ)
- [ ] 三麻の不変条件: 追加テストの牌姿に 2m〜8m がなく、チーの副露がない(ソースを目視)
- [ ] `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて成功する
- [ ] 追加・変更ファイルに絶対パス・ホームディレクトリ名がない

## 7. 後続Issueへの引き継ぎ

- **B1(ルール項目の拡張)**: `localYaku`・`openRiichi` の切り替えUI
- **B2(保存とマイグレーション)**: 保存済みルールに `localYaku`・`openRiichi` がなければ `DEFAULT_LOCAL_YAKU`・`DEFAULT_OPEN_RIICHI`(どちらも false)で補う。未補完の `undefined` は偽として振る舞うが、`compareRules` が保存済みと既定を別物と判定するため、補完を必須とする
- **UI の Issue**: 立直の選択肢にオープン立直・オープンダブル立直を加える(`rule.openRiichi` が true のときだけ表示。false で選ばせると例外になる)。燕返し・槓振りの入力欄(`rule.localYaku` が true のときだけ表示)。人和は天和・地和の入力を子がロンで使う(専用欄なし)。十三不搭は天和・地和の入力で扱い、専用欄は作らない。役名の日本語表示に §3 の名前の対応を加える
- **結果への接続**: `SpecialHora.type` に `'shisanputa'` が増えたため、和了の表示で `type` を分岐する箇所は対応が要る

## 8. 要ヒアリング事項

- なし(旧Q1〜Q7 は回答済みで、確定事項7〜7eとして反映した)

## 9. 実挙動未確認

- 本設計はコード読解に基づき、実装・実行による確認はしていない
- 分解器(`minShanten` の `results`)が 222p333p44p のような形で「刻子の読み」と「順子の読み」の両方を返す前提で、A6-L09〜L12 を設計した。片方しか返らない場合は読み分けが成立しない。製造担当は該当テストが期待と食い違ったら、実装を合わせ込まず停止して報告すること
- 一盃口の既存実装が同一順子3組をどう数えるかは確認していない(A6-L09 は一色三順成立時に一盃口を外すので影響しない)
- 期待値は §4.2.1 の定義と手計算のみによる(電脳麻将は不対応のため照合していない。仕様 §6 のとおり)
