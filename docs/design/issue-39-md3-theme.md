# Issue #39 C1. MD3 テーマ基盤 設計書

- Epic: C(デザイン基盤)
- 予定ブランチ: `feature/issue-39-md3-theme`
- 範囲: 色・形状・モーション・タイポグラフィのトークン(CSS 変数)の生成と配布、テーマ設定(`'auto' | 'light' | 'dark'`)の型・既定値・保存と読み込み・OS 追従・画面全体への適用。**切替 UI は作らない。**

## 1. 参照資料と設計判断の根拠

### 1.1 ヒアリング済みの確定事項(統括担当から受領。再検討しない)

| # | 確定事項 | 本設計での反映先 |
| --- | --- | --- |
| 1 | シード色は雀卓の緑系1色。v1 で利用者による変更なし | 2.2(ユーザー確定で `#1B5E20`。根拠は 1.3) |
| 2 | スキームは SchemeTonalSpot | 2.2 |
| 3 | テーマは `'auto' \| 'light' \| 'dark'`、既定 auto、auto は prefers-color-scheme を購読して追従。C1 は型・既定値・保存と読み込み・OS 追従・`<html>` への適用まで。API は C2 の仮切替から呼べる形 | 2.4〜2.6 |
| 4 | ルール(B2)とは別の localStorage キーに「アプリ設定」として版番号付きで保存。壊れた値・不明な版は auto | 2.4 |
| 5 | コントラストは標準(0)のみ | 2.2 |
| 6 | ビルド時に Node スクリプトで CSS を生成し生成物をコミット。検査コマンドで再生成し差分なしを確認。`@material/material-color-utilities` はキャレットなし固定(0.4.0)、devDependencies | 2.2・2.3 |
| 7 | MD3 標準の形状・モーションを全量 CSS 変数化。Expressive 固有は spring 系モーションと拡張形状スケールのみ。図形モーフは C2 以降 | 2.7 |
| 8 | システムフォント+MD3 タイプスケールを CSS 変数化。点数表示の tabular-nums を規約化 | 2.8 |
| 9 | 配置は `src/ui/theme/`。06-ui-md3-protocol.md への追記は製造の範囲 | 2.1・2.10 |

### 1.2 参照したもの

- `../ref-repo/mahjong-calc/src/lib/config.ts`(`theme: 'auto' | 'light' | 'dark'`、別項目に `tileColor`)
- `../ref-repo/mahjong-calc/src/hooks/dom.ts`(`usePrefersColorScheme`: `matchMedia('(prefers-color-scheme: dark)')` の `change` を購読)
- `../ref-repo/mahjong-calc/src/components/App.tsx`(`theme === 'dark' || (theme === 'auto' && systemColor === 'dark')` で解決)
- `src/core/rule-storage.ts`(B2。保存キー `mj3calc.rule`・`{ version, rule }`・`RuleStorage = Pick<Storage,'getItem'|'setItem'>` の型。本設計はこの流儀に揃える)
- `docs/rules/06-ui-md3-protocol.md`、`package.json`、`vite.config.ts`、`.github/workflows/ci.yml`、`index.html`、`src/main.tsx`

### 1.3 実測(作業用一時ディレクトリで `@material/material-color-utilities@0.4.0` を導入して確認。リポジトリには入れていない)

1. **0.4.0 は素の Node では import できない。** パッケージ内部の ESM が拡張子なしの相対 import(例 `dynamiccolor/dynamic_color`)を含み、`node script.mjs` は `ERR_MODULE_NOT_FOUND` で落ちる。
   - `vite-node`(既存 devDependency `vitest` 経由で `node_modules/.bin/vite-node` に存在)は既定でパッケージを外部化するため同じく落ちる。
   - **`vite-node --options.deps.inline=@material/material-color-utilities <script>.ts` なら動作した。** esbuild でバンドルしても動作した。
   - → 生成スクリプトは `vite-node` + `deps.inline` で実行する(新規の実行系依存を足さない)。
