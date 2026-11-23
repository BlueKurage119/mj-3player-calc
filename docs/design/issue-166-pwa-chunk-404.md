# Issue #166 設計書: PWA 更新時に開いたままの旧タブで未訪問の遅延チャンクが 404 になる問題の対策

- 対象Issue: #166（baseブランチ: `develop/v2.0`）
- 基準コミット: `develop/v2.0` `6a72cfb`
- 設計担当モデル: `Antigravity (Gemini 4 Neon High)`
- 状態: 確定仕様・独立レビュー指摘（M1・M2・L1・L2）反映済み（未決事項なし・設計承認待ち）

## 1. 参照資料と設計判断の根拠

### 1.1 ヒアリング済みの確定事項（統括担当より受領。再検討・上書きしない）

| # | 確定事項 | 本設計での反映 |
| --- | --- | --- |
| H1 | 新 Service Worker の有効化タイミングと更新 UX: 待機型（`skipWaiting` 無効化）＋ 更新通知 UI（スナックバー等で「更新」ボタンを提示）。新 SW は待機状態にとどめ、開いている旧タブのキャッシュを維持する。ユーザーが「更新」を押したとき、または全タブを閉じて再起動したときに新 SW へ切り替える | §3.1・§3.2・§3.4 |
| H2 | 遅延チャンク読み込み失敗時のフォールバック: `vite:preloadError` 検知による自動リロード（`sessionStorage` 等による無限リロード防止ガード付き） | §3.3 |
| Q1 | 更新スナックバーの文言・操作: 本文「新しいバージョンがあります」、アクションボタン「更新」のみとし、**閉じるボタンなし** | §3.4・§5・§6.2 |
| Q2 | 更新スナックバーの表示位置・消去挙動: 画面下部固定（`BottomSheet`・`ResultBanner` 表示時はその上に回避）、**自動消去なし** | §3.4・§6.2 |
| Q3 | 更新検知タイミング: ブラウザ標準のナビゲーション時チェックに加え、タブ・PWA 前面復帰時（`visibilitychange`、最短 60 秒間隔・オンライン時のみ）に `registration.update()` を呼ぶ | §3.2・§5 |
| Q4 | 無限リロード防止ガード方式: `sessionStorage` に直前時刻を記録する **10 秒クールダウン方式** | §3.3・§5・§6.2 |
| Q5 | UI 監修の扱い: モックのみで実施し、**実機監修は省略可** | §6.3・§7 |

### 1.2 参照した資料・ソースコード

- 業務標準・指導文書:
  - `docs/rules/01-dev-workflow-protocol.md`（運用順序・dev サーバー制約）
  - `docs/rules/02-design-protocol.md`（設計フェーズ業務標準）
  - `docs/rules/05-verification-protocol.md`（検証・テスト規約）
  - `docs/rules/06-ui-md3-protocol.md`（色トークン・自作部品の配置・bare import 禁止・UI 監修）
  - `docs/rules/09-bundle-budget-protocol.md`（初回 JS 目標値運用）
  - `docs/rules/advisory/G-01-hearing-first-design.md`・`G-10-design-consistency-pitfalls.md`・`G-11-prod-build-css-drop.md`
- Issue・既存設計書:
  - Issue #166 本文（`gh issue view 166`）
  - `docs/design/issue-108-pwa.md`（PWA 基盤・`§10` に将来の `registerType: 'prompt'` + `virtual:pwa-register/react` 導入引き継ぎあり）
  - `docs/design/issue-159-circular-progress.md`（`src/ui/expressive/` 自作部品・トークン規約・バンドル基準値）
- 既存コード・設定:
  - `vite.config.ts`・`package.json`・`package-lock.json`・`tsconfig.app.json`・`biome.json`
  - `src/main.tsx`・`src/ui/App.tsx`・`src/ui/screen/MainScreen.tsx`・`src/ui/screen/main-screen.css`・`src/ui/screen/ResultBanner.tsx`
  - `src/ui/expressive/index.ts`・`src/ui/expressive/BottomSheet.tsx`・`src/ui/expressive/bottom-sheet.css`・`src/ui/expressive/Stepper.tsx`
  - `src/ui/theme/tokens.css`・`src/ui/theme/static-tokens.css`・`src/ui/theme/status-bar-guard.css`
  - `src/ui/calc/use-result.ts`・`src/ui/result/slots.tsx`・`src/ui/share/index.ts`・`src/engine/worker.ts`・`src/engine/client.ts`
  - `src/build-css.test.ts`・`src/ui/md/md-static.test.ts`・`src/ui/screen/AppHeader.test.tsx`・`src/pwa/icons.test.ts`・`scripts/status-bar-build.test.ts`
  - `deploy/cloud-run/nginx.conf`

### 1.3 問題構造と設計判断の根拠

#### (1) 遅延読み込みチャンクの棚卸し

現行コードの動的 `import()` / `React.lazy()` 箇所は次のとおりである。

- メインスレッド（Vite の `__vitePreload` により `vite:preloadError` の対象となる）:
  - `src/ui/App.tsx`: `SettingsScreen`・`ScoringTableScreen`・`LicenseScreen`・`HelpScreen`・`EngineScreen`（本番 5 画面）
  - `src/ui/result/slots.tsx`: `HoraDetail`（`lazy` および `preloadHoraDetail`）
  - `src/ui/calc/use-result.ts`: `./compute`（点数・向聴計算コア + `decomposer` WASM）
  - `src/ui/share/index.ts`: `./share-module`（画像共有機能）
- Web Worker（`src/engine/worker.ts` 内の `import('./compute')`）:
  - Vite のビルド処理は `!config.isWorker` 条件により Worker へ `__vitePreload` を挿入せず、Worker 内に `window` も存在しないため、`vite:preloadError` の対象外である。
  - しかし **主対策（待機型 SW）** により、`skipWaiting: false` の間は旧 SW が `worker-*.js`・`compute-*.js`・`engine_bg-*.wasm` を含む旧プリキャッシュを保持し続けるため、開いている旧タブ上の Worker 遅延読み込みも保護される。

#### (2) `registerType: 'prompt'` + `injectRegister: false` + `skipWaiting: false` + `clientsClaim: false` とする根拠

