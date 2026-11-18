# 設定画面 (.settings-screen) の余白修正 設計書

- 対象: Issue なしの軽微な UI 修正(先例: [docs/design/symbols-inline-svg.md](symbols-inline-svg.md))
- 設計担当モデル: `Antigravity (Gemini 4 Argon High)`
- 基準コミット: `main` `ecc6a08` (2026-11-18 時点)
- 製造ブランチ(予定): `fix/settings-screen-padding` (設計段階ではブランチを切らず、コミットもしない)
- 体制・運用: 製造(実装)はオーナー自身が実施し、設計と検収のみエージェント側で実施する。設計書の独立レビューは省略で合意済み
- 状態: **設計確定(設計承認待ち)**(未決事項なし)

## 1. 目的と範囲

### 1.1 目的

設定画面(`src/ui/screen/SettingsScreen.tsx` / `src/ui/settings/settings.css`)において、ルート要素 `.settings-screen` に指定されている `padding: 1rem;` と `gap: 1.5rem;` により、ヘッダー(`.app-header`)の外周およびヘッダーと本文領域(`.settings-screen__content`)の間、さらに本文左右・下端の余白が二重に空いている問題を解消する。

### 1.2 変更対象(範囲内)

- `src/ui/settings/settings.css` の `.settings-screen` ブロック(L10〜17)のみ(`gap: 1.5rem;` と `padding: 1rem;` の 2 行を削除)
- 本設計書 `docs/design/fix-settings-screen-padding.md`

### 1.3 範囲外(変更禁止)

- `src/ui/settings/settings.css` の `.settings-screen__content`(L3〜8、`padding-block: 1rem 2rem;`・`gap: 1.25rem;` を現状維持)および L19 以降(`.settings-notice` 以降)のすべてのスタイル定義
- `src/ui/screen/SettingsScreen.tsx`・`src/ui/screen/main-screen.css` を含む上記以外のすべてのプロダクションコード・テストファイル・設定ファイル

## 2. 参照資料と設計判断の根拠

### 2.1 ヒアリング済みの確定事項(統括担当経由・すべて確定)

| # | 確定事項 | 本書での反映 |
| --- | --- | --- |
| 1 | 設定画面の `.settings-screen` の余白が開いている問題を修正する。製造(実装)はオーナー自身が行い、設計と検収のみエージェント側で行う。設計書の独立レビューは省略 | §1・§3・§4 |
| 2 | オーナーによる F12 実機確認の結果、`src/ui/settings/settings.css` の `.settings-screen` から `gap: 1.5rem;` と `padding: 1rem;` の 2 行を削除するのみとし、`.settings-screen__content`(`padding-block: 1rem 2rem;`・`gap: 1.25rem;`)を含むそれ以外の変更は今回見送り(範囲外・現状維持)とする | §1.2・§1.3・§3.2・§3.3・§4 |

### 2.2 参照した資料・実物コードと導いた判断

| 資料・コード | 確認した事実と導いた判断 |
| --- | --- |
| `AGENTS.md`、[docs/rules/02-design-protocol.md](../rules/02-design-protocol.md)、[06-ui-md3-protocol.md](../rules/06-ui-md3-protocol.md)、[09-bundle-budget-protocol.md](../rules/09-bundle-budget-protocol.md)、advisory [G-08](../rules/advisory/G-08-ui-measurement-pitfalls.md)・[G-10](../rules/advisory/G-10-design-consistency-pitfalls.md) | 製造がオーナー実施であり変更対象が `src/ui/settings/settings.css` の `.settings-screen` のみと確定しているため、追加のテストコード実装を課さず、CSS 定義・既存テスト通過・実画面の `getBoundingClientRect()` / `getComputedStyle()` 実測で検証する受け入れ条件とする |
| `src/ui/screen/SettingsScreen.tsx`、`src/ui/settings/settings.css`、`src/ui/screen/main-screen.css` | `<div className="settings-screen">` の直接の DOM 子要素は `<header className="app-header">` と `<main className="main-screen settings-screen__content">` の 2 つだけである(`HelpTooltipScope` は Context Provider であり DOM 要素を生成しない)。詳細は §3.1 |
| `src/ui/help/help.css` (`HelpScreen.tsx`)、`src/ui/license/license.css` (`LicenseScreen.tsx`)、`src/ui/screen/scoring-table.css` (`ScoringTableScreen.tsx`)、`src/ui/screen/MainScreen.tsx` | 他 4 画面のルート要素(`.app-shell`・`.help-screen`・`.license-screen`・`.scoring-table-screen`)にはいずれも `padding` と `gap` が指定されておらず、`.settings-screen` から `padding: 1rem;` と `gap: 1.5rem;` を削除することでルート要素の余白構造が全画面で揃う |
| `src/ui/settings/settings-css.test.ts`、`src/build-css.test.ts` | `settings-css.test.ts` は `.help-tooltip__*`・`.settings-row*`・`.settings-detail-group` のみを検証しており、`.settings-screen` の変更で壊れない。`build-css.test.ts` は各 CSS ファイルの先頭クラスセレクタ(`.settings-screen__content`)が本番ビルド CSS に含まれることを検証しており、影響しない |
| [docs/design/issue-50-settings-screen.md](issue-50-settings-screen.md) §4.1・A27 | Issue #50 当時の A27 で「テーマの各ボタン幅は 375px で約 102px、320px で約 84px」と実測されていたのは、`.settings-screen` の左右 `padding: 1rem` (計 32px) と `.main-screen` の `padding-inline: 1rem` (計 32px) が二重に効き、コンテンツ幅が 311px / 256px に狭まっていたためである。`.settings-screen` の `padding: 1rem` を除くとコンテンツ幅は 343px / 288px(+32px)に広がる(§3.4) |

