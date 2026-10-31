# Issue #29 設計書: B1. ルール項目の拡張

- 対象Issue: #29(Epic B #3 の Sub-Issue)
- 製造ブランチ: `feature/issue-29-rule-items`(作成済み。ヒアリング結果の仕様反映コミット `cd11e66` を含む)
- 変更対象(全ファイル):
  - 変更: `src/core/rule.ts`・`src/core/bonus.ts`・`src/core/payment.ts`・`src/core/result.ts`(一発の正規化のみ。§4.5)・`src/core/hora.ts`・`src/core/input.ts`・`src/core/tile/index.ts`・`src/core/local-yaku.ts`(赤ドラの参照置換のみ)
  - 新規: `src/core/rule-items.ts`(項目・選択肢・所定値の定義)・`src/core/rule.test.ts`(B1-R)・`src/core/rule-effects.test.ts`(B1-Y・DR・K・D・B)
  - テスト変更(固定条件の `Rule` と呼び出し引数の機械的な追従のみ。期待値は変えない): `src/core/golden.test.ts`・`src/core/result.test.ts`・`src/core/north.test.ts`・`src/core/double-riichi-chankan.test.ts`・`src/core/payment.test.ts`・`src/core/local-yaku.test.ts`・`src/core/bonus.test.ts`・`src/core/tile/index.test.ts`(該当箇所がある場合)
  - 変更しない: `src/core/golden-cases.ts`・`src/core/score.ts`・`src/core/fu.ts`・`src/ui/**`・`wasm/**`・`docs/**`(本設計書を除く)

## 1. 目的

1. [麻雀ルール仕様](../mahjong-rules.md)の「変更可」の全項目を `Rule` で表現し、計算コアに反映する(新規: 一発・喰い断・供託1本の点数。改修: 赤ドラの表現と `red.m` の削除)
2. ルール検査の関数 `validateRule` を計算コアに置く(UI と B2 が呼ぶ)
3. UI が参照する「項目・選択肢・所定値の定義」を計算コアに置く(UI は作らない)
4. 所定値から既定ルール `DEFAULT_RULE` を組み立てる(B2・B3 が使う)

含まない: 保存・補完(B2)、プリセット定数と一致判定(B3)、`generateResult` と `calculatePayment` の接続(B4)、UI。

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項(統括担当経由・ヒアリング済み、2026-10-31)

出典: オーナーが雀魂・麻雀一番街の三麻の段位戦・大会戦・友人戦を調べた一覧表。仕様への反映は `cd11e66`(`git diff main -- docs/mahjong-rules.md`)。

| # | 確定事項 | 仕様の箇所 | 本書 |
| --- | --- | --- | --- |
| 1 | 立直供託: 所定1000点、0〜10000点の100点単位。`DEPOSIT_POINT` を Rule の設定値にする | §3.2 | §4.1・§4.4 |
| 2 | 本場: 所定200点、0〜10000点の200点単位 | §3.2 | §4.1・§4.3 |
| 3 | ツモ損: 3択維持、所定 loss | §3.1 | 変更なし |
| 4 | 一発: 新規、所定あり。なしのとき立直・オープン立直とも一発を役として数えない | §4.1 | §4.5 |
| 5 | 喰い断: 新規、所定あり。なしのとき副露した断么九を役として数えない | §4.1 | §4.5 |
| 6 | 赤ドラ: なし/2枚/4枚、所定2枚。`red.m` 削除。4枚は制限しない | §1 | §4.2 |
| 7〜9 | 切り上げ満貫(所定なし)・連風牌の雀頭(4符/2符、所定4符)・数え役満(所定あり) | §3.3・§4.1 | 既存項目のまま |
| 10 | 役満の複合・各ダブル役満4種は個別項目で維持、すべて変更可。ローカル役のダブル役満(純正緑一色・大七星)は挙動を変えない | §3.3 | §4.1 |
| 11〜13 | オープン立直(所定なし)・ローカル役(所定オフ)・北の扱い(所定抜きドラ) | §2・§4.2 | 既存項目のまま |
| 14 | ルール検査の関数を計算コアに置く。検査を通らない値の計算時の扱いを整理する | — | §4.3・§4.6 |
| 15 | 項目・選択肢・所定値の定義を計算コアに置く | — | §4.7 |
| 16 | 既定ルールを組み立てる関数・定数を用意してよい | — | §4.1 |
| Q1 | 一発なしで `handOptions.ippatsu: true` が渡されたら、入口で false に正規化する(実効値 = `rule.ippatsu && options.ippatsu`)。例外は投げない。正規化値をダブル立直系の槍槓・海底・河底の判定(`hora.ts` L615・L627・L1052、`local-yaku.ts` L129)にも使い、これらは複合する(2026-10-31 ユーザー回答) | — | §4.5・§5.2 |
| Q2 | 役なし和了形の扱いは B1 で変えない。B1-K02 は副露断么九に別の役も付く牌姿で、`tanyao` だけが消え hora が残ることを検証する(同上) | — | §5.2 |

