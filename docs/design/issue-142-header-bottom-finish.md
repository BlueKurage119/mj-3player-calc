# Issue #142 ヘッダー（`.app-header`）下端部の仕上げ改善 設計書

- 状態: 第4版（UI 監修確定仕様反映済み・検収通過）
- 設計担当モデル: Gemini 4 Neon
- 対象 Issue: #142（ヘッダー `.app-header` 下端部の仕上げ改善）
- 作業ブランチ: `feature/issue-142-header-finish`（`origin/develop/v2.0` `0df8ed5` 起点、PR base は `develop/v2.0`）
- UI 監修: 実施・完了済み（監修中に確定した仕様変更を本版へ反映）

## 1. 目的と参照資料・設計判断の根拠

全6画面で共通使用している上部固定ヘッダー（`.app-header`）の下端部の仕上げを統一する。
現在、点数計算表画面のみ一時的な `border-bottom` があり、他画面には境界表現がない。本 Issue では、全画面の `.app-header` に MD3 標準の on-scroll トーン変化（スクロール量に応じた連続変化）と常時表示の下端グラデーションフェードを一律適用し、点数計算表画面の一時的な `border-bottom` を撤去して統一仕上げへ置き換える。また、主画面の先頭にある `WindSegment` がフェードと重ならないよう上端余白を調整し、UI 監修で確認された固定カード・点数計算表ヘッダー内部品・設定画面モーダルスクリムの重なりおよびコントラストを併せて整える。

### 1.1 参照した資料

| 資料 | 確認した内容 |
| --- | --- |
| `gh issue view 142` | Issue #142 の背景・検討候補（案1〜4）・未決事項・Milestone `v2.0` |
| `docs/rules/02-design-protocol.md` | 設計フェーズの権限境界・必須記載項目1〜6・成果物制約 |
| `docs/rules/06-ui-md3-protocol.md` | 色・形状・モーション・タイポグラフィの MD3 トークン制約、HEX・`ms`・`cubic-bezier` 直書き禁止、bare import 禁止、UI 監修中の軽微修正の扱い |
| `docs/rules/09-bundle-budget-protocol.md` | 初回 JS バンドル目標値の基準値実測・増分積算・報告ルール |
| `src/ui/screen/main-screen.css` | `.app-header`（`position: sticky; top: 0`）、プレビュー環境スタイル、`.main-screen`（上端 padding なし）、`.input-section`（`MainScreen` 専用）、`.summary-card`（`top: var(--app-header-height, 0px)`）、`.result-banner`（`z-index: 19`） |
| `src/ui/screen/scoring-table.css` | `.scoring-table-screen__content`（上端 padding `0.75rem`）、`.scoring-table-screen .app-header` の `border-bottom`、`.scoring-table-screen__rule-label`（`background-color: var(--md-sys-color-surface-container)`） |
| `src/ui/engine/engine.css` | `.engine-screen__content`（上端 padding `0.75rem`）、`.engine-card`（`top: var(--engine-header-height, 0px)`） |
| `src/ui/expressive/bottom-sheet.css`・`connected-button-group.css`・`stepper.css` | `.bottom-sheet`（`z-index: 20`）、`.connected-button`（未選択背景 `--md-sys-color-surface-container`）、`.stepper__value`（`--md-sys-color-surface-container-highest`） |
| `src/ui/md/Dialog.tsx`・`@material/web/dialog/internal/dialog-styles.css` | `MdDialog` は `:host { display: contents }` かつ Shadow DOM 内 `.scrim` が `position: fixed; z-index: 1` のため、`.app-header` より背面に描画される挙動 |
| `src/ui/help/help.css`・`src/ui/license/license.css`・`src/ui/settings/settings.css` | 上端 padding の実測値（`.help-screen__content`: `0.75rem`、`.license-screen__content`: `0.75rem`、`.settings-screen__content`: `1rem`）。`.help-tooltip__bubble`（`z-index: 100`）。`SettingsScreen.tsx` は `.main-screen` を共用 |
| `src/ui/screen/AppHeader.tsx`・`MainScreen.tsx`・`ScoringTableScreen.tsx`・`SettingsScreen.tsx`・`HelpScreen.tsx`・`LicenseScreen.tsx`・`src/ui/engine/EngineView.tsx` | 全6画面の `<header className="app-header">` 実装およびドキュメント全体（`window`）スクロール構成 |
| `src/ui/theme/tokens.css`・`static-tokens.css` | `--md-sys-color-background` / `--md-sys-color-surface`（ライト `#f7fbf1` / ダーク `#10140f`）、`--md-sys-color-surface-container`（ライト `#ecefe6` / ダーク `#1d211b`）、`--md-sys-color-surface-container-highest`（ライト `#e0e4db` / ダーク `#323630`） |
| `src/ui/screen/situation-css.test.ts` | `main-screen.css` に対する HEX 色・`ms`・`cubic-bezier` の直書き禁止テスト（D5-C17） |

