# Issue #11 設計書: A3. 三麻の卓情報

- 対象Issue: #11(Epic A #2 の Sub-Issue)
- 製造ブランチ: `feature/issue-11-sanma-table`
- 変更対象(全ファイル):
  - 変更: `src/core/table.ts`・`src/core/rule.ts`・`src/core/input.ts`・`src/core/fu.ts`・`src/core/hora.ts`・`src/core/result.ts`
  - 新規: `src/core/bonus.ts`・`src/core/bonus.test.ts`・`src/core/table.test.ts`
  - テスト変更: `src/core/result.test.ts`(固定条件の `Rule`、import、チーの V4・V5 の置き換え、天和・地和のテスト追加)・`src/core/golden.test.ts`(固定条件の `Rule` の1行のみ)
  - 統括担当がコミット: 本設計書 `docs/design/issue-11-sanma-table.md`、`docs/mahjong-rules.md`(Issue #11 のヒアリング結果とオーナー回答Q1・Q2を統括担当が反映済み)・`docs/requirements.md`(同ヒアリング結果を反映済み)
  - 変更しない: `src/core/golden-cases.ts`・`src/core/score.ts`・`src/core/yaku.ts`・`src/core/tile/**`・`src/ui/**`

## 1. 目的

1. 自風・場風を東・南・西に限る(型で北を排除する)
2. 親子を自風から判定する `isDealer` を作り、天和・地和の判定に使う
3. 本場・供託の加算額を返す純関数を作る(1本場あたりの点数は設定値、所定値200)
4. チーを計算コアから削除し、入口のチー拒否を型で置き換える

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項(統括担当経由・オーナー確定)

| # | 確定事項 | 出典 | 設計への反映 |
| --- | --- | --- | --- |
| 1 | 本場・供託の加算額を返す純関数まで作る。ロンは放銃者が「1本場あたりの額×本場数」を全額払う。ツモはツモられた2人が折半する。ツモ損3方式は A5 の範囲で、A5 はこの関数の結果を足し込む | ヒアリング1、[mahjong-rules.md](../mahjong-rules.md) §3.2【確定】 | §4.3 |
| 2 | 1本場あたりの額は `number` 型の設定値。所定値200だけを実装し、選択肢は B1 で決める。`Rule.honbaBonus` は置き換えて削除する | ヒアリング2 | §4.2 |
| 3 | ツモ折半で100点単位にならない場合の端数処理は【未確定】のまま。`calculateTableBonus` はその入力で例外を投げる | ヒアリング2、オーナー回答Q1、同 §3.2【未確定】 | §4.3 |
| 4 | 本場数・供託本数が負または整数でない場合、`calculateTableBonus` は入口で例外を投げる | オーナー回答Q2 | §4.3 |
| 5 | 供託を含める。和了者が「本数×1000」を受け取る。1本あたりの点数の設定化は B1 | ヒアリング3、同 §3.2【確定】 | §4.3 |
| 6 | 自風は `'east'\|'south'\|'west'`。場風は東・南・西(北を除く) | ヒアリング4、同 §7【確定】 | §4.1 |
| 7 | `isDealer(table) = seat === 'east'`。天和・地和の判定もこれに置き換える。親子は独立した入力にしない | ヒアリング5、同 §7【確定】 | §4.1・§4.5 |
| 8 | チー関連(`Chii` 型、`instantiateMeld` の `chii` 分岐、`fu.ts` の `chii` 分岐と喰い平和、`hora.ts` の `chii` 参照、`result.ts` 入口のチー拒否)を削除する。入口のチー拒否は型で置き換える | ヒアリング6、[業務標準07](../rules/07-mahjong-rule-protocol.md)「三麻の不変条件」 | §4.4 |
| 9 | ゴールデンテストの期待値は変えない。固定条件(`Rule`/`Table` の組み立て)の修正だけを許す | 統括担当の追加要求 | §6 |

### 2.2 実物調査の結果(コード読解)

| 調査項目 | 結果 |
| --- | --- |
| `Table`(`table.ts`) | `round: Wind`・`seat: Wind`・`continue: number`(本場)・`deposit: number`(供託)。`Wind` は北を含む。`Wind` を参照するのは `table.ts` のみ |
| `continue`・`deposit` の利用 | `src/` 全体で計算には未使用(テストの組み立てで 0 を渡すだけ) |
| `Rule.honbaBonus` | `100 \| 500`。計算には未使用。参照は `rule.ts`(型・`compareRules`)と、テストの固定条件 `golden.test.ts:90`・`result.test.ts:52` |
| 天和・地和 | `hora.ts` の3箇所(通常形 :339、七対子 :809、国士 :972)で `table.seat === 'east' ? 'tenho' : 'chiho'` |
| `hora.ts` の import | `:10` が `import type { Table } from './table';`(型のみ) |
| 風牌の添字 | `fu.ts:96,99`・`hora.ts:410,413,446,460` が `['east','south','west','north'].indexOf(...)` で字牌の添字を求める。北を型から外しても配列はそのままで添字は変わらない |
| チー | `input.ts` の `Chii` 型と `instantiateMeld` の `case 'chii'`、`fu.ts:125`(副露の順子0符)・`fu.ts:58-61`(`KuiPinfuFu` interface)・`fu.ts:235-241`(喰い平和)、`hora.ts:133,148`、`result.ts:73`、`result.test.ts` の V4・V5 |
| `result.test.ts` の import | `:2` が `import type { HandOptions } from './input';`、`:6` が `import type { NumberTile, Tile } from './tile';`。`NumberTile` は V4・V5 の `as NumberTile` でしか使っていない |
| 和了結果の取り出し | `generateResult` が14枚の和了形で `{ type: 'hora-shanten', info: { type: 'hora', hora: Hora[] } }` を返す。各 `Hora` の `yaku` 配列に役満が `{ type: 'yakuman', name, point }` で入る(`result.test.ts:278` に既存の取り出し例) |
| テストの型検査 | `tsconfig` の `include` は `./src` で、テストファイルも `npm run typecheck` の対象。vitest は型検査しない |
| ゴールデン | `golden-cases.ts` の `seat` は東南西、`round` は東南のみで、チーは無い(`golden.test.ts:321-326` のデータ検査) |

### 2.3 期待値の出典

[mahjong-rules.md](../mahjong-rules.md) §3.2 が直接裏づけるのは「ロンは放銃者が全額払う」と「ツモは所定値で100オール」だけである。ほかの期待値(本場数を変えた値、`honbaPoint` を変えた値、供託の額)は、同節の式「1本場あたりの点数×本場数(ロンは全額、ツモは2人で折半)」「供託は本数×1本あたりの点数(所定値1000)」から導いた値である。テストのコメントと検収の記録にも、この区別のとおり書く(仕様への例の追記はしない)。

## 3. 範囲

- 含む: §4 の各項目とテスト
- 含まない: ツモ損3方式・基本点からの支払い(A5)、供託1本あたりの点数と1本場あたりの点数の選択肢、端数処理の確定(B1)、抜き北(A4)、UI、ゴールデンへの本場・供託の追加

## 4. 設計

### 4.1 卓情報(`table.ts`)

```ts
/** 三麻の風。北は自風・場風にならない */
export type Wind = 'east' | 'south' | 'west';

export interface Table {
  round: Wind; // 場風
  seat: Wind; // 自風
  continue: number; // 本場数(0以上の整数)
  deposit: number; // 供託の本数(0以上の整数)
}

/** 親か。自風が東の者が親 */
export const isDealer = (table: Table): boolean;
```

- フィールド名 `continue`・`deposit` は既存を維持する
- 風牌の添字を求める `['east','south','west','north'].indexOf(...)` は変更しない

### 4.2 ルール(`rule.ts`)

- `honbaBonus: 100 | 500` を削除し、`honbaPoint: number`(1本場あたりの点数)を追加する
- `compareRules` の `honbaBonus` の比較を `honbaPoint` に置き換える
- 所定値の定数を次の名前で確定する:

```ts
/** 1本場あたりの点数の所定値(mahjong-rules.md §3.2) */
export const DEFAULT_HONBA_POINT = 200;
```

### 4.3 本場・供託の加算額(`bonus.ts` 新規)

```ts
/** 供託1本あたりの点数(mahjong-rules.md §3.2。設定化は B1) */
export const DEPOSIT_POINT = 1000;

export interface TableBonus {
  /** ロン: 放銃者が払う本場の額。ツモでは 0 */
  ronFromDiscarder: number;
  /** ツモ: ツモられた2人がそれぞれ払う本場の額。ロンでは 0 */
  tsumoFromEach: number;
  /** 和了者が受け取る供託の額(本数×DEPOSIT_POINT) */
  deposit: number;
}

export const calculateTableBonus = (
  table: Table,
  by: 'ron' | 'tsumo',
  honbaPoint: Rule['honbaPoint']
): TableBonus;
```

処理の順:

1. **入口の検証(オーナー回答Q2)**: `table.continue`・`table.deposit` のどちらかが `Number.isInteger` で偽、または負なら `throw new Error(...)`(メッセージは日本語、文言は製造担当が決めてよい)
2. ロン: `ronFromDiscarder = honbaPoint × continue`、`tsumoFromEach = 0`
3. ツモ: `honbaPoint × continue / 2` を求め、**100の倍数でなければ `throw new Error(...)`(オーナー回答Q1)**。倍数なら `tsumoFromEach` にする。`ronFromDiscarder = 0`。この分岐に「【未確定】端数処理は Epic B で確定する。それまでは例外を投げる」の日本語コメントを残す
4. 供託: `deposit = DEPOSIT_POINT × table.deposit`(ロン・ツモ共通)

- `honbaPoint` 自体の検証はしない(設定値は B1 の選択肢で保証する)
- 和了者の受け取り増分は `ronFromDiscarder + 2 × tsumoFromEach + deposit`。合算は A5 が行う
- 純関数とし、`generateResult` からは呼ばない(呼び出しは A5)

### 4.4 チーの削除

| ファイル | 変更 |
| --- | --- |
| `input.ts` | `Chii` 型を削除し、`Meld = Pon \| Kan`。`instantiateMeld` の `case 'chii'` を削除。`NumberTile` の import が未使用になれば削除 |
| `fu.ts` | 副露の符の `m.type === 'chii'` 分岐を削除(副露は常に刻子・槓子)。喰い平和の push(`:235-241`)、`KuiPinfuFu` interface 本体(`:58-61`)、型 `Fu` の `KuiPinfuFu` メンバーを削除 |
| `hora.ts` | `:133`・`:148` の `m.type === 'chii' ? 'shuntsu' : 'kotsu'` を `'kotsu'` に。`:10` の `import type { Table } from './table';` を `import { isDealer, type Table } from './table';` に変える |
| `result.ts` | `isValidSanmaInput` の `if (meld.type === 'chii') return false;` を削除 |
| `result.test.ts` | V4・V5 を削除。`:6` を `import type { Tile } from './tile';` に(`NumberTile` が未使用になるため)。`:2` を `import type { HandOptions, Meld } from './input';` に |

V4・V5 の代わりに次の型テストを置く(biome の整形後の全文。`@ts-expect-error` は `type: 'chii',` の行の直前に置く。判別子の不一致の型エラー TS2322 はこの行に出る見込み):

```ts
test('チーは Meld の型で表せない', () => {
  const m: Meld = {
    // @ts-expect-error チーは三麻に存在しない
    type: 'chii',
    tile: parseSingleTile('1m'),
    includeRed: false
  };
  expect(m).toBeDefined();
});
```

- この型テストは **typecheck 専用** である。vitest は型を検査しないので、`Chii` を戻しても vitest は失敗しない。`Chii` を戻すと `@ts-expect-error` が不要になり、`npm run typecheck` が TS2578(Unused '@ts-expect-error' directive)で失敗する
- 製造担当は `npm run format:check` と `npm run typecheck` の両方が通ることを確かめる。TS2322 が `type: 'chii'` 以外の行に出た場合は、実装を止めて報告する(§9)

### 4.5 天和・地和(`hora.ts`)

3箇所の `table.seat === 'east' ? 'tenho' : 'chiho'` を `isDealer(table) ? 'tenho' : 'chiho'` に置き換える。

## 5. テスト(製造担当が追加)

牌姿は MPSZ 表記。最後の1枚が和了牌。`generateResult` には `result.test.ts` の既存の固定条件(`Rule.red` は `m:0, p:1, s:1`)を使い、`honbaBonus: 100` を `honbaPoint: 200` に直す。

**テスト名の規約**: 各テスト名の先頭に記号とコロンを付ける(例: `'T1-親: 通常形 自風東で天和'`、`'TB3: ロン 3本場 供託2本'`、`'D1: ...'`)。`-t` は部分一致なので、検収担当は §7 の正規表現か `--reporter=verbose` の一覧で確かめる。

### 5.1 牌姿

| 記号 | 牌姿 | 枚数(手牌+副露+和了牌=合計) | 通る分岐(見込み) |
| --- | --- | --- | --- |
| T1 | `111m999m123p456p11z` | 手牌13(1m×3・9m×3・1p2p3p・4p5p6p・1z×1)+副露0+和了牌1(1z)=14 | 通常形の分解(面子4・雀頭1z)。`hora.ts:335` の `melds.length === 0 && options.tenho` の分岐(置き換え箇所 :339) |
| T2 | `1199m11p22p33s44s11z` | 手牌13(1m×2・9m×2・1p×2・2p×2・3s×2・4s×2・1z×1)+副露0+和了牌1(1z)=14。異なる7種の対子 | 面子が作れず通常形は不成立。七対子の分岐 `hora.ts:799` の `options.tenho`(置き換え箇所 :809) |
| T3 | `19m19p19s12345677z` | 手牌13(1m・9m・1p・9p・1s・9s・1z〜7z 各1)+副露0+和了牌1(7z)=14 | 国士の分岐 `hora.ts:959` の `options.tenho`(置き換え箇所 :972) |

### 5.2 テスト項目

1. **`isDealer`**(`table.test.ts`、テスト名の記号 D1): `round: 'east'` 固定で、`seat` が `east` で `true`、`south`・`west` で `false`
2. **風の型**(`table.test.ts`、typecheck 専用、記号 W1):

```ts
test('W1: 北は Wind の型で表せない', () => {
  // @ts-expect-error 北は自風・場風にならない
  const w: Wind = 'north';
  expect(w).toBe('north');
});
```

3. **天和・地和**(`result.test.ts`): `round: 'east'`・`continue: 0`・`deposit: 0` 固定。`HandOptions` は既存の既定値に `tenho: true`。役の取り出し経路: `res.type === 'hora-shanten'` かつ `res.info.type === 'hora'` を確かめ、`res.info.hora.flatMap(h => h.yaku).map(y => y.name)` を役名の一覧とする
   - T1・T2・T3 を `seat: 'east'` で → 一覧に `'tenho'` があり `'chiho'` が無い
   - T1 を `seat: 'south'`、T2 を `seat: 'west'`、T3 を `seat: 'south'` で → 一覧に `'chiho'` があり `'tenho'` が無い
   - テスト名は `T1-親`・`T1-子` のように牌姿の記号と親子を入れる
   - 出典コメント: [mahjong-rules.md](../mahjong-rules.md) §7【確定】(親は自風が東の者)
4. **本場・供託**(`bonus.test.ts`): `table` は `round: 'east', seat: 'east'` に `continue`・`deposit` を変えて渡す

| 記号 | by | honbaPoint | continue | deposit | ronFromDiscarder | tsumoFromEach | deposit(戻り値) | 根拠 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TB1 | ron | 200 | 0 | 0 | 0 | 0 | 0 | 式から導出 |
| TB2 | ron | 200 | 1 | 0 | 200 | 0 | 0 | 仕様が直接裏づけ(ロンは放銃者が全額、所定値200) |
| TB3 | ron | 200 | 3 | 2 | 600 | 0 | 2000 | 式から導出 |
| TB4 | tsumo | 200 | 1 | 0 | 0 | 100 | 0 | 仕様が直接裏づけ(所定値で100オール) |
| TB5 | tsumo | 200 | 2 | 1 | 0 | 200 | 1000 | 式から導出 |
| TB6 | tsumo | 200 | 0 | 3 | 0 | 0 | 3000 | 式から導出 |
| TB7 | ron | 300 | 2 | 0 | 600 | 0 | 0 | 式から導出(200決め打ちの検知用) |
| TB8 | tsumo | 400 | 1 | 0 | 0 | 200 | 0 | 式から導出(200決め打ちの検知用) |
| TB15 | ron | 300 | 1 | 0 | 300 | 0 | 0 | 式から導出(ロンでは100の倍数の検査をせず、例外を投げないことの検知用) |

5. **例外**(`bonus.test.ts`、`expect(() => ...).toThrow()`):

| 記号 | by | honbaPoint | continue | deposit | 理由 |
| --- | --- | --- | --- | --- | --- |
| TB9 | tsumo | 300 | 1 | 0 | 折半150が100の倍数でない(オーナー回答Q1) |
| TB10 | ron | 200 | -1 | 0 | 本場数が負(Q2) |
| TB11 | ron | 200 | 1.5 | 0 | 本場数が整数でない(Q2) |
| TB12 | ron | 200 | 0 | -1 | 供託本数が負(Q2) |
| TB13 | tsumo | 200 | 0 | 0.5 | 供託本数が整数でない(Q2) |

6. **所定値**(`bonus.test.ts`、記号 TB14): `DEFAULT_HONBA_POINT === 200`、`DEPOSIT_POINT === 1000`
7. **チーの型**(`result.test.ts`、typecheck 専用): §4.4 の型テスト

## 6. ゴールデンテスト(A1)への影響

- 修正は `golden.test.ts:90` の `honbaBonus: 100` を `honbaPoint: 200` に変える1行のみ。`tableOf` は `continue: 0, deposit: 0` のままで変更不要(`GoldenCase` の `seat`・`round` の型は新しい `Wind` の部分型)
- 本場・供託は `generateResult` の結果に入らないため、期待値に影響しない
- チーのケースは無く、喰い平和の削除は影響しない。天和・地和のケースは無い(`tenho: false` 固定)
- `golden.test.ts:321,325-326` の `as string` による検査は型変更後もコンパイルできる。変更しない
- 結論: **期待値が変わる箇所は見つからなかった**(コード読解による。受け入れ条件6で実行確認)

## 7. 受け入れ条件

検収担当は `feature/issue-11-sanma-table` で次を1項目ずつ確かめる。

1. **変更範囲**: `git diff --name-only main...HEAD` が冒頭の「変更対象」に収まる。`git diff main...HEAD -- src/core/golden.test.ts` が `honbaBonus: 100` → `honbaPoint: 200` の1行の置き換えだけである
2. **削除の確認**:
   - `grep -n "'north'" src/core/table.ts` の出力が空
   - `grep -rn "honbaBonus\|Chii\|'chii'\|kui-pinfu\|KuiPinfu" src --include=*.ts --include=*.tsx` の出力が次の2行だけ(行番号は前後してよい):
     - `src/core/golden.test.ts:321:` の `expect(m.type as string).not.toBe('chii');`
     - `src/core/result.test.ts:<行>:` の `type: 'chii',`(§5.2-7 の型テスト)
3. **静的検査**: `npm run typecheck`・`npm run lint`・`npm run format:check` がエラー0
4. **`isDealer`・天和地和**: `npx vitest run src/core/table.test.ts -t "D1:"` で1件、`npx vitest run src/core/result.test.ts -t "T[123]-(親|子):" --reporter=verbose` で6件(T1〜T3 の親・子)が実行されて通る。`grep -n "seat === 'east'" src/core/hora.ts` の出力が空、`grep -c "isDealer(table)" src/core/hora.ts` が `3`
5. **本場・供託**: `npx vitest run src/core/bonus.test.ts --reporter=verbose` の一覧に TB1〜TB15 の15件の名前がそれぞれ1回ずつあり、合格数が15以上・失敗0である。`grep -n "【未確定】" src/core/bonus.ts` が1行以上出力する。テストに §2.3 の区別どおりの出典コメント(TB2・TB4 は仕様が直接裏づけ、ほかは式から導出)がある
6. **ゴールデン**: `npm test` の出力で `golden.test.ts` の失敗が0件
7. **検知力**(各変異ごとに確認後 `git checkout -- <ファイル>` で戻し、`git status` で差分なしを確かめる)
   - `isDealer` を `seat === 'south'` に変えると §5.2-1 と §5.2-3 が失敗する
   - `hora.ts` の置き換え3箇所を**1箇所ずつ** `false ? 'tenho' : 'chiho'` に変える。:339 相当では T1 の親のみ、:809 相当では T2 の親のみ、:972 相当では T3 の親のみが失敗する
   - `honbaPoint` を `200` に決め打ちにすると TB7・TB8 が失敗する
   - ツモの `/ 2` を外すと TB4・TB5・TB8 が失敗する。`DEPOSIT_POINT` を `300` にすると TB3・TB5・TB6・TB14 が失敗する
   - 100の倍数でないときの例外を外すと TB9 が失敗する。その検査をロンの経路にも掛けると TB15 が失敗する。入口の検証を外すと TB10〜TB13 が失敗する
   - `input.ts` の `Meld` に `Chii` を戻すと、`npm run typecheck` のエラーに `TS2578` が含まれる(vitest では検知しない)
   - `table.ts` の `Wind` に `'north'` を戻すと、`npm run typecheck` のエラーに `TS2578` が含まれる(vitest では検知しない)
8. **範囲外を実装していない**: `git diff --name-only main...HEAD -- src/ui src/core/golden-cases.ts src/core/score.ts src/core/yaku.ts src/core/tile` の出力が空。`grep -rn calculateTableBonus src` の出力が `src/core/bonus.ts`(定義)と `src/core/bonus.test.ts` の行だけ

## 8. 後続Issueへの引き継ぎ

- **A5**: 支払いは基本点からの額に `calculateTableBonus` の結果を足し込む。ロンは放銃者の支払いに `ronFromDiscarder`、ツモはツモられた2人それぞれに `tsumoFromEach`、和了者の受け取りに `deposit` を加える。親子は `isDealer` で判定する。例外は入力不正・未確定の端数なので、A5 の呼び出し側での扱い(UI への表示等)を決める必要がある
- **B1**: `honbaPoint` の選択肢、`DEPOSIT_POINT` の設定化(`Rule` へ移す)、ツモ折半の端数処理の確定(確定後に TB9 の例外を置き換える)
- **B2**: 保存済みの旧ルールに `honbaBonus` があれば `honbaPoint` へ移行する(現状 localStorage の保存は未実装のため A3 では何もしない)
- **UI**: 自風・場風の選択肢は東南西。親子の入力欄は作らない。本場数・供託本数は0以上の整数のみ入力できるようにする

## 9. 実挙動未確認

- (解消)§4.4 の型テストで TS2322 が `type: 'chii',` の行にだけ出ることは、レビュー担当が biome と tsc で確認済み。本物の型での確認は製造時の `npm run typecheck` で行う
- §5.1 の T2・T3 が七対子・国士の分岐を通ること(コード読解による見込み)
- §6 のゴールデンへの影響なし(コード読解による)

## 10. 承認の記録

- 2026-10-29 オーナーが設計を承認した。製造方式は AGY スキル式とし、PR の作成と Codex レビューへの対応までを委任する
- 供託1本あたりの点数(1000)は `Rule` に加えず、B1 で設定化するまで `bonus.ts` の定数 `DEPOSIT_POINT` にとどめる(承認時に記録)
