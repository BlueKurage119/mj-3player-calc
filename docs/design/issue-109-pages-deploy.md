# Issue #109 G2. GitHub Pages への配布 設計書

## 1. 目的と範囲

ビルド成果物(`dist/`)を GitHub Pages に配布する仕組みを用意する。公開URLは `https://bluekurage119.github.io/mj-3player-calc/`(独自ドメインなし)。

- 範囲内: `.github/workflows/deploy.yml` の新設、`vite.config.ts` への `base` の追加
- 範囲外: manifest の `start_url`・`scope`・アイコン(G1 #108)、`ci.yml` の変更、リポジトリ設定(Pages 有効化)の変更、初回デプロイの実行

## 2. 参照資料と設計判断の根拠

| 資料 | 導いた判断 |
| --- | --- |
| 統括担当から渡されたヒアリング確定事項(ユーザー承認済み) | 下表の1〜5 |
| `docs/issues-draft.md` G2 | サブパス配信に合わせた `base` の設定 |
| `.github/workflows/ci.yml`(現行) | ビルド手順と Actions のバージョン(`actions/checkout@v7`・`actions/setup-node@v7`・`taiki-e/install-action@v2`)を流用 |
| `vite.config.ts`(現行) | `base` なし。`VitePWA` は `registerType: 'autoUpdate'`、`manifest` 指定なし |
| `docs/rules/09-bundle-budget-protocol.md` | 基準値の実測と目標値(4章) |

ヒアリング確定事項:

1. 契機は `workflow_dispatch` のみ。main への push での自動デプロイはしない。
2. `ci.yml` は変更せず `deploy.yml` を独立で新設する。deploy.yml では lint・test 等の検証を再実行しない(オーナーが CI 成功を確認してから実行する運用)。ビルド手順は ci.yml と同じ。権限は `pages: write`・`id-token: write`・`contents: read`、`concurrency` のグループは `pages`。`actions/upload-pages-artifact` と `actions/deploy-pages` を使う。
3. `base: '/mj-3player-calc/'` を `vite.config.ts` に固定値で設定する。
4. 独自ドメインは使わない。
5. Pages 有効化と初回デプロイ実行はオーナーが行う(7章)。v1 準備完了まで保留してよく、PR・マージは先行できる。

## 3. 変更内容

### 3.1 `vite.config.ts`

設定オブジェクトの先頭に1行追加する。他は変更しない。

```ts
export default {
  base: '/mj-3player-calc/',
  plugins: [ /* 現行のまま */ ],
  build: { /* 現行のまま */ }
} satisfies UserConfig;
```

- 設計時の実測(一時変更して `npm run build`。測定後に復旧済み): `dist/index.html` の参照が `/mj-3player-calc/assets/index-*.js`・`/mj-3player-calc/assets/index-*.css`・`/mj-3player-calc/manifest.webmanifest`・`/mj-3player-calc/registerSW.js` に変わり、`dist/registerSW.js` は `register('/mj-3player-calc/sw.js', { scope: '/mj-3player-calc/' })` になった。
- `npm run dev` も `http://localhost:5173/mj-3player-calc/` で配信されるようになる(Vite の仕様)。dev の起動ルールは 01号に従う。

### 3.2 `.github/workflows/deploy.yml`(新設)

以下を骨子とする(ステップ名は日本語で ci.yml に倣う。細部の書式は製造担当に任せる)。

```yaml
name: Deploy

on:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    name: ビルド
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: package-lock.json
      - run: rustup target add wasm32-unknown-unknown
      - uses: taiki-e/install-action@v2
        with:
          tool: wasm-pack
      - run: npm run build:wasm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
  deploy:
    name: デプロイ
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- 版はメジャー指定の `actions/upload-pages-artifact@v5`(最新 v5.0.0)と `actions/deploy-pages@v5`(最新 v5.0.1)で確定とする(統括担当が確認済み)。公式 README の使用例は古い版のままなので、例を写さないこと。
- `cancel-in-progress: false` は、実行中のデプロイを途中で止めないための GitHub 公式スターターワークフローの慣行に従う(些末事項として設計担当が決定)。
- `actions/configure-pages` は使わない。`base` を固定値で持つため不要と見込む(実挙動未確認)。ただし、7章1(Pages 有効化・Source=GitHub Actions)を先に行わないとデプロイは失敗する。
- ci.yml の `実行環境` ステップ(バージョン表示)は任意。検証ステップ(check:theme・lint・typecheck・format:check・test)は入れない。

## 4. バンドル(09号)

| 項目 | 値 |
| --- | --- |
| 基準値(main 846ed4c、2026-11-15 設計担当が実測) | **128,074 B**(`assets/index-*.js` 1本、`modulepreload` なし、gzip -9) |
| `base` 追加後(同コミットに一時変更して実測) | 128,114 B |
| 増分 | +40 B(バンドル内に埋め込まれるベースパス文字列 `/mj-3player-calc/` の分。ロジックの追加はない) |
| 目標値 | 128,114 B 以下(超過は不合格にしない) |

注: 09号記載の基準値 125,908 B(Epic E 後)とは差がある。以降のマージ分で増えたものと見られるが、本 Issue の範囲外のため内訳は未調査。deploy.yml はバンドルに影響しない。

## 5. 受け入れ条件

検収担当がブランチ上で実行する。dev サーバー・preview の起動と停止は 01号に従う。

1. **差分の範囲**: 本設計書がブランチのコミットに含まれている前提で、`git diff --stat origin/main...HEAD` が `vite.config.ts`・`.github/workflows/deploy.yml`・(本設計書)のみであること。`ci.yml` に差分がないこと。
2. **base の値**: `vite.config.ts` に `base: '/mj-3player-calc/'` が1か所あり、他の設定値が main と同一であること(`git diff origin/main -- vite.config.ts` で追加1行のみ)。
3. **ビルド成果物のパス**: `npm run build:wasm`(未ビルド時)→ `npm run build` が成功し、`dist/index.html` の `src`/`href` がすべて `/mj-3player-calc/` で始まること(`grep -oE '(src|href)="[^"]+"' dist/index.html` で確認)。
4. **SW 登録先**: `dist/registerSW.js` に `/mj-3player-calc/sw.js` と `scope: '/mj-3player-calc/'` が含まれること。
5. **本番ビルドでの動作**: `npm run preview` で `http://localhost:4173/mj-3player-calc/` を開き、次を確認する。
   - 画面が表示され、牌を入力して結果(向聴数等)が表示されること(WASM が base 配下から読めている)
   - ブラウザの Network で、`/mj-3player-calc/` 配下へのリクエストに 404 が1件もないこと
   - `/mj-3player-calc/` の外(同一オリジン)へのリクエストが0件であること。ただし、ブラウザが自動で要求する `/favicon.ico` は除く(アイコンは G1 の範囲で未導入のため 404 になり得る)
   - `navigator.serviceWorker.getRegistration()` の結果の `scope` が `http://localhost:4173/mj-3player-calc/` で、`active` が存在すること(必要なら再読み込み後)
   - コンソールにエラーがないこと
6. **ワークフロー定義**: `deploy.yml` について次を目視で確認する。
   - `on:` が `workflow_dispatch` のみ
   - `permissions` が `contents: read`・`pages: write`・`id-token: write` の3つのみ
   - `concurrency.group` が `pages`
   - ビルド手順が ci.yml と同順(wasm32 追加 → wasm-pack → `npm run build:wasm` → `npm ci` → `npm run build`)、`checkout`・`setup-node`・`install-action` の版が ci.yml と同じ
   - 各 `with` の設定が3.2節の骨子どおり(`persist-credentials: false`、`node-version-file: .nvmrc`・`cache: npm`・`cache-dependency-path: package-lock.json`、`tool: wasm-pack`、`path: dist`)
   - `actions/upload-pages-artifact@v5` と `actions/deploy-pages@v5` を使っている
   - deploy ジョブが `needs: build` を持ち、`environment.name: github-pages` と `environment.url: ${{ steps.deployment.outputs.page_url }}` を持ち、deploy-pages のステップに `id: deployment` がある
   - lint・test 等の検証ステップがない
7. **YAML の妥当性**: `ruby -ryaml -e 'YAML.load_file(".github/workflows/deploy.yml")'` が何も出力せず終了コード0で終わること(macOS 標準の ruby で動作することを統括担当が確認済み。新規依存は導入しない)。あわせて、インデント・`${{ }}` 式・`needs` の記述を目視で確認する。`workflow_dispatch` の `Run workflow` ボタンは既定ブランチにファイルが入るまで表示されないため、マージ後にオーナーが7章で確認する(実挙動未確認)。
8. **ローカル検証(PR 作成前)**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test`・`npm run check:theme` がすべて成功すること。PR の CI が成功することの確認は、受け入れ条件の判定ではなく、04号の手順に従って PR 作成後に行う工程として扱う。
9. **バンドル**: 09号の計測方法で初回 JS を実測し、基準値 128,074 B・実測値・増分・積算(+40 B)との差を PR 本文に記録すること。目標値を超えた場合は、超過量と原因も PR 本文に書く(不合格にはしない)。
10. **禁止事項**: `git diff origin/main...HEAD | grep -nE '/Users/|/home/'` の出力が空であること(ヒットした場合は目視で判定)。リポジトリ設定を変更していないこと。

実際の Pages へのデプロイ(公開URLでの表示)は、Pages 未有効化のため本 Issue の受け入れ条件に含めない(7章でオーナーが実施)。

## 6. リスク・注意点

- `base` の設定以降、ローカルでも `/mj-3player-calc/` を付けて開く必要がある。`/` を開くと Vite が案内を表示するだけでアプリは出ない。既存のテスト(Vitest)は `base` に依存しないと見込むが、実行で確かめる(受け入れ条件8)。
- 既定で生成される `manifest.webmanifest` の `start_url`・`scope` は本 Issue では扱わない(G1)。ホーム画面追加時の挙動は G1 で確認する。
- 既存のブラウザに旧 SW(scope `/`)が残る問題は、公開前のため実害はない。

## 7. オーナーが行う手順(リポジトリ設定)

実装側では行わない。v1 準備完了まで保留してよい。

1. GitHub のリポジトリの Settings → Pages → Build and deployment → Source を「GitHub Actions」にする。
2. main の CI が成功していることを確認する。
3. Actions → `Deploy` → `Run workflow`(Branch: main)を実行する。
4. 完了後、`https://bluekurage119.github.io/mj-3player-calc/` を開き、画面表示と計算結果が出ることを確かめる。
5. `github-pages` 環境に保護ルール(main のみ許可)が自動作成される。別ブランチからは実行できない(実挙動未確認)。

## 8. 後続 Issue への引き継ぎ

- G1(#108): manifest の `start_url`・`scope` は `/mj-3player-calc/` 配下を前提に決めること。アイコンの配置(`public/` 新設時)も `base` 配下で解決される。
- G3(#110): README に公開URLとデプロイ手順(7章)を記載する。
- 将来課題: v1 公開後、main への push(CI 成功後)での自動デプロイへ切り替える余地がある(`workflow_run` 等)。本 Issue では行わない。
- 09号の基準値は、本 Issue のマージ後の実測値に更新する。