2. `SchemeTonalSpot` のシグネチャは `(sourceColorHct, isDark, contrastLevel, specVersion?: '2021' | '2025', platform?)`。`DynamicScheme.DEFAULT_SPEC_VERSION = "2021"`。
3. **0.4.0 の `MaterialDynamicColors` に `allDynamicColors()` は無い**(統括担当が `material_dynamic_colors.js` で確認、該当0件。当初版の記述は誤り)。代わりにある `allColors` は名前が snake_case で、`scrim`・`shadow`・`surfaceTint`・`surfaceVariant` を含まず、2025 専用の `primaryDim`・`secondaryDim`・`tertiaryDim`・`errorDim` を含む。→ 出力する役割は 2.2 の固定リストで指定する。
4. **Biome 1.9.4 は CSS も整形し、セレクタ内の引用符を二重引用符に直す**(統括担当が実測)。→ 生成物・手書き CSS とも二重引用符で、Biome の整形結果と一致する書式にする。
5. シード候補の比較(TonalSpot、contrast 0、spec 2021)

| シード | HCT(H/C/T) | light primary / primaryContainer | dark primary / primaryContainer | onPrimary:primary(light/dark) | onSurface:surface(light/dark) |
| --- | --- | --- | --- | --- | --- |
| `#2E7D5B` | 164.6 / 38.6 / 47.0 | `#226a4c` / `#aaf2cb` | `#8ed5b0` / `#005236` | 6.49 / 7.73 | 16.31 / 14.32 |
| `#1B5E20` | 145.5 / 47.1 / 34.7 | `#3c6939` / `#bcf0b4` | `#a1d399` / `#245023` | 6.42 / 7.65 | 16.29 / 14.43 |
| `#00695C` | — | `#006b5e` / `#9ff2e1` | `#83d5c5` / `#005046` | 6.43 / 7.73 | 16.29 / 14.35 |

   - TonalSpot は彩度を正規化するため、シードで実質効くのは色相だけ。コントラストはどの候補もほぼ同じで、本文(onSurface)は WCAG AAA、onPrimary も AA(4.5)を十分超える。
   - **確定: `#1B5E20`(ユーザー判断。理由: ラシャ地の色に近い)。** 当初の設計案 `#2E7D5B` から変更。コントラストは候補間でほぼ差がなく、選定は色相(145.5°)の見た目で決めた。
   - 確定値で再生成(0.4.0・TonalSpot・contrast 0・spec `'2021'` 明示)して照合済み: light primary `#3c6939`・onPrimary `#ffffff`・primaryContainer `#bcf0b4`・surface/background `#f7fbf1`・outline `#72796f`、dark primary `#a1d399`・onPrimary `#0b390f`・primaryContainer `#245023`・surface/background `#10140f`・outline `#8c9388`。
   - 色相約145°は索子・發の緑と近い。C1 では対策しない(4 章の引き継ぎ参照)。

## 2. 設計

### 2.1 ファイル構成

```text
scripts/
  gen-theme-tokens.ts        生成スクリプト(Node 実行。vite-node 経由)
src/ui/theme/
  tokens.css                 生成物(コミットする。手で編集しない。先頭に生成元と「編集禁止」の注記)
  static-tokens.css          手書き: 形状・モーション・タイポグラフィ・規約クラス(2.7・2.8)
  theme-config.ts            型・既定値・(逆)直列化・読み込み・保存(純関数中心)
  theme-config.test.ts
  apply-theme.ts             解決(auto→light/dark)・<html> への適用・OS 追従の購読
  apply-theme.test.ts
  tokens.test.ts             生成物の静的検査(2.9 の受け入れ条件を支える)
  index.ts                   バレル(公開 API)
```

`scripts/` は Biome の対象に含める(除外設定を足さない)。`tsconfig.node.json` の `files` に `scripts/gen-theme-tokens.ts` を追加して型検査対象にする(`types` に `node` が要る場合は追加。既存 `@types/node` を利用)。

### 2.2 色トークンの生成(`scripts/gen-theme-tokens.ts`)

- 定数: `SEED = '#1B5E20'`、スキーム `SchemeTonalSpot`、`contrastLevel = 0`、`specVersion` は `'2021'`(確定。ライブラリ既定と同じだが、版上げで既定が変わっても結果が変わらないよう引数で明示する)。
- light(`isDark=false`)・dark(`isDark=true`)の2スキームを作り、次の**固定リスト(49 役割)を、この順で**出力する。値は `MaterialDynamicColors.<名前>.getArgb(scheme)` を `hexFromArgb` で小文字 6 桁 HEX にしたもの。CSS 変数名は camelCase→kebab-case(`surfaceContainerHigh` → `--md-sys-color-surface-container-high`)。`*PaletteKeyColor` と 2025 専用の `*Dim`(`primaryDim` 等)は出力しない。

