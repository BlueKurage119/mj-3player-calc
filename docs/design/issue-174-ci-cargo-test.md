# Issue #174 設計書: CI への cargo test 追加と開発ツール・ワークフロー整備

- 対象Issue: #174(マイルストーン v2.0.1。baseブランチ: `main`)
- 作業ブランチ: `chore/issue-174-ci-cargo-test`(統括担当が作成済み)
- 基準コミット: `main` `ef445b7`
- 設計担当モデル: `Claude Opus 5.5`
- 状態: ヒアリング済み確定事項(Q1〜Q4・U1)と独立レビュー(AGY Gemini 4 Neon)指摘を反映済み。未決事項なし
- 設計承認: 首席統括(オーナー委任)、2026-11-28。製造方式: AGYスキル式(Gemini 4 Hydrogen)

## 1. 参照資料と設計判断の根拠

### 1.1 ヒアリング済みの確定事項(統括担当より受領。オーナー回答 2026-11-28。再検討・上書きしない)

| # | 確定事項 | 本設計での反映 |
| --- | --- | --- |
| Q1 | `cargo test` は `.github/workflows/ci.yml` の既存の `verify` ジョブに入れる。`build:wasm` ステップの直後に、crate ごとに2ステップ置く(`wasm/decomposer`・`wasm/engine`)。`if: "!cancelled()"` を付ける。キャッシュ(rust-cache 等)は導入しない | §3.1 |
| Q2 | Rust の警告で CI を失敗扱いにしない(`RUSTFLAGS=-D warnings` は付けない)。警告の解消は `wasm/decomposer/src/counts.rs:32` の修正(`PackedCountsIterator<'_, N>`)だけ | §3.1・§3.3 |
| Q3 | ベンチのタイムアウト不具合は `bench/engine/run-chrome.mjs`(13–14 行の既定値 `1e12`)と `bench/engine/main.ts`(109–110 行の既定値 `Number.POSITIVE_INFINITY`)の両方を直す。上限なしの場合はタイマー/打ち切りを行わない。上限超え値の丸め・警告は行わない | §3.4 |
| U1 | `npm ci` ステップに `if: "!cancelled() && steps.wasm.outcome == 'success'"` を付ける(既存の `id: wasm` を使う。案D。首席判断・オーナー委任) | §3.1・§7 |
| Q4 | ステップ名 `手牌分解器(WASM)のビルド` を、`ci.yml`・`deploy.yml`・`preview-cloud-run.yml` の3ファイルとも `WASM(手牌分解器・計算エンジン)のビルド` に変える | §3.2 |

### 1.2 参照した資料・ソースコード

- `AGENTS.md`、`docs/rules/02-design-protocol.md`、`docs/rules/advisory/G-04-verification-basics.md`
- Issue #174 本文(`gh issue view 174`)
- `.github/workflows/ci.yml`・`deploy.yml`・`preview-cloud-run.yml`
- `package.json`(`build:wasm` は `cd wasm/decomposer && wasm-pack build && cd ../engine && wasm-pack build`。両 crate をビルドしている)
- `wasm/decomposer/src/counts.rs`、`wasm/decomposer/Cargo.toml`・`wasm/engine/Cargo.toml`(いずれも `crate-type = ["cdylib", "rlib"]`。engine は decomposer に依存しない)
- `bench/engine/run-chrome.mjs`・`bench/engine/main.ts`、`tsconfig.app.json`(`include` に `./bench` があり `main.ts` は `npm run typecheck` の対象)、`biome.json`(`ignore` は `wasm`・`package.json` のみで `bench/` は lint・整形の対象)
- `docs/design/issue-138-engine.md`(ベンチの起動手順: `npm run build:engine-bench` → `npx vite preview --config vite.engine-bench.config.ts --port 4317 --strictPort` → `node bench/engine/run-chrome.mjs http://localhost:4317/`)

### 1.3 問題構造と判断の根拠

