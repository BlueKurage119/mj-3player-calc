# Issue #123 設計書: Cloud Run へのプレビュー配布環境構築

- 対象 Issue: #123（検証・デバッグ用に、Google Cloud の Cloud Run へアプリを配布する）
- 基準コミット: `main` `62db1bb`（2026-11-18 時点）
- 状態: **設計確定**（Q1〜Q3 のユーザー回答をすべて反映済み。未決事項なし）
- 注記: 環境固有識別子は公開リポジトリ整理のためプレースホルダ表記へ置換済み（Issue #152）

## 1. 目的と範囲

### 1.1 目的

本番環境（GitHub Pages: `https://bluekurage119.github.io/mj-3player-calc/`）とは別に、検証・デバッグおよびスマートフォン実機確認用のプレビュー環境を Google Cloud Run（東京リージョン `asia-northeast1`）へ配布する仕組みを一式構築する。

### 1.2 範囲内

- GitHub Actions ワークフロー（`.github/workflows/preview-cloud-run.yml`）の新設
- Cloud Run 用コンテナ構成（`deploy/cloud-run/Dockerfile`・`deploy/cloud-run/nginx.conf`・`deploy/cloud-run/robots.txt`・`.dockerignore`）
- クォータリーカラー（山吹色系、4 ロール）の `scripts/gen-theme-tokens.ts` への追加と `npm run gen:theme` による `src/ui/theme/tokens.css` 再生成、`src/ui/theme/tokens.test.ts` の更新、および `docs/rules/06-ui-md3-protocol.md`（§テーマ 1・2）の改訂
- ビルドターゲット（GitHub Pages 本番 / Cloud Run プレビュー）に応じたベースパス・PWA 設定・共有 URL / QR コード・プレビュー識別 UI（全 5 画面のヘッダー上部ライン・ヘッダー文字色、メイン画面の「プレビュー」ピルバッジ、ステータスバー `meta theme-color`）・`<html data-os-theme>` の OS テーマ常時追随（`src/ui/theme/apply-theme.ts`）の実装とテスト
- `docs/development.md` へのプレビューデプロイ案内追記
- オーナー向け GCP 設定・運用手順書（§9）

### 1.3 範囲外（設計・製造・検収で実施しない事項）

- 既存の本番 CI / GitHub Pages ワークフロー（`.github/workflows/ci.yml`・`.github/workflows/deploy.yml`）の変更および本番挙動の変更
- GCP 側リソース（API 有効化、Artifact Registry、サービスアカウント、Workload Identity Pool/Provider、Cloud Run サービス）の実作成、および GitHub Secrets / Variables の実登録（受入検査における別モデルコードレビュー完了後にオーナーが §9 に従って実施する）
- Cloud Run への実デプロイ動作の確認（検収ではローカルビルド・ローカル Docker コンテナ起動・HTTP 応答検査・YAML 構文検証までを実施し、実デプロイ以降は「実挙動未確認」として §9 に明記する）

## 2. 参照資料と設計判断の根拠

### 2.1 ヒアリング確定事項（すべて確定・再検討しない）

| # | 確定事項 | 本設計での反映 |
| --- | --- | --- |
| H1 | **完了範囲**: 調査・設計書だけでなく、ワークフロー・コンテナ構成・ビルド/UI 対応・オーナー向け GCP 設定手順書まで一式を製造・検収できる設計とする | §3〜§9 |
| H2 | **トリガー・対象・後始末**: `push`（`main`、PR マージ時）で自動デプロイ ＋ `workflow_dispatch`（手動で任意ブランチ/ref を指定してトリガー）。単一 Cloud Run サービスに常に上書きデプロイする（複数プレビューの同時共存やリビジョンタグ分離は不要） | §5.1・§5.2 |
| H3 | **公開範囲**: 認証なし（`--allow-unauthenticated`）＋ 検索避け（`X-Robots-Tag: noindex, nofollow` レスポンスヘッダ + `robots.txt` 等）。※最小権限化のため公開設定はオーナーによる初回サービス作成時に付与し、通常 CI からは設定を上書きせず保持する | §3.2・§4.3・§5.2・§9.2 |
| H4 | **ベースパス**: Cloud Run 用ビルドではルート `/` ベースにする（本番 GitHub Pages の `/mj-3player-calc/` は維持）。`VitePWA` の `start_url`・`scope` もベースパスに合わせる | §3.1・§3.2 |
| H5 | **リージョン・クリーンアップ**: 東京リージョン（`asia-northeast1`）。不要イメージ・リビジョンの自動削除（Artifact Registry Cleanup Policy 等の必須化）は当面不要で手動削除とする（手順書に手動確認・削除の案内を記載） | §5.2・§9.6 |
| H6 | **認証方式・GCP 環境・検収範囲**: GitHub Actions からの認証は Workload Identity Federation（OIDC、SA 鍵 JSON 不使用）。対象 GCP プロジェクトは `<GCP_PROJECT_ID>`（プロジェクト番号: `<GCP_PROJECT_NUMBER>`、実測確認済み）。GCP 構築および GitHub Secrets/Variables 登録は別モデルコードレビュー完了後にオーナーが実施するため、検収では実デプロイを行わずローカル検証とする | §5・§8・§9 |
| Q1-a | **ヘッダー識別表現（UI 監修確定）**: 全 5 画面のヘッダー背景は通常の `surface` を維持したまま、ヘッダー上端に `0.25rem` のアクセントライン（OS テーマ追随の `--preview-os-quaternary`）とヘッダー文字色（`quaternary`）を適用し、メイン画面（`AppHeader`）のタイトル横に「プレビュー」ピルバッジを表示する | §3.5 |
| Q1-b | **識別色（クォータリーカラー確定）**: シード `#1B5E20` の HCT 色相を赤側に 60° 下げ・クロマ `24.0` とした山吹色系をクォータリーカラー（4 ロール）として `scripts/gen-theme-tokens.ts` に追加し `tokens.css` へ生成する。UI 監修の結果、山吹色（`quaternary`: ライト `#715b2e` / ダーク `#dfc38c`、バッジ文字 `on-quaternary`）で確定したため比較用切替機構は削除する | §3.4・§3.5 |
| Q1-c | **メタデータ・OS テーマ連動**: ステータスバー（`meta name="theme-color"` のライト/ダーク）のみ識別色 `quaternary`（`#715b2e` / `#dfc38c`）に連動させ、ヘッダー上部ラインを `<html data-os-theme>` 経由で OS テーマに追随させてステータスバーと一体化する。`<title>`・`manifest.name`・`manifest.short_name`・`manifest.theme_color` は本番のまま維持する | §3.1・§3.5 |
| Q2 | **共有用 URL・QR コード**: 確定 URL は `https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/`（`-preview` なし）。QR コードと共有テキスト内の URL のみこのベース URL に差し替える（`CLOUDRUN_SHARE_URL` での上書き余地は維持） | §3.3・§5.2 |
| Q3 | **サービス名・リポジトリ・ガード不要**: Cloud Run サービス名既定値は `mj-3player-calc`、Artifact Registry リポジトリ既定値は既存共用の `<GAR_REPOSITORY>`。`CLOUDRUN_PREVIEW_ENABLED` のようなガード条件は設けず、最初から `push`（`main`）および `workflow_dispatch` で実行する | §5.2・§5.3・§9 |

### 2.2 実物調査と実測結果（`main` `62db1bb`、2026-11-18）