### 2.2 既存コードの実物確認(2026-10-31)

- `Rule.red` は `{ m, p, s }` 各 `0〜4`。`red[...]` の参照箇所(main 時点の行番号): `input.ts` L32・L45(`instantiateMeld` のポン・カン)、`tile/index.ts` L133・L134(`isAvailableTiles`)・L146・L147(`tileAvailableCount`)、`hora.ts` L122(`generateHora` の和了牌展開)・L906(`generateChitoitsuHora` の和了牌展開)、`local-yaku.ts` L620(`horaTileVariants`)。`result.ts` は `rule.red` を上記へ渡すのみ
- 一発は `hora.ts` の `generateHora`(L478)と `generateChitoitsuHora`(L1019)で `options.ippatsu` のとき push。ダブル立直系の槍槓(L615)・海底(L627)・河底(L1052)と `local-yaku.ts` の石の上にも三年(L129)は `isDoubleRiichi ? !options.ippatsu : true` で一発と排他。国士(`generateKokushiHora`)には一発の push が無い(コードの読み。役満のため影響しない)
- 断么九は `generateHora`(L493 付近)で副露の有無を問わず push(現状は喰い断ありと同じ挙動)。`menzen` は同関数 L193 で定義済み。七対子の断么九は門前のみ
- `calculateTableBonus(table, by, honbaPoint)` が `DEPOSIT_POINT` を直接使う。`calculatePayment` は `Pick<Rule, 'tsumoLoss' | 'honbaPoint'>` を受け、`tsumoLoss` の列挙と `honbaPoint` の非負整数を検査して例外を投げる
- ローカル役のダブル役満は `local-yaku.ts` L343・L488 で `point: 2` 固定(Rule の項目に依存しない)。本Issueでは触らない
- テストの固定条件 `Rule` は6ファイルにあり、すべて `red: { m: 0, p: 1, s: 1 }`・`honbaPoint: 200`(所定値)。ほかに `tile/index.test.ts` L162 `const red: Rule['red'] = { m: 0, p: 1, s: 1 };`、`payment.test.ts` L18-21 の `defaultRule`(`tsumoLoss`・`honbaPoint` の2項目)、`bonus.test.ts` L193 `expect(DEPOSIT_POINT).toBe(1000)` がある
- 実測(2026-10-31。現行コードに一時テストを置いて `generateResult` を呼び、実行後に削除): 副露ありで役が1つも無い和了形(手牌 `234p2234s5s` + ポン 4z + 明槓 1m、ロン)は、`info.type === 'hora'` のまま役が空配列の hora を1件返す。§5.2 の各ケースも同じ方法で実測し、表の期待値と一致した(ルールなし側は `ippatsu: false` 入力や `tanyao` の除外で同じ状態を作って確認)

### 2.3 既存設計書の B1 申し送りの回収

| 申し送り元 | 内容 | 本書での扱い |
| --- | --- | --- |
| issue-10 §3 #5・§含まない | `Rule.red.m` を B1 で削除 | §4.2 で削除 |
| issue-11 #2 | `honbaPoint` の選択肢は B1 で決める | §4.3(0〜10000、200単位)・§4.7 |
| issue-11 #5・L96・L264 | `DEPOSIT_POINT` の設定化(Rule へ移す) | §4.1 `depositPoint`・§4.4 |
| issue-11 L122 | `honbaPoint` 自体の検証はしない(B1 の選択肢で保証) | §4.3 `validateRule` が保証。`calculateTableBonus` は従来どおり検証しない |
| issue-11 L251 | ツモ折半の端数処理の確定後に TB9 の例外を置き換える | 200点単位の制約で、検査を通るルールでは折半が常に100の倍数になる。例外は検査を通らない値への防御として残す(§4.6)。TB9 の期待値は変えない |
| issue-12 L100・L276 | `Rule.north` の選択肢を設定画面に出す | §4.7 の定義に含める(画面は後続 Epic) |
| issue-13 L265 | `tsumoLoss` の選択肢 UI、`DEPOSIT_POINT` の設定化 | 選択肢は §4.7、設定化は §4.4 |
| issue-14 L270 | `localYaku`・`openRiichi` の切り替え UI | §4.7 の定義に含める(画面は後続 Epic) |
| issues-draft B1 | 「本場・供託は所定の範囲内かつ200の非負の整数倍」 | 確定事項#1 により供託は100点単位とする(本場は200点単位) |

