# Issue #137 F3-0. 速度比較スパイク(案1bと案3の実測) — 設計書(第2版)

第2版の変更: 独立レビューの指摘(H-1・H-2・M-1〜M-4・L-1〜L-3・向聴確認の証拠)を反映した。主な変更は次のとおり。

- 第2版の訂正(実物との乖離): `generateResult` は13枚聴牌形で向聴0なら、役がなくても `hora-shanten`(`info.type === 'hora'`)を返し候補を除外しない。役なしは UI の `isNoYaku`(`src/ui/result/hora-summary.ts`)で区別される。§1.3・§4.4・A-8 の分類の記述を、役あり聴牌形・役なし聴牌形・和了なし・その他・例外に改めた(承認済みの設計内容は変えず、実物との乖離のみを訂正)
- 点数評価の単位を「和了形1つ」から「13枚聴牌形1つにつき `generateResult` を1回」に改めた(§1.3・§4.4・§4.5)
- 受け入れ条件 A-12・A-14・A-15 を、実行するコマンドと合格時の出力で書き直した

- 状態: 設計案(設計承認前)
- 設計担当モデル: Claude Opus 5.5(claude-opus-5-5)
- 親: #111(F3)。base ブランチは `develop/v2.0`
- 性質: 使い捨てのスパイク。**PRに載るのは docs のみ**(本設計書と実測報告書)。試作コードは製品に取り込まない

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- Issue #137 本文(`gh issue view 137`)、親 #111
- `AGENTS.md`、業務標準 `docs/rules/01`・`02`・`07`・`09`
- 既存コード: `src/core/result.ts`(`generateResult`)、`src/core/tile/shanten.ts`(`minShanten` が手牌分解器 WASM の `decompose_from_counts` を呼び、`memoize` でキャッシュする)、`src/core/input.ts`(`Input`・`HandOptions`)、`src/core/table.ts`(`Table`)、`src/core/rule-preset.ts`(`RULE_PRESETS`)、`package.json`(`decomposer` は `file:./wasm/decomposer/pkg`、`build:wasm` は `wasm-pack build` で既定ターゲット bundler)、`vite.config.ts`(`vite-plugin-wasm` を使用)
- `shanten-dp` 0.3.2(MIT)の crate ソース(`src/shanten.rs`・`src/common.rs`・`src/lib.rs`)。クリーンルーム境界の内側(MIT)なので読んでよい
- 事前調査(Issue-111-pre-research)の要点は統括担当から受領。リポジトリ外の資料のため、パスは記さない

### 1.2 確定事項(ヒアリング済み。再検討しない)

1. 測定手牌: 1・2・3向聴を各10手、固定セット。門前/副露、北なし/あり、赤・ドラ有無を混ぜる。牌姿リテラルを本書に載せる(§3)。4向聴以上は対象外
2. 計測環境: Node(素の実行)と、実ブラウザの Web Worker(本番ビルド)の2系統。各条件ウォームアップ1回+本計測10回以上。中央値・最小・最大を記録。機種・OS・Node/Chrome の版を記録。スマホ実機・CPU スロットリングは対象外
3. 試作範囲(最小限): (a) `shanten-dp` を WASM 化し、`calc_shanten2` の TS→WASM→TS 往復と配列一括受け渡しの1回あたりコスト (b) 既存 `src/core/` の点数評価1回あたりのコストと、手牌分解器 WASM 往復を除いた内訳 (c) 手替わりなし・ツモ限定の簡易探索で、1〜3向聴から到達する和了形のユニーク数と、全部を評価した合計時間。案1b/案3の完全実装・DP 集計は作らない。探索部分は Rust 版と TS 版を簡易に両方作って測る
4. 到達和了形モデル: 一人麻雀・ツモのみ・手替わりなし・赤ドラなし。三麻の枚数制約は `tile_limits` で処理。**速度測定のための仮置きであり、F3-1 の計算モデルとして確定扱いにしない**。赤・裏ドラ・抜き北を入れた場合の評価回数の増加は別途試算し、「推定」と明記する
5. 成果物: PR は docs のみ。本設計書と実測報告書1本。試作コードは PR に載せない
6. 推奨の判断基準: 報告書は案1bか案3かを数値で推奨する。目安は「3向聴の全計算が Worker 内で数百 ms〜1 秒以内」。**この閾値は仮のもの**と報告書に明記する

### 1.3 実物で確認した事実

