# Issue #136 F3-0a 機能比較調査報告

## 0. 調査の前提

- 調査担当: Claude Opus 5.5(Claude Code サブエージェント)
- 調査日: 2026-11-20(独立レビューの指摘による改訂: 2026-11-21)
- 目的: 親 #111(F3: 何切る結果への聴牌確率・和了確率・期待値の追加)の F3-1(計算エンジン)ヒアリングの判断材料とする
- 本書は事実と推測を区別して書く。推測には「推測」、確かめていないものには「未確認」と付ける

### 0.1 クリーンルーム遵守の申告

- **mahjong-cpp について読んだもの**: GitHub 上の README.md(raw 表示)の本文と、README に埋め込まれたコード例・出力例。あわせて GitHub API でリポジトリのメタデータ(ライセンス種別)を取得した
- **mahjong-cpp について読まなかったもの**: `src/`・`include/` その他すべてのソースファイル、README からリンクされたサンプル、Issue/PR 内のコード、ブログ等のコード引用。ローカルのクローンや親フォルダ側(`ref-repo` 等)は探索も閲覧もしていない
- README の出力例の数値は検算データとして使っていない
- 公開デモ(pystyle の「麻雀何切るシミュレーター」)はページ取得を試みたが、本文(設定項目・結果の列)を取得できなかった。**デモの挙動は観察していない**
- ビルド済みバイナリ・API サーバーは実行していない。**入出力の実観察はしていない**
- `mahjong-algorithm-book` は今回参照していない
- 調査中にソースの一部を目にしたことはない
- 備考: GitHub API によると mahjong-cpp のライセンスは **GPL-3.0** である。ソースを読まない・出力を検算データにしない方針は、ライセンス上も維持すべきである
- **独立レビューに関する記録**: 独立レビュー(GPT 6.2 Astra)が、mahjong-cpp の README 内のサンプルコードを読んだ旨を自己申告した。README は読んでよい範囲であり、ソース(`src/`・`include/` 等)は閲覧していない。オーナーは、この追試を例外として継続させる判断をした。追試の結果は検算用の正解データとして使っていない
- **検証不能な事項**(本調査の手段では確かめられない):
  - mahjong-cpp の内部仕様: `turn` の厳密な定義、途中の手替わり・向聴戻しの探索方針、期待値に含む収支(立直宣言の支出等)・裏ドラ・他家行動、三麻モードの有無
  - 公開デモの設定項目・JSON の項目
  - 調査時点の上流の状態(最終 push 日等。初稿の記載は改訂時に再確認していない)
  - shanten-dp の対象ブラウザでの WASM 動作・速度
  - 「立直とダマを比較すると計算が倍」等のコスト見積り(推定にすぎない)
- 事実主張は、実行して確認した手段(コマンド・URL)と結果を §6 に残す。確認できないものは「未確認」とする

## 1. 調査対象

| 対象 | 版・時点 | 取得元 | ライセンス | 確認手段と結果 |
| --- | --- | --- | --- | --- |
| ① mahjong-cpp | 既定ブランチ `master`(版番号は未確認。最終 push 日は初稿時の取得値で、改訂時は未再確認) | https://raw.githubusercontent.com/nekobean/mahjong-cpp/master/README.md | GPL-3.0 | `gh api repos/nekobean/mahjong-cpp` で `license.spdx_id = GPL-3.0` を確認。README を取得して機能記述と埋め込みの例を確認。README 本文にはライセンス記載なし |
| ② 既存資産 | ブランチ `docs/issue-136-feature-survey`(起点 `e4f9fa6`) | 本リポジトリの `src/core/`・`wasm/decomposer/` | MIT(livewing/mahjong-calc 由来) | ソースを読んで確認(テストは実行していない) |
| ③ shanten-dp | 0.3.2 | https://docs.rs/shanten-dp/latest/shanten_dp/ 、https://github.com/tomohxx/shanten-dp-rust 、crates.io の 0.3.2 の .crate | MIT | docs.rs の各ページと GitHub の README を取得。`gh api repos/tomohxx/shanten-dp-rust` で `MIT` を確認。改訂時に `https://crates.io/api/v1/crates/shanten-dp/0.3.2/download` を取得・展開し、`src/common.rs`・`src/shanten.rs`・`src/standard.rs` を確認(MIT のため閲覧可)。**ビルド・実行はしていない** |