```text
primary onPrimary primaryContainer onPrimaryContainer inversePrimary
secondary onSecondary secondaryContainer onSecondaryContainer
tertiary onTertiary tertiaryContainer onTertiaryContainer
error onError errorContainer onErrorContainer
primaryFixed primaryFixedDim onPrimaryFixed onPrimaryFixedVariant
secondaryFixed secondaryFixedDim onSecondaryFixed onSecondaryFixedVariant
tertiaryFixed tertiaryFixedDim onTertiaryFixed onTertiaryFixedVariant
background onBackground
surface surfaceDim surfaceBright surfaceContainerLowest surfaceContainerLow surfaceContainer surfaceContainerHigh surfaceContainerHighest
onSurface surfaceVariant onSurfaceVariant inverseSurface inverseOnSurface
outline outlineVariant shadow scrim surfaceTint
```

- 出力形(セレクタはこの2つに固定。引用符は二重引用符。1 宣言 1 行、インデント 2 空白、ブロック間に空行 1 行。Biome で整形しても変化しない書式):

```css
/* 生成物。編集禁止。scripts/gen-theme-tokens.ts で再生成する(npm run gen:theme) */
/* seed #1B5E20 / SchemeTonalSpot / contrast 0 / spec 2021 / @material/material-color-utilities 0.4.0 */
:root {
  color-scheme: light;
  --md-sys-color-primary: #3c6939;
  ...
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --md-sys-color-primary: #a1d399;
  ...
}
```

  - light を `:root` の既定、dark を `data-theme="dark"` で上書きする。`prefers-color-scheme` のメディアクエリは CSS に書かない(auto の解決は JS 側 1 か所に集約。2.5)。
- 書き出し先は `src/ui/theme/tokens.css`。製造担当は生成後に `npx biome format src/ui/theme/tokens.css` で差分が出ないことを確認し、出る場合は生成側の書式を直す(生成物を Biome で書き換えて済ませない。`check:theme` が落ちるため)。
- `--check` 引数付きで実行したら書き込まず、現ファイルと生成内容を比較し、差異があれば差分の先頭行を表示して終了コード 1。

### 2.3 依存とスクリプト

- `package.json` devDependencies に `"@material/material-color-utilities": "0.4.0"`(キャレットなし)。
- scripts に追加:
  - `"gen:theme": "vite-node --options.deps.inline=@material/material-color-utilities scripts/gen-theme-tokens.ts"`
  - `"check:theme": "npm run gen:theme -- --check"`(引数の受け渡しが vite-node で通らない場合は、環境変数 `THEME_CHECK=1` 方式に切り替えてよい。どちらにしたかを製造報告に書く)
- `package.json` に `"sideEffects": ["*.css"]` を追加する(06号 必須の制約6 の前提を C1 で満たす。CSS の import が本番ビルドで除去されないため)。
- CI(`.github/workflows/ci.yml`)の検証ジョブに `npm run check:theme` のステップを追加(lint 等と同列、WASM ビルドの成否に依存させない位置)。
- 01 号のコミット前検査に `check:theme` を足すかは本 Issue では変更しない(CI で担保)。

### 2.4 テーマ設定の型と保存(`theme-config.ts`)

```ts
export type ThemePreference = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export const THEME_PREFERENCES: readonly ThemePreference[] = ['auto', 'light', 'dark'];

/** アプリ設定(ルールとは別)。v1 は theme のみ。将来の項目追加を想定した器 */
export interface AppSettings { theme: ThemePreference }
export const DEFAULT_APP_SETTINGS: Readonly<AppSettings> = { theme: 'auto' };

export const APP_SETTINGS_STORAGE_KEY = 'mj3calc.settings';
export const APP_SETTINGS_STORAGE_VERSION = 1;
export type AppSettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const isThemePreference: (v: unknown) => v is ThemePreference;
export const serializeAppSettings: (s: AppSettings) => string; // {"version":1,"settings":{"theme":"..."}}
export const restoreAppSettings: (raw: string | null) => AppSettings;
export const loadAppSettings: (storage?: AppSettingsStorage | null) => AppSettings;
export const saveAppSettings: (s: AppSettings, storage?: AppSettingsStorage | null) => boolean;
```

- `restoreAppSettings` の規則(すべて例外を投げない):
  - `null` → 既定(auto)
  - JSON として壊れている/オブジェクトでない/`version` が `APP_SETTINGS_STORAGE_VERSION` と不一致(数値でない場合を含む) → 既定(auto)
  - 版一致で `settings.theme` が `isThemePreference` を満たさない → `theme` だけ auto(他項目がない v1 では結果は既定と同じ)
  - 余分なキーは無視