## 3. 方針

- 所定値は仕様の太字のまま変えない(業務標準07)。所定値の `Rule` では既存テストの期待値がすべて変わらないこと
- 型で表せる不正状態は型で潰す(赤ドラを1値にする)。型で潰せない数値の範囲・単位は `validateRule` で検査する
- 計算関数(`generateResult` 等)は `validateRule` を呼ばない。既存の防御的な例外はそのまま残す(§4.6)

## 4. 詳細設計

### 4.1 `src/core/rule.ts`

```ts
/** 赤5の枚数(5p・5s それぞれ)。0=赤なし / 1=2枚 / 2=4枚 */
export type RedDora = 0 | 1 | 2;

export interface Rule {
  red: RedDora;             // 変更: { m, p, s } から置き換え
  honbaPoint: number;
  depositPoint: number;     // 新規: 供託1本あたりの点数
  ippatsu: boolean;         // 新規: 一発を採用する
  kuitan: boolean;          // 新規: 喰い断を採用する
  roundedMangan: boolean;
  doubleWindFu: 2 | 4;
  accumlatedYakuman: boolean;
  multipleYakuman: boolean;
  kokushi13DoubleYakuman: boolean;
  suankoTankiDoubleYakuman: boolean;
  daisushiDoubleYakuman: boolean;
  pureChurenDoubleYakuman: boolean;
  north: 'nukidora' | 'yakuhai';
  tsumoLoss: 'loss' | 'north-split' | 'ron-split';
  localYaku: boolean;
  openRiichi: boolean;
}

/** 牌の種類ごとの赤5の枚数。萬子・字牌は常に 0(5m は三麻に存在しない) */
export const redCountOf = (red: RedDora, type: 'm' | 'p' | 's' | 'z'): number;
```

- 所定値定数: 既存の `DEFAULT_HONBA_POINT`・`DEFAULT_NORTH`・`DEFAULT_TSUMO_LOSS`・`DEFAULT_LOCAL_YAKU`・`DEFAULT_OPEN_RIICHI` は維持。追加: `DEFAULT_RED = 1`、`DEFAULT_DEPOSIT_POINT = 1000`、`DEFAULT_IPPATSU = true`、`DEFAULT_KUITAN = true`、`DEFAULT_ROUNDED_MANGAN = false`、`DEFAULT_DOUBLE_WIND_FU = 4`、`DEFAULT_ACCUMLATED_YAKUMAN = true`、`DEFAULT_MULTIPLE_YAKUMAN = true`、`DEFAULT_KOKUSHI13_DOUBLE_YAKUMAN`・`DEFAULT_SUANKO_TANKI_DOUBLE_YAKUMAN`・`DEFAULT_DAISUSHI_DOUBLE_YAKUMAN`・`DEFAULT_PURE_CHUREN_DOUBLE_YAKUMAN` すべて `true`。各定数に仕様の節をコメントで書く
- 範囲定数: `HONBA_POINT_MIN = 0`・`HONBA_POINT_MAX = 10000`・`HONBA_POINT_STEP = 200`、`DEPOSIT_POINT_MIN = 0`・`DEPOSIT_POINT_MAX = 10000`・`DEPOSIT_POINT_STEP = 100`
- `export const DEFAULT_RULE: Readonly<Rule>` を上記定数だけで組み立てる(`Object.freeze`)。`export const createDefaultRule = (): Rule => ({ ...DEFAULT_RULE })` も置く(B2 が補完のたびに新しい値を得るため)
- `compareRules`: `red` は1回の比較に変え、`depositPoint`・`ippatsu`・`kuitan` を加える。全17項目を比較する(漏れの検知は受け入れ条件 R03)

### 4.2 赤ドラ(`red`)の反映