- `generateResult(table, input, handOptions, rule): Result`(`src/core/result.ts` 361行)。手の内の枚数で次のように分岐する
  - 13-3k 枚(`hand.length % 3 === 1`。165〜208行): 向聴0(一般形・七対子・国士のいずれか)なら、**全待ちの和了を生成して点数計算し**、`{ type: 'hora-shanten', info: { type: 'hora', hora } }` を返す。役がなくても(懸賞役だけの和了でも)候補は除外されず、この形で返る。役なしかどうかは UI の `isNoYaku`(`src/ui/result/hora-summary.ts`。役満がなく、通常役が懸賞役〔ドラ・裏ドラ・赤・抜き北・一発〕だけなら true)で判定する。`type: 'tempai'` 系は、手牌と副露の合計が13枚でない形(槓を含む形など)などで返る
  - 14-3k 枚(`% 3 === 2`。290〜349行): 末尾を和了牌として除いた13枚で内部関数 `generateResultInner` を呼び、全待ちの和了から末尾の牌のものに絞る。絞り込みが空なら、**打牌候補ごとに `generateResultInner` を再帰的に呼ぶ**
  - したがって14枚で呼ぶと「和了形1つ=評価1回」にならず、コストを過大に測る。本スパイクの評価単位は**13枚の聴牌形1つにつき `generateResult` を1回**とする(§4.4)。和了牌は `input.hand` に含めず、戻り値の各 `hora` の `horaTile` で区別する
- 手牌分解器の呼び出しは `src/core/tile/shanten.ts` の `minShanten` 1か所で、`memoize` により `counts/meldCount` をキーにキャッシュされる。**同じ牌姿を繰り返し評価するとキャッシュに当たり、WASM 往復が計測から消える**。計測設計(§4.4)でこれを扱う
- アプリ内に Web Worker は現存しない(`src` に `Worker` の参照なし)。ブラウザ計測用のページと Worker はスパイク側で新規に用意する
- worktree には `node_modules` と `wasm/decomposer/pkg` がない。`npm run build:wasm` の後に `npm ci` が必要(`decomposer` が `file:` 依存のため、この順序)

### 1.4 事前調査の速度表について

事前調査の速度比較表(「数 ms〜数十 ms」等)は**すべて推定値であり、実測ではない**。本 Issue はこれを実測で置き換えることが目的である。報告書では推定値と実測値を並べる場合、推定側に「推定(事前調査)」と明記する。

## 2. 外部事実の確認記録(設計担当が実行したコマンドと結果)

