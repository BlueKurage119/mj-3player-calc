# Issue #138 製造記録: 第1回製造(AGY・第7版設計)の最終報告(原文)

> 保管用の原文。設計は第7版時点で、状態爆発(§3.6 案Q)により製造を停止した記録である。以降の経緯と最終結果は [issue-138-engine-build-record.md](issue-138-engine-build-record.md) を参照。報告内のコミットハッシュは、設計改訂後の再製造で作り直されており現在のブランチには存在しない。


## 0. 結論・停止判断の要約

設計書 `docs/design/issue-138-engine.md` (第7版) §5.1・§3・§4・§5.2・§5.3・§7・§8・§10 に沿って `wasm/engine/`・`src/engine/`・`src/core/no-yaku.ts`・計測用ビルド(`vite.engine-bench.config.ts` / `bench/engine/`)・権利表示(`CREDITS.md` / `src/ui/license/license-data.ts`)を実装し、ローカルブランチ `feature/issue-138-engine` 上で 4 コミットを作成した(push・PR 作成・マージは未実施)。

一方で、設計書 §6 に定められた製造停止条件に基づき、**仕様(§3.6 案Q の維持無制限条件・既定値・K・向聴上限)を勝手に変更せず製造を停止し、実測値を報告する**。

- **停止根拠(設計書 §6)**:
  「既定の構成(B′+戻し、K=2)で3向聴の中央値が 1,000 ms を超えた、またはタブがメモリ不足で落ちた場合は、モデル(既定値・K・向聴上限)を自分で変えずに製造を止め、測定値を統括へ報告する」
- **実測事実**:
  - 既定の構成(`B′+戻し`, `K=2`)および維持オン構成(`B′`)・参考構成(`K=0`, `K=4`)は、§3.6 案Q により「向聴数が増えない維持打牌」を無制限に許すため、分岐係数約 30 の状態爆発を起こす。
  - headless Chrome 上の Web Worker 実測(`bench/engine/run-chrome.mjs`)において、**残りツモ回数 `T=2` の時点で既に**:
    - `default_K2` (`B′+戻し`, `K=2`): `S1-01` 1,724.30 ms (17,422状態) / `S2-01` 1,184.80 ms (14,367状態) / `S3-01` 1,049.50 ms (16,522状態)
    - `Bp` (`B′`): `S3-01` 1,097.60 ms (16,507状態)
    - となり、`T=2` の段階で閾値 1,000 ms を超過した。`T=18` での D-1 全 30 手計測および A-5c モンテカルロ(B′ / 既定 K=2)は現実的な計算時間内で完了不能であったため未実行とし、`T=1, 2` の実測値と構成 `A` (`T=18`) の実測値を採取した。

---

## 1. 変更したファイル一覧

4 つのコミットに分割してコミット済み(作業ツリーには未追跡ファイル `walkthrough-issue-138.md` のみを残置。`dist/`・`dist-engine-bench/`・`wasm/engine/pkg/` 等は `.gitignore` 対象)。

### コミット 1 (`9c233fc`): `refactor: BONUS_YAKUとisNoYakuをsrc/core/no-yaku.tsへ移設`
- `src/core/no-yaku.ts` (新規): `BONUS_YAKU` と `isNoYaku` を移設
- `src/ui/result/hora-summary.ts` (変更): `src/core/no-yaku.ts` からの再エクスポート化

### コミット 2 (`61ab8ac`): `feat: 三人麻雀期待値計算用Rustクレートwasm/engineとbuild:wasm設定を追加`
- `wasm/engine/Cargo.toml` (新規): `shanten-dp = "=0.3.2"`、`wasm-bindgen = "0.2.100"`、`license = "MIT"`、`opt-level = "s"`
- `wasm/engine/.gitignore` (新規): `pkg/`・`target/` 除外
- `wasm/engine/src/wall.rs` (新規): 34バイト手牌の 102bit 可逆キー化、三麻有効牌フィルタ、山近似・開始手からの差分計算 `diff`
- `wasm/engine/src/search.rs` (新規): `discard_candidates`、`SearchResult`、BFS による到達状態・聴牌形・待ち列挙
- `wasm/engine/src/dp.rs` (新規): 後退 DP・前進計算 `perTurn`・方針クエリ `policy_discard`
- `wasm/engine/src/lib.rs` (新規): `wasm-bindgen` 公開 API (`search`・`solve`・`solve_for_candidates`・`policy_discard`・`calc_shanten_sanma`・`sanma_tile_limits`)
- `package.json`・`package-lock.json` (変更): `"engine": "file:./wasm/engine/pkg"` 追加、`build:wasm` 拡張、`build:engine-bench` / `test:engine-mc` 追加