### 1.2 ヒアリングおよび UI 監修での確定事項

1. **表現方式**: on-scroll トーン変化 ＋ 下端グラデーションフェード（Issue 案4）。主画面の `SummaryCard` や確率・期待値画面の `.engine-card` が貼り付いている間もグラデーションの抑止分岐は入れず、レイヤー順（`z-index`）で固定カードを前面化する。
2. **未スクロール時（`scrollY === 0`）の下端フェード表示**: 常時表示（`opacity` 切替なし）。未スクロール時は `surface → transparent`、スクロールに応じて `surface-container → transparent` へ連続変化する。
3. **色変化の方式（UI 監修確定）**: `scrollY > 0` での時間ベース 2 値 `transition` ではなく、スクロール量（`0px`〜`32px`、`HEADER_SCROLL_RANGE_PX = 32`）に応じてルート CSS 変数 `--app-header-scroll`（`0`〜`1`）を連続更新し、`color-mix()` でヘッダーおよび下端フェードの色をリアルタイムに補間する（追従遅延を避けるため `transition` は置かない）。
4. **主画面の風（`WindSegment`）の位置調整**: 下端フェード（`0.75rem`）をかける分、主画面専用の `.input-section` に `padding-block-start: 0.75rem;` を付与する（`.main-screen` には上端 padding を追加しない）。
5. **適用範囲と既存区切り線**: 全6画面（`MainScreen` / `EngineView` / `ScoringTableScreen` / `SettingsScreen` / `HelpScreen` / `LicenseScreen`）の `.app-header` に一律適用し、`src/ui/screen/scoring-table.css` の `.scoring-table-screen .app-header` にある一時的な `border-bottom` は撤去する。
6. **固定カードとの重なり順（UI 監修確定）**: `.summary-card` および `.engine-card` がヘッダー下端フェードに一部隠れないよう、`.app-header` を `z-index: 15`、`.summary-card`・`.engine-card` を `z-index: 18` に設定する（`.result-banner: 19`・`.bottom-sheet: 20`・`.help-tooltip__bubble: 100` は維持）。
7. **点数計算表ヘッダー内部品のコントラスト確保（UI 監修確定）**: ツモ損あり時のラベル（`.scoring-table-screen__rule-label[data-tsumo-loss="loss"]`）および未選択トグル（`.connected-button[aria-checked="false"]`）の背景色を、`--app-header-scroll` に連動する `color-mix()` で `--md-sys-color-surface-container` → `--md-sys-color-surface-container-highest` へ同期変化させる。
8. **設定画面ツモ損モーダルのスクリム重なり是正（UI 監修確定）**: `src/ui/md/Dialog.tsx` で `<md-dialog>` を `<div style={{ position: 'fixed', zIndex: 30 }}>` で包み、Shadow DOM 内 `.scrim` が `.app-header`（`z-index: 15`）より前面に描画されるようにする。
9. **運用**: `develop/v2.0` ベースの統合ブランチ運用。iOS 27 ステータスバー強制ブラー対策は別の iOS 依存不具合と合わせて後続 Issue で対応する。

### 1.3 設計判断の根拠