- **ベンチ不具合の本体は `main.ts` 側の `setTimeout`**。`run-chrome.mjs` は既定値をそのまま `cdp.evaluate` の式文字列へ埋め込み(190 行 `${handBudgetMs}, ${runTimeoutMs}`)、ブラウザ内の `runOneHand` が `setTimeout(..., runTimeoutMs)` を張る(156–166 行)。HTML 仕様の `setTimeout` の遅延は WebIDL `long` に変換される(ToInt32 相当)ため、`1e12` は `-727379968`(負→0扱い)、`Infinity` は `0` になり、どちらも即時に `timeout` で解決して全手が `run 0 failed: error timeout` になる(§2 E4 の計算結果)。
- `handBudgetMs` は `cumulativeMs > handBudgetMs` の比較にしか使わず(200 行)、`1e12`・`Infinity` のどちらでも打ち切られない。不具合は `runTimeoutMs` だけだが、Q3 に従い両方の既定値を「上限なし」の表現に揃える。
- `Infinity` を `run-chrome.mjs` の既定値にすると、式文字列には `Infinity` と埋め込まれ、ブラウザのグローバル `Infinity` として評価される(有効な JavaScript 式)。これにより「上限なし」を両ファイルで同じ値で表せる。
- `cargo test` はホストターゲットでビルドされる(wasm32 ではない)。ローカルで両 crate とも合格し、engine は警告なし、decomposer は `counts.rs:32` の1件のみ(§2 E1・E2)。

## 2. 外部事実の確認記録

| # | 事実 | 実行したコマンド | 結果 |
| --- | --- | --- | --- |
| E1 | decomposer の `cargo test` が合格し、警告は `counts.rs:32` の1件のみ | `cd wasm/decomposer && cargo test 2>&1 \| grep -E "^warning\|^test result\|-->\|running"`(rustc 1.99.1 / cargo 1.99.1) | `warning: hiding a lifetime that's elided elsewhere is confusing` `--> src/counts.rs:32:17`、`(lib) generated 1 warning`、`running 9 tests` → `test result: ok. 9 passed; 0 failed; 0 ignored`、doctest `0 passed` |
| E2 | engine の `cargo test` が合格し、警告なし | `cd wasm/engine && cargo test 2>&1 \| grep -E "^warning\|^test result\|-->\|running"`(rustc 1.99.1 / cargo 1.99.1) | `warning` 行なし、`running 5 tests` → `test result: ok. 5 passed; 0 failed; 0 ignored`、doctest `0 passed` |
| E3 | 両 crate の `Cargo.lock` は Git 管理外 | `git check-ignore -v wasm/decomposer/Cargo.lock wasm/engine/Cargo.lock` | `wasm/decomposer/.gitignore:3:Cargo.lock`・`wasm/engine/.gitignore:3:Cargo.lock` |
| E4 | `setTimeout` 遅延値の 32bit 符号付き変換結果 | `node -e 'console.log(1e12\|0, Infinity\|0, 2147483647\|0, 2147483648\|0)'`、`node -e 'console.log(2**32+5000\|0, 4294967295\|0)'` | `-727379968 0 2147483647 -2147483648`、`5000 -1`(2^32 の剰余で折り返す。ToInt32 の計算値。ブラウザ実機での発火タイミングは**実挙動未確認**。Browser pane での実測を試みたがローカルファイルでは JS を実行できず断念) |
| E5 | 旧ステップ名の出現箇所 | `grep -n "WASM" .github/workflows/*.yml` | `ci.yml:51`・`deploy.yml:40`・`preview-cloud-run.yml:50` の3箇所(すべて `手牌分解器(WASM)のビルド`、括弧は半角) |
| E6 | ci.yml の `id: wasm` は現状で他から参照されていない(本設計で `npm ci` の `if` から参照する) | `grep -n "steps.wasm" .github/workflows/*.yml` | ヒットなし |
| E7 | ワークフローの起動条件 | `sed -n 1,10p .github/workflows/{preview-cloud-run,deploy}.yml` | `preview-cloud-run.yml` は `push`(`main`)と `workflow_dispatch`、`deploy.yml` は `workflow_dispatch` のみ。PR では `ci.yml` だけが走る |
| E8 | YAML をローカルで構文検査できる手段 | `ruby -ryaml -e 'y=YAML.load_file(".github/workflows/ci.yml"); puts y["jobs"]["verify"]["steps"].map{\|s\| s["name"]}.join(" \| ")'`(ruby 2.6.10) | 現行の13ステップ名が順に出力された。`actionlint` は未インストール(`which actionlint` → not found) |
| E9 | ベンチ実行に使う Chrome の存在 | `ls "/Applications/Google Chrome.app"`(`run-chrome.mjs` 41–42 行の固定パス) | 存在する |
| E10 | GitHub Actions の `working-directory`・`if: "!cancelled()"` の構文 | 実行なし(既存 `ci.yml` で `!cancelled()` を使用中であることのみ確認) | `working-directory` のステップ単位指定は**未確認**(GitHub 公式ドキュメント上の標準構文だが、本設計担当は実行で確かめていない。PR の CI で確認する。§6.3) |
| E11 | `ubuntu-latest` ランナーに rustc・cargo がプリインストールされている | 実行なし | **未確認**。ただし現行 ci.yml の「実行環境」ステップが `rustc --version` を実行し、`build:wasm`(cargo を内部で使う)が成功している実績から存在すると推定。PR の CI ログで確認する(§6.3) |