## 2. 機能対応表

判定は「F3 の要求を満たすうえで、既存資産+shanten-dp でどこまで賄えるか」を表す。
カバー=そのまま使える / 部分=一部のみ、または改修が要る / なし=新規実装が要る / 不要=F3 では要らない。

mahjong-cpp の仕様欄は README の本文と埋め込みの例だけに基づく。条件・計算式等の内部仕様は「未確認」とする。

| 機能 | ① mahjong-cpp の仕様(README) | ② 既存資産 | ③ shanten-dp | 判定 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| 向聴数(一般形) | 向聴数計算あり | あり。WASM の分解器で最小向聴数と分解結果を返す | あり(`Mode::STANDARD`) | カバー | ② `wasm/decomposer/src/lib.rs` `decompose_from_counts`、`src/core/tile/shanten.ts` `minShanten`。③ docs.rs `calc_shanten` / `Mode` |
| 向聴数(七対子) | 向聴数の例で ShantenFlag(一般形・七対子・国士)を指定し最小向聴数を示す | あり | あり(`Mode::SEVEN_PAIRS`。4枚使い七対子の可否を引数で切替) | カバー | ① README の向聴数の例。② `countChitoitsuShanten`。③ `calc_shanten2` の `four_tile_seven_pairs` |
| 向聴数(国士無双) | 同上 | あり | あり(`Mode::THIRTEEN_ORPHANS`) | カバー | ① 同上。② `countKokushiShanten`。③ docs.rs `Mode` |
| 有効牌(受け入れ) | 有効牌計算あり | あり。種類と残り枚数(呼び出しの入力牌を差し引く)を返す | あり(`Data.waits`。牌種番号に対応する u64 ビット集合。枚数は返さない) | カバー | ② `src/core/tile/shanten.ts` の `waitingTiles`・`shantenTiles`(定義元。呼出元は `src/core/result.ts` の `tileAvailabilities`)、`src/core/tile/index.ts` `tileAvailableCount`。③ `src/common.rs` の `Data`(`waits: u64`、`1u64 << n`) |
| 不要牌・何切る候補 | 不要牌計算あり。有効牌の出力例に「shanten: 3->4」のような向聴が戻る打牌も列挙されている | あり。ただし打牌候補は `minsBy` で最小向聴の候補のみ返す | あり(`Data.discards`。最小向聴を維持できる打牌の u64 ビット集合) | 部分(最小向聴の打牌はカバー。向聴戻し候補を含む列挙はなし) | ① README の有効牌の出力例。② `src/core/result.ts` の `minsBy`。③ `src/common.rs` の `Data` |
| 聴牌確率 | 機能一覧に「聴牌確率/和了確率/期待値計算」。Expected Score Calculation に行=turn(巡目)・列=打牌の出力例がある。条件・計算式・turn の定義は未確認 | なし | なし(確率の記載なし) | なし | ① README の Expected Score Calculation。③ docs.rs クレートトップに確率関連 API なし |
| 和了確率 | 同上(和了確率の巡目別出力例あり) | なし | なし | なし | 同上 |
| 期待値(打点の期待値) | 同上(期待値の巡目別出力例あり。含む収支は未確認) | なし。ただし和了形の点数計算はある | なし | なし(点数評価の部品は②にある) | ② `calculateHoraScore`(`src/core/hora-score.ts`) |
| 点数計算 | 点数計算あり。例で RuleFlag::RedDora 等のルールフラグを指定 | あり。三麻ルール(抜き北・ツモ損等)込み | なし | カバー(②) | ① README の点数計算の例。② `src/core/result.ts` `generateResult`、`src/core/rule.ts`(`DEFAULT_NORTH = 'nukidora'`、`DEFAULT_TSUMO_LOSS`) |
| 手替わりの考慮 | README に記載なし(未確認) | なし | なし | なし | ① README に記載なし。②③ 該当する API なし |
| 向聴戻しの考慮 | 有効牌の出力例に向聴が戻る打牌が列挙される。期待値の探索途中で戻しを許すかは未確認 | なし(打牌候補は最小向聴のみ) | なし(`discards` は最小向聴を維持する打牌のみ) | なし | ① README の有効牌の出力例。② `src/core/result.ts` の `minsBy`。③ `src/common.rs` の `Data` |
| 立直の考慮 | 点数計算の設定に立直フラグがある旨 | 和了形の点数計算で立直・ダブル立直・オープン立直に対応。一発は別入力 | なし | 部分(和了時の加算は可。期待値計算での立直判断・宣言の支出・一発機会は未設計) | ② `src/core/input.ts` `HandOptions.riichi`・`ippatsu` |
| 巡目の考慮 | 聴牌確率・和了確率・期待値を巡目別に表示する出力例あり(turn の定義は未確認) | なし | なし | なし | ① README の Expected Score Calculation。②③ 該当する API なし |
| 赤ドラ | 赤五の牌表記 `0m`/`0p`/`0s` と、点数計算の例での RuleFlag::RedDora の指定あり。赤枚数の設定範囲は未確認 | あり(色ごとの赤枚数、残り枚数計算にも反映) | なし(34種の枚数のみで赤を区別しない) | 部分(向聴・受け入れは赤無視で可。期待値には②の赤処理を通す必要) | ① README の点数計算の例。② `src/core/rule.ts` `redCountOf`、`tileAvailableCount` |
| 抜き北 | README に記載なし(三麻対応自体が未記載) | あり(`input.nuki`、北を抜きドラとして加算) | なし。ただし34種の北を手牌から除くのは呼び出し側で可能 | 部分(引いた北を抜いて嶺上で補充するモデルは新規) | ② `src/core/result.ts` の北の扱い、`src/core/rule.ts` `DEFAULT_NORTH` |
| ドラ | 表示牌で指定可能の旨 | あり | なし | カバー(②) | ② `Input.dora` |
| 裏ドラ期待値 | 裏ドラ表示牌を指定可能の旨(期待値に乗るかは未確認) | 裏ドラ表示牌の入力と加算あり。期待値としての扱いはなし | なし | 部分 | ② `Input.uradora`、`src/core/ura-dora.test.ts` |
| 残り枚数・見え牌 | 未確認 | 呼び出しの入力牌(手牌・副露・ドラ表示牌・裏ドラ表示牌・抜き北)だけを差し引く。河や他家の見え牌の入力はない。打牌後の再計算では切った牌は手牌から除かれるだけで河に移らない | `tile_limits`(`[u8; 35]`)は手持ちを含む各牌の枚数上限(`hand[i] > tile_limits[i]` は不正)。山の残数やツモ確率の重みではない | 部分(静的入力の残数は既存部品で出せるが、探索中に既知になった牌を保持する山モデルとしてはそのまま使えない) | ② `src/core/result.ts` の `allInputTiles`。③ `src/shanten.rs` の `check_hand`(137行付近) |
| 副露 | 副露面子の指定が可能な旨。副露型にチー(Chow)があり四麻前提とみられる | あり(ポン・カン。三麻のためチーなし) | 副露数を直接は受け取らない。`m` は doc 上「Number of hand tiles divided by 3」(門前13枚で4)で、副露分は手牌枚数の減少として表すと推測 | カバー | ② `src/core/input.ts` `Meld`(`pon`・`kan`)。③ docs.rs `calc_shanten2` の `m` |
| 三人麻雀の牌(2m〜8m なし) | README に記載なし(未確認) | あり | あり(`make_tile_limits(true)` で 2m〜8m を0枚に) | カバー | ② `isSanmaTile`・`isSanmaIndex`。③ docs.rs `make_tile_limits`、`src/shanten.rs` 185〜191行 |
| チーなし | README の副露型にはチーがある | 本アプリの副露型 `Meld` にチーがない | 副露の種類を区別しない | カバー(本アプリ側の副露型がチーを持たないため) | ② `src/core/input.ts` の `Meld` |
| 他家の扱い(ロン・放銃・流局) | README に記載なし | 他家行動の確率モデルはなし(ロン和了の打点計算はある) | なし | 不要または選択(4章) | ① README に記載なし。② `src/core/` に該当モデルなし |
| 出力形式 | 英語出力の切替あり。Docker で HTTP サーバーとして起動できる旨。JSON の項目は未確認 | TS の型(`Result`)を UI に渡す | Rust の関数・構造体 | 不要(mahjong-cpp の形式に合わせる必要はない) | ① README のビルド節 |
| 実行環境 | C++17・Boost・CMake | ブラウザ内(TS + WASM)。F3 の計算は Web Worker で行うことが確定要件 | Rust(依存 `bitflags`・`thiserror`)。WASM への組込は未検証 | —(要件は確定、③の組込は未検証) | `docs/requirements.md`(「Web Worker で計算する」【確定】)。③ docs.rs の依存一覧 |

