# Issue #142 ヘッダー（`.app-header`）下端部の仕上げ改善 設計書

- 状態: 第3版（独立レビュー反映済み・設計承認待ち）
- 設計担当モデル: Gemini 4 Neon
- 対象 Issue: #142（ヘッダー `.app-header` 下端部の仕上げ改善）
- 作業ブランチ予定: `feature/issue-142-header-finish`（`origin/develop/v2.0` `0df8ed5` 起点、PR base は `develop/v2.0`）
- UI 監修: 製造完了後・検収（PR 発行）前に、ローカル実画面での UI 監修を実施予定

## 1. 目的と参照資料・設計判断の根拠

全6画面で共通使用している上部固定ヘッダー（`.app-header`）の下端部の仕上げを統一する。
現在、点数計算表画面のみ一時的な `border-bottom` があり、他画面には境界表現がない。本 Issue では、全画面の `.app-header` に MD3 標準の on-scroll トーン変化と常時表示の下端グラデーションフェードを一律適用し、点数計算表画面の一時的な `border-bottom` を撤去して統一仕上げへ置き換える。また、主画面の先頭にある `WindSegment` がフェードと重ならないよう上端余白を調整する。

### 1.1 参照した資料

| 資料 | 確認した内容 |
| --- | --- |
| `gh issue view 142` | Issue #142 の背景・検討候補（案1〜4）・未決事項・Milestone `v2.0` |
| `docs/rules/02-design-protocol.md` | 設計フェーズの権限境界・必須記載項目1〜6・成果物制約 |
| `docs/rules/06-ui-md3-protocol.md` | 色・形状・モーション・タイポグラフィの MD3 トークン制約、HEX・`ms`・`cubic-bezier` 直書き禁止、bare import 禁止 |
| `docs/rules/09-bundle-budget-protocol.md` | 初回 JS バンドル目標値の基準値実測・増分積算・報告ルール |
| `src/ui/screen/main-screen.css` | `.app-header`（L18-25、`position: sticky; top: 0; z-index: 20`）、プレビュー環境スタイル（L52-56）、`.main-screen`（L90-99、上端 padding なし）、`.input-section`（L101-105、`MainScreen` 専用）、`.summary-card`（L296-313、`z-index: 10`・`top: var(--app-header-height, 0px)`）、`@media (prefers-reduced-motion: reduce)` が機能単位で3箇所（L447・L498・L793）に分散配置されていること |
| `src/ui/screen/scoring-table.css` | `.scoring-table-screen__content`（L32、上端 padding `0.75rem`）、`.scoring-table-screen .app-header` の `border-bottom: 1px solid var(--md-sys-color-outline-variant)`（L39-41）、`.scoring-table-screen__rule-label`（L115-134、`background-color: var(--md-sys-color-surface-container)`） |
| `src/ui/engine/engine.css` | `.engine-screen__content`（L24、上端 padding `0.75rem`）、`.engine-card`（L42-65、`z-index: 10`・`top: var(--engine-header-height, 0px)`・`--md-sys-motion-spring-effects-fast-*` による遷移）、`@media (prefers-reduced-motion: reduce)` での `transition: none`（L116-123） |
| `src/ui/help/help.css`・`src/ui/license/license.css`・`src/ui/settings/settings.css` | 上端 padding の実測値（`.help-screen__content`: `0.75rem`、`.license-screen__content`: `0.75rem`、`.settings-screen__content`: `1rem`）。`SettingsScreen.tsx:28` は `<main className="main-screen settings-screen__content">` で `.main-screen` を共用している。`.help-tooltip__bubble` は `z-index: 100`（`settings.css:236-241`） |
| `src/ui/screen/AppHeader.tsx` | 主画面ヘッダー実装（`headerRef` 受け渡し、`<Menu>` は `positioning="popover"`） |
| `src/ui/screen/MainScreen.tsx` | `headerRef.current.offsetHeight` を `--app-header-height` として実測・供給（L105-116, L168）、`<section className="input-section">`（L174） |
| `src/ui/engine/EngineView.tsx` | 計算画面ヘッダー実装（`headerRef.current.offsetHeight` を `--engine-header-height` として実測・供給、L105-132） |
| `src/ui/screen/ScoringTableScreen.tsx`・`SettingsScreen.tsx`・`HelpScreen.tsx`・`LicenseScreen.tsx` | 残り4画面の `<header className="app-header">` 実装および全6画面がドキュメント全体（`window`）スクロール構成であること |
| `src/ui/theme/tokens.css`・`static-tokens.css` | `--md-sys-color-background` と `--md-sys-color-surface` がライト（`#f7fbf1`）・ダーク（`#10140f`）とも同色であること、`--md-sys-color-surface-container`（ライト `#ecefe6` / ダーク `#1d211b`）、`--md-sys-motion-spring-effects-fast-duration`（150ms）・`-easing` |
| `src/ui/screen/situation-css.test.ts` | `main-screen.css` に対する HEX 色・`ms`・`cubic-bezier` の直書き禁止テスト（D5-C17） |
| `src/ui/screen/AppHeader.test.tsx`・`ScoringTableScreen.test.tsx` | 既存ヘッダーテストのアサーション構造（`<header>` への `data-scrolled` 属性追加と両立することを確認） |

