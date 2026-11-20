# Issue #136 F3-0a 機能比較調査報告

## 0. 調査の前提

- 調査担当: Claude Opus 5.5(Claude Code サブエージェント)
- 調査日: 2026-11-20
- 目的: 親 #111(F3: 何切る結果への聴牌確率・和了確率・期待値の追加)の F3-1(計算エンジン)ヒアリングの判断材料とする
- 本書は事実と推測を区別して書く。推測には「推測」、確かめていないものには「未確認」と付ける

### 0.1 クリーンルーム遵守の申告

- **mahjong-cpp について読んだもの**: GitHub 上の README.md(raw 表示)の文章のみ。あわせて GitHub API でリポジトリのメタデータ(ライセンス種別・最終 push 日時)を取得した
- **mahjong-cpp について読まなかったもの**: `src/`・`include/` その他すべてのソースファイル、サンプルコード、Issue/PR 内のコード、ブログ等のコード引用。ローカルのクローンや親フォルダ側(`ref-repo` 等)は探索も閲覧もしていない
- 公開デモ(pystyle の「麻雀何切るシミュレーター」)はページ取得を試みたが、本文(設定項目・結果の列)を取得できなかった。**デモの挙動は観察していない**
- ビルド済みバイナリ・API サーバーは実行していない。**入出力の実観察はしていない**
- `mahjong-algorithm-book` は今回参照していない
- 調査中にソースの一部を目にしたことはない
- 備考: GitHub API によると mahjong-cpp のライセンスは **GPL-3.0** である。ソースを読まない・出力を検算データにしない方針は、ライセンス上も維持すべきである

## 1. 調査対象

| 対象 | 版・時点 | 取得元 | ライセンス | 確認手段と結果 |
| --- | --- | --- | --- | --- |
| ① mahjong-cpp | 既定ブランチ `master`、最終 push 2026-08-18(版番号は未確認) | https://raw.githubusercontent.com/nekobean/mahjong-cpp/master/README.md | GPL-3.0 | `gh api repos/nekobean/mahjong-cpp` で `license.spdx_id = GPL-3.0` を確認。README を取得して機能記述を確認。README 本文にはライセンス記載なし |
| ② 既存資産 | ブランチ `docs/issue-136-feature-survey`(起点 `e4f9fa6`) | 本リポジトリの `src/core/`・`wasm/decomposer/` | MIT(livewing/mahjong-calc 由来) | ソースを読んで確認(テストは実行していない) |
| ③ shanten-dp | 0.3.2(docs.rs の latest) | https://docs.rs/shanten-dp/latest/shanten_dp/ 、https://github.com/tomohxx/shanten-dp-rust | MIT | docs.rs のクレートトップ・`calc_shanten2`・`make_tile_limits`・`Mode` の各ページ、GitHub の README を取得。`gh api repos/tomohxx/shanten-dp-rust` で `MIT` を確認。**ビルド・実行はしていない**(未確認) |

## 2. 機能対応表

判定は「F3 の要求を満たすうえで、既存資産+shanten-dp でどこまで賄えるか」を表す。
カバー=そのまま使える / 部分=一部のみ、または改修が要る / なし=新規実装が要る / 不要=F3 では要らない。

mahjong-cpp の仕様欄は README の記述だけに基づく。README は機能名を挙げるだけで入出力の詳細を書いていないため、多くの行で詳細は「未確認」になる。

