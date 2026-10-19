# 参照リポジトリ調査とライセンス方針

調査日: 2026-10-19 ／ 対象: `ref-repo/` に clone した3リポジトリ（各 default branch の最新）

> 本書は技術者向けのライセンス整理であり、法的助言ではありません。

## 1. ライセンスの実態

| リポジトリ / 依存 | ライセンス | 確認方法 | 扱い |
|---|---|---|---|
| livewing/mahjong-calc | **MIT**（Copyright 2021 livewing.net） | `LICENSE`、`package.json` | **ベースとして流用可**。LICENSE と著作権表示を保持する |
| ┗ wasm/decomposer（Rust） | **MIT** | `Cargo.toml` | 流用可 |
| nekobean/mahjong-cpp | **GPL-3.0** | `LICENSE` | **コードは使わない**（理由は §3） |
| BlueKurage119/mj-mighty-calc（自作） | 未設定 | — | 依存ライブラリに問題がある（下記） |
| ┗ riichi-ts | **GPL-3.0-or-later** | npm registry | 問題の原因 |
| ┗ riichi-rs-bundlers | 未記載（実体 riichi-rust に LICENSE なし） | npm registry／過去の調査 | 問題の原因 |
| ┗ riichi-mahjong-tiles（React SVG） | MIT | npm registry | 使用可 |
| FluffyStuff/riichi-mahjong-tiles（牌画像） | **CC0（パブリックドメイン）** | 上流の `LICENSE.md` | 使用可。mahjong-calc の README には「CC BY」とあるが、上流は現在 CC0。クレジットは礼儀として残す |

### mj-mighty-calc について
riichi 系ライブラリを import しているのは次のファイルです: `App.tsx`, `ui/LuckSheet.tsx`, `ui/TileImage.tsx`, `core/{almighty,tiles,analysis,yakuNames,backend}.ts`。
これら以外の自作コード（`core/payment.ts`, `core/waits.ts`, `ui/Tenkey.tsx`, `ui/ResultPanel.tsx` など）は作者本人のものなので、**riichi への依存を取り除けば新プロジェクトへ持ち込めます**。ただし、riichi の型やAPIの形に合わせて書かれた部分は、新しいコア（mahjong-calc ベース）のインターフェースに合わせて書き直す前提です。

## 2. livewing/mahjong-calc の三麻対応性（過去の調査の未確認点を確認）

過去の調査で「最大の関門」とされていた WASM の境界を確認しました。

- WASM 側の入口は `decompose_from_counts(counts: &[u8], meld: i32)` の1関数だけです。入力は**34種の枚数配列**です（`counts.rs` で長さ34をチェック）。
- 三麻の手牌は、2m〜8m の枚数を0にした34要素の配列として渡せます。分解は枚数を見て行うので、**Rust 側を改造しなくても三麻の手牌を分解できます**（1m・9m は順子を作れないだけで、刻子・対子・孤立牌としては正しく扱われます）。
- 役判定（`hora.ts` 約1000行）、符（`fu.ts`）、点数（`score.ts`）、ルール（`rule.ts`）はすべて TS 側にあります。三麻対応の改修は TS 側だけで完結します。
- 既存の `Rule` には次の設定があります: 赤ドラ（色ごとに0〜4枚）、切り上げ満貫、数え役満、複合役満、各種ダブル役満、連風牌の符、本場の点数。**要望のルール切り替えはこの仕組みを広げる形で作れます**。
- 四麻を前提にしている箇所（改修が必要）
  - `table.ts` の `Wind` に北家がある → 三麻では自風を東南西に限る
  - 支払いの計算（親子の2区分、4人払い前提）→ ツモ損モードごとの計算に置き換える
  - `tileAvailableCount`（残り枚数）が全種類4枚前提 → 2m〜8m を0枚にし、抜き北を減らす
  - ドラ表示牌の「次の牌」→ 1m→9m、9m→1m
  - 何切るの結果は「向聴数と受け入れ枚数」まで。聴牌確率・和了確率・期待値はない

## 3. 何切るシミュレーターの方針（今決めること）

### GPL が問題になる理由
mahjong-cpp を WASM 化してブラウザに配信すると、利用者に複製を渡すことになり「頒布」に当たります。その場合、組み合わせて動くアプリ全体に GPL-3.0 が及ぶと考えるのが安全側の解釈です。リポジトリを分けても、1つのアプリとして結合して配るなら回避できません。