### 1.2 ヒアリング済みの確定事項（前提・再検討しない）

1. **表現方式**: on-scroll トーン変化 ＋ 下端グラデーションフェード（Issue 案4）。主画面の `SummaryCard` や確率・期待値画面の `.engine-card` が貼り付いている間もグラデーションの抑止分岐は入れず、一律適用して製造後の UI 監修で確認する。
2. **未スクロール時（`scrollY === 0`）の下端フェード表示**: 常時表示（`opacity: 1` 固定、`opacity` 切替なし）。未スクロール時は `surface → transparent`、スクロール時は `surface-container → transparent` とする。
3. **主画面の風（`WindSegment`）の位置調整**: 下端フェードをかける分、主画面の `WindSegment` の位置をわずかに下げる（`.summary-card` の sticky 位置や他画面・既存テストに影響しない配置とする）。
4. **適用範囲と既存区切り線**: 全6画面（`MainScreen` / `EngineView` / `ScoringTableScreen` / `SettingsScreen` / `HelpScreen` / `LicenseScreen`）の `.app-header` に一律適用し、`src/ui/screen/scoring-table.css` の `.scoring-table-screen .app-header` にある一時的な `border-bottom` は撤去して統一仕上げへ置き換える。
5. **スクロール時のトーン**: 未スクロール時は `--md-sys-color-surface`、スクロール時は MD3 標準どおり `--md-sys-color-surface-container`（線・影なし）。
6. **点数計算表の「ツモ損」ラベル（`.scoring-table-screen__rule-label`）**: 本 Issue の設計では変更せず、製造後の UI 監修で実画面を確認する。
7. **運用**: `develop/v2.0` ベースの統合ブランチ運用。製造後にオーナーの UI 監修を実施する。

### 1.3 設計判断の根拠

1. **スクロール検知フック `useScrolled()` の採用**:
   - 全6画面（`MainScreen` / `EngineView` / `ScoringTableScreen` / `SettingsScreen` / `HelpScreen` / `LicenseScreen`）のルート要素はいずれも `min-height: 100dvh; display: flex; flex-direction: column;` であり、内部スクロール領域を持たずドキュメント全体（`window`）がスクロールする構成である。
   - このため、`window.scrollY > 0` を `{ passive: true }` の `scroll` リスナーで監視する共通フック `useScrolled()`（`src/ui/screen/use-scrolled.ts`）を新設し、全6画面の `<header className="app-header">` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与する。
   - `IntersectionObserver` + センチネル要素方式ではなく `window.scrollY > 0` を選ぶ理由は以下のとおり:
     - 全6画面にセンチネル DOM を追加する必要がなく、`AppHeader` が単体で完結し、既存テストの DOM 構造アサーションにも影響しない。
     - `window.scrollY > 0` 判定により、iOS Safari 等の最上部オーバースクロール（負の `scrollY`）でも未スクロール（`false`）を維持し、チラつきを防げる。
     - 画面遷移直後に前のスクロール位置が残っている場合でも、`useEffect` 初回実行時に `window.scrollY > 0` を同期評価するため初期状態がずれない。
     - `useState` のプリミティブ比較により、スクロール中は `0 ↔ >0` の境界をまたいだときだけ再描画が発生し、`{ passive: true }` のためスクロール性能を阻害しない。
   - 属性名・値形式は、既存の `EngineView`（`data-stuck={stuck ? 'true' : 'false'}`）に合わせて `data-scrolled={scrolled ? 'true' : 'false'}` とする。SSR（`renderToStaticMarkup`）など `window` が存在しない環境では安全に `false` を返す。