| 調査対象 | 実測・確認した事実 | 設計への帰結 |
| --- | --- | --- |
| `vite.config.ts` | `base: '/mj-3player-calc/'` 固定。`define: { __APP_VERSION__: JSON.stringify(appVersion) }` を使用。`injectThemeColorPlugin` が `tokens.css` のライト・ダーク `surface` 値を `index.html` の `%THEME_COLOR_LIGHT%`・`%THEME_COLOR_DARK%` に注入。`VitePWA` は `start_url`・`scope` とも `/mj-3player-calc/`、`workbox.globPatterns` は `['**/*.{js,css,html,wasm,svg,png}']` | 既存の `__APP_VERSION__` と同じ `define` + `transformIndexHtml` の仕組みでビルド時切り替えを統一できる。本番を既定値にすれば `deploy.yml`・`ci.yml`・`npm test` へ影響しない |
| `tsconfig.node.json` | `@tsconfig/strictest/tsconfig.json` を継承し、`files` に `./vite.config.ts` と `./scripts/*.ts` を明示列挙している。`noPropertyAccessFromIndexSignature` が有効（`scripts/gen-theme-tokens.ts` は `process.env[...]` を使用） | `scripts/build-config.ts` を追加する場合は `tsconfig.node.json` の `files` に追加し、環境変数は `process.env['...']` 形式で参照する |
| `scripts/gen-theme-tokens.ts`・`src/ui/theme/tokens.test.ts` | `COLOR_ROLES` は 49 役割（`error` 系は fixed なしの 4 ロール、`primary`/`secondary`/`tertiary` は各 8〜9 ロール）。`tokens.test.ts`（`C1-K03`）が 49 役割の配列一致と `.length === 49` を厳密に検査している | クォータリーカラーは MD3 カスタムカラー標準および `error` 系と整合する 4 ロール（`quaternary`・`onQuaternary`・`quaternaryContainer`・`onQuaternaryContainer`）とし、`tokens.test.ts` の期待配列（53 役割）も同時に更新する |
| `scripts/theme-colors.test.ts` | `@material/material-color-utilities` が拡張子省略 ESM で Vitest が直接解決できないため、`vi.mock('@material/material-color-utilities', () => ({}))` でモックしたうえで `gen-theme-tokens.ts` を import している | `DynamicScheme`・`Variant`・`TonalPalette`・`MaterialDynamicColors` へのアクセスは必ず `generateTokensCss()` 等の関数内で行い、モジュールトップレベルで参照しない |
| クォータリー色 HEX 実測（`vite-node`） | `#1B5E20` の `seedHct.hue` は `145.5162316490231`、`(seedHct.hue - 60 + 360) % 360` は `85.5162316490231`、`chroma = 24.0`。`DynamicScheme(Variant.TONAL_SPOT, contrastLevel: 0, specVersion: '2021', tertiaryPalette)` での実測値（§3.4 詳述）: ライト `quaternary=#715b2e`, `onQuaternary=#ffffff`, `quaternaryContainer=#fddfa6`, `onQuaternaryContainer=#574419` / ダーク `quaternary=#dfc38c`, `onQuaternary=#3f2e04`, `quaternaryContainer=#574419`, `onQuaternaryContainer=#fddfa6` | 山吹色系の明瞭なアクセント色が得られ、ライト・ダーク双方で十分なコントラストが確保される |
| `src/ui/share/share-config.ts` | `export const SHARE_URL: string | null = 'https://bluekurage119.github.io/mj-3player-calc/';` | `define` による `__SHARE_URL__` 置換とフォールバック定数で切り替え可能。`npm test` 時は本番値が使われ既存テストと両立する |
| `share-layout.ts` / `share-theme.ts` / `uqr` | フッターの URL 最大幅 `760px`、`qrSize: 168`、`qrQuietZone: 4`、`qrMinModulePx: 3`。`node -e` で確定 URL `https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/`（61 文字）を実測したところ、ECC `M` で `size: 33`・`modulePx: 4`（本番 URL と同じサイズ・モジュール幅）になる | 確定 URL でも既存の QR 描画仕様・フッターレイアウトに完全に収まる |
| ヘッダー構成（全 5 画面） | `MainScreen` は `AppHeader`（`<header className="app-header"><div className="app-header__inner"><h1 ...>` + `<div className="app-header__actions">` で `justify-content: space-between`）、他 4 画面は `<header className="app-header">` を描画し、全 5 画面が `src/ui/screen/main-screen.css` を import。`AppHeader.test.tsx`（`F1-2-12`）は `<md-menu>` 内部のみを検証 | `:root[data-app-env="preview"] .app-header` で全 5 画面のヘッダー上部ライン・文字色を一括変更し、`AppHeader` に `margin-inline-end: auto` 付きの「プレビュー」ピルバッジを置けば本番 DOM・`F1-2-12`・`space-between` 配置のすべてと両立する |
| `public/` と `sw.js` | `public/` 配下はすべて `dist/` にコピーされ precache 対象になる | `robots.txt` は `public/` に置かず `deploy/cloud-run/robots.txt` としてコンテナ側のみに配置する |
| 初回 JS 実測（09 号） | `main` `62db1bb` で `npm run build` を実行し、`dist/assets/index-Cpk8wRUr.js`（`modulepreload` なし）を `gzip -9 -c` で実測したところ **128,880 B**（生サイズ 478,339 B、09 号記載の v1.0.0 値 128,883 B と 3 B 差） | 設計基準値 128,880 B に対し、本番ビルドの増分は +0 B に抑える |
| 認証・リポジトリ | `git remote -v` は `BlueKurage119/mj-3player-calc`。ローカルに `docker`・`ruby`・`node`・`npm` が存在 | WIF の `attribute-condition` で `BlueKurage119/mj-3player-calc` に限定する |
| `<GCP_PROJECT_ID>` 実環境・過去案件 | `gcloud run services list` で既存の Cloud Run 4 サービスすべてが `https://<service>-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app` の確定 URL 形式で稼働中。`asia-northeast1` に既存 Artifact Registry リポジトリ `<GAR_REPOSITORY>`（DOCKER、約 184.39 MB）が存在し、既存他サービスが共用。既存サービス用の WIF Pool が複数存在し、過去案件方針として「既存サービス・既存 WIF provider の条件・IAM は変更しない」「通常 CI にプロジェクト全体の管理権限を付与しない」を採用。両案件とも CI は `google-github-actions/auth` + `setup-gcloud` + `gcloud auth configure-docker` + `docker build/push` + `gcloud run deploy`（`--allow-unauthenticated` なし、既存サービスの IAM ポリシー保持）を使用し、サービス単位の `roles/run.developer`・対象 AR の `roles/artifactregistry.writer`・ランタイム SA への `roles/iam.serviceAccountUser` のみを付与している | 確定 URL 形式の実環境動作を確認。既存 `<GAR_REPOSITORY>` を共用し、既存 WIF Pool や既存サービスには触れず専用 WIF Pool（`<WIF_POOL>`）・専用ランタイム SA（`<RUNTIME_SA_NAME>`）・専用デプロイ SA（`<DEPLOYER_SA_NAME>`）を新設する。オーナーが初回サービスを `--allow-unauthenticated` で先行作成し、CI には最小権限のみ付与して `setup-gcloud` + `gcloud run deploy` 方式に揃える |
| Actions・Docker タグ確認 | Web 検索により `google-github-actions/auth@v3`、`google-github-actions/setup-gcloud@v3`、`nginx/nginx-unprivileged:stable-alpine`（`nginx/` 名前空間。`1.28-alpine` タグは存在せず、検収で判明したため `stable-alpine` へ訂正）がいずれも GitHub 公式リポジトリ・公開レジストリに存在することを確認済み | §4・§5 で上記バージョンを指定する（ただし GitHub Actions 上での実実行は「実挙動未確認」） |

### 2.3 参照した業務標準・設計書

- 業務標準: `docs/rules/02-design-protocol.md`、`06-ui-md3-protocol.md`、`09-bundle-budget-protocol.md`
- 指導文書: `docs/rules/advisory/G-01-hearing-first-design.md`、`G-04-verification-basics.md`、`G-10-design-consistency-pitfalls.md`
- 関連設計書: `docs/design/issue-108-pwa.md`、`issue-109-pages-deploy.md`、`issue-110-v1-release.md`

## 3. システム構成とビルド・テーマ・UI 設計

### 3.1 ビルド設定の切り替え機構（`scripts/build-config.ts` / `vite.config.ts`）

環境変数未指定時（ローカル開発・`npm test`・`.github/workflows/deploy.yml`）は完全に現在の本番設定（GitHub Pages）と同一の値を返し、プレビュービルド時のみ環境変数で切り替える。

#### 入力環境変数

| 変数名 | 既定値（未設定時） | プレビュービルド時の指定例 | 役割 |
| --- | --- | --- | --- |
| `VITE_APP_ENV` | `'production'` | `'preview'` | ビルド種別の切り替え。`'preview'` のとき `base: '/'`、識別ヘッダー・バッジ・`meta theme-color` 連動を有効化 |
| `VITE_SHARE_URL` | `'https://bluekurage119.github.io/mj-3player-calc/'` | `'https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/'` | `SHARE_URL` に注入する公開 URL |

#### 具体的な型・シグネチャ（`scripts/build-config.ts` 新規作成）

`vite.config.ts` から設定解決ロジックを分離し、Vitest で単体テスト可能にする。`tsconfig.node.json` の `files` に `./scripts/build-config.ts` を追加すること。

```ts
export type AppBuildEnv = 'production' | 'preview';
export type StatusBarColorRole = 'surface' | 'quaternary';

export interface ResolvedBuildConfig {
  appEnv: AppBuildEnv;
  isPreview: boolean;
  base: '/' | '/mj-3player-calc/';
  shareUrl: string;
  statusBarColorRole: StatusBarColorRole;
}

export const PRODUCTION_BASE = '/mj-3player-calc/';
export const PREVIEW_BASE = '/';
export const PRODUCTION_SHARE_URL =
  'https://bluekurage119.github.io/mj-3player-calc/';

export function resolveBuildConfig(
  env: Readonly<Record<string, string | undefined>>
): ResolvedBuildConfig;
```

- `resolveBuildConfig(process.env)` の仕様:
  - `VITE_APP_ENV`: 未設定・空文字・`'production'` → `appEnv = 'production'`, `isPreview = false`, `base = '/mj-3player-calc/'`。`'preview'` → `appEnv = 'preview'`, `isPreview = true`, `base = '/'`。それ以外の値なら例外を投げる。
  - `statusBarColorRole`: `isPreview` が `false` なら `'surface'`、`true` なら `'quaternary'`（Q1-c: ステータスバーのみ識別色に連動し、ヘッダー上部ラインと同色の `#715b2e` / `#dfc38c` とする）。
  - `shareUrl`: `env['VITE_SHARE_URL']` に非空文字列があればその値（`https://` で始まらない場合は例外を投げる）、未設定時は `PRODUCTION_SHARE_URL`（ワークフローおよびローカルのプレビュービルド確認時は `VITE_SHARE_URL` を明示指定する）。
  - `<title>`・`manifest.name`・`manifest.short_name`・`manifest.theme_color`（ライト `surface`）・`manifest.background_color`（ライト `surface`）は、Q1-c に従い本番・プレビューとも現行のまま変更しない。

#### グローバル定数の注入と型宣言（`src/build-env.d.ts`）

`vite.config.ts` の `define` に以下を設定する（既存の `__APP_VERSION__` と同じ方式）:

