# Issue #10 設計書: A2. 三麻の牌構成

- 対象Issue: #10(Epic A #2 の Sub-Issue)
- 製造ブランチ: `feature/issue-10-sanma-tiles`
- 変更対象(全ファイル):
  - 変更: `src/core/tile/index.ts`・`src/core/tile/shanten.ts`・`src/core/result.ts`
  - テスト追加: `src/core/tile/index.test.ts`・`src/core/tile/shanten.test.ts`・`src/core/result.test.ts`(新規)
  - 本設計書 `docs/design/issue-10-sanma-tiles.md`(統括担当がコミット)
  - 変更しない: `src/core/golden-cases.ts`・`src/core/golden.test.ts`・`src/core/input.ts`・`src/core/rule.ts`・`src/core/hora.ts`

## 1. 目的

計算コアを三麻の牌構成(108枚、萬子は 1m・9m のみ)に合わせる。

1. 2m〜8m を含む入力、チーを含む入力を受け付けない(入力の検証)
2. 有効牌・待ち・受け入れ・残り枚数の一覧に 2m〜8m を出さない
3. ドラ表示牌の萬子を `1m→9m`・`9m→1m` にする

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項(統括担当経由・オーナー確定)

| # | 確定事項 | 設計への反映 |
| --- | --- | --- |
| 1 | [mahjong-rules.md](../mahjong-rules.md) §1【確定】牌構成: 萬子は 1m・9m のみ、各4枚・計108枚 | §4.1・§4.3 |
| 2 | 同 §1【確定】ドラ表示牌: 表示牌 `1m`→ドラ `9m`、表示牌 `9m`→ドラ `1m` | §4.4 |
| 3 | [業務標準07](../rules/07-mahjong-rule-protocol.md)「三麻の不変条件」: 2m〜8m はどこにも現れない。チーは存在しない。残り枚数は108枚構成 | §4.2〜§4.5 |
| 4 | 2m〜8m を含む入力は `generateResult` が `null` を返す(旧Q1=提案A) | §4.2 |
| 5 | `Rule.red.m` は A2 で触らず、B1 で削除する(旧Q2) | §3 |
| 6 | 抜き北の差し引きは A4。A2 では何もしない(旧Q3) | §4.5 |
| 7 | UI での 2m〜8m の除外は A2 に含めない(旧Q4) | §3 |
| 8 | チー(`type: 'chii'`)を含む入力も `generateResult` が `null` を返す。`Chii` 型・`instantiateMeld` の `chii` 分岐の削除は後回し | §4.2 |
| 9 | A1 の `golden-cases.ts` の期待値は変更しない | §6 |

### 2.2 実物調査の結果(コード読解)

| 調査項目 | 結果 |
| --- | --- |
| 牌の型 | `NumberTile` は m/p/s 共通で `n: 1〜9`。型では 2m〜8m を排除していない |
| 入力の検証(既存) | `generateResult` は手牌枚数が3の倍数で `null`。`tilesToCounts` は同一牌5枚以上で `throw`。`isAvailableTiles`・`tileAvailableCount` は可否判定(後者は赤設定で存在しない牌に `null`) |
| チー | `instantiateMeld`(`input.ts:47-60`)は `tile.n >= 8` のみ `throw`。`tile=1m` のチーは `1m・2m・3m` に展開され、2m・3m が計算に混入する |
| `shantenTiles` | 孤立牌の同色前後2枚を立てる。孤立 `1m` から `2m`・`3m`、孤立 `9m` から `7m`・`8m` が出る |
| `chitoitsuShantenTiles` | 牌の種類が7未満なら「枚数1以下の全34種」(2m〜8m を含む)、7以上なら「枚数がちょうど1の牌」(手牌にある牌のみ。三麻入力なら 2m〜8m は出ない)を返す(`shanten.ts:193-196`) |
| `waitingTiles` | 搭子の待ちと単騎・対子の牌。萬子の搭子は 2m〜8m 無しでは作れないため、三麻入力では 2m〜8m は出ない。防御として除外する |
| 残り枚数 | `result.ts:84-101` の `tileCountsIndexToTileAvailabilities` が `tileAvailableCount(rule.red, 手牌+副露+ドラ表示牌, 牌)` を使う。赤5以外は `null` を想定せず `as TileAvailability` でキャストしている |
| ドラ | `nextIndex` を `hora.ts` の2箇所で使用。萬子は `1m→2m`・`9m→1m` |
| UI | `src/ui/App.tsx` は見出し1行のみ |