2. **本体背景と下端グラデーションフェードの色遷移同期（`background-color` + `mask-image`）**:
   - `.app-header` にカスタムプロパティ `--app-header-bg: var(--md-sys-color-surface);` を持ち、`.app-header[data-scrolled="true"]` で `--app-header-bg: var(--md-sys-color-surface-container);` に切り替える。
   - 下端フェード（`.app-header::after`）を単純な `background-image: linear-gradient(to bottom, var(--app-header-bg), transparent)` で実装すると、CSS の `background-image` は色補間（transition）されないため、本体背景が 150ms かけて変化するあいだ `::after` だけが 0ms で先に切り替わり、ヘッダー下端とフェードの継ぎ目に一瞬の色段差が生じる。
   - これを回避するため、`.app-header::after` は本体と同じ `background-color: var(--app-header-bg)` と同じ `transition` を持ち、不透明度勾配を `-webkit-mask-image` / `mask-image: linear-gradient(to bottom, var(--md-sys-color-surface), transparent)` で与える（常時表示・`opacity` 切替なし）。
     - マスクの開始色には不透明（alpha = 1）な色トークン `var(--md-sys-color-surface)` を使用する。`mask-image` はアルファチャンネルのみを参照するため、ライト／ダークいずれでも 100% → 0% の滑らかなフェードになり、かつ HEX 値や色キーワードの直書きを避けて MD3 トークン規約（`situation-css.test.ts` D5-C17）を完全に満たす。
     - 本体と `::after` の双方が同一プロパティ（`background-color`）を同一タイミング関数・時間で補間するため、`surface` ↔ `surface-container` の遷移中に継ぎ目が生じない。

3. **下端フェードのレイアウト・重なり順・操作への非干渉**:
   - `.app-header::after` は `position: absolute; inset-inline: 0; top: 100%; height: var(--app-header-fade-height); pointer-events: none; z-index: -1;`（`--app-header-fade-height: 0.75rem`）とする。
   - **`offsetHeight` への非影響**: `position: absolute; top: 100%;` によりヘッダー外の下側へ描画されるため、`.app-header` の `offsetHeight` は変化しない。`MainScreen`（`--app-header-height`）および `EngineView`（`--engine-header-height`）の固定カード位置計算や `ResultPanel` の `scrollMarginTop` は一切狂わない。
   - **操作の非阻害**: `pointer-events: none;` により、フェード直下にある入力部品・カード・ボタンのタップ／クリックを遮らない。
   - **スタッキング順序**: `.app-header` は `position: sticky; z-index: 20;` で独立したスタッキングコンテキストを作る。`.app-header::after` に `z-index: -1` を指定することで、ヘッダー外のコンテンツ（`.summary-card` `z-index: 10`、`.engine-card` `z-index: 10`、本文）に対しては親と同じ `z-index: 20` 層として手前に描画されつつ、ヘッダー内部の子要素（`.app-header__inner` 等）よりは背面に回る。また `.bottom-sheet`（後続 DOM の `z-index: 20`）や `.help-tooltip__bubble`（`z-index: 100`、`settings.css:236-241`）、`positioning="popover"` の `<Menu>` には被らない。