```ts
define: {
  __APP_VERSION__: JSON.stringify(appVersion),
  __IS_PREVIEW__: JSON.stringify(buildConfig.isPreview),
  __SHARE_URL__: JSON.stringify(buildConfig.shareUrl)
}
```

新規ファイル `src/build-env.d.ts`:

```ts
/** ビルド時に vite.config.ts の define で注入するプレビュー判定フラグ */
declare const __IS_PREVIEW__: boolean;
/** ビルド時に vite.config.ts の define で注入する共有用 URL */
declare const __SHARE_URL__: string;
```

※ 将来 `vitest.config.ts` が分離されても壊れないよう、参照側では `typeof __IS_PREVIEW__ !== 'undefined' && __IS_PREVIEW__` および `typeof __SHARE_URL__ !== 'undefined' ? __SHARE_URL__ : DEFAULT_SHARE_URL` のガードを置く。

### 3.2 `VitePWA`・`base`・`robots.txt` と Service Worker の挙動

- `vite.config.ts` の `base`、`VitePWA({ manifest: { start_url, scope } })` にすべて `buildConfig.base` を渡す。
  - 本番（`base: '/mj-3player-calc/'`）: `start_url: '/mj-3player-calc/'`、`scope: '/mj-3player-calc/'`、`registerSW.js` は `navigator.serviceWorker.register('/mj-3player-calc/sw.js', { scope: '/mj-3player-calc/' })`。
  - プレビュー（`base: '/'`）: `start_url: '/'`、`scope: '/'`、`registerSW.js` は `navigator.serviceWorker.register('/sw.js', { scope: '/' })`。
  - 注意: `VitePWA` の `manifest.theme_color` および `manifest.background_color` は本番どおりライトの `--md-sys-color-surface` 固定値（`readStatusBarColors(tokensCss, 'surface').light`）を維持する（Q1-c）。
- `index.html` の `/favicon.svg` と `/icons/apple-touch-icon-180.png` は Vite が自動で `base` を先頭付与するため、プレビュー時は `/favicon.svg`・`/icons/apple-touch-icon-180.png` に解決される。
- `workbox.navigateFallbackDenylist`:
  - `buildConfig.isPreview` が `true` のとき `navigateFallbackDenylist: [/^\/robots\.txt$/]` を `workbox` オプションに設定する。これによりブラウザで `/robots.txt` を直接開いても Service Worker が `index.html` へフォールバックせず nginx の `/robots.txt` が返る。本番ビルドでは従来どおり未指定。
- `robots.txt` の配置場所:
  - `public/robots.txt` には**置かない**（本番 Pages への混入および precache 登録を防ぐため）。Cloud Run コンテナ側（`deploy/cloud-run/robots.txt`）のみに配置する。

### 3.3 共有用 URL・QR コードの差し替え（Q2 確定）

`src/ui/share/share-config.ts` の `SHARE_URL` をビルド時定数へ接続する:

```ts
const DEFAULT_SHARE_URL = 'https://bluekurage119.github.io/mj-3player-calc/';

export const SHARE_URL: string | null =
  typeof __SHARE_URL__ !== 'undefined' ? __SHARE_URL__ : DEFAULT_SHARE_URL;
```

- Cloud Run プレビュー時の `VITE_SHARE_URL` 既定値は確定 URL `https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/`（ワークフロー内で `https://${SERVICE}-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/` として組み立て、GitHub Variable `CLOUDRUN_SHARE_URL` が設定されていればそちらで上書きする）。
- これにより、共有画像フッターの QR コード・URL ラベルおよび `navigator.share` テキスト内の URL のみがベース URL としてプレビュー URL へ差し替わる。
- QR 実測（§2.2）のとおり、61 文字の確定 URL は既存の `uqr` ECC `M`（33×33、4px/module）およびフッターテキスト最大幅 `760px` に余裕をもって収まる。

### 3.4 クォータリーカラー（山吹色系）の追加（Q1-b 確定）

#### 生成仕様（`scripts/gen-theme-tokens.ts`）

- 既存シード色 `SEED = '#1B5E20'`（HCT 色相 `145.5162316490231`）に対し、赤側へ 60° 下げた色相 `quaternaryHue = (seedHct.hue - 60 + 360) % 360`（`85.5162316490231`）、クロマ値 `24.0` を設定する。
- `@material/material-color-utilities` の `DynamicScheme` を使用し、ライト（`isDark: false`）・ダーク（`isDark: true`）それぞれのクォータリー用スキームを生成する（`primaryPalette` 等は `DynamicScheme` コンストラクタで省略時自動解決される）:
  ```ts
  const quaternaryHue = (hct.hue - 60 + 360) % 360;
  const quaternaryScheme = new DynamicScheme({
    sourceColorHct: hct,
    variant: Variant.TONAL_SPOT,
    contrastLevel: CONTRAST_LEVEL,
    isDark,
    specVersion: SPEC_VERSION,
    tertiaryPalette: TonalPalette.fromHueAndChroma(quaternaryHue, 24.0)
  });
  ```
- 現行の `COLOR_ROLES`（49 役割）は `MaterialDynamicColors[role]` で直接参照しているため、`quaternary` 等をそのまま足すと型・実行時エラーになる。そこで、`COLOR_ROLES`（既存 49 役割、または `STANDARD_COLOR_ROLES`）とは別にクォータリー対応表 `QUATERNARY_ROLES` を用意し、出力ループ上で `onTertiaryContainer` の直後（`error` の直前）に 4 ロールを出力する構成とする（出力の合計は 53 ロール、かつ `tokens.css` の既存 49 ロールの並び順を維持）:
  ```ts
  const QUATERNARY_ROLES = [
    { role: 'quaternary', source: 'tertiary' },
    { role: 'onQuaternary', source: 'onTertiary' },
    { role: 'quaternaryContainer', source: 'tertiaryContainer' },
    { role: 'onQuaternaryContainer', source: 'onTertiaryContainer' }
  ] as const;
  ```
  - 出力順の具体実装例: ライト・ダーク各ブロックの生成ループで `COLOR_ROLES` を走査し、`role === 'onTertiaryContainer'` を出力した直後に `QUATERNARY_ROLES` の 4 行（`MaterialDynamicColors[entry.source].getArgb(quaternaryScheme)`）を挿入して出力する（または 53 役割の出力順リストと `QUATERNARY_SOURCE_MAP` を用いて 1 ループで解決する）。
- **重要（`scripts/theme-colors.test.ts` との整合）**: `scripts/theme-colors.test.ts` は `vi.mock('@material/material-color-utilities', () => ({}))` のモック下で `gen-theme-tokens.ts` から `SEED` を import する。したがって `DynamicScheme`・`Variant`・`TonalPalette`・`MaterialDynamicColors` へのアクセスはすべて `generateTokensCss()` 等の関数内部で行い、モジュールトップレベルでプロパティ評価を行わないこと。

#### 実測生成値（`vite-node` で `@material/material-color-utilities` 0.4.0 を実行して確認済み）

| トークン名 | ライト（`:root`） | ダーク（`:root[data-theme="dark"]`） | 用途 |
| --- | --- | --- | --- |
| `--md-sys-color-quaternary` | `#715b2e` | `#dfc38c` | ステータスバー・ヘッダー上部ライン・ヘッダー文字・ピルバッジ背景 |
| `--md-sys-color-on-quaternary` | `#ffffff` | `#3f2e04` | ピルバッジ文字 |
| `--md-sys-color-quaternary-container` | `#fddfa6` | `#574419` | クォータリー系の汎用コンテナ色（4 ロール標準生成） |
| `--md-sys-color-on-quaternary-container` | `#574419` | `#fddfa6` | クォータリー系の汎用コンテナ文字色（4 ロール標準生成） |

#### `src/ui/theme/tokens.test.ts` の更新

- `EXPECTED_COLOR_ROLES` の `'on-tertiary-container'` と `'error'` の間に `'quaternary'`, `'on-quaternary'`, `'quaternary-container'`, `'on-quaternary-container'` を追加する（計 53 役割）。
- `C1-K03` のテスト説明文を「49 役割」から「53 役割」へ更新し、個数アサーションを `49` → `53` に更新する。
- `C1-K01`（セレクタは `:root` と `:root[data-theme="dark"]` の 2 つのみ）を維持し、セレクタを増やさないこと。
- `npm run gen:theme` で `src/ui/theme/tokens.css` を再生成してコミットし、`npm run check:theme` が成功することを確認する。

### 3.5 ヘッダー識別 UI・OS テーマ連動・ステータスバー連動（Q1-a / Q1-b / Q1-c 確定）