1. **スクロール検知および連続進捗フック `useScrolled()` の採用**:
   - 全6画面はいずれもドキュメント全体（`window`）がスクロールする構成である。
   - `useScrolled()`（`src/ui/screen/use-scrolled.ts`）は、状態属性 `data-scrolled` 用に `boolean`（`window.scrollY > 0`）を返し、`0 ↔ >0` の境界をまたいだときだけ React 再レンダリングを行う。
   - 同時に同じ `{ passive: true }` リスナー内で `progress = Math.min(1, Math.max(0, window.scrollY / HEADER_SCROLL_RANGE_PX))`（`HEADER_SCROLL_RANGE_PX = 32`）を算出し、直前値と異なる場合のみ `document.documentElement.style.setProperty('--app-header-scroll', String(progress))` を更新する。これにより、スクロール中に全画面ツリーを再レンダリングせず、60/120fps で滑らかに色を連続変化させられる。
   - `window.scrollY <= 0`（iOS オーバースクロールの負値含む）では `scrolled = false`・`progress = 0` にクランプされ、チラつきを防ぐ。SSR（`renderToStaticMarkup`）など `window` / `document` 不在環境では安全に `false` を返す。

2. **本体背景と下端グラデーションフェードの色同期（`color-mix()` + `mask-image`）**:
   - `.app-header` に `--app-header-bg: color-mix(in srgb, var(--md-sys-color-surface-container) calc(var(--app-header-scroll, 0) * 100%), var(--md-sys-color-surface));` を定義し、`.app-header` と `.app-header::after` の双方が `background-color: var(--app-header-bg);` を参照する。
   - `.app-header::after` は `-webkit-mask-image` / `mask-image: linear-gradient(to bottom, var(--md-sys-color-surface), transparent)` で不透明度勾配を与える。マスク開始色に不透明な色トークン `var(--md-sys-color-surface)` を用いることで HEX や色キーワード直書きを避けつつ、本体とフェードの色を常に完全一致させる。
   - スクロール量にリアルタイム追従させるため、`.app-header` と `.app-header::after` には時間ベースの `transition` を置かない。

3. **下端フェードのレイアウト・重なり順・モーダルスクリムとの整合**:
   - `.app-header::after` は `position: absolute; inset-inline: 0; top: 100%; height: var(--app-header-fade-height); pointer-events: none; z-index: -1;`（`--app-header-fade-height: 0.75rem`）とし、`offsetHeight`（`--app-header-height` / `--engine-header-height`）およびポインター操作に影響を与えない。
   - 全体の `z-index` 階層を `.app-header: 15` < `.summary-card` / `.engine-card`: `18` < `.result-banner: 19` < `.bottom-sheet: 20` < `Dialog` ラッパー: `30` < `.help-tooltip__bubble: 100` とすることで、固定カードはヘッダー下端フェードより前面に、モーダルスクリムはヘッダー・ボトムシートより前面に表示される。
   - `Dialog` のラッパーに `position: fixed; zIndex: 30` を使うことで、親の flex コンテナ（`.settings-rules-group` 等の `gap`）へレイアウト影響を与えずにスタッキングコンテキストを形成できる。

4. **全6画面の上端余白確認と主画面 `WindSegment` の位置下げ**:
   - 他5画面の上端余白は `EngineView` / `ScoringTableScreen` / `HelpScreen` / `LicenseScreen` が `0.75rem`、`SettingsScreen` が `1rem` であり、フェード高さ（`0.75rem`）以上を確保済み。
   - 主画面のみ `0` であったため、`SettingsScreen` と共用の `.main-screen` ではなく `MainScreen` 専用の `.input-section` に `padding-block-start: 0.75rem;` を付与する。

5. **点数計算表ヘッダー内のスクロール時コントラスト確保**:
   - `.scoring-table-screen .app-header` 内のツモ損ありラベル（`.scoring-table-screen__rule-label[data-tsumo-loss="loss"]`）および未選択トグル（`.connected-button[aria-checked="false"]`）は既定背景が `--md-sys-color-surface-container` であり、スクロール時にヘッダー背景と同色になる。
   - これらも `--app-header-scroll` に連動する `color-mix(in srgb, var(--md-sys-color-surface-container-highest) calc(var(--app-header-scroll, 0) * 100%), var(--md-sys-color-surface-container))` とし、ヘッダー背景と同じタイミングでステッパー値部分と揃うトーンへ滑らかに変化させる（`.connected-button` 本来の `shape-morph.css` による角丸モーフ遷移は上書きしない）。