- `Rule['red']` を引数に取る関数(`instantiateMeld`・`isAvailableTiles`・`tileAvailableCount`)の型はそのまま `Rule['red']`(= `RedDora`)
- §2.2 に列挙した `red[...]`・`rule.red[...]` の全9箇所を `redCountOf(red, tile.type)` に置き換える。`isAvailableTiles` の `(['m','p','s'] as const).every(...)` も `redCountOf` で評価する(萬子は 0 となり、5m は `isSanmaTile` で先に弾かれる)
- `tileAvailableCount` の `r === 4` の条件は、`RedDora` の最大が2のため型上到達しなくなる。削除してよい(`r === 0` は残す)
- 所定値 `1` は旧 `{ m: 0, p: 1, s: 1 }` と同じ挙動になる(既存テストの期待値不変の根拠)

### 4.3 `validateRule`(`src/core/rule.ts`)

```ts
export type RuleIssueKey = keyof Rule;
export interface RuleIssue { key: RuleIssueKey; message: string }
/** 検査を通れば空配列。値を書き換えない */
export const validateRule = (rule: unknown): RuleIssue[];
export const isValidRule = (rule: unknown): rule is Rule; // validateRule(rule).length === 0
```

- 引数は `unknown`(B2 が localStorage から読んだ値をそのまま渡すため)。`null`・配列・オブジェクト以外(数値・文字列等)が渡されたときは、`Rule` の全17キーについて「欠落」の issue を1件ずつ返す(計17件。B1-R07 で検証)。`message` の文面は製造で決めてよい
- 検査内容:
  - `honbaPoint`: 整数、`0 ≤ x ≤ 10000`、`x % 200 === 0`
  - `depositPoint`: 整数、`0 ≤ x ≤ 10000`、`x % 100 === 0`
  - `red`: `0 | 1 | 2` のいずれか
  - `doubleWindFu`: `2 | 4`、`north`: 2値、`tsumoLoss`: 3値
  - 真偽値の項目(`ippatsu`・`kuitan`・`roundedMangan`・`accumlatedYakuman`・`multipleYakuman`・ダブル役満4種・`localYaku`・`openRiichi`): `typeof === 'boolean'`
  - 欠けた項目は issue とする。余分な項目(旧形式の `red.m` を含むオブジェクト等)は無視せず `red` の型不一致として issue になる
- 1項目につき issue は高々1件。`message` は日本語(UI にそのまま出せる文)

### 4.4 供託(`depositPoint`)の反映

- `bonus.ts`: `DEPOSIT_POINT` を削除し、`calculateTableBonus(table, by, honbaPoint, depositPoint)` とする(第4引数は必須)。`deposit = depositPoint * table.deposit`。`depositPoint` 自体の検証はしない(`honbaPoint` と同じ扱い)
- `payment.ts`: 引数の型を `Pick<Rule, 'tsumoLoss' | 'honbaPoint' | 'depositPoint'>` にし、入口の検査に「0-d. 供託1本あたりの点数: 0以上の整数」を `honbaPoint` と同じ形で加え、`calculateTableBonus` に渡す
- `bonus.test.ts`: 各呼び出しに第4引数 `1000` を加え、`DEPOSIT_POINT` の import を `rule.ts` の `DEFAULT_DEPOSIT_POINT` に置き換える(A3-TB14 の期待値 `1000` は不変)。`payment.test.ts`: 各 rule 引数に `depositPoint: 1000` を加える。期待値は変えない

### 4.5 一発・喰い断の反映

- 一発(Q1 確定): `generateResult`(`result.ts`)の入口、オープン立直の検査の直後で `handOptions` を正規化する。

  ```ts
  const options: HandOptions = { ...handOptions, ippatsu: rule.ippatsu && handOptions.ippatsu };
  ```

  以降の処理(`generateHora`・`generateChitoitsuHora`・`generateKokushiHora`・`generateShisanputaHora`・ローカル役判定、L318 の再帰呼び出しを含む)には正規化後の `options` だけを渡す。これで `hora.ts` L478・L1019 の一発の push、L615(槍槓)・L627(海底)・L1052(河底)、`local-yaku.ts` L129(石の上にも三年)がすべて正規化値で判定される。`hora.ts`・`local-yaku.ts` の一発関連の行は変更しない(Q1 で許可された local-yaku.ts の変更は不要)
- 結果として、一発なしのルールでダブル立直系に一発が入力されても、槍槓・海底・河底(ローカル役ありなら石の上にも三年)が成立する
- 例外は投げない(オープン立直の例外とは扱いが異なる)
- 喰い断: `generateHora` の断么九の条件(L493)に `(menzen || rule.kuitan)` を加える。`menzen` は L193 の既存の定義(暗槓のみ門前扱い)をそのまま使う。七対子・国士は変更なし

