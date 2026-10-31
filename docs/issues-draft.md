# Issue化ドラフト(Epic単位)

更新日: 2026-10-31(Epic B の Sub-Issue を登録)

[要件](requirements.md)を実装タスクに分けた下書き。Issue を登録したら、見出しを GitHub の Issue へのリンクにする。各 Epic は親 Issue とし、項目は着手時に Sub-Issue として登録する。マイルストーンは Epic ごとに設け(「Epic A: 計算コアの三麻化」など)、親 Issue とその Sub-Issue に付ける。識別番号(A1 など)は Issue 番号とは別で、どの Epic のどの項目かを示すために使う。各項目の未決事項は、着手前のヒアリングで決める。

**Version 1 の範囲**: Epic A〜E と G。Epic F はフェーズ1(F1・F2)のみ v1 に含める。

## Epic 0: 基盤(初回 push 前に main で実施。Issue 化しない)

- 計算コア・手牌分解器の取り込み、React + Vite + PWA の雛形(済)
- ハーネス(CLAUDE.md・AGENTS.md・業務標準・指導文書・サブエージェント定義)の移植(済)
- Biome・型検査・テストのスクリプトと GitHub Actions の CI(済)
- 要件・ライセンス方針・この下書き(済)

## 初回 push 直後に整備するもの(Issue 化しない)

- 業務標準 06(UI・MD3 Expressive)と 07(麻雀ルール・点数計算)、麻雀ルール仕様(済)

## [Epic A: 計算コアの三麻化](https://github.com/BlueKurage119/mj-3player-calc/issues/2)