## 3. 範囲

- 含む: §4 の各項目とテスト
- 含まない: 抜き北(A4)、自風・親子(A3)、`Rule.red.m` の削除(B1)、UI(UI の Issue)、`Chii` 型・`instantiateMeld` の `chii` 分岐の削除(後回し)

## 4. 設計

### 4.1 三麻牌の判定(`tile/index.ts` に追加)

```ts
/** 三麻に存在する牌か(2m〜8m でない) */
export const isSanmaTile = (tile: Tile): boolean;
/** 枚数配列の添字版。添字 1〜7(2m〜8m)が false */
export const isSanmaIndex = (index: TileCountsIndex): boolean;
```

型(`NumberTile`)は変更しない。

### 4.2 入力の検証(`result.ts`)

`generateResult` の**最初**(手牌枚数の `% 3` 判定、`tilesToCounts`・`instantiateMeld` の呼び出しより前)で、次のいずれかに当たれば `null` を返す。

1. `input.hand`・`input.dora`・`input.melds` の `tile`(`null` を除く)に `isSanmaTile` が偽の牌がある
2. `input.melds` に `type: 'chii'` がある(`tile` が `null` でも弾く)

先に判定することで、`tile=1m` のチーが 2m・3m に展開されることも、2m〜8m が5枚以上で `tilesToCounts` が `throw` することも起きない。判定は内部関数(名前は製造担当が決めてよい)にまとめる。

あわせて(UI は範囲外だが、コアの可否判定関数として変更し単体テストで固定する。§5-3)`isAvailableTiles` は 2m〜8m を含むとき `false`、`tileAvailableCount` は 2m〜8m に対して `null` を返す。`result.ts` の一覧は §4.3 で 2m〜8m を除いた後に `tileAvailableCount` を呼ぶため、`null` が `as TileAvailability` のキャストに混ざることはない(§5-10 で固定)。

### 4.3 有効牌・待ちからの除外(`tile/shanten.ts`)

`shantenTiles`・`chitoitsuShantenTiles`・`waitingTiles` の戻り値から `isSanmaIndex` が偽の添字を除く。`kokushiShantenTiles` は么九牌のみなので変更不要。向聴数(`minShanten`・`countChitoitsuShanten`)は変更しない。

### 4.4 ドラ表示牌(`nextIndex`)

萬子は添字 `0(1m)→8(9m)`、`8(9m)→0(1m)`。それ以外は従来どおり。`hora.ts` は変更しない。

### 4.5 残り枚数

「4−(手牌+副露+ドラ表示牌の使用枚数)」は108枚構成でもそのまま正しい。§4.3 で 2m〜8m が一覧から消えることで108枚構成になる。抜き北の差し引きは A4 で行い、A2 では何もしない。

## 5. テスト(製造担当が追加)

牌姿は MPSZ 表記。`generateResult` には `golden.test.ts` と同じ形で `Table`・`HandOptions`・`Rule` を渡す(`Rule.red` は `m:0, p:1, s:1`)。各牌姿には枚数と、通る分岐(コード読解による見込み)を併記する。

使う牌姿:

| 記号 | 牌姿 | 枚数 | 通る分岐(見込み) |
| --- | --- | --- | --- |
| H1 | `19m123456p789s12z` | 2+6+3+2=13 | `result.ts` の13枚の分岐。面子3(123p・456p・789s)、孤立 1m・9m・1z・2z。通常2向聴・七対子6・国士7 → 通常のみ最小。`shantenTiles` の「対子0・面子+搭子<4」で孤立牌の前後(1m→2m・3m、9m→7m・8m)を立てる |
| H2 | `1m999m11p22p33s444s` | 1+3+2+2+2+3=13 | `chitoitsuShantenTiles` 単体で使用。種類6(<7)→ `c<=1` の分岐(`shanten.ts:194`)で枚数0の 2m〜8m と枚数1の 1m を返す |
| H3 | `11m99m123p456s` | 2+2+3+3=10 | 副露なし。10枚かつ10+0≠13 → 聴牌なら `waitingTiles` の分岐。シャンポン待ち 1m・9m |
| H4 | `19m123456p78s` | 2+6+2=10 | 副露1つと組み合わせる。10+3=13 → `shantenTiles(…, melds.length=1)` の分岐。面子2+副露1+搭子1(78s)=4 → 「対子0・それ以外」で rest(1m・9m)と 78s の待ち 6s・9s を立てる |
| H5 | `19m46p46s123789p1z` | 2+2+2+6+1=13 | 13枚の分岐。面子2(123p・789p)、嵌張 46p・46s、孤立 1m・9m・1z。通常2向聴・七対子6・国士8 → 通常のみ最小。有効牌に 5p・5s を含む |
| H6 | `22222m9m123456p78s` | 5+1+6+2=14 | 14枚(`%3=2`)なので `% 3` では弾かれない。検証が無いと `result.ts:76` の `tilesToCounts` が5枚で `throw` する |

1. **`nextIndex`**(`index.test.ts`): `1m→9m`、`9m→1m`、`9p→1p`、`4z→1z`、`7z→5z`
2. **`isSanmaTile`・`isSanmaIndex`**(`index.test.ts`): `1m`・`9m`・赤`5p`・`1z` は真、`2m`〜`8m`(添字1〜7)は偽
3. **`isAvailableTiles`・`tileAvailableCount`**(`index.test.ts`): `isAvailableTiles(red, [], [2m])` が `false`、`isAvailableTiles(red, [], [1m])` が `true`。`tileAvailableCount(red, [], 2m)` が `null`、`tileAvailableCount(red, [], 1m)` が `4`
4. **`shantenTiles`**(`shanten.test.ts`): H1 を `minShanten(counts, 0)` で分解し、`shantenTiles(results, counts, 0)` の結果に添字1〜7が無く、添字0・8が含まれる
5. **`chitoitsuShantenTiles`**(`shanten.test.ts`): H2 の枚数配列で結果に添字1〜7が無く、添字0(1m)が含まれる
6. **入力の検証**(`result.test.ts`): 次のそれぞれで `generateResult` が `null` を返す。いずれも検証が無ければ `null` にならない(枚数が `% 3 ≠ 0`)入力である
   - V1: 手牌 `2m9m123456p789s12z`(13枚)
   - V2: 手牌 H1(13枚)、ドラ表示牌 `5m`
   - V3: 手牌 H4(10枚)+副露 `{ type: 'pon', tile: 3m }`
   - V4: 手牌 H4(10枚)+副露 `{ type: 'chii', tile: 1m, includeRed: false }`。例外を投げず `null`
   - V5: 手牌 H4(10枚)+副露 `{ type: 'chii', tile: 1p, includeRed: false }`
   - V6: 手牌 H6(14枚)。例外を投げず `null`
7. **一覧に 2m〜8m が無い**(`result.test.ts`)
   - 向聴形: H1 で `type: 'hora-shanten'`・`info.type: 'shanten'`、`tileAvailabilities` に 2m〜8m が無く、1m・9m がある
   - 聴牌形: H3 で `type: 'tempai'`、`tileAvailabilities` の牌が `1m`・`9m` のみ