1. **`index.html` 変換とステータスバー・OS テーマ連動（`vite.config.ts` / `scripts/theme-colors.ts` / `src/ui/theme/apply-theme.ts`）**:
   - `scripts/theme-colors.ts` の `readStatusBarColors` にデフォルト引数 `role = 'surface'` を追加する（Biome recommended の `style/noInferrableTypes` に準拠するため `: string` 型注釈は省略する）:
     ```ts
     export function readStatusBarColors(
       cssText: string,
       role = 'surface'
     ): StatusBarColors
     ```
     - 現行 `scripts/theme-colors.ts:83-91` では取得失敗時のエラーメッセージが `'--md-sys-color-surface が取得できません。'` 固定になっているため、`` `--md-sys-color-${role} が取得できません。` `` へ更新する（`tokens.css` のライト/ダーク双方から指定ロールを取得し、`surface` 取得の既存テストとは完全後方互換）。
   - `vite.config.ts` の `injectThemeColorPlugin` は `readStatusBarColors(tokensCss, buildConfig.statusBarColorRole)` の結果を `<meta name="theme-color">` の `%THEME_COLOR_LIGHT%`・`%THEME_COLOR_DARK%` に注入する（本番は `surface`、プレビューは `quaternary`）。
   - `buildConfig.isPreview` が `true` のときのみ、`transformIndexHtml` で以下を実施する（対象タグが存在しない場合は例外を投げる）。`<title>` は変更しない（Q1-c）。
     - `<html lang="ja">` を `<html lang="ja" data-app-env="preview">` に置換する。
     - `</head>` 直前に `<style>:root{--preview-os-quaternary:${colors.light}}:root[data-os-theme="dark"]{--preview-os-quaternary:${colors.dark}}</style>` を注入する（`colors` は `readStatusBarColors(tokensCss, 'quaternary')` の実値であり、ソースへの HEX 直書きは行わない）。
   - `src/ui/theme/apply-theme.ts` に `applyOsTheme(osTheme: ResolvedTheme, root?: ThemeRoot)` を追加し、初期化時・`onMediaChange` 時・`setPreference` 時のいずれも、アプリの `preference` が `'light'` / `'dark'` 固定か否かにかかわらず `<html data-os-theme>` を OS の `prefers-color-scheme` へ常時追随させる（06 号 §テーマ 2 に準拠し、CSS で `prefers-color-scheme` を直接使わない）。これにより、アプリ内テーマ設定を固定していてもブラウザのステータスバー色（OS 依存）とヘッダー上端ライン色が常に一致する。

2. **ヘッダー識別色と「プレビュー」ピルバッジ（`src/ui/screen/main-screen.css`・`AppHeader.tsx`）**:
   - `AppHeader.tsx`:
     ```tsx
     const IS_PREVIEW = typeof __IS_PREVIEW__ !== 'undefined' && __IS_PREVIEW__;
     ```
     `<h1>` の直後に `{IS_PREVIEW && <span className="app-header__preview-badge">プレビュー</span>}` を配置する（本番ビルドでは `IS_PREVIEW` が `false` となり DCE で完全に消滅するため、本番初回 JS 増分 +0 B・本番 DOM 変化なし）。
   - `main-screen.css`:
     - 全 5 画面（`MainScreen`・`SettingsScreen`・`HelpScreen`・`LicenseScreen`・`ScoringTableScreen`）が `<header className="app-header">` と `main-screen.css` を共有しているため、以下の CSS だけで全 5 画面のヘッダー上端に `0.25rem` のアクセントライン（OS テーマ追随）と文字色（アプリテーマ追随）が適用され、ヘッダー背景は通常の `surface` を維持する。本番ビルドには影響しない。
     - `.app-header__inner` は `justify-content: space-between` のため、`.app-header__preview-badge` に `margin-inline-end: auto;` を指定し、タイトルのすぐ右にバッジを寄せて右端のメニューボタンとの間に自動余白を確保する。
     - 06 号準拠のため HEX・`ms`・`cubic-bezier` は一切使用せず、`prefers-color-scheme` も使わない。
     ```css
     :root[data-app-env="preview"] .app-header {
       border-top: 0.25rem solid
         var(--preview-os-quaternary, var(--md-sys-color-quaternary));
       color: var(--md-sys-color-quaternary);
     }

     .app-header__preview-badge {
       margin-inline-end: auto;
       padding: 0.125rem 0.625rem;
       border-radius: var(--md-sys-shape-corner-full);
       background-color: var(--md-sys-color-quaternary);
       color: var(--md-sys-color-on-quaternary);
       font-family: var(--md-sys-typescale-label-small-font);
       font-size: var(--md-sys-typescale-label-small-size);
       line-height: var(--md-sys-typescale-label-small-line-height);
       font-weight: var(--md-sys-typescale-label-small-weight);
       letter-spacing: var(--md-sys-typescale-label-small-tracking);
       white-space: nowrap;
       flex-shrink: 0;
     }
     ```

## 4. コンテナ構成（Docker / nginx）

### 4.1 コンテナビルド方式

GitHub Actions ランナー（またはローカル環境）で先に `npm run build:wasm` とプレビュー用 `npm run build` を実行して `dist/` を生成し、`Dockerfile` は軽量ベースイメージ `nginx/nginx-unprivileged:stable-alpine` へ `dist/` と設定ファイルをコピーするのみとする。これにより `ci.yml`・`deploy.yml` と同一の Node / Rust ツールチェーンを使え、イメージビルドも数秒で完了する。

### 4.2 `deploy/cloud-run/Dockerfile`・`.dockerignore`・`deploy/cloud-run/robots.txt`

#### `deploy/cloud-run/Dockerfile`（新規作成）

```dockerfile
# 非特権 nginx 公式イメージ（nginx 名前空間。1.28-alpine タグは存在しないため stable-alpine を使用）
FROM nginx/nginx-unprivileged:stable-alpine

COPY deploy/cloud-run/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
COPY deploy/cloud-run/robots.txt /usr/share/nginx/html/robots.txt

EXPOSE 8080
```

#### `.dockerignore`（新規作成、リポジトリルート）

```text
*
!dist/
!deploy/cloud-run/
```

#### `deploy/cloud-run/robots.txt`（新規作成）

```text
User-agent: *
Disallow: /
```

### 4.3 `deploy/cloud-run/nginx.conf`（新規作成）

- nginx の仕様上、子 `location` で `Cache-Control` 等の `add_header` を定義すると親 `server` ブロックの `add_header` が継承されなくなるため、**すべての `location` ブロックに `add_header X-Robots-Tag "noindex, nofollow" always;` を明記する**。
- `/etc/nginx/nginx.conf` 側の `mime.types` と衝突して `[warn] duplicate extension` が出るのを防ぐため、`.webmanifest` と `.wasm` は `types {} default_type ...;` で安全に MIME タイプを指定する。
- `/assets/` には `^~` を付け、存在しないハッシュ済み JS/WASM が `index.html`（`200 OK`）へフォールバックしないよう `=404` とする。

```nginx
server {
    listen 8080;
    server_name _;
    server_tokens off;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        application/javascript
        text/javascript
        application/json
        application/manifest+json
        image/svg+xml
        application/wasm;

    add_header X-Robots-Tag "noindex, nofollow" always;

    location = /robots.txt {
        try_files $uri =404;
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header Cache-Control "no-cache" always;
    }

    location = /manifest.webmanifest {
        types {}
        default_type application/manifest+json;
        try_files $uri =404;
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header Cache-Control "no-cache" always;
    }

    location ~* ^/(?:index\.html|sw\.js|registerSW\.js|workbox-[^/]+\.js)$ {
        try_files $uri =404;
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header Cache-Control "no-cache" always;
    }

    location ^~ /assets/ {
        try_files $uri =404;
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header Cache-Control "public, max-age=31536000, immutable" always;

        location ~* \.wasm$ {
            types {}
            default_type application/wasm;
            try_files $uri =404;
            add_header X-Robots-Tag "noindex, nofollow" always;
            add_header Cache-Control "public, max-age=31536000, immutable" always;
        }
    }

    location ~* \.(?:js|css|wasm|svg|png|ico|txt|json|webmanifest)$ {
        try_files $uri =404;
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header Cache-Control "public, max-age=3600" always;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header Cache-Control "no-cache" always;
    }
}
```

## 5. GitHub Actions ワークフロー設計（`.github/workflows/preview-cloud-run.yml`）

### 5.1 トリガー・権限・同時実行制御

- `on`: `push`（`branches: [main]`）＋ `workflow_dispatch`（任意ブランチ/ref を指定して実行可能）
- `permissions`: `contents: read`・`id-token: write`
- `concurrency`: `group: preview-cloud-run`・`cancel-in-progress: false`
- ガード条件は設けず、最初から `push`（`main`）および `workflow_dispatch` で実行する（Q3 確定）。

### 5.2 ワークフロー定義骨子