| 対象 | 実行したコマンド | 結果 |
| --- | --- | --- |
| shanten-dp の最新版・ライセンス・MSRV | `curl -s -A design-check https://crates.io/api/v1/crates/shanten-dp`(JSON を python で抽出) | max_version `0.3.2`、license `MIT`、rust_version `1.85`、0.3.2 の公開日 2026-06-05。repository `https://github.com/tomohxx/shanten-dp-rust` |
| shanten-dp 0.3.2 の Cargo.toml | crate 本体(`https://static.crates.io/crates/shanten-dp/shanten-dp-0.3.2.crate`)をスクラッチ領域に展開して確認 | edition 2024、rust-version 1.85、依存は `bitflags 2.11.1`(default-features=false)と `thiserror 2.0.18`(default-features=false)。categories に `no-std` |
| 公開 API | 同 crate の `src/lib.rs`・`src/shanten.rs`・`src/common.rs` を grep | `pub use`: `Data`・`Mode`・`ShantenError`・`calc_shanten`・`calc_shanten2`・`make_tile_limits`。シグネチャは §5.1 に転記 |
| `make_tile_limits(true)` の挙動 | 同 `src/shanten.rs` 181行以降を読む | 長さ35の配列を全て4で初期化し、`three_player=true` のとき添字1〜7(2m〜8m)を0にする。三麻の不変条件(2m〜8m を出さない)と整合 |
| `Data` の型 | 同 `src/common.rs` | `shanten: i8`、`discards: u64`、`waits: u64`(34牌のビットマスク) |
| 引数検査(`check_hand=true`) | 同 `src/shanten.rs` の `calc_shanten_impl` | 各牌 i で `hand[i] > 4` なら `InvalidHand`、`tile_limits[i] > 4 \|\| hand[i] > tile_limits[i]` なら `InvalidTileLimits`、`m > 4` なら `InvalidMelds`。七対子・国士は `m == 4` のときだけ計算される(`Mode` に含めても副露手では一般形だけになる) |
| `tile_limits[34]`(35要素目) | 同 `src/standard.rs`(`tile_limits[n + 1]` を参照する DP)、`make_tile_limits` | 35要素目は番兵として DP の末尾で参照される。`make_tile_limits` は4を入れる。試作ではこの値を変更しない |
| 依存クレート | 同 crate の `Cargo.toml` を `grep -n "^\[\|version"` | `[dependencies.bitflags]` 2.11.1、`[dependencies.thiserror]` 2.0.18。59行の `version = "0.7.0"` は `[dev-dependencies.criterion]`(ベンチ用の開発依存)で、利用側の依存木には入らない |
| §3 の手牌の向聴数 | スクラッチ領域で shanten-dp 0.3.2 に path 依存する小さな Rust バイナリを作り、§3 の30手を1行ずつ標準入力で与えて `calc_shanten2(&hand, &make_tile_limits(true), 枚数/3, Mode::all(), false, true)` を実行(赤五 `0` は5として数える) | 出力(抜粋なし・全件): `S1-01 n=13 sh=1;S1-02 n=13 sh=1;S1-03 n=13 sh=1;S1-04 n=13 sh=1;S1-05 n=13 sh=1;S1-06 n=13 sh=1;S1-07 n=10 sh=1;S1-08 n=10 sh=1;S1-09 n=7 sh=1;S1-10 n=7 sh=1;S2-01 n=13 sh=2;S2-02 n=13 sh=2;S2-03 n=13 sh=2;S2-04 n=13 sh=2;S2-05 n=13 sh=2;S2-06 n=13 sh=2;S2-07 n=7 sh=2;S2-08 n=10 sh=2;S2-09 n=10 sh=2;S2-10 n=10 sh=2;S3-01 n=13 sh=3;S3-02 n=13 sh=3;S3-03 n=13 sh=3;S3-04 n=13 sh=3;S3-05 n=13 sh=3;S3-06 n=10 sh=3;S3-07 n=10 sh=3;S3-08 n=10 sh=3;S3-09 n=7 sh=3;S3-10 n=7 sh=3;`(改行を `;` に置換)。確認用バイナリは使い捨てで、作業後に削除した。製造時に試作 WASM で再実行する(A-3) |
| rustc | `rustc --version` | `rustc 1.99.1 (58cf8f9c3 2026-10-13)`(MSRV 1.85 以上) |
| cargo | `cargo --version` | `cargo 1.99.1 (5f94df478 2026-08-27)` |
| wasm-pack | `wasm-pack --version` | `wasm-pack 0.15.0` |
| wasm32 ターゲット | `rustup target list --installed` | `wasm32-unknown-unknown` あり |
| Node | `node --version` | `v24.20.0` |
| Chrome | `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version` | `Google Chrome 157.0.8103.80` |
| 機種・OS | `uname -m`・`sw_vers -productVersion` | `x86_64`、macOS `26.7` |

未確認の事項:

- shanten-dp を `wasm32-unknown-unknown` + wasm-bindgen でビルドできること(no-std カテゴリで依存も default-features=false のため可能と見込むが、**実挙動未確認**)
- §4.2 の Node 実行方式(Vite で SSR バンドルしたスクリプトを `node` で実行)で `vite-plugin-wasm` 経由の WASM が読めること(**実挙動未確認**。代替手順を §4.2 に書く)

## 3. 測定手牌セット(固定)

記法: m/p/s/z。`0p`・`0s` は赤五。`1z〜7z` は東南西北白發中(`4z` が北)。手牌列は副露を除いた手の内13・10・7枚。副露はすべてポン(三麻にチーはない)。抜き北は手牌とは別の枚数。ドラ表示牌の「—」はなし。卓は全手共通で場風東・自風南(子)・0本場・供託0。ルールは `RULE_PRESETS` の先頭プリセット。

「確認向聴」は設計担当が shanten-dp 0.3.2(`Mode::all()`、三麻の `tile_limits`)で実行した結果である(§2 に出力を記録)。

`hands.ts` に書く牌姿文字列は、本表の文字列をそのまま使う。パーサは「数字の並び + 牌種文字(m/p/s/z)」の繰り返しを受け付け、牌種の順序は問わない(`9m123p…` や `…5z9m` のように同じ牌種が離れて現れてもよい)。`0` は赤五(p/s のみ)。2m〜8m が現れたら例外にする。

### 3.1 1向聴

| ID | 手牌 | 副露 | 抜き北 | ドラ表示牌 | 確認向聴 |
| --- | --- | --- | --- | --- | --- |
| S1-01 | 9m123p456p78s99s11z | — | 0 | — | 1 |
| S1-02 | 11m234p067p3478s1z | — | 0 | 9s | 1 |
| S1-03 | 99m13p456p789s557z | — | 1 | — | 1 |
| S1-04 | 1199m226p3388s15z(七対子形) | — | 0 | 1p | 1 |
| S1-05 | 11m345678p2468s9s | — | 2 | — | 1 |
| S1-06 | 123p456p78s44z11z9m(北を手に持つ) | — | 0 | 3z | 1 |
| S1-07 | 23p067p34567s | ポン7z | 0 | — | 1 |
| S1-08 | 11m345p68p24s1z | ポン6z | 1 | 5p | 1 |
| S1-09 | 123p4p77z9m | ポン5z・ポン111s | 0 | — | 1 |
| S1-10 | 11m24p78p2s | ポン6z・ポン999p | 1 | 1s | 1 |

