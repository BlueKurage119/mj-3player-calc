# Issue #40 設計書: Material Web のラッパーと自作コンポーネント(C2)

- Epic: C(デザイン基盤, #4)
- 依存: C1(#39、マージ済み)、**C3(#41、並行製造中)**
- ブランチ: `feature/issue-40-md-wrappers`

## 0. 製造開始の前提(必須)

1. **製造は C3(#41)が main にマージされた後に開始する。** 製造担当は着手時に main を取り込み、次の実物が main にあることを確認してから作業する。無ければ作業を止めて統括担当へ報告する。
   - `src/ui/app-mode.ts`(`isTileGalleryMode(search: string): boolean`)と `src/ui/app-mode.test.ts`
   - `src/ui/App.tsx` の `?gallery=tiles` 分岐(`lazy(() => import('./tile/TileGallery'))` + `<Suspense fallback={null}>`)
   - `package.json` の C3 変更(`tiles:optimize` スクリプト等)
2. 本設計書の 2.3・2.6 の記述は C3 の設計書(`feature/issue-41-tile-images` ブランチの `docs/design/issue-41-tile-images.md` 2.7 節)に基づく。**main の実物と食い違う場合は実物を正とし、食い違いの内容を最終報告に書く**(関数名が変わっていた等。設計の意図「URL 解釈を `app-mode.ts` 1か所に集める」「ギャラリーは遅延読み込み」は変えない)。
3. 衝突の見込み:

| ファイル | C3 の変更 | C2 の変更 | 見込み |
| --- | --- | --- | --- |
| `package.json` | スクリプト追加 | `dependencies` に `@material/web` 追加 | 別ブロック。C3 マージ後に着手すれば衝突しない |
| `src/ui/App.tsx` | `?gallery=tiles` 分岐を新設 | `?gallery=md` 分岐を追加 | 同じ箇所。C3 マージ後に着手すれば追記で済む |
| `src/ui/app-mode.ts`・テスト | 新規 | 関数追加 | 同上 |
| `src/main.tsx` | 変更なし(C3 設計書による) | `?theme=` の適用 | 衝突なし見込み |
| `package-lock.json` | 依存追加の可能性 | `@material/web`・`lit` 系の追加 | C3 マージ後に `npm install` し直せば解消 |

## 1. 参照資料と判断の根拠

### 1.1 参照資料

- `AGENTS.md`、`docs/rules/01`・`02`・`06`・`08`、advisory `G-08`・`G-09`・`G-10`・`C-01`・`C-02`
- `docs/design/issue-39-md3-theme.md`(4章 引き継ぎ: 仮切替・`useSyncExternalStore` フック・図形モーフ/emphasized タイポ/部分角は C2 以降)
- `src/ui/theme/`(`apply-theme.ts`・`theme-config.ts`・`static-tokens.css`・`index.ts`)、`src/main.tsx`、`src/ui/App.tsx`
- GitHub Issue #40、`docs/issues-draft.md` Epic C〜E、`docs/requirements.md`
- C3 設計書(上記 0.2)
- 統括担当のヒアリング結果(ユーザーが全論点を「提案どおり」で確定)

### 1.2 確定事項(ヒアリング済み。再検討しない)

| # | 確定事項 | 本設計での反映 |
| --- | --- | --- |
| 1 | 包む部品は最小集合: button(filled/tonal/outlined/text)・icon-button・chip(filter/assist)・switch・dialog・tabs・select または list・divider・ripple/focus。labs は使わない | 2.2。select/list の選択は 1.3 |
| 2 | 自作は図形モーフの土台と、それを使う button group / segmented。emphasized タイポ・部分角トークンは要る分だけ `static-tokens.css` に追加 | 2.4・2.5 |
| 3 | テーマ仮切替 `?theme=light\|dark\|auto`、保存しない、URL 読み取りは `src/ui/app-mode.ts` に相乗り | 2.3・2.6 |
| 4 | `src/ui/theme/` に `useTheme()`(`useSyncExternalStore`) | 2.3 |
| 5 | 薄い React 関数部品で包む。登録はクラス参照(bare import 禁止)。生タグはラッパー内のみ。`@lit/react` 不使用 | 2.2 |
| 6 | 確認画面 `?gallery=md`(遅延読み込み、バレル非 export) | 2.6 |
| 7 | `@material/web` は `2.5.0` キャレット無し固定。バンドル予算を設け、ボタン1個のプローブ実測の約3倍を枠にする(gzip、初回 JS、ギャラリーは枠外) | 2.1・2.7 |

### 1.3 設計担当の判断と根拠

以下のうち「select を包み list は包まない」「setPreference に persist を足す」は、統括担当経由でユーザーが確定した(2026-11-01)。

- **D6 用は select を包み、list は包まない。** 根拠: D6 は `RULE_ITEMS`(列挙型の選択肢を持つ項目)から設定画面を組み立てる(`docs/issues-draft.md` D6)。真偽の項目は switch、列挙の項目は select で一項目一行に収まり、list は「行の並び」の器にすぎず自前の `<div>` で代替できる。select(`md-outlined-select` + `md-select-option`)は正式部品であり labs ではない。D6 で list が要ると判明したら D6 でラッパーを足す(06号3項)。
- **イベントと状態プロパティは ref 経由で扱う。** React 19 はカスタム要素へのプロパティ設定・任意名イベントに対応しているが、イベント名の大文字小文字の扱いは本設計で実挙動未確認。挙動の不確実性を避けるため、`click` 以外のイベント(`change`・`input`・`close`・`closed` 等)は `useEffect` で `addEventListener` し、状態系プロパティ(`selected`・`checked`・`open`・`value`・`activeTabIndex`)は `useLayoutEffect` で要素へ代入する。`click` は React の `onClick`(型は `React.MouseEventHandler<HTMLElement>`)を使う。
- **`setPreference` に保存しない経路を足す。** 実物の `createThemeController().setPreference` は必ず `saveAppSettings` を呼ぶ(`apply-theme.ts`)。確定事項3「保存しない」を満たすため、第2引数 `options?: { persist?: boolean }`(既定 `true`)を追加し、`persist: false` のとき保存だけを省く。既存の呼び出し・テストは挙動不変。
- **`useTheme()` の購読**: 既存 `subscribe` は解決値が変わったときだけ通知する(auto→light でシステムがライトなら通知されない)。preference も返すため、フック側のモジュールで独自のリスナー集合を持ち、フック経由の setter 呼び出し後にも通知する(2.3)。controller 側の通知規則は変えない。
- **controller の共有**: `initTheme()` が既にモジュール内シングルトンを返す(`apply-theme.ts`)。`useTheme()` は内部で `initTheme()` を呼ぶ。main.tsx から props で受け渡さない。

### 1.4 実測(バンドルのプローブ)

repo 外の一時ディレクトリに、React 19.0.0 + Vite 6.1.0 + `@vitejs/plugin-react-swc` 3.8.0 + `@material/web` 2.5.0(推移的に `lit` 3.3.3)の最小構成を作り `vite build` した(本番相当、`"sideEffects": ["*.css"]` を宣言)。

| 構成 | 初回 JS(gzip) |
| --- | --- |
| React のみ(`<h1>` 1個) | 58.59 kB |
| + `MdFilledButton` をクラス参照で import し `<md-filled-button>` 1個 | 72.77 kB(差 +14.18 kB) |
| + `@material/web/all.js` を全量 import(事故の例) | 139.74 kB(差 +81.15 kB) |

- クラス参照による import で `customElement('md-filled-button')` の登録コードが出力に残ることを確認(出力 JS に `md-filled-button` が含まれる)。
- `@material/web` 2.5.0 の `package.json` に `sideEffects` 宣言は無い。
- 2.5.0 に `labs/` ディレクトリはあるが、`segmentedbutton` はトップレベルに無い(labs 配下のみ)。

## 2. 設計

### 2.1 依存の追加

- `package.json` の `dependencies` に `"@material/web": "2.5.0"`(キャレット無し)。`lit` は推移的依存のまま直接は追加しない。
- `vite.config.ts`・`biome.json`・`tsconfig*` は変更しない。

### 2.2 `src/ui/md/`(Material Web ラッパー)

```
src/ui/md/
  index.ts           バレル(下記の部品と Props 型だけを export。MdGallery は export しない)
  jsx.d.ts           カスタム要素の JSX 型宣言(React の JSX.IntrinsicElements を拡張)
  Button.tsx         Button
  IconButton.tsx     IconButton
  Chip.tsx           ChipSet, FilterChip, AssistChip
  Switch.tsx         Switch
  Dialog.tsx         Dialog
  Tabs.tsx           Tabs, PrimaryTab
  Select.tsx         Select, SelectOption
  Divider.tsx        Divider
  Ripple.tsx         Ripple
  FocusRing.tsx      FocusRing
  MdGallery.tsx      確認画面(2.6。default export を持つ)
  md-static.test.ts  静的検査(4章)
```

共通の作法:

1. 各ファイルは使う要素クラスを名前付きで import する(例 `import { MdFilledButton } from '@material/web/button/filled-button.js'`)。**`import '@material/web/...'` の bare import と `@material/web/all.js` は禁止。** クラス参照を確実に残すため、ファイル内で `const REGISTERED = [MdFilledButton, MdFilledTonalButton, ...] as const;` を定義し、`export const __registered = REGISTERED` のようにモジュール外から参照可能にする(名前は製造担当が決めてよい。バレルからは export しない)。
2. JSX に `<md-*>` を書けるのは `src/ui/md/` 配下のラッパーファイル(`*.tsx`、`MdGallery.tsx` を除く)だけ。
3. ラッパーは色・形状を再定義しない(C1 引き継ぎ)。`className`・`style` は透過してよい。
4. `children` は透過。アイコンは `children` で受ける(アイコンフォントは C2 では導入しない)。
5. `click` 以外のイベントと状態プロパティは ref 経由(1.3)。ref は `forwardRef` 不要(React 19 は `ref` を props で受ける)。各 Props に `ref?: React.Ref<要素クラス>` を持たせ、外部へ透過する(内部でも ref を使うため、両方へ渡す合成 ref にする)。
6. `onClick` の型は `React.MouseEventHandler<HTMLElement>`(DOM の `MouseEvent` ではない)。
7. 型の前提: `tsconfig.app.json` は `@tsconfig/strictest` を継承し `exactOptionalPropertyTypes: true`。`jsx.d.ts` は `declare module 'react' { namespace JSX { interface IntrinsicElements { ... } } }` で拡張し(React 19 の型ではグローバル `JSX` は使わない)、省略可能プロパティは `disabled?: boolean | undefined` のように `| undefined` を含めて宣言する。
8. 制御値の同期: 状態プロパティ(`selected`・`checked`・`value`・`activeTabIndex`・`open`)は依存配列なしの `useLayoutEffect`(毎レンダー)で要素へ代入し、要素側の自己反転が親の state と食い違ったまま残らないようにする。代入で要素がイベントを出す部品(`md-tabs` の `activeTabIndex` は内部で `change` を出しうる)は、リスナー側で「要素の値が props と同じなら通知しない」ガードを入れる。

シグネチャ(Props は最低限。追加は後続 Issue で):

```ts
// Button.tsx
export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';
export interface ButtonProps {
  ref?: React.Ref<HTMLElement>;
  variant: ButtonVariant;            // filled→md-filled-button, tonal→md-filled-tonal-button, outlined→md-outlined-button, text→md-text-button
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset'; // 既定 'button'
  onClick?: React.MouseEventHandler<HTMLElement>;
  className?: string;
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): React.JSX.Element;

// IconButton.tsx
export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined'; // md-icon-button / md-filled-icon-button / md-filled-tonal-icon-button / md-outlined-icon-button
export interface IconButtonProps {
  variant?: IconButtonVariant;       // 既定 'standard'
  label: string;                     // aria-label に設定(必須)
  toggle?: boolean; selected?: boolean;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  children: React.ReactNode;         // アイコン(SVG 等)
}

// Chip.tsx
export function ChipSet(props: { children: React.ReactNode; className?: string }): React.JSX.Element; // md-chip-set
export interface FilterChipProps { label: string; selected: boolean; disabled?: boolean; onSelectedChange?: (selected: boolean) => void; }
// md-filter-chip。'click' 後に要素の selected を読み onSelectedChange を呼ぶ(要素は click で selected を自ら反転するため、反転後の値を渡す。制御値は useLayoutEffect で再代入)
export interface AssistChipProps { label: string; disabled?: boolean; onClick?: React.MouseEventHandler<HTMLElement>; icon?: React.ReactNode; }
// md-assist-chip。label は要素の label プロパティ(2.5.0 で deprecated)ではなく子のテキストとして渡す。icon は <span slot="icon"> に入れる(chips/internal/chip.js: ラベル部は label が空のときだけ既定 slot を描画、アイコンは slot="icon")。FilterChip の label も同様に子テキストで渡す

// Switch.tsx
export interface SwitchProps { selected: boolean; disabled?: boolean; label?: string; onSelectedChange?: (selected: boolean) => void; } // md-switch。'change' で要素の selected を通知。label は aria-label

// Dialog.tsx
export interface DialogProps {
  open: boolean;
  headline?: React.ReactNode;        // slot="headline"
  actions?: React.ReactNode;         // slot="actions"
  children?: React.ReactNode;        // slot="content" の <div> に入れる
  onClose?: (returnValue: string) => void; // 'close' イベント(閉じアニメーション前。dialog/internal/dialog.js の close())で要素の returnValue を渡す。'closed' はアニメーション完了待ちのため使わない(C-01: 非表示ペインで finished が解決しない)
}

// Tabs.tsx
export interface TabsProps { activeIndex: number; onActiveIndexChange?: (index: number) => void; children: React.ReactNode; } // md-tabs。'change' で activeTabIndex を通知
export function PrimaryTab(props: { children: React.ReactNode }): React.JSX.Element; // md-primary-tab

// Select.tsx
export interface SelectProps { label: string; value: string; disabled?: boolean; onValueChange?: (value: string) => void; children: React.ReactNode; } // md-outlined-select。'change' で value を通知
export function SelectOption(props: { value: string; children: React.ReactNode }): React.JSX.Element; // md-select-option(表示文言は slot="headline" の <div>)

// Divider.tsx
export function Divider(props: { inset?: boolean }): React.JSX.Element; // md-divider

// Ripple.tsx / FocusRing.tsx(自作部品用。親要素に position: relative が要る)
export function Ripple(props: { disabled?: boolean }): React.JSX.Element;   // md-ripple
export function FocusRing(props: { inward?: boolean }): React.JSX.Element;  // md-focus-ring
```

- 要素の正確なプロパティ名・イベント名・スロット名は、製造担当が `node_modules/@material/web/<部品>/*.d.ts` と `custom-elements.json` で照合する(本設計では 2.5.0 の型定義を部品ごとには照合していない。実挙動未確認)。食い違いは型定義を正とし、最終報告に書く。
- `jsx.d.ts` の型は Lit 要素の公開プロパティのうち、ラッパーで使うものだけを宣言してよい。

### 2.3 テーマ: `useTheme()` と仮切替

`src/ui/theme/apply-theme.ts`(変更):

```ts
export interface SetPreferenceOptions { persist?: boolean } // 既定 true
// ThemeController.setPreference(pref: ThemePreference, options?: SetPreferenceOptions): void
// persist === false のときは saveAppSettings を呼ばない。それ以外の挙動(解決・適用・通知)は不変。
```

`src/ui/theme/use-theme.ts`(新規):

```ts
export interface ThemeState { preference: ThemePreference; resolved: ResolvedTheme; }
export function useTheme(): ThemeState & { setPreference: (pref: ThemePreference, options?: SetPreferenceOptions) => void };
```

- 内部で `initTheme()` を呼び controller を得る。モジュール内リスナー集合を持ち、`subscribe` は controller の `subscribe` とモジュール内集合の両方に登録する。setter は controller の `setPreference` を呼んだ後、モジュール内集合へ通知する。
- `getSnapshot` は `preference` と `resolved` の組が変わらない限り同一オブジェクトを返す(キャッシュ。`useSyncExternalStore` の無限再描画防止)。
- 純関数部分(スナップショットのキャッシュ)を `createThemeStore(controller)` として切り出し、`useTheme` はそれを使う形にしてテスト可能にする。`index.ts` に `useTheme`・`ThemeState`・`SetPreferenceOptions` を追加 export する。

`src/ui/app-mode.ts`(C3 のファイルに追加):

```ts
export function readThemeOverride(search: string): ThemePreference | null;
// new URLSearchParams(search).get('theme') が THEME_PREFERENCES のいずれかならその値、それ以外(無し・不正値)は null
export function isMdGalleryMode(search: string): boolean;
// get('gallery') === 'md' のときだけ true
```

`src/main.tsx`(変更): `initTheme()` の戻り値を受け、`readThemeOverride(window.location.search)` が null でなければ `setPreference(値, { persist: false })` を呼ぶ。render より前に行う。

### 2.4 静的トークンの追加(`src/ui/theme/static-tokens.css`)

- **形状トークンは追加しない。** 押下時・内側角には既存の `--md-sys-shape-corner-small`(8px)・`--md-sys-shape-corner-extra-small`(4px)・`--md-sys-shape-corner-full` を使う(既存10変数で足りる。Compose `ShapeKeyTokens` にもこれ以外のスカラー半径は無い)。部分角は「角ごとに既存トークンを割り当てる」ことで表現し、新しい変数を作らない。
- **emphasized タイポは `label-large` の emphasized 版 5 変数だけ追加する。** 名前と値:

| 変数 | 値 |
| --- | --- |
| `--md-sys-typescale-emphasized-label-large-font` | `var(--md-ref-typeface-plain)` |
| `--md-sys-typescale-emphasized-label-large-size` | `14px` |
| `--md-sys-typescale-emphasized-label-large-line-height` | `20px` |
| `--md-sys-typescale-emphasized-label-large-weight` | `700`【製造時に出典照合】 |
| `--md-sys-typescale-emphasized-label-large-tracking` | `0.1px` |

  font・size・line-height・tracking は既存 `label-large`(`static-tokens.css` 144〜148行)と同値。weight は androidx.compose.material3.tokens の `TypeScaleTokens`(LabelLargeEmphasized)で照合し、照合元をコメントに書く。**照合できない場合は 5 変数とも追加せず、選択中ラベルは既存 `label-large` を使い、最終報告に挙げる**(その場合 4-13 は「追加なし」で合格)。
- **C1 テストとの関係(ユーザー確定、2026-11-01: 提案を採用)**: C1 の `src/ui/theme/tokens.test.ts`(`C1-K04`)は `static-tokens.css` の typescale 変数数を `75` で完全一致検査している。上記5変数を追加すると `80` になり、このテストの期待値更新が要る。次の提案を採用した。
  - 採用: `tokens.test.ts` の期待値を `75`→`80` に更新し(コメント「15 役割 × 5 + emphasized label-large 5」)、4-20 の許可範囲に含める。
  - 不採用の対案: emphasized 版を `static-tokens.css` ではなく `src/ui/expressive/shape-morph.css` 側に置き、C1 のテストに触れない(ヒアリング確定事項2「static-tokens.css に追加」から外れる)。
  - 不採用の対案2: emphasized タイポを C2 では追加しない(選択中ラベルは `label-large`)。
- 既存トークンの値・名前は変更しない。

### 2.5 `src/ui/expressive/`(自作)

```
src/ui/expressive/
  index.ts                 バレル(ShapeMorph 系と SegmentedButtonGroup)
  shape-morph.css          図形モーフの土台
  shape-morph.ts           クラス名定数と型
  SegmentedButtonGroup.tsx 単一選択の segmented(connected button group)
  segmented-logic.ts       キー操作・選択の純関数
  segmented-logic.test.ts
```

図形モーフの土台:

- クラス `.expressive-shape-morph` を付けた要素は `border-radius: var(--expressive-morph-rest)`、`[aria-checked="true"]`・`[aria-pressed="true"]`・`[aria-selected="true"]` で `var(--expressive-morph-selected)`、`:active`(押下)で `var(--expressive-morph-pressed)` に変わる。**`:active` の規則は選択状態の規則より後ろに書く**(詳細度が同じため、後勝ちで選択中の押下でも pressed になるようにする)。
- 3変数の既定値はいずれも `--md-sys-shape-*` を参照する(rest=`corner-full`、pressed=`corner-small`、selected=`corner-full`)。
- `transition: border-radius var(--md-sys-motion-spring-spatial-fast-duration) var(--md-sys-motion-spring-spatial-fast-easing)`。px・ms・cubic-bezier を直書きしない。
- `@media (prefers-reduced-motion: reduce)` で `transition: none`。
- CSS は `shape-morph.ts` から `import './shape-morph.css'` で読み込む(CSS の import は 06号6項の例外として可)。

`SegmentedButtonGroup`:

```ts
export interface SegmentedOption<T extends string> { value: T; label: string; disabled?: boolean; }
export interface SegmentedButtonGroupProps<T extends string> {
  label: string;                 // radiogroup の aria-label
  options: readonly SegmentedOption<T>[]; // 2〜5 件を想定
  value: T;
  onValueChange: (value: T) => void;
}
export function SegmentedButtonGroup<T extends string>(p: SegmentedButtonGroupProps<T>): React.JSX.Element;
```

- DOM: `<div role="radiogroup">` 内に各選択肢を `<button type="button" role="radio" aria-checked>` で並べる。各ボタンに `.expressive-shape-morph` と `Ripple`・`FocusRing`(md バレル経由)を入れる。
- ローヴィングタブインデックス: 選択中のみ `tabIndex=0`、他は `-1`。←→(および ↑↓)で前後の有効な選択肢へ移動して選択(端で巡回)、Home/End で先頭/末尾。この計算は `segmented-logic.ts` の `nextIndex(options, current, key): number` 純関数にする。
- 色: 選択中 `--md-sys-color-secondary-container` / `--md-sys-color-on-secondary-container`、非選択 `--md-sys-color-outline` の枠と `--md-sys-color-on-surface`。選択中ラベルは 2.4 の emphasized タイポ(追加しなかった場合は `label-large`)。
- 寸法の書き方: `src/ui/md`・`src/ui/expressive` の CSS・TSX では px を書かない。枠線は `thin`(`border: thin solid ...`)または `0.0625rem`、余白・高さは `rem` で書く(4-12 の検査に合わせる)。
- 外側の角は rest の形(`corner-full`)、内側の角は `--md-sys-shape-corner-extra-small`(`border-*-radius` の個別指定で割り当てる)。

### 2.6 確認画面 `?gallery=md`

- `src/ui/App.tsx`(変更): C3 の分岐と並べて `isMdGalleryMode(window.location.search)` のとき `lazy(() => import('./md/MdGallery'))` を `<Suspense fallback={null}>` で表示する。両方のパラメーターが無いときの表示は従来どおり。
- `MdGallery.tsx` はバレルから export しない。内容: 2.2 の全ラッパーを各1回以上(Button は4種、IconButton は4種、Dialog は開くボタン付き)と `SegmentedButtonGroup`(3選択肢)を並べ、`useTheme()` の `resolved` と `preference` を表示する。ライト/ダークの切替は `?theme=` で行う(画面内トグルは作らない)。
- MdGallery 自身が `<md-*>` を直書きすることは禁止(ラッパー経由)。

### 2.7 バンドル予算

- **初回 JS(`dist/index.html` が `<script type="module">` と `<link rel="modulepreload">` で参照する JS の gzip 合計)≤ 102,000 B。** 根拠: 1.4 の React のみ 58.59 kB に、ボタン1個の増分 14.18 kB の約3倍(42.5 kB)を足した値を丸めたもの(G-09)。`all.js` 全量 import(+81 kB)は確実に超える。
- C2 の本番画面(パラメーター無し)は md 部品を静的 import しないため、実測は概ね C3 マージ後の main と同程度の見込み。
- `MdGallery` のチャンクは枠外(値は検収で記録だけする)。
- 超えた場合は「収まらない」と即断せず、初回チャンクへの md 部品・`all.js`・ギャラリーの混入を先に調べて報告する(G-09)。

## 3. 変更しないもの

- `src/ui/theme/tokens.css`(生成物)、既存トークンの値、`vite.config.ts`、`biome.json`、`tsconfig*`、`src/core/`、`wasm/`
- `ThemeController` の通知規則(解決値が変わったときだけ)と `setPreference` の既定(保存する)
- C3 の `isTileGalleryMode` の挙動と `?gallery=tiles` の表示

## 4. 受け入れ条件

検収はコミットされたコードのまま行う。ブラウザ確認は `npm run build && npm run preview`(devサーバー規約は 01号に従う)で、Browser pane が非表示のときは `read_page`・`javascript_tool` で確認する(C-01)。

1. **前提**: `git merge-base --is-ancestor <C3 のマージコミット> HEAD` が真。
2. **品質ゲート**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test`・`npm run check:theme` がすべて成功。
3. **版固定**: `node -e "console.log(require('./package.json').dependencies['@material/web'])"` が `2.5.0` を出力(`^`・`~` 無し)。`npm ls @material/web` が `@material/web@2.5.0`。`lit` が `package.json` の `dependencies`・`devDependencies` に無い。
4. **生タグの局所化**: `grep -rn "<md-" src --include='*.tsx' --include='*.ts' --exclude='*.test.ts'` のヒットがすべて `src/ui/md/` 配下かつ `MdGallery.tsx` 以外(`jsx.d.ts` の型宣言キーはタグでなく文字列なので対象外)。
5. **bare import 禁止**: 以下はすべて `--exclude='*.test.ts'` を付けて実行する(4-6 の静的検査テスト自身が検査文字列を含むため)。`grep -rnE "^import\s+['\"]" src --exclude='*.test.ts'` のヒットが `.css` の import だけ。`grep -rn "@material/web/all" src --exclude='*.test.ts'` がヒット0。`grep -rn "@lit/react" src package.json --exclude='*.test.ts'` がヒット0。`grep -rn "labs/" src --exclude='*.test.ts'` がヒット0。
6. **静的検査テスト**: `src/ui/md/md-static.test.ts` が存在し、上記 4・5 と同等(`src/` 走査で `<md-` の出現箇所、`@material/web` の bare import・`all.js`・`labs/` の不在)を検査している。テスト名は既存の命名規則(接頭辞 `C2`)に従う。故意に `src/ui/App.tsx` へ `<md-divider>` を一時的に追加すると失敗することを確認し、元に戻す(戻した後 `git status` が無差分)。
7. **バレル**: `src/ui/md/index.ts` が 2.2 の部品(Button, IconButton, ChipSet, FilterChip, AssistChip, Switch, Dialog, Tabs, PrimaryTab, Select, SelectOption, Divider, Ripple, FocusRing)と Props 型を export し、`MdGallery` を export しない(`grep -n MdGallery src/ui/md/index.ts` がヒット0)。`src/ui/expressive/index.ts` が `SegmentedButtonGroup` を export する。
8. **app-mode**: `app-mode.test.ts` に C2 のケースがあり通る。`readThemeOverride`: `''`→`null`、`'?theme=dark'`→`'dark'`、`'?theme=light'`→`'light'`、`'?theme=auto'`→`'auto'`、`'?theme=DARK'`・`'?theme=foo'`→`null`、`'?gallery=md&theme=dark'`→`'dark'`。`isMdGalleryMode`: `''`・`'?gallery=tiles'`・`'?gallery=foo'`→`false`、`'?gallery=md'`・`'?theme=dark&gallery=md'`→`true`。C3 の既存ケースも通る。
9. **保存しない経路**: `apply-theme.test.ts` に、モック storage で `setPreference('dark', { persist: false })` 後に storage の書き込みが0回かつ `getResolved()==='dark'`・`dataset.theme==='dark'`、`setPreference('dark')` では従来どおり1回書き込むケースがあり通る。
10. **useTheme のストア**: `createThemeStore` のテストがあり通る。(a) 同じ状態で `getSnapshot()` を2回呼ぶと同一参照、(b) 解決値が変わらない preference 変更(システムライトで auto→light)でもストア経由の setter ならリスナーが呼ばれ snapshot の `preference` が更新される、(c) controller 側の解決値変化(メディア変化)でもリスナーが呼ばれる。
11. **SegmentedButtonGroup のキー操作**: `segmented-logic.test.ts` が通り、→で次、←で前、末尾で→は先頭へ巡回、disabled を飛ばす、Home/End、無関係なキーは現在値のまま、を検査している。
12. **トークン規約**: `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/ui/md src/ui/expressive --include='*.ts' --include='*.tsx' --include='*.css' --exclude='*.test.ts'` がヒット0。`grep -rnE "[0-9]+ms|cubic-bezier|[0-9]px" src/ui/expressive src/ui/md --include='*.css' --include='*.tsx'` がヒット0(px は書かない。2.5 の寸法の書き方)。`grep -n "prefers-color-scheme" src/ui/expressive/*.css` がヒット0。
13. **静的トークンの出典**: 2.4 の5変数を追加した場合、その近くに照合元のコメントがあり、名前と font・size・line-height・tracking が 2.4 の表どおり。照合できず追加しなかった場合は最終報告にその旨がある。どちらの場合も既存変数の値が変わっていない(`git diff main -- src/ui/theme/static-tokens.css` が追加行のみ)。`--md-sys-shape-` の変数が増えていない。
14. **バンドル予算**: `npm run build` 後、`dist/index.html` の `<script type="module" src>` と `<link rel="modulepreload" href>` が指す JS をそれぞれ `gzip -9 -c <file> | wc -c` で測り、合計 ≤ 102,000。初回チャンクに `md-filled-button` の文字列が含まれない(`grep -c md-filled-button <初回JS>` が0)。`MdGallery` を含むチャンク(`md-filled-button` を含むチャンク)が別ファイルで存在し、その gzip サイズを記録する(合否対象外)。
15. **既定表示の不変**: `npm run preview` でパラメーター無しの URL を開くと、従来どおりの表示(見出し「三麻点数計算機」)で、`customElements.get('md-filled-button')` が `undefined`。
16. **仮切替**: (a) `?theme=dark` で `document.documentElement.dataset.theme==='dark'`、`localStorage.getItem('mj3calc.settings')` が開く前と同じ(開く前に `localStorage.clear()` しておけば `null`)。(b) `?theme=light` で `'light'`。(c) 不正値 `?theme=foo` では保存済み/既定どおりの解決値で、エラーがコンソールに出ない。
17. **ギャラリー**: `?gallery=md` で、(a) `md-filled-button`・`md-filled-tonal-button`・`md-outlined-button`・`md-text-button`・`md-icon-button`・`md-filled-icon-button`・`md-filled-tonal-icon-button`・`md-outlined-icon-button`・`md-chip-set`・`md-filter-chip`・`md-assist-chip`・`md-switch`・`md-dialog`・`md-tabs`・`md-primary-tab`・`md-outlined-select`・`md-select-option`・`md-divider`・`md-ripple`・`md-focus-ring` のすべてで `customElements.get(...)` が定義済みで、DOM に1個以上存在する。(b) `[role="radiogroup"]` が存在し、その中の `[role="radio"]` が3個、`aria-checked="true"` がちょうど1個。2個目をクリックすると2個目だけが `aria-checked="true"`。(c) 選択中ボタン(自作の `<button role="radio">` なので light DOM のまま測れる)の `getComputedStyle(...).backgroundColor` が `rgb(214, 232, 206)`(ライトの `--md-sys-color-secondary-container` `#d6e8ce`。`src/ui/theme/tokens.css` 12行)。(d) 選択中ボタンの `transition-property` に `border-radius` を含む。(e) Dialog を開くボタンのクリックで `md-dialog` の `open` が `true` になる。ダイアログの閉じる操作で `onClose` が呼ばれたことがギャラリー上の表示(最後の returnValue の表示等)で確認できる(Browser pane 非表示でも `close` イベントはアニメーション前に出るため確認可能)。(f) 画面上に `useTheme()` の preference と resolved が表示される。(g) コンソールにエラーが無い。
18. **ギャラリー+ダーク**: `?gallery=md&theme=dark` で `dataset.theme==='dark'`、`getComputedStyle(document.querySelector('md-filled-button').shadowRoot.querySelector('.background')).backgroundColor` が `rgb(161, 211, 153)`(ダークの `--md-sys-color-primary` `#a1d399`。`tokens.css` 58行)。ホスト要素自体には背景が無い(`button/internal/shared-styles` で背景は Shadow DOM 内の `.background`)ため、ホストを測らない。
19. **逆発注(合否保留可)**: 図形モーフのアニメーションの見え方・ライト/ダークの主観評価は C-02 に従い、検収担当が実測不能項目として申告する。
20. **差分範囲**: `git diff --stat main...HEAD` の変更が、`package.json`・`package-lock.json`・`src/main.tsx`・`src/ui/App.tsx`・`src/ui/app-mode.ts`・`src/ui/app-mode.test.ts`・`src/ui/theme/`(`apply-theme.ts`・`apply-theme.test.ts`・`use-theme.ts`・そのテスト・`index.ts`・`static-tokens.css`)・`src/ui/md/`・`src/ui/expressive/`・`docs/design/issue-40-md-wrappers.md`(設計書の資産化、01号)の範囲に収まる。2.4 の確定事項により `src/ui/theme/tokens.test.ts`(`C1-K04` の typescale 期待値の更新のみ)も可。ホームディレクトリ名・絶対パスが差分に無い(`git diff main...HEAD | grep -nE "/Users/|/home/"` がヒット0)。

## 5. 後続 Issue への引き継ぎ

- **D 系・E 系**: 部品は `src/ui/md`・`src/ui/expressive` のバレルからのみ使う。足りない部品(list・menu・textfield・fab・progress 等)は使う Issue でラッパーを追加し、`md-static.test.ts` の対象一覧と 4-17 相当の確認を足す。イベント・状態プロパティは ref 経由の作法(2.2)に揃える。
- **D5**: 自風・場風・ツモロンは `SegmentedButtonGroup` を想定。複数選択・アイコン付きが要れば D5 で拡張する。
- **D6**: 列挙は `Select`、真偽は `Switch`。テーマ切替 UI は `useTheme().setPreference(pref)`(既定で保存)。`?theme=` は保存しない仮切替として残すかを D6 で判断する。
- **D1**: 画面の骨格ができたら `?gallery=md` 分岐の扱い(撤去・開発時限定)を `?gallery=tiles` と合わせて見直す。撤去時は `MdGallery.tsx` と `isMdGalleryMode` も整理してよい。
- **loading indicator・split button・FAB menu** などの Expressive 部品は、使い道が決まった Issue で `src/ui/expressive/` に自作する。
- **アイコン**: C2 はアイコンフォントを導入しない。アイコンの供給方式(SVG 同梱・Material Symbols のサブセット等)は最初に要る Issue で決める。
- **バンドル予算**: md 部品を本番画面で使い始める D 系で初回 JS が増える。予算 102,000 B を見直す場合は G-09 に従い実測から決め直す。
- `@material/web` の版上げは別 Issue(06号5項)。

## 6. 実挙動未確認の箇所

- 各 Material Web 要素(2.5.0)のプロパティ名・イベント名・スロット名の部品ごとの照合(2.2。製造時に型定義で照合)。
- React 19 のカスタム要素イベント(`on<名前>`)の大文字小文字の扱い(本設計は ref 経由で回避)。
- 2.4 の emphasized label-large の weight(出典未照合。製造時に照合必須)。
- `md-filter-chip`・`md-switch` の自己反転と毎レンダー再代入、`md-tabs` の代入時 `change` のガード(2.2-8)の実挙動。
- 初回 JS の実測値(本プロジェクトでのビルドは未実施。1.4 は repo 外の最小構成での値)。
- `md-outlined-select` が `md-menu` を内部で取り込むことによるギャラリーチャンクの大きさ(枠外のため合否に影響しない)。
- C3 マージ後の `app-mode.ts`・`App.tsx` の実物(0章)。