1. **`registerType: 'prompt'` と `injectRegister: false`**:
   - `vite-plugin-pwa@0.21.2` の型定義（`dist/index.d.ts`）に明記されているとおり、`registerType` は仮想モジュール（`virtual:pwa-register` / `virtual:pwa-register/react`）でのみ有効であり、`injectRegister: 'script'` では利用できない。
   - `injectRegister: 'script'` を残したまま `virtual:pwa-register/react` を import すると、`dist/registerSW.js` の `<script>` 注入と `workbox-window` の二重登録が発生する。`injectRegister: false` とすることで、登録経路を `virtual:pwa-register/react` に一本化する。
2. **`workbox.skipWaiting: false`**:
   - `workbox-build@7.4.1` の `sw-template.js` において、`skipWaiting` が falsy の場合に限り、無条件の `self.skipWaiting()` ではなく `{ type: 'SKIP_WAITING' }` メッセージを受信したときだけ `self.skipWaiting()` を呼ぶリスナーが `dist/sw.js` に生成される。
   - `workbox-precaching` の `PrecacheController.activate()` は旧キャッシュエントリの削除を `activate` イベント内でのみ行い、`install` イベントでは削除しない。したがって新 SW が `waiting` にとどまる間、旧 SW のプリキャッシュは完全に維持される。
   - **v1.1.0 → v2.0.0 移行時の効果**: 新版 `sw.js` が `skipWaiting()` を呼ばないかどうかは**新版 SW 側**で決まるため、現行 v1.1.0（旧 SW が `skipWaiting: true`）を開いたままのタブに対して v2.0.0 を配信した場合でも、v2.0.0 の SW は `waiting` で停止し、v1.1.0 タブの旧キャッシュを維持できる（v1.1.0 JS には更新通知 UI が無いため全タブ終了後の再起動時に v2.0.0 へ切り替わるが、開いたままの未訪問画面 404 は防止される）。
3. **`workbox.clientsClaim: false`**:
   - `workbox-window@7.4.1` は `register()` 時点で `this._isUpdate = Boolean(navigator.serviceWorker.controller)` を 1 回だけ評価し、以後更新しない。`vite-plugin-pwa@0.21.2` の `register.js` は `controlling` イベントで `if (event.isUpdate) window.location.reload()` を実行する。
   - 仮に `clientsClaim: true` のままだと、初回訪問（登録時 `controller === null` のため `_isUpdate === false`）で SW v1 がタブを即座に制御下に置いた後、同じタブを開いたまま SW v2 が `waiting` になりユーザーが「更新」を押しても、`event.isUpdate` が `false` のままとなり自動リロードが発火しない不具合が生じる。
   - `clientsClaim: false` とすれば、初回訪問は未制御のまま動作し（初回訪問中にデプロイが重なってチャンク 404 が起きた場合は副対策 `vite:preloadError` で自動リロード復帰）、次回読み込み以降は SW 制御下（`_isUpdate === true`）となって「更新」ボタン押下時に確実にリロードされる。
   - また初回訪問でも SW のインストール・`activated` 状態への遷移自体は完了するため、オフライン化後の再読み込み（Issue #108 G1-AC11 相当）は引き続き動作する。
4. **`workbox.cleanupOutdatedCaches: true` の維持**:
   - `cleanupOutdatedCaches()` は `activate` 時に実行されるため、待機中は旧キャッシュを消さず、新 SW 有効化後のみ不要キャッシュを整理できる。

#### (3) 更新通知 UI を `src/ui/expressive/Snackbar.tsx` に自作する根拠

- `@material/web@2.5.0` には Snackbar コンポーネントが存在しない（§2 確認済み）。
- `docs/rules/06-ui-md3-protocol.md` 必須の制約 4 に従い、`src/ui/expressive/` 配下に MD3 トークンのみで自作部品 `Snackbar` を追加する。
- MD3 Snackbar の役割色である `--md-sys-color-inverse-surface`・`--md-sys-color-inverse-on-surface`・`--md-sys-color-inverse-primary`・`--md-sys-color-shadow` は、いずれも現行 `src/ui/theme/tokens.css` のライト・ダーク両ブロックに生成済みであるため、`tokens.css` の再生成は不要。
- Q1 確定により閉じるボタンを置かないため、アイコン依存もなく素の HTML 要素だけで最小サイズに構成できる。
- `z-index` は既存階層（`.app-header`: 15、`.status-bar-guard`: 16、`.summary-card` / `.engine-card`: 18、`.result-banner`: 19、`.bottom-sheet`: 20、`Dialog`: 30、`.help-tooltip`: 100）との整合を保ち、**`z-index: 25`** とする（既存 CSS・`AppHeader.test.tsx` の `Issue142-Z1` / `Issue142-D1` に影響しない）。

## 2. 外部事実の確認記録

本設計が前提とする外部パッケージ・API・既存構成の事実を、以下のコマンドで実物確認した。