### 3.2 2向聴

| ID | 手牌 | 副露 | 抜き北 | ドラ表示牌 | 確認向聴 |
| --- | --- | --- | --- | --- | --- |
| S2-01 | 19m22p345p678s468s | — | 0 | — | 2 |
| S2-02 | 199m24p055p67s11z7z | — | 1 | 4p | 2 |
| S2-03 | 345p799p23s567s7z9m | — | 0 | — | 2 |
| S2-04 | 123p456p78s99s1m5z9m | — | 2 | 7s | 2 |
| S2-05 | 19m1188p2299s135z(七対子形) | — | 0 | — | 2 |
| S2-06 | 1m134p067p2479s99m | — | 0 | 9p | 2 |
| S2-07 | 0p78p13s79s | ポン5z・ポン6z | 0 | — | 2 |
| S2-08 | 1m24p0678s99s1z | ポン7z | 1 | — | 2 |
| S2-09 | 123p6p24s99s15z | ポン5z | 0 | 2s | 2 |
| S2-10 | 9m345p2469s44z | ポン6z | 0 | — | 2 |

### 3.3 3向聴

| ID | 手牌 | 副露 | 抜き北 | ドラ表示牌 | 確認向聴 |
| --- | --- | --- | --- | --- | --- |
| S3-01 | 1m134p067p2479s15z | — | 0 | — | 3 |
| S3-02 | 11m24p68p13579s11z | — | 1 | — | 3 |
| S3-03 | 2368p1124s579s5z9m | — | 0 | 8s | 3 |
| S3-04 | 19m13579p1357s11z | — | 0 | — | 3 |
| S3-05 | 11m24p68p13579s44z(北を手に持つ) | — | 2 | 1m | 3 |
| S3-06 | 1m35p2479s123z | ポン7z | 0 | — | 3 |
| S3-07 | 1m246p13s68s14z | ポン5z | 1 | — | 3 |
| S3-08 | 1m0p78p13s79s4z9m | ポン6z | 0 | 6p | 3 |
| S3-09 | 158p247s9m | ポン5z・ポン999s | 0 | — | 3 |
| S3-10 | 1p6p247s9m1z | ポン7z・ポン999p | 1 | — | 3 |

製造担当は着手時に、全30手を試作の shanten-dp WASM で再計算し、確認向聴と一致することを報告書に記録する(§7 A-3)。一致しない手があった場合は差し替えず、統括担当へ報告する。

## 4. 試作と計測の設計

### 4.1 作業場所【設計案】

- 試作コードは、`origin/develop/v2.0` から切った**ローカル専用ブランチ `spike/issue-137-speed`** に置く。**push しない**。別の worktree で作業してよい
- 試作のファイルはリポジトリ直下の `spike/` に集める(`src/`・`wasm/decomposer/` は変更しない)
- 報告書の PR は、統括担当が指定する docs 用ブランチ(本設計書と同じブランチ)から出す。報告書には試作ブランチの最終コミットのハッシュを記録する
- スパイク終了後の試作ブランチの削除・保持はオーナーが決める(製造・検収担当は削除しない)

### 4.2 構成

```
spike/
  shanten-wasm/            Rust crate(wasm-bindgen)。shanten-dp 0.3.2 に依存
    Cargo.toml
    src/lib.rs             §5.1 の関数を公開。Rust 版の簡易探索(§4.5)も置く
  bench/
    hands.ts               §3 の30手(リテラル)と Input への変換
    measure.ts             計測の共通処理(ウォームアップ・反復・中央値/最小/最大)
    cases-a.ts             (a) shanten-dp の往復コスト
    cases-b.ts             (b) 点数評価のコストと内訳
    cases-c.ts             (c) 簡易探索 + 全評価
    node-main.ts           Node 用エントリ。結果を JSON で標準出力へ
    worker.ts              Worker 用エントリ。結果を postMessage で返す
    page.html / page.ts    Worker を起動し、結果を画面に JSON で表示する
  vite.bench.config.ts     Node 用 SSR バンドルとブラウザ用本番ビルドの設定
```

