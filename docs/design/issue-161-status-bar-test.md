# Issue #161 設計書: ビルド成果物テストの軽量化と一時ディレクトリ残留・`dist/` 書き出しの解消

- 状態: 承認済み(設計承認: 首席統括(オーナー委任)、2026-11-28。製造は AGY スキル式(Gemini 4 Hydrogen))
- 独立レビュー: Antigravity (Gemini 4 Neon)。P1 1件・P2 2件・P3 5件を反映済み
- 設計担当モデル: Claude Opus 5.5
- 対象ブランチ: `fix/issue-161-status-bar-test`(起点 `origin/main` ef445b7)
- Issue記号: `I161`(Epic 外の Issue は `I<番号>` とする既存例 `I85`・`I96` に合わせる)

## 1. 参照資料と確定事項

### 1.1 参照資料

| 資料 | 読み取った内容 |
| --- | --- |
| Issue #161 本文(`gh issue view 161`) | 指摘2点: フルビルド2回で約7秒/件・worker タイムアウトの一因になりうる。`buildTo` の `mkdtempSync` 後に `vite build` が失敗すると `sbg-*` が `os.tmpdir()` に残る |
| `scripts/status-bar-build.test.ts` | `buildTo(env)` が `mkdtempSync` → `execFileSync(vite build --outDir)`。失敗時は `outDir` が呼び出し側に返らず `finally` で消せない。`describe.each` で本番・プレビューを各1回ビルドし、1つの `it` で M1・M3・M4・M8 をまとめて検査 |
| `src/build-css.test.ts` | 工程内 `build({ configFile: 'vite.config.ts', build: { write: false } })` で本番ビルドし、`src/` 配下(`ui/theme/` を除く)の各 CSS の先頭クラスがバンドル CSS に含まれるかを検査 |
| `vite.config.ts`・`scripts/build-config.ts` | 設定読み込み時に `resolveBuildConfig(process.env)` を解決。`VITE_APP_ENV` 未設定/`production` → 本番、`preview` → プレビュー、それ以外は例外 |
| `docs/design/issue-158-statusbar-blur.md` §5 | M1・M3・M4・M8 の定義 |
| 業務標準 02・05、指導文書 G-04・G-10 | 権限境界、red 先行確認・対照実験、完全一致アサーション、テスト名規約 `<Issue記号>-<記号と番号>: <説明>` |
| `tsconfig.node.json` | `files` 列挙方式。`scripts/*.test.ts` は現状 `tsc -b` の対象外(`src/` 配下のテストは `tsconfig.app.json` で対象) |

### 1.2 ヒアリング済み確定事項(前提。再検討しない)

