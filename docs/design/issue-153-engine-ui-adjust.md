# Issue #153 計算画面のUI調整（計算中の表示・手牌の副露表示と理牌）設計書

- 状態: 第2版（独立レビュー指摘反映済み・設計承認待ち）
- 設計担当モデル: Gemini 4 Neon (Medium)
- 対象 Issue: #153（計算画面のUI調整：計算中の表示・手牌の副露表示と理牌）
- 作業ブランチ予定: `feature/issue-153-engine-ui-adjust`（`origin/develop/v2.0` `62c62a0` 起点、PR base は `develop/v2.0`）
- UI 監修: 製造完了後・検収（PR 発行）前に、ローカル実画面での UI 監修を実施予定

## 1. 目的と参照資料・設計判断の根拠

確率・期待値の計算画面（`EngineScreen` / `EngineView`）において、以下の3点を調整する。

1. 対象手牌の表示を、門前手牌の全牌理牌と副露グループ分け（暗槓は両端裏牌の4枚表示）・1行収まり縮小（`useFitTiles`）に揃える。
2. 計算中の表示を、操作行の下（結果エリア）に MD3 Expressive 調のローディングインジケータ（自作）＋「計算中…」＋経過時間の縦積み中央寄せ（カード枠なし）へ刷新する。
3. 「時間がかかります」の注意表示を、計算前（`run.status === 'idle'`）のみに限定する。

### 1.1 参照した資料

| 資料 | 確認した内容 |
| --- | --- |
| `gh issue view 153` | Issue #153 の前提・確定方針・範囲外・開発ブランチ方針 |
| `docs/rules/02-design-protocol.md` | 設計フェーズの権限境界・必須記載項目1〜6・成果物制約 |
| `docs/rules/06-ui-md3-protocol.md` | 色・形状・モーション・タイポグラフィの MD3 トークン制約、`src/ui/expressive/` への自作配置規約、bare import 禁止 |
| `docs/rules/09-bundle-budget-protocol.md` | 初回 JS バンドル目標値の計測・積算・報告ルール |
| `docs/rules/advisory/G-01-hearing-first-design.md` | ヒアリング前提の設計方針・設計書粒度 |
| `docs/rules/advisory/G-10-design-consistency-pitfalls.md` | 内部矛盾・共用部品の強制挙動・外部事実の裏取りに関する注意点 |
| `src/ui/screen/EngineScreen.tsx` | 現行は `hand` と `instantiateMeld(m, app.rule.red)` を単純結合して `tiles` として `EngineView` へ渡している |
| `src/ui/engine/EngineView.tsx`・`src/ui/engine/engine.css` | 現行の固定カード（`data-stuck="true"` の `1.5rem` ↔ `1.25rem`）、`GlanceTiles` + `100cqw` 縮小、`props.slow` 無条件表示、`.engine-spinner` |
| `src/ui/engine/engine-run.ts` | `visibleRunState` は `done` かつ `key` 不一致のみ `idle` に戻す（`failed` は維持） |
| `src/ui/screen/SummaryCard.tsx`・`src/ui/screen/main-screen.css` | `SummaryHandRow` の DOM 構造（`.summary-card__tiles`・`.summary-card__meld`）および `fitTileRow` / `useFitTiles` の実装 |
| `src/ui/screen/MeldArea.tsx` | `meldTiles(meld, red)` の実装（暗槓は `[{ type: 'back' }, third, fourth, { type: 'back' }]`、未入力副露は `[]`） |
| `src/ui/tile/tile-image.ts` | `tileLabelOf` は `{ type: 'back' }` に対して `'裏'` を返す（L133-136） |
| `src/core/tile/index.ts` | `compareTiles` の牌種順・赤五対応ソート仕様 |
| `src/ui/theme/static-tokens.css` | 形状・モーション・タイポグラフィの静的トークン定義 |
| `src/ui/expressive/index.ts`・`Disclosure.tsx` | `src/ui/expressive/` のバレル構成と tree-shaking によるチャンク分離の実態 |
| `src/ui/engine/engine-view.test.tsx`・`src/ui/screen/EngineScreen.test.tsx`・`src/ui/screen/SummaryCard.test.tsx` | 既存テストの検証対象クラス・属性（変更に伴うテスト更新箇所の特定） |

### 1.2 ヒアリング済みの確定事項（前提・再検討しない）