- shanten-dp の WASM は `wasm-pack build --release` で `spike/shanten-wasm/pkg` に出力する(ターゲットは既存 decomposer と同じ bundler)。`opt-level` は decomposer と同じ `"s"`
- Node 実行: `vite build --ssr`(`vite.bench.config.ts`、`vite-plugin-wasm` を使用)で `node-main.ts` を ESM に束ね、`node spike/out/node/node-main.js` で実行する。WASM が読めない場合の代替として、decomposer と shanten-wasm を `wasm-pack build --target nodejs` で別ディレクトリにも出力し、`resolve.alias` で差し替えてよい(どちらを使ったか報告書に書く)
- ブラウザ実行: `vite build`(本番ビルド)で `page.html` と `worker.ts` を `spike/out/web/` に出力し、`vite preview` で配信して Chrome で開く。サーバーはポートを指定して起動し、終了時はそのポートだけを止める(業務標準01)

### 4.3 共通の計測規約

- 時刻は `performance.now()`。各条件ごとにウォームアップ1回を捨て、本計測は10回(N=10 を既定。値がばらつく場合は増やしてよく、回数を記録する)
- 「冷」計測(§4.4)では、1回の計測 = 新しいプロセス(Node)または新しい Worker(ブラウザ)1つ。ウォームアップは「同じ条件のプロセス/Worker を1つ余分に起動して結果を捨てる」ことを指す(OS のファイルキャッシュやブラウザのコードキャッシュを温める目的。JIT とモジュール内キャッシュは毎回冷える)
- プロセス/Worker の起動時間と WASM の初期化時間(decomposer・shanten-wasm のインスタンス化)は計測区間に**含めない**。初期化が終わってからタイマーを開始する。初期化時間は参考値として別に記録する
- 記録値: 中央値・最小・最大(ms、小数3桁)。1回あたりコストを出す項目は、1回の計測で K 回呼び出した合計 ÷ K とし、K を記録する
- 実行時の環境(機種・CPU・OS・Node 版・Chrome 版・電源接続の有無)を報告書に記録する

### 4.4 (a)(b) 境界コストと点数評価コスト

(a) shanten-dp の往復(TS → WASM → TS)

- a1: 単発呼び出し。34要素の `Uint8Array` を渡し、`{ shanten, discards, waits }` を受け取る。`discards`・`waits` は u64 のため、JS 側で `BigInt` を受けるか、u32 ×2 に分けて受けるかを両方測ってよい(既定は u32 ×2)
- a2: 配列一括。N 手分の `Uint8Array(34*N)` を1回で渡し、`Int8Array`(向聴)と `Uint32Array`(ビットマスク)で受け取る。N = 1・34・1000
- a3: 参考値として WASM 内部だけのループ(同じ手を K 回計算)の時間を測り、a1 との差を「境界コスト」として報告する

(b) 点数評価(`generateResult`)

評価単位: **§4.5 で到達した13枚聴牌形(手の内 13-3k 枚)1つにつき `generateResult` を1回**呼ぶ。1回の呼び出しで、その聴牌形の全待ちの和了と点数が得られる(§1.3)。14枚の和了形を渡す方式は使わない。

- b1: 1つの測定手牌について、到達した全聴牌形を順に評価し、1聴牌形あたりの平均時間(合計 ÷ 聴牌形数)を出す。**冷の定義は「測定手牌1つごと」**: 測定手牌1つの全聴牌形の評価を、新しいプロセス/Worker 1つで行う(`minShanten` の `memoize` キャッシュが空の状態から始まる。同じ手牌から到達する聴牌形どうしではキャッシュを共有する)。参考として、同じプロセス内で同じ全聴牌形をもう1巡評価した値を「温」(分解器キャッシュ命中)として記録する
- b2: 内訳。同じ聴牌形の牌数配列に対して `decompose_from_counts` だけを呼んだ時間を別に測り、「b1(冷)− b2」を「分解器往復を除いた評価コスト」として報告する。差し引きによる推定である旨を明記する
- 和了形1つあたりの評価コスト: 「聴牌形1回の時間 ÷ その聴牌形の和了形数(待ちの種類数)」で求め、**推定**と明記して別掲する
- 戻り値の分類: 各聴牌形の戻り値を、**役あり聴牌形**(`hora-shanten` で、`isNoYaku` でない和了が1つ以上。ロン・ツモを別の和了として数える)・**役なし聴牌形**(和了はあるが全て `isNoYaku`)・**和了なし**(`tempai` 系、または和了0件)・**その他**・**例外**の5区分で件数を記録し、和了(ScoredHora)単位でも役あり・役なしの件数を出す。`isNoYaku` は製品コードを変えず、同じ判定を試作にコピーして使う。役あり聴牌形の件数で全体の時間を割った値を主に報告し、他の区分の件数は別掲する(合計時間からは除外しない。`generateResult` は役なしを含めて全待ちを評価するため)
- 入力: `input.hand` は聴牌形の13-3k枚(和了牌は含めない)。副露・抜き北・ドラ表示牌・卓・ルールは §3 の元の手牌のものをそのまま使う。`handOptions` は立直なし・その他すべて false。裏ドラなし。聴牌形の牌は赤なしで組む(§4.5)

