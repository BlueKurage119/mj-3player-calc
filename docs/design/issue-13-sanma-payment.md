# Issue #13 設計書: A5. 支払い計算(ツモ損3方式)

- 対象Issue: #13(Epic A #2 の Sub-Issue)
- 製造ブランチ: `feature/issue-13-sanma-payment`
- 変更対象(全ファイル):
  - 新規: `src/core/payment.ts`・`src/core/payment.test.ts`
  - 変更: `src/core/rule.ts`(`tsumoLoss` の追加、所定値定数、`compareRules`)・`src/core/bonus.ts`(古いコメント1箇所の修正のみ。§4.4)
  - テスト変更: `src/core/result.test.ts`・`src/core/golden.test.ts`・`src/core/north.test.ts`(固定条件の `Rule` に `tsumoLoss` の1行を加えるのみ)
  - 統括担当がコミット: 本設計書、`docs/mahjong-rules.md` §3.1・§3.2、`docs/requirements.md`(統括担当が改訂済み)
  - 変更しない: `src/core/score.ts`・`src/core/result.ts`・`src/core/hora.ts`・`src/core/golden-cases.ts`・`src/ui/**`

## 0. 支払額の表記

本設計書では支払額を次のように書く(UI の表記と揃える)。

- 和了者が子のツモ: 「子の支払額・親の支払額」(例 `800・1300`)
- 和了者が親のツモ、または子ツモで2人が同額: 「○○オール」(例 `2000オール`)
- ロン: 放銃者の支払額(例 `2000`)
- 本場込みは「→」で併記する(例 `700オール → 1000オール`)

## 1. 目的

1. ルール設定 `Rule.tsumoLoss` を3値(ツモ損あり／北家分折半／ロン打点折半)で追加する(所定値: ツモ損あり)
2. 基本点・卓情報・ルールから、三麻の支払い(各支払者の負担額、合計、本場・供託の加算額)を返す純関数を `src/core/payment.ts` に新設する
3. `generateResult` にはまだ繋がない(本番の呼び出し元は後続Issue)

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項(統括担当経由・ヒアリング済み)