| 機能 | ① mahjong-cpp の仕様(README) | ② 既存資産 | ③ shanten-dp | 判定 | 根拠 |
| --- | --- | --- | --- | --- | --- |
| 向聴数(一般形) | 向聴数計算あり | あり。WASM の分解器で最小向聴数と分解結果を返す | あり(`Mode::STANDARD`) | カバー | ② `wasm/decomposer/src/lib.rs` `decompose_from_counts`、`src/core/tile/shanten.ts` `minShanten`。③ docs.rs `calc_shanten` / `Mode` |
| 向聴数(七対子) | 向聴数計算の対象に含む旨の記載 | あり | あり(`Mode::SEVEN_PAIRS`。4枚使い七対子の可否を引数で切替) | カバー | ② `countChitoitsuShanten`。③ `calc_shanten2` の `four_tile_seven_pairs` |
| 向聴数(国士無双) | 同上 | あり | あり(`Mode::THIRTEEN_ORPHANS`) | カバー | ② `countKokushiShanten`。③ docs.rs `Mode` |
| 有効牌(受け入れ) | 有効牌計算あり | あり。種類と残り枚数(見えている牌を差し引く)を返す | あり(`Data.waits` をビットで返す。枚数は返さない) | カバー | ② `src/core/result.ts` の `tileAvailabilities`、`waitingTiles`・`shantenTiles`、`src/core/tile/index.ts` `tileAvailableCount`。③ docs.rs `calc_shanten2` / `Data` |
| 不要牌・何切る候補 | 不要牌計算あり | あり。打牌ごとに次の向聴数と受け入れを列挙 | あり(`Data.discards`) | カバー | ② `src/core/result.ts` `Discard`・`DiscardShanten`。③ `Data.discards` |
| 聴牌確率 | 期待値計算機能に含む(巡目ごとに示される旨) | なし | なし(確率の記載なし) | なし | ③ docs.rs クレートトップに確率関連 API なし |
| 和了確率 | 同上 | なし | なし | なし | 同上 |
| 期待値(打点の期待値) | 同上 | なし。ただし和了形の点数計算はある | なし | なし(点数評価の部品は②にある) | ② `calculateHoraScore`(`src/core/hora-score.ts`) |
| 点数計算 | 点数計算あり(立直等のフラグ指定) | あり。三麻ルール(抜き北・ツモ損等)込み | なし | カバー(②) | ② `src/core/result.ts` `generateResult`、`src/core/rule.ts`(`DEFAULT_NORTH = 'nukidora'`、`DEFAULT_TSUMO_LOSS`) |
| 手替わりの考慮 | README に記載なし(未確認) | なし | なし | なし | — |
| 向聴戻しの考慮 | README に記載なし(未確認) | なし(何切るは最小向聴の打牌が中心。向聴を落とす打牌の評価は未確認) | `discards` は向聴数を維持する打牌を表すと推測(未確認) | なし | — |
| 立直の考慮 | 点数計算の設定に立直フラグがある旨 | 和了形の点数計算で立直・ダブル立直・オープン立直・一発に対応 | なし | 部分(和了時の加算は可。期待値計算で「聴牌即立直」とするかは未設計) | ② `src/core/input.ts` `HandOptions.riichi` |
| 巡目の考慮 | 期待値計算の結果が巡目ごとに示される旨 | なし | なし | なし | — |
| 赤ドラ | ルール設定で指定可能の旨 | あり(色ごとの赤枚数、残り枚数計算にも反映) | なし(34種の枚数のみで赤を区別しない) | 部分(向聴・受け入れは赤無視で可。期待値には②の赤処理を通す必要) | ② `src/core/rule.ts` `redCountOf`、`tileAvailableCount` |
| 抜き北 | README に記載なし(三麻対応自体が未記載) | あり(`input.nuki`、北を抜きドラとして加算) | なし。ただし34種の北を手牌から除くのは呼び出し側で可能 | 部分(引いた北を抜いて嶺上で補充するモデルは新規) | ② `src/core/result.ts` の北の扱い、`src/core/rule.ts` `DEFAULT_NORTH` |
| ドラ | 表示牌で指定可能の旨 | あり | なし | カバー(②) | ② `Input.dora` |
| 裏ドラ期待値 | 裏ドラ表示牌を指定可能の旨(期待値に乗るかは未確認) | 裏ドラ表示牌の入力と加算あり。期待値としての扱いはなし | なし | 部分 | ② `Input.uradora`、`src/core/ura-dora.test.ts` |
| 残り枚数・見え牌 | 未確認 | 手牌・副露・ドラ表示牌・裏ドラ表示牌・抜き北を見え牌として差し引く。河や他家の見え牌の入力はない | `tile_limits`(`[u8; 35]`)で各牌の上限枚数を渡せる | 部分 | ② `src/core/result.ts` の `allInputTiles`。③ `make_tile_limits` |
| 副露 | 副露面子の指定が可能な旨 | あり(ポン・カン。三麻のためチーなし) | あり(手牌枚数 `m` で副露数を表す) | カバー | ② `src/core/input.ts` `Meld`(`pon`・`kan`)。③ README「副露に対応」、`calc_shanten2` の `m` |
| 三人麻雀の牌(2m〜8m なし) | README に記載なし(未確認) | あり | あり(`make_tile_limits(true)` で 2m〜8m を0枚に) | カバー | ② `isSanmaTile`・`isSanmaIndex`。③ docs.rs `make_tile_limits` |
| チーなし | 未確認 | 副露型にチーがない | 有効牌計算はツモのみ想定と推測(未確認) | カバー(一人麻雀モデルならツモのみで足りる) | ② `src/core/input.ts` |
| 他家の扱い(ロン・放銃・流局) | README に記載なし | なし | なし | 不要または選択(4章) | — |
| 出力形式 | 英語出力の切替あり。Docker で HTTP サーバーとして起動できる旨。JSON の項目は未確認 | TS の型(`Result`)を UI に渡す | Rust の関数・構造体 | 不要(mahjong-cpp の形式に合わせる必要はない) | ① README のビルド節 |
| 実行環境 | C++17・Boost・CMake | ブラウザ内(TS + WASM) | Rust(依存 `bitflags`・`thiserror`)。WASM 化は可能と推測(未確認) | — | ③ docs.rs の依存一覧 |