## 2. モジュール構成・型定義・シグネチャ

### 2.1 変更対象ファイル一覧

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/screen/use-scrolled.ts` | 新規 | `HEADER_SCROLL_RANGE_PX = 32`、および `window.scrollY > 0` とルート CSS 変数 `--app-header-scroll`（`0`〜`1`）を `{ passive: true }` で同期する共通フック `useScrolled()` |
| `src/ui/screen/use-scrolled.test.ts` | 新規 | `useScrolled` の真偽切替・負値・初期同期・リスナー解除、および `--app-header-scroll` の連続・クランプ更新の単体テスト（`happy-dom`） |
| `src/ui/screen/main-screen.css` | 変更 | `.app-header` の `color-mix()` 背景・`::after` 常時下端フェード・`z-index: 15`、`.summary-card` の `z-index: 18`、`.input-section` の `padding-block-start: 0.75rem` |
| `src/ui/engine/engine.css` | 変更 | `.engine-card` の `z-index` を `10` → `18` へ変更 |
| `src/ui/screen/scoring-table.css` | 変更 | `.scoring-table-screen .app-header { border-bottom: ... }` を削除し、ヘッダー内のツモ損ありラベル・未選択トグルへ `--app-header-scroll` 連動の `color-mix()` 背景を追加 |
| `src/ui/md/Dialog.tsx` | 変更 | `<md-dialog>` を `<div style={{ position: 'fixed', zIndex: 30 }}>` で包み、スクリムを `.app-header` より前面化 |
| `src/ui/screen/AppHeader.tsx` | 変更 | `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/engine/EngineView.tsx` | 変更 | `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/ScoringTableScreen.tsx` | 変更 | `ScoringTableView` 内で `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/SettingsScreen.tsx` | 変更 | `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/HelpScreen.tsx` | 変更 | `HelpView` 内で `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/LicenseScreen.tsx` | 変更 | `LicenseView` 内で `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/AppHeader.test.tsx` | 変更 | 全6画面への `data-scrolled` 付与、ヘッダー仕上げの CSS 規約、`z-index` 階層、点数計算表の `border-bottom` 撤去・連続コントラスト、`Dialog` スクリム前面化のテスト追加 |

### 2.2 `src/ui/screen/use-scrolled.ts`

```ts
import { useEffect, useState } from 'react';

/** ヘッダー色が surface から surface-container へ変化し切るスクロール距離(px) */
export const HEADER_SCROLL_RANGE_PX = 32;

function calcScrollProgress(scrollY: number): number {
  return Math.min(1, Math.max(0, scrollY / HEADER_SCROLL_RANGE_PX));
}

/** ドキュメントが最上部から下にスクロールされているか(window.scrollY > 0)を返し、進捗を --app-header-scroll へ同期する */
export function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.scrollY > 0 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastProgress: number | null = null;
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 0);
      if (typeof document !== 'undefined') {
        const progress = calcScrollProgress(y);
        if (progress !== lastProgress) {
          lastProgress = progress;
          document.documentElement.style.setProperty(
            '--app-header-scroll',
            String(progress)
          );
        }
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
    };
  }, []);

  return scrolled;
}
```

### 2.3 全6画面の `<header>` 属性適用

以下の6箇所すべての `<header className="app-header">` に `const scrolled = useScrolled();` と `data-scrolled={scrolled ? 'true' : 'false'}` を適用する。

1. `src/ui/screen/AppHeader.tsx`（`MainScreen` が使用）
2. `src/ui/engine/EngineView.tsx`
3. `src/ui/screen/ScoringTableScreen.tsx`（`ScoringTableView` 内）
4. `src/ui/screen/SettingsScreen.tsx`
5. `src/ui/screen/HelpScreen.tsx`（`HelpView` 内）
6. `src/ui/screen/LicenseScreen.tsx`（`LicenseView` 内）

### 2.4 `src/ui/screen/main-screen.css`・`src/ui/engine/engine.css` の変更

```css
.app-header {
  --app-header-bg: color-mix(
    in srgb,
    var(--md-sys-color-surface-container)
      calc(var(--app-header-scroll, 0) * 100%),
    var(--md-sys-color-surface)
  );
  --app-header-fade-height: 0.75rem;
  position: sticky;
  top: 0;
  z-index: 15;
  width: 100%;
  background-color: var(--app-header-bg);
  color: var(--md-sys-color-on-surface);
}