4. **全6画面の上端余白確認と主画面 `WindSegment` の位置下げ（`.input-section` への `padding-block-start: 0.75rem`）**:
   - 全6画面のコンテンツ領域の上端余白を実物コードで確認した結果は次のとおり:
     - `EngineView`（`engine.css:24` `.engine-screen__content`）: `0.75rem`（12px）
     - `ScoringTableScreen`（`scoring-table.css:32` `.scoring-table-screen__content`）: `0.75rem`（12px）
     - `HelpScreen`（`help.css:20` `.help-screen__content`）: `0.75rem`（12px）
     - `LicenseScreen`（`license.css:20` `.license-screen__content`）: `0.75rem`（12px）
     - `SettingsScreen`（`settings.css:7` `.settings-screen__content`）: `1rem`（16px）
     - `MainScreen`（`main-screen.css:90-99` `.main-screen`）: **`0`**（`padding-inline: 1rem` のみ）
   - 他5画面はいずれもフェード高さ（`0.75rem`）以上の上端余白を既に確保しており、追加調整は不要である。
   - 主画面の `WindSegment` を下げる余白は、`.main-screen` ではなく **`MainScreen` 専用の `.input-section` に `padding-block-start: 0.75rem;`** を付与する。理由は以下の2点:
     1. **`SettingsScreen` への副作用回避**: `SettingsScreen.tsx:28` は `<main className="main-screen settings-screen__content">` と `.main-screen` を共用しており、かつ import 順が `settings.css`（L6）→ `main-screen.css`（L7）のため、`.main-screen` に上端 padding を足すと詳細度同一の後勝ちで `settings-screen__content` の `padding-block: 1rem 2rem` を上書きしてしまう。`.input-section` は `MainScreen.tsx:174` のみで使用されているため他画面へ一切影響しない。
     2. **`.summary-card` の sticky 位置への非影響**: `<SummaryCard />` は `.main-screen` 直下・`.input-section` の前に置かれているため、`.input-section` に `padding-block-start: 0.75rem;` を付けても `.summary-card` の定位置および `top: var(--app-header-height, 0px)` の貼り付き位置は一切変化しない。また `WindSegment` の上端が他4画面と同じ `0.75rem` 下がり、未スクロール時のフェード（`0.75rem`）と重ならなくなる。

5. **モーションと `prefers-reduced-motion`、プレビュー環境との整合**:
   - 背景色の遷移は視覚効果（effects）であるため、既存の `.summary-card`・`.engine-card` と同じく `--md-sys-motion-spring-effects-fast-duration`（150ms）および `--md-sys-motion-spring-effects-fast-easing` を使用する。
   - `@media (prefers-reduced-motion: reduce)` では `.app-header, .app-header::after { transition: none; }` として遷移アニメーションを無効化する（`ms` 単位の直書きを避けるため `0ms` は使わない）。`main-screen.css` は既存の `@media (prefers-reduced-motion: reduce)` を各機能定義の直後（L447・L498・L793）に置く流儀のため、`.app-header::after` の直後に新ブロックを配置する。
   - `:root[data-app-env="preview"] .app-header` は `border-top` と `color` のみを上書きしているため、背景色・下端フェードとは干渉しない。

## 2. モジュール構成・型定義・シグネチャ

### 2.1 変更対象ファイル一覧

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/screen/use-scrolled.ts` | 新規 | `window.scrollY > 0` を `{ passive: true }` で監視する共通フック `useScrolled()` |
| `src/ui/screen/use-scrolled.test.ts` | 新規 | `useScrolled` の初期値・スクロール時の切替・0 復帰・負値（オーバースクロール）・アンマウント時のリスナー解除の単体テスト（`happy-dom`） |
| `src/ui/screen/main-screen.css` | 変更 | `.app-header` の `--app-header-bg`・`[data-scrolled="true"]` トーン変化・`::after` 下端フェード（常時表示）・直後の `prefers-reduced-motion: reduce` ブロック追加、および `.input-section` への `padding-block-start: 0.75rem` 追加 |
| `src/ui/screen/scoring-table.css` | 変更 | `.scoring-table-screen .app-header { border-bottom: ... }`（L39-41）を削除 |
| `src/ui/screen/AppHeader.tsx` | 変更 | `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/engine/EngineView.tsx` | 変更 | `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/ScoringTableScreen.tsx` | 変更 | `ScoringTableView` 内で `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/SettingsScreen.tsx` | 変更 | `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/HelpScreen.tsx` | 変更 | `HelpView` 内で `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/LicenseScreen.tsx` | 変更 | `LicenseView` 内で `useScrolled()` を呼び出し、`<header>` に `data-scrolled={scrolled ? 'true' : 'false'}` を付与 |
| `src/ui/screen/AppHeader.test.tsx` | 変更 | ヘッダー仕上げの CSS 規約（`--md-sys-color-surface` / `--md-sys-color-surface-container` / `::after` 常時表示 / `pointer-events: none` / `prefers-reduced-motion` / `.input-section` 上端余白 / `scoring-table.css` の `border-bottom` 撤去）および全6画面（`AppHeader` / `EngineView` / `ScoringTableView` / `SettingsScreen` / `HelpView` / `LicenseView`）の `renderToStaticMarkup` による `data-scrolled="false"` 出力検証テストを追加 |

### 2.2 `src/ui/screen/use-scrolled.ts`

```ts
import { useEffect, useState } from 'react';

