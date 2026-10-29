# Issue #20 設計書: テスト名の命名規約と部分一致アサーションの厳密化

## 1. 目的と範囲

- 業務標準05「アサーションの原則」に合わせ、golden 以外のテストの部分一致(`toContain`・`toContainEqual`・`includes`・`some`・`find` による部分検証)を、完全一致にできるものは完全一致に直し、部分一致が必要なものには理由を日本語コメントで残す(方針C)。
- テスト名を「Epic 内の Issue 記号 + 既存の記号・番号」にそろえ、その規約を業務標準05 に追記する。
- 対象ファイル: `src/core/result.test.ts`・`src/core/north.test.ts`・`src/core/table.test.ts`・`src/core/bonus.test.ts`・`src/core/tile/shanten.test.ts`・`src/core/tile/index.test.ts`
- 対象外: `src/core/golden.test.ts`(`$id` を含む)・`src/core/golden-cases.ts`。実装コード(`src/core/*.ts` のテスト以外)は一切変更しない。

## 2. 参照資料と設計判断の根拠

| # | 資料 | 導いた判断 |
| --- | --- | --- |
| 1 | Issue #20 本文と 2026-10-30 追記(オーナー判断) | 範囲は golden 以外。命名規約もこの Issue に含める。旧名・新名の対照表を残す |
| 2 | 統括担当のヒアリング確定事項(本書冒頭の依頼と、その後の訂正2回) | 方針C、期待値は変えない、命名規約(§3)、対照表の置き場所(§6)、TB1 衝突の解決(§3.3)、H1・H2・N11 の扱い(§3.2) |
| 3 | [業務標準05](../rules/05-verification-protocol.md) | 完全一致が基本。部分一致は理由を明記。期待値は実装の式からコピーしない。新しく追加・変更したテストは red 確認 |
| 4 | [業務標準02](../rules/02-design-protocol.md) | 本書1本のみ作成。実挙動未確認の箇所を明記 |
| 5 | `docs/design/issue-10-sanma-tiles.md`・`issue-11-sanma-table.md`・`issue-12-sanma-north.md` | 各テストの由来 Issue の判定(§3.2)。issue-12 §78 に「既存記号は使用済み、本Issueは接頭辞 A4- を付ける」とあり、A4 は変更不要 |
| 6 | `git show origin/main:<path>` によるテスト・実装の読み取り | 部分一致箇所の洗い出し(§4)、期待値の手計算(§5) |