.app-header::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  top: 100%;
  height: var(--app-header-fade-height);
  z-index: -1;
  pointer-events: none;
  background-color: var(--app-header-bg);
  -webkit-mask-image: linear-gradient(
    to bottom,
    var(--md-sys-color-surface),
    transparent
  );
  mask-image: linear-gradient(
    to bottom,
    var(--md-sys-color-surface),
    transparent
  );
}
```

- `.input-section` に `padding-block-start: 0.75rem;` を追加する（`.main-screen` には上端 padding を追加しない）。
- `.summary-card`（`main-screen.css`）および `.engine-card`（`engine.css`）を `z-index: 18;` とする。

### 2.5 `src/ui/screen/scoring-table.css`・`src/ui/md/Dialog.tsx` の変更

- `scoring-table.css`: `.scoring-table-screen .app-header { border-bottom: ... }` を削除し、以下を追加する:

```css
.scoring-table-screen
  .app-header
  .scoring-table-screen__rule-label[data-tsumo-loss="loss"],
.scoring-table-screen .app-header .connected-button[aria-checked="false"] {
  background-color: color-mix(
    in srgb,
    var(--md-sys-color-surface-container-highest)
      calc(var(--app-header-scroll, 0) * 100%),
    var(--md-sys-color-surface-container)
  );
}
```

- `src/ui/md/Dialog.tsx`: `<md-dialog>` を `<div style={{ position: 'fixed', zIndex: 30 }}>` でラップする。

## 3. バンドル目標値（09号準拠）

- **基準値（`develop/v2.0` `0df8ed5` での実測）**:
  - 初回 JS（`dist/index.html` の `<script type="module" src>` が指す `dist/assets/index-OauG-NRU.js`、`modulepreload` なし）: **130,044 B**（`gzip -9 -c | wc -c`、約 130.04 kB）
- **増分の見込み内訳**:
  - `src/ui/screen/use-scrolled.ts`（`AppHeader.tsx` 経由で初回 JS に含まれる）: **約 +120 〜 +180 B**
  - `AppHeader.tsx` の `data-scrolled` 属性追加および遅延チャンクハッシュ変動（Vite/Rollup の動的 import マップ内ハッシュ文字列変化に伴う gzip 圧縮効率の微小変動）: **約 +20 〜 +70 B**
  - 他5画面（`EngineView` / `ScoringTableScreen` / `SettingsScreen` / `HelpScreen` / `LicenseScreen`）はいずれも `lazy()` の遅延読み込みチャンク側であり、`useScrolled` は初回 JS チャンクから共有参照されるため初回 JS の追加増分はなし。
  - CSS（`main-screen.css` / `scoring-table.css` / `engine.css`）は JS 合計に含めない。
- **初回 JS 目標値**: **130,294 B**（基準値 130,044 B + 積算増分 250 B）。
  - 09号に基づき、目標値は目安として運用し、超過を理由に検収を不合格としない。

## 4. 受け入れ条件チェックリスト

検収担当は以下の全項目を1つずつ実行し、すべて通過することを確認する。

1. **`useScrolled` フックの単体動作および `--app-header-scroll` 連続更新**:
   - `npx vitest run --exclude '.claude/**' src/ui/screen/use-scrolled.test.ts` を実行する。
   - `// @vitest-environment happy-dom` 環境において、`Object.defineProperty(window, 'scrollY', { value: ..., configurable: true })` で `scrollY` を設定し、以下を検証するテストがすべて通過すること:
     - 初期 `window.scrollY === 0` で `false` を返し、`--app-header-scroll` が `"0"` であること。
     - `window.scrollY` を正の値（例: `16` / `32` / `120`）に変更して `scroll` イベントを発火したとき `true` に変わり、`--app-header-scroll` が `HEADER_SCROLL_RANGE_PX = 32` に応じて `"0.5"` / `"1"` / `"1"` に連続・クランプ更新されること。
     - `window.scrollY` を `0` に戻して `scroll` イベントを発火したとき `false`・`--app-header-scroll: "0"` に戻ること。
     - `window.scrollY` が負の値（例: `-20`、iOS オーバースクロール想定）のとき `false`・`--app-header-scroll: "0"` のままであること。
     - マウント時点で既に `window.scrollY > 0`（例: `16`）のとき初期値から `true`・`--app-header-scroll: "0.5"` であること。
     - アンマウント時に `window.removeEventListener('scroll', ...)` でリスナーが解除されること（`addEventListener` の第3引数に `{ passive: true }` が渡されること）。