- `loadAppSettings` / `saveAppSettings` の `storage` 省略時は `globalThis.localStorage`。取得自体が例外(プライベートモード等)なら load は既定を返し、save は `false` を返す。成功時 save は `true`。
- 戻り値は常に新しいオブジェクト(`DEFAULT_APP_SETTINGS` を共有参照で返さない)。
- B2 のような reset 理由の詳細は返さない(UI がないため。必要になれば D6 で拡張)。

### 2.5 解決と適用・OS 追従(`apply-theme.ts`)

```ts
export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';
export const resolveTheme: (pref: ThemePreference, systemDark: boolean) => ResolvedTheme;
/** <html> に data-theme 属性を設定する */
export const applyResolvedTheme: (theme: ResolvedTheme, root?: ThemeRoot) => void;

export interface ThemeController {
  getPreference(): ThemePreference;
  getResolved(): ResolvedTheme;
  /** 設定を変更し、保存し、即時に適用する(C2 の仮切替・D6 の切替 UI から呼ぶ) */
  setPreference(pref: ThemePreference): void;
  /** 解決後のテーマが変わるたびに呼ばれる。解除関数を返す */
  subscribe(listener: (resolved: ResolvedTheme) => void): () => void;
  /** matchMedia 購読の解除(テスト用) */
  dispose(): void;
}
/** テストで偽物を渡せるよう、使う機能だけの構造型にする */
export type ThemeMediaQuery = Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;
export type ThemeRoot = Pick<HTMLElement, 'dataset'>;
export interface ThemeControllerDeps {
  storage?: AppSettingsStorage | null;
  /** null/undefined のときは OS 追従なし(systemDark=false) */
  matchMedia?: ((q: string) => ThemeMediaQuery) | null;
  root?: ThemeRoot;
}
export const createThemeController: (deps?: ThemeControllerDeps) => ThemeController;
export const initTheme: () => ThemeController; // 既定依存でシングルトンを作って返す。2回目以降は同じものを返す
```

- 適用: `root.dataset.theme = resolved`(`'light'` も明示的に設定する)。tokens.css は `data-theme="dark"` のみ上書きするので light 指定時は `:root` の値になる。
- `createThemeController` は生成時に load → 解決 → 適用。`matchMedia(DARK_MEDIA_QUERY)` の `change` を `addEventListener` で購読し、preference が `auto` のときだけ再解決・適用・通知する。`light`/`dark` 固定中は OS の変化を無視するが、後から `auto` に戻したらその時点の `matches` で解決する。
- `deps.matchMedia` が `null` のとき、または省略時に `globalThis.matchMedia` が無いときは、`systemDark = false` とみなし購読しない。
- React からの利用: C1 では React フックは作らない(確定。切替 UI がないため利用者がいない。C2/D6 で `useSyncExternalStore(controller.subscribe, controller.getResolved)` 形で足す想定を引き継ぎに書く)。
- `src/main.tsx` で `createRoot` より前に `initTheme()` を呼び、`import './ui/theme/tokens.css'` と `import './ui/theme/static-tokens.css'`(CSS import は 06 号の bare import 禁止の例外)を追加する。`main.tsx` から `initTheme` を呼ぶのは戻り値を捨てる関数呼び出しで、副作用 import ではない。

### 2.6 初回描画のちらつき対策

- モジュールスクリプトは HTML 解析後に実行されるため、dark 設定時に一瞬 light 色が出得る。`index.html` の `<head>` に **インラインの同期スクリプトを置かない**(確定)(保存形式の解釈が 2 か所に分散し、CSP 導入時の妨げになる)。代わりに `index.html` の `<html>` 直下 `<meta name="color-scheme" content="light dark">` を置き、ブラウザ既定背景だけは OS に追従させる。
- 実害の有無は実挙動未確認(バンドルが小さく初回 1 フレーム程度と見込む)。D1 以降で目立つ場合はインラインスクリプト案を再検討する。
- `body` の背景・文字色の適用は 2.8 に記載。

### 2.7 形状・モーション(`static-tokens.css` の `:root`。spring を含め全てこのファイルに置く)