コード読み取りの基準: 依頼では origin/main = 45df44e とされたが、着手時の origin/main は 5a18544(PR #21 のマージ)だった。`git diff --stat 45df44e 5a18544` は `.claude/settings.json`・`AGENTS.md`・`CLAUDE.md` のみで、`src/` に差分はない。以下の行番号は両者で同じである。

## 3. 命名規約

### 3.1 規約(確定)

- テスト名(`test(...)` の第1引数)は `<Issue記号>-<既存の記号と番号>: <説明>` とする。Issue記号は Epic 内の記号で、A0=初期構成(Epic 0、コミット 266555c)、A2=#10、A3=#11、A4=#12。
- 既存の記号と番号はそのまま使う。2桁化・通し番号化はしない(例 `TB1`→`A3-TB1`、`V1`→`A2-V1`、`T1-親`→`A3-T1-親`)。
- 記号も番号もない既存テストには番号を振らず、Issue記号だけを付ける: `<Issue記号>: <説明>`(例 `A2: 向聴形: …`)。
- `describe` 名に含まれる旧番号表記(例 `入力の検証 (V1〜V6)`)は新名に合わせる(`入力の検証 (A2-V1〜V6)`)。記号のない `describe` 名は変更しない。
- A4(`north.test.ts`)は既に `A4-xx` なので変更しない。
- 上流 mahjong-calc から取り込んだテスト(`tile/index.test.ts` の `tileToCountsIndex` 4件・`countsIndexToTile` 6件・`tilesToCounts` 4件、計14件。上流 `src/lib/tile/index.test.ts` と同じもの)は命名規約の対象外で、名前を変えない。
- 初期構成 266555c で書かれた `tile/shanten.test.ts` の「三麻の手牌を分解できる」3件は上流由来ではない(上流の `src/lib/tile/` にテストは `index.test.ts` しかない)。この3件は `A0: <説明>` とする。266555c に存在したテストファイルは `tile/index.test.ts`・`tile/shanten.test.ts` の2本だけで、ほかに A0 に当たるテストはない(`git ls-tree -r --name-only 266555c` で確認)。
- Issue によらないテスト(Issue を立てず PR だけで追加されるテスト)の命名は別に定める(未確定)。

### 3.2 個別の扱い(確定)

- `shanten.test.ts` の `H1: …`・`H2: …` → `A2-H1: …`・`A2-H2: …`。H1・H2 は issue-10 の「手牌の記号」で、テスト番号ではない。この意味のあいまいさは対照表の注記で補う。
- `result.test.ts` の `describe('N11: H2 parseTiles')` → `describe('A2-N11: A2-H2 parseTiles')`、その中の `test('H2 1m999m…')` → `test('A2-H2: 1m999m11p22p33s444s は13枚・6種')`。N11 は設計書(issue-10)に記載がなく、テストのコメント「注意事項 N11」にのみ現れる(由来資料はリポジトリ内で見つからなかった)。対照表の注記に書く。
- 「チーは Meld の型で表せない」はチー削除(issue-11 §32 の8番)に伴う型検査なので A3 とする。

### 3.3 `-t` による実行の指定(確定)

`A3-TB1` は `-t` の部分一致で `A3-TB10`〜`A3-TB15` にも当たる。名前は変えず、規約で「`-t` は区切りの `:` まで含めて指定する(例 `-t 'A3-TB1:'`)」と定める。

### 3.4 業務標準05 に追記する文案(製造で `docs/rules/05-verification-protocol.md` の「アサーションの原則(必須)」の直後に節を追加する)

```markdown
## テスト名の命名規約(必須)

- テスト名は `<Issue記号>-<記号と番号>: <説明>` とする。Issue記号は Epic 内の記号(例: A2=#10、A3=#11、A4=#12)。記号と番号は設計書の受け入れ条件・テスト表で使ったものをそのまま使い、2桁化・通し番号化はしない(例 `A3-TB1`、`A3-T1-親`、`A4-N01`)。
- 記号・番号を持たないテストは `<Issue記号>: <説明>` とする。
- 初期構成(Epic 0)由来のテストは Issue記号 `A0` を使う。
- `describe` 名に記号の範囲を書く場合も、同じ記号を使う(例 `入力の検証 (A2-V1〜V6)`)。
- 上流(mahjong-calc)から取り込んだテストと golden(`golden.test.ts` の `$id`)は対象外とし、名前を変えない。
- Issue によらないテストの命名は別に定める。
- `npx vitest run -t` で1件を指定するときは、区切りの `:` まで含める(例 `-t 'A3-TB1:'`。`-t 'A3-TB1'` は A3-TB10〜15 にも当たる)。
```

あわせて「アサーションの原則(必須)」の部分一致の項に、次の1文を追記する(ヒアリングで採用確定): 「理由は、部分一致のアサーションの直前に日本語のコメントで書く。」

## 4. 部分一致の洗い出しと処置

洗い出しは `toContain|toContainEqual|includes(|.some(|.find(|arrayContaining|objectContaining|toMatchObject` の grep による(origin/main)。`table.test.ts`・`bonus.test.ts`・`tile/index.test.ts` には該当なし。

凡例: 完=完全一致に直す、理=部分一致のまま理由コメント、変=変更なし(既に完全一致)。

### 4.1 north.test.ts(A4。名前は変えない)

| テスト | 行 | 現状 | 処置 | 新しい期待値(§5 参照) |
| --- | --- | --- | --- | --- |
| A4-N04 | 170-171 | toContainEqual 役2件 | 完 | 役 = `[['nuki-dora',2],['pinfu',1],['riichi',1],['tsumo',1]]` |
| A4-N05 | 184 | toContainEqual 符1件 | 完 | 符の全体(§5.2 F-P-ron) |
| A4-N07 | 224 | toContainEqual 役1件 | 完 | `[['nuki-dora',1],['pinfu',1],['riichi',1],['rinshan',1],['tsumo',1]]` |
| A4-N08 | 238 | `some` 否定 | 完 | 各和了で by ごとに役全体: tsumo=`[['pinfu',1],['riichi',1],['tsumo',1]]`、ron=`[['pinfu',1],['riichi',1]]` |
| A4-N09 | 258-259 | toContainEqual 役2件 | 完 | `[['chitoitsu',2],['nuki-dora',1],['riichi',1],['rinshan',1],['tsumo',1]]` |
| A4-N10 | 272-273 | toContainEqual 役2件 | 完 | `[['nuki-dora',1],['pinfu',1],['riichi',1],['tanyao',1]]` |
| A4-Y01 | 301 | toContainEqual | 完 | `[['north',1],['riichi',1]]` |
| A4-Y02 | 312 | `some` 否定 | 完 | `[['riichi',1]]` |
| A4-Y03 | 323 | `some` 否定 | 完 | 役 `[['riichi',1]]`。符の合計 32・切り上げ40 の既存検証は残す |
| A4-Y04 | 340 | `some` 肯定 | 完 | 役 `[['pinfu',1],['riichi',1]]` |
| A4-Y05 | 359-360 | some 否定 + toContainEqual | 完 | 符の全体(§5.2 F-H-yakuhai-tsumo)。合計24・切り上げ30 は残す |
| A4-Y06 | 377 | toContainEqual | 完 | 符の全体(§5.2 F-H-nuki-tsumo)。合計20 は残す |
| A4-Y07〜Y10 | 394,410,426,442 | `find` で waiting のみ | 完 | 符の全体(§5.2 F-T-*)。`block.fu`・合計の既存検証は残す |
| A4-Y11・Y12 | 461,477 | toContainEqual | 完 | `[['north',1]]` |
| A4-Y13 | 493 | `some` 否定 | 完 | `[]`(§5.3 の注意) |
| A4-Y14 | 510-511 | toContainEqual 役2件 | 完 | `[['dora',3],['north',1],['riichi',1]]` |
| `getHora` 補助関数 | 102 | `find(h => h.by === by)` | 理 | 和了の選択であって期待値の検証ではない。理由コメント: 「和了の一覧から指定の by の最初の和了を選ぶ。選んだ和了は役・符の全体で検証する」 |
| A4-A01 | 631 | `find` で 4z の残り枚数 | 完 | `res.tileAvailabilities` を `[{ tile: { type: 'z', n: 4 }, count: 3 / 1 / 0 }]` と `toEqual`(nuki 0/2/3)。理由コメントを付けて残すのは north.test.ts では getHora の find だけ |

### 4.2 result.test.ts

| テスト(新名) | 行 | 現状 | 処置 |
| --- | --- | --- | --- |
| `A2: 向聴形: H1 …` | 188-199 | `some` で 2m〜8m 無し・1m/9m 有り | 完(萬子の次元で): 一覧から萬子だけを取り出し `['m1','m9']` と `toEqual`。一覧全体は理(コメント「一覧の全体は向聴計算の結果で、本テストの関心は萬子の除外。全体は手計算で確定できないため検証しない」) |
| `A2: ドラ表示牌 1m で …` | 256-260 | `find` で dora・riichi | 完(採用確定): 和了を by で選び、役全体を検証。ron=`[dora3, riichi1]`、tsumo=`[dora3, riichi1, tsumo1]`(§5.4)。`res.info.hora[0]` だけを見る形は by 指定に改める |
| `A2-R1`〜`A2-R3` | 284-370 | `some` で 2m〜8m 無し、`find` で各牌の count | 完(萬子の次元): 萬子を取り出し `['m1','m9']` と `toEqual`。各牌の count は既存の値のまま、`find` の結果に `toBeDefined()` を足す。一覧全体は理(同上の理由) |
| `A3-T1-親`〜`A3-T2-子` | 459-478 | `toContain` | 完: `[...new Set(yakuNames)].sort()` を `['tenho']` または `['chiho']` と `toEqual`。和了の件数は手牌の分解数に依存し期待値の関心外なので、重複を除いて比べる(コメントで明記) |
| `A3-T3-親`・`A3-T3-子` | 483-490 | `toContain` | 完(確定): `[...new Set(yakuNames)].sort()` を、親 `['kokushi-13','tenho']`、子 `['chiho','kokushi-13']` と `toEqual` |

### 4.3 tile/shanten.test.ts

| テスト(新名) | 行 | 現状 | 処置 |
| --- | --- | --- | --- |
| `A2-H1: …` | 77-81 | `includes` | 理 + 萬子の次元は完: `tiles.filter(i => i < 9)` を `[0, 8]` と `toEqual`。全体は理(コメント「有効牌の全体は向聴計算の結果で、手計算で確定できない。本テストの関心は萬子の除外」) |
| `A2-H2: …` | 100-103 | `includes` | 完: 結果全体を §5.5 の配列と並べ替えずに `toEqual`(実装は flatMap で添字の昇順に出す) |
| `A0: …`(「三麻の手牌を分解できる」3件) | 13-52 | — | 名前に `A0: ` を付ける。grep で部分一致の該当行がないため、アサーションは変えない |

### 4.4 tile/index.test.ts

部分一致なし。上流由来の14件(`tileToCountsIndex`・`countsIndexToTile`・`tilesToCounts`)は名前もアサーションも変えない(grep で該当なし、上流契約の保持のため)。A2 由来の10件は名前のみ変更(§6)。

## 5. 新しい期待値の手計算

前提(north.test.ts): 自風 南・場風 東(子)、立直あり、赤は p・s に1枚、`'5p'` は赤でない。牌の添字は m=0〜8、p=9〜17、s=18〜26、z=27〜33(北 4z=30)。役は `toYakuTuples` で名前順に並べた形で書く。

### 5.1 役

- P(`99m123p45p123s789s6p`、和了牌 6p、45p 両面、雀頭 9m): 立直1、平和1(全順子・両面・雀頭が役牌でない)。断么は 9m・1p 等があり無し。一盃口・三色(萬子の123が無い)・一通(789p が無い)無し。赤なし。ツモなら門前清自摸和1。抜き n なら nuki-dora n。→ N04・N07・N08 の値。N07 は rinshan(抜きドラ後のツモ)1 が加わる。
- C(`11m99m11p22p33p44s77z` 七対子): 立直1、七対子2、ツモ1、rinshan1(nuki1)、nuki-dora1。断么・混老頭(2p3p 等)・混一色無し。→ N09。
- S(`234p567p234s88s67s8s`、67s 両面、雀頭 8s): 立直1、断么1、平和1、nuki-dora1。三色(萬子なし)・一盃口無し。和了牌が 5s・8s のどちらでも同じ。→ N10。
- K(`444z111m123p456p9s9s`): 立直1、共通役牌なら北1。平和(刻子あり)・断么・混全帯么(456p)・三暗刻(暗刻2)無し。dora 3z なら三麻の次の牌は 4z で3枚 → ドラ3(`nuki × 西の数` は nuki 0 で0)。→ Y01・Y02・Y14。
- H(`44z123p45p123s789s6p`、雀頭 4z): 共通役牌では北の雀頭が役牌扱いで平和無し → 立直のみ。抜きドラでは平和あり → 立直1・平和1。→ Y03・Y04。
- M(`123p456p123s9m9m` + 北ポン/明槓、立直なし): 共通役牌なら北1のみ。抜きドラなら役なし(§5.3)。→ Y11・Y12・Y13。

### 5.2 符(`hora.fu` の全体)

符の並びは実装上「副底 → 手牌の面子(分解器の順) → 副露 → 雀頭(単騎以外) → 待ち → 門前ロン/ツモ」で、面子の順は分解器に依存する(実挙動未確認)。比較方法: `tile` を持つ要素(`shuntsu`・`kotsu`・`head`)だけを `tile` の昇順に並べ替え、`futei`・`waiting`・`menzen-ron`/`tsumo`/`pinfu-tsumo` は実装の順(先頭・末尾の位置)のまま、全体を `toEqual` で比べる。同時に `hora.horaTile` が下記の和了牌であることも検証する(和了牌が異なる和了が選ばれた場合は期待値の前提が崩れるため)。

- F-P-ron(N05、和了牌 6p): `futei 20`、`shuntsu` 9(123p)・18(123s)・24(789s) 各0、`head` 8(9m) 0、`waiting` ryammen・block `{shuntsu, tile:12, fu:0}`・fu 0、`menzen-ron 10`。合計30。
- F-H-yakuhai-tsumo(Y05、和了牌 6p): `futei 20`、shuntsu 9・18・24 各0、`head` 30 fu 2(北の雀頭)、waiting ryammen block shuntsu 12 fu 0、`tsumo 2`。合計24。
- F-H-nuki-tsumo(Y06): 上と同じで `head` 30 fu 0、末尾が `pinfu-tsumo 0`。合計20。
- F-T-*(Y07〜Y10、`123p456p123s789s4z4z`、4z 単騎): `futei 20`、shuntsu 9・12・18・24 各0、(単騎なので `head` 要素は無い)、`waiting` tanki・block `{head, tile:30, fu: 共=2/抜=0}`・fu 2、ロンは `menzen-ron 10`/ツモは `tsumo 2`。合計 34/32/26/24 で既存値と一致する。

### 5.3 A4-Y13 の役 `[]`

役なしの和了を `getHora` が返すことは既存テストが通っている事実から分かる。手計算で付く役はないので期待値は `[]`。役なしでも和了として返す実装挙動の是非は本 Issue の範囲外(§8)。

### 5.4 ドラ表示牌 1m(`999m123p456p789s11z`、親・場風東、立直)

役: 立直1、ドラ3(1m の次は 9m、3枚)。雀頭 1z は場風・自風なので平和無し。断么・一通(789s)・混全帯么(順子 456p)無し。ツモなら門前清自摸和1。

### 5.5 A2-H2: `chitoitsuShantenTiles`(`1m999m11p22p33s444s`)

種類は 1m・9m・1p・2p・3s・4s の6種、対子5(444s は1対として数える)。七対子の向聴を下げる牌は、1m(対子が増える)と、手牌にない種類(7種目)。2m〜8m は除外。期待値(並べ替えずにこの順で `toEqual`): `[0, 11, 12, 13, 14, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]`(1m、3p〜9p、1s・2s、5s〜9s、字牌7種)。**実挙動未確認**: 上流の七対子有効牌の定義(6種しか無いときに新しい種類を有効牌に含めるか、9m の4枚目を数えるか等)と一致するか確認していない。一致しない場合、製造は期待値を実装に合わせず、差分を報告する(§7 の差し戻し)。

## 6. 名前の変更一覧と対照表(製造で原設計書の末尾に追記する)

原設計書の本文は書き換えず、末尾に「## 追記: Issue #20 によるテスト名の変更」節を足し、次の表をそのまま載せる。A4(issue-12)は名前が変わらないので追記しない。設計書を持たない由来のテストは N11 と A0 の3件で、追記先はどちらも issue-10 とする(N11 は注記つき、A0 は §6.0)。

### 6.1 `docs/design/issue-10-sanma-tiles.md` に追記する表(A2)

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

### 6.0 A0(初期構成 266555c)の追記先

A0 の3件(shanten.test.ts「三麻の手牌を分解できる」)は設計書を持たない。対照表は `docs/design/issue-10-sanma-tiles.md` の追記節に「A0(初期構成)」の小見出しで載せる(新規ファイルを作らないため。shanten.test.ts の残りのテストの由来が A2 であることによる)。

| ファイル | 旧名 | 新名 |
| --- | --- | --- |
| shanten.test.ts | `111m999m123p456s77z は和了形` | `A0: 111m999m123p456s77z は和了形` |
| shanten.test.ts | `111m999m123p456s7z は聴牌` | `A0: 111m999m123p456s7z は聴牌` |
| shanten.test.ts | `19m は順子にならない` | `A0: 19m は順子にならない` |

注記(表の下に書く):
- H1〜H6 は本書の「手牌の記号」で、テスト番号ではない。`A2-H1`・`A2-H2` は、その手牌を主題にしたテストの名前として使う。
- `A2-N11` は本書に記載がなく、テストのコメント「注意事項 N11」にのみ由来する(由来資料はリポジトリ内に見当たらない)。Issue #20 で A2 に分類した。

### 6.2 `docs/design/issue-11-sanma-table.md` に追記する表(A3)

| ファイル | 旧名 | 新名 |
| --- | --- | --- |
| result.test.ts | `チーは Meld の型で表せない` | `A3: チーは Meld の型で表せない` |
| result.test.ts | describe `天和・地和 (T1〜T3)` | describe `天和・地和 (A3-T1〜T3)` |
| result.test.ts | `T1-親`・`T1-子`・`T2-親`・`T2-子`・`T3-親`・`T3-子` | 先頭に `A3-` を付ける(例 `A3-T1-親: 通常形 自風東で天和`) |
| table.test.ts | describe `isDealer (D1)`、`D1: …` | describe `isDealer (A3-D1)`、`A3-D1: …` |
| table.test.ts | describe `Wind の型 (W1)`、`W1: …` | describe `Wind の型 (A3-W1)`、`A3-W1: …` |
| bonus.test.ts | describe `calculateTableBonus (TB1〜TB15)` | describe `calculateTableBonus (A3-TB1〜TB15)` |
| bonus.test.ts | `TB1: …` 〜 `TB15: …` | `A3-TB1: …` 〜 `A3-TB15: …` |

注記: 1件だけ実行するときは `-t 'A3-TB1:'` のように `:` まで含める(業務標準05)。

## 7. 製造への指示

- コミットは「改名」「アサーションの厳密化」「業務標準05 の追記」「原設計書への対照表追記」に分けてよい(粒度は01 に従う)。
- 既存の期待値(役・飜・符・点数・残り枚数・null 判定)の数値は変えない。追加するのは §5 の値だけ。
- 厳密化したアサーションが落ちた場合、期待値を実装に合わせて書き換えない。落ちた内容(実際の値)を最終報告に書き、統括担当に差し戻す。実装の修正もしない。
- 補助関数(符の並べ替え等)の名前・配置は製造が決めてよい。期待値を実装の式から生成しない(リテラルで書く)。
- red 確認(業務標準05): 厳密化した各アサーションについて、**テストの期待値側**を一時的に1要素変える(例: 期待配列に `['ippatsu',1]` を足す、符の要素を1つ消す)と落ちることを確認し、戻す。結果を一覧で最終報告に書く。改名だけのテストは red 確認不要。
- 実装側の変異試験(1例、必須): `src/core/hora.ts` の平和の条件を一時的に緩め(例: 雀頭・待ちの条件を外して常に pinfu を付ける)、余分な役が付く状態にする。対照実験(コメント挿入のみの変更で全テストが通る)を先に行う。そのうえで、変更前の部分一致のテスト(origin/main の north.test.ts の A4-N08 以外で pinfu の有無を部分一致で見ていたもの、例 A4-Y01 の `toContainEqual(['north',1])`)が変異下でも通り、変更後の完全一致(A4-Y01・A4-Y03・A4-N08 等)が落ちることを確認する。変異は必ず戻し、`git diff src/core/hora.ts` が空であることを報告する。

## 8. 受け入れ条件

検収は作業ブランチで、各項目を順に実行する。

1. `git diff origin/main --name-only` が、§1 の6テストファイル・`docs/rules/05-verification-protocol.md`・`docs/design/issue-10-sanma-tiles.md`・`docs/design/issue-11-sanma-table.md`(と本書)だけを含み、`src/core/` のテスト以外のファイルと `golden*.ts` を含まない。
2. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて成功し、テスト件数が origin/main と同じ(`npx vitest run` の `Tests  N passed` の N が一致)。
3. `npx vitest run -t 'A3-TB1:'` で実行されるテストが1件だけ(他は skipped)。`-t 'A2-V1:'`・`-t 'A3-T1-親:'`・`-t 'A2-H2:'` も同様に、それぞれ想定の件数(A2-H2 は result.test.ts と shanten.test.ts の2件)。
4. `npx vitest run --reporter=verbose src/core/result.test.ts src/core/table.test.ts src/core/bonus.test.ts src/core/tile/shanten.test.ts src/core/tile/index.test.ts` の出力で、test 名(表示の最後の要素)が、上流由来の14件(`tileToCountsIndex` の `1m`・`2p`・`3s`・`4z`、`countsIndexToTile` の `0`・`4`・`10`・`20`・`30`・`33`、`tilesToCounts` の `empty`・`1m0p9s17z`・`1111m`・`11111m`)を除いてすべて `A0`・`A2`・`A3` で始まる。§6 の表と1対1に対応する。
5. `git diff origin/main -- src/core/north.test.ts | grep "^[-+]\s*test("` が空(A4 の名前は不変)。
6. `grep -nE "toContain|includes\(|\.some\(|\.find\(" src/core/{result,north,table,bonus}.test.ts src/core/tile/{shanten,index}.test.ts` で出た各行について、§4 で「理」とした箇所(getHora の find、A2 の向聴形・R1〜R3 の一覧全体、A2-H1 の全体)以外が残っていない。ただし、要素を取り出して結果を `toBeDefined`/`toEqual`/`toBe` で検証する find/filter は部分一致に当たらないので残ってよい。該当: A4-Y07〜Y10 の `waiting` の find、A2-R1〜R3 の牌ごとの find、A2 向聴形・A2-R1〜R3・A2-H1 の萬子の抽出。「理」の各行の直前(同じブロック内の直前のコメント行)に、部分一致の理由を述べる日本語コメントがある。A3-T1〜T2 の `not.toContain` は、`toEqual` で検証済みのため削除または残置どちらでもよいが、残す場合は理由コメントは不要。
7. 期待値の数値が変わっていない: `git diff origin/main -- 'src/core/*.test.ts' 'src/core/tile/*.test.ts' | grep "^-" | grep -E "toBe\(|toEqual\(|\[\s*'[a-z-]+',\s*[0-9]+\]"` で削除された行の数値(飜・符・合計・count・点数)が、追加側にも同じ値で現れる(検収は削除行ごとに対応する追加行を示す)。
8. §4.1・§4.2・§4.3 で「完」とした各テストが、§5 の値をリテラルで `toEqual` している(目視。`sort` 済みの比較を含む)。
9. red 確認: §7 の手順の結果一覧と実装側の変異試験の結果(対照実験を含む)が製造の最終報告にあり、検収は A4-N05 と A2-H2 の期待値を1要素変えると落ち、戻すと通ることを再現する。変異試験は、平和の条件を緩めた状態で、origin/main 版の A4-Y01 が通り、作業ブランチ版の A4-Y01 が落ちることを再現する。
10. `docs/rules/05-verification-protocol.md` に §3.4 の節と1文が入っている(`grep -n "テスト名の命名規約" docs/rules/05-verification-protocol.md` が1件、`grep -n "':' まで\|\`:\` まで" ` で `-t` の規約が見つかる)。
11. `docs/design/issue-10-sanma-tiles.md`・`issue-11-sanma-table.md` について、`git diff origin/main` の変更が末尾への追記(`+` 行)のみで `-` 行が無く、§6.1・§6.2 の表と注記を含む。
12. 製造の最終報告に、厳密化で落ちたアサーションの有無が書かれている。落ちたものがあれば、期待値・実装を変えずに差し戻されている。

## 9. 実挙動未確認の箇所

- §5.2 の符の全体と和了牌(6p・4z): `getHora` が `find` で最初に選ぶ和了の和了牌が、牌姿文字列の最後の牌と一致するか(14枚入力で和了牌をどう選ぶか)は確認していない。一致しなければ受け入れ条件8が落ちる。その場合は差し戻し(期待値を変えない)。
- §5.4: 1m ドラ表示の和了で ron・tsumo の両方が返るか、どの和了牌の和了が含まれるか。
- §5.5: 七対子有効牌の全体(並び順は flatMap による昇順と確認済み、値は未実行)。
- §4.2 の A3-T1〜T3: 全和了の役名の集合(A3-T3 の `kokushi-13` は統括担当の確定値で、私の手計算では和了牌の取り方により `kokushi` も混じりうると見ていた。実行で確認する)。
- §5.3: 役なしでも和了が返る挙動(既存テストが通ることからの推定)。
- テスト実行はしていない(手計算と既存期待値のみ)。

## 10. 後続 Issue への引き継ぎ

- Issue によらないテストの命名規約は未確定(業務標準05 に「別に定める」とだけ書く)。
- 役なしの和了(A4-Y13 の M・抜きドラ・立直なし)を和了として返す挙動は、UI(役なし表示)を作る Issue で扱いを決める。
- A4-N07(平和 + 嶺上開花のツモ)で平和と門前清自摸和が両方付く。嶺上ツモの平和の扱いはルールにより分かれるため、[mahjong-rules.md](../mahjong-rules.md) で確定しているか、後続で確認する(本 Issue では期待値を変えない)。
- golden.test.ts の部分一致2箇所(313行・361行)は本 Issue の範囲外のまま残る。
- 本節の疑わしい挙動は、今回は直さず記録だけにする(確定)。