| # | 確認した外部事実 | 実行コマンド（リポジトリ相対または main worktree 参照） | 確認結果 |
| --- | --- | --- | --- |
| E1 | 導入済みパッケージの固定バージョン | `node -e "const lock = require('./package-lock.json'); for (const p of ['node_modules/vite','node_modules/vite-plugin-pwa','node_modules/workbox-window','node_modules/workbox-build','node_modules/@material/web']) console.log(p, lock.packages[p]?.version);"` | `vite` 6.4.4、`vite-plugin-pwa` 0.21.2、`workbox-window` 7.4.1、`workbox-build` 7.4.1、`@material/web` 2.5.0 |
| E2 | `@material/web@2.5.0` に Snackbar が存在しないこと | `ls "$MAIN_WT/node_modules/@material/web/" \| grep -i snack` | ヒットなし（Snackbar コンポーネントなし） |
| E3 | `vite-plugin-pwa@0.21.2` の React 型定義と `exports` | `node -e "console.log(JSON.stringify(require('$MAIN_WT/node_modules/vite-plugin-pwa/package.json').exports, null, 2))"` および `cat "$MAIN_WT/node_modules/vite-plugin-pwa/react.d.ts"` | `"./react": { "types": "./react.d.ts" }` が公開されており、`declare module 'virtual:pwa-register/react'` で `useRegisterSW(options?: RegisterSWOptions)`（戻り値: `needRefresh`, `offlineReady`, `updateServiceWorker`）を宣言 |
| E4 | `vite-plugin-pwa@0.21.2` の `injectRegister` と `registerType` の関係 | `grep -n -C 5 "injectRegister\|registerType" "$MAIN_WT/node_modules/vite-plugin-pwa/dist/index.d.ts"` および `sed -n '250,275p' "$MAIN_WT/node_modules/vite-plugin-pwa/dist/index.js"` | `registerType` は `injectRegister` が `'inline'` または `'script'` の場合は非対応。`injectRegister: false` でスクリプト注入を抑止でき、`virtual:pwa-register/react` 経由の登録に一本化できる |
| E5 | `vite-plugin-pwa@0.21.2` の `useRegisterSW` / `registerSW` 実装とサイズ | `cat "$MAIN_WT/node_modules/vite-plugin-pwa/dist/client/build/react.js"`・`cat "$MAIN_WT/node_modules/vite-plugin-pwa/dist/client/dev/react.js"`・`gzip -9 -c ... \| wc -c` | ビルド時は `await import("workbox-window")` で遅延読み込みし、`waiting` イベントで `controlling`（`if (event.isUpdate) window.location.reload()`）を登録して `onNeedRefresh()` を呼ぶ。`updateServiceWorker()` は `wb.messageSkipWaiting()` を呼ぶ。dev 時は no-op フックを返す。`react.js` 単体は `gzip -9` で 1,002 B、`workbox-window.prod.es5.mjs` 単体は 2,324 B |
| E6 | `workbox-build@7.4.1` の `skipWaiting: false` 生成結果 | `node -e "const { swTemplate } = require('$MAIN_WT/node_modules/workbox-build/build/templates/sw-template.js'); console.log(swTemplate);"` | `skipWaiting` が falsy のとき `self.addEventListener('message', (event) => { if (event.data && event.data.type === 'SKIP_WAITING') { self.skipWaiting(); } });` を生成。`clientsClaim` は truthy のときのみ生成 |
| E7 | `workbox-precaching` の旧キャッシュ削除タイミング | `grep -n -A 25 "activate(" "$MAIN_WT/node_modules/workbox-precaching/PrecacheController.js"` | 不要になったプリキャッシュ URL の `cache.delete()` は `activate(event)` 内でのみ実行される |
| E8 | `workbox-window@7.4.1` の `_isUpdate` 判定と `controlling` | `grep -n -C 8 "_isUpdate" "$MAIN_WT/node_modules/workbox-window/build/workbox-window.dev.mjs"` | `register()` 時に `this._isUpdate = Boolean(navigator.serviceWorker.controller)` を 1 回だけ設定し、`_onControllerChange` で `isUpdate: this._isUpdate` を送出 |
| E9 | `vite@6.4.4` の `vite:preloadError` 型と実装 | `sed -n '265,300p' "$MAIN_WT/node_modules/vite/client.d.ts"` および `sed -n '45655,45715p' "$MAIN_WT/node_modules/vite/dist/node/chunks/dep-3O3b9SCF.js"` | `WindowEventMap` に `'vite:preloadError': VitePreloadErrorEvent`（`payload: Error`、cancelable）が定義済み。`!config.isWorker` のクライアントビルドでのみ発火し、`event.defaultPrevented` が `true` なら再 throw を抑止する |
| E10 | 既存 `tokens.css` の inverse トークンと既存 `z-index` | `src/ui/theme/tokens.css` 閲覧および `grep -rn "z-index" src/` | `inverse-surface` / `inverse-on-surface` / `inverse-primary` / `shadow` がライト・ダーク双方に存在。既存 z-index は 15/16/18/19/20/30/100 |
| E11 | `registerSW` / `skipWaiting` / `clientsClaim` の既存参照箇所 | `grep -rn "registerSW\|skipWaiting\|clientsClaim\|autoUpdate\|injectRegister\|sw\.js" src/ scripts/ deploy/ .github/ vite.config.ts index.html` | `vite.config.ts` と `deploy/cloud-run/nginx.conf:38` のみ。既存テストに `registerSW.js` 依存なし |

## 3. モジュール構成・設計詳細・シグネチャ

### 3.1 `vite.config.ts`・`tsconfig.app.json` の変更

1. **`vite.config.ts`**（`VitePWA` オプションのみ変更。`manifest`・`injectThemeColorPlugin`・`base`・`build`・`worker` は変更しない）:
   ```ts
   VitePWA({
     registerType: 'prompt',
     injectRegister: false,
     manifest: { /* 既存のまま変更しない */ },
     workbox: {
       skipWaiting: false,
       clientsClaim: false,
       cleanupOutdatedCaches: true,
       globPatterns: ['**/*.{js,css,html,wasm,svg,png}'],
       ...(buildConfig.isPreview
         ? { navigateFallbackDenylist: [/^\/robots\.txt$/] }
         : {})
     }
   })
   ```
2. **`tsconfig.app.json`**:
   - `compilerOptions.types` を `["vite/client", "vite-plugin-pwa/react"]` に変更する（`virtual:pwa-register/react` の型解決を有効化）。

### 3.2 SW 登録・更新検知フック（`src/pwa/use-pwa-update.ts`）

- `virtual:pwa-register/react` の `useRegisterSW` をラップし、UI コンポーネントから切り離す。
- 初期読み込み時のブラウザ標準チェックに加え、**【確定 Q3】** タブ・アプリが前面復帰したとき（`document` の `visibilitychange` で `visibilityState === 'visible'` となったとき）に、`navigator.onLine !== false` かつ前回確認から `UPDATE_CHECK_MIN_INTERVAL_MS`（60,000 ms）以上経過していれば `registration.update()` を呼ぶ（失敗時は握り潰して UI を壊さない）。
  - `attachVisibilityUpdateCheck` は**装着時点で `lastCheckAt = now()` に初期化する**（SW 登録直後を初回確認済み扱いとし、装着から 60,000 ms 以上経過した後の `visible` 復帰から `registration.update()` を実行する）。実行時に `lastCheckAt = now()` を更新する。