### 4.5 (c) 簡易探索と到達和了形

到達和了形モデル(仮置き。§1.2 の4):

- 状態は手の内の牌数配列 `h`(13-3k 枚)。`tile_limits` は `make_tile_limits(true)` から、副露・抜き北・ドラ表示牌の枚数を引いたもの【設計案】(捨て牌は差し引かない)。引くのは添字0〜33だけで、添字34(番兵)は `make_tile_limits` の値4のまま変更しない
- 向聴 s>0 の状態から、ツモ t は `calc_shanten2` の `waits` に立つ牌のうち `h[t] < tile_limits[t]` のもの。ツモ後の14枚に対し `discards` に立つ牌 d を打牌し、向聴 s-1 の13枚状態へ進む
- 聴牌(s=0)の状態に達したら、その13枚状態を「到達聴牌形」として記録する。さらに `waits` に立つ各牌 t について和了形 `(h + t, 和了牌 t)` を数える(和了形は件数の報告用で、評価には使わない)
- 13枚状態は牌数配列をキーに重複を除く。和了形は「14枚の牌数配列 + 和了牌」をキーにユニーク化する
- 赤ドラは扱わない(手牌中の `0p`・`0s` は探索中は通常の五として数え、評価時の聴牌形も通常の五で組む)
- `Mode` は探索・向聴確認(A-3)とも**全手で `Mode::all()` に揃える**。shanten-dp は七対子・国士を `m == 4`(門前)のときだけ計算するため、副露手では自動的に一般形だけになる(§2)

計測項目:

- c1: 各手の到達聴牌形のユニーク数、到達和了形のユニーク数、探索で訪れた13枚状態の数
- c2: 探索時間。Rust 版(WASM 内で完結し、到達聴牌形と和了形を一括で返す)と TS 版(TS で探索し、向聴計算だけ shanten-dp WASM を1手ずつ呼ぶ)の両方。前者が案1b、後者が案3の探索部分に当たる
- c3: c1 の**到達聴牌形の全評価の合計時間**(b1 と同じ方法、冷)。手ごとの「探索 + 全評価」の合計時間を、向聴ごとに中央値・最小・最大で集計する
- 検査用の出力: Node 計測の JSON に、手ごとの全到達聴牌形と全到達和了形の牌数配列(34要素)を出力する(A-12 で使う)

### 4.6 赤・裏ドラ・抜き北を入れた場合の評価回数の試算

実測ではなく、c1 のユニーク数に倍率を掛けた**推定**として報告書に書く。倍率の考え方(例: 赤五を含む和了形の区別、裏ドラ表示牌の種類数、抜き北の枚数分岐)は報告書で式を示す。点数評価で裏ドラ・抜き北を扱う方法(評価を増やすか、懸賞飜の加算で済ませるか)は F3-1 の論点として残し、本 Issue では決めない。

## 5. シグネチャ

### 5.1 shanten-dp 0.3.2(確認済みの外部 API。§2)

```rust
pub fn calc_shanten2(
    hand: &[u8; 34], tile_limits: &[u8; 35], m: usize, mode: Mode,
    four_tile_seven_pairs: bool, check_hand: bool,
) -> Result<Option<Data>, ShantenError>;
pub const fn make_tile_limits(three_player: bool) -> [u8; 35];
pub struct Data { pub shanten: i8, pub discards: u64, pub waits: u64 }
// Mode: STANDARD | SEVEN_PAIRS | THIRTEEN_ORPHANS(bitflags)。m は手の内の枚数 / 3
```

### 5.2 試作 WASM が公開する関数(wasm-bindgen。名前は製造担当が変えてよい)

```rust
// a1: 単発。戻りは [shanten, discards_lo, discards_hi, waits_lo, waits_hi] を i32 で
#[wasm_bindgen] pub fn shanten_one(hand: &[u8], limits: &[u8], m: usize, mode: u8) -> Vec<i32>;
// a2: 一括。hands は 34*N。戻りは 5*N の i32
#[wasm_bindgen] pub fn shanten_batch(hands: &[u8], limits: &[u8], m: usize, mode: u8) -> Vec<i32>;
// a3: 内部ループ(K 回)。戻りは向聴(最適化で消されないよう使う)
#[wasm_bindgen] pub fn shanten_loop(hand: &[u8], limits: &[u8], m: usize, mode: u8, k: u32) -> i32;
// c2 Rust 版: 到達聴牌形を [牌数 34] * 件数、和了形を [14枚の牌数 34 + 和了牌 1] * 件数 で一括返却
#[wasm_bindgen] pub fn enumerate_tempai(hand: &[u8], limits: &[u8], m: usize, mode: u8) -> Vec<u8>;
#[wasm_bindgen] pub fn enumerate_horas(hand: &[u8], limits: &[u8], m: usize, mode: u8) -> Vec<u8>;
```