1. **手牌の理牌**: 門前手牌（`hand`）は 13 枚・14 枚いずれの場合も、`compareTiles` で全牌理牌（牌種順・赤五対応）して表示する（14 枚目の切り離しは行わない）。
2. **副露の表示**: `SummaryCard` の `SummaryHandRow` と同じ流儀に揃える。門前手牌の右側に余白を空けて副露をグループ単位で並べ、副露同士にも区切り余白を入れる。暗槓は `meldTiles`（両端が裏牌の4枚表示）を使用する。
3. **副露を含む手牌の1行収まり（縮小計算）**: `SummaryCard` の `useFitTiles`（JS 実測 + `ResizeObserver`）を共通化して使用する（固定中 `data-stuck="true"` の `1.5rem` ↔ `1.25rem` 遷移との整合を含める）。
4. **MD3 Expressive 調のローディングインジケータ**: MD3 Expressive の Loading Indicator（図形が回転しながら複数シェイプへモーフィングするアニメーション、円形コンテナ背景あり：`primary-container` 背景＋`on-primary-container` 図形、純粋な SVG + CSS、`prefers-reduced-motion: reduce` 対応）を `src/ui/expressive/` に自作する。
5. **計算中の表示レイアウト・文言**: カード枠なし・インライン中央寄せ。操作行の下（結果エリア）に十分な上下余白をとって縦積み中央寄せ（インジケータ → 「計算中…」 → 経過時間）。操作行の「計算する」→「中止」切り替え・計算方法トグルの無効化は現行維持。
6. **「時間がかかります」表示**: `run.status === 'idle'`（計算前・待機状態）のときのみ表示する（`running` / `done` / `failed` では非表示）。
7. **範囲外**: Rust エンジン / Worker からの進捗率通知・進捗バー表示、主画面（`HandCard`・`SummaryCard`）側の表示仕様変更（`useFitTiles` 等の共通化は主画面の挙動・見た目を変えない範囲で可）。
8. **UI 監修**: 製造完了後・検収（PR 発行）前に、ローカル実画面での UI 監修を挟む予定。

### 1.3 設計判断の根拠

1. **`useFitTiles` の共通化と `data-stuck="true"` 遷移・毎秒再描画との整合**:
   - `SummaryCard.tsx` 内の `fitTileRow`・`useFitTiles` を `src/ui/screen/use-fit-tiles.ts` へ抽出し、`SummaryCard.tsx` と `EngineView.tsx` の双方から参照する。`SummaryCard.tsx` 側の DOM・CSS・呼び出し方は変えないため、主画面の挙動・見た目は完全に不変となる。
   - `EngineView` の手牌行は `.summary-card__tiles` と `.summary-card__meld` を使用し、`engine.css` で `.engine-screen__hand { --tile-width: 1.5rem; }` および `.engine-card[data-stuck="true"] .engine-screen__hand { --tile-width: 1.25rem; }` を指定する。
   - **トランジションとの干渉回避**: 現行の `engine.css` にある `.engine-screen__hand .tile { transition-property: width; ... }` は、`fitTileRow` と両立しない。`fitTileRow` は `el.style.removeProperty('--tile-width')` の直後に `getBoundingClientRect().width` と `scrollWidth` を同期計測し、最大3回の反復でインライン `--tile-width` を収束させる仕組みであるため、`.tile` に `width` の CSS トランジションが付いていると遷移途中の中間幅を誤計測し、固定中・解除後の縮小計算が破綻する。そのため `.engine-screen__hand .tile` の `transition-property: width` および不要になった `--hand-tile`・`--hand-count`・`100cqw` 計算式を削除する（`.engine-card` 本体の背景色・角丸・影のトランジションは維持する）。
   - **計算中の毎秒再描画による不要な再計測の回避**: `useFitTiles` は依存配列なしの `useLayoutEffect` で描画ごとに `fitTileRow` を実行する仕様である。計算中は `run.elapsedMs` が 1 秒ごとに更新されて `EngineScreen` / `EngineView` が再描画されるため、手牌行を `React.memo` 化した子コンポーネント `EngineHandRow`（props は `hand`・`melds`・`stuck` のみ）に切り出し、かつ `EngineScreen.tsx` で `meldGroups` を `useMemo` でメモ化する。これにより計算中の毎秒更新では `EngineHandRow` が再描画されず、`hand`・`melds`・`stuck` の変化時および `ResizeObserver` 発火時のみ `fitTileRow` が実行される。

2. **理牌と副露のデータ受け渡し**:
   - `EngineViewProps` の `tiles: CoreTile[]` を `hand: readonly CoreTile[]` と `melds: readonly (readonly TileOrBack[])[]` に置き換える。
   - 理牌（`[...props.hand].sort(compareTiles)`）は `EngineHandRow` 側で行う。これにより `EngineView` の単体テスト（`engine-view.test.tsx`）でも未理牌の入力に対する理牌を直接検証でき、`EngineScreen` からの入力順にも依存しない。
   - `EngineScreen.tsx` では `useMemo` で `melds.map(m => meldTiles(m, app.rule.red)).filter(g => g.length > 0)` を生成して渡す。未入力副露（`meld.tile === null` の空配列）を除外することで不要な区切り余白の発生を防ぐ。

3. **`LoadingIndicator` の純粋な SVG + CSS モーフィング設計**:
   - CSS の `@keyframes` による SVG `d: path(...)` 補間を採用する。SVG SMIL（`<animate>`）と異なり、`@media (prefers-reduced-motion: reduce)` の CSS ルールだけで確実にアニメーションを停止できるためである。
   - すべてのキーフレームのシェイプ（4種巡回：4葉クッキー／丸角スクワークル／8葉フラワー／ピル楕円等）を、中心 `(24, 24)`・`viewBox="0 0 48 48"` の**同一コマンド列（`M` 1回 + 絶対3次ベジェ曲線 `C` 8回 + `Z`）**で構成する。コマンド構造を完全一致させることで、離散ジャンプを防ぎ滑らかなモーフィングを実現する。
   - `<path>` 要素には初期シェイプの `d` 属性をフォールバックとして持たせる。これにより CSS `d: path(...)` 非対応環境や `prefers-reduced-motion: reduce` 時でも静的な図形が正しく描画される。
   - 色・形状・モーションはすべて MD3 トークン（`--md-sys-color-primary-container`、`--md-sys-color-on-primary-container`、`--md-sys-shape-corner-full`、`--md-sys-motion-easing-emphasized`、`--md-sys-motion-easing-linear`、`--md-sys-motion-duration-extra-long4` の `calc()` 倍数）で構成し、HEX 値や `cubic-bezier`・`ms` を直書きしない。