| # | 確定事項 | 出典 | 設計への反映 |
| --- | --- | --- | --- |
| 1 | 端数処理: ツモ損ありは四麻のツモ支払額から北家分を除く。北家分折半は四麻のツモ支払額(100点切り上げ済み)に北家の支払額(同)の1/2を足して100点切り上げ(基本点からの直接計算は不可)。ロン打点折半は基本点Pから直接、子ツモ ceil100(2P) オール・親ツモ ceil100(3P) オール | ヒアリング1、[mahjong-rules.md](../mahjong-rules.md) §3.1【確定】 | §3・§4.3 |
| 2 | 本場はツモで1本につき各 `honbaPoint/2`。端数が出る設定は `calculateTableBonus` の例外のまま | ヒアリング1、同 §3.2【確定】 | §4.3 |
| 3 | 実例(雀魂・一番街の実機画面、ユーザー採取、2026-10-30)と §3.1 の満貫ツモ例をテストにする。セガMJ公式も北家分を折半し端数を切り上げるとされる(統括担当からの情報。本設計では未閲覧。一次資料: <https://sega-mj.com/players/gameguide/manual/rule/rule_b/>、<https://www.sega-mj.com/arcade/howto/play/rule/three.html>) | ヒアリング1、[業務標準07](../rules/07-mahjong-rule-protocol.md) | §5 |
| 4 | `Rule.tsumoLoss` を3値で追加。所定値ツモ損あり。値名は設計で決める。`compareRules` に追加 | ヒアリング2 | §4.1 |
| 5 | `payment.ts` に純関数を新設し `calculateTableBonus` の結果を足し込む。`generateResult` には繋がない。支払者は親/子で表す。基本点は引数で受け取る | ヒアリング3 | §4.2・§4.3 |
| 6 | 例外(`calculateTableBonus` 由来)はそのまま投げる | ヒアリング4 | §4.3 |
| 7 | ロンは3方式とも同額。本場は方式によらず §3.2。ロン打点折半は和了者自身(親/子)のロン点を折半 | ヒアリング5 | §3・§4.3 |
| 8 | 表示要件(UIはA5範囲外): 各支払者の負担額(本場抜き・本場込み)、合計額、本場と供託による加算額をコアで算出できること | ヒアリング6 | §4.2 |
| 9 | 基本点が正の整数でなければ例外を投げる | 追加ヒアリング(旧Q1) | §4.3 手順0 |
| 10 | ツモ損ありの満貫未満・役満のテスト(§3 の式からの導出)は設計どおりでよい | 追加ヒアリング | §5.3 |
| 11 | `payment.ts` は、`honbaPoint` が0以上の整数でない場合(ロンでも)と、`tsumoLoss` が `'loss'`・`'north-split'`・`'ron-split'` 以外の場合に例外を投げる。検証順序は設計で決める | 追加ヒアリング(旧Q2、回答「例外にする」) | §4.3 手順0 |

### 2.2 実物調査の結果(コード読解)

| 調査項目 | 結果 |
| --- | --- |
| `calculateBasePoint`(`score.ts`) | `(fu, han, roundedMangan, accumlatedYakuman)` で満貫以上の打ち止めまで行った基本点を返す(数え役満は 8000)。本番の呼び出し元は `hora.ts` の比較用のみ |
| 役満の基本点 | `golden.test.ts` は `8000 * yakumanPoint`(複合・ダブル役満は point の合計)で基本点を作る。本設計でもこれに合わせ、役満の基本点は呼び出し側が渡す |
| `calculateTableBonus`(`bonus.ts`) | `{ ronFromDiscarder, tsumoFromEach, deposit }` を返す。本場数・供託本数が0以上の整数でない場合と、ツモ折半が100の倍数でない場合に例外を投げる。ロン経路(L33〜37)は `honbaPoint` を検証しない(§4.3 手順0で `payment.ts` 側が検証する)。L42 のコメントは「【未確定】端数処理は Epic B で確定」のままで、§3.2 の確定と食い違う(§4.4) |
| `isDealer`(`table.ts`) | `table.seat === 'east'` |
| `Rule`(`rule.ts`) | 所定値は `DEFAULT_HONBA_POINT`・`DEFAULT_NORTH` のように定数で置く慣行。アプリ側の既定 `Rule` オブジェクトは未実装で、`Rule` 型の値はテスト3ファイルの固定条件にしかない |
| `ceil100`(`score.ts`) | export 済み。端数処理に使う |

## 3. 支払い式

P = 基本点(呼び出し側が渡す。役満は 8000×役満数、数え役満は 8000)。

| 和了者 | 方式 | ロン(放銃者) | ツモ(子の支払額・親の支払額／オール) |
| --- | --- | --- | --- |
| 子 | 3方式共通 | ceil100(4P) | — |
| 子 | ツモ損あり | — | ceil100(P)・ceil100(2P) |
| 子 | 北家分折半 | — | ceil100(ceil100(P) + ceil100(P)/2)・ceil100(ceil100(2P) + ceil100(P)/2) |
| 子 | ロン打点折半 | — | ceil100(2P)オール |
| 親 | 3方式共通 | ceil100(6P) | — |
| 親 | ツモ損あり | — | ceil100(2P)オール |
| 親 | 北家分折半 | — | ceil100(ceil100(2P) + ceil100(2P)/2)オール |
| 親 | ロン打点折半 | — | ceil100(3P)オール |

- 北家の支払額は、和了者が子なら四麻の子の負担 ceil100(P)、親なら ceil100(2P)
- 本場込みは、ツモなら各支払額に `tsumoFromEach` を、ロンなら放銃者の支払額に `ronFromDiscarder` を足す

## 4. 設計

### 4.1 `rule.ts`

```ts
/** ツモ損の所定値(mahjong-rules.md §3.1) */
export const DEFAULT_TSUMO_LOSS: Rule['tsumoLoss'] = 'loss';

export interface Rule {
  // …既存…
  /** ツモ損: loss=ツモ損あり / north-split=北家分折半 / ron-split=ロン打点折半 */
  tsumoLoss: 'loss' | 'north-split' | 'ron-split';
}
```

- `compareRules` の末尾に `a.tsumoLoss === b.tsumoLoss` を加える
- テスト3ファイルの固定条件の `Rule` に `tsumoLoss: 'loss'` を加える(期待値は変えない)

### 4.2 `payment.ts` の型

```ts
/** 1人の支払者の負担額 */
export interface PaymentShare {
  /** 本場抜き */
  base: number;
  /** 本場込み(本場が0なら base と同じ) */
  withHonba: number;
}

export type PaymentDetail =
  | { by: 'ron'; discarder: PaymentShare }
  | { by: 'tsumo'; winner: 'dealer'; eachNonDealer: PaymentShare }
  | { by: 'tsumo'; winner: 'nonDealer'; dealer: PaymentShare; nonDealer: PaymentShare };

export interface Payment {
  detail: PaymentDetail;
  /**
   * 和了者の受け取りのうち打点分(本場・供託を含まない)。
   * ロン: discarder.base
   * ツモ・和了者が子: dealer.base + nonDealer.base
   * ツモ・和了者が親: eachNonDealer.base × 2
   */
  total: number;
  /** 本場による加算額。ロン: ronFromDiscarder、ツモ: tsumoFromEach × 2 */
  honba: number;
  /** 供託による加算額(calculateTableBonus の deposit) */
  deposit: number;
  /** 加算額の合計 = honba + deposit(表示「合計 total(+bonus)点」の括弧内) */
  bonus: number;
}

export const calculatePayment = (
  basePoint: number,
  table: Table,
  by: 'ron' | 'tsumo',
  rule: Pick<Rule, 'tsumoLoss' | 'honbaPoint'>
): Payment;
```

- 支払者は親/子で表す(確定事項5)。ロンの放銃者は親でも子でも額が同じなので、親子を区別せず `discarder` とする(些末な表現なので設計で決めた)
- 和了者が親のツモは子2人が同額なので、`eachNonDealer` の1つで表す
- 「本場込みを表示するか」「オールと書くか」(子ツモ・ロン打点折半で `dealer` と `nonDealer` が同額になる)は、UI が `table.continue` と額から判断する。コアは表示用の文字列を作らない

### 4.3 `calculatePayment` の処理(この順で行う)

0. **入口の検証**(確定事項9・11)。次の順に検証し、最初に該当したものの例外を投げる。どれも手順1より前に行うので、卓情報(本場数・供託本数)の例外より先に出る
   - 0-a. 基本点: `Number.isInteger(basePoint) && basePoint > 0` でなければ `Error('基本点は正の整数である必要があります')`(NaN・Infinity・小数・0・負数を弾く)
   - 0-b. ツモ損: `rule.tsumoLoss` が `'loss'`・`'north-split'`・`'ron-split'` のいずれでもなければ `Error('ツモ損の設定が不正です')`(ロンでも検証する)
   - 0-c. 本場の点数: `Number.isInteger(rule.honbaPoint) && rule.honbaPoint >= 0` でなければ `Error('1本場あたりの点数は0以上の整数である必要があります')`(ロンでも検証する)
   - 順序の理由: 和了ごとの値(基本点)を先に、ルール設定を後にする。ルール設定の中では、方式の分岐に使う `tsumoLoss` を先にする
   - 検証は `bonus.ts` ではなく `payment.ts` に置く。理由: `calculateTableBonus` の挙動と A3 のテスト(A3-TB1〜TB15)を変えずに済み、影響が A5 の新規ファイルに閉じる。`payment.ts` が支払い計算の唯一の入口になる前提である(§7)
1. `calculateTableBonus(table, by, rule.honbaPoint)` を呼ぶ。例外は捕まえずにそのまま投げる(確定事項6)
2. `isDealer(table)` で和了者の親子を決め、§3 の式で本場抜きの負担額を求める(ロンでは方式を見ない)
3. 本場込みの額を加え、`total`・`honba`・`deposit`・`bonus` を組み立てる

### 4.4 `bonus.ts` のコメント修正(製造で行う)

- L42 の `// 【未確定】端数処理は Epic B で確定する。それまでは例外を投げる` を、`// mahjong-rules.md §3.2【確定】: 折半が100点単位にならない本場設定は認めず、例外を投げる` に置き換える
- 変えるのはコメント1行だけ。ロジックは変えない(§3.2 が確定し、コメントが仕様と食い違うため)

## 5. テスト(`src/core/payment.test.ts`)

- テスト名は業務標準05の `A5-P01: …` 形式とする。`test.each` を使う場合もタイトルの書式文字列を `A5-Pxx: … ` で始める(例 `'A5-P23: 子30符2飜ロン %s'`)。展開後のどのタイトルも `A5-Pxx:` で始まるようにする
- 期待値は数値リテラルで書き、式からコピーしない。各テストの直前に出典コメントを置く
- 期待値は `toEqual` で `Payment` 全体と完全一致させる。部分一致を使う場合は、直前に理由を日本語コメントで書く
- 表の「卓」は和了者の自風(東=親、南=子)・本場数・供託本数。`honbaPoint` は特記がなければ 200

### 5.1 実機画面の実例(出典: 雀魂・一番街の実機画面(ユーザー採取、2026-10-30))

| ID | 方式 | 和了 | 基本点 | 卓 | 期待 |
| --- | --- | --- | --- | --- | --- |
| A5-P01 | ロン打点折半 | 子 20符2飜 ツモ | 320 | 南・3本場 | 700オール → 1000オール。total 1400、honba 600、bonus 600 |
| A5-P02 | ロン打点折半 | 子 20符4飜 ツモ | 1280 | 南・0 | 2600オール。total 5200 |
| A5-P03 | ロン打点折半 | 子 30符3飜 ツモ | 960 | 南・1本場 | 2000オール → 2100オール。total 4000、honba 200 |
| A5-P04 | ロン打点折半 | 子 30符4飜 ツモ | 1920 | 南・0 | 3900オール。total 7800 |
| A5-P05 | ロン打点折半 | 親 25符4飜 ツモ | 1600 | 東・0 | 4800オール。total 9600 |
| A5-P06 | 北家分折半 | 子 30符2飜 ツモ | 480 | 南・0 | 800・1300。total 2100 |
| A5-P07 | 北家分折半 | 親 40符2飜 ツモ | 640 | 東・1本場 | 2000オール → 2100オール。total 4000、honba 200 |

### 5.2 仕様の満貫ツモ例(出典: mahjong-rules.md §3.1 の表。基本点 2000、0本場)

| ID | 方式 | 和了 | 期待 |
| --- | --- | --- | --- |
| A5-P11 | ツモ損あり | 親 | 4000オール。total 8000 |
| A5-P12 | ツモ損あり | 子 | 2000・4000。total 6000 |
| A5-P13 | 北家分折半 | 親 | 6000オール。total 12000 |
| A5-P14 | 北家分折半 | 子 | 3000・5000。total 8000 |
| A5-P15 | ロン打点折半 | 親 | 6000オール。total 12000 |
| A5-P16 | ロン打点折半 | 子 | 4000オール。total 8000 |

### 5.3 §3 の式からの導出(出典: mahjong-rules.md §3.1・§3.2【確定】から手計算)

| ID | 方式 | 和了 | 基本点 | 卓 | 期待 |
| --- | --- | --- | --- | --- | --- |
| A5-P21 | ツモ損あり | 子 30符2飜 ツモ | 480 | 南・0 | 500・1000。total 1500 |
| A5-P22 | ツモ損あり | 親 40符2飜 ツモ | 640 | 東・0 | 1300オール。total 2600 |
| A5-P23 | 3方式(`test.each`) | 子 30符2飜 ロン | 480 | 南・0 | 3方式とも 2000。total 2000 |
| A5-P24 | 3方式(`test.each`) | 親 30符2飜 ロン | 480 | 東・0 | 3方式とも 2900。total 2900 |
| A5-P25 | ロン打点折半 | 子 30符2飜 ロン | 480 | 南・2本場・供託1本 | 2000 → 2400。total 2000、honba 400、deposit 1000、bonus 1400 |
| A5-P26 | ツモ損あり | 子 満貫 ツモ | 2000 | 南・1本場・供託2本 | 2000・4000 → 2100・4100。total 6000、honba 200、deposit 2000、bonus 2200 |
| A5-P27 | 3方式(`test.each`) | 子 役満 ツモ | 8000 | 南・0 | 損: 8000・16000(total 24000)／北: 12000・20000(32000)／ロン: 16000オール(32000) |
| A5-P28 | 3方式(`test.each`) | 親 役満 ツモ | 8000 | 東・0 | 損: 16000オール(32000)／北: 24000オール(48000)／ロン: 24000オール(48000) |
| A5-P29 | 3方式(`test.each`) | 子 ダブル役満(複合) ツモ | 16000 | 南・0 | 損: 16000・32000(48000)／北: 24000・40000(64000)／ロン: 32000オール(64000) |
| A5-P30 | 3方式(`test.each`) | 子 役満 ロン | 8000 | 南・0 | 3方式とも 32000 |
| A5-P31 | 3方式(`test.each`) | 親 数え役満 ロン | 8000 | 東・0 | 3方式とも 48000 |
| A5-P32 | ツモ損あり | 子 30符2飜 ツモ(供託のみ) | 480 | 南・0本場・供託1本 | 500・1000(本場込みも同額)。total 1500、honba 0、deposit 1000、bonus 1000 |
| A5-P33 | ツモ損あり | 親 40符2飜 ツモ | 640 | 東・2本場 | 1300オール → 1500オール。total 2600、honba 400、bonus 400 |
| A5-P34 | 北家分折半 | 子 30符2飜 ツモ | 480 | 南・1本場・供託1本 | 800・1300 → 900・1400。total 2100、honba 200、deposit 1000、bonus 1200 |
| A5-P35 | 北家分折半 | 親 30符2飜 ロン | 480 | 東・2本場・供託1本 | 2900 → 3300。total 2900、honba 400、deposit 1000、bonus 1400 |
| A5-P36 | ロン打点折半 | 子 役満 ツモ | 8000 | 南・1本場 | 16000オール → 16100オール。total 32000、honba 200、bonus 200 |
| A5-P37 | ツモ損あり、`honbaPoint: 300` | 子 30符2飜 ツモ | 480 | 南・0本場 | 例外を投げず 500・1000(本場込みも同額)。total 1500、honba 0 |
| A5-P39 | 北家分折半 | 親 30符2飜 ツモ | 480 | 東・0 | 1500オール。total 3000 |

- 役満の基本点(8000×役満数、数え役満は 8000)は呼び出し側の責務。A5-P29 は `calculatePayment(16000, …)` を、A5-P31 は `calculateBasePoint(30, 13, false, true)`(=8000)の結果を渡す

### 5.4 例外・ルール

| ID | 内容 | 期待 |
| --- | --- | --- |
| A5-P38 | `test.each` 3件: 供託 -1、供託 1.5、本場 1.5(基本点 480・ツモ) | `toThrow('本場数および供託本数は0以上の整数である必要があります')` |
| A5-P40 | `test.each` 3件(検証順序): (1) 基本点 0 + `tsumoLoss` 不正 (2) `tsumoLoss` 不正 + `honbaPoint` -100 (3) `honbaPoint` -100 + 本場 -1。いずれもツモ、他は正常値 | (1) `toThrow('基本点は正の整数である必要があります')` (2) `toThrow('ツモ損の設定が不正です')` (3) `toThrow('1本場あたりの点数は0以上の整数である必要があります')` |
| A5-P41 | 本場 -1 で `calculatePayment` | `toThrow('本場数および供託本数は0以上の整数である必要があります')` |
| A5-P42 | `honbaPoint: 300`・1本場・ツモ | `toThrow('ツモ折半の額が100の倍数ではありません')` |
| A5-P43 | 同設定でロン(子30符2飜、基本点 480) | 例外を投げず 2000 → 2300 |
| A5-P44 | `test.each` 10件: 基本点 0・-100・480.5・NaN・Infinity × ron・tsumo(卓は南・0) | `toThrow('基本点は正の整数である必要があります')` |
| A5-P45 | `test.each` 6件: `honbaPoint` が -100・NaN・150.5 × ron・tsumo(基本点 480、卓は南・1本場) | `toThrow('1本場あたりの点数は0以上の整数である必要があります')` |
| A5-P46 | `test.each` 2件: `tsumoLoss` が `'none' as Rule['tsumoLoss']` × ron・tsumo(基本点 480、卓は南・0) | `toThrow('ツモ損の設定が不正です')` |
| A5-P47 | `honbaPoint: 0`・子30符2飜 ツモ損あり ツモ(基本点 480、卓は南・1本場・供託0)。境界値0は有効(PR #23 の検収で追加) | 例外を投げず `toEqual` で全体一致: 親 1000・子 500(withHonba も同額)、total 1500、honba 0、deposit 0、bonus 0 |
| A5-R01 | `compareRules` が、`tsumoLoss` だけ異なる2つの `Rule` を false、同一の `Rule` を true とする | 1テスト内で両方を `toBe` |
| A5-R02 | `DEFAULT_TSUMO_LOSS` が `'loss'` | `toBe('loss')` |

## 6. 受け入れ条件

- [ ] `npx vitest run src/core/payment.test.ts` が成功し、実行件数が **75件**(`test.each` 展開後)である。内訳は次のとおり:

  | ID | 件数 |
  | --- | --- |
  | A5-P01〜P07 | 7 |
  | A5-P11〜P16 | 6 |
  | A5-P21・P22 | 2 |
  | A5-P23・P24(各3) | 6 |
  | A5-P25・P26 | 2 |
  | A5-P27〜P31(各3) | 15 |
  | A5-P32〜P37 | 6 |
  | A5-P38(3) | 3 |
  | A5-P39 | 1 |
  | A5-P40(3) | 3 |
  | A5-P41〜P43 | 3 |
  | A5-P44(10) | 10 |
  | A5-P45(6) | 6 |
  | A5-P46(2) | 2 |
  | A5-P47 | 1 |
  | A5-R01・R02 | 2 |
  | 合計 | 75 |

- [ ] 実在するテストIDが A5-P01〜P07、P11〜P16、P21〜P47、A5-R01・R02 であり、A5-P08〜P10・P17〜P20 は存在しない(`grep -o "A5-[PR][0-9]*:" src/core/payment.test.ts | sort -u` で確認)
- [ ] 1件だけ実行するときは `-t 'A5-P01:'` のように `:` まで含める。展開後のタイトルも含め、すべてのテストタイトルが `A5-Pxx:` または `A5-Rxx:` で始まる(`npx vitest run src/core/payment.test.ts --reporter=verbose` の出力で確認)
- [ ] §5.1 の7件と §5.2 の6件が表の数値と完全一致で書かれ、出典コメントがあることをテストのソースで確認する
- [ ] `git diff main -- src/core/golden-cases.ts src/core/score.ts src/core/result.ts src/core/hora.ts src/ui` が空
- [ ] `git diff main -- src/core/bonus.ts` が §4.4 のコメント1行の置き換えだけである
- [ ] `git diff main -- src/core/result.test.ts src/core/golden.test.ts src/core/north.test.ts` が `tsumoLoss: 'loss',` の追加行だけである
- [ ] `grep -n "tsumoLoss" src/core/rule.ts` で型・`DEFAULT_TSUMO_LOSS`・`compareRules` の3箇所が出る
- [ ] `grep -rn "calculatePayment" src --exclude=payment.ts --exclude=payment.test.ts` が空(`generateResult` に繋いでいない)
- [ ] `payment.ts` が §4.3 手順0の検証を行った後に `calculateTableBonus` を呼び、`try`/`catch` を含まない(`grep -n "catch" src/core/payment.ts` が空)
- [ ] `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて成功し、既存テスト(golden を含む)の件数と結果が変わらない
- [ ] `src/core/payment.ts`・`payment.test.ts` に絶対パス・ホームディレクトリ名がない

## 7. 後続Issueへの引き継ぎ

- **結果への接続(後続Issue)**: `generateResult` 側で基本点(役満は 8000×役満数、数え役満は 8000)を求め、`calculatePayment` を呼ぶ。例外の扱い(UI への表示等)は呼び出し側で決める(A3 §8 の申し送りを引き続き持ち越す)
- **UI**: §0 の表記に従う。本場込みは本場数が1以上のときだけ表示する(ロン・ツモとも)。合計欄は、ツモなら `bonus` が0より大きいとき「合計 total(+bonus)点」とし、ロンは加算額だけを括弧書きにする。子ツモで `dealer` と `nonDealer` が同額なら「オール」と書く
- **B1**: `tsumoLoss` の選択肢UI。`DEPOSIT_POINT` の設定化は従来どおり B1
- **B2**: 保存済みルールに `tsumoLoss` がなければ `DEFAULT_TSUMO_LOSS` で補う。**`calculatePayment` を `generateResult`・UI に接続する前に B2 を済ませること**(未補完のルールでは手順0-b で必ず例外になるため。PR #23 のレビューで追加)
- **B3**: プリセット「雀魂段位戦」は北家分折半、「一番街段位戦」はロン打点折半が候補(各公式ルールで要確認)

## 8. 要ヒアリング事項

- なし(旧Q1・Q2 は回答済みで、確定事項9・11として反映した)

## 9. 実挙動未確認

- §3 の式と実機の一致を確認したのは、§5.1 の7例と §5.2 の満貫例だけ。A5-P21・P22・P27〜P39 は仕様の式から導いたもので、実機画面とは照合していない(ユーザーが設計どおりで可と回答済み)
- セガMJ公式の2つのURLは統括担当から提示されたもので、本設計の作成時には内容を閲覧していない
- 本設計はコード読解に基づき、実装・実行による確認はしていない
- `by`・`table.seat` は型(`'ron' | 'tsumo'`・`Wind`)で保証する前提とし、実行時の検証はしない(`calculateTableBonus`・`isDealer` と同じ)。UI/接続の Issue で再検討する(PR #23 のレビューで追加)

## 10. 承認の記録

- 2026-10-30 オーナーが設計を承認した。製造方式は AGY スキル式とし、PR の作成と Codex レビューへの対応までを委任する