- `offlineReady` は通知しない（H1 の対象外。不要なトーストを出さない）。
- 更新ボタン押下時（`applyUpdate`）は二重発火を防ぐため `updating` を `true` にして `await updateServiceWorker(true)` を実行する。通常（SW 制御下タブ）は `SKIP_WAITING` → `controlling`（`isUpdate: true`）で `vite-plugin-pwa` 側が自動リロードするが、Shift+Reload 直後などの未制御タブ（`navigator.serviceWorker?.controller === null`）で `waiting` 中の新 SW を検知して「更新」を押した場合は `controlling` による自動リロードが発火しないため、`updateServiceWorker(true)` 実行後に `navigator.serviceWorker?.controller === null` であればフォールバックとして `window.location.reload()` を呼ぶ。万一 `updateServiceWorker(true)` の Promise が失敗した場合のみ `updating` を `false` に戻す。
- アンマウント時には `attachVisibilityUpdateCheck` が返す解除関数を実行してリスナーを破棄する。

```ts
// src/pwa/use-pwa-update.ts
export const UPDATE_CHECK_MIN_INTERVAL_MS = 60_000;

export interface PwaUpdateState {
  /** 待機中の新 SW があり、更新通知を表示すべきとき true */
  needRefresh: boolean;
  /** 「更新」押下後、新 SW 有効化〜リロード待ちの間 true */
  updating: boolean;
  /** 待機中の新 SW に SKIP_WAITING を送りリロードを開始する */
  applyUpdate: () => Promise<void>;
}

export interface VisibilityUpdateCheckOptions {
  registration: Pick<ServiceWorkerRegistration, 'update'>;
  doc?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  isOnline?: () => boolean;
  now?: () => number;
  minIntervalMs?: number;
}

/**
 * visibilitychange による throttled な registration.update() リスナーを登録し、解除関数を返す。
 */
export function attachVisibilityUpdateCheck(
  options: VisibilityUpdateCheckOptions
): () => void;

export function usePwaUpdate(): PwaUpdateState;
```

- **テスト容易性**: `attachVisibilityUpdateCheck` を純粋な DI 対応関数として切り出すことで、`visibilitychange` のスロットリング・オフライン時スキップ・`update()` 例外握り潰し・アンマウント時の解除を Vitest で決定的に検証できる。`usePwaUpdate` 自身も `vi.mock('virtual:pwa-register/react', ...)` で単体テスト可能とする。

### 3.3 `vite:preloadError` 自動リロードフォールバック（`src/pwa/preload-recovery.ts`）

- `src/main.tsx` の先頭（`createRoot(...).render(...)` より前）で `installPreloadErrorRecovery()` を 1 回だけ呼ぶ。
- **【確定 Q4】** 無限リロード防止ガードには `sessionStorage` のタイムスタンプによる 10 秒クールダウン方式を採用する（キー: `'mj3calc:preload-reload-at'`、クールダウン: `10_000` ms）。
  - 直前の自動リロードから 10 秒以内の再発時はリロードを抑止し、無限ループを防止する。
  - 長時間開き続けた同一タブで数時間後に別デプロイが発生した場合は、10 秒以上経過しているため再度自動リロードで復帰できる。
  - `sessionStorage` が利用不可、または `getItem` / `setItem` が例外（`SecurityError` / `QuotaExceededError` 等）を投げた場合は、ガードを永続化できないため**安全側（リロードしない）**に倒す。
  - リロードを実行するときのみ `event.preventDefault()` を呼び、`window.location.reload()` を呼ぶ。抑止時は `event.preventDefault()` を呼ばず、既存のエラー処理へ委ねる。

```ts
// src/pwa/preload-recovery.ts
export const PRELOAD_RELOAD_STORAGE_KEY = 'mj3calc:preload-reload-at';
export const PRELOAD_RELOAD_COOLDOWN_MS = 10_000;

export interface PreloadRecoveryDeps {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  now?: () => number;
  reload?: () => void;
  cooldownMs?: number;
}

/**
 * ガード状態を確認し、自動リロードを許可すべきなら true を返す（副作用なし）。
 * storage 不在・例外時は安全側として false を返す。
 */
export function shouldReloadOnPreloadError(
  deps?: PreloadRecoveryDeps
): boolean;

/**
 * vite:preloadError イベントを処理する。
 * 許可された場合はタイムスタンプ記録・event.preventDefault()・reload() を行い true を返す。
 * 抑止または storage 書き込み失敗時はリロードせず false を返す。
 */
export function handlePreloadError(
  event: Event,
  deps?: PreloadRecoveryDeps
): boolean;

/**
 * window に 'vite:preloadError' リスナーを登録し、解除関数を返す。
 */
export function installPreloadErrorRecovery(
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  deps?: PreloadRecoveryDeps
): () => void;
```

### 3.4 更新通知 UI（`src/ui/expressive/Snackbar.tsx`・`snackbar.css`・`src/ui/pwa/PwaUpdatePrompt.tsx`）

#### (1) 再利用可能な自作部品 `src/ui/expressive/Snackbar.tsx` + `src/ui/expressive/snackbar.css`

- `src/ui/expressive/index.ts` から `Snackbar` と `type SnackbarProps` を再エクスポートする。
- **G-11 対策**: `import './snackbar.css';` は必ず `src/ui/expressive/Snackbar.tsx` 内に直接記述し、`src/ui/expressive/index.ts`（バレル）には書かない。
- **MD3 トークン規約（06号）**:
  - `snackbar.css` には HEX・`rgb(`・`px`・`ms`・`cubic-bezier` を一切直書きしない（単位は `rem` と MD3 CSS 変数のみ使用）。
  - 色:
    - 背景: `var(--md-sys-color-inverse-surface)`
    - 本文テキスト: `var(--md-sys-color-inverse-on-surface)`
    - アクションボタン文字・フォーカス枠: `var(--md-sys-color-inverse-primary)`
    - 影: `0 0.1875rem 0.375rem color-mix(in srgb, var(--md-sys-color-shadow) 30%, transparent)`
    - アクションボタン hover/active 状態層: `color-mix(in srgb, var(--md-sys-color-inverse-primary) 12%, transparent)`
  - 形状・タイポグラフィ・モーション:
    - 角丸: `var(--md-sys-shape-corner-extra-small)`（MD3 Snackbar 標準）
    - 本文: `--md-sys-typescale-body-medium-*`
    - アクションボタン: `--md-sys-typescale-label-large-*`
    - アニメーション: `--md-sys-motion-spring-effects-fast-duration` / `--md-sys-motion-spring-effects-fast-easing`
    - `@media (prefers-reduced-motion: reduce)` で `transition: none;` を指定