8. **ドラ表示牌 1m**(`result.test.ts`): 手牌 `999m123p456p789s11z`(3+3+3+3+2=14、末尾 `1z` で和了)、立直、ロン、ドラ表示牌 `1m` で、和了の `dora` が 3飜。期待値(立直1・ドラ3)は製造担当が手計算で確かめ、出典(手計算、Wikipedia「麻雀の役一覧」「麻雀の得点計算」)をテストにコメントで残す
9. **残り枚数(108枚構成)**(`result.test.ts`)
   - R1: 手牌 H1、ドラ表示牌 `1m` → `1m` の残り 2(4−手牌1−表示牌1)、`9m` の残り 3
   - R2: 手牌 H4+副露ポン `6s`、ドラ表示牌 `9m9s` → `6s` の残り 1(4−副露3)、`9s` の残り 3(4−表示牌1)、`9m` の残り 2(4−手牌1−表示牌1)、`1m` の残り 3
   - R3: 手牌 H5、ドラ表示牌 `0p`(赤5p)→ 赤`5p` の残り 0(赤1−表示牌1)、通常`5p` の残り 3、赤`5s` の残り 1、通常`5s` の残り 3
   - R1〜R3 の一覧全体に 2m〜8m が無い
10. **`null` 混入なし**(`result.test.ts`): §5-7・§5-9 の各ケースで `tileAvailabilities` の全要素の `count` が `number`

## 6. ゴールデンテスト(A1)への影響

- ドラ表示牌に `1m` は無い(A1 のデータ検査で保証)。`9m` 表示牌は G05(`golden-cases.ts` 170〜176行付近)・G21(570〜574行付近)ほかにあり、変更前後とも `9m→1m` で結果は同じ
- 2m〜8m・チーを含むケースは無い(データ検査で保証)
- 結論: **期待値が変わる箇所は見つからなかった**(コード読解による。受け入れ条件5で実行確認)

## 7. 受け入れ条件

検収担当は `feature/issue-10-sanma-tiles` で次を1項目ずつ確かめる。

1. **変更範囲**: 本設計書が統括担当によりコミット済みであることを前提に、`git diff --name-only main...HEAD` が冒頭の「変更対象」の範囲に収まる
2. **ドラ**: §5-1・§5-8 のテストが存在して通る。§5-8 にコメントで出典がある
3. **入力の検証**: §5-6 の V1〜V6 のテストが存在し、いずれも `null` を確かめて通る。`generateResult` の中で検証が `% 3` 判定・`tilesToCounts`・`instantiateMeld` より前にあることを目視で確かめる
4. **有効牌**: §5-2〜§5-5・§5-7 のテストが存在して通る。`shantenTiles`・`chitoitsuShantenTiles`・`waitingTiles` に `isSanmaIndex` の条件があることを目視で確かめる
5. **ゴールデン**: `npm test` の出力で `golden.test.ts` の失敗が0件
6. **検知力**(各確認後に `git status` で差分なしを確かめる)
   - `nextIndex` の萬子の分岐を外すと §5-1 が失敗する
   - `shantenTiles` の除外を外すと §5-4 と §5-7(向聴形)が失敗する
   - `chitoitsuShantenTiles` の除外を外すと §5-5 が失敗する
   - 入力の検証を外すと §5-6 の V1〜V6 が失敗する(V6 は例外で失敗)
   - `waitingTiles` の除外は、三麻の入力では元から 2m〜8m が出ないための**防御的な変更で、検知力の確認対象外**とする
7. **残り枚数**: §5-3・§5-9・§5-10 のテストが存在して通る
8. **範囲外を実装していない**: `git diff --name-only main...HEAD -- src/ui src/core/input.ts src/core/rule.ts src/core/hora.ts src/core/golden-cases.ts src/core/golden.test.ts` の出力が空
9. **品質**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がエラー0

## 8. 要ヒアリング事項

なし(旧Q1〜Q4 はオーナー確定済み。§2.1)

## 9. 先送り事項

- `Chii` 型・`instantiateMeld` の `chii` 分岐・喰い平和の削除 → 後続Issue
- 抜き北の差し引き → A4
- UI での 2m〜8m の除外 → UI の Issue(`isAvailableTiles`・`tileAvailableCount` を使う)
- `Rule.red.m` の削除 → B1

## 10. 後続Issueへの引き継ぎ・残留リスク

