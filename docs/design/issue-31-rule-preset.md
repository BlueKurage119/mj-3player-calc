# Issue #31 設計書: B3. ルールプリセット

- 対象Issue: #31(Epic B #3 の Sub-Issue)
- 製造ブランチ: `feature/issue-31-rule-preset`(作成済み)
- 変更対象(全ファイル):
  - 新規: `src/core/rule-preset.ts`(プリセット定義と一致判定)・`src/core/rule-preset.test.ts`(B3-P)
  - 変更済み(統括担当、コミット 85280a5): `docs/design/issue-13-sanma-payment.md`(§7 の B3 申し送りの訂正。ユーザー指示)
  - 変更しない: `src/core/rule.ts`・`src/core/rule-items.ts` ほか既存の全ファイル・`src/ui/**`・`wasm/**`・`docs/**`(本設計書と上記 issue-13 設計書を除く)

## 1. 目的

1. プリセット「段位戦ルール」を定数で持つ
2. 現在のルールがどのプリセットに一致するか(一致しなければ `'custom'`)を判定する関数を計算コアに置く

含まない: 利用者が作ったプリセットの名前付き保存(後続の Epic)、保存・補完(B2 #30)、UI。

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項(統括担当経由・ヒアリング済み)

1. プリセットは「段位戦ルール」の1つだけ([mahjong-rules.md](../mahjong-rules.md) 冒頭、Issue #29 で確定)。Issue #31 本文の「雀魂段位戦」「一番街段位戦」の2プリセットの記述は無効(Issue #31 にコメント済み)。利用者プリセットの名前付き保存は範囲外
2. 新規ファイル `src/core/rule-preset.ts` に配列 `RULE_PRESETS` と判定関数 `findRulePreset` を置く
3. 段位戦ルールの値は `DEFAULT_RULE` を参照する(二重定義しない)。根拠: mahjong-rules.md 冒頭「段位戦ルールの値は、この文書の所定値(太字)とする」、`DEFAULT_RULE` は所定値から組み立てられている(Issue #29 設計書 §7 の B3 申し送り)
4. 一致判定は `Rule` の全17項目(本場・供託の点数を含む)を既存の `compareRules` で比較する
5. 並行中の B2(#30)と衝突しないよう、既存ファイルは変更しない
6. [issue-13 設計書](issue-13-sanma-payment.md)の B3 申し送りは訂正済み(コミット `85280a5`)

### 2.2 既存コードの実物確認

- `src/core/rule.ts`: `DEFAULT_RULE: Readonly<Rule>` は `Object.freeze` 済み。`compareRules(a: Rule, b: Rule): boolean` は17項目すべてを `===` で比較している(`red`・`honbaPoint`・`depositPoint`・`ippatsu`・`kuitan`・`roundedMangan`・`doubleWindFu`・`accumlatedYakuman`・`multipleYakuman`・`kokushi13DoubleYakuman`・`suankoTankiDoubleYakuman`・`daisushiDoubleYakuman`・`pureChurenDoubleYakuman`・`north`・`tsumoLoss`・`localYaku`・`openRiichi`)。`Rule` の項目数も17で一致
- `compareRules` の引数は `Rule` 型。`Readonly<Rule>` は全項目がプリミティブのため、そのまま渡せる(TypeScript の readonly 修飾子は代入互換性を妨げない)

## 3. 方針

- 新しいルールの解釈・点数は導入しない(業務標準07: プリセット値は仕様の所定値=`DEFAULT_RULE` そのもの)
- 配列で持つのは、後続で利用者プリセットや追加プリセットを並べられる形にするため。ただし現時点の要素は1つ

## 4. 詳細設計(`src/core/rule-preset.ts`)

```ts
import { compareRules, DEFAULT_RULE, type Rule } from './rule';

export type RulePresetId = 'ranked';

export interface RulePreset {
  id: RulePresetId;
  /** UI 表示名 */
  name: string;
  rule: Readonly<Rule>;
}

export const RULE_PRESETS: readonly Readonly<RulePreset>[];
// 要素は [{ id: 'ranked', name: '段位戦ルール', rule: DEFAULT_RULE }] の1つ。
// 配列と各要素は Object.freeze する。rule は DEFAULT_RULE への参照そのもの(複製しない)

export const findRulePreset: (rule: Readonly<Rule>) => RulePresetId | 'custom';
// RULE_PRESETS を先頭から走査し、compareRules(rule, preset.rule) が真の最初の id を返す。無ければ 'custom'
```

- 先頭から最初の一致を返す(現時点で重複は起こり得ないが、走査順を仕様として固定する)
- 引数の検査はしない。`validateRule` を通っていない値でも、一致しなければ `'custom'` を返すだけで例外は投げない
- コメントに mahjong-rules.md 冒頭が出典であることを書く(相対パス)

## 5. テスト(`src/core/rule-preset.test.ts`)

`describe('B3: ルールプリセット (B3-P01〜B3-P06)')` 配下に置く。

| ID | 内容 | 期待値 |
| --- | --- | --- |
| B3-P01 | `RULE_PRESETS` の構成 | 長さ 1。`id === 'ranked'`、`name === '段位戦ルール'` |
| B3-P02 | 段位戦ルールが `DEFAULT_RULE` を参照 | `RULE_PRESETS[0].rule` が `DEFAULT_RULE` と `toBe`(同一参照) |
| B3-P03 | 既定ルールの判定 | `findRulePreset(createDefaultRule())` が `'ranked'` |
| B3-P04 | 1項目だけ変えると custom | `Rule` の17項目それぞれについて(`test.each` のケース名に項目名を含める。例: `'B3-P04: %s'`)、既定から1項目だけ別の有効値に変えたルールが `'custom'`(`test.each`。`honbaPoint`・`depositPoint` も含む。真偽は反転、選択肢は既定以外の1つ、数値は既定+刻み幅) |
| B3-P05 | 不変性 | `Object.isFrozen(RULE_PRESETS)` と `Object.isFrozen(RULE_PRESETS[0])` が真 |
| B3-P06 | 引数を変更しない | 判定前に `{ ...rule }` で複製を取り、判定後の引数が複製と `toEqual`。あわせて `Object.freeze` した引数で例外が出ないこと |

B3-P04 の17項目は `Object.keys(DEFAULT_RULE)` の長さが 17 であることも併せて検査し、項目が増えたときにテストが追従漏れを検出できるようにする。

## 6. 受け入れ条件(検収担当が1項目ずつ実行)

1. `git fetch origin` の後、`git diff --name-only origin/main...HEAD` の結果が `src/core/rule-preset.ts`・`src/core/rule-preset.test.ts`・`docs/design/issue-31-rule-preset.md`・`docs/design/issue-13-sanma-payment.md` のみであること
2. `src/core/rule-preset.ts` に `RULE_PRESETS`・`findRulePreset`・`RulePresetId`・`RulePreset` が export され、§4 のシグネチャと一致すること(`grep -cE "^export (type|interface|const|function) (RulePresetId|RulePreset|RULE_PRESETS|findRulePreset)\b" src/core/rule-preset.ts` が 4。シグネチャの一致は目視)
3. `src/core/rule-preset.ts` が `DEFAULT_RULE` を参照し、代表的な項目値のリテラルを含まないこと(`grep -nE "rule:\s*DEFAULT_RULE" src/core/rule-preset.ts` が1件、`grep -nE "nukidora|loss|1000|200" src/core/rule-preset.ts` が該当なし。コメントにもこれらの語を書かない)
4. `npx vitest run src/core/rule-preset.test.ts` で B3-P01〜P06 がすべて合格し、`npx vitest run src/core/rule-preset.test.ts --reporter=verbose` の出力で B3-P04 の行が17件(項目名入り)あること
5. ミューテーション確認: `findRulePreset` の比較を常に真(例: `compareRules(...) || true`)に一時変更して B3-P04 が不合格になること、`RULE_PRESETS[0].rule` を `{ ...DEFAULT_RULE }` に一時変更して B3-P02 が不合格になることを確かめ、元に戻して `git status` がクリーンであること
6. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて成功すること

## 7. 後続Issueへの引き継ぎ

- **B2(#30 保存と版管理)**: 保存・復元後のルールに `findRulePreset` を呼べば、プリセット名かカスタムかを表示できる。B2 側で `rule.ts` を変更しても、`compareRules` が全項目比較である限り本Issueは追従不要。`Rule` に項目を足す場合は `compareRules` への追加が必須(B3-P04 の項目数検査が検出する)。その場合の B3-P04(項目数17・ケース追加)の更新も B2 の範囲とする。版情報は `Rule` の外に持つことを推奨する
- **UI の Epic**: 設定画面でプリセット選択は `RULE_PRESETS` を並べ、適用は `{ ...preset.rule }` の複製で行う(`DEFAULT_RULE` は凍結済み)。一致表示は `findRulePreset`。`'custom'` の表示名は UI 側で決める
- **利用者プリセット(後続の Epic)**: `RulePresetId` を `string` に広げるか、別配列にするかはその Epic で決める

## 8. 要確認事項

なし。

## 9. 実挙動未確認

- 本設計書の作成時点ではコードを実行していない。`Readonly<Rule>` を `compareRules(a: Rule, b: Rule)` に渡せることは TypeScript の仕様(readonly はプロパティ代入互換性に影響しない)から判断した。型検査は受け入れ条件6で確認する