### 4.6 検査を通らない値と計算時の例外の関係

| 関数 | 検査を通らない値への扱い | B1 での変更 |
| --- | --- | --- |
| `validateRule` | issue を返す。例外を投げない | 新規 |
| `generateResult` | ルール値の範囲は検査しない(`openRiichi` の例外は従来どおり)。一発は例外にせず正規化する(Q1) | 一発の正規化 |
| `calculateTableBonus` | 本場数・供託本数の検査と、ツモ折半が100の倍数でないときの例外(A3-TB9)を維持 | 第4引数の追加のみ |
| `calculatePayment` | `tsumoLoss`・`honbaPoint`・`depositPoint`(非負整数)の検査で例外 | `depositPoint` の検査を追加 |

- 呼び出し側(UI・B2)は計算前に `validateRule` を通す前提とする。検査を通るルールでは `honbaPoint` が200の倍数なので、ツモ折半の例外は発生しない
- 計算関数の中で `validateRule` を呼んで例外を投げるかどうかは B4(例外の返し方)で決める

### 4.7 項目・選択肢・所定値の定義(`src/core/rule-items.ts`)

```ts
export type SelectRuleKey = 'red' | 'doubleWindFu' | 'north' | 'tsumoLoss';
export type NumberRuleKey = 'honbaPoint' | 'depositPoint';
/** 残り11項目(すべて boolean) */
export type SwitchRuleKey = Exclude<keyof Rule, SelectRuleKey | NumberRuleKey>;

/** K ごとに options[].value と defaultValue を Rule[K] に結びつける写像型 */
export type SelectRuleItem = {
  [K in SelectRuleKey]: {
    key: K; kind: 'select'; label: string;
    options: readonly { value: Rule[K]; label: string }[];
    defaultValue: Rule[K];
  };
}[SelectRuleKey];
export interface SwitchRuleItem { key: SwitchRuleKey; kind: 'switch'; label: string; defaultValue: boolean }
export interface NumberRuleItem { key: NumberRuleKey; kind: 'number'; label: string; min: number; max: number; step: number; unit: '点'; defaultValue: number }
export type RuleItem = SelectRuleItem | SwitchRuleItem | NumberRuleItem;
export const RULE_ITEMS: readonly RuleItem[];
```

- `Rule` の全17キーを、重複なく1回ずつ含む(B1-R08)。`defaultValue` は `DEFAULT_RULE` の値、`min/max/step` は §4.1 の範囲定数を参照する(値を二重に書かない)
- 選択肢: `red` = 赤なし(0)/2枚(1)/4枚(2)、`doubleWindFu` = 4符/2符、`north` = 抜きドラ/共通役牌、`tsumoLoss` = ツモ損あり/北家分折半/ロン打点折半。その他は switch
- `label` は仕様の項目名(例「赤ドラ」「一発」「喰い断」「本場」「供託」「連風牌の雀頭」)
- 並び順は順不同(UI の Epic で決める)。B1-R08 は順序を検査しない
- `options[].value` と `Rule[K]` の型一致は上記の写像型で保証する。受け入れ条件 §6-8 で、不正な値を書くと `npm run typecheck` が失敗することを確かめる

## 5. テスト(`src/core/rule.test.ts` ほか)

テスト名は `B1-<記号><番号>: <説明>`(業務標準05・issue-20 の命名規約)。

### 5.1 ルール定義(出典: mahjong-rules.md の太字・範囲。仕様が直接裏づけ)

