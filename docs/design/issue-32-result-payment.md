# Issue #32 設計書: B4. 計算結果と支払いの接続

- 対象Issue: #32(Epic B #3 の Sub-Issue)
- 依存: B1(#29 `honbaPoint`・`depositPoint` の設定化)、B2(#30 保存済みルールの補完)、B3(#31 プリセット)。いずれもマージ済み
- 種別: 計算コア(`src/core/`)のみ。UI は扱わない

## 1. 目的

`generateResult` が返す和了候補それぞれに、基本点・飜・符・支払額(`Payment`)をまとめた `score` を付ける。支払額はルールの `tsumoLoss`・`honbaPoint`・`depositPoint` と卓(`Table` の本場数・供託本数)から `calculatePayment` で求める。これにより、CUI から `generateResult` を呼べば支払額まで通しで得られる状態にする。

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項(統括担当経由・ヒアリング済み)

| ID | 確定内容 | 本設計への反映 |
| --- | --- | --- |
| Q1(A) | 和了候補 `Hora` それぞれに、基本点・飜・符・支払額をまとめた `score` を付けて `generateResult` が返す。何切るの先(`discard-shanten` の `next` 内)の和了候補にも付く。基本点計算は本体の関数に置く | §4.2・§4.3。`calculateHoraScore` を新設し、`uniqueHoras` の直後で全候補に付与する。再帰呼び出しの結果を使うため `next` 内にも自動的に付く |
| Q2(A) | `generateResult` の入口で `validateRule` を通し、問題があれば例外。場の不正やツモ本場折半が100の倍数にならない場合は `calculatePayment` の例外をそのまま投げる。牌入力の不正は従来どおり `null` | §4.4 |
| Q3(A) | `multipleYakuman: false` のとき、基本点は成立役満のうち `point` 最大の1つ分(ダブル役満は1つで2倍)。役一覧は全役満を残す。`uniqueHoras` の高点法比較も同じ「最大1つ分」に揃える。表示の工夫は UI Epic へ申し送り | §4.1・§4.5 |
| Q4(C) | `golden.test.ts`・`golden-cases.ts` は一切変更しない。新規テストで golden-cases の全ケースを新しい基本点関数に通し期待値と一致を確認する。テスト側の基本点計算は独立検算として残す(重複許容)。支払額の検証(issue-13 §5 の実例と照合、出典付き)も新規テストに入れる | §3・§5 |
| 共通 | 本場・供託はルールの `honbaPoint`・`depositPoint` を使う(固定値禁止) | `calculatePayment` に `rule` をそのまま渡す |

- Issue の着手条件(オーナー支給のスプレッドシート)は 2026-10-31 に支給済みで、B1(#29)で消化済み

### 2.2 実物調査の結果(コード読解、main `577f703` 時点)

- `src/core/result.ts`: `HoraInfo.hora: Hora[]`。`uniqueHoras(…, rule)` を呼んで和了候補を作るのは2箇所(187行付近: 13枚の通常形+七対子+国士+十三不塔、229行付近: 副露ありの13枚相当)。14枚は296行付近で再帰結果を和了牌で `filter` するだけ。14枚の何切るは `generateResult` を再帰呼び出しして `next` を作る。現在 `validateRule` は呼んでいない。入口の例外はオープン立直の不許可のみ
- `src/core/payment.ts`: `calculatePayment(basePoint, table, by, rule: Pick<Rule,'tsumoLoss'|'honbaPoint'|'depositPoint'>): Payment`。基本点・ツモ損・本場点・供託点を検証し、`calculateTableBonus`(本場数・供託本数の検証、ツモ折半の100の倍数検査)を呼ぶ。どこからも本体では呼ばれていない
- `src/core/score.ts`: `calculateBasePoint(fu, han, roundedMangan, accumlatedYakuman)` は通常役(数え役満を含む)の基本点のみ。役満(`type: 'yakuman'`)の基本点を求める本体関数は存在しない
- `src/core/golden.test.ts` 150〜215行: テスト側だけに「役満なら `8000 × Σpoint`、それ以外は `calculateBasePoint(符, 飜, …)`」の計算がある(`multipleYakuman` は見ていない。ゴールデンのルールは `multipleYakuman: true`)
- `src/core/hora.ts` `uniqueHoras`(1254行〜): 役満を含む候補同士は `Σpoint` の大小で並べる。`multipleYakuman` は見ていない
- `src/core/rule.ts` `validateRule`: `honbaPoint` は `HONBA_POINT_STEP = 200` の倍数を要求する。したがって `validateRule` を通ったルールでは、ツモ折半(`honbaPoint × 本場数 / 2`)は常に100の倍数になり、`calculateTableBonus` の折半例外は `generateResult` 経由では発生しない(本場数が不正な場合の例外は発生する)
- `generateResult`・`uniqueHoras` の呼び出し元は `src/core/` 内(本体は `result.ts`・`hora.ts`、他はテスト)だけで、UI からはまだ呼ばれていない
- docs/mahjong-rules.md §3.2・§3.3: 本場・供託の扱い、数え役満あり(13飜以上)、役満の複合は「認める」(変更可)、ダブル役満は個別設定。いずれも【確定】
- docs/design/issue-13-sanma-payment.md §7: 「`generateResult` 側で基本点(役満は 8000×役満数、数え役満は 8000)を求め、`calculatePayment` を呼ぶ。B2 を済ませてから接続すること」。B2 はマージ済み

## 3. 変更禁止ファイル

製造担当は次のファイルを**1文字も変更しない**。検収は §6 の C-01 で差分なしを確認する。

- `src/core/golden.test.ts`
- `src/core/golden-cases.ts`
- `src/core/payment.ts`・`src/core/bonus.ts`(支払い計算の本体。呼ぶだけで変更不要)
- `src/core/rule.ts`(`validateRule` を呼ぶだけ)
- 既存のテストファイル(`src/core/*.test.ts` のうち §5 で新設するもの以外)。統括担当の実測で、入口検査を入れても既存テストは全件通過する(§8)。万一失敗した場合はテストを直さず統括担当へ報告する

## 4. 設計

### 4.1 `src/core/score.ts` に追加する関数

```ts
/**
 * 役満の倍数。multipleYakuman が true なら成立役満の point の合計、
 * false なら point の最大値(ダブル役満は1つで2)。役満がなければ 0
 */
export const yakumanMultiplier = (
  yaku: readonly Yaku[],
  multipleYakuman: boolean
): number
```

- `Yaku` は `./yaku` から型のみ import する(`score.ts` は現在 import を持たないが、型 import なので循環の問題はない)
- `uniqueHoras`(§4.5)と `calculateHoraScore`(§4.2)の両方がこの関数を使い、基本点と高点法の比較を同じ定義に揃える

### 4.2 新設 `src/core/hora-score.ts`

```ts
import type { Hora } from './hora';
import type { Payment } from './payment';
import type { Rule } from './rule';
import type { Table } from './table';

export interface HoraScore {
  /** 基本点。役満は 8000 × yakumanPoint、それ以外は calculateBasePoint の値 */
  basePoint: number;
  /** 通常役の飜の合計。役満の和了では 0 */
  han: number;
  /** 切り上げ後の符(七対子は 25)。役満の和了、および国士・十三不塔の形では null */
  fu: number | null;
  /** 基本点に用いた役満の倍数(yakumanMultiplier の値)。役満でなければ 0 */
  yakumanPoint: number;
  /** calculatePayment(basePoint, table, hora.by, rule) の結果 */
  payment: Payment;
}

export const calculateHoraScore = (
  hora: Hora,
  table: Table,
  rule: Rule
): HoraScore
```

処理(この順で行う):

1. `yakumanPoint = yakumanMultiplier(hora.yaku, rule.multipleYakuman)`
2. `yakumanPoint > 0` のとき: `basePoint = 8000 * yakumanPoint`、`han = 0`、`fu = null`
3. それ以外: `han = Σ(type==='yaku' の han)`。`fu` は `hora.type === 'mentsu'` なら `ceil10(sumOfFu(hora.fu))`、`'chitoitsu'` なら `25`、それ以外は `null`。`basePoint = calculateBasePoint(fu ?? 0, han, rule.roundedMangan, rule.accumlatedYakuman)`(数え役満は `calculateBasePoint` が 8000 を返す)
4. `payment = calculatePayment(basePoint, table, hora.by, rule)`。例外は捕獲せずそのまま投げる

- 根拠: 役満 8000×倍数・数え役満 8000 は issue-13 §7 の申し送りと mahjong-rules.md §3.3【確定】。符の扱い(25符は切り上げない、それ以外は10符単位切り上げ)は `calculateBasePoint` 内部と golden.test.ts の独立検算に一致する
- `calculateBasePoint` に渡す符は切り上げ済みの値でよい(内部で再度 `ceil10` しても値は変わらない)

### 4.3 `src/core/result.ts` の型変更と付与

```ts
import type { HoraScore } from './hora-score';

/** score 付きの和了候補 */
export type ScoredHora = Hora & { score: HoraScore };

interface HoraInfo {
  type: 'hora';
  hora: ScoredHora[];
}
```

- `ScoredHora`・`HoraScore`・`calculateHoraScore` は export する(CUI・UI から使うため)
- 和了候補を作る2箇所(`hand.length % 3 === 1` の分岐内、`uniqueHoras(...)` を呼ぶ箇所)で、`uniqueHoras` の戻り値を `map(h => ({ ...h, score: calculateHoraScore(h, table, rule) }))` で置き換える。共通化のための内部ヘルパーを作ってよい
- 14枚の分岐は再帰結果の `hora` を和了牌で `filter` するだけなので、そのまま `score` が残る。何切るの `next` も再帰結果なので `score` が付く(Q1)
- 13枚の和了候補にはロン・ツモの両方があり得る。各候補の `score.payment` はその候補自身の `by` で計算する
- `ScoredHora` は `Hora` に代入可能なので、`golden.test.ts` の `findHora(): Hora` は変更なしで型検査を通る

### 4.4 入口の検査(Q2・追加ヒアリング回答)

新設 `src/core/rule-error.ts`:

```ts
import type { RuleIssue } from './rule';

/** validateRule が問題を返したときに generateResult が投げる例外 */
export class RuleValidationError extends Error {
  readonly issues: RuleIssue[];
  constructor(issues: RuleIssue[]) {
    super(`ルールが不正です: ${issues.map(i => i.message).join('、')}`);
    this.name = 'RuleValidationError';
    this.issues = issues;
  }
}
```

`generateResult` は再帰するため、公開関数と内部関数に分ける。

```ts
export const generateResult = (table, input, handOptions, rule): Result => {
  const issues = validateRule(rule);
  if (issues.length > 0) throw new RuleValidationError(issues);
  if (
    !Number.isInteger(table.continue) || table.continue < 0 ||
    !Number.isInteger(table.deposit) || table.deposit < 0
  ) {
    throw new Error('本場数および供託本数は0以上の整数である必要があります');
  }
  return generateResultInner(table, input, handOptions, rule);
};
```

- 既存の本体は `generateResultInner`(export しない)に改名し、内部の再帰呼び出し2箇所も `generateResultInner` に向ける。ルール・卓の検査は1回の呼び出しにつき1回だけ実行される
- 卓の検査は結果の種類(和了・向聴・聴牌・何切る)にかかわらず常に行う(ユーザー回答で確定)。メッセージは `calculateTableBonus` と同一文言とする
- 例外・`null` の先後(この順に判定し、最初に該当したものを返す): (1) ルール不正 → `RuleValidationError` (2) 卓不正 → `Error` (3) 既存のオープン立直不許可 → `Error` (4) 牌入力不正 → `null` (5) 和了候補ごとの `calculatePayment` の例外(ルール・卓の検査後は通常発生しない)。すなわち牌入力が不正でもルール・卓が不正なら例外が優先する
- `RuleValidationError` は `result.ts` から再 export してもよい(任意)

### 4.5 `src/core/hora.ts` `uniqueHoras` の変更(Q3)

役満を含む候補同士の比較を、`sumBy(... y.point ...)` から `yakumanMultiplier(x.yaku, rule.multipleYakuman)` の差に置き換える。他の比較(和了牌・ロン/ツモ・飜・符)は変えない。役一覧(`yaku`)は削らない。

## 5. テスト(新設 `src/core/result-payment.test.ts`)

- テスト名は業務標準05の形式で `B4-xx: …` とする。`test.each` もタイトルを `B4-xx:` で始める
- 期待値は数値リテラルで書き、各テストの直前に出典コメントを置く。実装の関数で期待値を作らない(B4-G01 の `expected` は golden-cases.ts の値を読むだけで、計算はしない)
- golden.test.ts の `parseTiles`・`toMelds`・`handOptionsOf` 等は export されていないので、新規テスト側に複製する(golden.test.ts は変更禁止。重複は Q4 で許容)
- 共通ルールは golden.test.ts と同値の `Rule` を新規テスト内に書く(`honbaPoint: 200`、`depositPoint: 1000`、`multipleYakuman: true`、`tsumoLoss: 'loss'` 等)。各テストで必要な項目だけ上書きする

| ID | 内容 | 期待 | 出典 |
| --- | --- | --- | --- |
| B4-G01 | `test.each(goldenCases)`: golden.test.ts と同じ卓(本場0・供託0)・手役で `generateResult` を呼び、`by` が一致する和了候補1件の `score` を見る | `score.basePoint`・`score.han` が `expected.basePoint`・`expected.han` と一致。`expected.fu` が null でないケースは `score.fu` とも一致 | golden-cases.ts(オーナー手計算・電脳麻将で検算済み) |
| B4-P01 | G02(子・ロン・基本点480)を `tsumoLoss` 3方式で | 3方式とも `payment.total` 2000、`detail.discarder` が `{base:2000, withHonba:2000}` | issue-13 §5.3 A5-P23 |
| B4-P02 | G15(親・ロン・基本点480) | `payment.total` 2900 | issue-13 §5.3 A5-P24 |
| B4-P03 | G02 を `tsumoLoss: 'ron-split'`、卓 2本場・供託1本で | `payment` 全体が `{detail:{by:'ron',discarder:{base:2000,withHonba:2400}}, total:2000, honba:400, deposit:1000, bonus:1400}` と `toEqual` | issue-13 §5.3 A5-P25 |
| B4-P04 | G28(子・役満ロン)を本場0で | `basePoint` 8000、`payment.total` 32000 | issue-13 §5.3 A5-P30 |
| B4-P05 | G27(子・数え役満ロン) | `basePoint` 8000、`yakumanPoint` 0、`payment.total` 32000 | 支払額: issue-13 §5.3 A5-P30(子ロン 4×8000)。数え役満の基本点 8000: A5-P31 の前提と mahjong-rules.md §3.3 |
| B4-P06 | G02 を `honbaPoint: 400`・`depositPoint: 1500`・1本場・供託2本で(固定値を使っていないことの確認) | `payment.honba` 400、`deposit` 3000、`bonus` 3400、`discarder.withHonba` 2400 | mahjong-rules.md §3.2【確定】から手計算 |
| B4-P07 | G01(子・平和ツモ・基本点640)を `tsumoLoss: 'loss'`、卓 0本場で | `detail` が子ツモで `dealer.base` 1300・`nonDealer.base` 700、`total` 2000 | mahjong-rules.md §3.1 ツモ損ありの式から手計算(640×2→1300、640→700) |
| B4-M01 | 役満複合: 手牌 `111z2z555z666z777z` + 和了牌 `2z`(14枚入力、南家・東場、門前)。`multipleYakuman: true`・`suankoTankiDoubleYakuman: true`。14枚入力は和了牌で絞るだけなので ron/tsumo の2候補が残る。候補数が2であることを確認し、`by === 'ron'` の候補1件の `score` を見る | 役一覧に大三元・字一色・四暗刻単騎の3役満が含まれる。`yakumanPoint` 4、`basePoint` 32000、子ロン `payment.total` 128000(参考: tsumo 候補の total は 96000) | mahjong-rules.md §3.3・§4 の役満定義、issue-13 §3 のロン式(4×基本点)から手計算 |
| B4-M02 | B4-M01 と同手牌・同じ候補の選び方で `multipleYakuman: false` | 役一覧は B4-M01 と同じ3役満を残す。`yakumanPoint` 2、`basePoint` 16000、`payment.total` 64000(参考: tsumo 候補は 48000) | Q3 確定事項 |
| B4-M03 | `uniqueHoras` 直接: 和了牌・`by` が同じ合成 `Hora` 2件 A(役満 point 1 を3つ)・B(役満 point 2 を1つ)。`multipleYakuman` true/false の2回 | true では A、false では B が残る(戻り値1件) | Q3 確定事項 |
| B4-D01 | 14枚の何切る: `123456789p1122z3z`(南家・東場)で結果が `discard-shanten`。`tile` が `3z` の `Discard` を探す | その `next` が `hora-shanten`/`hora`。`next.info.hora` は4件で、全要素に `score.payment` が存在し `score.basePoint` がすべて 3000 | Q1 確定事項(構造の確認。値は統括担当の実測) |
| B4-E01 | `test.each` 3件: `honbaPoint: 300`、`depositPoint: -100`、`tsumoLoss: 'none'`(`as unknown as Rule` でキャストしてよい)を入れたルールで和了形(G02)を渡す | 投げられた例外が `RuleValidationError` の instance で、`issues` に該当キー(`honbaPoint`・`depositPoint`・`tsumoLoss`)の要素を含み、`message` が `ルールが不正です` で始まる | Q2・追加回答2 |
| B4-E02 | `test.each` 6件: 卓が 本場 -1・本場 1.5・供託 -1 × 入力が G02 の和了形・向聴形 `1m9m1p3p5p7p1s3s5s7s1z3z5z`(南家、和了でも聴牌でもない13枚) | いずれも `toThrow('本場数および供託本数は0以上の整数である必要があります')`、かつ `RuleValidationError` ではない | 追加回答1 |
| B4-E03 | 不正ルール(`honbaPoint: 300`)かつ不正卓(本場 -1)かつ牌入力不正(`2m` を含む) | `RuleValidationError`(ルール検査が最優先) | §4.4 の順序 |
| B4-E05 | 正常ルール・不正卓(本場 -1)・牌入力不正(`2m` を含む) | 卓の例外を投げる(`null` を返さない) | §4.4 の順序 |
| B4-E04 | 正常ルールで牌入力が不正(`2m` を含む) | `toBeNull()` | Q2(牌入力は従来どおり null) |

- B4-M01・B4-M02・B4-D01・B4-E02 の牌姿は統括担当が実測済み。製造担当は、期待値と食い違った場合は期待値を書き換えず統括担当へ報告する

## 6. 受け入れ条件

検収担当は上から順に実行する。

- [ ] C-01: `git diff --stat main...HEAD -- src/core/golden.test.ts src/core/golden-cases.ts src/core/payment.ts src/core/bonus.ts src/core/rule.ts` の出力が空
- [ ] C-02: `git diff --name-only main...HEAD` に、既存の `*.test.ts` が含まれない(新設の `src/core/result-payment.test.ts` のみ可)
- [ ] C-03: `git diff --name-only main...HEAD` が `src/core/score.ts`・`src/core/hora-score.ts`・`src/core/result.ts`・`src/core/hora.ts`・`src/core/rule-error.ts`・`src/core/result-payment.test.ts` の範囲に収まる(製造担当が他を変えた場合は理由がコミットメッセージにあること)
- [ ] C-04: `grep -nE "\b(1000|200|300|1500|400)\b" src/core/hora-score.ts` の出力が空(本場・供託の額を固定値で書いていない。`8000` は役満の基本点として可)
- [ ] C-05: `src/core/hora-score.ts` が `calculateHoraScore(hora, table, rule): HoraScore` を export し、`HoraScore` が §4.2 の5フィールドを持つ(目視)
- [ ] C-06: `src/core/result.ts` が `ScoredHora` を export し、`HoraInfo.hora` の型が `ScoredHora[]`(目視)
- [ ] C-07: `generateResult` の先頭で `validateRule`(不正なら `RuleValidationError`)→卓の検査の順に行い、再帰呼び出しは検査を通らない内部関数に向いている(目視)
- [ ] C-07b: `src/core/rule-error.ts` が `Error` 派生の `RuleValidationError`(`readonly issues: RuleIssue[]`、`name` が `'RuleValidationError'`)を export している(目視)
- [ ] C-08: `uniqueHoras` の役満比較が `yakumanMultiplier(…, rule.multipleYakuman)` を使っている(目視)
- [ ] C-09: `npx vitest run src/core/result-payment.test.ts` で §5 の全IDが合格し、各タイトルが `B4-` で始まる
- [ ] C-10: `npx vitest run src/core/golden.test.ts` が全件合格(コア不変の確認)
- [ ] C-11: `npm test` 全件合格、`npm run lint`・`npm run typecheck`・`npm run format:check` がエラーなし
- [ ] C-12: §5 の各テストの直前に出典コメントがあり、期待値が数値リテラルである(目視。B4-G01 は golden-cases の値の参照で可)

## 7. 要ヒアリング事項

なし(初稿の2点は統括担当経由のユーザー回答で確定: 卓は入口で常に検査、ルール不正は `RuleValidationError`。§4.4 に反映)

## 8. 後続Issueへの引き継ぎ・残留リスク

- **UI Epic**: `multipleYakuman: false` で役一覧に複数の役満が並ぶが基本点は最大1つ分になる。表示上「採用された役満」をどう見せるかは UI Epic で決める(Q3)。支払額の表記は issue-13 §0・§7 の UI 申し送りに従い、`score.payment` をそのまま使う
- **UI Epic**: `generateResult` はルール不正で `RuleValidationError`(`issues` で項目別に扱える)、卓不正で `Error` を投げる。UI は呼び出しを `try/catch` して表示する。B2 の補完を経たルールを渡す前提
- **UI Epic**: 13枚(和了牌未確定)の結果ではロン・ツモ両方の候補に支払いが付く。どちらを出すかは UI 側で選ぶ
- **既存テスト(解消・実測済み)**: 入口に `validateRule` と卓の検査を入れても、既存テストは全件通過した(統括担当の実測: 686 passed / 27 skipped)
- **残留リスク(性能)**: 14枚の何切るでは再帰ごとに全候補へ `calculatePayment` を呼ぶ。計算量は候補数に比例する軽い処理だが、テスト時間が目立って伸びた場合は報告する

## 9. 実挙動未確認

- B4-M01・B4-M02: 実測済み(true で yakumanPoint 4・基本点32000・ロン128000、false で 2・16000・64000)
- B4-D01: 実測済み(`discard-shanten`、3z切りの next が和了、候補4件とも基本点3000)。B4-E02 の向聴形: 実測済み(4向聴)
- 既存テストへの影響: 解消(実測済み、§8)
- golden-cases の G01・G02・G15・G27・G28 の基本点は golden-cases.ts の `expected.basePoint` で確認済み(480・640・8000 等)。符・飜の内訳は `title` と基本点からの推定で、支払額の期待値は基本点だけで決まるため影響しない

## 10. 承認の記録

- 2026-11-01 オーナーが設計を承認した。製造方式は AGY スキル式とし、PR の作成と Codex レビューへの対応までを委任する
