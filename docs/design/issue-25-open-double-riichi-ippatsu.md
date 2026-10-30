# Issue #25 設計書: オープンダブル立直+一発時の槍槓・海底のテスト追加(A7)

## 1. 目的と範囲

- PR #24(#14)の検収で、`src/core/hora.ts` の `isDoubleRiichi` から `'open-double-riichi'` を外す改変をしてもテストが失敗しないことが分かった。この判定を使う3分岐を、`riichi: 'open-double-riichi'` かつ `ippatsu: true` のテストで押さえる。
- 対象分岐(行番号は 734fcfa 時点):
  - (a) 面子手の槍槓の付与条件 `!isDoubleRiichi`(L615。定義は L464〜466)
  - (b) 面子手の海底・河底と一発の排他 `isDoubleRiichi ? !options.ippatsu : true`(L627)
  - (c) 七対子(`generateChitoitsuHora`。定義は L1004〜1006)の海底・河底と一発の排他(L1052)
- 変更するファイルは `src/core/local-yaku.test.ts` のみ(テスト追加)。**実装(`hora.ts`・`local-yaku.ts` 等)は変更しない。**
- 範囲外:
  - ダブル立直(通常、`'double-riichi'`)の網羅追加
  - ダブル立直系で**一発なし**のとき槍槓が付かない現挙動(L615 は `ippatsu` を見ていない)。是非は別Issueで扱う。本Issueではこの挙動を固定するテストも変更もしない
  - `local-yaku.ts` の `isIshinoUe` 内の `isDoubleRiichi`(石の上にも三年は A6-L21・L22 で押さえ済み)

## 2. 参照資料と設計判断の根拠

| # | 資料 | 導いた判断 |
| --- | --- | --- |
| 1 | 統括担当のヒアリング確定事項(1〜5) | 3分岐をオープンダブル立直で押さえる／槍槓は一発ありのみ／ミューテーション確認を受け入れ条件に入れる／実装は変えない／ブランチ `test/` |
| 2 | Issue #25 本文 | 範囲・食い違い時は止めて報告 |
| 3 | `docs/design/issue-14-local-yaku.md` §2.2・§4.4 | 3分岐はダブル立直の分岐を `isDoubleRiichi`(ダブル立直系)に置き換えたもの。オープンダブル立直はダブル立直と同じ扱い |
| 4 | `docs/mahjong-rules.md` §4.2「オープンダブルリーチは3飜(立直・ダブル立直の上位として置き換える)」【確定】 | 役の付与条件はダブル立直と同じで、飜だけ3飜になる |
| 5 | `src/core/hora.ts` L464〜L640・L1004〜L1065 の読解 | L1004 以降は七対子の経路(`type: 'chitoitsu'`)と確認。槍槓はロンのみ・待ちが嵌張/辺張/両面のときだけ付く |
| 6 | `src/core/local-yaku.test.ts` の補助関数(`defaultRule`・`defaultTable`・`defaultOptions`・`parseTiles`・`parseSingleTile`・`getHoraBy`・`computeBasePoint`)と A6-L21・L22・A6-R02(L1353・L1359) | 新テストは同じ補助関数・同じ書式で書く |
| 7 | 実測(一時テストファイルで現行実装の出力と、3種のミューテーションでの出力を確認。ファイルは削除・`hora.ts` は復元済み) | §5 の期待値が現行実装と一致し、各ミューテーションで差が出ることを確認(§5.4) |

ダブル立直系+一発で槍槓・海底が付かない根拠(既存の上流挙動。手計算の前提):
- 一発が残っている=ダブル立直の宣言から一巡以内で、鳴きが一度もない。加槓には先のポンが要るので、この間に槍槓は起こり得ない
- 一巡以内の和了牌が海底牌・河底牌になることは通常起こり得ない

これは `docs/mahjong-rules.md` には明記がない。本Issueは既存挙動(ダブル立直と同じ)をオープンダブル立直でも固定するテストであり、期待値は根拠4による。