## 3. 変更内容・シグネチャ

### 3.1 `.github/workflows/ci.yml` — cargo test の追加(Q1・Q2)

`build:wasm` ステップ(現 51–53 行)の直後、`npm ci` ステップの前に次の2ステップを挿入する。

```yaml
      - name: WASM(手牌分解器・計算エンジン)のビルド
        id: wasm
        run: npm run build:wasm

      - name: cargo test(手牌分解器)
        if: "!cancelled()"
        working-directory: wasm/decomposer
        run: cargo test

      - name: cargo test(計算エンジン)
        if: "!cancelled()"
        working-directory: wasm/engine
        run: cargo test

      - name: npm ci
        id: install
        if: "!cancelled() && steps.wasm.outcome == 'success'"
        run: npm ci
```

- ステップ名の括弧は半角 `(` `)`(既存の `Rust ツールチェーン(wasm32)` に合わせる)。
- `env: RUSTFLAGS` 等は付けない(Q2)。`actions/cache`・`Swatinem/rust-cache` 等は追加しない(Q1)。
- `npm ci` に `if: "!cancelled() && steps.wasm.outcome == 'success'"` を追加する(確定 U1・案D)。これにより cargo test が失敗しても、WASM のビルドが成功していれば `npm ci` 以降の検査は実行される。build:wasm が失敗したときは、WASM がないまま検査が走って二次的な失敗が並ぶのを避けるため、従来どおり `npm ci` 以降をスキップする。
- 上記の追加と §3.2 の改名以外は、他のステップ(`if` 条件・順序・名前)を変えない。

### 3.2 ステップ名の変更(Q4)

3ファイルのステップ名を次のとおり置換する。他の行は変えない。

| ファイル | 行(現) | 変更前 | 変更後 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | 51 | `手牌分解器(WASM)のビルド` | `WASM(手牌分解器・計算エンジン)のビルド` |
| `.github/workflows/deploy.yml` | 40 | 同上 | 同上 |
| `.github/workflows/preview-cloud-run.yml` | 50 | 同上 | 同上 |

括弧は半角、`・` は全角中黒。#171 が `preview-cloud-run.yml` を触る可能性があるため、同ファイルは該当1行以外を変更しない(競合を最小化する)。

### 3.3 `wasm/decomposer/src/counts.rs` — 警告の解消(Q2)

32 行の戻り値型だけを変える。

```rust
    pub fn iter(&self) -> PackedCountsIterator<'_, N> {
```

`PackedCountsIterator` の定義・他の行は変えない。

### 3.4 ベンチのタイムアウト既定値(Q3)

**`bench/engine/run-chrome.mjs` 13–14 行**

```js
let handBudgetMs = Number.POSITIVE_INFINITY;
let runTimeoutMs = Number.POSITIVE_INFINITY;
```

- 190 行の式文字列には `Infinity` として埋め込まれ、ブラウザ側でグローバル `Infinity` として評価される。190 行は変更しない。
- `--run-timeout`・`--hand-budget` の引数処理(26–29 行)は変えない。上限超え値(`2147483647` 超)の丸め・警告は追加しない。
- 13–14 行の直前に、次の趣旨の日本語コメントを1〜2行置く。「既定は上限なし。`setTimeout` の遅延は32bit符号付き整数に折り返されるため、1e12 などは負数(0ms扱い)になって即時に発火し、正の値に折り返される場合も意図した時間にはならない。上限なしは `Infinity` で表し、main.ts 側でタイマーを張らない」

**`bench/engine/main.ts` `runOneHand`(156–166 行付近)**

