# Issue #62 設計書: 赤ドラ設定を変えたら入力をリセットする

- 対象: [Issue #62](https://github.com/BlueKurage119/mj-3player-calc/issues/62)「赤ドラ設定を下げても入力済みの赤5が数えられる」。ブランチ `fix/issue-62-red-reset`
- 種別: 不具合修正(reducer の `set-rule` 分岐の変更、既存テスト1件の改訂、issue-50 設計書への事後注記)

## 1. 参照資料と判断の根拠

| 資料 | 導いた判断 |
| --- | --- |
| 統括担当から渡されたユーザー確定事項(本書 §2) | 仕様の全体。再検討しない |
| [issue-50-settings-screen.md](issue-50-settings-screen.md) §6・§9.2・§10 | 現状の事実: `set-rule` は赤五を書き換えず、`src/core/hora.ts` は `rule.red` を参照せず入力牌の `red` フラグを数える。`red=0` でも赤5pが赤ドラ1飜になる(§9.2 の実測) |
| 参照リポジトリ mahjong-calc(`ref-repo/mahjong-calc` の `src/lib/store/index.ts`、`set-current-rule`) | 赤牌枚数(`red.m`・`red.p`・`red.s` のいずれか)が前と違うときだけ `clear-input` を通してからルールを差し替える。本リポジトリの `Rule.red` は単一値(0/1/2。p・s に適用、m・z は常に0)なので、判定は「`red` が前の値と違うとき」になる |
| `src/ui/state/app-state.ts`(`set-rule`・`clear-all`・`createInitialInput`・`createInitialState`) | 変更箇所は `set-rule` 分岐1か所(§3) |
| `src/ui/settings/use-rule-settings.ts` | 個別項目(`setRuleValue`)もプリセット(`setRule`)も `dispatch({ type: 'set-rule', rule })` を通る。両方とも本修正の対象になる |
| `src/ui/state/hand-rules.test.ts` D4-C24f | 副露ありの state に `set-rule(red:2)` を当てて判定する既存テスト。本修正で失敗する(§7.1、実測) |
| [issue-20-test-naming.md](issue-20-test-naming.md) §3.1 | 新規テスト名の規約 |
| [07-mahjong-rule-protocol.md](../rules/07-mahjong-rule-protocol.md) | 点数・ルール解釈の新規導入はない(入力の扱いだけを変える) |
| [09-bundle-budget-protocol.md](../rules/09-bundle-budget-protocol.md) | 初回 JS の増分を記録する(§8) |

## 2. 確定事項との対応

| # | 確定事項(ユーザー) | 本書 |
| --- | --- | --- |
| 1 | `Rule.red` が前の値と違うときだけ入力をリセットする。同じなら保つ | §3 |
| 2 | リセット対象は手牌・副露・ドラ表示牌・裏ドラ表示牌。抜き北(`nuki`)・状況役(`handOptions`)・卓(`table`)は保持 | §3 |
| 3 | 確認ダイアログは出さない(UI 追加なし) | §4 |
| 4 | core(`src/core/hora.ts`)は変えない。計算側が `rule.red` を参照しない件は、UI のリセットで実害が防がれるため #62 に記録して閉じる | §9 |
| 5 | issue-50(D6)の「ルール変更で入力を書き換えない」判断を置き換える。issue-50 設計書へ事後注記を追記する(製造範囲) | §6 |

## 3. 変更内容(`src/ui/state/app-state.ts` の `set-rule` 分岐)

型・アクション・公開関数のシグネチャは変えない(`AppAction` の `{ type: 'set-rule'; rule: Rule }` のまま)。

処理順(既存の正規化の後にリセットを重ねる):

1. 既存どおり `nextNuki`(北が役牌なら0)と `nextHandOptions`(`normalizeHandOptions`)を求める
2. `redChanged = action.rule.red !== state.rule.red`
3. `redChanged` が偽: 既存の戻り値のまま(`input` は `nuki` が変わらなければ同一参照。`inputFocus`・`tenkeyBuffer` は保持)
4. `redChanged` が真: `input` を `{ ...createInitialInput(), nuki: nextNuki }` にし、`inputFocus: null`・`tenkeyBuffer: ''` にする。`handOptions` は手順1の正規化結果、`table`・`sheetMode`・`screen` は保持

実装の目安(実測で使った形。§7 の一時検証で全期待値を確認済み):

```ts
const redChanged = nextRule.red !== state.rule.red;
return {
  ...state,
  rule: nextRule,
  input: redChanged ? { ...createInitialInput(), nuki: nextInput.nuki } : nextInput,
  handOptions: nextHandOptions,
  ...(redChanged ? { inputFocus: null, tenkeyBuffer: '' } : {})
};
```

### 3.1 設計者が決めた細部【設計案】

- **`tenkeyBuffer` は `''`、`inputFocus` は `null`(シートを閉じる)、`sheetMode` は保持**(第一案)。理由: 設定画面表示中は main が非表示でシートは実質閉じているが、`inputFocus` は state に残る。戻ったときに消えた牌(例: 空になった副露の `{ type: 'meld', i: 2 }`)を指すフォーカスや、旧ルールで打鍵途中のテンキー入力が残らないようにする。`sheetMode`(パレット/テンキーの好み)は入力内容ではなく利用者の操作設定なので保つ(`clear-all` も保持している)。
  - 対案A: `inputFocus` を保持し `tenkeyBuffer` だけ消す。戻った直後に同じシートが開いたままになり再入力が速いが、`meld` フォーカスの添字が存在しない副露を指し得るため、`open-sheet`/`close-sheet` の空副露掃除(`currentMelds[i]`)の前提を崩す。採らない。
  - 対案B: `inputFocus` が `hand`・`dora`・`uradora` のときだけ保持。分岐が増える割に利点が小さい。採らない。
- **`close-sheet` の整列処理は通らない**: `close-sheet` は手牌フォーカス時に整列するが、リセット後は手牌が空なので不要。`inputFocus` を直接 `null` にする。
- **既存 clear 系との関係**: `clear-all` は `input`(抜き北を含む)と `handOptions` を初期化するため、そのままは使えない(確定事項2に反する)。`clear-hand` は手牌だけ。よって reducer の再帰呼び出しはせず、`createInitialInput()` を再利用して `nuki` だけ上書きする。
- **正規化との整合**: `nuki` は「抜き北の正規化後の値」(`nextNuki`)を残す。red と north が同時に変わる場合(プリセット等)は、手牌類は空、`nuki` は北が役牌なら0になる。`handOptions` は red の変化に関係なく従来どおり正規化する。
- **同じ値の再設定**: `red` が同じなら入力・`inputFocus`・`tenkeyBuffer` を保つ(プリセット「段位戦ルールに戻す」で red が同じ場合を含む)。

### 3.2 呼び出し経路の確認(実コード)

- 個別項目: `useRuleSettings().setRuleValue(key, value)` → `{ ...rule, [key]: value }` を `set-rule` で dispatch
- プリセット: `useRuleSettings().setRule(next)` → `set-rule` で dispatch
- 起動時: `loadRule` の結果は `createInitialState(rule)` の引数になる。`set-rule` を通らず、入力は初期値(空)なのでリセットの対象外。

## 4. UI

UI の追加・変更はない。確認ダイアログ・注記・文言は出さない。設定画面から戻ると、red が変わっていれば手牌・副露・ドラ表示牌・裏ドラ表示牌が空になっている。

## 5. モジュール構成

| ファイル | 変更 |
| --- | --- |
| `src/ui/state/app-state.ts` | `set-rule` 分岐(§3) |
| `src/ui/state/app-state.test.ts` | 新規テスト(§7.2) |
| `src/ui/state/hand-rules.test.ts` | D4-C24f の改訂(§7.1) |
| `docs/design/issue-50-settings-screen.md` | 事後注記の追記(§6) |

## 6. issue-50 設計書への事後注記(製造範囲)

書式は他設計書の例(`> 【事後注記】…`、例: [issue-51-screen-skeleton.md](issue-51-screen-skeleton.md))にならう。追記先と文案:

- §6「ルール変更の副作用」の赤五の段落の直後、§9.2 の末尾、§10 の「赤五と赤ドラ設定の食い違い」項目の直後、§8 受け入れ条件の表全体の直下(最終行 A37 の後、`## 9. 実測` の見出しの前。表の途中には挟まない)の4か所:

> 【事後注記】Issue #62([issue-62-red-reset.md](issue-62-red-reset.md))で、赤ドラ設定(`Rule.red`)が前の値と変わったときは手牌・副露・ドラ表示牌・裏ドラ表示牌をリセットするよう改めた(抜き北・状況役・卓は保持)。「赤五は書き換えない」判断と A33 の期待値は置き換わる。`hora.ts` が `rule.red` を参照しない点は変更していない(UI のリセットで実害が防がれるため、#62 に記録して閉じた)。

本文の既存記述は書き換えない(注記のみ追加)。

## 7. テスト

### 7.1 既存テストへの影響(実測)

一時的に §3 の変更を当てて `npx vitest run` を実行した結果(実行後に復旧済み): **失敗は `hand-rules.test.ts` の D4-C24f の1件のみ**(1071件通過)。

- D4-C24f は `mk(1, [{ type: 'pon', tile: p5 }])` に `set-rule(red:2)` を当てた後、副露 0 番の赤牌切替を判定している。red 1→2 で副露が空になるため失敗する。
- 改訂方針【設計案】: テスト名と意図(「set-rule の dispatch で red=2 の状態を作って判定できる」)を保ち、手順を「空の state に `set-rule(red:2)` → `input.melds` に `{ type: 'pon', tile: p5 }` を入れる → 判定」に並べ替える。期待値(`s.rule.red === 2`、`redCount(s) === 1`、`meldRedToggle(s, 0).disabled === false`)は変えない。副露の投入は既存の `mk` と同じく state を直接組む。
- D1-9・D5-C8 の `set-rule` は red を変えない(`north`・`openRiichi` 等のみ)ため影響なし(実測で通過)。

### 7.2 新規テスト(`app-state.test.ts`、名前案)

Issue 記号は `F62`(Epic 外の不具合 Issue のため Issue 番号を記号にする【設計案】。issue-20 §3.1 は「Issue によらないテスト」の命名を未確定としており、Issue 番号付きの記号は既存規約の形 `<記号>-<番号>: <説明>` に沿う)。

共通の state: `red` 指定の既定ルール、手牌 `123[赤5]67p 1239s`(10枚)、副露 `[{ type: 'pon', tile: 赤5s }]`(赤5s を含むポン)、ドラ表示牌 `[4s]`、裏ドラ表示牌 `[9p]`、`nuki: 1`、`handOptions.riichi: 'riichi'`、`table: { round: 'south', seat: 'west', continue: 2, deposit: 1 }`、`inputFocus: { type: 'hand' }`、`tenkeyBuffer: '5'`。

- 牌姿の実在性: red=1 では 5p・5s の赤はそれぞれ1枚まで(`isAvailableTiles`・`redCountOf`)のため、手牌の赤5p と副露の赤5p は同時に入力できない。上の牌姿(赤5p は手牌、赤は副露の 5s)は、red=1 の state で `canAddHandTile`(10枚を順に)・`canSetMeld`(副露0番に赤5s ポン)・`canAddIndicatorTile`(ドラ 4s・裏ドラ 9p)がすべて true、副露を赤5p ポンにした場合の `canSetMeld` は false になることを一時テストで確認した(実行後に削除済み)。red=2 でも同じ牌姿は入力できる。
- 変更前の red が 0 のケース(F62-1 の 0→1)では赤牌を入力できないため、手牌の赤5p を普通の 5p、副露を普通の 5s のポンに置き換えた state を使う(リセット判定は牌の赤フラグに依存しないので期待値は同じ)。

| 名前 | 内容 |
| --- | --- |
| `F62-1: red が変わると手牌・副露・ドラ・裏ドラを空にし、抜き北・状況役・卓・sheetMode を保つ` | red 1→0、1→2、0→1、2→1 の4通り(`it.each` 可)。`input` が `{ hand: [], melds: [], dora: [], uradora: [], nuki: 1 }`、`handOptions.riichi === 'riichi'`、`table` 不変、`inputFocus === null`、`tenkeyBuffer === ''`、`sheetMode === 'palette'` |
| `F62-2: red が同じ set-rule では入力・フォーカス・テンキー入力を保つ` | red 1→1。`input` が同一参照、`inputFocus` が `{ type: 'hand' }`、`tenkeyBuffer === '5'` |
| `F62-3: red と北の扱いが同時に変わると手牌類は空になり抜き北は 0 になる` | `{ red: 0, north: 'yakuhai' }`。`input.hand` 空、`input.nuki === 0` |
| `F62-4: red を変えない北の扱いの変更では手牌・副露を保つ` | `{ north: 'yakuhai' }`(red=1 のまま)。`hand` 10枚・`melds` 1件のまま、`nuki === 0` |

F62-1〜4 は一時テストで全て通過を確認済み(§3 の目安コードで)。

## 8. 受け入れ条件

| # | 種別 | 手順 | 合格条件 |
| --- | --- | --- | --- |
| R1 | テスト | `npx vitest run src/ui/state/app-state.test.ts -t F62` | F62-1〜4 が全て通過 |
| R2 | テスト | `npx vitest run src/ui/state/hand-rules.test.ts -t D4-C24f` | 通過。期待値3つ(§7.1)が改訂前と同じ |
| R3 | 検査 | `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` | 全てエラーなし |
| R4 | コード | `git diff main -- src/core` | 差分なし(core 不変) |
| R5 | コード | `git diff main -- src/ui/state/app-state.ts` | 変更は `set-rule` 分岐内のみ。`AppAction`・`AppState` の型は不変 |
| R6 | 画面(dev と `npm run build` 後の `vite preview` の両方) | localStorage を空にしてリロード(red=1「2枚」)。パレットで手牌に 赤5p を含む牌を数枚、副露(ポン)に赤5s(手牌の赤5p は残す。red=1 では 5p の赤は1枚までのため副露を赤5p にはできない)、ドラ表示牌・裏ドラ表示牌を各1枚、抜き北を1、立直をオン、卓の場風を南・積み棒を1にする。メニュー「設定」→赤ドラ「赤なし」→戻る | 手牌・副露・ドラ表示牌・裏ドラ表示牌が空。抜き北1・立直オン・南場・積み棒1は残る。入力シートは閉じている。ダイアログ・注記は出ない |
| R7 | 画面(同上) | R6 の後(赤なし)、手牌・副露・ドラ表示牌・裏ドラ表示牌に赤でない牌を入力して「赤なし」→「4枚」。さらに同様に赤でない牌を入力して「4枚」→「2枚」 | どちらも R6 と同じ(手牌類が空、他は保持) |
| R8 | 画面(同上) | 手牌などを入力 → 設定で北の扱い・喰い断など red 以外を変える → 戻る | 手牌・副露・ドラ表示牌・裏ドラ表示牌がそのまま(北の扱いを共通役牌にした場合は抜き北だけ0) |
| R9 | 画面(同上) | 赤ドラ「赤なし」(カスタム)で入力 → 「段位戦ルールに戻す」→ 戻る | red が 0→1 に変わるため手牌類が空 |
| R10 | 画面(同上) | 段位戦ルールのまま喰い断だけ変えて入力 → 「段位戦ルールに戻す」→ 戻る | red は変わらないため手牌類は保持 |
| R11 | 画面(同上) | テンキーモードでシートを開き数字を1つ打鍵した状態で、メニュー「設定」→赤ドラ変更→戻る | シートは閉じており、手牌タップで開き直すとテンキーモードのまま、打鍵途中の数字は残っていない |
| R12 | 文書 | `docs/design/issue-50-settings-screen.md` の差分 | §6 で定めた4か所(§6 赤五の段落の直後、§9.2 の末尾、§10 の該当項目の直後、§8 の表全体の直下=A37 の後・`## 9. 実測` の前)に事後注記があり、既存本文の削除・書き換えがない |
| R13 | バンドル | `npm run build` の初回 JS(gzip -9)を基準 main と比較 | 基準値・目標値(§8 下の注)と実測値・増分を PR に記録(09号により不合格にはしない) |

注(R13・09号): 基準値は E1(Issue #76)マージ後の main の初回 JS 実測値 **124,831 B**(issue-50 A32 の定義、gzip -9。issue-76 の設計書は main に未収録のためこの値による)。目標値は基準値+数十 B 程度(本修正は reducer の分岐追加のみ)とし、目安 **124,900 B 以下**。E2 が先にマージされた場合は、そのマージ後の main で基準値を測り直す。

## 9. 後続への引き継ぎ・未決事項

- `src/core/hora.ts` は `rule.red` を参照せず、入力牌の `red` フラグを数える(issue-50 §9.2)。UI のリセットで「red を下げたのに赤五が残る」状態は通常操作では作れなくなるため、#62 に記録して閉じる(確定事項4)。将来、URL 共有や入力の外部読み込みなど `set-rule` を通らずに赤五入り入力と red=0 が組み合わさる経路を作る場合は、その Issue で core 側の扱いを再検討する。
- 首席への申し送り(設計者が決めた細部。§3.1・§7):
  1. リセット時 `inputFocus: null`・`tenkeyBuffer: ''`・`sheetMode` 保持(対案A・B は不採用)
  2. `clear-all` は再利用せず `createInitialInput()` に `nuki` を上書き
  3. D4-C24f は名前と期待値を保ち、手順の順序だけ改訂
  4. 新規テストの Issue 記号を `F62` とする
- 要ヒアリング事項: なし(上記4点はいずれも設計者裁量の範囲として【設計案】で記載)

## 10. 実挙動未確認

- R6〜R11 の画面操作(dev・本番ビルド)は設計時点で未実施。reducer の挙動は一時テストで確認済み。
- バンドル増分(R13)は未計測。