## 3. 追加するテスト(シグネチャ)

`src/core/local-yaku.test.ts` の `describe('A6: ローカル役とオープンリーチ', ...)` の後に、新しい `describe` を1つ追加する。

```ts
describe('A7: オープンダブル立直+一発時の槍槓・海底', () => {
  test('A7-C01: …', () => { … });
  test('A7-H01: …', () => { … });
  test('A7-H02: …', () => { … });
});
```

- テスト名は業務標準05の命名規約(`<Issue記号>-<記号と番号>: <説明>`)に従う。Issue記号は A7(Issue #25)。記号は C=槍槓、H=海底・河底
- 入力は `generateResult(defaultTable, { hand, melds: [], dora: [], nuki: 0 }, options, defaultRule)`(`defaultRule` は `localYaku: true`・`openRiichi: true`)
- 和了の取得は `getHoraBy`、役は `expect(hora.yaku).toEqual([...])` の**完全一致**、基本点は `computeBasePoint`
- 各テストの先頭に出典コメントを置く(例: `// 出典: 役の付与条件は mahjong-rules.md §4.2(オープンダブル立直はダブル立直の上位として置き換える)と設計書 issue-14 §4.4、符・基本点は手計算(mahjong-rules.md §6)`)
- 期待値は §5 の手計算を写す。実装の式からコピーしない

## 4. テストケース

`O` = `{ ...defaultOptions, riichi: 'open-double-riichi', ippatsu: true }`

| ID | 対象分岐 | 手牌(13枚) | options | 和了牌 | 検証する和了 |
| --- | --- | --- | --- | --- | --- |
| A7-C01 | (a) L615 | `234p567p345s67s99s` | `{ ...O, chankan: true }` | 8s | ロンのみ |
| A7-H01 | (b) L627 | `234p567p345s678s9s` | `{ ...O, haitei: true }` | 9s | ロン・ツモ |
| A7-H02 | (c) L1052 | `1199p11335577s9s` | `{ ...O, haitei: true }` | 9s | ロン・ツモ |

## 5. 期待値の手計算

### 5.1 A7-C01(面子手・両面待ち・ロン)

234p 567p 345s 99s + 67s 待ち 5s・8s(両面)。8s ロン。
- 役: オープンダブル立直 3、一発 1、平和 1(門前・全順子・雀頭 9s は役牌でない・両面)。断么九は 9s を含むので無し。槍槓は付かない(ダブル立直系)
- 5飜 → 満貫、基本点 2000

```ts
[
  { type: 'yaku', name: 'open-double-riichi', han: 3 },
  { type: 'yaku', name: 'ippatsu', han: 1 },
  { type: 'yaku', name: 'pinfu', han: 1 }
]
```

### 5.2 A7-H01(面子手・単騎待ち)

234p 567p 345s 678s + 9s 単騎。石の上にも三年は一発ありなので不成立(`isIshinoUe`)。海底・河底は付かない。
- ロン: オープンダブル立直 3、一発 1 = 4飜。符 20+門前ロン10+単騎2=32→40。40×2^6=2560>2000 → 満貫、基本点 2000
- ツモ: 上記+門前清自摸和 1 = 5飜 → 満貫、基本点 2000

ロン `[open-double-riichi 3, ippatsu 1]`、ツモ `[open-double-riichi 3, ippatsu 1, tsumo 1]`(各要素は `{ type: 'yaku', name, han }`)。

### 5.3 A7-H02(七対子・単騎待ち)

11p 99p 11s 33s 55s 77s + 9s 単騎。二色なので混一色なし、字牌・么九のみでないので他役なし。
- ロン: オープンダブル立直 3、一発 1、七対子 2 = 6飜 → 跳満、基本点 3000
- ツモ: 上記+門前清自摸和 1 = 7飜 → 跳満、基本点 3000

ロン `[open-double-riichi 3, ippatsu 1, chitoitsu 2]`、ツモ `[open-double-riichi 3, ippatsu 1, tsumo 1, chitoitsu 2]`(この順序は実測した現行実装の順。七対子の経路では七対子が末尾に積まれる)。

### 5.4 実測結果(設計時)

現行実装で上記と一致した。さらに各分岐の `isDoubleRiichi` を `options.riichi === 'double-riichi'` 相当に一時置換したところ、次の差が出た(=追加テストが失敗する)。

| ミューテーション | 差 |
| --- | --- |
| M1(L615) | A7-C01 ロンに `chankan` が追加(基本点 3000) |
| M2(L627) | A7-H01 ロンに `hotei`、ツモに `haitei`(ツモ基本点 3000) |
| M3(L1052) | A7-H02 ロンに `hotei`、ツモに `haitei`(ツモ基本点 4000) |

M2 のロン・M3 のロンは基本点が変わらないため、役の完全一致で検出する。

## 6. 製造への指示

- ブランチ `test/issue-25-open-double-riichi-ippatsu` で作業し、`src/core/local-yaku.test.ts` だけを変更してコミットする
- 期待値が現行実装と食い違った場合は、テストも実装も直さず作業を止めて統括担当に報告する
- コミット前に `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` を通す
- 新しいテストの red 確認は、§7 の手順3(ミューテーション)で代える

## 7. 受け入れ条件

- [ ] 1. `git diff --name-only main...HEAD` が `src/core/local-yaku.test.ts`(と本設計書)だけ。`src/core/hora.ts` 等の実装に差分がない
- [ ] 2. `npx vitest run src/core/local-yaku.test.ts -t "A7-"` で A7-C01・A7-H01・A7-H02 の3件が通過し、各テストの期待値が §5 と一致する(役は `toEqual` の完全一致、基本点は C01=2000、H01=ロン2000/ツモ2000、H02=ロン3000/ツモ3000)
- [ ] 3. ミューテーション確認(検収担当が実施。各回の後に必ず復元する)
  - M1: `src/core/hora.ts` L615 の `!isDoubleRiichi &&` を `options.riichi !== 'double-riichi' &&` に書き換え → `npx vitest run src/core/local-yaku.test.ts -t "A7-"` で **A7-C01 が失敗**する → `git checkout src/core/hora.ts`
  - M2: L627 の `(isDoubleRiichi ? !options.ippatsu : true)` を `(options.riichi === 'double-riichi' ? !options.ippatsu : true)` に書き換え → **A7-H01 が失敗** → `git checkout src/core/hora.ts`
  - M3: L1052 の同じ式を同様に書き換え → **A7-H02 が失敗** → `git checkout src/core/hora.ts`
  - 参考(Issue の記述どおりの改変): L466 と L1006 の `|| options.riichi === 'open-double-riichi'` を両方外す → A7 の3件すべてが失敗 → `git checkout src/core/hora.ts`
  - 行番号がずれている場合は `grep -n "isDoubleRiichi" src/core/hora.ts` で特定する
- [ ] 4. 手順3の後、`git status --short` に `src/core/hora.ts` が現れない(復元済み)
- [ ] 5. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて成功する
- [ ] 6. 各 A7 テストに出典コメントがある

## 8. 実挙動未確認の箇所

- なし(§5.4 の通り、期待値とミューテーションでの差は設計時に実測済み)。ただし行番号は 734fcfa 時点のもの

## 9. 後続Issueへの引き継ぎ

- ダブル立直系で**一発なし**でも槍槓が付かない現挙動(L615 が `ippatsu` を見ない)の是非は、別Issueで判断する。本Issueのテストは一発ありのみを扱うため、その修正で A7-C01 は影響を受けない
- ダブル立直系+一発で槍槓・海底が付かない扱いは `docs/mahjong-rules.md` に明記がない。必要なら別途ルール仕様へ追記する