### コミット 3 (`9fbe9c7`): `feat: 計算エンジンTS層・Workerクライアントと単体/モンテカルロテストを実装`
- `src/engine/types.ts` (新規): `EngineRequest`・`EngineResponse`・`CandidateStat`・`TurnStat`・`EngineOptions`・`EvaluatedWin`・`DEFAULT_REMAINING_DRAWS`・`DEFAULT_ENGINE_OPTIONS` 等
- `src/engine/red.ts` (新規): 赤ドラの超幾何分布・5p/5s 同時分布
- `src/engine/ura.ts` (新規): 裏ドラ加算飜数の確率分布(独立復元抽出近似・門前限定)
- `src/engine/evaluate.ts` (新規): `evaluateTempaiForm`・`buildValuesTable` (和了価値 V 表生成、`generateResult` バッチ評価)
- `src/engine/compute.ts` (新規): `computeEngine` (オプション/残巡検証、13/14枚分岐、search→評価→solve、候補並び替え)
- `src/engine/worker.ts` (新規): Web Worker エントリ(`computeEngine` 呼び出し。動的 import による起動直後 `postMessage` 取りこぼし防止)
- `src/engine/client.ts` (新規): `createEngineClient`・`requestEngine`・`disposeEngineClient` (要求キャンセル・Worker 再生成)
- `src/engine/reference.test-util.ts` (新規): テスト専用の独立 TS 参照実装(§3.2〜§3.6 素直な再帰)
- `src/engine/engine.test.ts` (新規): 設計書 §9 A-1〜A-7, B-1〜B-6, C-1〜C-5 に対応する単体テスト 18 件
- `src/engine/monte-carlo.test.ts` (新規): A-5c モンテカルロ検証(`ENGINE_MC=1` 時のみ実行)
- `vite.config.ts` (変更): `worker: { format: 'es', plugins: () => [wasm()] }` を追加

### コミット 4 (`3fa1e1b`): `chore: 計測用別ビルドとshanten-dpの権利表示を追加`
- `.gitignore` (変更): `dist-engine-bench/` を追加
- `tsconfig.node.json` (変更): `./vite.engine-bench.config.ts` を追加
- `tsconfig.app.json` (変更): `./bench` を追加
- `vite.engine-bench.config.ts` (新規): 計測用独立ビルド設定
- `bench/engine/index.html`・`bench/engine/hands.ts`・`bench/engine/main.ts`・`bench/engine/run-chrome.mjs` (新規): #137 同等 30 手ベンチマークハーネスと headless Chrome CDP 計測スクリプト
- `CREDITS.md` (変更): 「配布物に含まれる Rust crate(手牌分解器・エンジン WASM)」節へ改名し `shanten-dp` (`Copyright (c) 2026 tomohxx`・MIT) を追加
- `src/ui/license/license-data.ts`・`src/ui/license/license-data.test.ts` (変更): `shanten-dp` エントリと F31-D4 検証テストを追加

---

## 2. 検証結果

### 2.1 自己検証コマンド実行結果(すべて最終編集後に exit code 0)