出典: (a) Jetpack Compose Material3 の `ShapeTokens`・`MotionTokens`・`TypeScaleTokens`・`TypefaceTokens`(androidx.compose.material3.tokens)、(b) Material Web の `tokens/versions/v0_192/_md-sys-*.scss`、(c) m3.material.io の Shape / Motion / Typography の仕様ページ。**下表の値は設計担当の記憶に基づき、本設計時点で出典の実物と照合できていない(未照合)。** 製造担当は (a) または (b) の実物と照合し、異なれば出典を正として採用し、照合元をファイル先頭のコメントに書き、相違点を製造報告に列挙する。

**形状(標準 7)**: `--md-sys-shape-corner-none: 0px` / `extra-small: 4px` / `small: 8px` / `medium: 12px` / `large: 16px` / `extra-large: 28px` / `full: 9999px`(MD3 は「50%」だが、要素寸法によらず丸くするため Material Web 同様の大値で表す。未照合)。

**形状(Expressive 拡張 3)**: `--md-sys-shape-corner-large-increased: 20px` / `extra-large-increased: 32px` / `extra-extra-large: 48px`(未照合)。部分角(`-top` 等)は作らない。

**easing(10)**:

| 変数 `--md-sys-motion-easing-*` | 値 |
| --- | --- |
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `standard-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` |
| `standard-decelerate` | `cubic-bezier(0, 0, 0, 1)` |
| `emphasized` | `cubic-bezier(0.2, 0, 0, 1)`(公式は path 指定。Material Web の近似値に揃える) |
| `emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` |
| `emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| `legacy` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `legacy-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` |
| `legacy-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` |
| `linear` | `cubic-bezier(0, 0, 1, 1)` |

(すべて未照合)

**duration(16)**: `--md-sys-motion-duration-short1..4` = 50/100/150/200ms、`medium1..4` = 250/300/350/400ms、`long1..4` = 450/500/550/600ms、`extra-long1..4` = 700/800/900/1000ms(未照合)。

**spring(12 変数)**: `--md-sys-motion-spring-{spatial|effects}-{fast|default|slow}-{easing|duration}`。

- 方式: **Expressive 方式(確定。ユーザー判断)**。比較した候補の Standard 方式(spatial の ζ/k が 0.9/1400・0.9/700・0.9/300、effects は共通)は採用しない。パラメータ(damping ratio ζ / stiffness k)は統括担当から受領した値で、出典は Compose Material3 の `MotionSchemeKeyTokens` 系・m3.material.io(Motion > Physics)。設計担当は未照合。

| 変数 | ζ / k |
| --- | --- |
| spatial-fast | 0.6 / 800 |
| spatial-default | 0.8 / 380 |
| spatial-slow | 0.8 / 200 |
| effects-fast / default / slow | 1.0 / 3800・1600・800 |

- `linear()` の算出式(製造担当は手計算でなくこの式で値を作り、算出に使った一時スクリプトは残さない。値は本表をそのまま書いてよい):
  - 単位質量・初期変位 0→目標 1・初期速度 0 のばね。ω = √k。ζ<1 は ωd = ω√(1−ζ²)、x(t) = 1 − e^(−ζωt)(cos ωd t + (ζω/ωd) sin ωd t)。ζ=1 は x(t) = 1 − e^(−ωt)(1 + ωt)。
  - duration T = 「その時刻以後ずっと |1 − x(t)| ≤ 0.001 が成り立つ最小時刻」を 0.1ms 刻みで探索し、ms 単位に切り上げたもの。
  - easing = t を 0〜T で 20 等分した 21 点の x を小数 3 桁に丸めて `linear(...)` に並べる。最後の点は 1 に固定。
- 算出値(設計担当が上式で計算):

| 変数 | duration | easing |
| --- | --- | --- |
| spatial-fast | 360ms | `linear(0, 0.105, 0.331, 0.581, 0.797, 0.952, 1.045, 1.088, 1.094, 1.079, 1.056, 1.033, 1.014, 1.001, 0.994, 0.991, 0.991, 0.993, 0.995, 0.997, 1)` |
| spatial-default | 435ms | `linear(0, 0.072, 0.227, 0.406, 0.573, 0.712, 0.82, 0.898, 0.951, 0.984, 1.003, 1.012, 1.015, 1.015, 1.013, 1.01, 1.007, 1.005, 1.003, 1.002, 1)` |
| spatial-slow | 600ms | `linear(0, 0.072, 0.227, 0.406, 0.573, 0.713, 0.821, 0.898, 0.951, 0.984, 1.003, 1.012, 1.015, 1.015, 1.013, 1.01, 1.007, 1.005, 1.003, 1.002, 1)` |
| effects-fast | 150ms | `linear(0, 0.079, 0.237, 0.404, 0.552, 0.672, 0.764, 0.833, 0.884, 0.92, 0.945, 0.962, 0.974, 0.983, 0.988, 0.992, 0.995, 0.997, 0.998, 0.999, 1)` |
| effects-default | 231ms | `linear(0, 0.079, 0.236, 0.403, 0.551, 0.671, 0.764, 0.833, 0.883, 0.919, 0.945, 0.962, 0.974, 0.983, 0.988, 0.992, 0.995, 0.997, 0.998, 0.998, 1)` |
| effects-slow | 327ms | `linear(0, 0.079, 0.237, 0.404, 0.552, 0.672, 0.765, 0.834, 0.884, 0.92, 0.945, 0.962, 0.975, 0.983, 0.988, 0.992, 0.995, 0.997, 0.998, 0.999, 1)` |

- `linear()` 非対応ブラウザ向けの代替: `:root` で各 spring easing をまず cubic-bezier で宣言し、`@supports (transition-timing-function: linear(0, 1))` 内の `:root` で上記 `linear()` に上書きする。代替値は spatial = `cubic-bezier(0.2, 0, 0, 1)`(standard と同じ。オーバーシュートは再現しない)、effects = `cubic-bezier(0, 0, 0, 1)`(standard-decelerate と同じ)。duration は代替時も同じ値。
- `@media (prefers-reduced-motion: reduce)` で duration 変数を `0ms` に上書きしない(確定。消すと状態変化の手がかりが減るため。部品側で判断する方針を規約に書く)。

### 2.8 タイポグラフィ(`static-tokens.css`)

- `--md-ref-typeface-brand` / `--md-ref-typeface-plain`: `system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", sans-serif`(両方同値。Web フォントは読み込まない。引用符は Biome に合わせ二重引用符)。
- `--md-sys-typescale-<役割>-{font|size|line-height|weight|tracking}` の 15 役割 × 5 = 75 変数。`-font` は display・headline・title-large が `var(--md-ref-typeface-brand)`、それ以外が `var(--md-ref-typeface-plain)`。値(size / line-height / weight / tracking。**未照合**、出典 (a)(b)(c) と照合すること):