/** ドキュメントが最上部から下にスクロールされているか(window.scrollY > 0)を返す */
export function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.scrollY > 0 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      setScrolled(window.scrollY > 0);
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

1. `src/ui/screen/AppHeader.tsx`（`MainScreen` が使用）:
   `<header ref={headerRef} className="app-header" data-scrolled={scrolled ? 'true' : 'false'}>`
2. `src/ui/engine/EngineView.tsx`:
   `<header ref={headerRef} className="app-header" data-scrolled={scrolled ? 'true' : 'false'}>`
3. `src/ui/screen/ScoringTableScreen.tsx`（`ScoringTableView` 内）:
   `<header className="app-header" data-scrolled={scrolled ? 'true' : 'false'}>`
4. `src/ui/screen/SettingsScreen.tsx`:
   `<header className="app-header" data-scrolled={scrolled ? 'true' : 'false'}>`
5. `src/ui/screen/HelpScreen.tsx`（`HelpView` 内）:
   `<header className="app-header" data-scrolled={scrolled ? 'true' : 'false'}>`
6. `src/ui/screen/LicenseScreen.tsx`（`LicenseView` 内）:
   `<header className="app-header" data-scrolled={scrolled ? 'true' : 'false'}>`

※全6画面とも既に `main-screen.css` を直接 import 済みであることを確認している（`MainScreen.tsx:33`、`EngineScreen.tsx:19`、`ScoringTableScreen.tsx:17`、`SettingsScreen.tsx:7`、`HelpScreen.tsx:16`、`LicenseScreen.tsx:13`）。

### 2.4 `src/ui/screen/main-screen.css` の変更

`.app-header` の定義および直後の `@media (prefers-reduced-motion: reduce)` ブロック（既存3箇所 L447・L498・L793 の機能単位配置に合わせ、`.app-header::after` の直後に新規ブロックとして配置する）を以下とする:

```css
.app-header {
  --app-header-bg: var(--md-sys-color-surface);
  --app-header-fade-height: 0.75rem;
  position: sticky;
  top: 0;
  z-index: 20;
  width: 100%;
  background-color: var(--app-header-bg);
  color: var(--md-sys-color-on-surface);
  transition-property: background-color;
  transition-duration: var(--md-sys-motion-spring-effects-fast-duration);
  transition-timing-function: var(--md-sys-motion-spring-effects-fast-easing);
}

.app-header[data-scrolled="true"] {
  --app-header-bg: var(--md-sys-color-surface-container);
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
  transition-property: background-color;
  transition-duration: var(--md-sys-motion-spring-effects-fast-duration);
  transition-timing-function: var(--md-sys-motion-spring-effects-fast-easing);
}

@media (prefers-reduced-motion: reduce) {
  .app-header,
  .app-header::after {
    transition: none;
  }
}
```

主画面の `WindSegment` 位置下げのため、`.input-section` に `padding-block-start: 0.75rem;` を追加する（`.main-screen` には上端 padding を追加しない）:

```css
.input-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-block-start: 0.75rem;
}
```

### 2.5 `src/ui/screen/scoring-table.css` の変更

L39-41 の以下を削除する:

```css
.scoring-table-screen .app-header {
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}
```

## 3. バンドル目標値（09号準拠）

- **基準値（`develop/v2.0` `0df8ed5` での実測）**:
  - 初回 JS（`dist/index.html` の `<script type="module" src>` が指す `dist/assets/index-OauG-NRU.js`、`modulepreload` なし）: **130,044 B**（`gzip -9 -c | wc -c`、約 130.04 kB）
- **増分の見込み内訳**:
  - `src/ui/screen/use-scrolled.ts`（`AppHeader.tsx` 経由で初回 JS に含まれる）: **約 +120 〜 +180 B**
  - `AppHeader.tsx` の `data-scrolled` 属性追加および遅延チャンクハッシュ変動（Vite/Rollup が初回 JS 内の動的 import マップに遅延チャンクのハッシュ付きファイル名を埋め込むため、ハッシュ文字列の変化に伴う gzip 圧縮効率の微小変動が見込まれる）: **約 +20 〜 +70 B**
  - 他5画面（`EngineView` / `ScoringTableScreen` / `SettingsScreen` / `HelpScreen` / `LicenseScreen`）はいずれも遅延読み込みチャンク側であり、`useScrolled` は初回 JS チャンクから共有参照されるため初回 JS の追加増分はなし。
  - CSS（`main-screen.css` / `scoring-table.css`）は JS 合計に含めない。