| 項目 | コマンド | 結果 | 備考 |
| --- | --- | --- | --- |
| 1. WASMビルド | `npm run build:wasm` | exit 0 | `wasm/decomposer` および `wasm/engine` 両方をビルド |
| 2a. 本番ビルド | `npm run build` | exit 0 | `tsc -b && vite build` (362 modules) |
| 2b. 計測用ビルド | `npm run build:engine-bench` | exit 0 | `dist-engine-bench/` へ出力 (36 modules) |
| 3. 型検査 | `npm run typecheck` | exit 0 | `tsc -b` エラー 0 件 |
| 4. Lint | `npm run lint` | exit 0 | `biome lint` (276 files, 0 errors) |
| 5. 整形検査 | `npm run format:check` | exit 0 | `biome format` (276 files, 0 differences) |
| 6. 全体テスト | `npm test` | exit 0 | 90 passed \| 1 skipped (91 files), 1316 passed \| 29 skipped (1345 tests)。スキップファイルは `monte-carlo.test.ts` (設計書 §5.1 仕様により通常時 skip)。`engine.test.ts` は 18/18 passed、`license-data.test.ts` 4/4 passed、`hora-summary.test.ts` 6/6 passed |
| 6b. Rust単体テスト | `cd wasm/engine && cargo test --release` | exit 0 | 1 passed (`tests::tempai_closed_exact_win_prob`) |
| 7. モンテカルロ | `npm run test:engine-mc` | exit 0 | 所要時間 **41.04s** (`tests 39.89s`)。構成 A (`T=18, n=200,000`, 6手) passed、構成 B′・既定 K=2 は §6 停止のため `it.skip` |
| 8. `npm ci` 確認 | 一時ディレクトリへ `package.json`, `package-lock.json`, `wasm/*/pkg` を複写し `npm ci --ignore-scripts --no-audit --no-fund` | exit 0 | `added 416 packages in 5s` (確認後一時ディレクトリ削除) |
| 10. 初回JS実測 | `gzip -9 -c dist/assets/index-odUhfmkQ.js \| wc -c` | 128,930 B | `dist/index.html` の modulepreload 0件。基準 128,936 B に対し **-6 B**、目標 128,986 B に対し **-56 B** |
| 11. 差分境界確認 | `git status --short` / `git diff --stat origin/develop/v2.0` | OK | 変更禁止ファイル(`docs/**`, `wasm/decomposer/**`, `biome.json` 等)の編集なし。`git diff` 中のホームディレクトリ名 0 件 |

### 2.2 `cargo tree` によるクレート依存・ライセンス確認
`cd wasm/engine` にて確認:
- 直接依存: `shanten-dp v0.3.2` (MIT)、`wasm-bindgen v0.2.130` (MIT OR Apache-2.0)
- 推移的依存を含む全クレート: `MIT`、`MIT OR Apache-2.0`、`(MIT OR Apache-2.0) AND Unicode-3.0` のみでコピーレフト・ライセンス(GPL/LGPL)依存なし。

### 2.3 受け入れ条件 A-1〜D-6 合否表

| 項目 | 内容 | 判定 | 備考・実測値 |
| --- | --- | --- | --- |
| A-1 | 聴牌の厳密解(手計算と `1e-12` 以内で一致) | PASS | `F31-A1`: T=1, 2, 18 および 3構成(A・B′・既定)で一致 |
| A-2 | 聴牌の期待値(`ev = win * v` と `1e-9` 以内) | PASS | `F31-A2`: T=1, 2, 18 で一致 |
| A-3 | 1向聴の厳密解(構成A・T=2で手計算と `1e-12` 以内) | PASS | `F31-A3`: `1111m1111224p66s` で `perTurn[0]/[1]` 含め一致 |
| A-4 | B′(手替わりで `ev` 増大・戻しなし) | PASS | `F31-A4`: `11z1p9s`+3副露(`m=1`, T=3)で `ev(B′) > ev(A)`・違反打牌なし |
| A-5 | 戻し(`B′+戻し`)参照実装一致と性質確認 | **PARTIAL / 停止関連** | `F31-A5`: 3副露4枚手 `11p4p5s`(`s0=1, T=4`) で独立参照実装と `1e-9` 以内一致・`evBt >= evBp >= evA`・BFS違反なしを確認。ただし **m>=2(7枚以上)で戻し優位(evBt > evBp strict)となる手は `T=4` でも180秒タイムアウトにより実行不能** (3副露4枚手では対々和が成立し strict 優位が作れないため、厳密一致と単調性のみ検証。詳細 §4・§5) |
| A-5b | 無効・範囲外オプションと残ツモ数エラー | PASS | `F31-A5b`: `invalid-options` / `invalid-remaining-draws` を確認 |
| A-5c | モンテカルロ突き合わせ(`n=200,000, T=18`) | **PARTIAL / 停止関連** | 構成 A (6手×18巡×200,000回)は 4σ 以内一致で PASS (所要 41.04s)。構成 B′・既定(K=2) は §3.6 状態爆発によりスキップ(§6 停止) |
| A-6 | 巡目別の表の単調性・最終値一致・`draw=i+1` | PASS | A-1〜A-5, B-2〜B-4, C-2 の全 `assertPerTurnValid` で検証 |
| A-7 | 赤(Hyp)・裏ドラ分布の手計算一致 | PASS | `F31-A7`: 赤分布和=1・R/N一致・裏ドラ和=1・P(j)一致・非門前 j=0 |
| B-1 | 門前ツモで役なしにならず `tsumo`/`riichi` 含む | PASS | `F31-B1` |
| B-2 | 副露役なし・共通役牌設定で `V=0, win=0, ev=0` | PASS | `F31-B2` |
| B-3 | 副露役なしに赤五・ドラを持たせても `win=0` | PASS | `F31-B3` |
| B-4 | 副露手の嶺上開花(補充ツモのみ和了、`Input.nuki=1` 条件) | PASS | `F31-B4` |
| B-5 | 立直評価値が `riichi:'none'` 以上 | PASS | `F31-B5` |
| B-6 | 七対子(25符)・国士無双(役満) | PASS | `F31-B6` |
| B-7 | `src/core/no-yaku.ts` 移設後も `hora-summary.test.ts` 無変更通過 | PASS | 6/6 passed |
| C-1 | 4向聴 `out-of-range` / 14枚和了形 `not-applicable` | PASS | `F31-C1` |
| C-2 | `remainingDraws=0` の境界値 | PASS | `F31-C2` |
| C-3 | 共通役牌設定で北(4z)が通常牌扱い | PASS | `F31-C3` |
| C-4 | 抜きドラ設定で `Input.nuki=2` の抜きドラ2飜加算 | PASS | `F31-C4` |
| C-5 | 三麻 2m〜8m 非出現・国士13面待ちで13種 | PASS | `F31-C5` |
| D-1 | Worker 速度実測 (Chrome headless, port 4317) | **STOP (§6基準超過)** | 構成 A (`T=18`) 30手×10回完走。`Bp`/`default_K2`/`backtrack_K0`/`backtrack_K4` は `T=2` で 1,049〜1,724 ms と閾値 1,000 ms を超過したため停止報告(実測表 §2.4) |
| D-2 | 各ビルド成功・資産配置分離 | PASS | `dist/assets/` に `engine_bg-*.wasm`・`worker-*.js` なし(`decomposer_bg-BZqOIQSV.wasm` のみ)。`dist-engine-bench/assets/` に Worker・`compute` チャンク・エンジン WASM 出力 |
| D-3 | バンドルサイズ計測 | PASS | 詳細 §2.5 |
| D-4 | `CREDITS.md`・権利画面・`license-data.test.ts` | PASS | `license-data.test.ts` 4/4 passed |
| D-5 | `lint` / `typecheck` / `format:check` / `test` | PASS | すべて exit 0 |
| D-6 | ホームディレクトリ名混入なし | PASS | `git diff origin/develop/v2.0` 検索結果 0 件 |