| 記号 | 内容 |
| --- | --- |
| B1-R01 | `DEFAULT_RULE` の全17項目が仕様の所定値(本書§4.1の値)と一致する(項目ごとに `expect`) |
| B1-R02 | `createDefaultRule()` が `DEFAULT_RULE` と `compareRules` で true、かつ別オブジェクト |
| B1-R03 | `compareRules`: `DEFAULT_RULE` から1項目だけ変えた17通りがすべて false、同値なら true |
| B1-R04 | `validateRule(DEFAULT_RULE)` が空 |
| B1-R05 | 本場: 0・200・10000 は通過、-200・100・10200・200.5・'200' は `honbaPoint` の issue |
| B1-R06 | 供託: 0・100・10000 は通過、-100・50・10100・100.5 は `depositPoint` の issue |
| B1-R07 | `red` に 3・`{ m:0,p:1,s:1 }`、`tsumoLoss` に 'x'、`doubleWindFu` に 3、`north` に 'x'、真偽値項目に 1、項目欠落 → それぞれ該当 key の issue が1件。`null`・`[]`・`42`・`"x"` → それぞれ issue 17件で key 集合が Rule の全キー |
| B1-R08 | `RULE_ITEMS` の key 集合が `Rule` の全17キーと一致し重複なし。各 `defaultValue` が `DEFAULT_RULE[key]` と一致。number 項目の min/max/step が §4.1 の範囲定数と一致 |
| B1-R09 | `redCountOf`: (0,'p')=0、(1,'p')=1、(2,'s')=2、(2,'m')=0、(2,'z')=0 |

### 5.2 計算への反映(`src/core/rule-effects.test.ts`。各選択肢で結果が変わる代表牌姿。業務標準07)

共通条件: 補助関数(`parseTiles`・`parseSingleTile`)は既存テストから複製する。ルールは `createDefaultRule()` を基に「ルール」列の項目だけ変える。卓は `round: 'east'`・`seat: 'south'`・`continue: 0`・`deposit: 0`、`dora: []`、`nuki: 0`。`handOptions` は全項目 false/`'none'` を基に「入力」列だけ変える。`generateResult` の `info.hora` から `by` が一致する1件を取り、「役名:飜(役満は倍数)」の組を集合として比較する。牌姿は表記を `golden-cases.ts` に揃え、和了牌は末尾。

期待値の出典区分(業務標準07):
- 所定値側: 既存 golden の期待役(出典は `golden-cases.ts` の同じ id のケース)に、入力した1飜役(立直・一発・ダブル立直・海底等。mahjong-rules.md §4.1・§4.1.1【確定】)を足したもの
- ルールなし側: 仕様から導出。一発なし = §4.1 と Q1、喰い断なし = §4.1 と Q2、赤ドラ = §1 の枚数
- 供託: §3.2 の式(1本の点数×本数)から導出
- 現行コードでの実測(§2.2)と一致することを設計時に確認済み(B1-D01 を除く。§9)

| 記号 | 牌姿・副露 | 和了 | ルール | 入力 | 期待する役(役名:飜) |
| --- | --- | --- | --- | --- | --- |
| B1-Y01 | G05 `123067p34567s22z2s` | ron | 所定 | riichi・ippatsu | riichi:1, ippatsu:1, red-dora:1 |
| B1-Y02 | 同上 | ron | `ippatsu: false` | 同上 | riichi:1, red-dora:1 |
| B1-Y03 | G03 `225577p2244668s8s`(七対子) | ron | 所定 / `ippatsu: false` | riichi・ippatsu | 所定: riichi:1, ippatsu:1, tanyao:1, chitoitsu:2。なし: riichi:1, tanyao:1, chitoitsu:2 |
| B1-Y04 | G05 | ron | `openRiichi: true` / `openRiichi: true`・`ippatsu: false` | open-riichi・ippatsu | 前者: open-riichi:2, ippatsu:1, red-dora:1。後者: open-riichi:2, red-dora:1 |
| B1-DR01 | G01 `12367p234067s33z8p` | tsumo | 所定 | double-riichi・ippatsu・haitei | double-riichi:2, ippatsu:1, tsumo:1, pinfu:1, red-dora:1(haitei なし) |
| B1-DR02 | 同上 | tsumo | `ippatsu: false` | 同上 | double-riichi:2, tsumo:1, pinfu:1, haitei:1, red-dora:1 |
| B1-DR03 | 同上(G02 と同じ牌姿) | ron | 所定 / `ippatsu: false` | double-riichi・ippatsu・haitei | 所定: double-riichi:2, ippatsu:1, pinfu:1, red-dora:1。なし: double-riichi:2, pinfu:1, hotei:1, red-dora:1 |
| B1-DR04 | 同上 | ron | 所定 / `ippatsu: false` | double-riichi・ippatsu・chankan | 所定: double-riichi:2, ippatsu:1, pinfu:1, red-dora:1。なし: double-riichi:2, pinfu:1, chankan:1, red-dora:1 |
| B1-DR05 | G01 | tsumo | `localYaku: true` / `localYaku: true`・`ippatsu: false` | double-riichi・ippatsu・haitei | 前者: double-riichi:2, ippatsu:1, tsumo:1, pinfu:1, red-dora:1。後者: ishino-ue(役満1倍)のみ |
| B1-K01 | 手牌 `444p777s8p8p` + ポン 2p・ポン 6s | ron | 所定 | — | tanyao:1, toitoi:2 |
| B1-K02 | 同上 | ron | `kuitan: false` | — | toitoi:2(hora が1件残る) |
| B1-K03 | G12 `23467p22234s8p` + 暗槓 0p | ron | `kuitan: false` | — | tanyao:1, red-dora:1(G12 の期待と同じ。暗槓のみは門前) |
| B1-D01 | G13 `234678p2234s5s` + ポン 0p | ron | 所定 / `red: 2` | — | 所定: tanyao:1, red-dora:1(G13 の期待)。`red: 2`: tanyao:1, red-dora:2 |
| B1-D02 | `isAvailableTiles(red, [], [0p, 0p])` | — | `red` = 1 / 2 | — | 1 で false、2 で true |
| B1-D03 | `tileAvailableCount(red, [], t)` | — | `red` = 0 / 1 / 2 | — | t=0p: null / 1 / 2。t=5p: 4 / 3 / 2 |
| B1-B01 | `calculateTableBonus` ron・供託2本・honbaPoint 200・depositPoint 300 | — | — | — | `deposit: 600` |
| B1-B02 | `calculatePayment` の rule に `depositPoint: -100`、`1.5` | — | — | — | それぞれ例外 |
| B1-B03 | `calculatePayment` ron・供託1本・`depositPoint: 0` | — | — | — | 供託の加算 0 |