- **初回 JS 目標値**: **130,294 B**（基準値 130,044 B + 積算増分 250 B）。
  - 09号に基づき、目標値は目安として運用し、超過を理由に検収を不合格としない（超過時は意図しない取り込みがないか調査し、基準値・実測値・増分・積算との差・超過原因を報告する）。

## 4. 受け入れ条件チェックリスト

検収担当は以下の全項目を1つずつ実行し、すべて通過することを確認する。

1. **`useScrolled` フックの単体動作**:
   - `npx vitest run src/ui/screen/use-scrolled.test.ts` を実行する。
   - `// @vitest-environment happy-dom` 環境において、`happy-dom` の `window.scrollY` は getter のみ（`node_modules/happy-dom/lib/window/BrowserWindow.d.ts:1168`）であるため `Object.defineProperty(window, 'scrollY', { value: ..., configurable: true })` で値を設定したうえで、以下を検証するテストがすべて通過すること:
     - 初期 `window.scrollY === 0` で `false` を返すこと。
     - `window.scrollY` を正の値（例: `1` / `120`）に変更して `scroll` イベントを発火したとき `true` に変わること。
     - `window.scrollY` を `0` に戻して `scroll` イベントを発火したとき `false` に戻ること。
     - `window.scrollY` が負の値（例: `-20`、iOS オーバースクロール想定）のとき `false` のままであること。
     - マウント時点で既に `window.scrollY > 0` のとき初期値から `true` であること。
     - アンマウント時に `window.removeEventListener('scroll', ...)` でリスナーが解除されること（`addEventListener` の第3引数に `{ passive: true }` が渡されること）。
2. **全6画面の `.app-header` への `data-scrolled` 適用**:
   - `npx vitest run src/ui/screen/AppHeader.test.tsx src/ui/engine/engine-view.test.tsx src/ui/screen/ScoringTableScreen.test.tsx src/ui/screen/HelpScreen.test.tsx src/ui/screen/LicenseScreen.test.tsx` を実行し、全テストが通過すること。
   - `src/ui/screen/AppHeader.test.tsx` 内に全6画面分（`AppHeader`・`EngineView`・`ScoringTableView`・`SettingsScreen`・`HelpView`・`LicenseView`）の `renderToStaticMarkup` テストがあり、各画面の描画結果に `<header class="app-header" data-scrolled="false">` が含まれることを機械的に検証して通過すること（`AppHeader` と `SettingsScreen` は `AppStateProvider` でラップし、他4つは View コンポーネントへ最小 props を渡して描画する）。
3. **MD3 on-scroll トーン変化・下端フェード常時表示・規約準拠（`main-screen.css`）**:
   - `npx vitest run src/ui/screen/AppHeader.test.tsx src/ui/screen/situation-css.test.ts` を実行し、全テストが通過すること。
   - `src/ui/screen/main-screen.css` に以下が定義されていること:
     - 未スクロール時背景が `--md-sys-color-surface`、`.app-header[data-scrolled="true"]` で `--md-sys-color-surface-container` に切り替わること（線・`box-shadow` なし）。
     - `.app-header::after` が `position: absolute`、`top: 100%`、`pointer-events: none`、`z-index: -1`、`mask-image`（および `-webkit-mask-image`）による `linear-gradient(to bottom, ..., transparent)` を持ち、`opacity: 0` による非表示切替がない（常時表示である）こと。
     - トランジションに `--md-sys-motion-spring-effects-fast-duration` / `--md-sys-motion-spring-effects-fast-easing` を使用し、`.app-header::after` 直後の `@media (prefers-reduced-motion: reduce)` で `.app-header` と `.app-header::after` に `transition: none` が設定されていること。
     - `situation-css.test.ts`（D5-C17）が通過し、HEX カラー・`ms`・`cubic-bezier` の直書きがないこと。