4. **計算中表示の DOM 配置とアクセシビリティ**:
   - 計算中表示（`.engine-screen__running`）は `<section className="engine-screen__controls">` の外（直下の結果エリア：`props.available && running` のとき表示）に配置し、操作エリアと結果エリアを明確に分離する。
   - ルート要素は現行と同じ `<div className="engine-screen__running">` とする。`<output>` は暗黙の `role="status"` ライブ領域となるため、内部に毎秒更新される経過時間を含めるとスクリーンリーダーが毎秒読み上げ続けてしまうリスクがある。これを回避するためルートは `<div>` とし、内部の `<LoadingIndicator label="計算中" />`（`role="progressbar"`・`aria-label="計算中"`）で実行中状態を支援技術へ伝える。
   - 内部は `<LoadingIndicator label="計算中" />` → `<p className="engine-screen__running-label">計算中…</p>` → `<span className="engine-screen__elapsed tabular-nums">{formatElapsed(run.elapsedMs)}</span>` の縦積み中央寄せにする。
   - `LoadingIndicator` は汎用部品として `label?: string | undefined` を受け取り、`label` 指定時は `role="progressbar"` と `aria-label={label}` を付与し、未指定時は `aria-hidden="true"` とする。

5. **「時間がかかります」表示条件と `failed` 状態の扱い**:
   - `EngineView.tsx` の表示条件を `props.slow && run.status === 'idle'` に変更する。
   - `src/ui/engine/engine-run.ts:25` の `visibleRunState` は `done` かつ `key` 不一致のみを `idle` に戻す仕様であるため、`failed` 状態で計算方法等の条件を変更しても `run.status` は `'failed'` のまま残り、「時間がかかります」は表示されない。本 Issue では `engine-run.ts` の状態遷移は変更せず、`EngineView` 側の表示条件（`props.slow && run.status === 'idle'`）のみを適用する。

## 2. モジュール構成・型定義・シグネチャ

### 2.1 変更対象ファイル一覧

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/screen/use-fit-tiles.ts` | 新規 | `SummaryCard.tsx` から `MIN_TILE_WIDTH_PX`・`fitTileRow`・`useFitTiles` を抽出して共通化 |
| `src/ui/screen/use-fit-tiles.test.ts` | 新規 | `fitTileRow` の収まり・縮小・下限（10px）・再実行時の `removeProperty` の単体テスト（`happy-dom`） |
| `src/ui/screen/SummaryCard.tsx` | 変更 | 内部の `fitTileRow`・`useFitTiles` 定義を削除し、`./use-fit-tiles` から import（挙動・DOM 不変） |
| `src/ui/expressive/LoadingIndicator.tsx` | 新規 | MD3 Expressive 調ローディングインジケータ（円形コンテナ + モーフィング SVG） |
| `src/ui/expressive/loading-indicator.css` | 新規 | `LoadingIndicator` のスタイル・モーフィング/回転 `@keyframes`・`prefers-reduced-motion: reduce` |
| `src/ui/expressive/LoadingIndicator.test.tsx` | 新規 | `LoadingIndicator` の静的マークアップ・ARIA・HEX 非使用・`prefers-reduced-motion`・パスコマンド構造一致の検証 |
| `src/ui/expressive/index.ts` | 変更 | `LoadingIndicator`・`type LoadingIndicatorProps` を re-export |
| `src/ui/engine/EngineView.tsx` | 変更 | `hand` / `melds` props 化、`React.memo` 化した `EngineHandRow`（理牌＋副露表示＋`useFitTiles`）、`slow && run.status === 'idle'`、計算中表示の刷新 |
| `src/ui/screen/EngineScreen.tsx` | 変更 | `meldTiles` で副露グループを `useMemo` 生成（空除外）し、`hand`・`melds` を `EngineView` へ渡す |
| `src/ui/engine/engine.css` | 変更 | `.engine-screen__hand` の `--tile-width` 切替と不要ルール削除、`.engine-screen__running` 縦積み中央寄せ、`.engine-spinner` 削除 |
| `src/ui/engine/engine-view.test.tsx` | 変更 | `hand` / `melds` 化に伴うテスト更新、旧用語「スピナー」更新、理牌・副露・暗槓裏牌・`slow` 非表示条件・新計算中表示・HEX 非使用のテスト追加/更新 |
| `src/ui/screen/EngineScreen.test.tsx` | 変更 | `.engine-spinner` 参照箇所を `.loading-indicator` へ更新、手牌理牌・副露（暗槓含む）描画の結合テスト追加 |

### 2.2 `src/ui/screen/use-fit-tiles.ts`

```ts
import { useLayoutEffect } from 'react';
import type React from 'react';