- 既定値(109–110 行の `Number.POSITIVE_INFINITY`)とシグネチャ(`BenchWindow.__bench.runOneHand` の型を含む)は変えない。
- `Number.isFinite(runTimeoutMs)` が真のときだけ、現行どおり `Promise.race` + `setTimeout` で打ち切る。偽(`Infinity`・`NaN` 等)のときは `client.requestEngine(...)` を直接 `await` し、タイマーを張らない。
- `requestEngine` の戻り型は `Promise<EngineResponse>`(`src/engine/client.ts:10`)なので、直接 await する分岐でも `as EngineWorkerMessage` のキャスト(現行 165 行相当)が必要になる。どちらの分岐でも、結果を `EngineWorkerMessage` として扱う形にする(後続の `res.type !== 'ok'` 判定と `res.message` 参照を変えないため)。`clearTimeout(timer)` は `timer` が `undefined` でも安全なので現行の位置のままでよい。
- `handBudgetMs` の判定(`if (cumulativeMs > handBudgetMs) break;`)は変更不要(`Infinity` との比較は常に偽で打ち切らない)。
- 既存コメント「1回の上限時間を超えたら…」に「上限が有限値のときだけ」の旨を補う。
- `0` や負値などの有限値を明示指定した場合は現行どおり即時打ち切りになる(Q3 により丸め・警告はしない)。

### 3.5 変更対象ファイルと変更禁止範囲

変更してよいのは次の6ファイルだけ(設計書自体を除く)。

1. `.github/workflows/ci.yml`(§3.1・§3.2)
2. `.github/workflows/deploy.yml`(§3.2 の1行のみ)
3. `.github/workflows/preview-cloud-run.yml`(§3.2 の1行のみ)
4. `wasm/decomposer/src/counts.rs`(32 行のみ)
5. `bench/engine/run-chrome.mjs`(13–14 行と直前コメントのみ)
6. `bench/engine/main.ts`(`runOneHand` のタイムアウト処理とコメントのみ)

`package.json`・`Cargo.toml`・`.gitignore`(Cargo.lock の扱い)・他のワークフローは変更しない。

## 4. 単体テスト

新規テストは追加しない(ワークフロー・ベンチ補助スクリプト・警告修正のみで、アプリの挙動は変わらない)。Rust 側は既存の `cargo test`(decomposer 9件・engine 5件)が通ることで担保する。

## 5. コミット粒度(製造担当向けの目安)

1. `counts.rs` の警告解消
2. ci.yml への cargo test 追加とステップ名変更(3ファイル)
3. ベンチのタイムアウト既定値修正(2ファイル)

## 6. 受け入れ条件チェックリスト

作業ディレクトリはリポジトリルート。比較基準は `main`。

### 6.1 静的確認

- [ ] A-1 変更範囲: `git diff --name-only main...HEAD` の出力が §3.5 の6ファイルと `docs/design/issue-174-ci-cargo-test.md` の部分集合であること(それ以外のパスが1つも出ないこと)
- [ ] A-2 旧ステップ名の消滅: `grep -rn "手牌分解器(WASM)のビルド" .github/workflows/` がヒット0件であること
- [ ] A-3 新ステップ名: `grep -rn "WASM(手牌分解器・計算エンジン)のビルド" .github/workflows/` がちょうど3件(`ci.yml`・`deploy.yml`・`preview-cloud-run.yml` に各1件)であること
- [ ] A-4 deploy.yml・preview-cloud-run.yml の差分: `git diff main...HEAD -- .github/workflows/deploy.yml .github/workflows/preview-cloud-run.yml` の変更行が、各ファイルの `- name:` 1行の置換(削除1行・追加1行)だけであること
- [ ] A-5 ci.yml の構文とステップ順: 次を実行し、出力が `Checkout | Setup Node.js | 実行環境 | Rust ツールチェーン(wasm32) | wasm-pack のインストール | WASM(手牌分解器・計算エンジン)のビルド | cargo test(手牌分解器) | cargo test(計算エンジン) | npm ci | npm run build | npm run check:theme | npm run lint | npm run typecheck | npm run format:check | npm test` と一致すること(YAML として読めない場合は不合格)
  ```sh
  ruby -ryaml -e 'y=YAML.load_file(".github/workflows/ci.yml"); puts y["jobs"]["verify"]["steps"].map{|s| s["name"]}.join(" | ")'
  ```