- **配置・重なり回避（【確定 Q2】）**:
  - `position: fixed; inset-inline: 0; z-index: 25;`
  - 横幅は `.result-banner` と揃え `width: calc(100% - 2rem); max-width: calc(var(--app-max-width, 37.5rem) - 2rem); margin-inline: auto;` とする。
  - 下端位置は `BottomSheet`（`--sheet-height`）・`ResultBanner`（`--result-banner-height`）・`safe-area-inset-bottom` を回避するため、次式を使う:
    ```css
    bottom: calc(
      max(env(safe-area-inset-bottom, 0rem), var(--sheet-height, 0rem)) +
      var(--result-banner-height, 0rem) +
      0.75rem
    );
    ```
    - `BottomSheet` 閉・`ResultBanner` 非表示時: `safe-area-inset-bottom + 0.75rem`
    - `BottomSheet` 開時（`--sheet-height` が `safe-area-inset-bottom` を内包済み）: `--sheet-height + --result-banner-height + 0.75rem`（二重加算なし）
    - 他画面（`SettingsScreen` 等）表示時: `--sheet-height`・`--result-banner-height` はともに `0px` にリセットされるため、画面下端から `safe-area-inset-bottom + 0.75rem` に配置される。
- **アクセシビリティ**:
  - 外側コンテナ `<div className="snackbar-host" role="status" aria-live="polite" aria-atomic="true">` を常時マウントし、`open === true` のとき内部の `.snackbar` を描画することで、スクリーンリーダーが状態変化を確実に読み上げられるようにする（モーダルにせず、手牌入力中のフォーカスを奪わない）。
  - アクションボタンは最小タップ高さ `min-height: 3rem`（48dp 準拠）を確保する。

```ts
// src/ui/expressive/Snackbar.tsx
export interface SnackbarProps {
  open: boolean;
  message: string;
  actionLabel?: string | undefined;
  actionDisabled?: boolean | undefined;
  onAction?: (() => void) | undefined;
  className?: string | undefined;
}

export function Snackbar(props: SnackbarProps): React.JSX.Element;
```

#### (2) PWA 更新プロンプト（`src/ui/pwa/PwaUpdatePrompt.tsx`）と `src/ui/App.tsx` への組み込み

- **【確定 Q1・Q2】**
  - メッセージ文言: `新しいバージョンがあります`
  - アクションボタン: `更新`（`actionDisabled={updating}`）のみ
  - **閉じるボタンは配置しない**。自動消去は行わず、ユーザーが「更新」を押すか全タブを閉じて再起動するまで表示を維持する。
- `src/ui/App.tsx` で `<AppStateProvider>` の直下に `<AppContent />` と並べて `<PwaUpdatePrompt />` を配置する。これにより全画面（`MainScreen`・`SettingsScreen`・`ScoringTableScreen`・`LicenseScreen`・`HelpScreen`・`EngineScreen`）のどこに居ても更新通知が表示される。dev 専用ギャラリーモード（`?gallery=tiles` / `?gallery=md`）には干渉しない。

```ts
// src/ui/pwa/PwaUpdatePrompt.tsx
export function PwaUpdatePrompt(): React.JSX.Element;
```

### 3.5 変更対象ファイル一覧と変更禁止範囲

| ファイル | 種別 | 変更内容 |
| --- | --- | --- |
| `vite.config.ts` | 変更 | `VitePWA` の `registerType: 'prompt'`、`injectRegister: false`、`workbox.skipWaiting: false`、`workbox.clientsClaim: false` |
| `tsconfig.app.json` | 変更 | `compilerOptions.types` に `"vite-plugin-pwa/react"` を追加 |
| `src/main.tsx` | 変更 | 先頭付近で `installPreloadErrorRecovery()` を呼び出す |
| `src/ui/App.tsx` | 変更 | `<AppStateProvider>` 内に `<PwaUpdatePrompt />` を追加 |
| `src/pwa/preload-recovery.ts` | 新規 | `vite:preloadError` 検知・`sessionStorage` 10 秒クールダウンガード・リロード処理 |
| `src/pwa/preload-recovery.test.ts` | 新規 | `preload-recovery.ts` の単体テスト |
| `src/pwa/use-pwa-update.ts` | 新規 | `useRegisterSW` ラッパー + `visibilitychange` 更新確認 |
| `src/pwa/use-pwa-update.test.ts` | 新規 | `use-pwa-update.ts` の単体テスト |
| `src/pwa/pwa-config.test.ts` | 新規 | `vite.config.ts` の PWA 設定（`prompt` / `injectRegister: false` / `skipWaiting: false` / `clientsClaim: false` / `cleanupOutdatedCaches: true`）の静的検査テスト |
| `src/ui/expressive/Snackbar.tsx` | 新規 | MD3 Expressive 準拠の自作 Snackbar 部品 |
| `src/ui/expressive/snackbar.css` | 新規 | Snackbar 用スタイル（トークンのみ・`z-index: 25`・下端回避・reduced-motion） |
| `src/ui/expressive/Snackbar.test.tsx` | 新規 | Snackbar の描画・アクセシビリティ・操作・CSS トークン規約テスト |
| `src/ui/expressive/index.ts` | 変更 | `Snackbar`, `type SnackbarProps` を export（CSS は import しない） |
| `src/ui/pwa/PwaUpdatePrompt.tsx` | 新規 | `usePwaUpdate` と `Snackbar` を接続するプロンプト部品 |
| `src/ui/pwa/PwaUpdatePrompt.test.tsx` | 新規 | `needRefresh` 表示・更新押下・二重押下防止・閉じるボタン不在のテスト |

**変更禁止範囲**（本 Issue のスコープ外。製造フェーズで触れないこと）:
- `src/core/**`・`src/engine/**`・`wasm/**`
- `src/ui/theme/tokens.css`・`src/ui/theme/static-tokens.css`・`src/ui/theme/status-bar-guard.css`
- `src/ui/screen/main-screen.css`・`src/ui/expressive/bottom-sheet.css`（既存 z-index やレイアウトを変更しない）
- `package.json`・`package-lock.json`（新規依存の追加なし）
- `deploy/cloud-run/nginx.conf`（`registerSW\.js` の記載は残置しても無害）
- `public/**`・`assets-src/**`・`index.html`

## 4. バンドル目標値（業務標準 09号）