export const MIN_TILE_WIDTH_PX = 10;

/**
 * 牌の列が収まらないとき、牌の幅を一様に縮める(収まるなら既定の大きさ)。
 * el 自身、または el 内の複数の列(.summary-card__tiles)が対象。複数列は同じ幅に揃える
 */
export function fitTileRow(el: HTMLElement): void;

/** 描画のたびと幅の変化時に収まりを測り直す(依存配列を持たない) */
export function useFitTiles(ref: React.RefObject<HTMLElement | null>): void;
```

- 実装ロジックは現行 `SummaryCard.tsx` L76-126 と同一とする。
- `SummaryCard.tsx` は `import { useFitTiles } from './use-fit-tiles';` に差し替えるだけであり、主画面の DOM・CSS・動作は一切変わらない。

### 2.3 `src/ui/expressive/LoadingIndicator.tsx` / `loading-indicator.css`

```ts
import type React from 'react';
import './loading-indicator.css';

export interface LoadingIndicatorProps {
  /** 指定時は role="progressbar" と aria-label を付与。省略時は aria-hidden="true" */
  label?: string | undefined;
  className?: string | undefined;
}

/** MD3 Expressive の Loading Indicator (円形コンテナ背景あり・回転モーフィング) */
export function LoadingIndicator(
  props: LoadingIndicatorProps
): React.JSX.Element;
```

- **DOM 構造**:
  ```tsx
  <span
    className={rootClass}
    {...(label
      ? { role: 'progressbar', 'aria-label': label }
      : { 'aria-hidden': true })}
  >
    <svg
      className="loading-indicator__svg"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path className="loading-indicator__shape" d={DEFAULT_SHAPE_PATH} />
    </svg>
  </span>
  ```
- **シェイプ設計（同一コマンド列）**:
  - `viewBox="0 0 48 48"`、中心 `(24, 24)`、外接半径の目安 `16〜18`（コンテナ `48px` に対するアクティブ図形比約 75〜79%）。
  - すべてのシェイプを `M x0 y0 C ...`（`C` コマンド 8 セグメント）`Z` の完全同一コマンド列で構成する（4シェイプ巡回 — 4葉クッキー → 丸角スクワークル → 8葉フラワー → ピル楕円 → 4葉クッキー）。
  - `DEFAULT_SHAPE_PATH` には 0%（初期状態）のシェイプパスを設定する。
- **CSS (`loading-indicator.css`)**:
  - `.loading-indicator`:
    - `display: inline-flex; align-items: center; justify-content: center;`
    - `width: var(--loading-indicator-size, 3rem); height: var(--loading-indicator-size, 3rem);`
    - `border-radius: var(--md-sys-shape-corner-full);`
    - `background-color: var(--md-sys-color-primary-container);`
    - `color: var(--md-sys-color-on-primary-container);`
  - `.loading-indicator__svg`:
    - `width: 100%; height: 100%; display: block;`
    - `animation: loading-indicator-rotate calc(var(--md-sys-motion-duration-extra-long4) * 6) var(--md-sys-motion-easing-linear) infinite;`
  - `.loading-indicator__shape`:
    - `fill: currentColor;`
    - `animation: loading-indicator-morph calc(var(--md-sys-motion-duration-extra-long4) * 4) var(--md-sys-motion-easing-emphasized) infinite;`
  - **モーショントークン選定理由**: 06号テーマ4では状態遷移に spring モーションを優先するが、本部品の連続回転および周回モーフィングは単発の状態遷移ではなく無限ループアニメーション（`infinite`）であるため、overshoot を伴う spring トークンではなく `--md-sys-motion-easing-emphasized` / `--md-sys-motion-easing-linear` と `--md-sys-motion-duration-extra-long4` の `calc()` 倍数を使用する。
  - `@keyframes loading-indicator-rotate`: `from { transform: rotate(0deg); } to { transform: rotate(360deg); }`
  - `@keyframes loading-indicator-morph`: 0% / 25% / 50% / 75% / 100%（0% と 100% は同一シェイプ）で `d: path("...")` を遷移させる。
  - `@media (prefers-reduced-motion: reduce)`: `.loading-indicator__svg, .loading-indicator__shape { animation: none; }` とし、初期シェイプを静止表示する。
  - 色は HEX 値を使わず MD3 トークンのみ。

### 2.4 `src/ui/engine/EngineView.tsx` / `src/ui/screen/EngineScreen.tsx`

`EngineViewProps` の変更差分:

```ts
import type { Tile as CoreTile, TileOrBack } from '../../core/tile';

