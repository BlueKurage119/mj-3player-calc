# Issue化ドラフト(Epic単位)

更新日: 2026-11-14(Epic F の F1 を登録・旧 F2 を F1 に統合、牌タップ操作の Issue を起案)

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

- **[C1. MD3 テーマ基盤](https://github.com/BlueKurage119/mj-3player-calc/issues/39)**
  `@material/material-color-utilities` によるトークンの生成、ライト・ダーク、色トークンの規約。
- **[C2. Material Web のラッパーと自作コンポーネント](https://github.com/BlueKurage119/mj-3player-calc/issues/40)**
  使える部品はラップ・改造し、Expressive 固有の部品(形状・モーション等)は自作する。部品の一覧はヒアリングで決める。
- **[C3. 牌画像](https://github.com/BlueKurage119/mj-3player-calc/issues/41)**
  FluffyStuff/riichi-mahjong-tiles(CC0)の取り込み。クレジット表示。

## [Epic D: 入力 UI](https://github.com/BlueKurage119/mj-3player-calc/issues/5)

- **[D1. 画面の骨格](https://github.com/BlueKurage119/mj-3player-calc/issues/51)**
  入力と結果を1ページ(縦スクロール)に収める骨格。入力側の下に結果側を置き、入力側の上部が隠れるときは要約カードを上部に固定する。結果側はバナー程度の小カードから、スクロールで展開する(2状態の切り替え。中身は Epic E)。パレット・テンキー・状況役の入力は非モーダルの底部シートで行う(シートの機構を含む。中身は D2・D3・D5)。入力状態(`useReducer` + Context)と計算(`generateResult`)の呼び出し口。ヘッダーはタイトルと3点リーダーメニュー(設定・オールクリア。`md-menu` のラッパーを含む)。ステッパー部品(積み棒・供託・抜き北で共有)。手牌カードのバケツ(手牌クリア)。`?gallery=tiles`・`?gallery=md` の分岐は開発時限定にする。バンドル予算の維持(基準は [業務標準 09](rules/09-bundle-budget-protocol.md)。計算部の `lazy` 分離、実測)。要約カードで `Tile` を使うため、牌 SVG の出力・precache を D1 で確認する。
- **[D2. パレット入力](https://github.com/BlueKurage119/mj-3player-calc/issues/46)**
  底部シート内のパレット。三麻の牌だけを表示する。枚数の上限、赤牌。手牌の1行表示と並べ替え。シート内の AC(手牌クリア)と、牌を1枚ずつ消す手段。牌のタップでの削除は採用しない。
- **[D3. テンキー入力](https://github.com/BlueKurage119/mj-3player-calc/issues/47)**
  底部シート内のテンキー。mj-mighty-calc の自作部分(`Tenkey.tsx` 等)を移植する。物理キーボード対応。AC・バックスペース。D2 と入力内容を共有する。
- **[D4. 副露・抜き北・ドラ表示牌の入力](https://github.com/BlueKurage119/mj-3player-calc/issues/48)**
  ドラ・裏ドラのカード(横並び2枚)、副露の追加ボタン、抜き北(D1 のステッパーを使う)。副露はポン・明槓・暗槓(加槓は明槓と同一扱い。チーは出さない)。抜き北は北が共通役牌のルールでは無効にする。裏ドラ表示牌も入力し、計算コアには表裏をまとめて `dora` で渡す。計算コアの `Chii` 型等の削除は含まない。
- **[D5. 状況の入力](https://github.com/BlueKurage119/mj-3player-calc/issues/49)**
  自風・場風(`ConnectedButtonGroup`)、積み棒・供託(D1 のステッパーを使う)、状況役のカードと底部シートの中身(立直などの偶然役)、要約カードの文言。ツモ／ロンは入力させない(結果側で並べて表示する)。ルールに応じた出し分け(オープン立直・燕返し・槓振り・一発なし)。抜き北へのロン・嶺上ツモの案内。
- **[D6. ルール設定画面](https://github.com/BlueKurage119/mj-3player-calc/issues/50)**
  `RULE_ITEMS` から設定画面を組み立てる。入口は D1 のヘッダーの3点リーダーメニュー「設定」。プリセットの選択と一致表示(`RULE_PRESETS`・`findRulePreset`)、起動時の `loadRule` と変更時の `saveRule` の接続。テーマ切替 UI。未決: 項目の並び順・グループ・説明文、利用者プリセットの名前付き保存を含めるか。

## [Epic E: 結果表示](https://github.com/BlueKurage119/mj-3player-calc/issues/6)

- **[E1. 牌姿に応じた表示の切り替え](https://github.com/BlueKurage119/mj-3player-calc/issues/75)**
  `Result` の種類(和了形・聴牌形・それ以外・何切る)に応じた結果側の中身の振り分け。結果側の置き場の再定義(D5 で要約カードの結果欄を削除済み)、読み込み中・エラー・空の表示。
- **[E2. 和了の結果](https://github.com/BlueKurage119/mj-3player-calc/issues/76)**
  役一覧、翻・符、符の内訳、点数、ツモとロンを並べた支払いの内訳(mj-mighty-calc を参考に)。抜き北・北の表示名、役満の複合を認めないルールでの表示、設定と食い違う赤牌の注意表示。関連: [#62](https://github.com/BlueKurage119/mj-3player-calc/issues/62)(入力済み赤5の扱い)。
- **[E3. 聴牌の結果](https://github.com/BlueKurage119/mj-3player-calc/issues/77)**
  待ち牌ごとの役と打点(ツモとロン)、残り枚数。
- **[E4. 和了形・聴牌形以外の結果](https://github.com/BlueKurage119/mj-3player-calc/issues/78)**
  向聴数、有効牌の種類と枚数。打牌候補の一覧は F1。

## [Epic F: 何切る](https://github.com/BlueKurage119/mj-3player-calc/issues/7)

- **[F1. 打牌候補の一覧(v1)](https://github.com/BlueKurage119/mj-3player-calc/issues/88)**
  打牌候補ごとの向聴数、受け入れの種類と枚数(三麻の残り枚数で計算する)。聴牌・和了になる候補は、打点のレンジも表示する(旧 F2 を統合。livewing の `DiscardItem` を参考に)。要約バナー(`DiscardGlance`)を含む。含まない: 振聴の表示(河の入力が要るため、別の要件として後で扱う)、結果欄の牌のタップ操作(下記)。
- **F3. 聴牌確率・和了確率・期待値(v1 の後)**
  クリーンルームで独自実装し、Web Worker で計算する。公開されているアルゴリズム解説や論文を出典にする。

## Epic 未所属

- **[結果欄の牌タップによる打牌・ツモと、手牌タップによる削除](https://github.com/BlueKurage119/mj-3player-calc/issues/89)**
  結果欄の牌(何切るの打牌候補、有効牌、和了牌)のタップで、打牌・ツモを手牌に反映する。手牌の牌のタップで削除する。D1・D2 で確定していた「牌のタップでの削除は採用しない」を、オーナーの方針変更で改める(着手時に `docs/requirements.md` を改訂する)。所属する Epic は未決。

## [Epic G: PWA・リリース](https://github.com/BlueKurage119/mj-3player-calc/issues/8)

- **G1. オフライン対応とインストール**
  WASM・牌画像のプリキャッシュ、更新の通知、アイコン・マニフェスト。
- **G2. 配布**
  GitHub Pages 等への自動デプロイ。未決: 配布先。
- **G3. v1 リリース**
  ライセンス表示画面、README、受け入れ確認。