| 役割 | size | line-height | weight | tracking |
| --- | --- | --- | --- | --- |
| display-large | 57px | 64px | 400 | -0.25px |
| display-medium | 45px | 52px | 400 | 0px |
| display-small | 36px | 44px | 400 | 0px |
| headline-large | 32px | 40px | 400 | 0px |
| headline-medium | 28px | 36px | 400 | 0px |
| headline-small | 24px | 32px | 400 | 0px |
| title-large | 22px | 28px | 400 | 0px |
| title-medium | 16px | 24px | 500 | 0.15px |
| title-small | 14px | 20px | 500 | 0.1px |
| body-large | 16px | 24px | 400 | 0.5px |
| body-medium | 14px | 20px | 400 | 0.25px |
| body-small | 12px | 16px | 400 | 0.4px |
| label-large | 14px | 20px | 500 | 0.1px |
| label-medium | 12px | 16px | 500 | 0.5px |
| label-small | 11px | 16px | 500 | 0.5px |

- 規約クラス `.tabular-nums { font-variant-numeric: tabular-nums; }` を定義。**点数・符・翻・本場・供託など、桁が揃うべき数値の表示要素には必ずこのクラス(または同等の宣言)を付ける**ことを 06 号に規約として追記する。
- `body` に `background: var(--md-sys-color-background); color: var(--md-sys-color-on-background); font-family: var(--md-ref-typeface-plain);` を当てる。
- Expressive の emphasized タイプスケールは C1 では作らない(必要になれば C2)。

### 2.9 公開 API(`src/ui/theme/index.ts`)

`ThemePreference`、`ResolvedTheme`、`THEME_PREFERENCES`、`AppSettings`、`DEFAULT_APP_SETTINGS`、`loadAppSettings`、`saveAppSettings`、`resolveTheme`、`createThemeController`、`initTheme`、`ThemeController` を export。CSS は export しない(`main.tsx` が直接 import)。

### 2.10 06-ui-md3-protocol.md への追記(製造が行う)

「シード色・ライト/ダークの扱いなどの細目は…」の段落の後に節「テーマ(C1 で確定)」を追加し、次を書く。