export interface EngineViewProps {
  onBack: () => void;
  onOpenHelp: () => void;
  /** 門前手牌(未理牌でも可。表示時に compareTiles で全牌理牌する) */
  hand: readonly CoreTile[];
  /** 副露ごとの牌列(meldTiles で変換済み。暗槓は両端が裏牌の4枚) */
  melds: readonly (readonly TileOrBack[])[];
  premise: EnginePremiseProps;
  available: boolean;
  methodChoice: boolean;
  detailed: boolean;
  onDetailedChange: (detailed: boolean) => void;
  /** 「時間がかかります」を出す対象か(run.status === 'idle' のときのみ表示) */
  slow: boolean;
  run: EngineRunState;
  onRun: () => void;
  onCancel: () => void;
  result: Pick<
    EngineResultProps,
    'displayTurn' | 'onTurnChange' | 'rankMetric' | 'onRankMetricChange'
  >;
}
```

- **`EngineScreen.tsx`**:
  - `instantiateMeld` の import をやめ、`meldTiles` を `./MeldArea` から import する。
  - `useMemo` を `react` から import し、副露グループ配列の参照を計算中の毎秒更新に対して安定化する:
    ```tsx
    const meldGroups = useMemo(
      () => melds.map(m => meldTiles(m, app.rule.red)).filter(g => g.length > 0),
      [melds, app.rule.red]
    );
    ```
  - `<EngineView hand={hand} melds={meldGroups} ... />` を渡す。
- **`EngineView.tsx`**:
  - `GlanceTiles` の import を削除し、`memo`（`react`）、`compareTiles`（`../../core/tile`）、`Tile`（`../tile`）、`LoadingIndicator`（`../expressive`）、`useFitTiles`（`../screen/use-fit-tiles`）を import する。
  - 手牌行を `React.memo` 化した子コンポーネント `EngineHandRow` として切り出す（`stuck` を props に含めることで、固定切替時のみ再描画・`useFitTiles` 再計測が走り、計算中の毎秒 `elapsedMs` 更新では再計測されない）:
    ```tsx
    interface EngineHandRowProps {
      hand: readonly CoreTile[];
      melds: readonly (readonly TileOrBack[])[];
      /** 固定状態の変化で再描画・useFitTiles 再計測をトリガするために受け取る */
      stuck: boolean;
    }

    const EngineHandRow = memo(function EngineHandRow({
      hand,
      melds,
      stuck: _stuck
    }: EngineHandRowProps): React.JSX.Element {
      const handRef = useRef<HTMLDivElement | null>(null);
      useFitTiles(handRef);
      const sortedHand = [...hand].sort(compareTiles);
      return (
        <section className="engine-screen__hand" aria-label="対象の手牌">
          <div ref={handRef} className="summary-card__tiles">
            {sortedHand.map((tile, i) => (
              <Tile
                key={`h${tile.type}${tile.n}${tile.type !== 'z' && tile.n === 5 && tile.red ? 'r' : ''}-${i}`}
                tile={tile}
              />
            ))}
            {melds.map((group, mi) => (
              <span key={`m${mi}`} className="summary-card__meld">
                {group.map((t, ti) => (
                  <Tile key={ti} tile={t} />
                ))}
              </span>
            ))}
          </div>
        </section>
      );
    });
    ```
    ※ `stuck` は `data-stuck` による CSS `--tile-width` 切替に合わせて `EngineHandRow` を再描画させるために受け取る（未使用引数警告を避けるため `data-stuck={stuck ? 'true' : 'false'}` を `<section>` に付与するか `_stuck` とする。前者の `data-stuck` 付与なら DOM 検査にも使え、lint 警告も出ない）。
  - 「時間がかかります」表示:
    ```tsx
    {props.slow && run.status === 'idle' ? (
      <p className="engine-screen__note">時間がかかります</p>
    ) : null}
    ```
  - 計算中表示（`<section className="engine-screen__controls">` の直下・結果エリア）:
    ```tsx
    {props.available && running ? (
      <div className="engine-screen__running">
        <LoadingIndicator label="計算中" />
        <p className="engine-screen__running-label">計算中…</p>
        <span className="engine-screen__elapsed tabular-nums">
          {formatElapsed(run.elapsedMs)}
        </span>
      </div>
    ) : null}
    ```

### 2.5 `src/ui/engine/engine.css` の変更

- **手牌領域（`.engine-screen__hand`）**:
  - `.engine-screen__hand { --tile-width: 1.5rem; }`
  - `.engine-card[data-stuck="true"] .engine-screen__hand { --tile-width: 1.25rem; }`
  - 旧ルール（`--hand-tile`、`container-type: inline-size`、`.engine-screen__hand .glance-tiles`、`.engine-screen__hand .tile` の `transition`、`prefers-reduced-motion` 内の `.engine-screen__hand .tile`）を削除。
  - `.summary-card__tiles`・`.summary-card__meld` の flex / gap / margin-inline-start / flex-shrink は `main-screen.css` の既存定義を共用する（`EngineScreen.tsx` で `main-screen.css` を import 済み）。
- **計算中領域（`.engine-screen__running`）**:
  - カード枠なし（背景色・枠線・影なし）。
  - 縦積み中央寄せ・十分な上下余白:
    ```css
    .engine-screen__running {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding-block: 3rem;
      text-align: center;
    }

    .engine-screen__running-label {
      margin: 0;
      color: var(--md-sys-color-on-surface);
      font-family: var(--md-sys-typescale-title-medium-font);
      font-size: var(--md-sys-typescale-title-medium-size);
      line-height: var(--md-sys-typescale-title-medium-line-height);
      font-weight: var(--md-sys-typescale-title-medium-weight);
      letter-spacing: var(--md-sys-typescale-title-medium-tracking);
    }

    .engine-screen__elapsed {
      color: var(--md-sys-color-on-surface-variant);
      font-family: var(--md-sys-typescale-body-medium-font);
      font-size: var(--md-sys-typescale-body-medium-size);
      line-height: var(--md-sys-typescale-body-medium-line-height);
      font-weight: var(--md-sys-typescale-body-medium-weight);
      letter-spacing: var(--md-sys-typescale-body-medium-tracking);
    }
    ```
  - 旧 `.engine-spinner`、`@keyframes engine-spin`、および `prefers-reduced-motion` 内の `.engine-spinner` を削除する。

## 3. バンドル目標値（09号準拠）

- **基準値（`develop/v2.0` `62c62a0` での実測）**:
  - 初回 JS（`dist/index.html` の `<script type="module" src>` が指す `dist/assets/index-yktMNSwM.js`、`modulepreload` なし）: **130,050 B**（`gzip -9 -c | wc -c`、約 130.05 kB）
  - 遅延チャンク `EngineScreen`（`dist/assets/EngineScreen-CoZgue0p.js`）: **11,331 B**（約 11.33 kB、参考値）
- **増分の見込み内訳**:
  - 初回 JS への影響:
    - `use-fit-tiles.ts` 切り出し（元々初回 JS 内の `SummaryCard.tsx` に含まれていた関数のモジュール分離）および遅延チャンクのハッシュマップ変動: **約 +0 〜 +100 B**
    - `LoadingIndicator` は `src/ui/expressive/index.ts` から re-export するが、`"sideEffects": ["*.css"]` と ESM tree-shaking により `MainScreen` から未使用のため初回 JS には取り込まれず、参照元である遅延読み込みの `EngineScreen` チャンクに同梱される見込み（同構成の `Disclosure` が初回 JS に混入せず分離されていることをビルド実測で確認済み）。
  - 遅延チャンク `EngineScreen` への影響:
    - `LoadingIndicator.tsx` の SVG パスデータおよび `EngineView.tsx` の理牌・副露レンダリング差分: **約 +600 〜 +1,200 B**（遅延読み込みのため初回 JS 合計には含めない）。
- **初回 JS 目標値**: **130,150 B**（基準値 130,050 B + 積算増分 100 B）。
  - 09号に基づき、目標値は目安として運用し、超過を理由に検収を不合格としない（超過時は意図しない取り込みがないか調査し、基準値・実測値・増分・積算との差・超過原因を報告する）。

## 4. 対象外・変更禁止制約との両立確認

- **主画面（`HandCard`・`SummaryCard`）の表示仕様**: `SummaryCard.tsx` は内部関数の配置を `use-fit-tiles.ts` へ移すのみで、JSX・CSS クラス・props・動作は一切変更しない。`HandCard.tsx`・`main-screen.css` は変更しない。
- **Rust エンジン / Worker（`src/engine/`・`wasm/`）および `src/ui/engine/engine-run.ts`**: 一切変更しない（`failed` 状態での条件変更時に `visibleRunState` が `failed` を維持する既存挙動も含め据え置く）。
- **既存テストの整合**:
  - `src/ui/engine/engine-view.test.tsx`:
    - `view()` ヘルパーの `tiles` を `hand` / `melds` に更新する。
    - L87（「U-5: running はスピナー・経過時間・「中止」を出し…」）および L258（「実行中は同じ位置が「中止」に替わり、スピナーと経過時間は行の外に出る」）のテスト名から旧用語「スピナー」を「ローディングインジケータ」へ更新し、L258 の検証を `.engine-screen__running` が `.engine-screen__controls` の外に出る新構造へ合わせる。
    - L548（旧 `--hand-tile` / `100cqw` / `--hand-count` の CSS テスト）は、新仕様（`--tile-width: 1.5rem` / 固定中 `1.25rem`、`.summary-card__tiles`・`.summary-card__meld`、`.tile` に `transition-property: width` がないこと）へ更新する。
    - 「時間がかかります」の非表示条件（§5-6）は、`describe('EngineView: 実行前後の表示')` 内に新規テストを追加する（既存 U-9 は `idle` 時の検証として維持する）。
  - `src/ui/screen/EngineScreen.test.tsx`:
    - L613 の `.engine-spinner` セレクタ参照を `.loading-indicator` に更新する。
    - なお、L374・L408 の `.engine-screen__note`（「時間がかかります」）のアサーションは、L374 が `detailed` 切替による `key` 変更で `visibleRunState` が `done` を `idle` に戻す経路、L408 が初期 `idle` 状態であるため、新条件 `slow && run.status === 'idle'` 下でもそのまま通過する。

## 5. 受け入れ条件チェックリスト

検収担当は以下の全項目を1つずつ実行し、すべて通過することを確認する。

1. **手牌の理牌（13枚・14枚）**:
   - `npx vitest run src/ui/engine/engine-view.test.tsx src/ui/screen/EngineScreen.test.tsx` を実行する。
   - 未理牌の 13 枚および 14 枚の門前手牌（萬子・筒子・索子・字牌および赤五を含む）を渡したとき、`.engine-screen__hand` 内の門前牌がすべて `compareTiles` 順（m < p < s < z、数昇順、同数の五は通常 → 赤）に並び、14 枚目が切り離されない（`.summary-card__winning-tile` が存在せず、かつ門前領域である `.summary-card__tiles` 直下・`.summary-card__meld` 外の `.tile` 数が 14 であること）を検証するテストが通過すること。
2. **副露のグループ表示と暗槓の裏牌表現**:
   - 上記テストにおいて、ポン・明槓・暗槓を含む手牌を描画したとき、門前手牌の後ろに副露ごとに `.summary-card__meld` が1つずつ出力され、暗槓の `.summary-card__meld` 内に4枚の `.tile` が並び両端の `aria-label` が `"裏"`（`tileLabelOf({ type: 'back' })` の仕様通り）であること、また未入力副露（`tile: null`）では空の `.summary-card__meld` が出力されないことを検証するテストが通過すること。
3. **`useFitTiles` の共通化と縮小・固定遷移・毎秒再描画回避の整合**:
   - `npx vitest run src/ui/screen/use-fit-tiles.test.ts src/ui/screen/SummaryCard.test.tsx` を実行する。
   - `use-fit-tiles.test.ts` は `// @vitest-environment happy-dom` を指定し、`.summary-card__tiles` と `.tile` 要素に対して `clientWidth`・`scrollWidth`・`getBoundingClientRect` をモックしたうえで以下を検証するテストが通過すること:
     - 収まる行（`scrollWidth <= clientWidth`）ではインライン `--tile-width` を設定しないこと。
     - はみ出す行（`scrollWidth > clientWidth`）では縮小した `--tile-width`（`${px}px`）を設定すること。
     - 極端に狭い幅では `MIN_TILE_WIDTH_PX`（`10px`）を下限として止まること。
     - 既に縮小された `--tile-width` が設定された要素に対し幅が広がった条件で再実行したとき、先頭で `--tile-width` が除去され基準幅へ戻ること。
   - `engine.css` の `.engine-screen__hand` が `--tile-width: 1.5rem`、`.engine-card[data-stuck="true"] .engine-screen__hand` が `--tile-width: 1.25rem` を持ち、`.engine-screen__hand .tile` に `transition-property: width` が定義されていないこと（基準幅切替の実ブラウザ挙動は §5-9 の UI 監修で実画面確認する）。
   - `SummaryCard.tsx` と `EngineView.tsx` の双方が `use-fit-tiles.ts` の `useFitTiles` を参照し、`EngineView.tsx` の手牌行が `React.memo` 化された子コンポーネント（`EngineHandRow`）かつ `EngineScreen.tsx` の `meldGroups` が `useMemo` でメモ化されていること。