```yaml
name: Preview Deploy (Cloud Run)

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

concurrency:
  group: preview-cloud-run
  cancel-in-progress: false

env:
  GCP_PROJECT_ID: <GCP_PROJECT_ID>
  GCP_PROJECT_NUMBER: '<GCP_PROJECT_NUMBER>'
  GCP_REGION: asia-northeast1
  CLOUDRUN_SERVICE_DEFAULT: mj-3player-calc
  GAR_REPOSITORY_DEFAULT: <GAR_REPOSITORY>
  CLOUDRUN_RUNTIME_SA_DEFAULT: <RUNTIME_SA_NAME>@<GCP_PROJECT_ID>.iam.gserviceaccount.com

jobs:
  deploy:
    name: ビルドと Cloud Run デプロイ
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Rust ツールチェーン(wasm32)
        run: rustup target add wasm32-unknown-unknown

      - name: wasm-pack のインストール
        uses: taiki-e/install-action@v2
        with:
          tool: wasm-pack

      - name: 手牌分解器(WASM)のビルド
        run: npm run build:wasm

      - name: npm ci
        run: npm ci

      - name: プレビュー設定の解決
        id: config
        env:
          VAR_SERVICE: ${{ vars.CLOUDRUN_SERVICE }}
          VAR_REPO: ${{ vars.GAR_REPOSITORY }}
          VAR_RUNTIME_SA: ${{ vars.CLOUDRUN_RUNTIME_SA }}
          VAR_SHARE_URL: ${{ vars.CLOUDRUN_SHARE_URL }}
        run: |
          SERVICE="${VAR_SERVICE:-$CLOUDRUN_SERVICE_DEFAULT}"
          REPO="${VAR_REPO:-$GAR_REPOSITORY_DEFAULT}"
          RUNTIME_SA="${VAR_RUNTIME_SA:-$CLOUDRUN_RUNTIME_SA_DEFAULT}"
          SHARE_URL="${VAR_SHARE_URL:-https://${SERVICE}-${GCP_PROJECT_NUMBER}.${GCP_REGION}.run.app/}"
          IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPO}/${SERVICE}:${GITHUB_SHA}"
          echo "service=${SERVICE}" >> "$GITHUB_OUTPUT"
          echo "runtime_sa=${RUNTIME_SA}" >> "$GITHUB_OUTPUT"
          echo "image=${IMAGE}" >> "$GITHUB_OUTPUT"
          echo "share_url=${SHARE_URL}" >> "$GITHUB_OUTPUT"

      - name: プレビュー用本番ビルド
        env:
          VITE_APP_ENV: preview
          VITE_SHARE_URL: ${{ steps.config.outputs.share_url }}
        run: npm run build

      - name: Google Cloud 認証 (Workload Identity Federation)
        uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Google Cloud SDK のセットアップ
        uses: google-github-actions/setup-gcloud@v3

      - name: Artifact Registry 用 Docker 認証設定
        run: gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet

      - name: コンテナイメージのビルドとプッシュ
        env:
          IMAGE: ${{ steps.config.outputs.image }}
        run: |
          docker build -f deploy/cloud-run/Dockerfile -t "${IMAGE}" .
          docker push "${IMAGE}"

      - name: Cloud Run へデプロイ
        env:
          SERVICE: ${{ steps.config.outputs.service }}
          IMAGE: ${{ steps.config.outputs.image }}
          RUNTIME_SA: ${{ steps.config.outputs.runtime_sa }}
          SHARE_URL: ${{ steps.config.outputs.share_url }}
        run: |
          gcloud run deploy "${SERVICE}" \
            --project "${GCP_PROJECT_ID}" \
            --region "${GCP_REGION}" \
            --image "${IMAGE}" \
            --service-account "${RUNTIME_SA}" \
            --min 0 \
            --max 1 \
            --max-instances 1 \
            --concurrency 80 \
            --cpu 1 \
            --memory 256Mi \
            --timeout 60s \
            --cpu-throttling \
            --quiet
          DEPLOYED_URL="$(gcloud run services describe "${SERVICE}" --project "${GCP_PROJECT_ID}" --region "${GCP_REGION}" --format='value(status.url)')"
          echo "Cloud Run URL: ${DEPLOYED_URL}"
          echo "埋め込み済み SHARE_URL: ${SHARE_URL}"
```

### 5.3 GitHub Secrets / Repository Variables 一覧

| 種別 | 名前 | 必須 / 任意 | 設定値（例） | 用途 |
| --- | --- | --- | --- | --- |
| Secret | `GCP_WORKLOAD_IDENTITY_PROVIDER` | 必須 | `projects/<GCP_PROJECT_NUMBER>/locations/global/workloadIdentityPools/<WIF_POOL>/providers/github-oidc` | WIF OIDC プロバイダの完全リソース名 |
| Secret | `GCP_SERVICE_ACCOUNT` | 必須 | `<DEPLOYER_SA_NAME>@<GCP_PROJECT_ID>.iam.gserviceaccount.com` | デプロイ用サービスアカウントのメールアドレス |
| Variable | `CLOUDRUN_SERVICE` | 任意（既定: `mj-3player-calc`） | `mj-3player-calc` | Cloud Run サービス名の上書き |
| Variable | `GAR_REPOSITORY` | 任意（既定: `<GAR_REPOSITORY>`） | `<GAR_REPOSITORY>` | Artifact Registry リポジトリ名の上書き |
| Variable | `CLOUDRUN_RUNTIME_SA` | 任意（既定: `<RUNTIME_SA_NAME>@<GCP_PROJECT_ID>.iam.gserviceaccount.com`） | `<RUNTIME_SA_NAME>@<GCP_PROJECT_ID>.iam.gserviceaccount.com` | Cloud Run ランタイム用サービスアカウントの上書き |
| Variable | `CLOUDRUN_SHARE_URL` | 任意（既定: 確定 URL） | `https://...` | 共有 URL の明示上書き（独自ドメイン利用時等） |

## 6. バンドル目標値（09 号）

### 6.1 設計時の基準値実測

- 計測コマンド: `npm run build`（環境変数なし、本番ビルド）後に `dist/index.html` の `<script type="module" src>` / `<link rel="modulepreload" href>` が指す JS ファイルを `gzip -9 -c <file> | wc -c` で計測。
- 基準コミット: `main` `62db1bb`（2026-11-18 計測）
- 対象ファイル: `dist/assets/index-Cpk8wRUr.js`（`modulepreload` なし）
- **実測基準値**: **128,880 B**（生サイズ 478,339 B）
  - （参考）`docs/rules/09-bundle-budget-protocol.md` に記載されている v1.0.0 時点の基準値は **128,883 B**（`assets/index-BVVwChpY.js`）。現 `main` との差は -3 B。

### 6.2 増分の積算

| 変更内容 | 本番ビルド増分（既定） | プレビュービルド増分（参考） | 根拠 |
| --- | --- | --- | --- |
| `scripts/build-config.ts`・`vite.config.ts`・`scripts/gen-theme-tokens.ts`・`scripts/theme-colors.ts` | +0 B | +0 B | ビルド・生成時のみ実行され JS バンドルに含まれない |
| `src/ui/theme/apply-theme.ts`（`applyOsTheme` による `<html data-os-theme>` 常時追随） | 約 +40〜+80 B | 約 +40〜+80 B | `applyOsTheme`・`resolveThemeTarget` の追加により本番・プレビュー双方の初回 JS に含まれる |
| `src/ui/share/share-config.ts`（`__SHARE_URL__` 置換） | +0 B（見込み） | 約 +0〜+25 B | `define` によるビルド時文字列置換（本番は同一文字列、プレビューは URL 長差のみ。遅延チャンク側） |
| `src/ui/theme/tokens.css`・`src/ui/screen/main-screen.css` | +0 B | +0 B | CSS ファイル側の増分のみ（初回 JS に含まれない） |
| `src/ui/screen/AppHeader.tsx`（`IS_PREVIEW` による「プレビュー」ピルバッジ） | +0 B（見込み） | 約 +80〜+150 B | `__IS_PREVIEW__` が `false` の本番ビルドでは Rollup の DCE により JSX 分岐が除去される（`base: '/'` によるパス短縮がチャンクサイズに影響する場合がある） |
| **合計増分** | **+40 B 〜 +80 B** | **+120 B 〜 +255 B** | — |

### 6.3 目標値

- **本番ビルド（デフォルト）の目標値**: **128,920 B 〜 128,960 B**（基準値 128,880 B + 積算増分 +40〜+80 B）
- （参考）プレビュービルドの目安: 約 128,860 B 〜 129,135 B（`base: '/'` によるマニフェスト文字列短縮との相殺あり）
- 09 号の規定により、目標値の超過を理由に検収を不合格にはしない（意図しない取り込みがないか調査したうえで実測値を記録・報告する）。

## 7. 変更対象ファイル一覧とテスト計画

### 7.1 変更・新規作成ファイル一覧

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `docs/rules/06-ui-md3-protocol.md` | 変更 | `## テーマ(C1 で確定)` の 1 項（クォータリーカラー 4 ロール生成）および 2 項（`<html data-os-theme>` の `apply-theme.ts` 集約）を追記 |
| `scripts/gen-theme-tokens.ts` | 変更 | クォータリーカラー（4 ロール、hue-60・chroma 24）生成処理を追加（モジュールトップレベルで色APIを評価しない） |
| `src/ui/theme/tokens.css` | 変更 | `npm run gen:theme` による再生成物（49 → 53 ロール） |
| `src/ui/theme/tokens.test.ts` | 変更 | `EXPECTED_COLOR_ROLES`（53 役割）および個数アサーション更新 |
| `src/ui/theme/apply-theme.ts` | 変更 | `applyOsTheme` を追加し、初期化・`onMediaChange`・`setPreference` で `<html data-os-theme>` を常時 OS テーマへ追随させる |
| `src/ui/theme/apply-theme.test.ts` | 変更 | `CR-T6`（`data-os-theme` の OS 常時追随）を追加 |
| `scripts/build-config.ts` | 新規 | 環境変数から本番/プレビュー設定（`base`, `shareUrl`, `statusBarColorRole`）を解決する純関数 |
| `scripts/build-config.test.ts` | 新規 | `resolveBuildConfig` の単体テスト（※既存の `scripts/theme-colors.test.ts` と同様に `tsconfig.node.json` / `tsconfig.app.json` の対象外であり、Vitest 実行対象） |
| `scripts/theme-colors.ts` | 変更 | `readStatusBarColors(cssText, role = 'surface')` にロール指定引数と動的エラーメッセージを実装 |
| `scripts/theme-colors.test.ts` | 変更 | `role` 指定（`quaternary-container`・`tertiary-container`）および未知ロール時の例外テストを追加 |
| `tsconfig.node.json` | 変更 | `files` に `./scripts/build-config.ts` を追加 |
| `vite.config.ts` | 変更 | `resolveBuildConfig(process.env)` を呼び、`base`・`define`・`transformIndexHtml`（`data-app-env="preview"` 付与と `--preview-os-quaternary` `<style>` 注入）・`VitePWA`（`start_url`/`scope`/`navigateFallbackDenylist`）を切り替え |
| `src/build-env.d.ts` | 新規 | `__IS_PREVIEW__`・`__SHARE_URL__` の型宣言 |
| `src/ui/share/share-config.ts` | 変更 | `SHARE_URL` を `__SHARE_URL__` 経由で注入（未定義時は本番 URL フォールバック） |
| `src/ui/screen/AppHeader.tsx` | 変更 | `__IS_PREVIEW__` 時にタイトル横へ「プレビュー」ピルバッジを描画 |
| `src/ui/screen/AppHeader.test.tsx` | 変更 | 非プレビュー既定時のテストおよびバッジ有無の確認テスト |
| `src/ui/screen/main-screen.css` | 変更 | `:root[data-app-env="preview"] .app-header`（上部 `0.25rem` ライン・文字色）および `.app-header__preview-badge` スタイルを MD3 トークンのみで追加 |
| `deploy/cloud-run/Dockerfile` | 新規 | `nginx/nginx-unprivileged:stable-alpine` ベースの配信用コンテナ定義 |
| `deploy/cloud-run/nginx.conf` | 新規 | ポート 8080、`X-Robots-Tag`、MIME、キャッシュ制御、SPA フォールバック設定 |
| `deploy/cloud-run/robots.txt` | 新規 | `User-agent: *` / `Disallow: /` |
| `.dockerignore` | 新規 | `dist/` と `deploy/cloud-run/` のみコンテキストへ含める |
| `.github/workflows/preview-cloud-run.yml` | 新規 | Cloud Run プレビュー自動・手動デプロイワークフロー |
| `docs/development.md` | 変更 | デプロイ節へ Cloud Run プレビューの概要と本設計書 §9 へのリンクを追記 |
| `docs/design/issue-123-cloud-run-preview.md` | 新規（設計確定） | 本設計書（ブランチにコミット済みであること） |

