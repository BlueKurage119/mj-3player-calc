# Issue #106 H1-2. 点数計算表への点差表示・供託反映 設計書

- 親: Epic H(#100 参照・共有) / マイルストーン: v1.1
- ベースブランチ: `origin/main`（起点コミット `9d248b0`、Issue #105 マージ済み）
- 関連Issue: #101（H1. 点数計算表・実装済み）、#105（H1-1. 点数計算表への本場反映・実装済み）
- ブランチ: `feature/issue-106-scoring-table-diff`
- 版: 第2版（2026-11-21）
- 状態: 承認済み（2026-11-21 オーナー承認。D1 確定済み）
- 設計担当のモデル: Gemini 4 Neon (High)

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- Issue #106 本文（`gh issue view 106 --comments`）
- [docs/requirements.md](../requirements.md) §3.6（参照・共有）
- [issue-101-scoring-table.md](issue-101-scoring-table.md)（§4 後続への引き継ぎ: `Cell` への派生値追加方針）
- [issue-105-scoring-table-honba.md](issue-105-scoring-table-honba.md)（§2 設計、§4 後続 Issue への引き継ぎ、§12 UI 監修による変更）
- [docs/mahjong-rules.md](../mahjong-rules.md) §3.1（ツモ損 3 方式と満貫ツモ・端数処理の確定例）・§3.2（本場・供託の所定値と計算規則・例外条件）・§3.3（満貫以上）
- 既存実装:
  - `src/ui/scoring-table/scoring-table.ts`・`src/ui/scoring-table/scoring-table.test.ts`
  - `src/ui/screen/ScoringTableScreen.tsx`・`src/ui/screen/ScoringTableScreen.test.tsx`・`src/ui/screen/scoring-table.css`
  - `src/ui/expressive/ConnectedButtonGroup.tsx`・`src/ui/expressive/Stepper.tsx`
  - `src/ui/screen/MainScreen.tsx`・`src/ui/screen/SummaryCard.tsx`・`src/ui/settings/rule-help.ts`（供託ステッパーの `aria-label="供託"` とルール設定の呼称・説明）
  - `src/ui/result/hora-summary.ts`（`formatNumber`・`formatPoints`・`TSUMO_SEPARATOR`）
  - `src/ui/state/app-state.ts`（`STEPPER_BOUNDS.deposit = [0, 99]`）・`src/ui/state/index.ts`・`src/ui/App.tsx`
  - `src/core/payment.ts`（`calculatePayment`・`Payment`・`PaymentDetail`・`PaymentShare`）・`src/core/bonus.ts`（`calculateTableBonus`）・`src/core/bonus.test.ts`・`src/core/rule.ts`（`DEPOSIT_POINT_MIN`/`MAX`/`STEP`・`DEFAULT_DEPOSIT_POINT`・`validateRule`）
- 業務標準: [02-design-protocol.md](../rules/02-design-protocol.md)・[06-ui-md3-protocol.md](../rules/06-ui-md3-protocol.md)・[07-mahjong-rule-protocol.md](../rules/07-mahjong-rule-protocol.md)・[09-bundle-budget-protocol.md](../rules/09-bundle-budget-protocol.md)
- 指導文書: [G-10-design-consistency-pitfalls.md](../rules/advisory/G-10-design-consistency-pitfalls.md)

### 1.2 ヒアリング済みの確定事項（再検討・上書き禁止）

| # | 項目 | 確定内容 | 本書での反映 |
| --- | --- | --- | --- |
| 前提 | ベースブランチ | `origin/main`（`9d248b0`、Issue #105 マージ済み）。マイルストーン v1.1 | ヘッダー・§2.7・§6・§7 |
| Q1 | 三麻における「点差」の定義 | livewing/mahjong-calc の三麻 2 人払い版（自分の増分 ＋ 対象の減分）。`calculatePayment` の出力 `payment` からツモ損 3 方式すべて自動算出する:<br>・ロン（直撃）: `2 * discarder.withHonba + payment.deposit`<br>・親ツモ（対子）: `3 * eachNonDealer.withHonba + payment.deposit`<br>・子ツモ（対子 / 対親）: 対子 `dealer.withHonba + 2 * nonDealer.withHonba + payment.deposit`、対親 `2 * dealer.withHonba + nonDealer.withHonba + payment.deposit`（両者が同額のときは 1 値のみ） | §2.2 `formatCellDiff` |
| Q2 | 点差の符号・区切り表記 | 負数＋カンマ区切り（livewing 準拠＋本アプリ書式統一）。例: ロン `-2,000`、親ツモ `-12,000`、子ツモ `-8,000 / -10,000`（親子同額時 `-12,000`） | §2.2 `formatCellDiff` |
| Q3 | 「得点 / 点差」切替 UI と供託ステッパー | 「得点 / 点差」の 2 択切替を追加し、供託ステッパー（「供託」、`STEPPER_BOUNDS.deposit` 0〜99、`initialDeposit = table.deposit`、ローカル状態で卓へ書き戻さない、`rule.depositPoint` に連動）は **「点差」選択時のみ** 操作行に表示する。配置場所は製造後の UI 監修で検討するため、設計では最小限の配置を【設計案・UI 監修で変更可】として記載する | §2.3・§2.4・§2.5 |
| Q4 | スコープ | 点数計算表画面の点差タブのみ。和了結果画面（主画面）への点差表示は範囲外 | §2.1・§3 |

- **版の位置づけに関する注記**: [docs/requirements.md](../requirements.md) §3.6（66行）の「本場・供託の反映と点差の表示は v2 以降(Issue #101・#105・#106)」および Issue #106 本文の「(v2)」「Version 2 の範囲」は、オーナー確定により v1.1（`origin/main` 対象・マイルストーン v1.1）へ前倒しされている。要件文書・Issue 本文の整合改訂は統括担当の引き継ぎ事項とする（§4）。

### 1.3 麻雀ルール根拠とテスト期待値の出典（業務標準 07）

- **本場・供託計算の正本**（[docs/mahjong-rules.md](../mahjong-rules.md) §3.2【確定】）:
  - 本場: 所定値 `honbaPoint = 200`（0〜10,000 点の 200 点単位）。ロン時は放銃者が全額負担、ツモ時はツモられた 2 人が折半。ツモ折半が 100 点単位にならない設定は計算コアが例外を投げる。
  - 供託: 所定値 `depositPoint = 1000`（0〜10,000 点の 100 点単位）。和了者が `depositPoint × 供託本数` を受け取る。
  - 本場数・供託本数は 0 以上の整数とし、それ以外は計算コアが例外を投げる。
- **点差の算出根拠**:
  - 自分の増分＋対象の減分（Q1 確定式）。`payment` の各支払額（`withHonba`）と `payment.deposit` はすべて `calculatePayment` から取得し、自前で基本点・端数・本場・供託の計算を再実装しない。
  - ロン直撃: 自分の増分 `discarder.withHonba + payment.deposit` ＋ 放銃者の減分 `discarder.withHonba` = `2 * discarder.withHonba + payment.deposit`。
  - 親ツモ（対子）: 自分の増分 `2 * eachNonDealer.withHonba + payment.deposit` ＋ 子の減分 `eachNonDealer.withHonba` = `3 * eachNonDealer.withHonba + payment.deposit`。
  - 子ツモ（対子）: 自分の増分 `dealer.withHonba + nonDealer.withHonba + payment.deposit` ＋ 他子の減分 `nonDealer.withHonba` = `dealer.withHonba + 2 * nonDealer.withHonba + payment.deposit`。
  - 子ツモ（対親）: 自分の増分 `dealer.withHonba + nonDealer.withHonba + payment.deposit` ＋ 親の減分 `dealer.withHonba` = `2 * dealer.withHonba + nonDealer.withHonba + payment.deposit`。
- **不変条件の確認**: 本 Issue は `src/core/` を変更せず、既存の `calculateBasePoint`・`calculatePayment` のみを呼び出す。2m〜8m の不在・チー不在・自風（東・南・西）の不変条件に影響しない。
- **テスト期待値の出典**:
  - 申告額（本場 0）: [docs/mahjong-rules.md](../mahjong-rules.md) §3.1（満貫ツモ 3 方式、子 30 符 2 飜・北家分折半 `800・1,300`、子 30 符 4 飜・ロン打点折半 `3,900オール`）および四麻の点数早見表（Wikipedia「麻雀の得点計算」）。
  - 本場・供託加算後の各支払額および点差: 上記申告額に対し、[docs/mahjong-rules.md](../mahjong-rules.md) §3.2 の加算式と Q1 確定式を手計算で適用して導出する。livewing の表は検算に使わない。

### 1.4 既存コード調査で確認した設計前提

1. **`calculatePayment`・`calculateTableBonus` の検証範囲**（`src/core/payment.ts`・`src/core/bonus.ts`）:
   - `calculatePayment` の入口検証: `basePoint`（正の整数）、`rule.tsumoLoss`（3 方式）、`rule.honbaPoint`（0 以上の整数）、`rule.depositPoint`（0 以上の整数）。
   - `calculateTableBonus` の入口検証: `table.continue`（0 以上の整数）、`table.deposit`（0 以上の整数）、およびツモ時の `(honbaPoint * table.continue) / 2` が 100 の倍数の整数であること。
   - 供託額 `deposit = depositPoint * table.deposit` は和了者が全額受け取るため、ツモ折半の 100 点単位制約を受けない。
   - 既存の `formatCellPayment(payment)` は `payment.honba` と `payment.detail` のみを参照し、`payment.deposit` を参照しないため、供託本数・`depositPoint` を `table`・`paymentRule` に渡しても得点表示（`cell.text`）は供託の影響を一切受けない。
2. **既存共用部品の必須挙動確認**（G-10 §3 準拠）:
   - `ConnectedButtonGroup<T>`（`src/ui/expressive/ConnectedButtonGroup.tsx`）: `<div role="radiogroup" aria-label={label}>` 内に各選択肢を `<button type="button" role="radio" aria-checked={isSelected}><span>{opt.label}</span></button>` として描画する。不要な装飾・強制バッジはなく、「得点 / 点差」の 2 択切替にそのまま利用できる。
   - `Stepper`（`src/ui/expressive/Stepper.tsx`）: `aria-label` を可視ラベル `<span className="stepper__label">` と増減ボタンの `aria-label`（`${ariaLabel}を減らす` / `${ariaLabel}を増やす`）に使う。主画面（`MainScreen.tsx` 194 行）・要約カード（`SummaryCard.tsx` 45 行）と揃えて `aria-label="供託"` とする。
3. **既存テストへの影響点**（G-10 事前確認）:
   - `src/ui/screen/ScoringTableScreen.test.tsx` の `extractRadioStates(html)` は現在 HTML 全体から `role="radio"` を一括抽出している。表示切替用の `ConnectedButtonGroup` を追加すると `role="radio"` が 2 グループ（表示切替・親子）になるため、グループ別（`aria-label` 指定）に抽出するヘルパーへ拡張し、既存テスト `H1-21` を安全に維持する。
   - `H1-22`（供託の文字が描画結果に出ない）は、既定モード（`'score'`）で供託ステッパーを非表示とする Q3 仕様と整合し続けるため、「得点モードで供託の文字が出ない」検証として維持する。
4. **画面ライフサイクルと遅延チャンク**:
   - `App.tsx` は `screen === 'scoring-table'` の間だけ `ScoringTableScreen`（`lazy`）をマウントするため、`ScoringTableView` 内の `useState` 初期値に `table.deposit` を渡せば「開くたびに卓から再読み込み・変更しても卓へ書き戻さない」（Q3）が成立する。
   - また、同一画面滞在中に「得点」↔「点差」を切り替えてもローカル状態 `deposit` は保持され、主画面へ戻って再度開いたときに `table.deposit` から再初期化される。

## 2. 設計

### 2.1 モジュール構成と変更範囲

#### 変更対象ファイル（5 ファイルのみ）

| ファイル | 種別 | 変更内容 |
| --- | --- | --- |
| `src/ui/scoring-table/scoring-table.ts` | 変更（遅延チャンク） | `ScoringRule` へ `depositPoint` 追加、`ScoringContext` へ `deposit: number` 追加、`Cell` の `value` バリアントへ `diffText: string` 追加、`formatCellDiff` 追加、`resolveSafeInput` に供託系の防御追加 |
| `src/ui/scoring-table/scoring-table.test.ts` | 変更（テスト） | 既存テストの `defaultScoringRule`・`ScoringContext`（`deposit: 0`）追従、点差計算（3 方式×親子×本場×供託・親子同額 1 値・`depositPoint` 連動・異常入力フォールバック）のテスト追加 |
| `src/ui/screen/ScoringTableScreen.tsx` | 変更（遅延チャンク） | `ScoringMode` 型と `ScoringTableViewProps` へ `initialDeposit?: number`・`initialMode?: ScoringMode` 追加、`mode`・`deposit` ローカル状態、表示切替 `ConnectedButtonGroup` と点差時限定の供託 `Stepper` 配置、セル描画の `mode` 切替、`ScoringTableScreen` から `table.deposit` を渡す |
| `src/ui/screen/ScoringTableScreen.test.tsx` | 変更（テスト） | `defaultRule` 追従、`extractRadioStates` のグループ別抽出化（`H1-21` 維持）、表示切替初期状態・点差モード時の供託ステッパー初期値/境界/クランプ・点差テキスト描画・得点モード時の供託非表示テスト追加 |
| `src/ui/screen/scoring-table.css` | 変更（遅延チャンク CSS） | 表示切替（`.scoring-table-screen__mode-toggle`）と供託ステッパー（`.scoring-table-screen__deposit-stepper`）の最小限スタイル共有追加（MD3 トークンのみ使用） |

#### 変更禁止ファイル

- `src/core/` 配下の全ファイル（点数は必ず既存 `calculateBasePoint`・`calculatePayment` を呼ぶ）
- `src/ui/expressive/` 配下の全ファイル（既存 `ConnectedButtonGroup`・`Stepper` をそのまま利用する）
- `src/ui/state/` 配下の全ファイル（既存 `STEPPER_BOUNDS.deposit` を利用し、状態型・reducer・Provider を変更しない）
- `src/ui/result/` 配下の全ファイル（和了結果画面への点差表示は範囲外〔Q4〕。`hora-summary.ts` も変更しない）
- `src/ui/App.tsx`・`src/ui/screen/AppHeader.tsx`・`src/ui/screen/MainScreen.tsx`（初回 JS 側の画面・メニューを変更しない）
- `scripts/gen-theme-tokens.ts`・`src/ui/theme/tokens.css`（既存 MD3 トークンのみ使用する）

### 2.2 純関数（`src/ui/scoring-table/scoring-table.ts`）

#### 型定義とエクスポートシグネチャ

```ts
export const FU_LIST = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110] as const;
export const HAN_LIST = [1, 2, 3, 4] as const;

/** 点数表が参照するルール設定 */
export type ScoringRule = Pick<
  Rule,
  | 'tsumoLoss'
  | 'honbaPoint'
  | 'depositPoint'
  | 'roundedMangan'
  | 'accumlatedYakuman'
  | 'doubleWindFu'
>;

export interface ScoringContext {
  dealer: boolean;
  /** 本場数（0以上の整数） */
  honba: number;
  /** 供託本数（0以上の整数） */
  deposit: number;
}

export type ScoringMode = 'score' | 'diff';

export type Cell =
  | { kind: 'absent' }
  | { kind: 'na' }
  | { kind: 'value'; payment: Payment; text: string; diffText: string };

// LimitKind・TableCell・LimitRow の型定義は現行どおり維持する
export function formatCellPayment(payment: Payment): string;
export function formatCellDiff(payment: Payment): string;
export function cellExists(
  fu: number,
  han: number,
  by: 'ron' | 'tsumo',
  doubleWindFu: 2 | 4
): 'absent' | 'na' | 'ok';
export function buildFuHanTable(
  rule: ScoringRule,
  ctx: ScoringContext
): TableCell[][];
export function buildLimitTable(
  rule: ScoringRule,
  ctx: ScoringContext
): LimitRow[];
```

- **派生値型（`Cell.diffText`）採用の根拠**:
  - Issue #101 §4・Issue #106 本文の引き継ぎ方針「`Cell` に派生値を足す形で拡張する」と一致する。
  - 同じ `Cell` が得点（`text`）と点差（`diffText`）を両方自己記述的に保持するため、既存テスト（`H1-02`〜`H1-12`・`H1-1-01`〜`H1-1-08`）の `cell.text` 検証の意味を変えずに `deposit: 0` の追加だけで追従でき、かつ新規テストで同一セルの得点と点差の独立性（供託が得点に影響せず点差のみに反映されること）を直接検証できる。
  - `ScoringMode` は UI の表示切替に使い、純関数側からは `formatCellDiff` と型 `ScoringMode` を export する。

#### 内部ヘルパーの更新

```ts
const buildContextTable = (ctx: ScoringContext): Table => ({
  round: 'east',
  seat: ctx.dealer ? 'east' : 'south',
  continue: ctx.honba,
  deposit: ctx.deposit
});

const buildPaymentRule = (
  rule: Pick<ScoringRule, 'tsumoLoss' | 'honbaPoint' | 'depositPoint'>
): PaymentRule => ({
  tsumoLoss: rule.tsumoLoss,
  honbaPoint: rule.honbaPoint,
  depositPoint: rule.depositPoint
});
```

#### 点差の算出・表記（`formatCellDiff`・Q1・Q2 確定）

`payment`（`calculatePayment` の出力）のみから点差を算出し、負数＋カンマ区切り文字列を返す。負号は半角ハイフンマイナス `-`、子ツモの対子/対親の区切りは半角スペース＋スラッシュ＋半角スペース ` / ` とする。

```ts
const formatDiffValue = (diff: number): string => `-${formatNumber(diff)}`;

/** 点数表のセル向け点差表記(三麻2人払い: 自分の増分 + 対象の減分、負数表示) */
export function formatCellDiff(payment: Payment): string {
  const { detail, deposit } = payment;
  if (detail.by === 'ron') {
    return formatDiffValue(2 * detail.discarder.withHonba + deposit);
  }
  if (detail.winner === 'dealer') {
    return formatDiffValue(3 * detail.eachNonDealer.withHonba + deposit);
  }
  const vsNonDealer =
    detail.dealer.withHonba + 2 * detail.nonDealer.withHonba + deposit;
  const vsDealer =
    2 * detail.dealer.withHonba + detail.nonDealer.withHonba + deposit;
  if (vsNonDealer === vsDealer) {
    return formatDiffValue(vsNonDealer);
  }
  return `${formatDiffValue(vsNonDealer)} / ${formatDiffValue(vsDealer)}`;
}
```

| パターン | 条件 | 算出式 | フォーマット例（本場 0・供託 0） |
| --- | --- | --- | --- |
| ロン（直撃） | `detail.by === 'ron'` | `2 * discarder.withHonba + deposit` | 子 30 符 1 飜: `-2,000` / 子 5 飜: `-16,000` |
| 親ツモ（対子） | `detail.by === 'tsumo' && detail.winner === 'dealer'` | `3 * eachNonDealer.withHonba + deposit` | 親 30 符 1 飜: `-1,500` / 親 5 飜（ツモ損あり）: `-12,000` |
| 子ツモ（親子同額） | `detail.by === 'tsumo' && detail.winner === 'nonDealer' && vsNonDealer === vsDealer` | `dealer.withHonba + 2 * nonDealer.withHonba + deposit` | 子 5 飜（ロン打点折半）: `-12,000` |
| 子ツモ（対子 / 対親） | 上記以外の子ツモ | 対子: `dealer.withHonba + 2 * nonDealer.withHonba + deposit`<br>対親: `2 * dealer.withHonba + nonDealer.withHonba + deposit` | 子 5 飜（ツモ損あり）: `-8,000 / -10,000` |

- `makeValueCell` は `payment` から `text: formatCellPayment(payment)` と `diffText: formatCellDiff(payment)` の両方を生成して返す。

#### `resolveSafeInput` の防御範囲（本場系・供託系の独立フォールバック）【設計案（§8 D1・承認時に確定）】

Issue #105 で確定した本場異常時の「表全体を本場 0 へフォールバック」と一貫させつつ、不正な `deposit` / `depositPoint`（負数・非整数・`NaN`・`Infinity`）についても表全体を供託 0（`deposit: 0, depositPoint: 0`）へフォールバックする。両者は独立して検証し、一方の異常が正常な他方を巻き込まないようにする。

```ts
const isNonNegativeInt = (n: number): boolean => Number.isInteger(n) && n >= 0;

const resolveSafeInput = (
  rule: ScoringRule,
  ctx: ScoringContext
): { table: Table; paymentRule: PaymentRule } => {
  const depositValid =
    isNonNegativeInt(ctx.deposit) && isNonNegativeInt(rule.depositPoint);
  const table: Table = {
    ...buildContextTable(ctx),
    deposit: depositValid ? ctx.deposit : 0
  };
  const paymentRule: PaymentRule = {
    ...buildPaymentRule(rule),
    depositPoint: depositValid ? rule.depositPoint : 0
  };
  try {
    // ツモ側の事前検証1回で honbaPoint・continue の妥当性とツモ折半100点単位をまとめて確認する
    calculatePayment(2000, table, 'tsumo', paymentRule);
    return { table, paymentRule };
  } catch {
    return {
      table: { ...table, continue: 0 },
      paymentRule: { ...paymentRule, honbaPoint: 0 }
    };
  }
};
```

- **根拠と挙動**:
  - `calculatePayment` および `calculateTableBonus` が供託に関して例外を投げる条件は `deposit` または `depositPoint` が 0 以上の整数でない場合のみである（`src/core/payment.ts` 68 行、`src/core/bonus.ts` 23–24 行）。
  - 事前に `depositValid` を検査して不正時のみ `deposit: 0, depositPoint: 0` へ落とすことで、後続の `calculatePayment(2000, table, 'tsumo', paymentRule)` の `try/catch` は純粋に本場系（`honbaPoint`・`continue`・ツモ折半 100 点単位）の異常だけを検出できる。
  - 結果として、① `deposit` / `depositPoint` 異常時は供託のみ 0・本場は維持、② `honba` / `honbaPoint` 異常時は本場のみ 0・供託は維持、③ 両方異常時は本場 0・供託 0 となり、いずれのケースでも例外による画面クラッシュやロン/ツモ間の不整合が起きない。
  - 通常の設定画面（`validateRule`）および `ScoringTableView`（`clampCount`）経由では正常値に制約されるため本フォールバックには到達しない。

### 2.3 画面構成【設計案・UI 監修で変更可】

Q3 の確定事項に従い、最小限の構成とする。操作行内の配置場所・並び順・折り返し方や、点差モード時の細部デザインは、製造後の UI 監修で実物を見ながら決定する。

上から順に:

1. **ヘッダー上段（現行維持）**: 戻るボタン（`aria-label="戻る"`）、題「点数計算表」、右端の計算方式ラベル（`.scoring-table-screen__rule-label`、`data-tsumo-loss` による強調を維持）。
2. **ヘッダー下段・操作行（`.scoring-table-screen__controls`、`<header className="app-header">` 内に一体で上部固定を維持）**:
   - **表示切替（「得点 / 点差」）**: 既存 `ConnectedButtonGroup<ScoringMode>` を使用。
     - `label="表示切替"`
     - `className="scoring-table-screen__mode-toggle"`
     - `options`: `[{ value: 'score', label: '得点' }, { value: 'diff', label: '点差' }]`
     - `value={mode}` / `onValueChange={setMode}`
   - **親子切替（現行維持）**: `ConnectedButtonGroup<'dealer' | 'child'>`（「親」「子」、`label="親子"`、`className="scoring-table-screen__dealer-toggle"`）。
   - **ステッパー群（`.scoring-table-screen__steppers`）**:
     - **積み棒ステッパー（現行維持）**: `Stepper`（`aria-label="積み棒"`、`className="scoring-table-screen__honba-stepper"`、`min=0`、`max=99`）。「得点」「点差」の両モードで表示する。
     - **供託ステッパー（Q3: 点差選択時のみ表示）**: `mode === 'diff'` のときのみ既存の `Stepper` を描画する。
       - `aria-label="供託"`（主画面 `MainScreen.tsx`・要約カード `SummaryCard.tsx` と統一）
       - `className="scoring-table-screen__deposit-stepper"`
       - `value={deposit}`
       - `min={STEPPER_BOUNDS.deposit[0]}`（`0`）
       - `max={STEPPER_BOUNDS.deposit[1]}`（`99`）
       - `onStep={delta => setDeposit(prev => clampCount(prev + delta, DEPOSIT_MIN, DEPOSIT_MAX))}`
   - **最小レイアウト案（CSS）**:
     - `.scoring-table-screen__mode-toggle` は `.scoring-table-screen__dealer-toggle` と同一の幅・高さ（`flex: 1 1 6.25rem; min-width: 6.25rem; max-width: 9.375rem; height: 2.5rem;`）のルールを共有する。
     - `.scoring-table-screen__deposit-stepper` は `.scoring-table-screen__honba-stepper` と同一の幅・高さ・ボタンスタイルのルールを共有する。
     - 既存の `.scoring-table-screen__controls`（`display: flex; align-items: flex-end; justify-content: center; gap: 0.5rem; flex-wrap: wrap;`）により、375px 幅（コンテンツ内幅 343px）では「得点」時 3 要素が 1 行（`100px×3 + 8px×2 = 316px <= 343px`）、「点差」時 4 要素が自動で折り返して 2 行に収まり、横はみ出しを起こさない。
3. **1〜4 飜 × 符の表（現行構造維持）**:
   - 各セルは上段 = ロン、下段 = ツモ。`mode === 'score'` なら `cell.text`、`mode === 'diff'` なら `cell.diffText` を描画する。
   - `absent`（空欄）・`na`（`-`）・満貫以上色分け（`data-limit`）・左端符列 `sticky`・`tabular-nums` は両モード共通で維持する。
4. **満貫以上の表（現行構造維持）**:
   - ロン列・ツモ列に `mode === 'diff' ? cell.diffText : cell.text`（`kind !== 'value'` は `-`）を描画する。
5. **制約の遵守（業務標準 06）**:
   - 色はすべて MD3 トークン（`--md-sys-color-*`）のみを使用し、HEX 値を一切書かない。
   - 数値表示には `tabular-nums` を維持する。
   - 見ればわかる説明書き・注記（例: 「点差は自分の増分＋対象の減分」等）は設計段階では置かない（必要性の判断は UI 監修に委ねる）。

### 2.4 状態と遷移（`src/ui/screen/ScoringTableScreen.tsx`）

```ts
export interface ScoringTableViewProps {
  seat: Wind;
  rule: ScoringRule;
  initialDealer?: boolean;
  /** 初期の本場数（省略時 0。STEPPER_BOUNDS.continue の範囲にクランプする） */
  initialHonba?: number;
  /** 初期の供託本数（省略時 0。STEPPER_BOUNDS.deposit の範囲にクランプする） */
  initialDeposit?: number;
  /** 初期の表示モード（省略時 'score'） */
  initialMode?: ScoringMode;
  onBack: () => void;
}
```

- 汎用クランプヘルパー:
  ```ts
  const [HONBA_MIN, HONBA_MAX] = STEPPER_BOUNDS.continue;
  const [DEPOSIT_MIN, DEPOSIT_MAX] = STEPPER_BOUNDS.deposit;

  const clampCount = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.trunc(value)));
  };
  ```
- `ScoringTableView` 内のローカル状態:
  - `mode`: `useState<ScoringMode>(() => initialMode ?? 'score')`
  - `dealer`: `useState<boolean>(() => initialDealer ?? seat === 'east')`
  - `honba`: `useState<number>(() => clampCount(initialHonba ?? 0, HONBA_MIN, HONBA_MAX))`
  - `deposit`: `useState<number>(() => clampCount(initialDeposit ?? 0, DEPOSIT_MIN, DEPOSIT_MAX))`
  - `buildFuHanTable(rule, { dealer, honba, deposit })`、`buildLimitTable(rule, { dealer, honba, deposit })` を呼ぶ。
- `ScoringTableScreen`（`export default`）:
  - `useAppState()` から `{ table, rule }` を読み、`<ScoringTableView seat={table.seat} rule={rule} initialHonba={table.continue} initialDeposit={table.deposit} onBack={() => dispatch({ type: 'navigate', screen: 'main' })} />` を返す。
  - 卓状態への書き戻しアクション（`step` 等）は一切 dispatch しない（Q3）。

### 2.5 卓・ルールとの連動の整理

| 項目 | #106 での扱い | 状態 |
| --- | --- | --- |
| 自風（`table.seat` → 親/子） | 画面を開くたびに初期値として連動。画面内変更は卓に書き戻さない | 【確定】#101 Q3 |
| 本場数（`table.continue`） | 画面を開くたびに初期値として連動。画面内ステッパー（0〜99）で変更しても卓に書き戻さない。得点・点差の両方に反映 | 【確定】#105 Q3 |
| 供託本数（`table.deposit`） | 画面を開くたびに初期値として連動。画面内ステッパー（0〜99・点差選択時のみ表示）で変更しても卓に書き戻さない。点差にのみ反映（得点には影響しない） | 【確定】#106 Q3 |
| 表示モード（得点 / 点差） | 画面を開くたびに「得点」で開始。ローカル状態のみ（保存しない） | 【確定】#106 Q3 |
| `rule.depositPoint` | 連動（0〜10,000 点・100 点単位。点差に反映、`0` 点時は加算 0） | 【確定】#106 Q3 |
| `rule.honbaPoint`・`tsumoLoss`・`roundedMangan`・`accumlatedYakuman`・`doubleWindFu` | 現行どおり連動（点差は `payment` 経由で 3 方式・`honbaPoint`・`roundedMangan` 等に自動連動） | 【確定】#101・#105・#106 Q1 |

### 2.6 テスト計画（jsdom 不要・Vitest）

既存テスト `H1-01`〜`H1-06`・`H1-10`〜`H1-13`・`H1-1-01`〜`H1-1-08`・`H1-20`〜`H1-23`・`H1-25`・`H1-1-20`〜`H1-1-24` はすべて維持（ただし `H1-22` は Q3 仕様に合わせてテスト名・`initialDeposit={2}` 前提・既存コメントを更新）しつつ、以下を追従・追加する。点数の期待値テストには必ず出典コメントを残す（業務標準 07）。

#### 既存テストの追従

- `src/ui/scoring-table/scoring-table.test.ts`:
  - `defaultScoringRule()` に `depositPoint: rule.depositPoint` を追加。
  - 既存の `buildFuHanTable` / `buildLimitTable` 呼び出しの `ScoringContext` に `deposit: 0` を明示する。
- `src/ui/screen/ScoringTableScreen.test.tsx`:
  - `defaultRule()` に `depositPoint: rule.depositPoint` を追加。
  - `extractRadioStates(html, groupLabel)` に拡張し、`aria-label="親子"` と `aria-label="表示切替"` の各 `radiogroup` を個別に抽出するよう更新する（`H1-21` は `extractRadioStates(html, '親子')` を検証）。
  - `H1-22`: テスト名を「得点モード(既定)で供託の文字が描画結果に出ない」に更新し、既定（`initialMode` 省略）かつ `initialDeposit={2}` でも `html.includes('供託') === false` であることを検証する。あわせて既存テスト内のコメント「供託は範囲外のため」を「得点モードでは供託非表示のため」へ更新する。

#### 新規テスト: 純関数（`src/ui/scoring-table/scoring-table.test.ts`）

| ID | 条件 | 期待値（出典: §1.3） |
| --- | --- | --- |
| H1-2-01 | 子・ツモ損あり・0本場・供託0（既定ルール） | 30符1飜: ロン `diffText: '-2,000'`・ツモ `'-1,100 / -1,300'` / 30符4飜: ロン `'-15,400'`・ツモ `'-7,900 / -9,800'` / 20符2飜: ロン `{ kind: 'na' }`・ツモ `'-1,500 / -1,800'` / 20符1飜: 両方 `{ kind: 'absent' }` |
| H1-2-02 | 親・ツモ損あり・0本場・供託0（既定ルール） | 30符1飜: ロン `'-3,000'`・ツモ `'-1,500'` / 30符4飜: ロン `'-23,200'`・ツモ `'-11,700'` |
| H1-2-03 | ツモ損 3 方式（`loss`・`north-split`・`ron-split`）× 親子・0本場・供託0 | 5飜: ツモ損あり(子 ロン `'-16,000'`・ツモ `'-8,000 / -10,000'` / 親 ロン `'-24,000'`・ツモ `'-12,000'`)、北家分折半(子30符2飜ツモ `'-2,900 / -3,400'` / 子5飜ツモ `'-11,000 / -13,000'` / 親5飜ツモ `'-18,000'`)、ロン打点折半(子30符4飜ツモ `'-11,700'`〔同額1値〕 / 子5飜ツモ `'-12,000'`〔同額1値〕 / 親5飜ツモ `'-18,000'`) |
| H1-2-04 | 本場・供託ありの点差反映と得点非干渉（既定 `honbaPoint: 200, depositPoint: 1000`） | ・子・ツモ損あり・1本場・供託0: 30符1飜 ロン `'-2,400'`・ツモ `'-1,400 / -1,600'` / 5飜 ロン `'-16,400'`・ツモ `'-8,300 / -10,300'`<br>・子・ツモ損あり・0本場・供託1: 30符1飜 ロン `'-3,000'`・ツモ `'-2,100 / -2,300'` / 5飜 ロン `'-17,000'`・ツモ `'-9,000 / -11,000'`<br>・子・ツモ損あり・2本場・供託3: 30符1飜 ロン `diffText: '-5,800'`（かつ `text: '1,000 は 1,400'` で供託非干渉）・ツモ `diffText: '-4,700 / -4,900'`（かつ `text: '300・500 は 500・700'`）<br>・親・ツモ損あり・2本場・供託3: 30符1飜 ロン `'-6,800'`・ツモ `'-5,100'` / 5飜 ロン `'-27,800'`・ツモ `'-15,600'` |
| H1-2-05 | `depositPoint` ルール連動（`500`・`0`） | `depositPoint: 500`・0本場・供託2・子30符1飜: ロン `'-3,000'`・ツモ `'-2,100 / -2,300'` / `depositPoint: 0`・0本場・供託3・子30符1飜: ロン `'-2,000'`・ツモ `'-1,100 / -1,300'` |
| H1-2-06 | `resolveSafeInput` 供託系異常入力の防御と本場系との独立性【設計案（§8 D1・承認時に確定）】 | ・`deposit: -1`・`deposit: 1.5`・`depositPoint: -100`（子・1本場・`honbaPoint: 200`）: 例外を投げず供託のみ0にフォールバックし本場1は維持（30符1飜: `text` ロン `'1,000 は 1,200'` / `diffText` ロン `'-2,400'`・ツモ `'-1,400 / -1,600'`、5飜: `diffText` ロン `'-16,400'`・ツモ `'-8,300 / -10,300'`）<br>・`honbaPoint: 300, honba: 1, deposit: 1, depositPoint: 1000`（子）: 本場のみ0にフォールバックし供託1,000は維持（30符1飜: `text` ロン `'1,000'` / `diffText` ロン `'-3,000'`・ツモ `'-2,100 / -2,300'`、5飜: `diffText` ロン `'-17,000'`・ツモ `'-9,000 / -11,000'`）<br>・`honba: -1, deposit: -1`（子）: 本場0・供託0にフォールバック（30符1飜: `text` ロン `'1,000'` / `diffText` ロン `'-2,000'`・ツモ `'-1,100 / -1,300'`） |

#### 新規テスト: 画面（`src/ui/screen/ScoringTableScreen.test.tsx`、`renderToStaticMarkup`）

| ID | 内容 |
| --- | --- |
| H1-2-20 | 「得点 / 点差」切替（`aria-label="表示切替"`）が描画され、`initialMode` 省略時は「得点」が選択状態・`initialMode="diff"` で「点差」が選択状態になる |
| H1-2-21 | 供託ステッパー（`aria-label="供託"`）は `initialMode="score"`（および省略時）で描画されず、`initialMode="diff"` のときのみ描画される。`initialMode="diff"` での初期値省略（`0`・減 disabled）・`initialDeposit={99}`（`99`・増 disabled）・範囲外（`-1`→`0`、`120`→`99`）のクランプを検証する |
| H1-2-22 | `initialMode="diff"` で子（0本場・供託0）に `>-2,000<`・`>-1,100 / -1,300<`・`>-8,000 / -10,000<`、親（0本場・供託0）に `>-12,000<`、子（1本場・供託1）に `>-3,400<`・`>-2,400 / -2,600<`・`>-17,400<`、子・ロン打点折半（0本場・供託0）に `>-12,000<`（1値のみ）が描画される |

### 2.7 初回 JS バンドル目標値（業務標準 09）

- **基準値（`origin/main` `9d248b0` 実測値）**: **129,251 B**（`dist/assets/index-C_Z1XlPQ.js`、`gzip -9 -c | wc -c`、`modulepreload` なし）。
  - 注記: 業務標準 09 に記載の v1.0.0 時点の基準値 128,883 B との差（+368 B）は、v1.0.0 以降 Issue #105 マージ（`9d248b0`）までに `main` へ入った既存変更によるもの。本書は最新の `origin/main` 実測値を基準値とする。
- **初回 JS 増分の積算**:
  - 初回チャンク側のソースファイル（`App.tsx`・`AppHeader.tsx`・`MainScreen.tsx`・`ConnectedButtonGroup.tsx`・`Stepper.tsx`・`app-state.ts`・`hora-summary.ts`）は一切変更しない。
  - `ScoringTableScreen`（遅延チャンク）が参照する初回チャンク側のシンボル（`ConnectedButtonGroup`・`Stepper`・`STEPPER_BOUNDS`・`formatNumber`・`formatPoints`・`TSUMO_SEPARATOR`）はすべて Issue #105 時点で既にインポート済みのため、新規のチャンク間バインディング追加はない。
  - 増分見込みは遅延チャンクのファイル名ハッシュ変化による圧縮揺らぎのみ: **+0〜50 B**。
- **目標値**: 初回 JS **129,301 B 以下**（基準値 129,251 B + 50 B）。※業務標準 09 に従い、超過を理由に検収を不合格にしない。製造担当の最終報告および検収担当の PR 本文に、基準値・実測値・増分・積算との差・超過時の超過量と原因を記録する。
- **遅延チャンクの見込み（参考・合計外）**:
  - `ScoringTableScreen-*.js`: 基準 **2,299 B** + 増分見込み **+250〜550 B**（`formatCellDiff`・供託系フォールバック・`mode`/`deposit` state・表示切替・条件付き供託ステッパー・`diffText` 描画）→ 見込み **約 2,550〜2,850 B**（gzip -9）。
  - `ScoringTableScreen-*.css`: 基準 **1,222 B** + 増分見込み **+10〜80 B**（表示切替・供託ステッパーのセレクタ追加）→ 見込み **約 1,230〜1,300 B**（gzip -9）。
  - `payment-*.js`: 基準 **1,023 B**（変更なし見込み）。

## 3. 範囲外

- **和了結果画面（主画面）への点差表示**（Q4 確定）。
- **得点タブへの供託ステッパー表示・供託加算**（Q3 確定。供託ステッパーは点差選択時のみ表示し、得点表示には影響させない）。
- **画面内での供託・本場・親子・表示モード変更の主画面卓状態（`state.table`）への書き戻し、および表示モードの永続化**（Q3 確定）。
- **ロン時の脇（非放銃他家）との点差表示**（Q1 確定: ロンは直撃のみ）。
- **操作行の最終レイアウト・配置決定**（Q3 確定: 製造後の UI 監修で実物を見ながら調整する）。
- **`src/core/`・`src/ui/expressive/`・`src/ui/state/`・`src/ui/result/`・`src/ui/theme/tokens.css` の変更**。

## 4. 後続 Issue・統括担当への引き継ぎ事項

- **統括担当による既存文書の整合改訂**:
  - 業務標準 07（14〜16 行）に従い、統括担当が [docs/mahjong-rules.md](../mahjong-rules.md) へ三麻における「点差」の定義（Q1 確定式: 自分の増分＋対象の減分によるロン直撃・親ツモ・子ツモの算出式）を追記すること。
  - [docs/requirements.md](../requirements.md) §3.6（66行）の「本場・供託の反映と点差の表示は v2 以降(Issue #101・#105・#106)」は v1.1 前倒しと食い違っているため、統括担当にて改訂すること（あわせて必要に応じて Issue #106 本文の「(v2)」「Version 2 の範囲」表記も整理する）。
  - マージ後、[09-bundle-budget-protocol.md](../rules/09-bundle-budget-protocol.md) の初回 JS 基準値を最新実測値で更新すること。
- **製造後の UI 監修（Q3）で確認・調整する事項**:
  - 「得点 / 点差」切替と親子切替・積み棒ステッパー・供託ステッパーの最終配置（1 行＋2 行折り返し vs 2 段明示配置 vs ヘッダー内タブ化等）および 375px 幅でのヘッダー高さ（表の視認領域とのバランス）。
  - 点差モードで子ツモ 2 値（例: `-7,900 / -9,800`・`-10,300 / -12,300` 等）を表示した際の 375px 幅でのセル幅・横スクロール感と視認性。
  - 対子・対親の順序（左が対子・右が対親）を示す最小限の凡例・見出しの要否。
- **将来（v2 以降）の拡張メモ**:
  - 将来的に和了結果画面へ点差表示を追加する場合、純関数 `formatCellDiff(payment)`（または算出ロジック）を共通モジュールへ切り出すことで三麻 2 人払いの定義を一元管理できる。

## 5. 実挙動未確認

- 375px 幅の実画面で、点差モードにした際の 4 コントロール（表示切替・親子切替・積み棒ステッパー・供託ステッパー）の折り返しレイアウト、ヘッダー全体の高さ、および子ツモ 2 値（例: `-7,900 / -9,800`）のセル幅・横スクロール量は実装前のため**実挙動未確認**（重なり・欠け・ページ横スクロールが無いことは検収項目 6(g) で確認し、配置の最終調整は Q3 に従い UI 監修で確認する）。
- 実装後の初回 JS 増分および遅延チャンク `ScoringTableScreen-*.js` / `.css` のサイズは見積りであり、**実挙動未確認**（製造・検収のビルドで実測する）。

## 6. 外部事実の確認記録

本設計が前提とする事実を以下のコマンド実行で確認した。新規の外部パッケージ・GitHub Actions・コンテナイメージの導入はなし。

| 対象 | 実行コマンド | 確認結果 |
| --- | --- | --- |
| ベースブランチの整合 | `git status --porcelain && git rev-parse HEAD && git log -n 3 --oneline` | 作業ツリー差分なし、`HEAD` = `origin/main` = `9d248b020ca6064973324917deaec4f2ae278a35`（Issue #105 PR #143 マージ済み） |
| Issue #106 の要件 | `gh issue view 106 --comments` | 親 #100、マイルストーン v1.1、本文および未決事項を確認 |
| ツール版数 | `node -v && npx vite --version && npx vitest --version` | Node `v24.20.0`、Vite `6.4.4`、Vitest `3.2.7` |
| 初回 JS 基準値と遅延チャンク構成（`origin/main` `9d248b0`） | `npm run build && cat dist/index.html && for f in dist/assets/index-*.js dist/assets/ScoringTableScreen-*.js dist/assets/ScoringTableScreen-*.css dist/assets/payment-*.js; do echo "$f: $(gzip -9 -c "$f" \| wc -c \| tr -d ' ') B"; done` | `dist/index.html` の初回 JS は `dist/assets/index-C_Z1XlPQ.js` のみ（`modulepreload` なし）。gzip -9 サイズ: `index-C_Z1XlPQ.js` = **129,251 B**、`ScoringTableScreen-CBrBJzaZ.js` = **2,299 B**、`ScoringTableScreen-dS2ilkPU.css` = **1,222 B**、`payment-UxFzoWqs.js` = **1,023 B** |
| 既存関連テストの通過 | `npx vitest run src/ui/scoring-table src/ui/screen/ScoringTableScreen.test.tsx src/core/bonus.test.ts src/core/payment.test.ts` | 4 ファイル・118 テストすべて通過 |
| 遅延チャンク参照箇所の現状 | `grep -rn "scoring-table/\|ScoringTableScreen" src --include='*.ts' --include='*.tsx' \| grep -v '\.test\.'` | `src/ui/App.tsx`（12・36 行）と `src/ui/screen/ScoringTableScreen.tsx`（14・224・238 行）の計 5 行のみ |
| UI 内の「供託」呼称統一 | `grep -rn "供託" src/ui/screen/MainScreen.tsx src/ui/screen/SummaryCard.tsx src/ui/settings/rule-help.ts` | `MainScreen.tsx`（194 行: `aria-label="供託"`）、`SummaryCard.tsx`（45 行: `aria-label={\`供託 ${table.deposit}\`}`）で「供託」に統一済み |

## 7. 受け入れ条件チェックリスト

検収担当は上から 1 項目ずつ実行し、すべて通過した場合のみ PR を作成する。

1. **静的検査・全テスト**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて終了コード 0 で通過する。
2. **変更範囲の制約**:
   - `git diff --stat origin/main...HEAD -- src/core src/ui/expressive src/ui/state src/ui/result src/ui/theme src/ui/App.tsx src/ui/screen/AppHeader.tsx src/ui/screen/MainScreen.tsx scripts` が空である。
   - `git diff --name-only origin/main...HEAD` の出力が、以下の 5 ファイル（および本設計書 `docs/design/issue-106-scoring-table-diff.md` を含む場合は最大 6 ファイル）の範囲内に収まっている:
     - `src/ui/scoring-table/scoring-table.ts`
     - `src/ui/scoring-table/scoring-table.test.ts`
     - `src/ui/screen/ScoringTableScreen.tsx`
     - `src/ui/screen/ScoringTableScreen.test.tsx`
     - `src/ui/screen/scoring-table.css`
3. **単体テストの網羅と出典**:
   - `npx vitest run src/ui/scoring-table src/ui/screen/ScoringTableScreen.test.tsx` の出力に、既存テスト `H1-01`〜`H1-06`・`H1-10`〜`H1-13`・`H1-1-01`〜`H1-1-08`・`H1-20`〜`H1-23`・`H1-25`・`H1-1-20`〜`H1-1-24` と、新規テスト `H1-2-01`〜`H1-2-06`・`H1-2-20`〜`H1-2-22` がすべて現れ通過する。
   - `H1-2-01`〜`H1-2-06` の期待値が §2.6 の表と一致し、出典コメントが記載されていることをテストコードで確認する。
4. **遅延チャンク分離**:
   - `grep -rn "scoring-table/\|ScoringTableScreen" src --include='*.ts' --include='*.tsx' | grep -v '\.test\.'` を実行し、出力が §6 の実績と同じ計 5 行基準（以下の許可行のみ、他ファイルからの参照が 0 件）であること:
     - `src/ui/App.tsx`: `lazy(() => import('./screen/ScoringTableScreen'))` の定義行および `<ScoringTableScreen />` の描画行（計 2 行）
     - `src/ui/screen/ScoringTableScreen.tsx`: `../scoring-table/scoring-table` の import 行および自身の関数定義・`export default` 行（計 3 行）
5. **バンドルサイズ実測と記録（業務標準 09）**:
   - `npm run build` 後、`dist/index.html` の `<script type="module" src>`（および `<link rel="modulepreload" href>` があればそれも）が指す JS を `gzip -9 -c <file> | wc -c` で測り、基準値（129,251 B）・実測値・増分・積算（+0〜50 B、目標 129,301 B 以下）との差・超過時の超過量と原因を PR 本文に記録する（※超過を不合格にしない）。
   - `dist/assets/ScoringTableScreen-*.js`・`dist/assets/ScoringTableScreen-*.css` の gzip -9 サイズも併せて実測・記録する。
6. **画面検証（dev サーバー。Browser pane で 375×812 にリサイズして実施。他者の dev サーバーを止めない・`pkill` 禁止）**:
   - (a) 事前準備として設定画面を開き、「段位戦ルールに戻す」ボタンが活性であれば押して既定ルール（1本場 200点・供託 1,000点・ツモ損あり）に戻す（またはブラウザの `localStorage` をクリアして再読み込みする）。主画面で自風「南」・積み棒 `0`・供託 `2` の状態からヘッダーメニューの「点数計算表」を開く: 「得点」「子」が選択状態、積み棒ステッパーが `0`（減ボタン disabled）、供託ステッパーは画面内に表示されない。30符1飜が `1,000` / `300・500`、満貫表 5飜が `8,000` / `2,000・4,000`。
   - (b) 表示切替で「点差」を選ぶ: 供託ステッパーが表示され初期値が `2`（卓の供託と連動）。供託ステッパーの `-` を 2 回押して `0`（減ボタン disabled）にすると、子 30符1飜が `-2,000` / `-1,100 / -1,300`、20符2飜が `-` / `-1,500 / -1,800`、20符1飜が空欄、満貫表 5飜が `-16,000` / `-8,000 / -10,000`。
   - (c) 「点差」のまま積み棒を `1`・供託を `1` にする: 子 30符1飜が `-3,400` / `-2,400 / -2,600`、満貫表 5飜が `-17,400` / `-9,300 / -11,300`。さらに「親」に切り替えると、親 30符1飜が `-4,400` / `-2,800`、満貫表 5飜が `-25,400` / `-13,300`。
   - (d) 表示切替で「得点」に戻す: 供託ステッパーが非表示になり、親・積み棒 `1` の得点表記（30符1飜 `1,500 は 1,700` / `500 は 600オール`、満貫表 5飜 `12,000 は 12,200` / `4,000 は 4,100オール`）が出る。再び「点差」に切り替えると供託ステッパーが `1` を保持して再表示される。
   - (e) 戻るボタンで主画面に戻る: 主画面の自風が「南」・積み棒が `0`・供託が `2` のまま変わっていない（書き戻されない）。もう一度「点数計算表」を開くと「得点」・自風「子」・積み棒 `0` で開き、「点差」に切り替えると供託が卓の `2` で再初期化されている。
   - (f) 設定画面で「ツモ損」を「ロン打点折半」・「供託」を `500` 点に変更し、主画面の自風「南」・積み棒 `0`・供託 `0` で「点数計算表」を開き「点差」に切り替える: 子 30符4飜ツモが `-11,700`（1値のみ）、満貫表 5飜ツモが `-12,000`（1値のみ）。供託ステッパーを `2` にすると 5飜ツモが `-13,000`（`+1,000` 反映）。さらに設定画面で「供託」を `0` 点に変更して主画面へ戻り、再度「点数計算表」を開く（「得点」モードかつ卓の供託 `0` で開く）。表示切替で「点差」へ切り替え、供託ステッパーの `+` を 2 回押して `2` にしたとき、子 30符1飜ロンが `-2,000`（供託加算なし）になること。確認後、設定画面の「段位戦ルールに戻す」を押してルールを既定へ戻す。
   - (g) ページ横スクロール・操作行確認: 6(c) の状態（375×812・点差モード）で `document.documentElement.scrollWidth <= 375` であり（横スクロールは `.scoring-table__scroll` 内のみ）、かつ操作行（表示切替・親子切替・積み棒ステッパー・供託ステッパー）の表示が重なり・欠けなく崩れず、すべて操作可能である（※配置・折り返しの最終調整は Q3 に従い製造後の UI 監修で確認する）。
7. **本番ビルド確認**: `npm run build && npx vite preview` で 6(b)・6(c)・6(g) を再確認し、表の罫線・満貫色分け・ステッパー・表示切替が dev と同等に効いており、遅延チャンク `ScoringTableScreen-` が画面を開いた時点で読み込まれる。
8. **ダークテーマ・HEX 禁止**:
   - アプリ内の設定画面 → テーマ「ダーク」に切り替えて（または URL に `?theme=dark` を付与する／ブラウザの `prefers-color-scheme: dark` エミュレーションを用いて）6(c) を表示し、表示切替・供託ステッパー・点差数値・`-`・満貫色分けが背景に溶けないことを目視確認する（確認後、テーマ設定を元に戻す）。
   - `git diff origin/main...HEAD -- src | grep -E '^\+.*#[0-9a-fA-F]{3,8}\b'` で新規の HEX 色指定が無いこと（目視で Issue 番号と明らかなコメント行は除外する）。
9. **ホームディレクトリ名非混入**: `git diff origin/main...HEAD | grep -n "$(basename "$HOME")"` が空である（`docs/` を含む）。
10. **後始末**: 6(f)・8 で変更したルール設定・テーマ設定が既定に戻っていることを確認し、起動した dev / preview サーバーをポート指定で停止する（業務標準 01）。

## 8. 要ヒアリング事項・設計判断の確認

ヒアリング済みの確定事項（Q1〜Q4）により仕様上の未決事項は解消済み。以下は既存 Issue #105（J1 案C）との一貫性に基づき設計担当が提案した異常系防御であり、設計承認時に併せて確認を求める:

| # | 論点 | 設計案 | 根拠・補足 |
| --- | --- | --- | --- |
| D1 | 不正な `deposit`（負数・非整数）または `depositPoint`（負数・非整数）が純関数に渡されたときの `resolveSafeInput` のフォールバック方針 | **供託系（`deposit: 0, depositPoint: 0`）のみを独立にフォールバックし、正常な本場設定は維持する**（本場系の異常時も同様に本場のみ 0 へフォールバックし、正常な供託設定は維持する） | Issue #105 J1 案C（「異常入力時は表全体を本場 0 へフォールバック」）と一貫させつつ、本場系と供託系が互いの異常に巻き込まれないようにする。通常の設定画面・`loadRule`・`ScoringTableView` 経由では到達しない |

## 9. 製造担当への注意

- `src/core/`・`src/ui/expressive/`・`src/ui/state/`・`src/ui/result/`・`src/ui/theme/tokens.css` を変更しない。
- 点数・支払額は必ず既存の `calculateBasePoint`・`calculatePayment` を呼んで算出し、点差も `payment` の出力のみから Q1 確定式で計算する（自前で基本点や端数を再計算しない）。
- テストの期待値は §2.6 の表の値（`docs/mahjong-rules.md` §3.1・§3.2・Wikipedia 四麻表と Q1 確定式から導出）を使い、実装の出力から写さない。出典コメントを必ず残す。
- 供託ステッパー（`aria-label="供託"`）は「点差」選択時のみ描画し、「得点」選択時は描画しない。
- 点差表記の負号は半角 `-`、子ツモの対子/対親区切りは ` / `、親子同額時は 1 値のみとする。
- 色は MD3 トークンのみ使用し、HEX 値を書かない。
- jsdom・Testing Library を追加しない。
- 設計承認を受けてから着手する。

## 10. コミット粒度案

1. 純関数の点差・供託対応・例外防御と純関数テストの追従・追加（`scoring-table.ts`・`scoring-table.test.ts`）
2. 画面への表示切替・供託ステッパー導入・CSS・画面テストの追従・追加（`ScoringTableScreen.tsx`・`scoring-table.css`・`ScoringTableScreen.test.tsx`）

## 11. 改訂履歴

- 第1版（2026-11-21）: 新規作成
- 第2版（2026-11-21）: 独立レビューの指摘（#1〜#4・#6）を反映（§4 へ `docs/mahjong-rules.md` への点差定義追記引き継ぎ追加、§7 6(f) 後段の `depositPoint: 0` 再表示手順具体化、§2.2 `resolveSafeInput` および §2.6 `H1-2-06` に【設計案（§8 D1・承認時に確定）】明記、§2.6 の `H1-22` 更新内容・コメント更新整合、§7 条件 4 の grep 許可 5 行基準明記）

## 12. UI 監修による変更（2026-11-21 オーナー確定）

製造後の実機プレビュー監修により、以下の変更を承認・適用した。

- **12.1（コミット `afbfb2a`）**: 「得点 / 点差」切替ボタン（`.scoring-table-screen__mode-toggle`）を `.scoring-table-screen__controls` からヘッダー 1 行目（`.app-header__inner`）の最右へ移動し、計算方式ピルをタイトル「点数計算表」のすぐ右へ配置（`margin-inline-start: 0`）。これにより 2 行目（`.scoring-table-screen__controls`）は「親/子・積み棒（・点差時は供託）」の 1 行のみとなり、点差モードでもヘッダー全体の高さと情報量がすっきり収まる構成とした（`H1-2-20` に配置検証を追加）。
- **12.2（コミット `967dd16`）**: 「得点 / 点差」切替ボタンの幅も他スイッチと揃え、最小 100px（`6.25rem`）・最大 150px（`9.375rem`）に設定。
- **12.3（コミット `8188d12`）**: ヘッダータイトル「点数計算表」の文字サイズを元の `.app-header__title`（`title-large`）へ戻した。
- **12.4（検収後・案A オーナー確定）**: `.scoring-table-screen .app-header__inner` の上下パディングを `0.5rem`、`.scoring-table-screen__back-button` を `min-width: 3rem; min-height: 3rem;` へ戻し、ヘッダー 1 行目の高さを他画面（主画面・設定画面）と同じ 64px に揃えた。