## 3. 三人麻雀への適合のまとめ

- 牌の種類: ② と ③ はともに 2m〜8m の除外に対応している。① は README から読み取れない
- 北: ② は抜きドラとして扱える。③ は北を特別扱いしない。期待値計算では「北を引いたら抜いて補充する」遷移を独自 DP 側で表す必要がある(推測)
- チー: 三麻にはないため、一人麻雀モデル(ツモのみ)なら影響しない
- 牌山の総数: 三麻は 108 枚で、王牌の扱いや残りツモ回数が四麻と異なる。巡目の上限は独自に決める必要がある(要件側で未確定)

## 4. 扱いの選択肢

推奨は参考であり、決定ではない。コスト感は相対的な推定。

### 4.1 一人麻雀モデル(他家のロン・鳴き・流局を無視)

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 他家を無視し、自分のツモだけで確率を出す | 実装と説明が単純。DP の状態が小さい | 実戦の和了率より高めに出る | 小 |
| B. 他家の和了・流局を一定確率で打ち切る近似 | 数値が実戦に近づく | 近似パラメータの根拠が要る | 中 |

推奨: A。B は要望が出てから。

### 4.2 巡目

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 残りツモ回数を入力に取り、その回数で確率を出す | 正確で自然 | 入力 UI が増える | 中 |
| B. 固定(例: 序盤想定の一定回数) | UI が増えない | 終盤で値がずれる | 小 |
| C. 巡目ごとの表を出す | 情報量が多い | スマホの画面に収めにくい | 中〜大 |

推奨: A(既定値付き)。三麻の残りツモ回数の上限は要件で確定が要る。