### 選択肢

| 案 | 内容 | 利点 | 欠点 |
|---|---|---|---|
| **A. 独自実装（推奨）** | 受け入れ枚数は mahjong-calc の MIT 実装を使う。聴牌確率・和了確率・期待値は、公開されているアルゴリズムの解説や論文をもとに自分で実装する | アプリ全体を MIT などで自由に決められる | 期待値計算の実装コスト。精度を検証する必要がある |
| B. 全体を GPL-3.0 で公開 | mahjong-cpp をそのまま WASM 化して組み込む | 実績ある計算結果がすぐ手に入る | 本アプリ全体のソースを GPL で公開する義務。WASM 化と三麻化（mahjong-cpp は四麻前提）の作業も必要 |
| C. サーバーで計算 | mahjong-cpp をサーバーで動かし API で呼ぶ（GPL-3.0 は AGPL ではないので、サーバー利用だけなら頒布に当たらない） | クライアントは自由なライセンスにできる | オフライン PWA と両立しない。サーバーの運用費 |

### 推奨: 案A を段階的に進める
1. **フェーズ1**: 打牌候補ごとの向聴数、受け入れの種類と枚数（mahjong-calc の既存機能を三麻向けに直したもの）
2. **フェーズ2**: 聴牌確率・和了確率・期待値（独自実装。Web Worker で計算）

**クリーンルームの注意**: 案A を選ぶ場合、mahjong-cpp の `src/` は**読まない**ようにします。参考にするのは README、公開されているドキュメント、画面の挙動（何を表示するか）までとします。今回の調査でも `src/` は開いていません。誤って参照しないよう、`ref-repo/mahjong-cpp` から `src/` を削除しておくことをお勧めします。

## 4. 要件に追加・変更すること

### ルール設定（初期値は【基準】）
| 項目 | 選択肢 |
|---|---|
| 赤ドラ | 2枚【基準】（5p・5s 各1）／4枚（5p・5s 各2）／全赤（5p・5s 全て）。mahjong-calc の色別枚数設定を流用する |
| 数え役満 | あり【基準】／なし |
| 切り上げ満貫 | なし【基準】／あり |
| ツモ損 | あり／なし（ロン打点折半）／なし（北家分折半）※基準は要決定 |
| 北の扱い | 抜きドラ／共通役牌 ※基準は要決定 |
| 本場の点数 | 三麻では1本場あたりの点数を設定値にする（mj-mighty-calc の README に記載の課題） |

- ルールのプリセット（よく使う組み合わせを名前付きで保存）があると便利です。
- 設定は localStorage に保存します（mahjong-calc の既存の仕組みを流用）。

### PWA
- mahjong-calc は `vite-plugin-pwa` と Workbox で PWA 化済みです。この構成をそのまま引き継ぎます。
- WASM と牌画像をプリキャッシュの対象に含め、オフラインで全機能が動くようにします（案A を採る前提）。

## 5. 推奨する土台の作り方

`mj-3player-calc/`（git 管理）に **livewing/mahjong-calc のコアを取り込んで** 始め、`LICENSE` に livewing.net の著作権表示を残します。そのうえで:

1. 三麻向けにする（牌の構成、自風、ドラ表示、残り枚数）
2. ルールを拡張する（ツモ損、北の扱い、赤ドラのプリセット）
3. UI を MD3 Expressive に置き換え、テンキー入力（mj-mighty-calc の自作部分）を移植する
4. 何切るのフェーズ1 → フェーズ2

mahjong-calc は React 19 + Vite 6 + Tailwind 4 + i18next の構成なので、希望の React + Vite と合っています。MD3 Expressive を Tailwind のトークンで表現するか、Material Web Components を使うかは別途検討します。

## 6. 決定事項（2026-10-19）
- 何切るは**案A（独自実装）**で進める。mahjong-cpp のコードは使わず、`src/` も参照しない（`ref-repo/mahjong-cpp/src` は削除済み）
- 本アプリのライセンスは **MIT** を想定する。`LICENSE` には livewing.net と本プロジェクトの両方の著作権表示を記載する

- mahjong-calc は fork せず、新規プロジェクトにコアだけを取り込む(`src/core/`、`wasm/decomposer/`)

## 7. 未決事項
1. ツモ損と北の扱いの基準値(Epic A のヒアリングで決める)