4. **MD3 Expressive 調 `LoadingIndicator` の自作と規約準拠**:
   - `npx vitest run src/ui/expressive/LoadingIndicator.test.tsx` を実行する。
   - `src/ui/expressive/LoadingIndicator.tsx` が `src/ui/expressive/index.ts` から export され、`label` 指定時は `role="progressbar"` と `aria-label` を持ち、省略時は `aria-hidden="true"` になることを検証するテストが通過すること。
   - `loading-indicator.css` に `--md-sys-color-primary-container`、`--md-sys-color-on-primary-container`、`--md-sys-shape-corner-full`、回転・モーフィングの `@keyframes`、`@media (prefers-reduced-motion: reduce)` での `animation: none` が定義されており、HEX カラー値（`#[0-9a-fA-F]{3,8}`）および `cubic-bezier` の直書きがないことを検証するテストが通過すること。
   - モーフィング用の全シェイプパスが同一のコマンド列（`M` + 同一回数の `C` + `Z`）であることを検証するテストが通過すること。
5. **計算中表示のレイアウト・文言・操作行維持**:
   - `npx vitest run src/ui/engine/engine-view.test.tsx` において、`run.status === 'running'` のとき、`.engine-screen__controls` の外に `<div className="engine-screen__running">` が出力され、その中に `.loading-indicator`（`role="progressbar"`・`aria-label="計算中"`）、「計算中…」、経過時間（`.engine-screen__elapsed.tabular-nums`）がこの順に含まれ、操作行のボタンが「中止」・計算方法トグルが `disabled` になること。
   - `engine.css` の `.engine-screen__running` が `flex-direction: column`・`align-items: center` でカード枠（`background-color`・`border`・`box-shadow`）を持たず、旧 `.engine-spinner` が削除されていること。