## 3. 実物構造の分析と設計仕様

### 3.1 実物の DOM 構造と CSS の作用(調査結果)

`src/ui/screen/SettingsScreen.tsx` が描画する DOM ツリーの外枠は次のとおりである。

```html
<div class="settings-screen">
  <header class="app-header">
    <div class="app-header__inner app-header__inner--start">
      <!-- 戻る IconButton + <h1 class="app-header__title">設定</h1> -->
    </div>
  </header>
  <main class="main-screen settings-screen__content">
    <!-- (条件付き) <p role="status" class="settings-notice"> -->
    <!-- <section class="settings-section"> (ThemeSection) -->
    <!-- <md-divider> -->
    <!-- <section class="settings-section"> (RuleSection) -->
    <!-- <md-divider> -->
    <!-- <md-text-button class="settings-screen__license-link"> -->
  </main>
</div>
```

現在(`main` `ecc6a08`)、各セレクタの定義と実際の作用は次のようになっている。

#### (1) ルート要素 `<div class="settings-screen">`

- `src/ui/screen/main-screen.css` L11〜16:
  ```css
  .app-shell,
  .settings-screen {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }
  ```
- `src/ui/settings/settings.css` L10〜17:
  ```css
  .settings-screen {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem;
    color: var(--md-sys-color-on-surface);
    box-sizing: border-box;
  }
  ```
- **`padding: 1rem;` (上下左右 16px) の作用**:
  1. **ヘッダー外周の浮きと二重余白**: `<header class="app-header">` の上・左・右に 16px の外側余白が空く。内側の `.app-header__inner` が持つ `padding: 0.5rem 1rem` (上下 8px・左右 16px)と合算され、戻るボタンが画面上端から `1.5rem` (24px)・画面左端から `2rem` (32px) 離れた位置に押し込まれている(他 4 画面は上端から 8px・左端から 16px)。また、プレビュー環境(`:root[data-app-env="preview"] .app-header` の `border-top: 0.25rem solid ...`)でも、設定画面だけ上端アクセントラインが画面端から 16px 内側に浮いて縮んでしまう。
  2. **本文左右の二重余白**: `<main class="main-screen settings-screen__content">` が持つ `.main-screen` の `padding-inline: 1rem` (左右 16px)と二重になり、本文の左右余白が `2rem` (32px) になっている(画面幅 375px で有効幅が他画面の 343px に対し 311px)。
  3. **画面下端の二重余白**: `.settings-screen__content` の `padding-block-end: 2rem` (32px)と合算され、下端余白が `3rem` (48px) になっている(他サブ画面は 32px)。
- **`gap: 1.5rem;` (24px) の作用**:
  - `<div class="settings-screen">` の直接の子要素は `<header class="app-header">` と `<main class="main-screen settings-screen__content">` の **2 つだけ** である。
  - したがって、`.settings-screen` の `gap: 1.5rem` は **`<header>` の下端と `<main>` の上端の間の 24px の隙間としてのみ作用しており、`<main>` 内部の「テーマ」「ルール」「ライセンス」等のセクション間には一切作用していない**。

#### (2) 本文要素 `<main class="main-screen settings-screen__content">` (現状維持)

- `src/ui/screen/main-screen.css` L90〜99:
  ```css
  .main-screen {
    width: 100%;
    max-width: var(--app-max-width);
    margin-inline: auto;
    padding-inline: 1rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  ```