1. A 案: ビルド系テストは `npm test` に残す。`.github/workflows/ci.yml` は変更しない(#174 が並行変更中)。本番ビルドは build-css と1回を共有し、`npm test` 1回あたりのフルビルドを 3回 → 2回(本番1 + プレビュー1)にする。検査範囲(M1・M3・M4・M8 の本番・プレビュー両方、build-css の既存検査)は維持する。
2. `buildTo` で `mkdtempSync` 後にビルドが失敗しても一時ディレクトリを残さない。
3. テスト実行が作業ツリーの `dist/` を一切変更しない(現状 build-css が `dist/sw.js`・`dist/workbox-*.js` を書き出す)。
4. テスト名を 05 号の命名規約に合わせる(記号は本設計で決める)。
5. 判定は決定的な指標で行う。所要時間は参考値扱い。
6. 既存2ファイル(`src/build-css.test.ts`・`scripts/status-bar-build.test.ts`)の削除は、オーナー許可済み(2026-11-28、首席経由)。

### 1.3 設計判断と根拠

| # | 判断 | 根拠 |
| --- | --- | --- |
| D1 | 共有方式は **1ファイルへの統合**。`src/build-css.test.ts` と `scripts/status-bar-build.test.ts` を削除し、`scripts/build-artifacts.test.ts` に統合する。本番ビルド1回の成果物を B1 と M 系で共有する | vitest はファイル単位で別ワーカー・別モジュールグラフになるため、モジュール内キャッシュはファイルをまたいで効かない。`globalSetup` 方式は `vite.config.ts` に `test` 設定の追加が必要で、かつ無関係なファイル単体実行(`npx vitest run <file>`)でも毎回2ビルド走るため不採用。ファイルシステム上のキャッシュはキー設計・無効化が必要で過剰。統合ならファイル内の `beforeAll` 1回で確実に1ビルドになる |
| D2 | 本番ビルドも **子プロセス `vite build --outDir <一時ディレクトリ>`** で行う(工程内 `build()` をやめる) | 実測 E2: 工程内 `build({ write: false })` でも PWA が `dist/sw.js`・`dist/workbox-*.js` を書き出す。実測 E1: CLI の `--outDir` を一時ディレクトリにすると `sw.js`・`workbox-*.js` も含め全成果物がそこへ出て `dist/` は作られない。また `vite.config.ts` は `process.env` を読み込み時に解決するため、環境の明示には子プロセスが確実(現行 status-bar-build と同じ理由) |
| D3 | B1 のバンドル CSS は、出力ディレクトリ配下の `*.css` を再帰収集して連結する | 工程内ビルドの `output` の `type==='asset' && fileName.endsWith('.css')` と同じ集合(出力はすべて `assets/*.css`。実測 E1 で8件) |
| D4 | 子プロセスの環境に `NODE_ENV: 'production'` を明示する | vitest ワーカーは `NODE_ENV=test`。実測 E3: `NODE_ENV=test` のまま `vite build` すると JS のチャンク分割が変わる(`npm run build` と成果物が一致しない)。CSS 連結結果・`manifest.webmanifest` は同一だったため現行検査の結論は変わらないが、`npm run build` との一致を優先する |
| D5 | 一時ディレクトリの後始末は `buildTo` 内の `try/catch` で行い、失敗時は削除してから例外を再送出する。成功時の削除は `afterAll` で `removeBuild` | 指摘2の直接の解消。`buildTo` が返る前に例外になっても残らない |
| D6 | `buildTo` に `run`(ビルド実行関数)と `tmpRoot`(一時ディレクトリの親)を注入できるようにし、失敗時の後始末を実ビルドなしの単体テスト(H1・H2)で決定的に検査する | 05 号の red 確認と確定事項5(決定的指標)。実ビルドを伴わないので速い |
| D7 | ビルド回数の計測用に、既定の `runViteBuild` は環境変数 `BUILD_ARTIFACTS_LOG`(絶対パス)が設定されているときだけ、そのファイルへ `env` 名を1行追記する | 確定事項5「フルビルド回数を数える」を壁時計に頼らず判定するため。未設定時は何もしない |
| D8 | ヘルパー `scripts/build-artifacts.ts` を `tsconfig.node.json` の `files` に追加する(テストファイルは追加しない) | 既存の `scripts/*.ts` 非テストファイルは全て `files` に列挙されている慣行に合わせる。統合で `src/` から抜ける build-css の検査ロジックは型検査対象外になるが、`scripts/*.test.ts` を対象外とする現行慣行どおり(§6 R3) |
| D9 | テスト名の Issue記号は `I161`。M 系は #158 の記号 M1・M3・M4・M8 をそのまま番号に使い、環境を `-本番`/`-プレビュー` で区別。build-css 由来は `B1`、ヘルパーは `H1`・`H2` | 05 号「記号と番号は設計書の受け入れ条件・テスト表で使ったものをそのまま」。本設計書 §3.3 のテスト表が正本。Epic 外 Issue の既存例 `I85-U-01` に倣う |

## 2. 外部事実の確認記録

| # | 確認内容 | 実行したコマンド(要旨) | 結果 |
| --- | --- | --- | --- |
| E0 | バージョン | `npx vite --version` / `npx vitest --version` / `node --version` | vite 6.4.4、vitest 3.2.7、node v24.20.0 |
| E1 | CLI の `--outDir` に PWA 成果物も出るか | `node_modules/.bin/vite build --outDir <scratchpad>/out-prod --emptyOutDir --logLevel silent` の後 `ls` / `find -name '*.css'` / `ls dist` | outDir に `assets/ favicon.svg icons/ index.html manifest.webmanifest sw.js workbox-*.js`。CSS は `assets/` 直下に8件。作業ツリーの `dist/` は存在しないまま。所要 5.2s(壁時計、参考) |
| E2 | 現行 build-css が `dist/` に書くか | `dist/` が無い状態で `npx vitest run src/build-css.test.ts` → `ls dist` | 1 passed。`dist/sw.js`・`dist/workbox-6fc47aa9.js` が作られた(確認後に `dist/` を削除し開始時の状態へ復旧) |
| E3 | `NODE_ENV=test` の影響 | `NODE_ENV=test vite build --outDir <scratchpad>/out-test` と E1 を比較(`find -type f` の diff、`assets/*.css` 連結の `shasum`、manifest の diff) | JS チャンク構成が異なる(`Dialog-*.js` 等が増減、assets 1.3M→1.8M)。CSS 連結の sha は同一、manifest は同一 |
| E4 | ビルド失敗の再現手段 | `VITE_APP_ENV=bogus vite build --outDir <scratchpad>/out-bad` | exit=1(`resolveAppEnv` の例外)。vite は出力先を作らない(=現行の残留は `mkdtempSync` 由来) |
| E5 | `os.tmpdir()` が `TMPDIR` に従うか | `TMPDIR=/private/tmp/xyz node -e "console.log(require('os').tmpdir())"` | `/private/tmp/xyz` |
| E6 | vite を起動するコードの所在 | `grep -rlE "from 'vite'\|\.bin/vite" src scripts` | `src/build-css.test.ts`・`scripts/status-bar-build.test.ts` の2件のみ |
| E7 | vitest は vite.config.ts を設定として読むか | `ls vitest.config.*` → 該当なし。`package.json` の `test` は `vitest run` のみ | vitest 専用設定は無く、vitest の親プロセスも `vite.config.ts` を読み込む。トップレベルで無条件に throw すると親が落ち、テストは1件も走らない(独立レビュー指摘、統括判定済み) |
| E8 | beforeAll 例外時の vitest 3.2.7 の挙動(コード) | `sed -n 1700,1715p node_modules/@vitest/runner/dist/chunk-hooks.js` | `callSuiteHook(... "beforeAll" ...)` の catch で `markTasksAsSkipped(suite, runner)` の後に再 throw。配下の it は skipped、suite は fail |
| E9 | 子プロセスのビルドだけを失敗させる注入の実測 | `vite.config.ts` の `const buildConfig = …` の直前に `if (process.argv.includes('build')) throw new Error('I161 注入');` を一時追加し、`TMPDIR=<scratchpad>/tmpA npx vitest run <一時プローブ> scripts/status-bar-build.test.ts scripts/theme-colors.test.ts`。一時プローブは `beforeAll` で子プロセス `vite build`(`NODE_ENV=production`)を呼び、配下に it 2件を持つ1 describe。実行後にプローブ削除・`git checkout vite.config.ts` で復旧 | vitest の親は落ちず、`Test Files 2 failed \| 1 passed (3)`、`Tests 2 failed \| 8 passed \| 2 skipped (12)`。theme-colors 8件 pass、プローブは it 2件 skipped・suite fail(エラー位置はプローブの `beforeAll` 内 `execFileSync`)、現行 status-bar-build は2件 fail。`ls tmpA` に `sbg-preview-*`・`sbg-production-*` が残った(= Issue 指摘2の残留を再現)。`dist/` は作られず |

実挙動未確認: vitest で `-t` 指定により describe 内の全テストが除外されたとき、その describe の `beforeAll`(ビルド)が実行されないこと。受け入れ条件の判定には使わない。

## 3. 変更対象と仕様

### 3.1 変更ファイル

| ファイル | 変更 |
| --- | --- |
| `scripts/build-artifacts.ts`(新規) | §3.2 のヘルパー |
| `scripts/build-artifacts.test.ts`(新規) | §3.3 のテスト。B1 は旧 `src/build-css.test.ts` の検査ロジックを移設(先頭コメントの sideEffects の注意書きも移す)。M 系は旧 `scripts/status-bar-build.test.ts` の検査を項目ごとの `it` に分割 |
| `src/build-css.test.ts` | 削除(B1 へ統合) |
| `scripts/status-bar-build.test.ts` | 削除(M 系へ統合) |
| `tsconfig.node.json` | `files` に `./scripts/build-artifacts.ts` を追加 |

既存2ファイルの削除はオーナー許可済み(2026-11-28、首席経由。§1.2 の6)。上記以外(特に `.github/workflows/ci.yml`・`vite.config.ts`・`package.json`)は変更しない。

### 3.2 ヘルパー `scripts/build-artifacts.ts`

```ts
import type { AppBuildEnv } from './build-config.ts';

export type BuildRunner = (outDir: string, env: AppBuildEnv) => void;

export interface BuildToOptions {
  /** 一時ディレクトリの親。既定 os.tmpdir() */
  tmpRoot?: string;
  /** ビルド実行関数。既定 runViteBuild */
  run?: BuildRunner;
}

/** 子プロセスで vite build を実行する(既定の BuildRunner) */
export function runViteBuild(outDir: string, env: AppBuildEnv): void;

/** 一時ディレクトリを作ってビルドし、そのパスを返す。失敗時は一時ディレクトリを削除して例外を再送出する */
export function buildTo(env: AppBuildEnv, options?: BuildToOptions): string;

/** buildTo の戻り値を削除する。undefined は何もしない */
export function removeBuild(outDir: string | undefined): void;
```

- `buildTo`: `fs.mkdtempSync(path.join(tmpRoot, \`mj3-build-${env}-\`))` → `try { run(outDir, env) } catch (e) { fs.rmSync(outDir, { recursive: true, force: true }); throw e; }` → `return outDir`。
- `runViteBuild`: `execFileSync(<ROOT>/node_modules/.bin/vite, ['build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], { cwd: ROOT, env: { ...process.env, NODE_ENV: 'production', VITE_APP_ENV: env }, stdio: 'pipe' })`。`--logLevel` は `error` とする(PR #181 の Codex 自動レビュー指摘により `silent` から変更。`silent` ではビルド失敗時の stderr が空になり、例外メッセージから失敗原因を追えない。2026-11-28)。`ROOT` は `path.resolve(import.meta.dirname, '..')`。ログ先の環境変数が空でなければ、ビルド成功後に `fs.appendFileSync(log, \`${env}\n\`)`。
  - 環境変数は `scripts/build-config.ts` 39〜40行と同じく**定数キー経由**で参照する: `const ENV_BUILD_ARTIFACTS_LOG = 'BUILD_ARTIFACTS_LOG';` → `process.env[ENV_BUILD_ARTIFACTS_LOG]`。`tsconfig.node.json` は `@tsconfig/strictest` を継承し `noPropertyAccessFromIndexSignature: true` のため `process.env.BUILD_ARTIFACTS_LOG` は TS4111 になり、文字列リテラル添字 `process.env['BUILD_ARTIFACTS_LOG']` は Biome の `useLiteralKeys` に当たる。
- `removeBuild`: `outDir === undefined` なら何もしない。それ以外は `fs.rmSync(outDir, { recursive: true, force: true })`(`beforeAll` が失敗して `outDir` が未代入のまま `afterAll` が走る場合に備える)。
- 一時ディレクトリ接頭辞は `mj3-build-`(旧 `sbg-` から変更。受け入れ条件 A4 で両方を検査する)。

### 3.3 テスト `scripts/build-artifacts.test.ts`

構成:

- `describe.each([['本番', 'production', 'surface-container'], ['プレビュー', 'preview', 'quaternary']])` の各 describe で、`beforeAll(() => { outDir = buildTo(env) }, 120_000)`、`afterAll(() => removeBuild(outDir))`。各 `it` は `outDir` を読むだけでビルドしない。→ ファイル全体でビルドは本番1回・プレビュー1回。
- B1 は本番の describe 内にだけ置く。
- H1・H2 は別 describe(実ビルドなし)。各テストで `fs.mkdtempSync` した専用 `tmpRoot` を使い、テスト末尾(`finally`)で `tmpRoot` を削除する。

テスト表(この表の記号・名前が正本):

| テスト名 | 検査内容(期待値はリテラルまたは tokens.css から独立に読む) |
| --- | --- |
| `I161-B1: src 配下の各 CSS の固有クラスが本番ビルド成果物に含まれる` | 旧 build-css と同じ。対象は `src/` 配下(`ui/theme/` 除外)の全 CSS。旧 `SRC = __dirname` は移設先では `path.resolve(ROOT, 'src')` になる(除外判定・`relative` もこれを基準にする)。バンドル CSS は outDir 配下の `*.css` 全連結(D3)。連結長 > 0、対象数 > 0、`missing` が `[]`。`bundledCss.includes(\`.${cls}\`)` の直前に部分一致の理由コメント(「バンドル CSS は全ファイル連結で、クラス名の出現有無だけを見るため」の趣旨)を付ける(05 号) |
| `I161-M1-<本番\|プレビュー>: ガード要素が #root より前にちょうど1つある` | 旧 M1 と同じ |
| `I161-M3-<本番\|プレビュー>: CSS アセットに status-bar-guard セレクタが残る` | 旧 M3 と同じ(部分一致の理由コメントを付す: 05 号) |
| `I161-M4-<本番\|プレビュー>: theme-color meta が <role> の light/dark 値に一致する` | 旧 M4 と同じ(`toEqual` 完全一致) |
| `I161-M8-<本番\|プレビュー>: manifest の theme_color・background_color が <role> の dark 値に一致する` | 旧 M8 と同じ |
| `I161-H1: ビルド失敗時に一時ディレクトリを残さず例外を再送出する` | `run` に「受け取った outDir が存在することを確かめてから `new Error('注入')` を投げる」関数を渡す。`buildTo` が同じメッセージで throw し、`fs.readdirSync(tmpRoot)` が `[]` |
| `I161-H2: ビルド成功時は tmpRoot 配下の作成済みディレクトリを返し、run に同じパスと env を渡す` | `run` は引数を記録するだけ。戻り値の親が `tmpRoot`、`readdirSync(tmpRoot)` がその basename 1件のみ、basename が `mj3-build-preview-` で始まり、記録が `[[戻り値, 'preview']]`。`removeBuild` 後に `readdirSync(tmpRoot)` が `[]` |

テスト数は 11 件(B1 1、M 系 8、H 2)。

## 4. 受け入れ条件

検収担当は以下を順に実行する。`$S` は作業用の一時ディレクトリ(作業ツリー外)とし、最後に削除する。`grep -c` や `grep` は一致0件のとき終了コード1を返すが、0件が合格条件の項目(A4・A5・A9)ではそれを失敗とみなさない(出力の値・有無で判定する)。

- [ ] A1(構成): `git diff --name-status --no-renames origin/main` が §3.1 の5ファイル(新規2・削除2・変更1)と本設計書のみ。`.github/workflows/ci.yml`・`vite.config.ts`・`package.json` に差分がない。
- [ ] A2(vite 起動箇所): `grep -rlE "from 'vite'|\.bin/vite" src scripts` の出力が `scripts/build-artifacts.ts` の1行のみ。
- [ ] A3(テスト名): `npx vitest run scripts/build-artifacts.test.ts --reporter=verbose` で §3.3 の 11 件が表の名前どおり(`<本番|プレビュー>` と `<role>` は展開後)に表示され、全件 pass。
- [ ] A4(ビルド回数・tmp 残留・`dist/` 不変を1回の `npm test` で判定):
  1. `S=$(mktemp -d)`。`dist/` があれば `find dist -type f -print0 | sort -z | xargs -0 shasum > $S/before.txt`、無ければ `echo absent > $S/before.txt`。`mkdir $S/tmp`。
  2. `TMPDIR=$S/tmp BUILD_ARTIFACTS_LOG=$S/builds.log npm test` が全件 pass。
  3. `cat $S/builds.log` が `production` と `preview` の2行ちょうど(順序問わず)。
  4. `ls $S/tmp | grep -cE '^(mj3-build-|sbg-)'` の出力が `0`(終了コード1は正常)。
  5. 手順1と同じ方法で `$S/after.txt` を作り、`diff $S/before.txt $S/after.txt` が差分なし(`dist/` が無かった場合は `dist/` が作られていない)。`dist/` は `.gitignore` 対象で `git status` に出ないため、`dist/` 不変はこの shasum 比較だけで判定する。
- [ ] A5(実ビルド失敗時の後始末)。vitest は `vite.config.ts` を自身の設定として読むため(E7)、無条件の throw は使わない。子プロセスの `vite build` だけが失敗する注入を使う(E9 で実測済み)。
  1. 改変: `vite.config.ts` の `const buildConfig = resolveBuildConfig(process.env);` の直前に1行 `if (process.argv.includes('build')) throw new Error('I161 注入');` を追加する(vitest 親プロセスの argv は `vitest run …` で `build` を要素に含まず、`runViteBuild` が起動する子プロセスは `vite build …` で含む)。
  2. 実行: `mkdir $S/tmp2` → `TMPDIR=$S/tmp2 npx vitest run scripts/build-artifacts.test.ts`。
  3. 期待: 実行自体は最後まで進み集計が出る。`I161-H1`・`I161-H2` は pass。本番・プレビュー各 describe は `beforeAll` の例外で suite が fail となり、配下の `I161-B1`・M 系 8件は skipped(E8・E9 の vitest 3.2.7 実挙動。集計は `Tests 2 passed | 9 skipped`、失敗は Failed Suites 側に2件、エラーに `I161 注入` を含む)。`ls $S/tmp2 | grep -c '^mj3-build-'` の出力が `0`(終了コード1は正常)。`dist/` は A4 手順1と同じ方法で不変。
  4. 復旧: `git checkout vite.config.ts`。`git diff vite.config.ts` が空。
- [ ] A6(red: H1・H2)。05 号の順序(対照実験 → 復旧 → 本番改変 → 復旧)で行い、各段で `npx vitest run scripts/build-artifacts.test.ts -t 'I161-H'` を実行する。
  1. 対照実験: `buildTo` の catch ブロック内にコメント1行(`// I161 対照`)だけを追加 → H1・H2 とも pass。復旧: `git checkout scripts/build-artifacts.ts`(製造コミット後の前提。未コミットなら手で元に戻し `git diff` で確認)。
  2. 本番改変1(H1): catch 内の `fs.rmSync(...)` をコメントアウト → `I161-H1` が fail(`readdirSync(tmpRoot)` が `[]` でない)。復旧: `git checkout scripts/build-artifacts.ts`。
  3. 本番改変2(H2): `buildTo` が `run` に渡すパスを `outDir` から `path.join(outDir, 'x')` に変える → `I161-H2` が fail(run に渡ったパスの記録が戻り値と一致しない)。復旧: `git checkout scripts/build-artifacts.ts`。
  4. 復旧後に H1・H2 とも pass。
- [ ] A7(red: 検査範囲の維持)。05 号の順序で、各段で `npx vitest run scripts/build-artifacts.test.ts` を実行し、各改変の直後に復旧する。
  1. 対照実験: `index.html` の `<body>` 直後にコメント `<!-- I161 -->` を追加 → 11件全 pass。復旧: `git checkout index.html`。
  2. 本番改変1: `index.html` からガード要素の行(`<div class="status-bar-guard" …>`)を削除 → `I161-M1-本番`・`I161-M1-プレビュー` が fail。復旧: `git checkout index.html`。
  3. 本番改変2: `src/main.tsx` の `import './ui/theme/status-bar-guard.css';` を削除 → `I161-M3-本番`・`I161-M3-プレビュー` が fail。復旧: `git checkout src/main.tsx`。
  4. 本番改変3: `scripts/build-config.ts` の本番 `statusBarColorRole` を `'quaternary'` に変更 → `I161-M4-本番`・`I161-M8-本番` が fail(プレビュー側は pass)。復旧: `git checkout scripts/build-config.ts`。
  5. 本番改変4: どこからも import されない `src/ui/i161-probe.css`(内容 `.i161-probe { color: inherit; }`)を新規作成 → `I161-B1` が fail し、`missing` に `ui/i161-probe.css: .i161-probe` が出る。復旧: `rm src/ui/i161-probe.css`。
  6. 全復旧後に `git status --porcelain` が改変前と同じで、11件全 pass。
- [ ] A8(静的検査): `npm run lint` / `npm run typecheck` / `npm run format:check` / `npm test` がすべてエラーなし。
- [ ] A9(ホームディレクトリ名): `git diff origin/main | grep -n "$(basename "$HOME")"` が0件(docs を除外しない。0件時の終了コード1は正常)。ヒットがあれば目視で確認する。
- [ ] A10(後始末): `rm -rf "$S"`。`git status --porcelain` の出力が本設計の変更ファイル(§3.1)だけ、製造のコミット済みなら空。`dist/` は ignore 対象でここには出ないため、`dist/` 不変は A4 手順5の shasum 比較で判定済みとする。
- [ ] A11(参考値・合否に使わない): `time npm test` の壁時計と `load average` を記録。負荷が高い(load avg がコア数の半分超など)場合は `time npx vitest run --pool=forks --maxWorkers=1` でも計測し、両方を PR に記録する。統括実測の現状値は `npm test` 51.1s(status-bar-build 除外で 49.2s、build-css 約17s、load avg 約3)。

## 5. 後続Issueへの引き継ぎ

- #174(CI 変更)と本 Issue は `ci.yml` を共有しない。本 Issue のテストは `npm test` 内で完結し、CI の `npm run build` 後に `npm test` が走っても `dist/` を変えない(A4)。
- #146(テストの一過性不具合)には踏み込まない。本 Issue でワーカー負荷が下がる可能性はあるが、#146 の解消判定には使わない。
- `scripts/*.test.ts` が `tsc -b` の対象外である点は既存の慣行であり、本 Issue では変えない。必要なら別 Issue で扱う。
- 新しいビルド成果物の検査を追加するときは、本ファイルの既存 `beforeAll` の成果物を使い、ビルド回数を増やさない(A4 手順3)。

## 6. 残留リスク

- R1: 統合で1ファイル内の2ビルドが直列になる。以前はファイル並列で同時に走っていたため、本ファイル単体の所要は「本番+プレビュー」の和(約11秒)になる。全体時間は参考値で見る(A11)。
- R2: `beforeAll` のタイムアウトは既定 10 秒のため、必ず第2引数 `120_000` を付ける。付け忘れると負荷時に hook timeout で落ちる。
- R3: B1 のロジックが `src/`(型検査対象)から `scripts/`(テストは型検査対象外)へ移る。ヘルパーは D8 で型検査対象にする。
- R4: `NODE_ENV: 'production'` 明示(D4)で、旧 status-bar-build とはビルド時の JS 構成が変わる。検査対象(HTML・CSS・manifest)は E3 で同一を確認済み。