6. **「時間がかかります」の表示条件**:
   - `npx vitest run src/ui/engine/engine-view.test.tsx` の `describe('EngineView: 実行前後の表示')` 内の新規テストにおいて、`slow: true` のとき `run.status === 'idle'` では `.engine-screen__note`（「時間がかかります」）が表示され、`run.status` が `'running'`・`'done'`・`'failed'` のときは `.engine-screen__note` が出力されないことが通過すること。
7. **静的検査・全テスト・ビルド・色トークン制約**:
   - `npm run lint`、`npm run typecheck`、`npm run format:check`、`npm test`、`npm run build` をすべて実行し、終了コード 0 でエラーなく通過すること。
   - `src/ui/engine/`・`src/ui/screen/EngineScreen.tsx`・`src/ui/expressive/LoadingIndicator.*` に HEX カラーの直書きがないこと。
   - 主画面（`HandCard.tsx`・`main-screen.css`）および `src/engine/`・`wasm/`・`src/ui/engine/engine-run.ts` に変更がないこと。
8. **バンドルサイズの実測記録（09号）**:
   - `npm run build` 後、`dist/index.html` の `<script type="module" src>`（および `<link rel="modulepreload" href>` があればそれも含む）が指す JS を `gzip -9 -c <file> | wc -c` で計測し、基準値（130,050 B）・実測値・増分・積算増分（+100 B）との差を PR 本文に記録すること（遅延チャンク `EngineScreen-*.js` も参考値として記録。目標値超過は不合格条件としない）。