- [ ] A-6 cargo test ステップの内容: 次を実行し、出力がちょうど2行で、1行目が `{"if"=>"!cancelled()", "working-directory"=>"wasm/decomposer", "run"=>"cargo test"}`、2行目が `{"if"=>"!cancelled()", "working-directory"=>"wasm/engine", "run"=>"cargo test"}` と厳密に一致すること(キー順不同。余分なキー(`env` 等)があれば不合格)
  ```sh
  ruby -ryaml -e 'y=YAML.load_file(".github/workflows/ci.yml"); y["jobs"]["verify"]["steps"].select{|s| s["name"].to_s.start_with?("cargo test")}.each{|s| p s.reject{|k,_| k=="name"}}'
  ```
- [ ] A-6b npm ci ステップの内容: 次を実行し、出力が1行で `{"id"=>"install", "if"=>"!cancelled() && steps.wasm.outcome == 'success'", "run"=>"npm ci"}` と厳密に一致すること(キー順不同、余分なキーなし)。あわせて A-5 の出力で、`WASM(手牌分解器・計算エンジン)のビルド` ステップが `id: wasm` を持つことを `ruby -ryaml -e 'y=YAML.load_file(".github/workflows/ci.yml"); puts y["jobs"]["verify"]["steps"].find{|s| s["id"]=="wasm"}["name"]'` の出力 `WASM(手牌分解器・計算エンジン)のビルド` で確かめる
  ```sh
  ruby -ryaml -e 'y=YAML.load_file(".github/workflows/ci.yml"); y["jobs"]["verify"]["steps"].select{|s| s["name"]=="npm ci"}.each{|s| p s.reject{|k,_| k=="name"}}'
  ```
- [ ] A-6c 他の2ワークフローの構文: 次を実行し、例外なく終了し(終了コード0)、各ファイルについて `WASM(手牌分解器・計算エンジン)のビルド` を含むステップ名の一覧が出力されること
  ```sh
  ruby -ryaml -e '%w[deploy preview-cloud-run].each{|f| y=YAML.load_file(".github/workflows/#{f}.yml"); puts f + ": " + y["jobs"].values.flat_map{|j| (j["steps"]||[]).map{|s| s["name"]}}.compact.join(" | ")}'
  ```
- [ ] A-7 キャッシュ・RUSTFLAGS を入れていない: `grep -nE "rust-cache|actions/cache|RUSTFLAGS" .github/workflows/ci.yml` がヒット0件であること
- [ ] A-8 counts.rs: `git diff main...HEAD -- wasm/decomposer/src/counts.rs` の変更が `pub fn iter(&self) -> PackedCountsIterator<'_, N> {` への1行置換だけであること
- [ ] A-9 ベンチ既定値: `grep -n "1e12" bench/engine/run-chrome.mjs bench/engine/main.ts` がヒット0件、かつ `grep -n "Number.POSITIVE_INFINITY" bench/engine/run-chrome.mjs` が `handBudgetMs`・`runTimeoutMs` の2行を含むこと
- [ ] A-10 main.ts のタイマー条件: `grep -n "Number.isFinite(runTimeoutMs)" bench/engine/main.ts` が1件以上ヒットし、該当箇所を読んで「有限値のときだけ `setTimeout` を張り、非有限値のときは `requestEngine` を直接 await する」構造であること(§3.4)。`runOneHand` の引数と既定値(109–110 行相当)が `main` から変わっていないこと

### 6.2 ローカル実行

- [ ] B-1 decomposer: `(cd wasm/decomposer && cargo clean && cargo test 2>&1)` を実行し(`cargo clean` は警告を再出力させるため)、`test result: ok. 9 passed; 0 failed; 0 ignored` が出て、出力に `^warning` で始まる行が0件であること
- [ ] B-2 engine: `(cd wasm/engine && cargo clean && cargo test 2>&1)` で `test result: ok. 5 passed; 0 failed; 0 ignored` が出て、`^warning` 行が0件であること
- [ ] B-3 リポジトリ検査: `npm ci` → `npm run build:wasm` の後、`npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべて終了コード0であること
- [ ] B-4 ベンチ(既定=上限なしで打ち切られない): `npm run build:engine-bench` → `npx vite preview --config vite.engine-bench.config.ts --port 4317 --strictPort` を起動し、`node bench/engine/run-chrome.mjs http://localhost:4317/ --configs A --hands S1-01 --runs 2` を実行して、標準エラーの `[A] S1-01 ...` 行が `runs=2` を含み、`ERR=` を含まないこと
- [ ] B-5 ベンチ(有限の上限は従来どおり効く): 同じ preview に対し `node bench/engine/run-chrome.mjs http://localhost:4317/ --configs A --hands S1-01 --runs 2 --run-timeout 1` を実行し、`[A] S1-01 ...` 行が `ERR=run 0 failed: error timeout` を含むこと
- [ ] B-6 後始末: B-4 で自分が起動した preview をポート 4317 を指定して停止し(一括終了は禁止。業務標準01)、`lsof -i :4317` が空であること。`--out` を使った場合の出力ファイル・一時ファイルを削除し、`git status --porcelain` に意図しないファイルがないこと