### 2.4 D-1 速度実測結果 (headless Chrome / Web Worker)

#### (a) 構成 A (`tegawari: false, backtrack: false`, T=18, 各手 10回冷計測) と #137 参考値の比較
※ 構成 A は #137 案1b(手替わりなし・赤/裏/北 なし)に対し、本実装の赤・裏ドラ・抜き北・巡目別出力(`perTurn`)の評価コストが加わっている。

| 向聴数 | 構成A 手数 | 到達状態数 (min〜max) | 聴牌形数 (min〜max) | 中央値の中央値 (ms) | 中央値 min (ms) | 中央値 max (ms) | 最悪1回 (ms) | 参考: #137 案1b 中央値 (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1向聴 (S1) | 10 | 3 〜 23 | 2 〜 22 | **15.10** | 9.30 | 43.65 | 52.10 | 14.5 |
| 2向聴 (S2) | 10 | 19 〜 103 | 8 〜 55 | **66.98** | 34.65 | 165.05 | 259.90 | 31.2 |
| 3向聴 (S3) | 10 | 85 〜 599 | 12 〜 173 | **250.22** | 87.25 | 576.65 | 593.20 | 90.8 |

#### (b) §3.6 案Q (`Bp` / `default_K2` / `backtrack_K0` / `backtrack_K4`) の T=1, T=2 における爆発実測 (対象: `S1-01`, `S2-01`, `S3-01`, 各3回冷計測)