※ `.github/workflows/ci.yml`、`.github/workflows/deploy.yml`、`public/` 配下、`README.md` は変更しない。

### 7.2 Vitest テスト項目（05 号命名規約準拠）

テスト名は `CR-T<番号>: <説明>` 形式とする。

| ID | 対象 | 検証内容 |
| --- | --- | --- |
| `CR-T1` | `scripts/build-config.test.ts` | 未指定・`VITE_APP_ENV=production` のとき `isPreview: false`, `base: '/mj-3player-calc/'`, `shareUrl: 'https://bluekurage119.github.io/mj-3player-calc/'`, `statusBarColorRole: 'surface'` を返す |
| `CR-T2` | `scripts/build-config.test.ts` | `VITE_APP_ENV=preview` かつ `VITE_SHARE_URL='https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/'` のとき `isPreview: true`, `base: '/'`, 指定した `shareUrl`, `statusBarColorRole: 'quaternary'` を返す |
| `CR-T3` | `scripts/build-config.test.ts` | 未知の `VITE_APP_ENV`・`https://` で始まらない `VITE_SHARE_URL` を渡したときに例外を投げる |
| `CR-T4` | `scripts/theme-colors.test.ts` | `readStatusBarColors(tokensCss, 'quaternary-container')` および `'tertiary-container'` が `tokens.css` のライト/ダーク双方の値と一致し、存在しないロール名で例外（`readTokenValues` の `requiredRoles` 検査に由来）を投げる |
| `CR-T5` | `src/ui/screen/AppHeader.test.tsx` | 通常のテスト環境（非プレビュー）で `AppHeader` をレンダリングしたとき、`.app-header__preview-badge`（「プレビュー」）が含まれない |
| `CR-T6` | `src/ui/theme/apply-theme.test.ts` | OS の `prefers-color-scheme` がアプリ設定（`'light'` / `'dark'` 固定を含む）と異なっていても `<html data-os-theme>` が常に OS 設定に追随する |

## 8. 受け入れ条件チェックリスト（検収担当向け）

検収担当は以下の各項目を上から順に実行し、結果を PR 本文に記録する。Cloud Run への実デプロイはスコープ外（§1.3）であり実施しない。

### 8.1 変更範囲・静的検査・テーマ生成確認

- **CR-AC1（差分範囲と禁止ファイル）**:
  - `git diff --stat origin/main...HEAD` が §7.1 の一覧に収まり、`.github/workflows/ci.yml`・`.github/workflows/deploy.yml`・`public/`・`README.md` に差分がないこと。
  - `git status --porcelain` が空（未コミット変更なし）であること。
  - `git diff origin/main...HEAD | grep -nE '/(Users|home)/'` でホームディレクトリ名が変更ファイルに含まれないこと。
- **CR-AC2（静的検査・単体テスト・テーマ生成一致）**:
  - `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test`・`npm run check:theme`・`npm run check:icons` がすべて終了コード 0 で成功すること（`CR-T1`〜`CR-T6`、`C1-K01`〜`C1-K05`、`D5-C17`、`H2-AC14`、`F1-2-12` がすべてパス）。
  - `src/ui/theme/tokens.css` のライト/ダーク両ブロックに `--md-sys-color-quaternary`・`on-quaternary`・`quaternary-container`・`on-quaternary-container` の 4 ロールが存在し、§3.4 の実測値と一致すること。

### 8.2 本番ビルド（デフォルト）の回帰確認と初回 JS 計測

- **CR-AC3（本番ビルドの成果物回帰）**:
  - 環境変数なしで `npm run build:wasm`（未ビルド時）→ `npm run build` を実行する。
  - `dist/index.html` の `src`/`href` がすべて `/mj-3player-calc/` で始まり、`data-app-env="preview"` および `--preview-os-quaternary` が含まれず、`<title>三麻点数計算機</title>` であり、`meta name="theme-color"` が `tokens.css` ライト/ダークの `--md-sys-color-surface` 値（`#f7fbf1` / `#10140f`）であること。
  - `dist/manifest.webmanifest` が `name: "三麻点数計算機"`, `short_name: "三麻計算機"`, `start_url: "/mj-3player-calc/"`, `scope: "/mj-3player-calc/"`, `theme_color`=`#f7fbf1` であること。
  - `dist/registerSW.js` が `register('/mj-3player-calc/sw.js', { scope: '/mj-3player-calc/' })` を含むこと。
  - `test ! -e dist/robots.txt` が真（`dist/robots.txt` が存在しないこと）。
  - `grep -rn "run\.app" dist/` の出力が空であること（本番ビルドにプレビュー URL が混入していないこと）。
  - `grep -l "app-header__preview-badge" dist/assets/*.js` および `grep -l "プレビュー" dist/assets/*.js` の出力がどちらも空であること（DCE により本番 JS チャンクにバッジ JSX・文言が残っていないこと。CSS 側のセレクタ定義が残ることは許容する）。
- **CR-AC4（09 号 初回 JS 計測）**:
  - CR-AC3 の `dist/index.html` から `<script type="module" src>` / `<link rel="modulepreload" href>` が指す JS ファイルを `gzip -9 -c <file> | wc -c` で計測する。
  - 基準値 **128,880 B**（09 号記載 v1.0.0 値 **128,883 B**）、実測値、増分、積算増分（+40〜+80 B）との差を PR 本文に記録すること（目標値超過でも不合格にしない）。

### 8.3 プレビュービルド成果物の確認

- **CR-AC5（プレビュービルドの生成物とパス）**:
  - 以下を実行し成功すること:
    ```bash
    VITE_APP_ENV=preview VITE_SHARE_URL=https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/ npm run build
    ```
  - `dist/index.html` について:
    - `src`/`href` がすべて `/` で始まり（`/assets/...`, `/favicon.svg`, `/manifest.webmanifest`, `/registerSW.js`）、`/mj-3player-calc/` を含まないこと（`grep -n "/mj-3player-calc/" dist/index.html` が空）。
    - `<html lang="ja" data-app-env="preview">` が付与されていること。
    - `<title>三麻点数計算機</title>` が本番のまま維持されていること（Q1-c）。
    - `meta name="theme-color"` のライト値が `#715b2e`（`quaternary`）、ダーク値が `#dfc38c`（`quaternary`）であること。
    - `</head>` 直前に `<style>:root{--preview-os-quaternary:#715b2e}:root[data-os-theme="dark"]{--preview-os-quaternary:#dfc38c}</style>` が注入されていること。
  - `dist/manifest.webmanifest` の `name`=`"三麻点数計算機"`・`short_name`=`"三麻計算機"`・`theme_color`=`"#f7fbf1"` が本番のまま維持され、`start_url` と `scope` のみが `"/"` になっていること（Q1-c・H4）。
  - `dist/registerSW.js` が `register('/sw.js', { scope: '/' })` を含むこと。
  - `dist/sw.js` について、`grep -E 'denylist:\[[^]]*robots' dist/sw.js` が一致し（Workbox 生成コード上で `/robots.txt` 除外設定が出力されていること）、かつ `grep -c 'decomposer_bg-.*\.wasm' dist/sw.js` が `1` 以上であること（WASM と牌 SVG 等が precache されていること）。
  - `grep -rl "mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app" dist/assets/*.js` で共有モジュールチャンクにプレビュー URL が埋め込まれていること。
  - プレビュービルドの初回 JS サイズ（`gzip -9`）も参考値として計測し PR 本文に記録すること。

### 8.4 ローカル Docker コンテナでの起動・HTTP 応答・UI 確認