9. **ローカル実画面での UI 監修完了**:
   - 製造完了後・PR 発行前にオーナーによるローカル実画面での UI 監修（手牌の理牌・副露表示・スクロール固定遷移、計算中のローディングインジケータの動き・余白・ダーク/ライト切替、`prefers-reduced-motion` 挙動）を受け、さらに `vite preview`（本番ビルド）でも `LoadingIndicator` の CSS が適用されて正しく描画・動作することを確認し、監修終了の指示を得ていること。

## 6. 実挙動未確認の箇所

本設計書は設計フェーズ（コード未実装）の成果物であるため、以下は**実挙動未確認**である。製造および UI 監修・検収で実ブラウザ確認を行う。

- 実ブラウザ（Chrome / Safari 等）における CSS `d: path(...)` モーフィングアニメーションと回転アニメーションの視覚的な滑らかさ、およびシェイプの見た目バランス。
- 360px〜600px 幅の実画面で 14 枚＋副露（最大4副露・暗槓含む）を表示し、スクロールして `data-stuck="true"` を切り替えた際の `useFitTiles` の実測縮小動作と視覚的違和感の有無。
- 計算中表示（`.engine-screen__running`）の上下余白（`padding-block: 3rem`）および要素間隔（`gap: 0.75rem`）の実画面でのバランス（UI 監修で微調整対象）。
- 本番ビルド（`vite preview`）環境での `LoadingIndicator` の CSS 適用とアニメーション動作。

## 7. 外部事実の確認記録

本 Issue では新規の外部依存パッケージ・コンテナイメージ・GitHub Actions の追加は行わない。設計の前提とした既存リポジトリ・ビルド結果およびブラウザ仕様の確認状況を以下に示す。

| 確認事項 | 実行コマンド | 結果 |
| --- | --- | --- |
| 基準ブランチ・コミット | `git branch --show-current && git rev-parse --short HEAD && git rev-parse --short origin/develop/v2.0` | `develop/v2.0` / `62c62a0` / `62c62a0` |
| Issue #153 の本文・条件 | `gh issue view 153` | Open、Milestone `v2.0`、確定方針・範囲外・`develop/v2.0` 向け PR を確認 |
| `package.json` の `sideEffects`・依存版 | `package.json` 読み込み | `"sideEffects": ["*.css"]`、`@material/web: "2.5.0"`、`react: "^19.0.0"`、`vite: "^6.1.0"`、`vitest: "^3.0.5"`、`@biomejs/biome: "1.9.4"` |
| 裏牌の `aria-label` 仕様 | `src/ui/tile/tile-image.ts` L133-136 読み込み | `tileLabelOf({ type: 'back' })` は `'裏'` を返すことを確認 |
| 初回 JS・遅延チャンクの基準値実測 | `npm run build` 後、`dist/index.html` の `<script type="module" src>` 確認および `for f in dist/assets/*.js; do printf "%s: %s B\n" "$f" "$(gzip -9 -c "$f" | wc -c | tr -d ' ')"; done` | `dist/index.html` の初回 JS は `assets/index-yktMNSwM.js` のみ（`modulepreload` なし）= **130,050 B**。遅延チャンク `EngineScreen-CoZgue0p.js` = **11,331 B**、`Disclosure-BVyvDxu2.js` = 402 B（`Disclosure` が初回 JS に混入せず分離されることを確認） |
| 既存関連テストの動作 | `npx vitest run src/ui/engine/engine-view.test.tsx src/ui/screen/EngineScreen.test.tsx src/ui/screen/SummaryCard.test.tsx` | 全テスト通過（`engine-view.test.tsx` 32件、`EngineScreen.test.tsx` 9件、`SummaryCard.test.tsx` 3件） |
| CSS `d: path(...)` の `@keyframes` 補間に関するブラウザ対応状況（Safari 含む） | 未実行 | **未確認**（UI 監修・実機確認対象。非対応環境では `<path d={DEFAULT_SHAPE_PATH}>` の静的フォールバックで描画される設計とする） |

## 8. 後続 Issue への引き継ぎ事項

1. **計算進捗率の通知・進捗バー表示（範囲外）**: Rust エンジン / Worker からの逐次進捗通知と進捗バー表示は本 Issue の範囲外。必要になった場合は別 Issue として起票・設計する。
2. **`LoadingIndicator` の他画面への展開**: 本 Issue で `src/ui/expressive/LoadingIndicator.tsx` として汎用部品化するため、将来的に主画面（`ResultPanel` 等）のローディング表示にも流用可能（本 Issue では主画面を変更しない）。
3. **UI 監修での微調整**: 製造完了後・PR 発行前のローカル実画面 UI 監修において、`.engine-screen__running` の余白・文字サイズ、`LoadingIndicator` のサイズ・シェイプ・回転/モーフィング速度の微調整を想定する。