- `src/ui/settings/settings.css` L3〜8:
  ```css
  .settings-screen__content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-block: 1rem 2rem;
  }
  ```
- **`padding-block: 1rem 2rem;` (上 16px・下 32px) の作用**:
  - `.settings-screen` から `gap: 1.5rem` (24px) と `padding: 1rem` (16px) を削除することで、ヘッダー下端から本文先頭(「テーマ」見出し上端)までの距離は `.settings-screen__content` の `padding-block-start: 1rem` (**16px**) のみとなり、画面下端の余白は `padding-block-end: 2rem` (**32px**) のみとなる。
- **`gap: 1.25rem;` (20px) と `.main-screen` の `gap: 1rem;` (16px) の優先関係**:
  - `SettingsScreen.tsx` L6〜7 のソースコード上の import 順は `import '../settings/settings.css';` → `import './main-screen.css';` である。
  - しかし実際のアプリ実行時(`npm run dev` および本番ビルド `npm run build`)では、初期表示される `MainScreen.tsx` が同期的に `main-screen.css`(本番では `dist/index.html` の `assets/index-*.css`)を先に読み込み、`SettingsScreen.tsx` は `App.tsx` の `React.lazy` により設定画面への遷移時に遅延読み込みされて `settings.css`(本番では `assets/SettingsScreen-*.css`)を後から `<head>` 末尾に追加する(§5 で確認済み)。
  - そのため、**実ブラウザ上でメイン画面から設定画面を開いた場合は、後から読み込まれる `.settings-screen__content` の `gap: 1.25rem` (20px) が `.main-screen` の `gap: 1rem` (16px) に勝って適用されている**(`HelpScreen` の `.help-screen__content` や `LicenseScreen` の `.license-screen__content` の `gap: 1.25rem` と同じ 20px が、「テーマ」セクション・`Divider`・「ルール」セクション・`Divider`・「ライセンス」ボタンの間に適用されている)。

### 3.2 確定仕様の余白一覧と、検討した代替案(今回見送った事項)

#### (1) 修正前後の余白の対比(確定仕様)

| 項目 | 修正前 (`main` `ecc6a08`) | **修正後 (確定仕様)** | 備考 |
| --- | --- | --- | --- |
| `.settings-screen` の `padding` | `1rem` (16px) | **削除 (`0px`)** | ヘッダー外周の浮き・左右と下端の二重余白を解消 |
| `.settings-screen` の `gap` (`<header>` と `<main>` の間) | `1.5rem` (24px) | **削除 (`0px`)** | ヘッダーと `<main>` の間の二重間隔を解消 |
| `.settings-screen__content` の `padding-block` | `1rem 2rem` (上 16px・下 32px) | **変更なし (`1rem 2rem`)** | ヘッダー下端〜本文先頭 = `1rem` (16px)、下端 = `2rem` (32px) |
| `.settings-screen__content` の `gap` (セクション・Divider 間) | `1.25rem` (20px) | **変更なし (`1.25rem` = 20px)** | 変更対象外 |
| ヘッダー (`.app-header`) 外周の上・左右の余白 | 上 16px・左右 16px | **`0px` (画面上端・左右端に密着)** | 他 4 画面と一致。戻るボタンは左端から `1rem` (16px) |
| 本文 (`.settings-screen__content`) の左右余白 | `2rem` (32px) | **`1rem` (16px)** | `.main-screen` の `padding-inline: 1rem` のみ(他 4 画面と一致) |
| ヘッダー下端から本文先頭(「テーマ」見出し上端)までの距離 | `1.5rem + 1rem` = `2.5rem` (40px) | **`1rem` (16px)** | `.settings-screen__content` の `padding-block-start: 1rem` のみ |
| 画面下端の余白 | `1rem + 2rem` = `3rem` (48px) | **`2rem` (32px)** | `.settings-screen__content` の `padding-block-end: 2rem` のみ |

#### (2) 検討した代替案・今回見送った事項

ヒアリング時に以下の代替案を比較検討し、オーナーによる F12 実機確認を経て、今回は `.settings-screen` の `gap: 1.5rem;` と `padding: 1rem;` の削除のみを採用し、他は見送った。

- **`.settings-screen__content` の `padding-block` を `0.75rem 2rem` に変更する案(旧案①)**:
  - 他サブ画面(`help.css`・`license.css`・`scoring-table.css` の `padding: 0.75rem 1rem 2rem;`)に合わせて上側パディングを `1rem` (16px) → `0.75rem` (12px) に揃える案。実機確認の結果、`.settings-screen` の `padding` と `gap` を削除した状態の `padding-block: 1rem 2rem`(上 16px)で十分自然であるため、`.settings-screen__content` への変更は今回見送り(現状維持)とした。