- B1-K01・K02 は本書で新たに置く牌姿(面子 444p・777s・ポン2p・ポン6s、雀頭 8p の単騎)。対々和・断么九の定義の出典は golden と同じ手計算の出典(Wikipedia「麻雀の役一覧」)
- 赤ドラの役名は `red-dora` とする(golden の表記に合わせる)
- 「A / B」と書いた行は、1つのテストの中で両方を検証する

## 6. 受け入れ条件(検収担当が1項目ずつ実行)

1. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラー0・失敗0
2. `npx vitest run src/core/rule.test.ts --reporter=verbose` の一覧に `B1-R01:`〜`B1-R09:` の9件の名前が1回ずつあり、すべて合格。1件だけ確かめるときは `npx vitest run -t 'B1-R01:'` のように `:` まで含める(業務標準05)
3. `npx vitest run src/core/rule-effects.test.ts --reporter=verbose` の一覧に §5.2 の18件(`B1-Y01:`〜`B1-Y04:`・`B1-DR01:`〜`B1-DR05:`・`B1-K01:`〜`B1-K03:`・`B1-D01:`〜`B1-D03:`・`B1-B01:`〜`B1-B03:`)の名前が1回ずつあり、すべて合格。各テストの期待役が §5.2 の表のリテラルと一致し、§5.2 の出典区分のコメントがある(目視)
4. 既存テストの期待値不変: `git diff main -- src/core/golden-cases.ts` が空。`git diff main -- src/core/*.test.ts src/core/tile/*.test.ts`(新規2ファイルを除く)の変更が次だけである(目視):
   - (a) 6ファイルの固定条件の `Rule` の `red` 行を `red: 1` にし、`depositPoint: 1000`・`ippatsu: true`・`kuitan: true` を加える。`tile/index.test.ts` L162 を `const red: Rule['red'] = 1;` にする
   - (b) `bonus.test.ts` の `calculateTableBonus` 呼び出しに第4引数 `1000` を加える。`payment.test.ts` の `defaultRule`(L18-21)、各 rule 引数、`Pick` 型の引数に `depositPoint: 1000`(型なら `'depositPoint'`)を加える
   - (c) `DEPOSIT_POINT` の import を `rule.ts` の `DEFAULT_DEPOSIT_POINT` に置き換える
   - (d) 例外として、`bonus.test.ts` A3-TB14 の `expect(DEPOSIT_POINT).toBe(1000)` を `expect(DEFAULT_DEPOSIT_POINT).toBe(1000)` にする(期待値 1000 は不変)。これ以外に `expect` の行の変更が無い
5. 残存参照:
   - `grep -rn "red\.m" src` が0件
   - `grep -rnw "DEPOSIT_POINT" src` が0件
   - `grep -rn "red\[" src/core --include=*.ts` の出力が、`redCountOf` の定義内を除いて0件(§2.2 の9箇所がすべて `redCountOf` に置き換わっている)
