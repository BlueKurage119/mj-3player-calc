# Issue #105 H1-1. 点数計算表への本場・供託の反映 設計書

- 親: Epic H(#100 参照・共有) / マイルストーン: v1.1
- ベースブランチ: `origin/main`（起点コミット `6978fbd`）
- 関連Issue: #101（H1. 点数計算表・実装済み）、#106（H1-2. 点数計算表への点差表示・別PRで実施）
- ブランチ: `feature/issue-105-scoring-table-honba`
- 版: 第3版（2026-11-21）
- 状態: 承認済み（2026-11-21 オーナー承認。J1〜J3 確定済み）
- 設計担当のモデル: Gemini 4 Neon (High)

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- Issue #105 本文（`gh issue view 105`）、Issue #106 本文（`gh issue view 106`）
- [docs/requirements.md](../requirements.md) §3.6（参照・共有）
- [issue-101-scoring-table.md](issue-101-scoring-table.md)（§2 設計、§3 範囲外、§4 後続への引き継ぎ、§9 UI 監修による変更）
- [docs/mahjong-rules.md](../mahjong-rules.md) §3.1（ツモ損3方式と満貫ツモ・端数処理の確定例）・§3.2（本場・供託の所定値と計算規則・例外条件）・§3.3（満貫以上）
- 既存実装:
  - `src/ui/scoring-table/scoring-table.ts`・`src/ui/scoring-table/scoring-table.test.ts`
  - `src/ui/screen/ScoringTableScreen.tsx`・`src/ui/screen/ScoringTableScreen.test.tsx`・`src/ui/screen/scoring-table.css`
  - `src/ui/expressive/Stepper.tsx`・`src/ui/expressive/stepper.css`・`src/ui/expressive/index.ts`
  - `src/ui/result/hora-summary.ts`（`formatPoints`・`formatNumber`・`TSUMO_SEPARATOR`）
  - `src/ui/result/hora/format.ts`（`payDetailLines` の `payment.honba > 0` 判定と「は」表記）
  - `src/ui/screen/MainScreen.tsx`・`src/ui/screen/SummaryCard.tsx`・`src/ui/settings/rule-help.ts`（`Stepper` 利用方法と「積み棒」呼称の統一）
  - `src/ui/settings/PresetRow.tsx`（「段位戦ルールに戻す」ボタン）・`src/ui/settings/ThemeSection.tsx`（テーマ切替「ダーク」）・`src/ui/app-mode.ts`（`?theme=dark`）
  - `src/ui/state/app-state.ts`（`STEPPER_BOUNDS.continue = [0, 99]`）・`src/ui/state/index.ts`・`src/ui/App.tsx`
  - `src/core/payment.ts`（`calculatePayment`・`Payment`・`PaymentShare`）・`src/core/bonus.ts`（`calculateTableBonus`）・`src/core/bonus.test.ts`・`src/core/rule.ts`（`HONBA_POINT_MIN`/`MAX`/`STEP`・`validateRule`）・`src/core/table.ts`
- 業務標準: [02-design-protocol.md](../rules/02-design-protocol.md)・[06-ui-md3-protocol.md](../rules/06-ui-md3-protocol.md)・[07-mahjong-rule-protocol.md](../rules/07-mahjong-rule-protocol.md)・[09-bundle-budget-protocol.md](../rules/09-bundle-budget-protocol.md)
- 指導文書: [G-09-bundle-budget-underestimate.md](../rules/advisory/G-09-bundle-budget-underestimate.md)・[G-10-design-consistency-pitfalls.md](../rules/advisory/G-10-design-consistency-pitfalls.md)

### 1.2 ヒアリング済みの確定事項（再検討・上書き禁止）

| # | 項目 | 確定内容 | 本書での反映 |
| --- | --- | --- | --- |
| 前提 | ベースブランチとPR分割 | ベースブランチは `origin/main`（v1.1対象）。#105 と #106 は別 PR で進める | ヘッダー・§3・§4 |
| Q1 | 本場込みのセル表記 | livewing/mahjong-calc 準拠の「は」表記による併記（例: ロン「1,000 は 1,200」、親ツモ「500 は 600オール」、子ツモ「300・500 は 400・600」等。本場0のときは現行どおり） | §2.2 `formatCellPayment` |
| Q2 | 供託の扱い | livewing 準拠。#105 の得点表では供託を非表示・操作なしとし、供託ステッパーおよび計算反映は #106（点差表示）で追加する | §2.2（`depositPoint` を `ScoringRule` に含めない）・§2.3・§3 |
| Q3 | 卓状態との連動と画面内ステッパー | #101 の親/子切替と統一。画面を開くたびに卓の本場（`table.continue`）を初期値として読み込み、画面内の本場ステッパーで変更しても主画面の卓には書き戻さない（ローカル状態） | §2.4・§2.5 |
| Q4 | 計算方式ラベルの色分けと操作行のレイアウト | 製造後の UI 監修で実物を見ながら決定する。設計では最小限の配置（計算方式ラベルは現行維持、親子切替＋本場ステッパーの最小構成）とし、UI 監修での変更可として記載する | §2.3（【設計案・UI監修で変更可】） |

- **版の位置づけに関する注記**: [docs/requirements.md](../requirements.md) §3.6（66行）には「本場・供託の反映と点差の表示は v2 以降(Issue #101・#105・#106)」、Issue #105 の題名・本文にも「(v2)」「Version 2 の範囲」と記載が残っているが、今回のヒアリングでオーナー確定により v1.1（`origin/main` 対象・マイルストーン v1.1）へ前倒しする方針が決まっている。要件文書および Issue 本文の整合改訂は統括担当の引き継ぎ事項とする（§4）。

### 1.3 麻雀ルール根拠とテスト期待値の出典（業務標準 07）

- **本場計算の正本**（[docs/mahjong-rules.md](../mahjong-rules.md) §3.2【確定】）:
  - 1本場あたり所定値 `honbaPoint = 200`（設定範囲: 0〜10,000点の200点単位）。
  - ロン時は放銃者が `honbaPoint × 本場数` を全額負担する（所定値で1本場 +200）。
  - ツモ時はツモられた2人が折半して各 `(honbaPoint × 本場数) / 2` を負担する（所定値で1本場 +100オール）。
  - ツモ折半の額が100点単位にならない本場設定は認めず、計算コア（`calculateTableBonus`）は例外を投げる。
  - 本場数は0以上の整数とし、それ以外は計算コアが例外を投げる。
- **不変条件の確認**: 本 Issue は `src/core/` を変更せず、既存の `calculateBasePoint`・`calculatePayment` のみを呼び出す。2m〜8m の不在・チー不在・自風（東・南・西）の不変条件に影響しない。
- **テスト期待値の出典**:
  - 申告額（本場0）の期待値: [docs/mahjong-rules.md](../mahjong-rules.md) §3.1（満貫ツモ3方式、子30符2飜・北家分折半 `800・1,300`、子30符4飜・ロン打点折半 `3,900オール`）および四麻の点数早見表（Wikipedia「麻雀の得点計算」）。
  - 本場込みの期待値: 上記申告額に対し、[docs/mahjong-rules.md](../mahjong-rules.md) §3.2 の式（ロン `+ honbaPoint × 本場数`、ツモ各 `+ (honbaPoint × 本場数) / 2`）を手計算で加算して導出する。livewing の表は検算に使わない。

### 1.4 既存コード調査で確認した設計前提

1. **`calculatePayment` と `calculateTableBonus` の仕様**（`src/core/payment.ts`・`src/core/bonus.ts`）:
   - `calculatePayment` の `rule` 引数は `Pick<Rule, 'tsumoLoss' | 'honbaPoint' | 'depositPoint'>`。
   - `table.deposit = 0` かつ `depositPoint = 0` 固定のとき、`bonus.deposit = 0`・`payment.deposit = 0`・`payment.bonus = payment.honba` となる。
   - 子のツモでは `dealer.withHonba = dealerBase + bonus.tsumoFromEach`、`nonDealer.withHonba = nonDealerBase + bonus.tsumoFromEach` と同額が加算されるため、`nonDealer.base === dealer.base` と `nonDealer.withHonba === dealer.withHonba` は常に同値である。
   - `calculateTableBonus` は、ロンでは折半検査を行わず例外を投げないが、ツモでは `(honbaPoint * table.continue) / 2` が100の倍数の整数でない場合（例: `honbaPoint: 300, continue: 1` で折半150）に例外を投げる（`src/core/bonus.test.ts` A3-TB9・A3-TB15 で確認済み）。また `table.continue` が負数・非整数の場合も例外を投げる。
   - 設定画面（`PointField` / `commitPointValue`）および起動時の `loadRule`（`validateRule`）は `honbaPoint` を `0〜10,000` の `200` 点単位の整数に制約しているため、通常操作でツモ折半例外には到達しない。
2. **既存 `Stepper` の必須挙動とアプリ内呼称**（G-10 §3 に基づく事前確認）:
   - `src/ui/expressive/Stepper.tsx` は `aria-label` を受け取り、`<fieldset aria-label={ariaLabel}>`、可視ラベル `<span className="stepper__label" aria-hidden="true">{ariaLabel}</span>`、減ボタン（`aria-label="${ariaLabel}を減らす"`、`value <= min` で `disabled`）、値表示 `<output className="stepper__value tabular-nums" aria-live="polite">{value}</output>`、増ボタン（`aria-label="${ariaLabel}を増やす"`、`value >= max` で `disabled`）を必ず描画する。
   - 主画面（`MainScreen.tsx` 185行）・要約カード（`SummaryCard.tsx` 35行）・設定画面（`rule-help.ts` 4–6行「積み棒は画面全体で共通の呼び名に揃える」）および `StepperProps` のコメントで、`table.continue` に対応する UI 呼称は **「積み棒」** に統一されている。
   - 主画面の本場ステッパーの境界値は `STEPPER_BOUNDS.continue`（`[0, 99]`、`src/ui/state/app-state.ts` 85行、`src/ui/state/index.ts` から export 済み）。
3. **画面のライフサイクルとローカル状態の再初期化**（`src/ui/App.tsx` 33–39行）:
   - `AppContent` は `screen === 'scoring-table'` の間だけ `<ScoringTableScreen />` をマウントし、主画面に戻るとアンマウントする。したがって、`ScoringTableView` 内の `useState` 初期値に卓の `table.continue` を渡せば、#101 の `dealer` と同じ仕組みで「開くたびに卓から再読み込み・変更しても卓に書き戻さない」（Q3）が成立する。
4. **既存 `ScoringTableScreen` のバンドル構成**:
   - `App.tsx` から `lazy(() => import('./screen/ScoringTableScreen'))` で遅延読み込みされている。
   - `Stepper`・`STEPPER_BOUNDS`・`formatNumber`・`formatPoints`・`TSUMO_SEPARATOR` はいずれも初回チャンク（`index-*.js`）に既存で含まれており、バレルから export 済みである。`calculateBasePoint`・`calculatePayment` は共有チャンク `payment-*.js` にある。

## 2. 設計

### 2.1 モジュール構成と変更範囲

#### 変更対象ファイル（5ファイルのみ）

| ファイル | 種別 | 変更内容 |
| --- | --- | --- |
| `src/ui/scoring-table/scoring-table.ts` | 変更（遅延チャンク） | `ScoringRule` へ `honbaPoint` 追加、`ScoringContext` へ `honba` 追加、`formatCellPayment` 追加、`resolveSafeInput` による表全体の本場0フォールバック防御追加 |
| `src/ui/scoring-table/scoring-table.test.ts` | 変更（テスト） | 既存テストの `defaultScoringRule`・`ScoringContext` 追従、本場込み表記・`honbaPoint` 連動・例外防御のテスト追加 |
| `src/ui/screen/ScoringTableScreen.tsx` | 変更（遅延チャンク） | `ScoringTableViewProps` へ `initialHonba?: number` 追加、`honba` ローカル状態と既存 `Stepper` 配置、`ScoringTableScreen` から `table.continue` を渡す |
| `src/ui/screen/ScoringTableScreen.test.tsx` | 変更（テスト） | 既存テストの `defaultRule` 追従・H1-22 更新（供託のみ非表示確認）、積み棒ステッパー初期値・境界・本場込み描画のテスト追加 |
| `src/ui/screen/scoring-table.css` | 変更（遅延チャンク CSS） | 操作行（`.scoring-table-screen__controls`）の最小限レイアウト追加（MD3 トークンのみ使用） |

#### 変更禁止ファイル

- `src/core/` 配下の全ファイル（点数は必ず既存 `calculateBasePoint`・`calculatePayment` を呼ぶ）
- `src/ui/expressive/Stepper.tsx`・`src/ui/expressive/stepper.css`・`src/ui/expressive/index.ts`（既存部品をそのまま利用する）
- `src/ui/state/app-state.ts`・`src/ui/state/AppStateProvider.tsx`（状態型・reducer・Provider を変更しない）
- `src/ui/result/hora-summary.ts`（初回 JS 側を変更しない。既存の `formatPoints`・`formatNumber`・`TSUMO_SEPARATOR` を import して使う）
- `src/ui/App.tsx`・`src/ui/screen/AppHeader.tsx`・`src/ui/screen/MainScreen.tsx`（初回 JS 側の画面・メニューを変更しない）

### 2.2 純関数（`src/ui/scoring-table/scoring-table.ts`）

#### 型定義とエクスポートシグネチャ

```ts
export const FU_LIST = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110] as const;
export const HAN_LIST = [1, 2, 3, 4] as const;

/** 点数表が参照するルール設定（Q2 により depositPoint は Issue 106 まで含めない） */
export type ScoringRule = Pick<
  Rule,
  | 'tsumoLoss'
  | 'honbaPoint'
  | 'roundedMangan'
  | 'accumlatedYakuman'
  | 'doubleWindFu'
>;

export interface ScoringContext {
  dealer: boolean;
  /** 本場数（0以上の整数） */
  honba: number;
}

// Cell・LimitKind・TableCell・LimitRow の型定義は現行どおり維持する
export type Cell =
  | { kind: 'absent' }
  | { kind: 'na' }
  | { kind: 'value'; payment: Payment; text: string };

export function formatCellPayment(payment: Payment): string;
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

#### `ScoringRule` への `honbaPoint` 追加と `depositPoint` 非追加の方針

- `ScoringRule` に `honbaPoint` を追加する（【確定】§8 J2）。
- `depositPoint` は **追加しない**。Q2 で確定したとおり #105 では供託を表示・計算せず、`table.deposit = 0`・`paymentRule.depositPoint = 0` を固定で渡す。`ScoringRule` から `depositPoint` を外しておくことで、#105 が供託設定に依存しないことを型レベルで保証する（#106 で点差・供託を追加するときに `depositPoint` を `ScoringRule` へ追加する）。
- 内部ヘルパー:
  - `buildContextTable(ctx: ScoringContext): Table` は `{ round: 'east', seat: ctx.dealer ? 'east' : 'south', continue: ctx.honba, deposit: 0 }` を返す。
  - `buildPaymentRule(rule: Pick<ScoringRule, 'tsumoLoss' | 'honbaPoint'>): PaymentRule` は `{ tsumoLoss: rule.tsumoLoss, honbaPoint: rule.honbaPoint, depositPoint: 0 }` を返す。

#### 本場込みセル表記の仕様（`formatCellPayment`・Q1 確定）

`payment.honba === 0` のとき（本場0、または `honbaPoint === 0` で加算額が0のとき）は現行どおり `formatPoints(payment, false)` を返す（「は」併記を出さない。主画面 `src/ui/result/hora/format.ts` の `payDetailLines` の `payment.honba > 0` 判定と統一）。

`payment.honba > 0` のときは、livewing/mahjong-calc 準拠の「は」表記（半角スペース＋`は`＋半角スペース）で併記する:

| パターン | 条件 | フォーマット | 例（1本場・200点） |
| --- | --- | --- | --- |
| ロン | `detail.by === 'ron'` | `${formatNumber(discarder.base)} は ${formatNumber(discarder.withHonba)}` | `1,000 は 1,200` |
| 親ツモ | `detail.by === 'tsumo' && detail.winner === 'dealer'` | `${formatNumber(eachNonDealer.base)} は ${formatNumber(eachNonDealer.withHonba)}オール` | `500 は 600オール` |
| 子ツモ（親子同額） | `detail.by === 'tsumo' && detail.winner === 'nonDealer' && nonDealer.base === dealer.base` | `${formatNumber(nonDealer.base)} は ${formatNumber(nonDealer.withHonba)}オール` | `3,900 は 4,000オール` / `4,000 は 4,100オール` |
| 子ツモ（親子異額） | 上記以外の子ツモ | `${formatNumber(nonDealer.base)}${TSUMO_SEPARATOR}${formatNumber(dealer.base)} は ${formatNumber(nonDealer.withHonba)}${TSUMO_SEPARATOR}${formatNumber(dealer.withHonba)}` | `300・500 は 400・600` |

- `formatNumber`・`formatPoints`・`TSUMO_SEPARATOR` は既存の `src/ui/result/hora-summary.ts` から import する。
- 親ツモ・子ツモ親子同額で「オール」を末尾1回だけ付ける点（`500 は 600オール` であり `500オール は 600オール` ではない）に注意する（Q1 例示と一致）。

#### `calculateTableBonus` の例外に対する純関数での防御方針（【確定】§8 J1 案C: 本場0フォールバック）

ツモ折半が100点単位にならない設定（`honbaPoint: 300, honba: 1` 等）や不正な本場数・本場点数（負数・非整数）で `calculatePayment`（内部の `calculateTableBonus` を含む）が例外を投げる場合、設定が壊れているため **表全体を本場 0（`continue: 0, honbaPoint: 0`）へフォールバック** する。

```ts
const resolveSafeInput = (
  rule: ScoringRule,
  ctx: ScoringContext
): { table: Table; paymentRule: PaymentRule } => {
  const table = buildContextTable(ctx);
  const paymentRule = buildPaymentRule(rule);
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
  - `buildFuHanTable` および `buildLimitTable` の冒頭で `const { table, paymentRule } = resolveSafeInput(rule, ctx);` を呼び、得られた安全な `table`・`paymentRule` を全セルの `makeValueCell` に渡す。
  - 表の入口で1回だけ検証して表全体を本場0へ落とすため、ロンだけ本場込み・ツモだけ本場0になる不整合が起きない。
  - `calculateTableBonus` を新規に import せず既存の `calculatePayment` のみで検証するため、依存追加がなく、`calculatePayment` 入口の `honbaPoint` 検証（0以上の整数）と `calculateTableBonus` の検証（`continue` の0以上整数・ツモ折半100点単位）を漏れなく1回で検証できる。
  - フォールバック時に `continue: 0` と `honbaPoint: 0` の両方を 0 に戻すため、`honbaPoint` 自体が負数・非整数の場合でも後続の `makeValueCell` で再度例外が出ず、セル単位の冗長な `try/catch` は不要となる。
  - 正常な設定画面・`loadRule` 経由では `honbaPoint` は200点単位、`honba` は0〜99の整数に制約されるため本フォールバックには到達しない。

### 2.3 画面構成【設計案・UI 監修で変更可】

Q4 の確定事項に従い、最小限の構成とする。計算方式ラベルの色分けおよび操作行の詳細レイアウト・ラベル文言は、製造後の UI 監修で実物を見ながら決定する。

上から順に:

1. **ヘッダー（現行維持）**: 戻るボタン（`aria-label="戻る"`）、題「点数計算表」、右端の計算方式ラベル（`.scoring-table-screen__rule-label`、現行の色・配置を維持）。
2. **操作行（`.scoring-table-screen__controls`）**: 親子切替と本場ステッパーの最小構成。
   - **親子切替**: 現行の `ConnectedButtonGroup<'dealer' | 'child'>`（「親」「子」）。
   - **本場ステッパー**: 既存の `Stepper`（`src/ui/expressive/Stepper.tsx`）をそのまま使用する。
     - `aria-label="積み棒"`（主画面 `MainScreen.tsx`・要約カード `SummaryCard.tsx`・設定画面 `rule-help.ts` の「画面全体で共通の呼び名に揃える」方針に準拠。【確定】§8 J3、UI 監修で変更可）
     - `value={honba}`
     - `min={STEPPER_BOUNDS.continue[0]}`（`0`）
     - `max={STEPPER_BOUNDS.continue[1]}`（`99`）
     - `onStep={delta => setHonba(prev => clampHonba(prev + delta))}`
   - **最小レイアウト案（CSS）**: `.scoring-table-screen__controls` を `display: flex; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap;` とし、親子切替に `flex: 1 1 10rem;`、ステッパーに `flex: 0 0 auto;` を与える（375px 幅のコンテンツ内幅 343px に対し、ステッパー幅約 120px・gap 12px・親子切替約 211px で1行に収まる見込みであり、さらに狭い幅でも安全に折り返す）。
   - **供託は非表示・操作なし**（Q2）。供託ステッパーや供託表示は一切置かない。
3. **1〜4飜 × 符の表（現行構造維持）**: 各セルは上段=ロン、下段=ツモ。本場0は現行どおり、本場1以上（かつ `honbaPoint > 0`）は「は」併記テキストを表示する。表全体は `.scoring-table__scroll`（`overflow-x: auto`）内で横スクロールし、左端の符列は `position: sticky; left: 0;` を維持する。
4. **満貫以上の表（現行構造維持）**: `.scoring-table__scroll` 内で横スクロールし、ロン列・ツモ列に `row.ron.text` / `row.tsumo.text`（`kind !== 'value'` は `-`）を表示する。
5. **制約の遵守（業務標準 06）**:
   - 色はすべて MD3 トークン（`--md-sys-color-*`）のみを使用し、HEX 値を一切書かない。
   - 数値表示には `tabular-nums` を維持する（`Stepper` の `<output>` および表セルの双方に付与済み）。
   - 見ればわかる説明書き・注記（「本場込みは右に表示」等）は置かない。

### 2.4 状態と遷移（`src/ui/screen/ScoringTableScreen.tsx`）

```ts
export interface ScoringTableViewProps {
  seat: Wind;
  rule: ScoringRule;
  initialDealer?: boolean;
  /** 初期の本場数（省略時 0。STEPPER_BOUNDS.continue の範囲にクランプする） */
  initialHonba?: number;
  onBack: () => void;
}
```

- 初期値のクランプ（画面内ヘルパー `clampHonba`）:
  ```ts
  const [HONBA_MIN, HONBA_MAX] = STEPPER_BOUNDS.continue;
  const clampHonba = (value: number): number => {
    if (!Number.isFinite(value)) return HONBA_MIN;
    return Math.min(HONBA_MAX, Math.max(HONBA_MIN, Math.trunc(value)));
  };
  ```
- `ScoringTableView` 内のローカル状態:
  - `dealer`: 現行どおり `useState<boolean>(() => initialDealer ?? seat === 'east')`
  - `honba`: `useState<number>(() => clampHonba(initialHonba ?? 0))`
  - `buildFuHanTable(rule, { dealer, honba })`、`buildLimitTable(rule, { dealer, honba })` を呼ぶ。
- `ScoringTableScreen`（`export default`）:
  - `useAppState()` から `{ table, rule }` を読み、`<ScoringTableView seat={table.seat} rule={rule} initialHonba={table.continue} onBack={() => dispatch({ type: 'navigate', screen: 'main' })} />` を返す。
  - 卓状態への書き戻しアクション（`step` 等）は一切 dispatch しない（Q3）。

### 2.5 卓・ルールとの連動の整理

| 項目 | #105 での扱い | 状態 |
| --- | --- | --- |
| 自風（`table.seat` → 親/子） | 画面を開くたびに初期値として連動。画面内変更は卓に書き戻さない | 【確定】#101 Q3 |
| 本場数（`table.continue`） | 画面を開くたびに初期値として連動。画面内ステッパー（0〜99）で変更しても卓に書き戻さない | 【確定】#105 Q3 |
| 供託本数（`table.deposit`）・`rule.depositPoint` | 非表示・操作なし・連動しない（#106 で対応） | 【確定】#105 Q2 |
| `rule.honbaPoint` | 連動（0〜10,000点・200点単位。0のときは加算0のため「は」併記なし） | 【確定】§8 J2 |
| `rule.tsumoLoss`・`roundedMangan`・`accumlatedYakuman`・`doubleWindFu` | 現行どおり連動 | 【確定】#101 |

### 2.6 テスト計画（jsdom 不要・Vitest）

既存テスト `H1-01`〜`H1-06`・`H1-10`〜`H1-13`・`H1-20`〜`H1-23`・`H1-25` は維持しつつ、以下を追従・追加する。テストコードには必ず出典コメントを残す（業務標準 07）。

#### 既存テストの追従

- `src/ui/scoring-table/scoring-table.test.ts`:
  - `defaultScoringRule()` に `honbaPoint: rule.honbaPoint` を追加。
  - `H1-02`〜`H1-06`・`H1-10`〜`H1-12` の `ScoringContext` に `honba: 0` を明示する（本場0での既存期待値が1文字も変わらないことの回帰検証になる）。
- `src/ui/screen/ScoringTableScreen.test.tsx`:
  - `defaultRule()` に `honbaPoint: rule.honbaPoint` を追加。
  - `H1-22`: テスト名を「供託の文字が描画結果に出ない」に更新し、`expect(html.includes('供託')).toBe(false)` を検証する（#105 では本場を導入し供託のみ範囲外のため）。

#### 新規テスト: 純関数（`src/ui/scoring-table/scoring-table.test.ts`）

| ID | 条件 | 期待値（出典: §1.3） |
| --- | --- | --- |
| H1-1-01 | 子・ツモ損あり・1本場・`honbaPoint: 200` | 30符1飜: ロン `1,000 は 1,200`・ツモ `300・500 は 400・600` / 30符4飜: ロン `7,700 は 7,900`・ツモ `2,000・3,900 は 2,100・4,000` / 20符2飜: ロン `na`・ツモ `400・700 は 500・800` / 20符1飜: 両方 `absent` |
| H1-1-02 | 親・ツモ損あり・1本場・`honbaPoint: 200` | 30符1飜: ロン `1,500 は 1,700`・ツモ `500 は 600オール` / 30符4飜: ロン `11,600 は 11,800`・ツモ `3,900 は 4,000オール` |
| H1-1-03 | 子・北家分折半 / ロン打点折半・1本場・`honbaPoint: 200` | 北家分折半 30符2飜ツモ: `800・1,300 は 900・1,400` / ロン打点折半 30符4飜ツモ: `3,900 は 4,000オール`（子ツモ親子同額の「オール」表記） |
| H1-1-04 | 満貫表・3方式×親子・2本場・`honbaPoint: 200` | 5飜: ツモ損あり(子 ロン `8,000 は 8,400`・ツモ `2,000・4,000 は 2,200・4,200` / 親 ロン `12,000 は 12,400`・ツモ `4,000 は 4,200オール`)、北家分折半(子ツモ `3,000・5,000 は 3,200・5,200` / 親ツモ `6,000 は 6,200オール`)、ロン打点折半(子ツモ `4,000 は 4,200オール` / 親ツモ `6,000 は 6,200オール`)、13飜以上(子・ツモ損あり: ロン `32,000 は 32,400`・ツモ `8,000・16,000 は 8,200・16,200`) |
| H1-1-05 | `honbaPoint` ルール連動（`400`・`0`） | `honbaPoint: 400`・1本場・子30符1飜: ロン `1,000 は 1,400`・ツモ `300・500 は 500・700` / `honbaPoint: 0`・2本場・子30符1飜: ロン `1,000`・ツモ `300・500`（「は」が付かない） |
| H1-1-06 | `calculateTableBonus` 例外防御（§8 J1 案C: 本場0フォールバック。`honbaPoint: 300`・1本場/2本場、および負数・非整数 `honba`・負数 `honbaPoint`） | `honbaPoint: 300, honba: 1`（子）: 例外を投げず表全体が本場0フォールバックとなり、30符1飜ロン `1,000`・ツモ `300・500`、満貫表5飜ロン `8,000`・ツモ `2,000・4,000` / `honbaPoint: 300, honba: 2`（子）: 折半300で100点単位のため正常に本場込みとなり、30符1飜ロン `1,000 は 1,600`・ツモ `300・500 は 600・800` / `honba: -1`・`honba: 1.5`・`honbaPoint: -200`（子）: 例外を投げず本場0フォールバックとなり、30符1飜ロン `1,000`・ツモ `300・500`、満貫表5飜ロン `8,000`・ツモ `2,000・4,000` |

#### 新規テスト: 画面（`src/ui/screen/ScoringTableScreen.test.tsx`、`renderToStaticMarkup`）

| ID | 内容 |
| --- | --- |
| H1-1-20 | `Stepper`（「積み棒」）が描画され、`initialHonba` 省略時は値 `0`・減ボタン `disabled`・増ボタン活性、`initialHonba={99}` では値 `99`・増ボタン `disabled`・減ボタン活性、範囲外（`-1`・`120`）は `0`・`99` にクランプされる |
| H1-1-21 | `initialHonba={1}`（子・既定ルール）の描画結果に `1,000 は 1,200`・`300・500 は 400・600`・`8,000 は 8,200` が含まれ、`initialHonba={1}`（親・既定ルール）に `500 は 600オール` が含まれる |
| H1-1-22 | `initialHonba={0}` の描画結果に ` は ` が含まれず、`1,000`・`300・500`（子）や `500オール`（親）が出る |

### 2.7 初回 JS バンドル目標値（業務標準 09）

- **基準値（`origin/main` `6978fbd` 実測値）**: **129,235 B**（`dist/assets/index-yXw5paay.js`、`gzip -9 -c | wc -c`、`modulepreload` なし）。
  - 注記: 業務標準 09 に記載されている v1.0.0 時点の基準値 128,883 B との差（+352 B）は、v1.0.0 以降 `6978fbd` までに `main` へ入った既存変更によるもの。本書は最新の `origin/main` 実測値を基準値とする。
- **初回 JS 増分の積算**:
  - 初回チャンク側のソースファイル（`App.tsx`・`AppHeader.tsx`・`MainScreen.tsx`・`Stepper.tsx`・`app-state.ts`・`hora-summary.ts`）は一切変更しない。
  - `ScoringTableScreen`（遅延チャンク）が初回チャンク内の既存モジュールから `Stepper`・`STEPPER_BOUNDS`・`formatNumber`・`TSUMO_SEPARATOR` を新たに参照するため、Rollup/Vite のチャンク間共有用 `export` バインディング追加およびハッシュ文字列変化による微増のみが見込まれる: **+0〜100 B**。
- **目標値**: 初回 JS **129,335 B 以下**（基準値 129,235 B + 100 B）。※業務標準 09 に従い、超過を理由に検収を不合格にしない。製造担当の最終報告および検収担当の PR 本文に、基準値・実測値・増分・積算との差・超過時の超過量と原因を記録する。
- **遅延チャンクの見込み（参考・合計外）**:
  - `ScoringTableScreen-*.js`: 基準 **1,772 B** + 増分見込み **+300〜600 B**（`formatCellPayment`・`resolveSafeInput`・`honba` state・`<Stepper>` 呼び出し）→ 見込み **約 2,070〜2,370 B**（gzip -9）。
  - `ScoringTableScreen-*.css`: 基準 **899 B** + 増分見込み **+30〜100 B**（操作行レイアウト）→ 見込み **約 930〜1,000 B**（gzip -9）。
  - `payment-*.js`: 基準 **1,023 B**（変更なし見込み）。

## 3. 範囲外

- **供託の表示・操作・計算反映**（Q2 確定。Issue #106 で点差表示とあわせて実装する）。
- **点差表示**（Issue #106、別 PR で実施）。
- **画面内での本場変更を主画面の卓（`state.table.continue`）へ書き戻すこと**、および切替状態の永続化（Q3 確定）。
- **計算方式ラベルの色分け・操作行の最終デザイン決定**（Q4 確定。製造後の UI 監修で実物を見て決定する）。
- **`src/core/`・`Stepper.tsx`・`app-state.ts` の変更**。

## 4. 後続 Issue・統括担当への引き継ぎ事項

- **統括担当による既存文書の整合改訂**:
  - [docs/requirements.md](../requirements.md) §3.6（66行）の「本場・供託の反映と点差の表示は v2 以降(Issue #101・#105・#106)」は、今回のオーナー確定（#105・#106 を v1.1 対象へ前倒し）と食い違っているため、統括担当にて改訂すること（あわせて必要に応じて Issue #105 本文の「(v2)」「Version 2 の範囲」表記も整理する）。
  - マージ後、[09-bundle-budget-protocol.md](../rules/09-bundle-budget-protocol.md) の初回 JS 基準値を最新実測値で更新すること。
- **Issue #106（H1-2. 点数計算表への点差表示）**:
  - 供託ステッパーの追加と計算反映を #106 で行う（Q2）。その際、`ScoringRule` に `depositPoint` を、`ScoringContext` に `deposit: number` を追加し、`ScoringTableViewProps` に `initialDeposit?: number` を追加して `ScoringTableScreen` から `table.deposit` を渡す形に拡張できる。
  - `Cell` の `{ kind: 'value'; payment: Payment; text: string }` は `payment` をそのまま保持しているため、点差計算（`pointDiffRows` 相当）への拡張が容易である。
- **製造後の UI 監修（Q4）で確認・調整する事項**:
  - 計算方式ラベル（ツモ損あり / 北家分折半 / ロン打点折半）の色分けの有無とトークン選定（#101 の検討メモ: 満貫以上の container 背景との衝突を避け、枠線と文字色で識別する案等）。
  - 操作行（親子切替・積み棒ステッパー）の並び（1行横並び vs 縦並び）およびステッパーラベル（「積み棒」維持 vs 「本場」）。
  - 375px 幅で本場1以上にしたときの「は」表記（例: `2,000・3,900 は 2,100・4,000`）の見やすさ・横スクロール感、および満貫表左列（飜列）の `sticky` 固定要否。

## 5. 実挙動未確認

- 375px 幅の実画面で、本場1以上にした際の「は」表記のセル幅・横スクロール量・操作行（親子切替＋積み棒ステッパー）の1行収まりや見た目は実装前のため**実挙動未確認**（崩れず操作可能であることは検収項目 6(g) で確認し、1行収まり・配置の最終調整は Q4 に従い UI 監修で確認する）。
- 実装後の初回 JS 増分・遅延チャンク `ScoringTableScreen-*.js` / `.css` のサイズは見積りであり、**実挙動未確認**（製造・検収のビルドで実測する）。

## 6. 外部事実の確認記録

本設計が前提とする事実を以下のコマンド実行で確認した。新規の外部パッケージ・GitHub Actions・コンテナイメージの導入はなし。

| 対象 | 実行コマンド | 確認結果 |
| --- | --- | --- |
| ベースブランチの整合 | `git rev-parse HEAD origin/main` | 両者とも `6978fbde988f6a1f2cffa2309fe38099c04d2b3b` で一致 |
| Issue #105・#106 の要件 | `gh issue view 105 --comments` / `gh issue view 106 --comments` | 親 #100、マイルストーン v1.1、本文および未決事項を確認 |
| 初回 JS 基準値と遅延チャンク構成（`origin/main` `6978fbd`） | `npm run build`（Node v24.20.0・Vite v6.4.4）→ `cat dist/index.html` → `gzip -9 -c <file> \| wc -c` | `dist/index.html` の初回 JS は `dist/assets/index-yXw5paay.js` のみ（`modulepreload` なし）。gzip -9 サイズ: `index-yXw5paay.js` = **129,235 B**、`ScoringTableScreen-DllJ4dnw.js` = **1,772 B**、`ScoringTableScreen-D--7tfCZ.css` = **899 B**、`payment-UxFzoWqs.js` = **1,023 B** |
| 既存関連テストの通過 | `npx vitest run src/ui/scoring-table src/ui/screen/ScoringTableScreen.test.tsx src/core/bonus.test.ts` | 3ファイル・30テストすべて通過（Vitest v3.2.7） |
| 遅延チャンク参照箇所の現状 | `grep -rn "scoring-table/\|ScoringTableScreen" src --include='*.ts' --include='*.tsx' \| grep -v '\.test\.'` | `src/ui/App.tsx`（12・36行）と `src/ui/screen/ScoringTableScreen.tsx`（14・188・201行）の計5行のみ |

## 7. 受け入れ条件チェックリスト

検収担当は上から1項目ずつ実行し、すべて通過した場合のみ PR を作成する。

1. **静的検査・全テスト**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて終了コード 0 で通過する。
2. **変更範囲の制約**:
   - `git diff --stat origin/main...HEAD -- src/core src/ui/expressive src/ui/state src/ui/result src/ui/App.tsx src/ui/screen/AppHeader.tsx src/ui/screen/MainScreen.tsx` が空である。
   - `git diff --name-only origin/main...HEAD` の出力が、以下の計 10 ファイル（当初 §2.1 の 5 ファイル＋§12 UI 監修でオーナー承認された 5 ファイル）の範囲内に収まっている:
     - `src/ui/scoring-table/scoring-table.ts`
     - `src/ui/scoring-table/scoring-table.test.ts`
     - `src/ui/screen/ScoringTableScreen.tsx`
     - `src/ui/screen/ScoringTableScreen.test.tsx`
     - `src/ui/screen/scoring-table.css`
     - `scripts/gen-theme-tokens.ts`（§12.4 承認）
     - `src/ui/theme/tokens.css`（§12.4 `npm run gen:theme` 再生成）
     - `src/ui/theme/tokens.test.ts`（§12.4 追従）
     - `docs/rules/06-ui-md3-protocol.md`（§12.4 仕様追記）
     - `docs/design/issue-105-scoring-table-honba.md`（本設計書）
3. **単体テストの網羅と出典**:
   - `npx vitest run src/ui/scoring-table src/ui/screen/ScoringTableScreen.test.tsx` の出力に、既存テスト `H1-01`〜`H1-06`・`H1-10`〜`H1-13`・`H1-20`〜`H1-23`・`H1-25` と、新規テスト `H1-1-01`〜`H1-1-06`・`H1-1-20`〜`H1-1-22` がすべて現れ通過する。
   - `H1-1-01`〜`H1-1-06` の期待値が §2.6 の表と一致し、出典コメントが記載されていることをテストコードで確認する。
4. **遅延チャンク分離**:
   - `grep -rn "scoring-table/\|ScoringTableScreen" src --include='*.ts' --include='*.tsx' | grep -v '\.test\.'` を実行し、出力が以下の参照のみであること（他ファイルからの参照が 0 件であること）:
     - `src/ui/App.tsx`: `lazy(() => import('./screen/ScoringTableScreen'))` の定義行および `<ScoringTableScreen />` の描画行
     - `src/ui/screen/ScoringTableScreen.tsx`: `../scoring-table/scoring-table` の import 行および自身の関数定義・`export default` 行
5. **バンドルサイズ実測と記録（業務標準 09）**:
   - `npm run build` 後、`dist/index.html` の `<script type="module" src>`（および `<link rel="modulepreload" href>` があればそれも）が指す JS を `gzip -9 -c <file> | wc -c` で測り、基準値（129,235 B）・実測値・増分・積算（+0〜100 B、目標 129,335 B 以下）との差・超過時の超過量と原因を PR 本文に記録する（※超過を不合格にしない）。
   - `dist/assets/ScoringTableScreen-*.js`・`dist/assets/ScoringTableScreen-*.css` の gzip -9 サイズも併せて実測・記録する。
6. **画面検証（dev サーバー。Browser pane で 375×812 にリサイズして実施。他者の dev サーバーを止めない・`pkill` 禁止）**:
   - (a) 事前準備として設定画面を開き、「段位戦ルールに戻す」ボタンが活性であれば押して既定ルール（1本場 200点・ツモ損あり）に戻す（またはブラウザの `localStorage` をクリアして再読み込みする）。そのうえで、主画面の自風「南」・積み棒 `0`・供託 `2` の状態からヘッダーメニューの「点数計算表」を開く: 「子」が選択状態、積み棒ステッパーが `0`（減ボタン disabled）、供託の表示・操作が画面内に一切無い。30符1飜が `1,000` / `300・500`（「は」表記なし）。
   - (b) 点数計算表画面のまま積み棒ステッパーの `+` を 1 回押す（値 `1`）:
     - 1〜4飜表の 30符1飜が `1,000 は 1,200` / `300・500 は 400・600`、20符2飜が `-` / `400・700 は 500・800`、20符1飜が空欄のまま。
     - 満貫表の 5飜が `8,000 は 8,200` / `2,000・4,000 は 2,100・4,100`。
   - (c) 「親」に切り替える（値 `1` のまま）: 30符1飜が `1,500 は 1,700` / `500 は 600オール`、満貫表 5飜が `12,000 は 12,200` / `4,000 は 4,100オール`。
   - (d) 戻るボタンで主画面に戻る: 主画面の積み棒が `0`・自風が「南」・供託が `2` のまま変わっていない（書き戻されない）。
   - (e) 主画面で積み棒を `2` にしてから再度「点数計算表」を開く: 積み棒ステッパーの初期値が `2` になっており、子 30符1飜が `1,000 は 1,400` / `300・500 は 500・700`、満貫表 5飜が `8,000 は 8,400` / `2,000・4,000 は 2,200・4,200`。
   - (f) 設定画面で「ツモ損」を「ロン打点折半」・「積み棒」を `400` 点に変更し、主画面の積み棒 `1`・自風「南」で「点数計算表」を開く: 30符1飜ロンが `1,000 は 1,400`、30符4飜ツモが `3,900 は 4,100オール`、満貫表 5飜ツモが `4,000 は 4,200オール`。さらに設定画面で「積み棒」を `0` 点にして開くと、本場 `1` でも 30符1飜ロンが `1,000`（「は」表記なし）。確認後、設定画面の「段位戦ルールに戻す」を押してルールを既定へ戻す。
   - (g) ページ横スクロール・操作行確認: 6(b) の状態（375×812）で `document.documentElement.scrollWidth <= 375` であり（横スクロールは `.scoring-table__scroll` 内のみ）、かつ操作行（親子切替・積み棒ステッパー）の表示が重なり・欠けなく崩れず、どちらも操作可能である（※1行収まりや配置・色分けの最終調整は Q4 に従い製造後の UI 監修で確認する）。
7. **本番ビルド確認**: `npm run build && npx vite preview` で 6(b)・6(c)・6(g) を再確認し、表の罫線・満貫色分け・ステッパー表示が dev と同等に効いており、遅延チャンク `ScoringTableScreen-` が画面を開いた時点で読み込まれる。
8. **ダークテーマ・HEX 禁止**:
   - アプリ内の設定画面 → テーマ「ダーク」に切り替えて（または URL に `?theme=dark` を付与する／ブラウザの `prefers-color-scheme: dark` エミュレーションを用いて）6(b)・6(c) を表示し、ステッパー・数値・「は」表記・`-`・満貫色分けが背景に溶けないことを目視確認する（確認後、テーマ設定を元に戻す）。
   - `git diff origin/main...HEAD -- src | grep -E '^\+.*#[0-9a-fA-F]{3,8}\b'` で新規の HEX 色指定が無いこと（目視で Issue 番号と明らかなコメント行は除外する）。
9. **ホームディレクトリ名非混入**: `git diff origin/main...HEAD | grep -n "$(basename "$HOME")"` が空である（`docs/` を含む）。
10. **後始末**: 6(f)・8 で変更したルール設定・テーマ設定が既定に戻っていることを確認し、起動した dev / preview サーバーをポート指定で停止する（業務標準 01）。

## 8. ユーザー判断事項（すべて確定済み。オーナー確定 2026-11-21）

| # | 論点 | 確定 | 根拠・補足 |
| --- | --- | --- | --- |
| J1 | ツモ折半が100点単位にならない設定（`calculateTableBonus` 例外、`honbaPoint: 300, honba: 1` 等）や不正な本場数・本場点数に対する純関数での防御方針 | **案C: 表全体を本場 0（`continue: 0, honbaPoint: 0`）にフォールバック** | 設定が壊れている異常系のため、入口で `calculatePayment(2000, table, 'tsumo', paymentRule)` により事前検証し、例外時はロン・ツモとも本場0に揃えて表示する（不整合・画面クラッシュを防止。通常の設定画面・`loadRule` 経由では到達しない） |
| J2 | ルール設定の `rule.honbaPoint`（1本場あたりの点数、0〜10,000点・200点単位）を表に連動するか | **案A: 連動する** | `ScoringRule` に `honbaPoint` を追加。`0` 点時は加算0のため「は」併記を出さない。主画面の和了結果およびルール正本 §3.2 と一致する |
| J3 | 本場ステッパーの表示ラベル（`Stepper` の `aria-label`） | **案A: 「積み棒」**（製造後の UI 監修で変更可） | 主画面 `MainScreen.tsx`・要約カード・設定画面 `rule-help.ts` のアプリ全体統一呼称に揃える |

## 9. 製造担当への注意

- `src/core/`・`src/ui/expressive/Stepper.tsx`・`src/ui/state/app-state.ts`・`src/ui/result/hora-summary.ts` を変更しない。
- 点数は必ず `calculateBasePoint`・`calculatePayment` を呼んで算出し、自前で加算しない。
- テストの期待値は §2.6 の表の値（`docs/mahjong-rules.md` §3.1・§3.2・Wikipedia 四麻表から導出）を使い、実装の出力から写さない。出典コメントを必ず残す。
- 親ツモおよび子ツモ親子同額の本場込み表記は `500 は 600オール` / `4,000 は 4,100オール`（「オール」は末尾1回のみ）とする。
- 色は MD3 トークンのみ使用し、HEX 値を書かない。
- jsdom・Testing Library を追加しない。
- 設計承認を受けてから着手する。

## 10. コミット粒度案

1. 純関数の本場対応・例外防御と純関数テストの追従・追加（`scoring-table.ts`・`scoring-table.test.ts`）
2. 画面への積み棒ステッパー導入・CSS・画面テストの追従・追加（`ScoringTableScreen.tsx`・`scoring-table.css`・`ScoringTableScreen.test.tsx`）

## 11. 改訂履歴

- 第1版（2026-11-21）: 新規作成
- 第2版（2026-11-21）: 独立レビューの指摘（H-1・M-1・M-2・L-1〜L-4）を反映（コード例コメントの `#106` 除去と §9 への注意事項追記、例外防御と `honbaPoint` 連動を【設計案】化し §8 ユーザー判断事項を新設、`docs/requirements.md` §3.6 との版表記差の注記・引き継ぎ追記、受け入れ条件 2・4・6・8・10 の手順とコマンド具体化、§5 と条件 6(g) の対応整理）
- 第3版（2026-11-21）: オーナー判断を反映（J1=案C「表全体を本場0へフォールバック」を `resolveSafeInput` 設計・テスト `H1-1-06` に反映、J2=案A・J3=案A を確定、§8 をすべて確定済みに更新、受け入れ条件 8 の HEX 検査に Issue 番号コメントの目視除外を追記し §9 のコメント制限を削除）

## 12. UI 監修による変更（2026-11-21 オーナー確定）

製造後の実機プレビュー監修により、以下の変更を承認・適用した（受け入れ条件 2 の変更ファイル範囲および条件 3 のテスト一覧にはこれらを含む）。

- **12.1（コミット `5462f0e`）**: 操作行の親子トグルをコンパクトにし、積み棒ステッパー（および #106 の供託予定地）を `.scoring-table-screen__steppers` で広く確保。ヘッダー右端の計算方式ピルに `data-tsumo-loss` を付与し、`north-split`・`ron-split` を `--md-sys-color-primary-container` / `--md-sys-color-on-primary-container` で強調（テスト `H1-1-23` 追加）。
- **12.2（コミット `ac7bfd9`）**: 親子トグル・積み棒ステッパー幅を約 100px（`6.25rem`）に揃え、満貫以上の色階調をシームレスに整理（倍満を `quaternary-container` へ変更）。`roundedMangan: false` の 30符4飜・60符3飜に `limit: 'near-mangan'` を付与して薄い満貫色（`tertiary-container` 42% ミックス）で塗る（テスト `H1-1-07` 追加）。1〜4飜表のロン打点の文字サイズを `--md-sys-typescale-body-medium-size`（14px 相当）に拡大。
- **12.3（コミット `54c4052`）**: 満貫表の `LimitRow` に `name`（満貫・跳満・倍満・三倍満・役満）を追加して飜数と 2 段表示（テスト `H1-1-08`・`H1-1-24` 追加）。操作行を中央揃え（`justify-content: center`）＋各コントロール幅を最小 100px（`6.25rem`）〜最大 150px（`9.375rem`）に調整。
- **12.4（コミット `ec1110c`・案A オーナー承認）**:
  - `scripts/gen-theme-tokens.ts` に `quinary`（-120°・朱赤系）・`senary`（-180°・紫系）各 4 ロールを追加し、`npm run gen:theme` で `src/ui/theme/tokens.css` を再生成（`npm run check:theme` 通過、`src/ui/theme/tokens.test.ts` の `C1-K03` を 53 → 61 役割に更新、`docs/rules/06-ui-md3-protocol.md` へ仕様追記）。三倍満を `quinary-container`、役満を `senary-container` に適用。
  - 満貫表のロン・ツモ全体の文字サイズを `--md-sys-typescale-body-medium-size`（14px 相当）に統一。
  - 操作行を `<header className="app-header">` 内に統合してヘッダーと一体で上部固定（`position: sticky; top: 0`）にし、ボタン高さを `2.5rem`（40px）に抑えて下端に区切り線（`--md-sys-color-outline-variant`）を追加。なお、アプリ全体のヘッダー下端部の統一仕上げは Issue #142 として別途起案済み。
