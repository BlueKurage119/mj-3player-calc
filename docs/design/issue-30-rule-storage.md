# Issue #30 設計書: B2. ルールの保存と版管理

- 対象Issue: #30(Epic B #3 の Sub-Issue)。依存: B1(#29、マージ済み `7445d8b`)
- 製造ブランチ: `feature/issue-30-rule-storage`
- 変更対象(全ファイル):
  - 新規: `src/core/rule-storage.ts`(シリアライズ・復元・読み書き)・`src/core/rule-storage.test.ts`(B2-S)
  - 変更しない: `src/core/rule.ts`・`src/core/rule-items.ts`・その他 `src/core/**` の既存ファイル・`src/ui/**`・`wasm/**`・`docs/**`(本設計書を除く)
  - `rule.ts` を変えない理由: 並行中の B3(#31)が `src/core` にプリセット定数を追加するため、衝突を避ける。`rule.ts` の非公開定数 `RULE_KEYS` は使わず、`Object.keys(DEFAULT_RULE)` で項目を列挙する

## 1. 目的

ルールを版番号付きで端末に保存・読み込みする計算コア側の関数を用意する。読み込み時に欠落・不正な項目を所定値で補完し、版が読めないときは既定ルールに戻す。

含まない: UI からの呼び出し・保存の契機(UI の Epic)、プリセット(B3)、計算への接続(B4)、旧形式からの移行。

## 2. 参照資料と設計判断の根拠

### 2.1 確定事項(統括担当経由・ヒアリング済み、2026-11-01)

| # | 確定事項 | 本書 |
| --- | --- | --- |
| 1 | 補完は項目ごと。欠落・不正な項目だけ `DEFAULT_RULE` の値に置き換え、正しい項目は保持(`validateRule` の `key` を利用) | §4.3 |
| 2 | 版番号が欠落・非数値・現行より新しい場合はルール全体を既定に戻す。現行版なら1の方式で補完。旧形式からの移行処理は書かない | §4.3 |
| 3 | `src/core/` に localStorage を直接触らない純関数(シリアライズ・復元)を置き、読み書き関数は保存先(`getItem`/`setItem` 程度)を引数で受け取る | §4.1・§4.4 |
| 4 | 読み込みは `{ rule, issues, reset }` 相当で、補完した項目と全体リセットの有無を返す | §4.2 |
| 5 | 保存先が使えない・JSON 破損でも例外を投げず既定ルールを返す(reset)。書き込み失敗は真偽値で返す | §4.4 |
| 6 | 保存は呼び出し側が明示的に行う(自動保存なし)。保存データが無いときは既定ルールを返すが書き込まない | §4.4 |

保存キー名・データ形式・関数名は設計担当が決めてよい(統括担当の指示)。

### 2.2 既存コード(B1 の成果物、`src/core/rule.ts`)

- `validateRule(rule: unknown): RuleIssue[]`: `RuleIssue = { key: keyof Rule; message: string }`。1項目につき高々1件。オブジェクト以外には全17キーの issue を返す。トップレベルの余分なキーは検査しない(既存の読み。§4.3 で復元側が捨てる)
- `DEFAULT_RULE`(凍結)・`createDefaultRule()`(毎回新しいオブジェクト)・`compareRules(a, b)`(全17項目)・`isValidRule`
- 申し送り: issue-12(`north`)・issue-13(`tsumoLoss`)・issue-14(`localYaku`・`openRiichi`)・issue-29 §7 は、いずれも「欠落項目を所定値で補完する」ことを B2 に求めている。確定事項1でこれを満たす。issue-14 の「未補完の `undefined` では `compareRules` が既定と別物と判定する」問題は B2-S03 で検証する

## 3. 方針

- 純関数(`serializeRule`・`restoreRule`)と、保存先を受け取る薄い入出力関数(`loadRule`・`saveRule`)に分ける。テストは純関数を中心に、入出力関数は偽の保存先で行う
- 復元結果は常に `validateRule` を通る新しいオブジェクト(`DEFAULT_RULE` 自体を返さない)

## 4. 詳細設計(`src/core/rule-storage.ts`)

### 4.1 定数と保存形式

```ts
/** 保存キー */
export const RULE_STORAGE_KEY = 'mj3calc.rule';
/** 現行の保存形式の版。保存形式(Rule の項目構成)を非互換に変えたら上げる */
export const RULE_STORAGE_VERSION = 1;

/** 保存されるJSONの形 */
export interface StoredRule {
  version: number;
  rule: Rule;
}

/** 保存先。window.localStorage はこの型を満たす */
export type RuleStorage = Pick<Storage, 'getItem' | 'setItem'>;
```

保存値の例: `{"version":1,"rule":{"red":1,"honbaPoint":200,...}}`

### 4.2 復元結果の型

```ts
export type RuleResetReason =
  | 'unavailable' // 保存先が無い・getItem が例外
  | 'parse'       // JSON として読めない
  | 'format'      // JSON だがオブジェクトでない、または rule がオブジェクトでない
  | 'version';    // version が欠落、または RULE_STORAGE_VERSION と === で一致しない

export interface LoadedRule {
  rule: Rule;
  /** 補完した項目(validateRule の結果そのまま)。reset 時と保存データ無しのときは空 */
  issues: RuleIssue[];
  /** ルール全体を既定に戻したか */
  reset: boolean;
  /** reset の理由。reset が false なら null */
  resetReason: RuleResetReason | null;
  /** 保存データが存在したか(getItem が null 以外を返した) */
  found: boolean;
}
```

### 4.3 純関数

```ts
export const serializeRule = (rule: Rule): string;
export const restoreRule = (raw: string | null): LoadedRule;
```

`serializeRule`: `JSON.stringify({ version: RULE_STORAGE_VERSION, rule: pickRule(rule) })`。`pickRule` は `Object.keys(DEFAULT_RULE)` の項目だけを写す内部関数(余分なキーを保存しない)。引数の検査はしない(呼び出し側が `validateRule` 済みの前提。§7)。

`restoreRule` の手順(上から順に判定し、最初に当たったもので返す):

1. `raw === null` → `{ rule: createDefaultRule(), issues: [], reset: false, resetReason: null, found: false }`
2. `JSON.parse` が例外 → reset(`'parse'`)
3. 結果が `null`・配列・オブジェクト以外 → reset(`'format'`)
4. `version` が `RULE_STORAGE_VERSION` と `===` で一致しない(欠落・文字列 `"1"`・`2`・`0`・`1.5` を含む) → reset(`'version'`)
5. `rule` が `null`・配列・オブジェクト以外 → reset(`'format'`)
6. `issues = validateRule(stored.rule)`。結果のルールは `Object.keys(DEFAULT_RULE)` の各キーについて、そのキーが `issues` に含まれれば `DEFAULT_RULE[key]`、含まれなければ `stored.rule[key]` を写した新しいオブジェクト(余分なキーは捨てる) → `{ rule, issues, reset: false, resetReason: null, found: true }`

reset の形: `{ rule: createDefaultRule(), issues: [], reset: true, resetReason, found: true }`。

- 手順4のうち、確定事項2が定めるのは「欠落・非数値・現行より新しい」場合の全体リセットだけである。古い版(`0` 等)と非整数(`1.5`)も reset にするのは**設計担当の判断(ユーザー確認待ち。§8)**。将来版を上げるときは、移行処理を手順4の前に足す
- 手順6の実装指針: `const keys = Object.keys(DEFAULT_RULE) as (keyof Rule)[]` で列挙し、`const bad = new Set(issues.map(i => i.key))` を作る。結果は `Record<string, unknown>` に `bad.has(key) ? DEFAULT_RULE[key] : (stored.rule as Record<string, unknown>)[key]` を写して組み立てる。最後に `isValidRule(built)` で型を絞ってから `Rule` として返す(偽になるのは論理上ありえないが、その場合も例外にせず reset(`'format'`)を返す)。`as Rule` の直接キャストは使わない
- 手順6の後、結果は必ず `isValidRule` を満たす(B2-S04 で検証)

### 4.4 入出力関数

```ts
export const loadRule = (storage: RuleStorage | null | undefined): LoadedRule;
export const saveRule = (storage: RuleStorage | null | undefined, rule: Rule): boolean;
```

- `loadRule`: `storage` が `null`/`undefined`、または `storage.getItem(RULE_STORAGE_KEY)` が例外 → reset(`'unavailable'`)、`found: false`。それ以外は `restoreRule(raw)` を返す。**書き込みは一切しない**(確定事項6。補完・reset した結果も保存し直さない)
- `saveRule`: `storage` が無い、または `setItem` が例外(容量超過・プライベートモード等) → `false`。成功で `true`。例外を外へ出さない
- 両関数とも `window`・`localStorage` を参照しない。UI 側が `loadRule(globalThis.localStorage)` のように渡す(UI の Epic の範囲。この例は `rule-storage.ts` のコメントに書かないこと。受け入れ条件4の grep に掛かる)。localStorage へのアクセス自体が例外になる環境があるため、UI 側は取得を try で囲んで `null` を渡すこと(§7)

## 5. テスト(`src/core/rule-storage.test.ts`)

テスト名は `B2-S<番号>: <説明>`(業務標準05・issue-20 の命名規約)。偽の保存先は `Map` を包んだオブジェクトと、`getItem`/`setItem` が例外を投げるオブジェクトをテスト内で作る(jsdom の localStorage に依存しない)。

| 記号 | 内容 |
| --- | --- |
| B2-S01 | 往復: `DEFAULT_RULE` から全項目を所定値以外に変えたルール(例: red 2・honbaPoint 400・depositPoint 500・真偽値は反転・doubleWindFu 2・north の別値・tsumoLoss の別値)を `serializeRule` → `restoreRule` すると `compareRules` が true、`issues` 空、`reset` false、`found` true |
| B2-S02 | `serializeRule` の JSON を `JSON.parse` すると `version === 1` で、`rule` のキー集合が `Object.keys(DEFAULT_RULE)` と一致。余分なキーを足したルールを渡しても保存されない |
| B2-S03 | 項目ごとの補完: 保存値のベースは S01 と同じ全項目を所定値以外にしたルール。そこから `north`・`tsumoLoss`・`localYaku`・`openRiichi` を1つずつ欠落させた4通り → 各 `issues` が該当 key 1件、その項目が `DEFAULT_RULE` の値、他の項目は保存値のまま。4項目すべて欠落かつ他は所定値 → `compareRules(result.rule, DEFAULT_RULE)` が true |
| B2-S04 | 不正値の補完: S01 と同じ全項目を所定値以外にしたルールのうち `red: 3`・`honbaPoint: 100`・`kuitan: 1` に差し替えた保存値 → `issues` の key 集合が `{red, honbaPoint, kuitan}`、その3項目だけ所定値、他は保持、`isValidRule(result.rule)` が true、`reset` false |
| B2-S05 | 余分なキー: `rule` に `foo: 1` を足した保存値 → 結果に `foo` が無く、`issues` 空 |
| B2-S06 | 版: `version` 欠落・`"1"`・`2`・`0`・`1.5`・`null` の6通り → いずれも `reset` true、`resetReason` `'version'`、`compareRules(rule, DEFAULT_RULE)` true、`issues` 空 |
| B2-S07 | 破損: `'{'`・`''` → `'parse'`。`'null'`・`'42'`・`'[]'`・`'"x"'` → `'format'`。`{"version":1,"rule":null}`・`{"version":1}` → `'format'`。いずれも例外を投げず既定ルール |
| B2-S08 | `restoreRule(null)` → `found` false、`reset` false、`issues` 空、既定ルール |
| B2-S09 | 返すルールが毎回新しいオブジェクト: S06・S08 の結果が `DEFAULT_RULE` と `!==`、書き換えても `DEFAULT_RULE` が変わらない(凍結オブジェクトを返すと書き換えで例外になるのも防ぐ) |
| B2-S10 | `loadRule`: 保存データ無しの偽保存先 → 既定ルール、`found` false、`setItem` が呼ばれていない(呼び出し回数0)。補完が起きる保存値でも `setItem` は呼ばれない |
| B2-S11 | `loadRule`: `null`・`undefined`・`getItem` が例外の保存先 → 例外を投げず `reset` true、`resetReason` `'unavailable'`、既定ルール |
| B2-S12 | `saveRule`: 偽保存先で `true`、`RULE_STORAGE_KEY` に `serializeRule(rule)` と同じ文字列が入る。続けて `loadRule` すると `compareRules` true。`setItem` が例外の保存先・`null` → `false`(例外を投げない) |

## 6. 受け入れ条件(検収担当が1項目ずつ実行)

1. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラー0・失敗0
2. `npx vitest run src/core/rule-storage.test.ts --reporter=verbose` の一覧に `B2-S01:`〜`B2-S12:` の12件の名前が1回ずつあり、すべて合格。1件だけ確かめるときは `npx vitest run -t 'B2-S01:'` のように `:` まで含める
3. 変更範囲: `git diff --name-only main...HEAD` が `src/core/rule-storage.ts`・`src/core/rule-storage.test.ts`・`docs/design/issue-30-rule-storage.md` の3件だけ(`rule.ts` を変えていない)。別に `git status --porcelain` が空(B3 が先にマージされても B3 のファイルが削除として出ない比較にするため `...` を使う)
4. localStorage を直接触らない: `grep -nE "localStorage|window\.|sessionStorage" src/core/rule-storage.ts` が0件(コメント内も0件にする)
5. 例外を外へ出さない: `grep -n "throw" src/core/rule-storage.ts` が0件
6. `compareRules` との整合: `grep -nE "B2-S[0-9]+:|compareRules" src/core/rule-storage.test.ts` の出力で、`B2-S01:`・`B2-S03:`・`B2-S06:`・`B2-S12:` の各テスト名の行から次のテスト名の行までの間に `compareRules` の行が1行以上ある
7. 公開名: `grep -cE "^export (const|function|interface|type) (RULE_STORAGE_KEY|RULE_STORAGE_VERSION|StoredRule|RuleStorage|RuleResetReason|LoadedRule|serializeRule|restoreRule|loadRule|saveRule)\b" src/core/rule-storage.ts` が `10`。引数・戻り値の型が §4.1〜§4.4 と一致する(`npm run typecheck` 合格を前提に目視)
8. ミューテーション確認(1つずつ行い、確認後に戻して `git status` で差分が無いことを確かめる):
   - 手順6の補完を「issues が1件でもあれば既定ルール全体」に変える → B2-S03・S04 が失敗する
   - 手順4を `typeof version !== 'number'` だけの判定に変える → B2-S06 が失敗する
   - `loadRule` で復元後に `saveRule` を呼ぶよう足す → B2-S10 が失敗する
   - reset 時に `createDefaultRule()` ではなく `DEFAULT_RULE` を返す → B2-S09 が失敗する
   - `saveRule` の try を外す → B2-S12 が失敗する
   - 手順6で余分なキーを捨てずに `{ ...stored.rule, ... }` で組み立てる → B2-S05 が失敗する

## 7. 後続Issueへの引き継ぎ

- **UI の Epic**: 起動時に `loadRule` を1回呼ぶ。`globalThis.localStorage` の参照自体が例外になる環境(ストレージ無効化)に備え、取得を try で囲んで失敗時は `null` を渡す。`saveRule` は設定変更の確定時など明示的な操作で呼び、`validateRule` を通ったルールだけを渡す。`reset`・`issues` をユーザーに知らせるか、補完結果を保存し直すかは UI 側で決める(本関数は書き込まない)。`saveRule` が `false` のとき(保存できない)の案内も UI 側
- **B3(プリセット)**: プリセット適用後の保存も `saveRule` を使う。読み込んだルールがどのプリセットと一致するかは `compareRules(loaded.rule, preset)` で判定できる(B2-S01 で往復後も同値になることを保証)
- **Rule の項目を将来増減するとき**: 増やすだけなら版を上げずに済む(欠落は手順6で所定値補完)。項目の意味・型を変えるときは `RULE_STORAGE_VERSION` を上げ、`restoreRule` の手順4の前に移行処理を足す

## 8. 要確認事項

- **設計担当の判断(ユーザー確認待ち)**: 確定事項2が全体リセットを定めるのは版が「欠落・非数値・現行より新しい」場合だけである。本書は加えて、現行より古い版(`0`・負数)と非整数(`1.5`)も reset(`'version'`)とした。古い版のデータは保存実装が無かったため存在しない。非整数は正しい版番号になりえない。B2-S06 の `0`・`1.5` はこの判断に依存する

## 9. 実挙動未確認

- 実ブラウザの localStorage(容量超過・プライベートモード・ストレージ無効化時の例外)は実測していない。テストは偽の保存先で行う。実ブラウザでの確認は UI の Epic で行う
- `validateRule` がトップレベルの余分なキーを issue にしないことはコードの読みによる(B2-S05 で確認される)
