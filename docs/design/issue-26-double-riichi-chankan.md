# Issue #26 設計書: A8. ダブル立直系(一発なし)と槍槓の複合

- 対象Issue: #26(Epic A #2 の Sub-Issue)
- 製造ブランチ: `fix/issue-26-double-riichi-chankan`
- 変更対象(全ファイル):
  - 変更: `src/core/hora.ts`(槍槓の付与条件 1か所のみ)
  - 新規: `src/core/double-riichi-chankan.test.ts`
  - 統括担当がコミット: 本設計書、`docs/mahjong-rules.md`(§3 の改訂案を反映)
  - 変更しない: `src/core/local-yaku.test.ts`(A7 のテストを含む既存ファイル。本Issueでは触らない)、その他すべて

## 1. 目的

1. ダブル立直・オープンダブル立直で**一発なし**のとき、槍槓を付ける(現状は付かない)
2. ダブル立直系で**一発あり**のときは、従来どおり槍槓を付けない(#25 の A7-C01 を維持)
3. 槍槓の条件を、海底・河底の条件 `isDoubleRiichi ? !options.ippatsu : true` と同じ形に揃える

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項(ヒアリング済み)

| # | 確定事項 | 出典 | 設計への反映 |
| --- | --- | --- | --- |
| 1 | ダブル立直系+一発なしでは槍槓が複合する | 役の定義からの帰結(ダブル立直は第1打までの条件、槍槓は他家の加槓へのロン。定義上排除し合う条件がない)。準拠先の実機確認はしていない。ユーザー判断で【確定】 | §4.1・§3(仕様改訂案)・§5 |
| 2 | ダブル立直系+一発ありでは槍槓を付けない(加槓に要するポンで一発が消えるため通常起こり得ない) | 同上(推論)。A7-C01 を維持 | §4.1・§5 C04 |
| 3 | 国士無双の暗槓への槍槓は役満のため論点外 | ユーザー判断 | 本Issueでは扱わない |

### 2.2 現状の調査結果

- `src/core/hora.ts`(面子手、L611 付近)の槍槓の条件は `options.chankan && !isDoubleRiichi && (待ちが嵌張・辺張・両面)`。`isDoubleRiichi` は L464 で `riichi === 'double-riichi' || riichi === 'open-double-riichi'`
- 海底・河底(L627 付近)は `options.haitei && (isDoubleRiichi ? !options.ippatsu : true)` で一発を見ている。槍槓だけ非対称
- ロンに槍槓が付いた場合、L877-879 の `if (options.chankan && ron.yaku.some(y => y.name === 'chankan')) return [ron];` によりツモの Hora は生成されない(既存仕様。修正後はダブル立直系+一発なしでもこの分岐に入る)
- 七対子側(L1004 以降)は槍槓を扱わない(単騎待ちのため槍槓の付与対象外。既存仕様)ので変更不要
- 上流 livewing での由来は Issue 本文のとおり不明

## 3. ルール仕様の改訂案(統括担当が `docs/mahjong-rules.md` を編集する)

### 3.1 §4.1 に小節を追加

§4.1 の直後(§4.2 ローカル役の前)に、次の小節を追加する。

```markdown
#### 4.1.1 ダブル立直系と槍槓・海底・河底(Issue #26)

- 【確定】ダブル立直・オープンダブル立直で一発がないときは、槍槓・海底撈月・河底撈魚が複合する。根拠は役の定義からの帰結とする(ダブル立直は第1打までの条件、槍槓は他家の加槓へのロンであり、定義上排除し合う条件がない)。準拠先の実機では確認しておらず、確定根拠は役の定義からの帰結とユーザー判断である(§6 の電脳麻将との照合とは性質が異なる)。理論上は複合し得るが、狙って起こすことはほぼ不可能な組み合わせである
- 【確定】ダブル立直・オープンダブル立直で一発があるときは、槍槓・海底撈月・河底撈魚を付けない。加槓に要するポンや海底までの巡目の経過で一発が消えるため、通常は起こり得ない組み合わせとして扱う(国士無双の暗槓への槍槓は役満のため対象外)
```

### 3.2 §6 点数の確定根拠 に1行追加

```markdown
- 【確定】ダブル立直系と槍槓の複合(§4.1.1)は準拠先の実機確認がないため、役の成否は§4.1.1の定義、点数は手計算で期待値を定める。これは役の定義からの帰結とユーザー判断による確定であり、電脳麻将との照合を経たものではない(Issue #26)
```

注: 海底・河底の扱いは既存コードの挙動の明文化であり、#25 設計書の残課題「ダブル立直系+一発で槍槓・海底が付かない扱いはルール仕様に明記がない」もこれで解消する。

## 4. 実装

### 4.1 `src/core/hora.ts`

槍槓の付与条件(`options.chankan &&` の直後の行)にある `!isDoubleRiichi &&` を次に置き換える。行番号ではなくこの文字列で特定すること。他は一切変えない。

```ts
(isDoubleRiichi ? !options.ippatsu : true) &&
```

- 通常の立直・オープン立直・立直なしの挙動は不変(`isDoubleRiichi` が偽なら常に真)
- 型・シグネチャの変更なし

### 4.2 `src/core/double-riichi-chankan.test.ts`(新規)

- `src/core/local-yaku.test.ts` の L1-148 にある`parseTiles`〜`computeBasePoint` の補助関数(`parseTiles`・`parseSingleTile`・`defaultRule`・`defaultTable`・`defaultOptions`・`getHoraBy`・`computeBasePoint`)を**複製**して使う(共通化のためのファイル分割はしない。PR #27 との衝突回避が目的)。`localYakuNames` 等、使わないものは複製しない。未使用の import(`judgeMentsuLocalYaku`・`compareRules` 等)は残さない
- `describe('A8: ダブル立直系と槍槓の複合', ...)`、テスト名は `A8-C01: …` 形式(#20 の命名規約)。各テストに期待値の出典コメントを付ける

## 5. テストケース

共通: 手牌 `234p567p345s67s99s`、副露・ドラ・抜き北なし、`defaultTable`(東場・南家)、`defaultRule`、和了牌 `8s`。`O = { ...defaultOptions, chankan: true, ...表の指定 }`。

役の判定(定義): 門前・全て順子・雀頭 9s(役牌でない)・67s 両面待ち → 平和。9s を含むため断么九なし。待ちが両面なので槍槓の待ち条件(L614-618)を満たす。符: 平和ロン 30符。基本点: 符×2^(飜+2)、5飜以上は満貫 2000(mahjong-rules.md §6 の Wikipedia 計算式)。

| ID | 指定 | 和了 | 期待する役(`toEqual` の完全一致、この順) | 飜/符 | 基本点 |
| --- | --- | --- | --- | --- | --- |
| C01 | `riichi: 'double-riichi'` | ロン | double-riichi 2, pinfu 1, chankan 1 | 4/30 | 1920 |
| C02 | `riichi: 'open-double-riichi'` | ロン | open-double-riichi 3, pinfu 1, chankan 1 | 5/30 | 2000 |
| C03 | `riichi: 'double-riichi'` | ツモ | ツモの Hora が生成されない(`res.info.hora.some(h => h.by === 'tsumo')` が偽)。ロンに槍槓が付くため L877-879 の分岐でロンのみ返る | — | — |
| C04 | `riichi: 'double-riichi', ippatsu: true` | ロン | double-riichi 2, ippatsu 1, pinfu 1(chankan なし) | 4/30 | 1920 |
| C05 | `riichi: 'riichi'` | ロン | riichi 1, pinfu 1, chankan 1(回帰確認) | 3/30 | 960 |

- 出典: 役の成否は §3 改訂案の §4.1.1(確定事項1・2)と役の定義、飜数は既存実装・mahjong-rules.md §4.2(オープンダブル立直3飜)、符・基本点は手計算。C04 は A7-C01 と同型(ダブル立直版)
- 役の順序は `hora.ts` の push 順(立直→一発→平和→…→槍槓)。製造時に順序だけが食い違った場合は、要素集合が一致することを確認したうえで報告すること(期待値を勝手に変えない)
- 実挙動未確認: C01・C02・C05 の役順序は実行して確かめていない(コード読みによる)

## 6. 受け入れ条件

- [ ] 1. `git diff main --stat -- src` で変更が `src/core/hora.ts` と `src/core/double-riichi-chankan.test.ts` の2ファイルのみ。`src` 以外の差分は `docs/design/issue-26-double-riichi-chankan.md` と `docs/mahjong-rules.md` のみ
- [ ] 2. `git diff main -- src/core/hora.ts` の差分が、槍槓の条件(`options.chankan &&` の直後)の `!isDoubleRiichi &&` → `(isDoubleRiichi ? !options.ippatsu : true) &&` の1行置換のみ
- [ ] 3. `npx vitest run src/core/double-riichi-chankan.test.ts` で A8-C01〜C05 の5件が通過し、各期待値が §5 の表と一致する(役は `toEqual`、基本点は `computeBasePoint`、C03 は `res.info.hora.some(h => h.by === 'tsumo')` が偽)
- [ ] 4. 変異確認: `hora.ts` の置換を元の `!isDoubleRiichi &&` に戻すと C01・C02・C03 が失敗する(C03 はツモの Hora が生成されるため)。`true &&` に置き換えると C04 が失敗する。確認後 `git checkout src/core/hora.ts` で戻す
- [ ] 5. `npm test` が全件通過する(既存の golden・local-yaku・north・result・payment を含む)
- [ ] 6. `npm run lint`・`npm run typecheck`・`npm run format:check` がエラーなし
- [ ] 7. テストファイル内の各テストに期待値の出典コメントがある(目視)
- [ ] 8. PR #27(A7)はマージ済み(c26414a)。main を取り込んだ本ブランチで `npx vitest run src/core/local-yaku.test.ts -t "A7-"` が通過する(A7-C01 の維持確認)

## 7. 後続Issueへの引き継ぎ

- `docs/mahjong-rules.md` §4.1.1・§6 の追記は統括担当がコミットする(製造・検収の前提)
- 準拠先の実機で確認できた場合、§4.1.1 の根拠の文言を差し替える
- テスト補助の重複(local-yaku.test.ts と本テスト)は、PR #27 マージ後に共通化を検討してよい(本Issueの範囲外)