- **基準値（`develop/v2.0` = `6a72cfb`）**: **実挙動未確認**
  - 未実測の理由: 本設計作業用 worktree には `node_modules/` が未配置であり、設計フェーズではファイル追加・ビルドを実行できないため。
  - 参考値: `develop/v2.0` の直前ビルド成果物（`assets/index-B-J83b78.js`）は `gzip -9` で **130,179 B**、また Issue #159 設計時の `develop/v2.0`（`4e0ea37`）実測値は **130,183 B**。製造フェーズで `develop/v2.0`（`6a72cfb`）をビルドして基準値を確定実測する。
- **増分の見込み積算**（初回 JS、`gzip -9`）:

| 内訳 | 見込み増分 | 根拠 |
| --- | --- | --- |
| `virtual:pwa-register/react`（`react.js` + `register.js`） | 約 +600〜+1,000 B | `dist/client/build/react.js` 単体の `gzip -9` 実測が 1,002 B（バンドル時の minify・重複圧縮で縮小見込み）。`workbox-window`（2,324 B）は内部で動的 `import()` されるため遅延チャンク分離の見込み |
| `src/pwa/preload-recovery.ts` | 約 +200〜+300 B | `sessionStorage` 読み書きとイベントリスナーのみ |
| `src/pwa/use-pwa-update.ts` + `src/ui/pwa/PwaUpdatePrompt.tsx` | 約 +250〜+350 B | 状態フックと `visibilitychange` 登録 |
| `src/ui/expressive/Snackbar.tsx` | 約 +200〜+300 B | 素の HTML 要素のみ（アイコン不使用・追加依存なし） |
| **合計増分見込み** | **+1,800 B**（上限目安） | 不要な依存・全量 import なし |

- **目標値**: `確定実測した基準値 + 1,800 B`（参考基準値 130,179 B ベースで **約 131,979 B**）。
- `09-bundle-budget-protocol.md` に従い、目標値の超過は検収の不合格条件としない。万一 `workbox-window` が Vite の `modulepreload` 等で初回 JS 合計に入った場合も、原因とともに実測値を PR 本文へ記録する。

## 5. 単体テスト計画（Vitest）

テスト名は `166-T<番号>: <説明>` の形式とする。既存の負荷増（Issue #161）を避けるため、新規テスト内で `vite build` サブプロセスは起動しない（ビルド成果物検査は §6 の受け入れ条件と既存の `src/build-css.test.ts`・`scripts/status-bar-build.test.ts` で行う）。

| 記号 | 対象ファイル | 検証内容 |
| --- | --- | --- |
| 166-T1 | `src/pwa/preload-recovery.test.ts` | 初回 `vite:preloadError` で `sessionStorage` へ現在時刻を保存し、`event.preventDefault()` と `reload()` が 1 回ずつ呼ばれる |
| 166-T2 | `src/pwa/preload-recovery.test.ts` | クールダウン時間（10,000 ms）未満の再発時は `reload()` も `event.preventDefault()` も呼ばれず、無限リロードが抑止される |
| 166-T3 | `src/pwa/preload-recovery.test.ts` | クールダウン時間（10,000 ms）経過後の再発時は再度 `reload()` される |
| 166-T4 | `src/pwa/preload-recovery.test.ts` | `storage` が `null`、または `getItem` / `setItem` が例外を送出する場合、安全側として `reload()` しない |
| 166-T5 | `src/pwa/preload-recovery.test.ts` | `installPreloadErrorRecovery` がリスナーを登録し、返却された解除関数を呼ぶと以後のイベントに反応しない |
| 166-T6 | `src/pwa/use-pwa-update.test.ts` | `attachVisibilityUpdateCheck` は装着直後（`lastCheckAt = now()` から 60,000 ms 未満）の `visible` 復帰では `registration.update()` を呼ばず、60,000 ms 以上経過後の `visible` 復帰で呼ぶ。最小間隔（60,000 ms）内の連続復帰・`hidden`・オフライン時は呼ばない。`update()` が reject しても未処理拒否にならない。解除関数でリスナーが外れる |
| 166-T7 | `src/pwa/use-pwa-update.test.ts` | `usePwaUpdate` が `needRefresh`・`applyUpdate`（`updateServiceWorker(true)` 呼び出しと `updating` 遷移、失敗時の `updating: false` 復帰、および未制御タブ `navigator.serviceWorker.controller === null` 時のフォールバックリロード）を正しく制御する |
| 166-T8 | `src/ui/expressive/Snackbar.test.tsx` | `open={false}` で `role="status"` / `aria-live="polite"` のホストのみ描画され、`open={true}` でメッセージとアクションボタンのみが描画され（閉じるボタンなし）、クリックハンドラと `actionDisabled` が機能する |
| 166-T9 | `src/ui/expressive/Snackbar.test.tsx` | `snackbar.css` の静的検査: `--md-sys-color-inverse-surface`・`--md-sys-color-inverse-on-surface`・`--md-sys-color-inverse-primary`・`--md-sys-motion-spring-`・`--md-sys-shape-corner-`・`z-index: 25`・`prefers-reduced-motion: reduce` を含み、HEX・`rgb(`・`px`・`ms`・`cubic-bezier` の直書きがない |
| 166-T10 | `src/ui/pwa/PwaUpdatePrompt.test.tsx` | `needRefresh: true` で「新しいバージョンがあります」「更新」のみが表示され（閉じるボタンなし）、「更新」押下で `applyUpdate` が呼ばれ、`updating: true` でボタンが無効化される |
| 166-T11 | `src/pwa/pwa-config.test.ts` | `vite.config.ts` ソース（または設定解決結果）において `registerType: 'prompt'`・`injectRegister: false`・`skipWaiting: false`・`clientsClaim: false`・`cleanupOutdatedCaches: true` が設定されていることを検証する |

## 6. 受け入れ条件チェックリスト

前提: 検収担当はコードを修正せず、以下を 1 項目ずつ実行して合否を判定する。ローカル HTTP サーバーを起動した場合は、確認完了後に起動した自分のプロセス PID のみを停止する（`docs/rules/01-dev-workflow-protocol.md` 準拠）。

### 6.1 自動検査・ビルド成果物検証