4. **主画面 `WindSegment` の位置下げ（上端余白）と他画面への非影響**:
   - `npx vitest run src/ui/screen/AppHeader.test.tsx` の CSS 検証テストおよび `src/ui/screen/main-screen.css` の確認において、`.input-section` に `padding-block-start: 0.75rem;` が設定されており、`.main-screen` には `padding-top` / `padding-block-start` / `padding-block` が追加されていないこと（`SettingsScreen` の `.settings-screen__content` や `.summary-card` の sticky 位置に影響しないこと）。
5. **点数計算表の一時 `border-bottom` 撤去（`scoring-table.css`）**:
   - `src/ui/screen/scoring-table.css` に `.scoring-table-screen .app-header` の `border-bottom` 定義が存在しないこと（`AppHeader.test.tsx` のテストおよび `git grep -n "border-bottom" src/ui/screen/scoring-table.css` で `.scoring-table thead th` の1か所のみが残ることを確認）。
6. **静的検査・全テスト・ビルド**:
   - `npm run lint`、`npm run typecheck`、`npm run format:check`、`npm test`、`npm run build` をすべて実行し、終了コード 0 でエラーなく通過すること。
7. **バンドルサイズの実測記録（09号）**:
   - `npm run build` 後、`dist/index.html` の `<script type="module" src>`（および `<link rel="modulepreload" href>` があればそれも含む）が指す JS を `gzip -9 -c <file> | wc -c` で計測し、基準値（130,044 B）・実測値・増分・積算増分（+250 B）との差を PR 本文に記録すること（目標値超過は不合格条件としない）。
8. **ローカル実画面での UI 監修完了**:
   - 本項目は自動合否判定ではなく、製造完了後・PR 発行前にオーナーによるローカル実画面での UI 監修を実施し、以下の観点を実機／実ブラウザで確認したうえで**オーナーによる「監修終了」の指示をもって合格**とする:
     - 全6画面（主画面・確率/期待値・点数計算表・設定・ヘルプ・ライセンス）での未スクロール ↔ スクロール時のトーン変化と常時表示の下端フェードの見え方（ライト／ダーク両テーマ）。
     - 主画面の `WindSegment` の上端余白（`0.75rem`）のバランスと、`SummaryCard`・`.engine-card` が貼り付いている間の下端フェードとの重なり感。
     - 点数計算表画面で「ツモ損」ラベル（`.scoring-table-screen__rule-label`）がスクロール時のヘッダー背景に溶け込む見え方に支障がないか。
     - プレビュー環境（`data-app-env="preview"`）および `prefers-reduced-motion: reduce` 時の挙動。
     - `vite preview`（本番ビルド）での描画確認。

## 5. 実挙動未確認の箇所

本設計書は設計フェーズ（コード未実装）の成果物であるため、以下は**実挙動未確認**である。製造および UI 監修・検収で実ブラウザ確認を行う。

- 実ブラウザ（Chrome / Safari / iOS PWA）における `background-color` + `-webkit-mask-image` / `mask-image` の描画と、ライト／ダーク両テーマでの `surface` ↔ `surface-container` 遷移の視覚的滑らかさ。
- 下端フェード高さ（`--app-header-fade-height: 0.75rem`）および主画面 `.input-section` の上端余白（`0.75rem`）の実画面でのバランス（UI 監修で微調整対象）。
- 主画面の `SummaryCard` および確率・期待値画面の `.engine-card` がヘッダー直下に貼り付いている間の下端フェードとの重なり感。
- 点数計算表画面のスクロール時における `.scoring-table-screen__rule-label`（ツモ損あり）の視認性。
- iOS Safari の最上部オーバースクロール（バウンス）時に `window.scrollY > 0` 判定でチラつきが発生しないこと。
- 本番ビルド（`vite preview`）環境での CSS 適用と動作。

## 6. 外部事実の確認記録

本 Issue では新規の外部依存パッケージ・コンテナイメージ・GitHub Actions の追加は行わない。設計の前提とした既存リポジトリ・ビルド結果およびブラウザ仕様の確認状況を以下に示す。