補足:

- ③ の `tile_limits` の35要素目(添字34)は35種目の牌ではない。`src/standard.rs` の `calc_shanten` で、牌 `n` の処理時に `tile_limits[n + 1]` を参照するため、`n = 33`(最後の牌)のときに読まれる番兵である(`table` も `NUM_TIDS + 1` 要素)
- ③ の `tile_limits` には「手に3枚・山に残り1枚」の牌に上限1を渡せない(`hand[i] > tile_limits[i]` で `InvalidTileLimits` になる)

## 3. 三人麻雀への適合のまとめ

- 牌の種類: ② と ③ はともに 2m〜8m の除外に対応している。① は README から読み取れない
- 北: ② は抜きドラとして扱える。③ は北を特別扱いしない。期待値計算では「北を引いたら抜いて補充する」遷移を独自 DP 側で表す必要がある(推測)
- チー: 本アプリの副露型にチーがないため影響しない
- 牌山の総数: 三麻は108枚(`docs/mahjong-rules.md` §1 で確定)。王牌の枚数と残りツモ回数の上限は未確定であり、四麻と異なるかどうかも本調査では確定できない

## 4. 扱いの選択肢

推奨は参考であり、決定ではない。コスト感は相対的な推定。

### 4.1 一人麻雀モデル(他家のロン・鳴き・流局を無視)

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 他家を無視し、自分のツモだけで確率を出す | 実装と説明が単純。DP の状態が小さい | 他家の和了・流局による打切りを表さない一方、自分のロン機会も含まないため、実戦との差の向きは一概に言えない | 小 |
| B. 他家の和了・流局を一定確率で打ち切る近似 | 打切りの影響を表せる | 近似パラメータの根拠が要る。実戦に近づく保証はない | 中 |