- **`.settings-screen` の `gap: 1.5rem` を残す案(旧案②)**:
  - `<header>` と `<main>` の間に `1.5rem` (24px) の隙間が残り、`<main>` の上側パディングと合算されてヘッダー下に 36px〜40px の大きな空白が残るため不採用とした。

### 3.3 具体的な CSS 変更仕様(`src/ui/settings/settings.css` L10〜17)

#### 変更前(現状 `main` `ecc6a08`)

```css
.settings-screen {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  color: var(--md-sys-color-on-surface);
  box-sizing: border-box;
}
```

#### 変更後(確定仕様)

```css
.settings-screen {
  display: flex;
  flex-direction: column;
  color: var(--md-sys-color-on-surface);
  box-sizing: border-box;
}
```

※ L3〜8 の `.settings-screen__content` を含む他の行は一切変更しない。

### 3.4 既存部品・テスト・バンドルへの影響

1. **設定画面内の各部品の横幅(375px 幅・320px 幅)**:
   - `.settings-screen` の `padding: 1rem` (左右計 32px) がなくなることで、`<main class="main-screen settings-screen__content">` のコンテンツ有効幅は、画面幅 375px で **311px → 343px**(+32px)、画面幅 320px で **256px → 288px**(+32px) に広がる(最大幅 `--app-max-width: 600px` 以下において)。
   - テーマの 3 ボタン(`.settings-theme-row > .connected-button-group`, `width: 100%`)の 1 ボタンあたり幅は、375px 幅で約 102px → **約 113px**(`(343 - 4) / 3`)、320px 幅で約 84px → **約 94.7px**(`(288 - 4) / 3`)に広がり、ラベルの折り返し防止に対してより余裕が増す。
   - 赤ドラ・北の扱い・連風牌の雀頭の `ConnectedButtonGroup`、および積み棒・供託の `PointField` も行幅が 32px 広がるため、同一行配置や help 当たり判定との間隔(8px 以上)に対して安全側に働く。
   - `HelpTooltip` の左右見切れ防止(`computeTooltipShiftX`)は、開いた時点の `getBoundingClientRect()` と `document.documentElement.clientWidth` から動的に `margin-left` を計算するため、そのまま機能する。
2. **既存テスト**:
   - `src/ui/settings/settings-css.test.ts` および `src/build-css.test.ts` を含む全テストは変更なしで通過する。
3. **バンドルサイズ(09 号)**:
   - 基準値(設計時実測、`main` `ecc6a08`、`npm run build` 後の `dist/index.html` が指す `assets/index-Dm42vSYg.js` の `gzip -9`): **128,928 B**(遅延チャンク `assets/SettingsScreen-BaTiPaJ_.css` の `gzip -9` は **1,677 B**)。
   - 積算: 遅延チャンク `SettingsScreen-*.css` から CSS プロパティ 2 行を削除するのみであり、初回 JS の増分見込みは **0 B**(チャンクハッシュ変化による変動があっても ±5 B 以内)。
   - 目標値: **128,928 B**(超過を不合格条件にしない)。

## 4. 受け入れ条件

検収担当は以下の各項目を順に実行して検証する(画面計測は `npm run build` → `npm run preview` または `npm run dev` を自分が起動した PID で行い、終了時に自分の PID のみを停止すること。01 号「devサーバーの禁止事項」および G-08 準拠)。

1. **AC-1 (変更ファイル範囲と禁止事項)**:
   - `git diff --name-only main` の出力が `src/ui/settings/settings.css` と `docs/design/fix-settings-screen-padding.md` のみであること。
   - `git diff main | grep -nE '/Users/|/home/'` の出力が 0 行であること。
2. **AC-2 (`settings.css` の定義確認)**:
   - `git diff main -- src/ui/settings/settings.css` において、変更が `.settings-screen` ブロックからの `gap: 1.5rem;` と `padding: 1rem;` の 2 行削除のみであり、`.settings-screen__content`(`gap: 1.25rem;`・`padding-block: 1rem 2rem;`)を含む他のセレクタ・プロパティに変更がないこと。
   - `src/ui/settings/settings.css` の `.settings-screen` ブロック内に `padding` および `gap` プロパティが存在しないこと。
3. **AC-3 (静的検査・単体テスト)**:
   - `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` を実行し、すべてエラーなく通過すること。