6. 変えてはならない箇所:
   - `git diff main -- src/core/local-yaku.ts | grep "^[-+].*point: 2"` が空(純正緑一色・大七星を変えていない)
   - `git diff main -- src/core/local-yaku.ts src/core/hora.ts | grep "^[-+].*ippatsu"` が空(一発は result.ts の正規化だけで反映する)
   - `git diff main -- src/core/score.ts src/core/fu.ts src/ui` が空。`git diff main -- src/core/result.ts` の変更が一発の正規化と、正規化後の値を渡す置き換えだけである(目視)
7. ミューテーション確認(G-05。1つずつ行い、確認後に必ず戻して `git status` で差分が無いことを確かめる):
   - `result.ts` の正規化を `ippatsu: handOptions.ippatsu` に変える → B1-Y02・Y03・Y04・DR02・DR03・DR04・DR05 が失敗し、B1-Y01・DR01 は合格のまま
   - `hora.ts` L1019 側(七対子)の `if (options.ippatsu)` を `if (true)` にする → B1-Y03 だけが失敗し(一発系の中で)、B1-Y02・Y04 は合格のまま。L478 側(面子手)を同様にする → B1-Y02・Y04 が失敗し、B1-Y03 は合格のまま
   - `hora.ts` L627 の `(isDoubleRiichi ? !options.ippatsu : true)` を `(isDoubleRiichi ? false : true)` にする → B1-DR02 が失敗する。L1052 側 → B1-DR03、L615 側 → B1-DR04 が失敗する
   - 断么九の条件から `(menzen || rule.kuitan)` を外す → B1-K02 が失敗する。`rule.kuitan` だけにする → B1-K03 が失敗する
   - `compareRules` から `kuitan` の比較を1行消す → B1-R03 が失敗する
   - `validateRule` の本場の `% 200` を `% 100` にする → B1-R05 が失敗する
   - `RULE_ITEMS` から1項目消す → B1-R08 が失敗する
   - `bonus.ts` の `depositPoint * table.deposit` を `1000 * table.deposit` にする → B1-B01 が失敗する
   - `redCountOf` で萬子にも `red` を返す → B1-R09 が失敗する
8. 型による選択肢の保証: `rule-items.ts` の `red` の選択肢の1つの `value` を `3` に書き換えると `npm run typecheck` が失敗する(確認後に戻す)
9. `src/core/rule-items.ts` の各 `label` が日本語で、HEX 等の UI 依存値を含まない(目視)
10. 三麻の不変条件(業務標準07): B1-R09 で `redCountOf(*, 'm') === 0`。`git diff main -- src/core/tile/index.ts | grep "^[-+].*const isSanma"` が空

## 7. 後続Issueへの引き継ぎ

- **B2(保存・補完)**: `validateRule(unknown)` の `key` で欠落・不正項目を特定し、`DEFAULT_RULE` の値で補完する。`createDefaultRule()` を使う。旧形式の `red: {m,p,s}` は保存実装が無いため存在しない前提
- **B3(プリセット)**: 段位戦ルールは `DEFAULT_RULE` と同値(仕様の冒頭)。一致判定は `compareRules`
- **B4(接続)**: `calculatePayment` に `depositPoint` を渡す。計算前に `validateRule` を呼ぶか、検査を通らないときの例外の返し方を決める(§4.6)
- **UI の Epic**: `RULE_ITEMS` から設定画面を組み立てる。並び順・グループ・説明文は UI 側で決める。一発なしのルールでは一発の入力欄を出さない等の扱いも UI 側で決める(計算コアは正規化するので、どちらでも結果は正しい)

## 8. 要確認事項

なし(旧 Q1・Q2 は 2026-10-31 のユーザー回答で確定し、§2.1 に記載)。

## 9. 実挙動未確認

- 喰い断なしで役なしになった和了形の扱いは実測済み(§2.2)。現行コードは役が空の hora を返す。B1 では変えない(Q2)
- `generateKokushiHora` に一発の push が無いことはコードの読みのみで確認した(国士+一発は実行していない。役満のため点数に影響しない)
- B1-D01 の `red: 2`(新しい表現)でのポン 0p の展開は実測できない。`instantiateMeld` の式(赤 = min(3, 2) = 2 枚)から導出した
- §6-7 のミューテーションで「合格のまま」と書いた組合せは、コードの読みから導いたもの(実行は検収で行う)