- **[A1. 点数計算のゴールデンテスト整備](https://github.com/BlueKurage119/mj-3player-calc/issues/9)**
  改修前の挙動を固定する。出典付きの牌姿と期待値(役・翻・符・点数)。以降の改修の安全網。
- **[A2. 三麻の牌構成](https://github.com/BlueKurage119/mj-3player-calc/issues/10)**
  2m〜8m の除外(入力の検証、`shantenTiles`・`chitoitsuShantenTiles` の有効牌)、残り枚数の計算、ドラ表示牌の 1m⇔9m。
- **[A3. 三麻の卓情報](https://github.com/BlueKurage119/mj-3player-calc/issues/11)**
  自風を東南西に限る。親子の判定。本場の1本場あたりの点数を設定値にする。
- **[A4. 北の扱い](https://github.com/BlueKurage119/mj-3player-calc/issues/12)**
  抜きドラ(抜いた枚数×1翻、手牌の枚数に数えない)と共通役牌(刻子・槓子で1翻、雀頭の符)。
- **[A5. 支払い計算(ツモ損3方式)](https://github.com/BlueKurage119/mj-3player-calc/issues/13)**
  ツモ損あり／北家分折半／ロン打点折半。親・子それぞれのツモとロン。未決: 端数処理。
- **[A6. ローカル役とオープンリーチ](https://github.com/BlueKurage119/mj-3player-calc/issues/14)**
  [麻雀ルール仕様](mahjong-rules.md)§4.2 の役。牌姿で判定できる役から実装する。一括でオン・オフする。八連荘は実装しない。未決: 各役の定義の出典、状況の入力が要る役(燕返し・槓振り・人和・石の上にも三年)の入力方法。

## [Epic B: ルール設定](https://github.com/BlueKurage119/mj-3player-calc/issues/3)

計算コアと保存までを担当し、UI は後続の Epic が実装する。完了時点で、CUI アプリに接続すれば支払いまで含めた必要な計算ができる状態を目指す。B1〜B4 の着手条件は、オーナーから雀魂・麻雀一番街(三麻)の段位戦・大会戦・友人戦で可変な項目と設定値・範囲をまとめたスプレッドシートが支給されていること。

- **[B1. ルール項目の拡張](https://github.com/BlueKurage119/mj-3player-calc/issues/29)**
  [麻雀ルール仕様](mahjong-rules.md)の「変更可」の項目を `Rule` で表現し、計算コアに反映する(赤ドラ・`red.m` の削除・喰い断・供託・本場など)。連風牌の雀頭の符・役満の複合・各ダブル役満も変更可にする。ルール検査の関数(本場・供託は所定の範囲内かつ200の非負の整数倍)と、UI が参照する項目・選択肢の定義。未決: 本場・供託の範囲、スプレッドシートの内容の仕様への反映。
- **[B2. ルールの保存と版管理](https://github.com/BlueKurage119/mj-3player-calc/issues/30)**
  localStorage への版番号付きの保存。欠けた項目の所定値による補完、検査を通らない値は既定ルールに戻す。保存の実装がまだなく旧データが存在しないため、旧形式からの移行は扱わない。
- **[B3. ルールプリセット](https://github.com/BlueKurage119/mj-3player-calc/issues/31)**
  「雀魂段位戦」「一番街段位戦」の設定値を定数で持ち、現在のルールがどのプリセットに一致するか(一致しなければカスタム)を判定する。利用者が作ったプリセットの名前付き保存は後続の Epic で扱う。
- **[B4. 計算結果と支払いの接続](https://github.com/BlueKurage119/mj-3player-calc/issues/32)**
  `generateResult` から `calculatePayment` を呼び、ツモ損・本場・供託を含む支払額を返す。B1 で設定にした供託・本場の額を支払額に反映する。検査を通らないときの例外の返し方。B1・B2 に依存する。

## [Epic C: デザイン基盤](https://github.com/BlueKurage119/mj-3player-calc/issues/4)

- **C1. MD3 テーマ基盤**
  `@material/material-color-utilities` によるトークンの生成、ライト・ダーク、色トークンの規約。
- **C2. Material Web のラッパーと自作コンポーネント**
  使える部品はラップ・改造し、Expressive 固有の部品(形状・モーション等)は自作する。部品の一覧はヒアリングで決める。
- **C3. 牌画像**
  FluffyStuff/riichi-mahjong-tiles(CC0)の取り込み。クレジット表示。

## [Epic D: 入力 UI](https://github.com/BlueKurage119/mj-3player-calc/issues/5)

- **D1. 画面の骨格**
  入力部と結果部の配置(mahjong-calc を参考に)。片手操作を前提にする。
- **D2. パレット入力**
  三麻の牌だけを表示する。枚数の上限、赤牌。
- **D3. テンキー入力**
  mj-mighty-calc の自作部分(`Tenkey.tsx` 等)を移植する。物理キーボード対応。D2 と入力内容を共有する。
- **D4. 副露・抜き北・ドラ表示牌の入力**
- **D5. 状況の入力**
  自風・場風・ツモ／ロン・立直などの偶然役・本場・供託。

## [Epic E: 結果表示](https://github.com/BlueKurage119/mj-3player-calc/issues/6)

- **E1. 牌姿に応じた表示の切り替え**
  和了形・聴牌形・それ以外。
- **E2. 和了の結果**
  役一覧、翻・符、符の内訳、点数、支払いの内訳(mj-mighty-calc を参考に)。
- **E3. 聴牌の結果**
  待ち牌ごとの役と打点、残り枚数。

## [Epic F: 何切る](https://github.com/BlueKurage119/mj-3player-calc/issues/7)

- **F1. 打牌候補の一覧(v1)**
  向聴数、受け入れの種類と枚数。三麻の残り枚数で計算する。
- **F2. 打牌候補の打点(v1)**
  打牌後の聴牌の打点レンジ、振聴の表示(mj-mighty-calc を参考に)。未決: v1 に含めるか。
- **F3. 聴牌確率・和了確率・期待値(v1 の後)**
  クリーンルームで独自実装し、Web Worker で計算する。公開されているアルゴリズム解説や論文を出典にする。

## [Epic G: PWA・リリース](https://github.com/BlueKurage119/mj-3player-calc/issues/8)

- **G1. オフライン対応とインストール**
  WASM・牌画像のプリキャッシュ、更新の通知、アイコン・マニフェスト。
- **G2. 配布**
  GitHub Pages 等への自動デプロイ。未決: 配布先。
- **G3. v1 リリース**
  ライセンス表示画面、README、受け入れ確認。