### 5.3 TS 側(`spike/bench/`)

```ts
interface BenchHand { id: string; shanten: 1 | 2 | 3; hand: string; melds: Meld[]; nuki: number; dora: Tile[] }
interface Stat { median: number; min: number; max: number; runs: number; perCallK?: number }
const measure: (fn: () => void, runs?: number) => Stat; // ウォームアップ1回 + runs 回
const enumerateTs: (counts: Uint8Array, limits: Uint8Array, m: number, mode: number) => {
  tempai: Uint8Array[];                                // 到達聴牌形(評価対象)
  horas: { counts: Uint8Array; horaTile: number }[];   // 到達和了形(件数報告用)
  visited: number;
};
// 評価: 聴牌形1つにつき1回。hand は聴牌形の 13-3k 枚(和了牌を含めない)
const evaluateTempai: (tempai: Uint8Array, base: BenchHand) => Result;
```

## 6. 報告書の設計

- パス: `docs/research/issue-137-speed-spike-report.md`(新規。`docs/research/` も新設)
- 構成:
  1. 結論(推奨案と根拠の数値。閾値「3向聴の全計算が Worker 内で数百 ms〜1 秒以内」は**仮の閾値**と明記)
  2. 環境(機種・OS・Node・Chrome・rustc・wasm-pack の版、試作ブランチのコミットハッシュ、Node 実行方式の別)
  3. 手牌セット(本設計書 §3 への参照と、再計算した向聴の一致結果)
  4. (a)(b)(c) の実測表(Node と Worker を並べる。中央値・最小・最大・回数)
  5. 1〜3向聴ごとの「探索 + 全評価」合計時間の集計と、案1b/案3 の比較
  6. 評価回数の試算(§4.6。「推定」と明記)
  7. 事前調査の推定値との対比(推定側に「推定(事前調査)」と明記)
  8. 限界(到達和了形モデルは仮置きで F3-1 で確定扱いにしないこと、スマホ実機・スロットリング未計測、キャッシュの扱い)
  9. F3-1 への引き継ぎ
- ホームディレクトリ名・絶対パスを書かない

## 7. 受け入れ条件

検収担当は、試作ブランチ `spike/issue-137-speed`(ローカル)と docs ブランチの両方を見て判定する。