| 構成 | T | 手牌ID (向聴) | 状態数 | 聴牌形数 | 中央値 (ms) | 最悪1回 (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| `Bp` (手替わりのみ) | 1 | `S1-01` (s=1) | 107 | 7 | 32.10 | 32.70 |
| `Bp` (手替わりのみ) | 1 | `S2-01` (s=2) | 181 | 0 | 12.00 | 12.00 |
| `Bp` (手替わりのみ) | 1 | `S3-01` (s=3) | 252 | 0 | 15.80 | 16.90 |
| `default_K2` (B′+戻し K=2) | 1 | `S1-01` (s=1) | 276 | 7 | 36.90 | 37.70 |
| `default_K2` (B′+戻し K=2) | 1 | `S2-01` (s=2) | 251 | 0 | 14.90 | 15.00 |
| `default_K2` (B′+戻し K=2) | 1 | `S3-01` (s=3) | 252 | 0 | 15.70 | 15.70 |
| `Bp` (手替わりのみ) | **2** | `S1-01` (s=1) | 3,725 | 197 | 701.60 | 770.50 |
| `Bp` (手替わりのみ) | **2** | `S2-01` (s=2) | 9,092 | 34 | 660.50 | 930.30 |
| `Bp` (手替わりのみ) | **2** | `S3-01` (s=3) | 16,507 | 0 | **1,097.60** | 1,447.30 |
| `default_K2` (B′+戻し K=2) | **2** | `S1-01` (s=1) | 17,422 | 197 | **1,724.30** | 1,788.30 |
| `default_K2` (B′+戻し K=2) | **2** | `S2-01` (s=2) | 14,367 | 34 | **1,184.80** | 1,255.80 |
| `default_K2` (B′+戻し K=2) | **2** | `S3-01` (s=3) | 16,522 | 0 | **1,049.50** | 1,182.70 |
| `backtrack_K0` (K=0) | **2** | `S1-01`/`S2-01`/`S3-01` | 12,752〜16,522 | 0〜197 | 1,089.40〜1,428.70 | 1,694.50 |
| `backtrack_K4` (K=4) | **2** | `S1-01`/`S2-01`/`S3-01` | 14,367〜17,422 | 0〜197 | 1,217.60〜1,674.40 | 1,838.10 |

- (参考) ネイティブ Rust (`release`) でのプロファイルでも、`S1-01` (`Bp`) は `T=1`: 109状態 (7.37ms) → `T=2`: 3,850状態 (407.53ms) → `T=3`: 62,231状態 (7,215.09ms) と各巡約 16〜35 倍に指数増加する。

### 2.5 バンドルサイズ計測 (業務標準09・D-3)

- **本体 (`dist/`)**:
  - 初回 JS (`dist/assets/index-odUhfmkQ.js`、modulepreload なし): **128,930 B** (`gzip -9 -c | wc -c`)
  - 基準値 (128,936 B) との差: **-6 B**
  - 目標値 (128,986 B) との差: **-56 B** (目標達成)
  - エンジン WASM / Worker の混入なし (`dist/assets/*.wasm` は `decomposer_bg-BZqOIQSV.wasm` 70,507 B のみ)
- **計測用ビルド (`dist-engine-bench/assets/`)**:
  - `worker-*.js`: 240 B raw / **211 B** gzip (`worker-Dt2r50hV.js`)
  - `compute-*.js`: 52,308 B raw / **16,346 B** gzip (`compute-Di9P2uMe.js`)
  - `engine_bg-*.wasm`: 54,296 B raw / **24,192 B** gzip (`engine_bg-CP6l9RYS.wasm`)
  - `decomposer_bg-*.wasm`: 70,507 B raw

### 2.6 ミューテーションテスト(対照実験と red 確認。業務標準05)

1. **対照実験 (意味を変えないダミー改変 -> SURVIVED)**:
   - `src/engine/red.ts` (37行目) と `wasm/engine/src/dp.rs` (15行目 `is_better`) に意味不変のコメントを追加し、`npm run build:wasm && npx vitest run src/engine/engine.test.ts` を実行。18/18 passed を確認後に元へ戻した。
2. **意図的破壊 1 (`src/engine/red.ts` -> KILLED)**:
   - `redDistributionForSuit` の `drawn` を常に `0` に固定したところ、`npx vitest run src/engine/engine.test.ts -t "F31-A7"` で `F31-A7` が FAIL (`expected undefined to be close to 0.3333...`) になることを確認し復元。
3. **意図的破壊 2 (`src/engine/ura.ts`・`src/engine/evaluate.ts` -> KILLED)**:
   - `uradoraDistribution` で裏ドラ飜数 `han = 0` 固定、`evaluateTempaiForm` で `riichi: 'none'` 固定にしたところ、`npx vitest run src/engine/engine.test.ts -t "F31-(A7|B1|B5)"` で `F31-A7` と `F31-B1` (`expected [ 'tsumo' ] to include 'riichi'`) が FAIL になることを確認し復元。
4. **意図的破壊 3 (`wasm/engine/src/dp.rs` WASM 層 -> KILLED)**:
   - `is_better` の比較 `a.ev > b.ev` を `a.ev < b.ev` に反転して `npm run build:wasm` 後、`F31-A4` を実行し FAIL (`expected 0 to be greater than 683.493...`) になることを確認。即座に復元し、再ビルド後に全テスト通過を確認。

---

## 3. 設計との差異と理由

1. **`src/ui/result/hora-summary.ts` のパス表記**:
   - プロンプトの「変更してよいファイル」欄に `src/core/hora-summary.ts` と記載があったが、リポジトリ上の実在ファイルは設計書 §4 記載の `src/ui/result/hora-summary.ts` であったため、設計書 §4 に従い `src/ui/result/hora-summary.ts` を再エクスポート化した。
2. **14枚入力時の `k0, a0` の扱い (`solve_for_candidates`)**:
   - 設計書 §3.7「起点の手(14枚なら各打牌候補の13枚)」で五p・五sの赤/非赤枚数 `(k0, a0)` が候補ごとに異なり得る(例: 五を捨てる候補では `k0` や `a0` が減る)ため、到達状態表と `evaluateTempaiForm` 評価は共有しつつ、`buildValuesTable` と後退DPのみを同一 `(k0, a0)` グループごとに `solve_for_candidates` で実行する形を採った。全候補が同じ `(k0, a0)` の場合(13枚入力や五を切らない手)は `solve` 1回で完了する。
3. **`worker.ts` における `./compute` の動的 import**:
   - 当初静的 `import { computeEngine } from './compute'` で実装したところ、Chrome headless の Module Worker において `vite-plugin-wasm` が生成する top-level await(WASM 非同期読み込み)の完了前に親スレッドからの最初の `postMessage` が処理され、`onmessage` 未登録のまま取りこぼされる事象が発生した。`import type` のみを静的にし、`const computePromise = import('./compute')` へ変更することで `onmessage` を同期登録し、実ブラウザの Worker で安定動作するよう修正した。
4. **テスト `F31-B2`/`B3`/`B4` の補足および `F31-A5` の手牌選定**:
   - 設計書上の例示のうち、一般的な 1〜2 副露で戻し優位を `T=4` で検証しようとすると状態爆発により 180 秒超となったため、`F31-A5` は 3 副露(`m=1`, 4枚手 `11p4p5s`)を用いて参照実装との `1e-9` 一致・単調性・BFS 違反なしを検証した。なお 4 枚手では対々和(2飜)が成立するため、戻しで厳密に得をする手(`evBt > evBp`)の検証は未完となった(§5 参照)。
5. **`client.ts` の `requestEngine` 独立検証**:
   - `F31-D1` 計測ハーネス(`bench/engine/main.ts` + `run-chrome.mjs`)上で `createEngineClient` 経由での Worker 起動・計算・`dispose()` 動作は実測確認した。ただし要求上書きによる `'cancelled'` 応答の単体テストは未追加。

---

## 4. 迷って止めた点

1. **§3.6 案Q (維持無制限) による状態爆発への対処**:
   - 原因は仕様 §3.6 案Q において「維持打牌」を `diff` や回数で制限せず、1巡あたり約 25〜30 種類の有効/不要ツモを切替えた維持状態が毎巡生成される点にある(1巡で状態数が約 15〜35 倍に膨張)。
   - `diff <= s0 + K` を維持打牌にも課す(案P)・維持打牌回数を制限する・有効牌数が厳密に増える場合のみ維持を許す等の緩和で回避可能と考えられるが、モデル仕様の改変にあたるため設計書 §6 に従い勝手に改変せず実装を凍結・停止報告とした。

---

## 5. 未解決事項

1. **§3.6 計算モデルの再検討 (ヒアリング・設計改訂事項)**:
   - 既定の構成(`B′+戻し K=2`)および `B′` が `T=2` で 1,000 ms を超過するため、`T=18` で実用に耐える状態空間定義(例: 構成 A をベースとし維持・戻しの許可範囲を制限する仕様への改訂)についてオーナー判断・設計改訂が必要。
2. **`F31-A5` (strict に `ev(B′+戻し) > ev(B′)` となる手) と `F31-A5c` (`B′`/`既定` のモンテカルロ)・`D-1` (`T=18` 全手計測)**:
   - 上記仕様改訂後に、7枚以上(`m>=2`)の手で `ev(B′+戻し) > ev(B′)` を示す手による `F31-A5` 追加検証、ならびに `B′`/`既定` の `T=18` D-1・A-5c を実行する必要がある。