- **166-AC1（静的検査・単体テスト）**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて終了コード 0 で成功する（既存の `src/build-css.test.ts`・`src/ui/md/md-static.test.ts`・`src/ui/screen/AppHeader.test.tsx`・`scripts/status-bar-build.test.ts` および新規 `166-T1〜T11` を含む）。
- **166-AC2（本番ビルドと `dist/sw.js` 構造）**: `npm run build` が成功し、生成された `dist/sw.js` に対して次をすべて満たす:
  1. `grep -c 'SKIP_WAITING' dist/sw.js` が 1 以上である。
  2. `grep -E 'self\.skipWaiting\(\)' dist/sw.js` が `SKIP_WAITING` メッセージハンドラ内のみに現れ、トップレベル無条件呼び出しでないことを目視確認する。
  3. `grep -c 'clientsClaim' dist/sw.js` が 0 である。
  4. `grep -c 'cleanupOutdatedCaches' dist/sw.js` が 1 以上である。
  5. プリキャッシュ一覧に遅延チャンク（`SettingsScreen-*.js`・`ScoringTableScreen-*.js`・`LicenseScreen-*.js`・`HelpScreen-*.js`・`EngineScreen-*.js`・`HoraDetail-*.js`・`worker-*.js`・`*.wasm`）が含まれる。
- **166-AC3（二重登録防止と CSS 残存）**: `npm run build` 後、次をすべて満たす:
  1. `dist/registerSW.js` が存在しない（`test ! -e dist/registerSW.js` が終了コード 0）。
  2. `grep -c 'registerSW\.js' dist/index.html` が 0 である。
  3. `grep -c 'snackbar-host' dist/assets/*.css` の合計が 1 以上であり、`sideEffects: ["*.css"]` で `snackbar.css` が落ちていない。
- **166-AC4（CSS トークン規約）**: `grep -nE '#[0-9a-fA-F]{3,8}\b|rgb\(|[0-9]px|[0-9]ms|cubic-bezier' src/ui/expressive/snackbar.css` が 0 件である。
- **166-AC5（オフライン回帰確認）**: `npm run build` 後、`npx vite preview --port <空きポート> --strictPort` で `/mj-3player-calc/` を開き、DevTools > Application > Service Workers で SW が `activated` になったことを確認してからページを 1 回再読み込みして SW 制御下にし、Network を Offline に切り替えて再読み込みしても画面が表示され手牌入力→結果表示まで動作する。

### 6.2 E2E 更新シナリオ検証（旧版を開いたまま更新＋未訪問画面遷移＋フォールバック）

リポジトリ外の `/tmp/mj3-i166-test/` に 2 つの配信版（v1・v2）を用意し、変更禁止制約を守ったままローカル HTTP サーバー（`sw.js`・`index.html` に `Cache-Control: no-cache` を付与し、存在しないファイルには 404 を返す）で配信して次を確認する。

> v1 / v2 の準備手順（リポジトリ内のファイルは編集しない）:
> 1. `npm run build` の結果 `dist/` を `/tmp/mj3-i166-test/v1/` と `/tmp/mj3-i166-test/v2/` の 2 箇所へコピーする。
> 2. `/tmp/mj3-i166-test/v2/` 側のみ、次を行う:
>    - (a) `assets/HelpScreen-<旧ハッシュ>.js` を `assets/HelpScreen-v2test.js` に、`assets/index-<旧ハッシュ>.js` を `assets/index-v2test.js` にそれぞれリネームする。
>    - (b) `v2/assets/index-v2test.js` と `v2/sw.js` 内の旧 `HelpScreen-<旧ハッシュ>.js` 参照文字列を `HelpScreen-v2test.js` へ置換し、`v2/index.html` と `v2/sw.js` 内の旧 `index-<旧ハッシュ>.js` 参照文字列を `index-v2test.js` へ置換する。
>    - (c) `v2/sw.js` 内の `index.html` プリキャッシュエントリの `revision` 値も別値（例: `"v2test"`）へ置換し、`v2/sw.js` 末尾に `/* v2 */` を追記してバイト差分を作る（これにより、v2 配信時に v1 の `HelpScreen` チャンクはサーバー上から消失してネットワーク要求が 404 となり、かつ SW v2 切替後は Workbox プリキャッシュが新 `index.html`・新 `index-v2test.js`・新 `HelpScreen-v2test.js` を正しく取得・配信する）。
> 3. `/tmp/mj3-i166-test/serve/mj-3player-calc` を `v1` へのシンボリックリンク（またはコピー）として空きポートで配信する。

- **166-AC6（シナリオ A: 待機型 SW・未訪問遅延画面の 404 回避・ユーザー更新）**:
  1. ブラウザの新しいプロファイルまたはシークレットウィンドウで `/mj-3player-calc/`（v1）を開き、SW v1 が `activated` になった後 1 回リロードして `navigator.serviceWorker.controller !== null` であることを DevTools Console で確認する。この時点ではヘルプ画面を開かない。
  2. 配信先を `v2` に切り替える（v1 の `HelpScreen-<旧ハッシュ>.js` は 404 を返す状態）。
  3. タブを一旦非表示→ 60 秒経過後に再表示（または DevTools Console で `(await navigator.serviceWorker.getRegistration()).update()` を実行）し、更新チェックを発火させる。
  4. **合格基準 1**: DevTools > Application > Service Workers で SW v2 が `waiting`（待機中）にとどまり、SW v1 が引き続きアクティブ制御していること。
  5. **合格基準 2**: 画面下部にスナックバー「新しいバージョンがあります」と「更新」ボタンのみが表示され（閉じるボタンなし）、15 秒以上放置しても自動消去されないこと。ライト・ダーク双方で文字・ボタンが判読でき、幅 375px で `BottomSheet` や `ResultBanner` 表示時にも重ならないこと。
  6. **合格基準 3**: 「更新」を押さずにメニュー → ヘルプ（未訪問の遅延チャンク）へ遷移し、Console / Network に 404 やエラーが一切出ずにヘルプ画面が表示されること（画面遷移後もスナックバーは表示を維持すること）。
  7. **合格基準 4**: スナックバーの「更新」ボタンを押すとページが自動リロードされ、SW v2 が `activated` かつ制御中となり、スナックバーが消え、ヘルプ画面（`HelpScreen-v2test.js`）が正常に表示されること。