### 6.3 push 後に確認する項目(PR の CI ログ)

次の2段階で確認する。

1. §6.1・§6.2 がすべて通過したら、検収担当が push して PR を作成する。
2. PR の CI(「CI / 検証」ジョブ)が完了した後、そのログで C-1〜C-4 を確認する。C-5 は PR へのコメントで記録する。

- [ ] C-1 ステップ `WASM(手牌分解器・計算エンジン)のビルド` が表示され成功していること
- [ ] C-2 ステップ `cargo test(手牌分解器)` が成功し、ログに `test result: ok. 9 passed` が出ていること
- [ ] C-3 ステップ `cargo test(計算エンジン)` が成功し、ログに `test result: ok. 5 passed` が出ていること
- [ ] C-4 ジョブ全体が成功し、`npm ci` 以降のステップがスキップされずに実行されていること(`npm ci` の `if` 条件 `!cancelled() && steps.wasm.outcome == 'success'` が真になっていること)
- [ ] C-5 C-2・C-3 の実行時間を PR へのコメントで記録する(参考値。合否は付けない。キャッシュ未導入の影響の把握用)

`deploy.yml`(手動起動のみ)・`preview-cloud-run.yml`(`main` への push で起動)は PR では走らないため、改名後の実行は本 Issue の受け入れ条件に含めない(A-3・A-4 の静的確認で足りるとする。マージ後の初回実行で表示名が変わっていることは統括担当が任意で確認する)。

## 7. 要ヒアリング事項

要ヒアリング事項なし。

### 経緯: U1 解決済み(案D)

初版で U1 として次を提示した。cargo test を `npm ci` より前に置くと、`npm ci`(`if` なし。既定は `success()`)が cargo test の失敗でスキップされ、build・lint・typecheck・test が一切実行されない。選択肢は、A: そのまま受け入れる、B: `npm ci` に `if: "!cancelled()"` を付ける、C: cargo test をジョブ末尾へ移す(Q1 に反する)の3つだった。

首席統括担当がオーナー委任により**案D**を採用した。`npm ci` に `if: "!cancelled() && steps.wasm.outcome == 'success'"` を付ける案で、cargo test が失敗しても npm 側の検査は走る。build:wasm が失敗したときだけは、二次的な失敗を避けるため従来どおりスキップする。§3.1・A-6b・C-4 に反映済み。

## 8. 後続Issueへの引き継ぎ事項

- 両 crate の `Cargo.lock` は Git 管理外(§2 E3)のため、CI の `cargo test` は実行のたびに依存を解決し直す。依存の版が CI 実行日によって変わり得る。Cargo.lock のコミット化は本 Issue の対象外として先送りする。
- CI の Rust キャッシュは未導入(Q1)。C-5 の実行時間が問題になった場合に別 Issue で検討する。
- Rust 警告は CI 失敗扱いにしていない(Q2)。新たな警告の混入は CI では検知されない。
- ベンチで `2147483647` を超える有限値を明示指定すると、遅延は32bit符号付き整数に折り返される。1e12 や 2147483648〜4294967295 は負数になって0ms扱いで即時に発火し、2^32+5000 は約5000msになるなど、正の値に折り返される場合も意図した時間にはならない(§2 E4。Q3 で丸め・警告は行わないと決定済み)。

## 9. 実挙動未確認の箇所

- ブラウザ(Chrome)での `setTimeout(…, 1e12)`・`setTimeout(…, Infinity)` の即時発火は、ToInt32 の計算値(§2 E4)からの推論で、設計担当は実機で発火を観測していない。B-4・B-5 で修正後の挙動を確認する。
- `working-directory` 付きステップ・`ubuntu-latest` での `cargo test` の成否(§2 E10・E11)は PR の CI(§6.3)でのみ確認できる。
- CI ランナー上の rustc の版はローカル(1.99.1)と異なる可能性があり、警告の有無が変わり得る(警告は失敗扱いにしないため合否には影響しない)。