前提: CR-AC5 本体のプレビュー用 `dist/` がある状態で実施する。検証終了時は必ずコンテナを削除する。

- **CR-AC6（Docker ビルドと非 root 起動・ログ確認）**:
  - `docker build -f deploy/cloud-run/Dockerfile -t mj-3player-calc-preview:inspect .` が終了コード 0 で完了すること。
  - `docker inspect --format='{{.Config.User}}' mj-3player-calc-preview:inspect` が空文字および `root` / `0` でないこと。
  - `docker run -d --name mj3-preview-inspect -p 18080:8080 mj-3player-calc-preview:inspect` で起動し、`docker ps` で `Up` 状態であること。
  - `docker logs mj3-preview-inspect` に `[warn]`（`duplicate extension` 等）・`[error]`・`[emerg]` が出力されていないこと。
- **CR-AC7（HTTP レスポンスヘッダ・MIME・検索避け・404 検査）**:
  - `curl` で以下を確認し、全条件を満たすこと:
    1. `curl -sI http://localhost:18080/` → `200 OK`、`Content-Type` に `text/html`、`X-Robots-Tag: noindex, nofollow`、`Cache-Control: no-cache`。
    2. `curl -sI http://localhost:18080/robots.txt` と `curl -s http://localhost:18080/robots.txt` → `200 OK`、`X-Robots-Tag: noindex, nofollow`、本文が `User-agent: *` と `Disallow: /`。
    3. `curl -sI http://localhost:18080/manifest.webmanifest` → `200 OK`、`Content-Type: application/manifest+json`、`X-Robots-Tag: noindex, nofollow`、`Cache-Control: no-cache`。
    4. `curl -sI http://localhost:18080/sw.js` → `200 OK`、`X-Robots-Tag: noindex, nofollow`、`Cache-Control: no-cache`。
    5. `dist/assets/decomposer_bg-*.wasm` の実ファイル名に対して `curl -sI "http://localhost:18080/assets/<実ファイル名>"` → `200 OK`、`Content-Type: application/wasm`、`X-Robots-Tag: noindex, nofollow`、`Cache-Control` に `immutable`。
    6. `curl -sI http://localhost:18080/assets/non-existent.wasm` および `curl -sI http://localhost:18080/assets/non-existent.js` → どちらも `404 Not Found` かつ `X-Robots-Tag: noindex, nofollow`。
    7. `curl -sI http://localhost:18080/non-existent-route` → `200 OK`（`index.html`）かつ `X-Robots-Tag: noindex, nofollow`。
- **CR-AC8（ブラウザ 375px 表示・動作・識別色・バッジ・SW 確認）**:
  - ブラウザで `http://localhost:18080/` を幅 375px で開き、以下を確認する:
    - コンソールエラーおよび Network の 404 が 0 件。
    - メイン画面で `document.documentElement.scrollWidth <= document.documentElement.clientWidth` が `true`。
    - `.app-header` の `getComputedStyle(el).backgroundColor` が通常の `surface`（ライト時 `#f7fbf1`=`rgb(247, 251, 241)`、ダーク時 `#10140f`=`rgb(16, 20, 15)`）を維持し、`borderTopColor` が OS テーマに応じた `quaternary`（OS ライト時 `#715b2e`=`rgb(113, 91, 46)`、OS ダーク時 `#dfc38c`=`rgb(223, 195, 140)`、`borderTopWidth`=`4px`）、文字 `color` がアプリテーマに応じた `quaternary`（アプリライト時 `rgb(113, 91, 46)`、アプリダーク時 `rgb(223, 195, 140)`）と一致すること。またアプリテーマを OS と逆へ切り替えても `data-os-theme` および `borderTopColor` は OS テーマに追随すること。
    - `.app-header__preview-badge`（「プレビュー」）がタイトル横に折り返し・はみ出しなく表示され、背景・文字色が `quaternary` / `on-quaternary` 計算値と一致すること（ライトテーマ時: 背景 `#715b2e`=`rgb(113, 91, 46)`、文字 `#ffffff`=`rgb(255, 255, 255)`。ダークテーマ時は背景 `rgb(223, 195, 140)`、文字 `rgb(63, 46, 4)`）。
    - 牌を入力して向聴数または和了結果が表示されること（WASM 動作）。
    - 設定・点数計算表・ヘルプ・ライセンスの各画面へ遷移し、すべての画面でヘッダー識別色が反映され、かつ幅 375px で `scrollWidth <= clientWidth` が `true` であること。
    - `navigator.serviceWorker.getRegistration()` の `active.state` が `'activated'`、`scope` が `'http://localhost:18080/'` であること。
    - 確認後、`docker rm -f mj3-preview-inspect`（および `docker rmi mj-3player-calc-preview:inspect`）で後始末すること。

### 8.5 ワークフローとドキュメントの検査

- **CR-AC9（YAML 構文と定義内容）**:
  - `ruby -ryaml -e 'YAML.load_file(".github/workflows/preview-cloud-run.yml")'` が無出力・終了コード 0 で終了すること。
  - `.github/workflows/preview-cloud-run.yml` を目視確認し、以下を満たすこと:
    - `on.push.branches` に `main`、`on.workflow_dispatch` があること。
    - `permissions` に `contents: read` と `id-token: write` があること。
    - ジョブやステップに `CLOUDRUN_PREVIEW_ENABLED` 等の不要な実行スキップガードが入っていないこと（Q3）。
    - `if:` 式内で `secrets.` を直接参照していないこと。
    - `google-github-actions/auth@v3`（`token_format` 不要の通常 OIDC 認証）および `google-github-actions/setup-gcloud@v3` を使用していること。
    - `gcloud auth configure-docker`、`docker build -f deploy/cloud-run/Dockerfile`、`docker push`、`gcloud run deploy` を使用していること。
    - `GCP_PROJECT_ID: <GCP_PROJECT_ID>`、`GCP_PROJECT_NUMBER: '<GCP_PROJECT_NUMBER>'`、`GCP_REGION: asia-northeast1`、`CLOUDRUN_SERVICE_DEFAULT: mj-3player-calc`、`GAR_REPOSITORY_DEFAULT: <GAR_REPOSITORY>`、`CLOUDRUN_RUNTIME_SA_DEFAULT: <RUNTIME_SA_NAME>@<GCP_PROJECT_ID>.iam.gserviceaccount.com` が設定されていること。
    - `gcloud run deploy` に `--min 0`、`--max 1`、`--max-instances 1`、`--concurrency 80`、`--cpu 1`、`--memory 256Mi`、`--timeout 60s`、`--cpu-throttling`、`--quiet` が含まれ、かつ `--allow-unauthenticated` を含まないこと（`grep -n "allow-unauthenticated" .github/workflows/preview-cloud-run.yml` が空であること）。
    - 設計書（§9）含め `roles/run.admin` を付与する記述になっていないこと（※ GitHub Actions 上での実実行は未実施・実挙動未確認）。
- **CR-AC10（`docs/development.md` と未確認事項の記載）**:
  - `docs/development.md` に Cloud Run プレビューの概要と本設計書 §9 への相対リンクが追記されており、リンク先が実在すること。
  - PR 本文に「Cloud Run への実デプロイ・WIF 認証・公開 URL での動作確認はオーナーの GCP 設定実施待ちのため実挙動未確認」である旨が明記されていること。

## 9. オーナー向け GCP 設定・運用手順書

本節の手順は、Issue #123 の PR マージ後（または別モデルによるコードレビュー完了後）にオーナーが実施する。**※ 以下の GCP 上の実リソース作成・WIF 認証・Cloud Run デプロイ・公開 URL での実機アクセスは検収時点では「実挙動未確認」である。**

- **既存リソース不変更の方針**: `<GCP_PROJECT_ID>` 上の既存 Cloud Run 4 サービス、既存 Artifact Registry イメージ群（既存他サービス等）、および既存の WIF Poolや既存 IAM 設定には一切変更を加えない。
- （注: ワークフローに自動スキップガードを設けない確定仕様〔Q3〕のため、PR マージから下記設定完了までの間に `main` へ別コミットが push されるとワークフローが一時的に失敗終了する。設定完了後に再実行または次回 push で正常化する。）

### 9.1 前提条件と環境変数

- GCP プロジェクト ID: `<GCP_PROJECT_ID>`
- GCP プロジェクト番号: `<GCP_PROJECT_NUMBER>`
- リージョン: `asia-northeast1`（東京）
- 対象 GitHub リポジトリ: `BlueKurage119/mj-3player-calc`
- Cloud Run サービス名: `mj-3player-calc`
- Artifact Registry リポジトリ名: `<GAR_REPOSITORY>`（既存共用）
- ランタイム用 SA: `<RUNTIME_SA_NAME>`（権限なし専用 SA）
- デプロイ用 SA: `<DEPLOYER_SA_NAME>`（最小権限専用 SA）
- WIF Pool / Provider: `<WIF_POOL>` / `github-oidc`
- `gcloud` CLI が利用可能で、対象プロジェクト `<GCP_PROJECT_ID>` に対する管理者権限（Owner 等）でログイン済みであり、課金アカウントがプロジェクトに紐づいていること。

```bash
export PROJECT_ID="<GCP_PROJECT_ID>"
export PROJECT_NUMBER="<GCP_PROJECT_NUMBER>"
export REGION="asia-northeast1"
export GITHUB_REPO="BlueKurage119/mj-3player-calc"
export SERVICE_NAME="mj-3player-calc"
export GAR_REPO="<GAR_REPOSITORY>"
export RUNTIME_SA_NAME="<RUNTIME_SA_NAME>"
export DEPLOYER_SA_NAME="<DEPLOYER_SA_NAME>"
export WIF_POOL="<WIF_POOL>"
export WIF_PROVIDER="github-oidc"

gcloud config set project "${PROJECT_ID}"
```