2. **全6画面の `.app-header` への `data-scrolled` 適用**:
   - `npx vitest run --exclude '.claude/**' src/ui/screen/AppHeader.test.tsx src/ui/engine/engine-view.test.tsx src/ui/screen/ScoringTableScreen.test.tsx src/ui/screen/HelpScreen.test.tsx src/ui/screen/LicenseScreen.test.tsx` を実行し、全テストが通過すること。
   - `AppHeader.test.tsx` 内の `renderToStaticMarkup` テストにて、`AppHeader` / `EngineView` / `ScoringTableView` / `SettingsScreen` / `HelpView` / `LicenseView` の全6画面すべてで `<header class="app-header" data-scrolled="false">` が出力されることを機械検証すること。
3. **MD3 スクロール連動連続色変化・常時下端フェード・重なり順・コントラスト・規約準拠**:
   - `npx vitest run --exclude '.claude/**' src/ui/screen/AppHeader.test.tsx src/ui/screen/situation-css.test.ts` を実行し、全テストが通過すること。
   - `src/ui/screen/main-screen.css` に以下が定義されていること:
     - `.app-header` の `--app-header-bg` が `color-mix(in srgb, var(--md-sys-color-surface-container) calc(var(--app-header-scroll, 0) * 100%), var(--md-sys-color-surface))` であり、線・`box-shadow`・時間ベース `transition` がないこと。
     - `.app-header::after` が `position: absolute`、`top: 100%`、`pointer-events: none`、`z-index: -1`、`mask-image`（および `-webkit-mask-image`）による `linear-gradient(to bottom, ..., transparent)` を持ち、`opacity: 0` による非表示切替や時間ベース `transition` がないこと。
     - `.app-header` が `z-index: 15`、`.summary-card`（`main-screen.css`）および `.engine-card`（`engine.css`）が `z-index: 18` であること。
     - `situation-css.test.ts`（D5-C17）が通過し、HEX カラー・`ms`・`cubic-bezier` の直書きがないこと。
   - `src/ui/screen/scoring-table.css` にて、`.scoring-table-screen .app-header` 内の `.scoring-table-screen__rule-label[data-tsumo-loss="loss"]` と `.connected-button[aria-checked="false"]` に `--app-header-scroll` 連動の `color-mix()`（`surface-container` → `surface-container-highest`）が設定されていること。
   - `src/ui/md/Dialog.tsx` で `<md-dialog>` が `position: fixed` かつ `zIndex: 30` のコンテナで包まれていること。
4. **主画面 `WindSegment` の位置下げ（上端余白）と他画面への非影響**:
   - `AppHeader.test.tsx` の CSS 検証テストおよび `main-screen.css` にて、`.input-section` に `padding-block-start: 0.75rem;` が設定されており、`.main-screen` には上端 padding が追加されていないこと。
5. **点数計算表の一時 `border-bottom` 撤去（`scoring-table.css`）**:
   - `git grep -n "border-bottom" src/ui/screen/scoring-table.css` および `AppHeader.test.tsx` にて、`.scoring-table thead th` の1か所のみが残ること。
6. **静的検査・全テスト・ビルド**:
   - `npm run lint`、`npm run typecheck`、`npm run format:check`、`npm run build`、および全テスト（他 worktree と並列 RPC タイムアウトを避ける `npx vitest run --exclude '.claude/**' --pool=forks --maxWorkers=1`）を実行し、すべて終了コード 0 で通過すること。