| # | 確認内容 | 実行と合格基準 |
| --- | --- | --- |
| A-1 | PR は docs のみ | docs ブランチで `git diff --name-only origin/develop/v2.0...HEAD` の出力が `docs/design/issue-137-speed-spike.md` と `docs/research/issue-137-speed-spike-report.md` の2行だけ |
| A-2 | 試作が push されていない | `git ls-remote origin 'refs/heads/spike/*'` の出力が空。ローカルに `spike/issue-137-speed` があり、報告書記載のコミットハッシュが `git rev-parse spike/issue-137-speed` と一致 |
| A-3 | 手牌の向聴が一致 | 報告書に30手の再計算結果があり、§3 の確認向聴と全件一致と書かれている。検収担当は試作ブランチで報告書記載の手順(コマンド)を実行し、同じ結果が出ること |
| A-4 | 再現手順 | 報告書に、試作ブランチでの手順(`npm run build:wasm` → `npm ci` → shanten-wasm のビルド → Node 計測 → ブラウザ計測)がコマンドで書かれており、検収担当が Node 計測を実行して JSON が出力される(値は環境差で一致しなくてよい) |
| A-5 | Worker 計測の実施 | 報告書に本番ビルド + `vite preview` + Chrome の Worker で測った (a)(b)(c) の表がある。検収担当が同手順でページを開き、結果の JSON が表示されること |
| A-6 | 計測規約 | 報告書の全実測表に、条件ごとの回数(≥10)・中央値・最小・最大があり、ウォームアップ1回を捨てた旨が書かれている。1回あたりコストの項目に K がある |
| A-7 | (a) の項目 | a1・a2(N=1・34・1000)・a3 と、境界コスト(a1 − a3 の1回あたり)が Node・Worker の両方である |
| A-8 | (b) の項目 | b1(冷・温。1聴牌形あたり)・b2・「b1(冷)− b2」が Node・Worker の両方にあり、差し引きによる推定である旨の記載がある。和了形1つあたりの評価コストが「推定」と明記して別掲されている。戻り値の区分(役あり聴牌形・役なし聴牌形・和了なし・その他・例外。和了単位の役あり・役なしを含む)の件数がある。試作ソースで `generateResult` に渡す `hand` が 13-3k 枚であること(14枚を渡していないこと)を検収担当が確認する |
| A-9 | (c) の項目 | 30手それぞれの到達聴牌形数・ユニーク和了形数・訪問状態数があり、Rust 版と TS 版で到達聴牌形数とユニーク和了形数が全手で一致している。探索時間(両版)と到達聴牌形の全評価の合計時間が向聴ごとに集計されている |
| A-10 | 推奨 | 結論に案1bか案3のどちらかが数値根拠付きで書かれ、閾値が仮である旨の記載がある |
| A-11 | 推定の明記 | §4.6 の試算と事前調査の数値に「推定」の明記があり、到達和了形モデルを F3-1 で確定扱いにしない旨の記載がある |
| A-12 | 三麻不変条件 | (1) 試作ブランチで `grep -n "make_tile_limits(true)" spike/shanten-wasm/src/lib.rs` が1件以上ヒットする。(2) A-4 で得た Node 計測の JSON を保存し、`node -e` で全手の全到達聴牌形・全到達和了形の牌数配列について添字1〜7の合計を計算するワンライナー(報告書に記載したもの)を実行し、出力が `0` の1行だけ |
| A-13 | 製品コード不変 | 試作ブランチで `git diff --name-only origin/develop/v2.0...spike/issue-137-speed -- src wasm package.json package-lock.json vite.config.ts` の出力が空 |
| A-14 | ホームディレクトリ名 | docs ブランチで `grep -nE "$(basename "$HOME")\|$HOME" docs/design/issue-137-speed-spike.md docs/research/issue-137-speed-spike-report.md` を実行し、出力が空 |
| A-15 | クリーンルーム | (1) 報告書に、参照・依存したのは shanten-dp(MIT)と本リポジトリのみである旨の記載がある。(2) 試作ブランチで `cd spike/shanten-wasm && cargo tree -e normal --depth 1` の直下依存が `shanten-dp v0.3.2` と `wasm-bindgen` のみ。(3) `cargo tree -e normal --prefix none -f '{p} {l}' \| sort -u` の全行のライセンス欄が MIT または Apache-2.0 を含み、GPL・LGPL・空欄の行がない |

バンドル目標値(業務標準09): 本 Issue の PR は docs のみで、製品の初回 JS に影響しない。計測は不要。

## 8. 後続 Issue への引き継ぎ(F3-1)

- 報告書の推奨案(案1b/案3)を F3-1 の構成判断の材料にする。最終決定は F3-1 のヒアリングで行う
- 到達和了形モデル(ツモのみ・手替わりなし・赤なし・捨て牌を `tile_limits` から引かない)は仮置き。F3-1 の計算モデルとして確定扱いにしない
- 赤・裏ドラ・抜き北の扱い(評価回数を増やすか、懸賞飜の加算で済ませるか)は F3-1 の論点
- `minShanten` の `memoize` が大量評価時に効くか・メモリを食うかは、b1(冷/温)の差を材料に F3-1 で判断する
- shanten-dp を製品に取り込む場合の `CREDITS.md` 等への表記は F3-1 で行う(Issue #137 本文のとおり)
- 試作ブランチの扱い(削除・保持)はオーナーが決める

## 9. 実挙動未確認の箇所

- shanten-dp の wasm32 ビルド可否(§2)
- Node での SSR バンドル + `vite-plugin-wasm` による WASM 読み込み(§4.2。代替手順あり)
- 新しい Worker を反復ごとに作ることで `memoize` のキャッシュが空になること(Worker はモジュールを独立に読み込むため空になる見込み)
- 13枚聴牌形の評価で `generateResult` が例外を投げずに `hora-shanten` または `tempai` 系を返すこと(副露・抜き北・ドラ込みの入力で)。戻り値は §4.4 の区分で件数を記録する
- 13枚聴牌形1回の評価で、ツモ・ロンの別を含めて全待ちの点数が得られる範囲(コアの既定挙動に従う。`HandOptions` の設定による違いは未確認)
- `tile_limits` から副露・抜き北・ドラ表示牌を引いたとき、手牌の牌数がその上限を超えて `check_hand` が `ShantenError::InvalidTileLimits` を返さないこと(`hand[i] > tile_limits[i]` で返る。§3 の手牌は該当しない想定)