1. シード `#1B5E20`・SchemeTonalSpot・contrast 0・spec `'2021'`(明示指定)。利用者変更なし。
2. ライト/ダーク: `'auto' | 'light' | 'dark'`、既定 auto、`<html data-theme>` で切替。CSS で `prefers-color-scheme` を直接使わない(解決は `src/ui/theme/apply-theme.ts` に集約)。
3. 生成手順: シードやライブラリ版を変えたら `npm run gen:theme` で `src/ui/theme/tokens.css` を再生成してコミット。`tokens.css` は手編集禁止。CI の `check:theme` が差分を検出する。
4. spring モーションは Expressive 方式(`--md-sys-motion-spring-*`)を使う。形状・モーション・タイポグラフィも `--md-sys-shape-*`・`--md-sys-motion-*`・`--md-sys-typescale-*` を使い、px・ms・cubic-bezier を部品に直書きしない。
5. 桁の揃う数値には `tabular-nums` を使う。

## 3. 受け入れ条件

各項目は作業ツリーのルートで実行する。テストの `describe`/`it` 名には `C1-` で始まる通し番号(例 `テーマ設定の保存 (C1-S01〜S11)`、`テーマの適用 (C1-A01〜A08)`、`トークン生成物 (C1-K01〜)`)を付ける(05号)。

1. [ ] `package.json` の devDependencies に `"@material/material-color-utilities": "0.4.0"` がキャレット・チルダなしで存在し、`package-lock.json` の同パッケージの `version` が `0.4.0`。`package.json` に `"sideEffects": ["*.css"]` がある。
2. [ ] `npm run gen:theme` を実行後、`git status --porcelain src/ui/theme/tokens.css` が空(コミット済み生成物と一致)。
3. [ ] `src/ui/theme/tokens.css` の 1 行(例: light の `--md-sys-color-primary`)を手で書き換えて `npm run check:theme` を実行すると終了コードが 0 以外になり、差分の情報が出る。`git checkout src/ui/theme/tokens.css` で戻した後の `npm run check:theme` は終了コード 0。
4. [ ] `tokens.css` のセレクタは `:root` と `:root[data-theme="dark"]`(二重引用符)の2つだけ。`:root` ブロックで `--md-sys-color-primary` が `#3c6939`、`on-primary` が `#ffffff`、`primary-container` が `#bcf0b4`、`surface` が `#f7fbf1`、`outline` が `#72796f`。dark ブロックで `primary` が `#a1d399`、`on-primary` が `#0b390f`、`primary-container` が `#245023`、`surface` が `#10140f`(1.3 の再生成値)。
5. [ ] `tokens.css` の両ブロックの `--md-sys-color-*` が、それぞれ 2.2 の固定リスト 49 役割とちょうど一致する(過不足なし、順序も一致)。`surface-variant`・`shadow`・`scrim`・`surface-tint` を含み、`-palette-key-color` および `primary-dim`・`secondary-dim`・`tertiary-dim`・`error-dim` を含まない(`tokens.test.ts` で検査し、`npm test` が通る)。
6. [ ] `.github/workflows/ci.yml` に `npm run check:theme` を実行するステップがある。
7. [ ] `theme-config.test.ts` に次のケースがあり `npm test` で通る: `restoreAppSettings(null)`→auto/壊れた JSON→auto/`[]`→auto/`{"version":2,"settings":{"theme":"dark"}}`→auto/`{"version":"1",...}`→auto/`{"version":1,"settings":{"theme":"sepia"}}`→auto/`{"version":1,"settings":{"theme":"dark"}}`→dark/serialize→restore の往復が3値すべてで一致/`getItem` が例外を投げる storage で load が auto/`setItem` が例外を投げる storage で save が `false`/保存キーが `mj3calc.settings` で `mj3calc.rule` に触れない。
8. [ ] `apply-theme.test.ts` に、偽の `ThemeMediaQuery`(`matches` と `change` 発火を制御できるもの)と偽の `ThemeRoot`(`{ dataset: {} }`)を使った次のケースがあり通る: auto+OS light→`data-theme` が `light`/auto+OS dark→`dark`/auto 中に OS が dark→light に変化→`light` に変わり subscribe の listener が1回呼ばれる/`setPreference('dark')` 後に OS 変化しても `dark` のまま・listener 呼ばれない/`setPreference('auto')` に戻すと現在の OS 値で解決/`setPreference` で storage に保存される/`dispose` 後は OS 変化に反応しない/`matchMedia: null` で light。OS 変化への動的な追従はこの項目で担保する。
9. [ ] `npm run build` 後 `npm run preview` で開いたページで(01号の dev サーバー禁止事項・C-01号の手順に従う)、prefers-color-scheme のエミュレーションを light にして**再読み込み**すると `<html>` の `data-theme` が `light`、`getComputedStyle(document.body).backgroundColor` が `rgb(247, 251, 241)`。dark にして**再読み込み**すると `dark`・`rgb(16, 20, 15)`。
10. [ ] 同ページのコンソールで `localStorage.setItem('mj3calc.settings','{"version":1,"settings":{"theme":"dark"}}')` → 再読込で、エミュレーションが light でも `data-theme="dark"`。値を `'{broken'` にして再読込するとエミュレーション値に従い、例外がコンソールに出ない。
11. [ ] `static-tokens.css` に、形状 10(標準 7+拡張 3)、easing 10、duration 16、spring 12、`--md-ref-typeface-brand/plain` 2、typescale 75、`.tabular-nums` が存在し、値が 2.7・2.8 の表(製造時の照合で修正した場合は製造報告の修正後の値)と一致する。spring 変数は `static-tokens.css` にだけあり `tokens.css` に無い。ファイル先頭に照合元のコメントがある。`tokens.test.ts` で変数名と数を検査する。
12. [ ] spring easing 6 変数が `@supports (transition-timing-function: linear(0, 1))` 内で `linear(` の値を持ち、その外側で 2.7 の `cubic-bezier` 代替値を持つ。
13. [ ] `git diff main -- src/ui ':!src/ui/theme/tokens.css' ':!*.test.ts' | grep -E '^\+.*#[0-9a-fA-F]{3,8}\b'` の出力が空(テストの期待値は UI コードではないため対象外)。
14. [ ] `docs/rules/06-ui-md3-protocol.md` に 2.10 の5点が追記されている。
15. [ ] `npm run lint` / `npm run typecheck` / `npm run format:check` / `npm test` / `npm run check:theme` がすべて成功(format:check と check:theme が**両方**通ること=生成物が Biome の整形結果と一致すること)。
16. [ ] リポジトリ内に絶対パス・ホームディレクトリ名が増えていない(`git diff main | grep -nE '/Users/|/home/'` が空)。