4. **AC-4 (ヘッダーおよび本文の左右位置・有効幅の実測: 375×812)**:
   - ビューポート 375×812 でメイン画面からメニュー →「設定」を開き、`await document.fonts.ready` 後に `getBoundingClientRect()` と `getComputedStyle()` を計測する:
     - `.settings-screen` の `getComputedStyle` の `paddingTop`・`paddingRight`・`paddingBottom`・`paddingLeft`・`rowGap` がすべて `'0px'` であること。
     - `.app-header` の `getBoundingClientRect()` が `top: 0`・`left: 0`・`width: 375`(差 0.5px 以内)であり、画面上端・左右端に密着していること。
     - `.settings-screen__back-button` の `getBoundingClientRect().left` が `16`(±0.5px)であること(ヘルプ画面 `.help-screen__back-button` の `left: 16` と一致)。
     - `<main class="main-screen settings-screen__content">` 内の最初のセクション(`.settings-section`)の `getBoundingClientRect()` が `left: 16`・`right: 359`・`width: 343`(±0.5px)であること。
     - `document.documentElement.scrollWidth <= document.documentElement.clientWidth`(横スクロールが発生しない)こと。
5. **AC-5 (ヘッダー下端〜本文先頭・セクション間・下端の縦余白の実測: 375×812)**:
   - 同じ 375×812 の設定画面(読込注記 `.settings-notice` が出ない通常状態)で計測する:
     - `.settings-screen__content` の `getComputedStyle` の `paddingTop` が `'16px'`(`1rem`)、`paddingBottom` が `'32px'`(`2rem`)、`rowGap`(または `gap`)が `'20px'`(`1.25rem`)であること。
     - `.app-header` の `getBoundingClientRect().bottom` と、最初の `.settings-section`(「テーマ」セクション)の `getBoundingClientRect().top` の差(`section.top - header.bottom`)が **`16px`**(`1rem`、±0.5px)であること。
6. **AC-6 (バンドルサイズ計測と記録: 09 号)**:
   - `npm run build` 後、`dist/index.html` が指す module script(`assets/index-*.js`)の `gzip -9 -c <file> | wc -c` を実測し、基準値 `128,928 B`・実測値・増分・積算(`0 B`)との差を PR 本文に記録すること(目標値の超過は不合格としない)。

## 5. 外部事実の確認記録

設計時に実行したコマンドと結果は以下のとおりである。

| 確認項目 | 実行コマンド | 結果 |
| --- | --- | --- |
| 基準コミットと作業ツリー状態 | `git status --porcelain && git rev-parse --short HEAD` | 差分なし(空出力)、HEAD は `ecc6a08` |
| 本番ビルドでの CSS チャンク分離と定義内容 | `grep -o ".main-screen{[^}]*}" dist/assets/index-Cc5Q5d12.css && grep -o ".settings-screen__content{[^}]*}" dist/assets/SettingsScreen-BaTiPaJ_.css` | `index-Cc5Q5d12.css` に `.main-screen{...;gap:1rem}`、`SettingsScreen-BaTiPaJ_.css` に `.settings-screen__content{display:flex;flex-direction:column;gap:1.25rem;padding-block:1rem 2rem}` が出力されており、`dist/index.html` は `index-Cc5Q5d12.css` のみを初期 `<link rel="stylesheet">` として読み込むことを確認 |
| 初回 JS と設定画面 CSS の基準サイズ (`gzip -9`) | `gzip -9 -c dist/assets/index-Dm42vSYg.js \| wc -c && gzip -9 -c dist/assets/SettingsScreen-BaTiPaJ_.css \| wc -c` | 初回 JS: `128,928 B`、`SettingsScreen-*.css`: `1,677 B` |

## 6. 後続への引き継ぎ・実挙動未確認

- **後続への引き継ぎ**:
  - [docs/design/issue-50-settings-screen.md](issue-50-settings-screen.md) §4.1・A27 に記載されている「テーマの各ボタン幅は 375px で約 102px、320px で約 84px」は `.settings-screen` に `padding: 1rem` があった時点の実測値であり、本修正後はコンテンツ幅が 343px / 288px となるため 1 ボタンあたり約 113px / 約 94.7px となる(旧設計書 `issue-50-settings-screen.md` は範囲外のため書き換えない)。
  - `.settings-screen__content` の `padding-block: 1rem 2rem;`(上 16px)と、他サブ画面(`.help-screen__content`・`.license-screen__content`・`.scoring-table-screen__content`)の `padding: 0.75rem 1rem 2rem;`(上 12px)の 4px の差は、今回オーナー判断により現状維持としている。将来全サブ画面の上側パディングを統一する場合は別タスクで扱う。
- **実挙動未確認**:
  - 修正コミット適用後の検収環境における `getBoundingClientRect()` 実測(検収フェーズの AC-4・AC-5 で実施する)。