- A4: 抜き北の差し引きは `result.ts` の `allInputTiles` と `tileAvailableCount` に加える
- チーの型を削除するIssueでは、§4.2 のチー拒否を型で置き換えてよい
- 残留リスク: 分解器(WASM)が三麻の 1m・9m(対子・刻子にしかならない)を孤立牌として数えた向聴数が、三麻の実態と一致するかは未検証。食い違いが見つかれば範囲外として統括担当に報告する

## 11. 実挙動未確認の箇所

- §2.2・§6 はコード読解によるもので、テストは実行していない
- §5 の H1〜H6 の分岐(向聴数・最小になる形・`tempai` になること)は読解による見込み。製造担当は実行して確かめ、外れた場合は表の「通る分岐」と同じ意図の別の牌姿に替え、枚数と分岐を添えて報告する
- §5-7 の和了形の役・飜は製造担当の手計算で確定させる

## 追記: Issue #20 によるテスト名の変更

### A0(初期構成)

| ファイル | 旧名 | 新名 |
| --- | --- | --- |
| shanten.test.ts | `111m999m123p456s77z は和了形` | `A0: 111m999m123p456s77z は和了形` |
| shanten.test.ts | `111m999m123p456s7z は聴牌` | `A0: 111m999m123p456s7z は聴牌` |
| shanten.test.ts | `19m は順子にならない` | `A0: 19m は順子にならない` |

### A2

| ファイル | 旧名 | 新名 |
| --- | --- | --- |
| result.test.ts | describe `N11: H2 parseTiles` | describe `A2-N11: A2-H2 parseTiles` |
| result.test.ts | `H2 1m999m11p22p33s444s は13枚・6種` | `A2-H2: 1m999m11p22p33s444s は13枚・6種` |
| result.test.ts | describe `入力の検証 (V1〜V6)` | describe `入力の検証 (A2-V1〜V6)` |
| result.test.ts | `V1: …`・`V2: …`・`V3: …`・`V6: …` | `A2-V1: …`・`A2-V2: …`・`A2-V3: …`・`A2-V6: …`(説明部分は同じ) |
| result.test.ts | `向聴形: H1 (19m123456p789s12z) で …` | `A2: 向聴形: H1 (19m123456p789s12z) で …` |
| result.test.ts | `聴牌形: H3 (11m99m123p456s: 10枚) で …` | `A2: 聴牌形: H3 (11m99m123p456s: 10枚) で …` |
| result.test.ts | `ドラ表示牌 1m で 9m がドラになり、dora 3飜となる` | `A2: ドラ表示牌 1m で 9m がドラになり、dora 3飜となる` |
| result.test.ts | `R1: …`・`R2: …`・`R3: …` | `A2-R1: …`・`A2-R2: …`・`A2-R3: …` |
| result.test.ts | `§5-7・§5-9 の全ケースで …` | `A2: §5-7・§5-9 の全ケースで …` |
| shanten.test.ts | `H1: 19m123456p789s12z の有効牌に …` | `A2-H1: 19m123456p789s12z の有効牌に …` |
| shanten.test.ts | `H2: 1m999m11p22p33s444s の結果に …` | `A2-H2: 1m999m11p22p33s444s の結果に …` |
| index.test.ts | `1m(0) -> 9m(8)` ほか nextIndex の5件 | `A2: 1m(0) -> 9m(8)` ほか(先頭に `A2: ` を付ける) |
| index.test.ts | `1m・9m・赤5p・1z は真`・`2m〜8m は偽`・`添字版: …` | 先頭に `A2: ` を付ける |
| index.test.ts | `isAvailableTiles: …`・`tileAvailableCount: …` | 先頭に `A2: ` を付ける |

注記:
- H1〜H6 は本書の「手牌の記号」で、テスト番号ではない。`A2-H1`・`A2-H2` は、その手牌を主題にしたテストの名前として使う。
- `A2-N11` は本書に記載がなく、テストのコメント「注意事項 N11」にのみ由来する(由来資料はリポジトリ内に見当たらない)。Issue #20 で A2 に分類した。