- **166-AC7（シナリオ B: 「更新」を押さない継続利用と全タブ終了後の切替）**:
  1. 166-AC6 の手順 1〜5 で SW v2 を `waiting` 状態にし、スナックバーが表示されたまま「更新」を押さずに操作を続ける。
  2. **合格基準 1**: スナックバーは自動消去されず表示を維持したまま、引き続き v1 上で未訪問の遅延画面（例: 設定・ライセンス）へエラーなく遷移できること。
  3. 当該オリジンの全タブを完全に閉じた後、新しいタブで `/mj-3player-calc/` を開く。
  4. **合格基準 2**: SW v2 が `activated` かつ制御中になっており、更新スナックバーが表示されないこと。
- **166-AC8（シナリオ C: `vite:preloadError` 自動リロードと無限リロード防止ガード）**:
  1. DevTools > Application > Service Workers で **`Bypass for network`** を有効化（既存 SW があれば登録解除して SW が介在しない状態にする）したタブで v1 の `/mj-3player-calc/` を開き、ヘルプ画面を開かずに配信先を `v2` へ切り替える（v1 の `HelpScreen-<旧ハッシュ>.js` は 404）。
  2. メニュー → ヘルプへ遷移する。
  3. **合格基準 1**: `vite:preloadError` を契機にページが自動リロードされ、`sessionStorage.getItem('mj3calc:preload-reload-at')` に数値タイムスタンプが記録されており、リロード後は v2（`index-v2test.js`・`HelpScreen-v2test.js`）として動作しヘルプ画面が正常に表示されること。
  4. リロード直後（10 秒以内）に、DevTools Console から `const e = new Event('vite:preloadError', { cancelable: true }); window.dispatchEvent(e); e.defaultPrevented` を実行する。
  5. **合格基準 2**: ページがリロードされず、戻り値が `false`（ガードにより抑止）であること（確認後、`Bypass for network` は解除する）。
- **166-AC9（バンドル目標値の実測記録・09号）**:
  1. `develop/v2.0`（`6a72cfb`）と実装ブランチの双方で `npm run build` を実行し、`dist/index.html` の `<script type="module" src>` および `<link rel="modulepreload" href>` が指す JS の `gzip -9 -c <file> | wc -c` 合計を実測する。
  2. 基準値・実測値・増分・積算増分（+1,800 B）との差・超過時の原因を PR 本文に記載する（超過は不合格条件としない）。
- **166-AC10（変更範囲・絶対パス禁止）**:
  1. `git diff --stat develop/v2.0...HEAD` に §3.5 の変更禁止ファイルが含まれない。
  2. `git diff develop/v2.0 --name-only` の全変更ファイルに対し、ホームディレクトリ名を含む絶対パス文字列が残っていないことを `grep` で確認し 0 件（本設計書内のコマンド説明に絶対パスを書かないこと）。

### 6.3 UI 監修および実機確認の扱い（【確定 Q5】）

- **UI 監修**: モックのみで実施し、実機での UI 監修は省略可とする（オーナー確定）。
- **実機確認（検収の合否には含めない。PR 本文に「未確認」と記載）**:
  - Android Chrome（通常タブおよびインストール済み PWA）で、旧版を開いたまま新版デプロイ後に更新スナックバーが表示され、未訪問画面遷移→「更新」タップで新版に切り替わること。
  - iOS Safari（通常タブおよびホーム画面追加 PWA）で、バックグラウンド復帰時に更新が検知され、スナックバー表示位置がホームバー（`safe-area-inset-bottom`）・ボトムシートと干渉しないこと。

## 7. ユーザー判断事項（すべて【確定】）

| Q | 論点 | 確定内容 |
| --- | --- | --- |
| Q1 | 更新スナックバーの文言・閉じる操作 | 本文「新しいバージョンがあります」、アクションボタン「更新」のみ。閉じるボタンなし |
| Q2 | 表示位置・自動消去の有無 | 画面下部固定（`BottomSheet`・`ResultBanner` 表示時はその上に回避）、自動消去なし |
| Q3 | 前面復帰時の更新チェック | タブ・PWA 前面復帰時（`visibilitychange`、最短 60 秒間隔・オンライン時のみ）に `registration.update()` を呼ぶ |
| Q4 | `vite:preloadError` 無限リロード防止ガード方式 | `sessionStorage` による 10 秒クールダウン方式 |
| Q5 | UI 監修の要否 | モックのみで実施し、実機監修は省略可 |

未決事項なし。

## 8. 後続Issueへの引き継ぎ事項

- **初回 JS 基準値の更新（09号 必須事項 8）**: 本 Issue マージ後、`docs/rules/09-bundle-budget-protocol.md` の現在基準値を本 Issue の実測値へ更新する。
- **Web Worker 内の遅延読み込み失敗**: `src/engine/worker.ts` 内の `import('./compute')` は Vite の `vite:preloadError` 対象外である。主対策（待機型 SW）により制御下タブでは保護されるが、未制御タブでの Worker 404 自動リロード復帰が必要になった場合は別 Issue で検討する。
- **Cloud Run nginx 設定の整理**: `deploy/cloud-run/nginx.conf:38` の `registerSW\.js` は残置しても無害だが、将来設定を整理する際に削除してよい。
- **`Snackbar` の拡張・`offlineReady` 通知**: 将来スナックバーへ「閉じる」ボタンや初回オフライン準備完了通知が必要になった場合は、`SnackbarProps`（例: `onDismiss`）および既存の `useRegisterSW` の `offlineReady` を拡張して利用できる。

## 9. 実挙動未確認の箇所

本設計フェーズでは以下について **実挙動未確認** である。

1. `develop/v2.0`（`6a72cfb`）時点での新規 `npm run build` による初回 JS 基準値（作業用 worktree に `node_modules/` 未配置かつ設計フェーズはコード・依存変更禁止のため未実測）。
2. `registerType: 'prompt'` + `injectRegister: false` + `virtual:pwa-register/react` 導入後の本番ビルド成果物（`dist/sw.js` の最終出力、`workbox-window` が遅延チャンクに分離されて初回 JS 合計から除外されるか、および初回 JS の実測増分）。
3. ブラウザ（Desktop Chrome / Android Chrome / iOS Safari）での SW 待機→未訪問遅延画面遷移→「更新」押下リロード、`visibilitychange` での更新検知、および `vite:preloadError` 自動リロードの実挙動。
4. 幅 375px・ライト/ダーク両テーマ・`BottomSheet` / `ResultBanner` 表示中における `Snackbar` の実画面レイアウトおよび操作性。