### 4.3 手替わり

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 考慮しない(聴牌したら待ちを固定) | 状態数が小さい | 良形変化を過小評価する | 小 |
| B. 聴牌後も期待値最大の打牌を選び続ける | 正確 | 状態数と計算時間が増える(#137 で測る) | 大 |

推奨: まず A。B は速度調査(#137)の結果で判断。

### 4.4 向聴戻し

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 考慮しない(向聴を維持する打牌のみ) | ③ の `discards` と相性がよい(推測) | 打点狙いの迂回を評価できない | 小 |
| B. 1回まで許す | 主要な迂回を拾える | 探索が広がる | 中〜大 |

推奨: A。

### 4.5 立直

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 聴牌したら即立直とみなす(門前時) | 一般的な想定。②の点数計算に立直を渡すだけ | ダマの判断を表せない | 小 |
| B. 立直の有無を利用者が選ぶ | 意図に合わせられる | UI が増える | 小〜中 |
| C. 立直とダマのよい方を自動で選ぶ | 正確 | 計算が倍になる | 中 |

推奨: A を既定とし、B を検討。一発・裏ドラを含めるかは 4.7 と連動。

### 4.6 抜き北

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 北を引いたら必ず抜き、ドラ1枚を加算して補充ツモ | 三麻の実戦に近い | 遷移が一つ増える | 中 |
| B. 北を通常の字牌として扱う | 単純 | 三麻の打点を過小評価する | 小 |

推奨: A(ルール設定 `north` が `nukidora` のとき)。`yakuhai` 設定時は B 相当。

### 4.7 赤ドラ・裏ドラ

| 選択肢 | メリット | デメリット | コスト |
| --- | --- | --- | --- |
| A. 赤は残り枚数の比率で期待加算、裏ドラは平均乗り枚数で期待加算 | 状態数を増やさない | 満貫の切り上がり等、点数の非線形を近似する | 小〜中 |
| B. 赤・裏の枚数を状態に含めて厳密に計算 | 正確 | 状態数が増える | 大 |
| C. 赤・裏を無視 | 最も単純 | 三麻では打点への影響が大きい(推測) | 小 |

推奨: A。

## 5. 先送り・不確実な事項

- **mahjong-cpp のソース閲覧が要る事項**: 手替わり・向聴戻しの扱い、期待値の定義(点数の扱い・裏ドラの扱い)、他家の扱い、三麻対応の有無。README に記載がなく、デモも観察できていないため、本調査では判断しない。ソースは読まない方針のため、確かめるならデモの挙動観察(人手でのブラウザ操作)で行うのが妥当
- 公開デモの設定項目・出力列: 自動取得では本文を得られず、未確認
- shanten-dp: `tile_limits` が 35 要素である理由(最後の1要素の意味)は docs.rs に記載がなく未確認。`waits`・`discards` のビット表現の詳細、WASM ビルドの可否、速度は未確認(速度は #137)
- ② の何切るで、向聴を落とす打牌を候補に含むかは本調査では詳しく確かめていない
- 三麻の残りツモ回数・王牌の枚数の扱いは `docs/requirements.md` 側の確定が要る

## 6. 根拠一覧

| 主張 | 根拠 | 状態 |
| --- | --- | --- |
| mahjong-cpp は向聴数・有効牌・不要牌・点数・期待値(聴牌確率・和了確率)を計算する | README の機能一覧 | README で確認 |
| mahjong-cpp の期待値は巡目ごとに示される | README の記述(取得ツールによる要約) | README で確認。挙動は未確認 |
| mahjong-cpp は C++17・Boost・CMake、Docker で HTTP サーバー起動 | README のビルド節 | README で確認 |
| mahjong-cpp は GPL-3.0 | `gh api repos/nekobean/mahjong-cpp` | 確認 |
| mahjong-cpp の三麻対応・手替わり・向聴戻し・他家の扱い | README に記載なし | 検証不能 |
| shanten-dp 0.3.2 は MIT | docs.rs、`gh api repos/tomohxx/shanten-dp-rust` | 確認 |
| shanten-dp の `calc_shanten2(hand: &[u8;34], tile_limits: &[u8;35], m, mode, four_tile_seven_pairs, check_hand) -> Result<Option<Data>, ShantenError>` | docs.rs `fn.calc_shanten2` | 確認 |
| `Data` は `shanten`・`discards`・`waits` を持つ | 同上 | 確認(型は未記載) |
| `Mode` は `STANDARD`・`SEVEN_PAIRS`・`THIRTEEN_ORPHANS` | docs.rs `struct.Mode` | 確認(定数の説明文はなく名前から判断) |
| `make_tile_limits(true)` は 2m〜8m を0枚にする | docs.rs `fn.make_tile_limits` | 確認 |
| shanten-dp に確率・期待値の API はない | docs.rs クレートトップの項目一覧 | 確認 |
| 既存の分解器は最小向聴数と分解結果を返す | `wasm/decomposer/src/lib.rs`・`shanten.rs` | ソースで確認 |
| 既存資産は七対子・国士の向聴数を計算する | `src/core/tile/shanten.ts` | ソースで確認 |
| 既存資産は打牌ごとの次向聴と残り枚数付き受け入れを返す | `src/core/result.ts`(`Discard`・`tileAvailabilities`) | ソースで確認 |
| 見え牌は手牌・副露・ドラ表示牌・裏ドラ表示牌・抜き北から差し引く | `src/core/result.ts` `allInputTiles`、`tileAvailableCount` | ソースで確認 |
| 既存資産は 2m〜8m を除外する | `src/core/tile/index.ts` `isSanmaTile`・`isSanmaIndex` | ソースで確認 |
| 既存の副露はポン・カンのみ | `src/core/input.ts` `Meld` | ソースで確認 |
| 公開デモの設定項目と出力 | ページ本文を取得できず | 検証不能 |