## 4. 後続 Issue への引き継ぎ

- **C2**: デバッグ用の仮切替を作る(URL パラメーター例 `?theme=dark` でも可)。`initTheme().setPreference(...)` を呼ぶだけで成立する。React から解決値を読む `useSyncExternalStore` ベースのフックが要れば C2 で `src/ui/theme/` に追加する。Material Web 部品は `--md-sys-*` トークンをそのまま参照するため、ラッパー側で色を再定義しないこと。図形モーフ・emphasized タイポグラフィ・部分角トークンは C2 以降。
- **D6**: 切替 UI を正式搭載する。保存は `AppSettings`(`mj3calc.settings`)を使い、ルール(`mj3calc.rule`)と混ぜない。設定項目を増やすときは `AppSettings` に足し、非互換なら `APP_SETTINGS_STORAGE_VERSION` を上げる。
- **牌画のダークテーマ**(mahjong-calc の `tileColor` 相当): C1 では扱わない。C3 以降で要否を判断する。`AppSettings` に項目追加する形を想定。
- **spec 版**: 2021 で確定。tertiary の使い道が決まったら(Epic E の頃)2025 版への切替を見直す可能性がある。切り替える場合は `gen:theme` の引数変更と再生成、受け入れ期待値の更新が要る。
- **未解決: シード色と牌の緑の近さ**: シード `#1B5E20`(色相約145°)は索子・發の緑と近く、primary 系の面に牌を載せると識別性が落ちるおそれがある。C1 では対策を入れない。C3(牌画像)と UI 監修で扱う。
- 初回描画のちらつき(2.6)が D1 以降で目立つ場合は、`<head>` のインラインスクリプト案を再検討する。
- `@material/material-color-utilities` 0.4.0 は素の Node で import できない(1.3)。版を上げる際は `gen:theme` の実行方式も再確認する。

## 5. 実挙動未確認の箇所

- 形状・easing・duration・typescale の値と spring パラメータ(2.7・2.8)は出典と未照合(製造時に照合必須)。
- `vite-node` への `--check` 引数の受け渡し(2.3)。
- 初回描画のちらつきの有無(2.6)。
- 生成物が Biome の整形と完全一致する書式か(2.2。製造時に `biome format` で確認)。
- 受け入れ条件 9 の `body` 背景の computed 値は、tokens の値からの推定。