### 9.2 サービスアカウント作成・初回サービス先行作成・最小権限 IAM 付与

- **API 有効化について**: `<GCP_PROJECT_ID>` は既存稼働プロジェクトのため `run.googleapis.com`・`artifactregistry.googleapis.com`・`iam.googleapis.com`・`iamcredentials.googleapis.com`・`sts.googleapis.com` は有効済みである。未有効の API がある場合のみ以下を実行する（`gcloud services list --enabled` で確認可能）。
- **Artifact Registry について**: 既存の `<GAR_REPOSITORY>`（`asia-northeast1`）を共用するため、新規リポジトリ作成は不要。

```bash
# （未有効の API がある場合のみ実行）
# gcloud services enable \
#   run.googleapis.com \
#   artifactregistry.googleapis.com \
#   iam.googleapis.com \
#   iamcredentials.googleapis.com \
#   sts.googleapis.com

# 1. 専用ランタイム SA（権限なし）と専用デプロイ SA を作成
gcloud iam service-accounts create "${RUNTIME_SA_NAME}" \
  --display-name="mj-3player-calc Cloud Run Runtime"

gcloud iam service-accounts create "${DEPLOYER_SA_NAME}" \
  --display-name="mj-3player-calc GitHub Actions Deployer"

export RUNTIME_SA_EMAIL="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
export DEPLOYER_SA_EMAIL="${DEPLOYER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# 2. 初回 Cloud Run サービスをオーナーが先行作成（1 回限り）
# ここで --allow-unauthenticated とリソース上限を設定しておくことで、
# 以降の CI からは --allow-unauthenticated なし（roles/run.developer のみ）で公開状態を維持したまま更新できる。
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="us-docker.pkg.dev/cloudrun/container/hello" \
  --service-account="${RUNTIME_SA_EMAIL}" \
  --allow-unauthenticated \
  --min=0 \
  --max=1 \
  --max-instances=1 \
  --concurrency=80 \
  --cpu=1 \
  --memory=256Mi \
  --timeout=60s \
  --cpu-throttling \
  --quiet

# 3. デプロイ SA への最小権限 IAM 付与（プロジェクト全体の roles/run.admin 等は一切付与しない）
# (a) 対象サービス単体へのデプロイ権限 (roles/run.developer)
gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
  --region="${REGION}" \
  --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
  --role="roles/run.developer"

# (b) 既存 Artifact Registry (<GAR_REPOSITORY>) 単体へのイメージ push 権限
gcloud artifacts repositories add-iam-policy-binding "${GAR_REPO}" \
  --location="${REGION}" \
  --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

# (c) ランタイム SA (<RUNTIME_SA_NAME>) 単体への Service Account User 権限
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA_EMAIL}" \
  --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"
```

### 9.3 Workload Identity Federation (OIDC) 設定

```bash
# 1. 専用 Workload Identity Pool を作成（既存の WIF Pool には触れない）
gcloud iam workload-identity-pools create "${WIF_POOL}" \
  --location="global" \
  --display-name="mj-3player-calc GitHub Actions Pool"

# 2. GitHub OIDC Provider を作成
# 注: 任意ブランチからの workflow_dispatch を許可するため、assertion.repository のみに限定し refs/heads/main 縛りは付けない
gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER}" \
  --location="global" \
  --workload-identity-pool="${WIF_POOL}" \
  --display-name="GitHub Actions OIDC Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository == '${GITHUB_REPO}'"

# 3. GitHub リポジトリからの SA 借用 (Workload Identity User) を許可
gcloud iam service-accounts add-iam-policy-binding "${DEPLOYER_SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${GITHUB_REPO}"

# 4. GitHub Secrets に登録する Provider リソース名を確認・表示
gcloud iam workload-identity-pools providers describe "${WIF_PROVIDER}" \
  --location="global" \
  --workload-identity-pool="${WIF_POOL}" \
  --format="value(name)"
```

### 9.4 GitHub Secrets / Repository Variables 登録

GitHub リポジトリの `Settings` → `Secrets and variables` → `Actions` から以下を登録する（`gh` CLI でも登録可）。

1. **Repository secrets（必須）**:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`: §9.3 手順 4 の出力値（例: `projects/<GCP_PROJECT_NUMBER>/locations/global/workloadIdentityPools/<WIF_POOL>/providers/github-oidc`）
   - `GCP_SERVICE_ACCOUNT`: `<DEPLOYER_SA_NAME>@<GCP_PROJECT_ID>.iam.gserviceaccount.com`
2. **Repository variables（任意・上書きが必要な場合のみ）**:
   - 既定値（サービス名 `mj-3player-calc`、AR リポジトリ `<GAR_REPOSITORY>`、ランタイム SA `<RUNTIME_SA_NAME>@<GCP_PROJECT_ID>.iam.gserviceaccount.com`、確定 URL `https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/`）で運用する場合は登録不要。
   - 変更したい場合のみ `CLOUDRUN_SERVICE`・`GAR_REPOSITORY`・`CLOUDRUN_RUNTIME_SA`・`CLOUDRUN_SHARE_URL` を登録する。

### 9.5 初回動作確認手順（実挙動未確認）

1. GitHub Actions → `Preview Deploy (Cloud Run)` → `Run workflow`（ブランチ `main`）を手動実行する。
2. ジョブ完了後、ログに出力された `Cloud Run URL` と `埋め込み済み SHARE_URL`（`https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/`）が一致していることを確認する。
   - もし `deploy` 出力 URL が異なる形式になった場合は、その URL を Variable `CLOUDRUN_SHARE_URL` に登録して再度 `Run workflow` を実行する。
3. 公開 URL にブラウザおよび `curl -sI` でアクセスし、以下を確認する:
   - `curl -sI https://mj-3player-calc-<GCP_PROJECT_NUMBER>.asia-northeast1.run.app/` と `robots.txt` で `X-Robots-Tag: noindex, nofollow` が返り、`robots.txt` に `Disallow: /` があること。
   - ブラウザで山吹色のヘッダー識別色・`プレビュー` ピルバッジ・ステータスバー色が表示され、牌入力から点数・向聴数の計算まで動作すること。
   - 和了結果の共有機能で、フッター URL と QR コードがプレビュー URL になっていること。
   - 任意の作業ブランチを指定して `workflow_dispatch` を実行し、同じ Cloud Run サービスが上書き更新されること。

### 9.6 不要イメージ・旧リビジョンの手動確認・削除

当面は自動クリーンアップポリシーを設定しないため、不要になった Artifact Registry のイメージや Cloud Run の過去リビジョンは以下のコマンドで手動確認・整理できる。**※ `<GAR_REPOSITORY>` は他サービスと共用しているため、必ず `/${SERVICE_NAME}` パス配下のみを対象にし、他サービスのイメージを削除しないこと。**

```bash
# Artifact Registry のイメージ一覧確認（mj-3player-calc 配下のみ）
gcloud artifacts docker images list \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${GAR_REPO}/${SERVICE_NAME}" \
  --include-tags --sort-by="~UPDATE_TIME"

# 不要になった古いダイジェストを削除する場合（最新実行中以外を指定）
# gcloud artifacts docker images delete \
#   "${REGION}-docker.pkg.dev/${PROJECT_ID}/${GAR_REPO}/${SERVICE_NAME}@sha256:<DIGEST>" --delete-tags

# Cloud Run のリビジョン一覧確認（トラフィック 0% の旧リビジョンを確認）
gcloud run revisions list --service="${SERVICE_NAME}" --region="${REGION}"

# 旧リビジョンを削除する場合
# gcloud run revisions delete "<REVISION_NAME>" --region="${REGION}"
```

### 9.7 運用・コスト・セキュリティ上の注意

- 初回サービス作成時の `--allow-unauthenticated` によりインターネット上の誰でもアクセス可能な状態になるため、課金上限や予算アラートの設定を推奨する（`--min 0 --max 1 --max-instances 1 --cpu 1 --memory 256Mi` のため、アクセスがない間の課金は発生せず同時スケール上限も 1 インスタンスに抑えられる）。
- 組織ポリシー（Domain Restricted Sharing 等）が `<GCP_PROJECT_ID>` に設定されている場合、初回サービス作成時の `--allow-unauthenticated` でエラーになることがある（既存 4 サービス稼働実績から現時点では問題ない見込みだが、実デプロイ未確認）。

## 10. 後続 Issue への引き継ぎ事項

- **初回実デプロイ結果の反映**: オーナーによる §9 の設定・初回動作確認後、実デプロイ時の挙動や組織ポリシー等に応じた調整が必要になった場合は別 Issue で対応する。
- **`vitest.config.ts` 分離時の注意**: 現在 `vite.config.ts` を Vitest も共有しているため、`__APP_VERSION__`・`__IS_PREVIEW__`・`__SHARE_URL__` の `define` がテストでも有効になっている。将来 `vitest.config.ts` を分離する場合は、これら `define`（または `typeof` フォールバック維持）を引き継ぐこと。
- **プレビュー機能の拡張余地**: Artifact Registry の古いイメージ自動削除（Cleanup Policy）や PR ごとのリビジョンタグ分離が必要になった場合は別 Issue で拡張する。