推奨: A。B は要望が出てから。

### 4.2 巡目

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 残りツモ回数を入力に取り、その回数で確率を出す | 局面に合わせられる | 入力 UI が増える | 中 |
| B. 固定(例: 序盤想定の一定回数) | UI が増えない | 終盤で値がずれる | 小 |
| C. 巡目別の表を出す | 情報量が多い | スマホの画面に収めにくい | 中〜大 |

残りツモ回数の決め方(A・B)と巡目別に表示するか(C)は独立した論点であり、A と C は併用できる。
推奨: A(既定値付き)。C は表示の要望次第。三麻の残りツモ回数の上限は要件で確定が要る。

### 4.3 手替わり

手替わりには、聴牌前(向聴を維持しつつ受け入れや打点が変わる打牌)と聴牌後の二つの局面がある。

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 考慮しない(聴牌前は受け入れ最大等の固定方針、聴牌したら待ちを固定) | 状態数が小さい | 良形変化・打点変化を過小評価する | 小 |
| B. 聴牌前の手替わりのみ探索する | 向聴維持の打牌選択を評価できる | 状態数が増える | 中〜大 |
| C. 聴牌後も期待値最大の打牌を選び続ける | 待ち変化も評価できる | 状態数と計算時間が増える(#137 で測る) | 大 |

「聴牌後も選び続ける」は立直後には成り立たない(立直後は手牌を変えられない)。門前ダマ・立直後・副露時で分けて設計する必要がある(4.5 と連動)。
推奨: まず A。B・C は速度調査(#137)の結果で判断。

### 4.4 向聴戻し

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 考慮しない(向聴を維持する打牌のみ) | ③ の `discards`・② の打牌候補(いずれも最小向聴のみ)と合う | 打点狙いの迂回を評価できない | 小 |
| B. 1回まで許す | 主要な迂回を拾える | 探索が広がる。②③ とも戻し候補を返さないため列挙を新規に作る | 中〜大 |

推奨: A。

### 4.5 立直

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 聴牌したら即立直とみなす(門前時) | 一般的な想定 | ダマの判断を表せない。立直宣言の支出・一発機会を期待値に含めるなら、②に立直を渡すだけでは足りない(一発は別入力 `ippatsu`) | 小〜中 |
| B. 立直の有無を利用者が選ぶ | 意図に合わせられる | UI が増える | 小〜中 |
| C. 立直とダマのよい方を自動で選ぶ | 判断を表せる | 両方を計算する分の負荷が増える(程度は未確認) | 中 |

A(即立直)と 4.3 C(聴牌後も打牌を選び続ける)は同じ状態で両立しない。
推奨: A を既定とし、B を検討。一発・裏ドラを含めるかは 4.7 と連動。

### 4.6 抜き北

以下はモデル案であり、確定ルールではない。`docs/mahjong-rules.md` §2 では、抜きドラ設定でも北を抜かずに手に残せ(手牌で使う北は客風牌)、共通役牌設定では北の刻子(役牌:北)・雀頭(2符)を評価する。ドラ表示牌が西なら抜き北に表ドラが乗り、裏ドラ表示牌が西なら立直時に抜き北に裏ドラが乗る。

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 抜きドラ設定では、北を引いたら常に抜き、抜きドラ1飜(表示牌が西なら表ドラ、立直時は裏ドラも)を加算して補充ツモとするモデル | 三麻の実戦に近いと推測 | 遷移が一つ増える。北を手に残す選択(客風牌としての使用)を表せない | 中 |
| B. 北を抜かずに手牌として扱うモデル | 単純 | 抜きドラ設定では打点を過小評価する。共通役牌設定では役牌:北・雀頭の符を評価する必要がある | 小 |

推奨: A(ルール設定 `north` が `nukidora` のとき)。`yakuhai` 設定時は B(役牌として評価)。

### 4.7 赤ドラ・裏ドラ

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 赤は残り枚数の比率で期待加算、裏ドラは平均乗り枚数で期待加算 | 状態数を増やさない | 満貫の切り上がり等、点数の非線形を近似する | 小〜中 |
| B. 赤・裏の枚数を状態に含めて厳密に計算 | 正確 | 状態数が増える | 大 |
| C. 赤・裏を無視 | 最も単純 | 三麻では打点への影響が大きい(推測) | 小 |

注意: 既知の分(手牌の赤・入力済みの裏ドラ表示牌)と将来の分(これから引く赤・未知の裏ドラ表示牌)を分けて扱わないと、②の点数計算での加算と期待加算が二重になりうる。
推奨: A。

## 5. 先送り・不確実な事項

- **mahjong-cpp の内部仕様**: turn の定義、手替わり・向聴戻しの探索方針、期待値の定義(収支・裏ドラ)、他家の扱い、三麻対応の有無。ソースは読まない方針のため、確かめるならデモの挙動観察(人手でのブラウザ操作)で行うのが妥当
- 公開デモの設定項目・出力列: 自動取得では本文を得られず、未確認
- shanten-dp: WASM ビルドの可否と対象ブラウザでの動作・速度は未確認(速度は #137)
- 三麻の残りツモ回数・王牌の枚数の扱いは `docs/requirements.md` 側の確定が要る

## 6. 根拠一覧

| 主張 | 根拠(手段) | 状態 |
| --- | --- | --- |
| mahjong-cpp は向聴数・有効牌・不要牌・点数・期待値(聴牌確率・和了確率)を計算する | README の機能一覧 | README で確認 |
| mahjong-cpp は聴牌確率・和了確率・期待値を、行=turn(巡目)・列=打牌で示す出力例を持つ | README の Expected Score Calculation | README で確認(条件・計算式・turn の定義は未確認) |
| mahjong-cpp の向聴数の例は ShantenFlag(一般形・七対子・国士)の最小向聴数を示す | README の向聴数の例 | README で確認 |
| mahjong-cpp の点数計算の例は RuleFlag::RedDora 等を指定する | README の点数計算の例 | README で確認(赤枚数の設定範囲は未確認) |
| mahjong-cpp の有効牌の出力例に向聴が戻る打牌(「shanten: 3->4」)が列挙される | README の有効牌の出力例 | README で確認(探索途中で戻しを許すかは未確認) |
| mahjong-cpp の副露型にチー(Chow)がある | README の副露の記述 | README で確認 |
| mahjong-cpp は C++17・Boost・CMake、Docker で HTTP サーバー起動 | README のビルド節 | README で確認 |
| mahjong-cpp は GPL-3.0 | `gh api repos/nekobean/mahjong-cpp` | 確認 |
| mahjong-cpp の三麻対応・手替わり・他家の扱い | README に記載なし | 検証不能 |
| shanten-dp 0.3.2 は MIT | docs.rs、`gh api repos/tomohxx/shanten-dp-rust` | 確認 |
| shanten-dp の `calc_shanten2(hand: &[u8;34], tile_limits: &[u8;35], m, mode, four_tile_seven_pairs, check_hand) -> Result<Option<Data>, ShantenError>` | docs.rs `fn.calc_shanten2` | 確認 |
| `m` は手牌枚数÷3(「Number of hand tiles divided by 3」)で副露数ではない | docs.rs `fn.calc_shanten2` | 確認 |
| `Data` は `shanten: i8`・`discards: u64`・`waits: u64`。`discards`・`waits` は牌種番号 n を `1u64 << n` で立てるビット集合(`discards`=最小向聴を維持できる打牌、`waits`=有効牌) | crates.io の 0.3.2 .crate を取得・展開し `src/common.rs` 31〜37行・63〜64行を確認 | 確認 |
| `tile_limits` は手持ちを含む枚数上限(`tile_limits[i] > 4 \|\| hand[i] > tile_limits[i]` で `InvalidTileLimits`) | 同 .crate の `src/shanten.rs` 137〜138行 | 確認 |
| `tile_limits` の35要素目は DP で `tile_limits[n + 1]` を参照するための番兵 | 同 .crate の `src/standard.rs` 66〜77行 | 確認 |
| `Mode` は `STANDARD`・`SEVEN_PAIRS`・`THIRTEEN_ORPHANS` | docs.rs `struct.Mode` | 確認(定数の説明文はなく名前から判断) |
| `make_tile_limits(true)` は 2m〜8m を0枚にする | docs.rs `fn.make_tile_limits`、同 .crate の `src/shanten.rs` 185〜191行 | 確認 |
| shanten-dp に確率・期待値の API はない | docs.rs クレートトップの項目一覧 | 確認 |
| shanten-dp の WASM 組込・速度 | 未実施 | 未確認 |
| 既存の分解器は最小向聴数と分解結果を返す | `wasm/decomposer/src/lib.rs`・`shanten.rs` | ソースで確認 |
| 既存資産は七対子・国士の向聴数を計算する | `src/core/tile/shanten.ts` | ソースで確認 |
| `waitingTiles`・`shantenTiles` の定義元は `src/core/tile/shanten.ts`(49行・85行) | `grep` で確認 | ソースで確認 |
| 既存の打牌候補は最小向聴のもののみ | `src/core/result.ts` 350行付近の `minsBy` | ソースで確認 |
| 見え牌は呼び出しの入力牌(手牌・副露・ドラ表示牌・裏ドラ表示牌・抜き北)から差し引く | `src/core/result.ts` `allInputTiles`、`tileAvailableCount` | ソースで確認 |
| 既存資産は 2m〜8m を除外する | `src/core/tile/index.ts` `isSanmaTile`・`isSanmaIndex` | ソースで確認 |
| 既存の副露はポン・カンのみ | `src/core/input.ts` `Meld` | ソースで確認 |
| 一発は立直とは別入力 | `src/core/input.ts` 69行 `ippatsu`、`src/core/result.ts` 110行 | ソースで確認 |
| F3 は Web Worker で計算する | `docs/requirements.md`(【確定】) | 文書で確認 |
| 三麻は108枚 | `docs/mahjong-rules.md` §1(【確定】) | 文書で確認 |
| 抜きドラ設定でも手牌の北は客風牌、西表示で抜き北に表ドラ・立直時に裏ドラ | `docs/mahjong-rules.md` §2(【確定】) | 文書で確認 |
| 公開デモの設定項目と出力 | ページ本文を取得できず | 検証不能 |