7. **バンドルサイズの実測記録（09号）**:
   - `npm run build` 後、`dist/index.html` の初回 JS を `gzip -9 -c <file> | wc -c` で計測し、基準値（130,044 B）・実測値・増分・積算増分（+250 B）との差を PR 本文に記録すること（目標値超過は不合格条件としない）。
8. **ローカル実画面での UI 監修完了**:
   - 製造完了後・PR 発行前にオーナーによるローカル実画面での UI 監修を実施し、オーナーによる「監修終了」の指示をもって合格とする。

## 5. 実挙動未確認の箇所

ローカル実画面（スマホ実機含む）での UI 監修は完了済み。以下のみ引き続き未確認・別 Issue 扱いとする:

- `vite preview`（本番ビルド配信）上での実機描画確認
- iOS 27 PWA / Safari のステータスバー強制ブラー（透け）対策（画面により効き方が割れたため本 PR から切り離し、別の iOS 依存不具合と合わせて後続 Issue で対応）

## 6. 外部事実の確認記録

本 Issue では新規の外部依存パッケージ・コンテナイメージ・GitHub Actions の追加は行わない。

| 確認事項 | 実行コマンド | 結果 |
| --- | --- | --- |
| 基準ブランチ・コミット | `git branch --show-current && git rev-parse --short HEAD && git rev-parse --short origin/develop/v2.0` | `develop/v2.0` / `0df8ed5` / `0df8ed5` |
| Issue #142 の本文・条件 | `gh issue view 142` | Open、Milestone `v2.0`、背景・検討候補（案1〜4）・未決事項を確認 |
| `.app-header` の全使用箇所 | `git grep -n "app-header" src/` | 全6画面および `main-screen.css`・`scoring-table.css` を確認 |
| `.input-section` の使用箇所 | `git grep -n "input-section" src/` | `MainScreen.tsx` と `main-screen.css` のみ（`MainScreen` 専用） |
| 全6画面の上端余白 | 各画面 CSS 読み込み | `MainScreen`: `0`、`EngineView` / `ScoringTableScreen` / `HelpScreen` / `LicenseScreen`: `0.75rem`、`SettingsScreen`: `1rem` |
| `scoring-table.css` の `border-bottom` 箇所 | `git grep -n "border-bottom" src/ui/screen/scoring-table.css` | 撤去後は `.scoring-table thead th` の1か所のみ |
| `MdDialog` スクリムの `z-index` | `grep -rn "z-index\|scrim" node_modules/@material/web/dialog/` | `:host { display: contents }` かつ `.scrim { position: fixed; z-index: 1 }` を確認 |
| `happy-dom` の `scrollY` 定義 | `grep -n "scrollY" node_modules/happy-dom/lib/window/BrowserWindow.d.ts` | L1168 `get scrollY(): number;`（getter のみ）を確認 |
| 初回 JS の基準値実測（`0df8ed5`） | `npm run build` + `gzip -9 -c dist/assets/index-OauG-NRU.js \| wc -c` | **130,044 B**（`modulepreload` なし） |
| 全テストの終了コード 0 再現（`250d9d7`） | `npx vitest run --exclude '.claude/**' --pool=forks --maxWorkers=1` | **102 passed \| 1 skipped (103 files) / 1,505 passed \| 31 skipped (1,536 tests) / exit code 0** |

## 7. 後続 Issue への引き継ぎ事項

1. **iOS 27 ステータスバー強制ブラー（透け）対策および他の iOS 依存不具合**:
   - 本 PR のマージ後、別の iOS 依存不具合と合わせて新規 Issue として起票・調査する。
2. **新規画面追加時の規約**:
   - 今後の Issue で `.app-header` を持つ新しい画面を追加する場合は、`useScrolled()` を呼び出して `<header className="app-header" data-scrolled={scrolled ? 'true' : 'false'}>` を付与し、コンテンツ領域の上端余白を `--app-header-fade-height`（`0.75rem`）以上確保すること。