| 確認事項 | 実行コマンド | 結果 |
| --- | --- | --- |
| 基準ブランチ・コミット | `git branch --show-current && git rev-parse --short HEAD && git rev-parse --short origin/develop/v2.0` | `develop/v2.0` / `0df8ed5` / `0df8ed5` |
| Issue #142 の本文・条件 | `gh issue view 142` | Open、Milestone `v2.0`、背景・検討候補（案1〜4）・未決事項を確認 |
| `.app-header` の全使用箇所 | `git grep -n "app-header" src/` | 全6画面（`AppHeader.tsx` / `EngineView.tsx` / `ScoringTableScreen.tsx` / `SettingsScreen.tsx` / `HelpScreen.tsx` / `LicenseScreen.tsx`）および `main-screen.css`・`scoring-table.css` を確認 |
| `.input-section` の使用箇所 | `git grep -n "input-section" src/` | `src/ui/screen/MainScreen.tsx:174` と `src/ui/screen/main-screen.css:101` のみ（`MainScreen` 専用であることを確認） |
| 全6画面の上端余白 | `main-screen.css` / `engine.css` / `scoring-table.css` / `help.css` / `license.css` / `settings.css` 読み込み | `MainScreen`: `0`、`EngineView` / `ScoringTableScreen` / `HelpScreen` / `LicenseScreen`: `0.75rem`、`SettingsScreen`: `1rem`（`.main-screen` を共用）を確認 |
| `scoring-table.css` の `border-bottom` 箇所 | `git grep -n "border-bottom" src/ui/screen/` | `scoring-table.css:40`（`.scoring-table-screen .app-header`）と `scoring-table.css:170`（`.scoring-table thead th`）の2箇所を確認 |
| 色トークン値（ライト／ダーク） | `git grep -n "surface-container\b\|color-surface\b\|color-background\b" src/ui/theme/tokens.css` | ライト: `background`/`surface` = `#f7fbf1`、`surface-container` = `#ecefe6`。ダーク: `background`/`surface` = `#10140f`、`surface-container` = `#1d211b` |
| `z-index` と `prefers-reduced-motion` の既存利用 | `git grep -n "z-index" src/ui/ && git grep -n "prefers-reduced-motion" src/ui/` および `settings.css:236-241` 読み込み | `.app-header` = `20`、`.summary-card` = `10`、`.engine-card` = `10`、`.result-banner` = `19`、`.bottom-sheet` = `20`、`.help-tooltip__bubble` = `100` を確認 |
| `package.json` の `sideEffects`・依存版 | `package.json` 読み込み | `"sideEffects": ["*.css"]`、`@material/web: "2.5.0"`、`react: "^19.0.0"`、`vite: "^6.1.0"`、`vitest: "^3.0.5"`、`happy-dom: "^21.0.4"` |
| 初回 JS の基準値実測 | `npm run build && grep -oE '<(script\|link)[^>]+(src\|href)="[^"]+\.js"[^>]*>' dist/index.html && for f in dist/assets/*.js; do printf "%s: %s B\n" "$f" "$(gzip -9 -c "$f" \| wc -c \| tr -d ' ')"; done` | `dist/index.html` の初回 JS は `assets/index-OauG-NRU.js` のみ（`modulepreload` なし）= **130,044 B** |
| 既存関連テストの動作 | `npx vitest run --exclude '.claude/**' src/ui/screen/AppHeader.test.tsx src/ui/screen/situation-css.test.ts src/ui/screen/ScoringTableScreen.test.tsx src/ui/engine/engine-view.test.tsx` | **4 test files / 58 tests passed**（`exit code 0`） |
| `-webkit-mask-image` / `mask-image` の実機ブラウザ互換性（iOS Safari PWA 含む） | 未実行 | **未確認**（UI 監修・実機確認対象） |

## 7. 後続 Issue への引き継ぎ事項

1. **UI 監修での微調整余地**:
   - 下端フェードの高さ（`--app-header-fade-height: 0.75rem`）や主画面 `.input-section` の上端余白（`0.75rem`）、主画面 `SummaryCard`・計算画面 `.engine-card` 貼り付き時の見え方、点数計算表の「ツモ損」ラベル（`.scoring-table-screen__rule-label`）のスクロール時視認性は、製造後のローカル実画面 UI 監修で最終判断する。
2. **新規画面追加時の規約**:
   - 今後の Issue で `.app-header` を持つ新しい画面を追加する場合は、`useScrolled()` を呼び出して `<header className="app-header" data-scrolled={scrolled ? 'true' : 'false'}>` を付与し、コンテンツ領域の上端余白を `--app-header-fade-height`（`0.75rem`）以上確保すること。
