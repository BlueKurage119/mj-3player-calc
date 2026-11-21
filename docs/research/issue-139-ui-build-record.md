# Issue #139 製造記録(F3-2 UI統合)

- 対象: ブランチ `feature/issue-139-ui`(PR base `develop/v2.0`)。設計は `docs/design/issue-139-ui.md` 第5版
- 環境: Intel Core i7-9750H・macOS・headless Chrome(`bench/engine/run-chrome.mjs`)。時間は Worker 内の計算時間(冷)、T=18

## 1. E-1: 14枚入力で `oneShantenSlack: true`(M=0)の所要時間

`npm run build:engine-bench` の後、`--configs Bt_M0,Bt_M0_O --hands C-01,C-02,C-03,C-04 --runs 5`。
なお `run-chrome.mjs` は `--run-timeout` 省略時の既定(1e12 ms)が `setTimeout` の上限を超えて即時にタイムアウトする。測定時は `--run-timeout 1200000 --hand-budget 100000000` を明示した(bench の既存の不具合。本Issueでは直していない)。

| 手(14枚。s0=1) | Bt_M0 中央/最悪(ms) | Bt_M0_O 中央/最悪(ms) |
| --- | --- | --- |
| C-01 | 1,378 / 2,004 | 1,163 / 1,406 |
| C-02 | 684 / 839 | 711 / 734 |
| C-03 | 1,427 / 1,474 | 1,304 / 1,418 |
| C-04 | 442 / 453 | 436 / 449 |

判定: 全手で中央値 10 s 未満。14枚でも `oneShantenSlack` は true のままでよい(停止条件に該当しない)。

追加(s0=2・3 の M=0、`Bt_M0_O`、3回): C-05 7,850 / C-06 3,380 / C-07 6,283 / C-08 2,069 / C-09(s0=3)852 ms(中央値)。

## 2. E-1: 13枚聴牌で M=0 と M=1 の結果が一致するか

`computeEngine` を直接呼ぶ使い捨てのテスト(コミットしていない。`oneShantenSlack: true`、T=18、`candidates` の JSON 全体を比較)。

| 手(13枚) | M=0 / M=1 の所要時間(ms) | 結果 |
| --- | --- | --- |
| 1199m123456p789s(シャンポン) | 23 / 2 | 完全一致 |
| 111999m123456p1z(単騎) | 2 / 1 | 完全一致 |

判定: 聴牌では M による差が無い。13枚の聴牌・1向聴では計算方法の2択を出さない(1向聴は `oneShantenSlack` で M=1 相当に吸収済み)。標本は2手。

## 3. E-1b: 14枚入力で M=1(`Bt_M1`、1回)

| 手(14枚) | 開始向聴 | 所要時間 |
| --- | --- | --- |
| C-01 | 1 | 22,954 ms(約 23 秒) |
| C-07 | 2 | 69,113 ms(約 1.2 分) |
| C-05 | 2 | 139,347 ms(約 2.3 分) |
| C-09 | 3 | 50,700 ms(約 51 秒) |

判定: 最長 約 2.3 分。10 分を超える手はなかった(製造の停止条件に該当しない)。

## 4. 閾値 N と「時間がかかります」の判定表(t3-静的)の確定

- N = 5 秒(設計の仮置きのまま)。定数は `src/ui/engine/engine-estimate.ts` の `SLOW_THRESHOLD_SEC` と `SLOW_TABLE`
- 判定表(該当 = 「時間がかかります」を出す):

| 入力 | 方法 | 開始向聴0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- | --- |
| 13枚 | 概算 | 否 | 否 | 否 | 否 |
| 13枚 | 手替わりを詳しく | 否 | 否(2択自体を出さない) | 否(約2秒) | 該当(約11秒) |
| 14枚 | 概算 | 否 | 否 | 該当(2.1〜7.8 秒、4手中2手が 5 秒超) | 否(0.9 秒) |
| 14枚 | 手替わりを詳しく | 否 | 該当(23 秒) | 該当(69〜139 秒) | 該当(51 秒) |

- 14枚の開始向聴0(聴牌できる打牌がある)は、M=0 で 0.9〜1.2 秒、M=1 で 0.7〜0.8 秒の2手だけの測定(`1199m123456p789s5z`、`111999m123456p1z5z`)。標本が少ない。
- 13枚の数値の出典: #138 製造記録 §2・§3(13枚 M=0 の 3向聴は 261〜710 ms、M=1 の 2向聴 1,975 ms・3向聴 10,780 ms)。

## 5. バンドル(09号)

- 基準値: 128,930 B(設計書 §8。`origin/develop/v2.0` 116bb0f)
- 実測: `npm run build` 後、`dist/index.html` の `<script type="module" src>` が指す `assets/index-CREXG-XZ.js` を `gzip -9 -c | wc -c` = **129,480 B**(`modulepreload` なし)
- 増分: +550 B。積算した増分 +300 B との差は +250 B。目標値 129,230 B を 250 B 超過(目標値の運用により不合格にしない)
- 原因の見立て: 見出しのボタン(`EngineButton`・4つの Body への props 配線・`ResultPanel` の判定)、`engine-entry.ts`(出す条件の判定。純関数)、reducer の `open-help` と状態の追加、`MainScreen` の配線。意図しない取り込みは見つからなかった(初回JSに `md-dialog`・エンジン・グラフは入っていない)。設計の積算(約 +300 B)が小さかった
- 別実測(合計に含めない。`dist/assets`、生 / gzip -9):

| 資産 | 生(B) | gzip -9(B) |
| --- | --- | --- |
| 計算画面チャンク `EngineScreen-DFZ3eAAI.js` | 10,488 | 4,243 |
| 計算画面の CSS `EngineScreen-CsSgWRYi.css` | 5,450 | 1,281 |
| Worker チャンク `worker-C2wDO8TA.js` | 394 | 257 |
| Worker が読むエンジン本体 `compute-B9XXgJpi.js` | 52,320 | 16,404 |
| エンジン WASM `engine_bg-BxECnJPS.wasm` | 54,897 | 24,462 |
| 共有に分かれた `Disclosure-B4Wb-93X.js` | 694 | 403 |
| 参考: `HelpScreen-j-jPBWtD.js` | 11,577 | 3,963 |

## 6. 本番ビルドでの確認(G-11、U-13)

`npm run build` → `npx vite preview`(headless ではなくアプリ内ブラウザ)で、13枚2向聴(19m22p345p678s468s)を入力。

- 「計算」ボタンが本番ビルドでも出る。押すと計算画面に遷移し、「計算する」で結果が出る(和了率 0.1%・聴牌率 7.2%・期待値 11〔3巡目〕)。Worker チャンクが読み込まれ、WASM が動いて結果が返ることで確認した(アプリ内ブラウザのネットワーク一覧は Worker 内の取得を記録しないため、WASM 単体のリクエストは一覧では確認できていない)
- 360px・390px・430px 幅で `documentElement.scrollWidth` が画面幅と一致(横スクロールなし)。巡目別の表を開いた状態でも同じ
- 「手替わりを詳しく」に切り替えると前の結果が消え、「計算する」→ 約1秒後に経過秒・スピナー・「中止」→ 中止で未計算に戻り、エラー文言は出ない
- 情報アイコン → ヘルプの「確率・期待値」の節が開いた状態で表示 → 戻る で計算画面に戻る
- 14枚(上の手に東を足した形)で候補11行が期待値順に並び、開始向聴2の概算で「時間がかかります」が出る

## 7. 設計との差異・判断

1. 実行状態の持ち方: 設計の `useEngineRun(client?)` を、React 非依存の `createEngineRunner`(`engine-run.ts`)+薄いフック `useEngineRun(key, createClient)` に分けた。理由: プロジェクトのテストは `renderToStaticMarkup` のみで、DOM・フックの実行環境が無い。フェイク client とフェイクタイマーで状態遷移・経過秒・取り消し・遅着の無視を単体で検証するため。`running` に `elapsedMs` を足した
2. `HoraBody`(13枚聴牌の役あり)は見出しが無いので、「計算」ボタンだけの行(`.result-body__heading--action`)を一覧の上に足した
3. ヘルプの節は、既存の `Disclosure` 4つの後ろに5つ目の `Disclosure`「確率・期待値」を足し、外側の `div#help-engine` を `scrollIntoView` の対象にした(設計は `h3.help-screen__subheading` と書いていたが、既存節の中に入れると既定が開いた長い節になるため)。本文は仮文言(監修で差し替え)
4. `open-help` アクション・`helpFocus`・`helpReturn` を AppState に追加(`returnScreen` はライセンス画面への往復で上書きされるため流用せず別項目にした)
5. 計算ボタンの条件は、手牌の枚数が13枚または14枚(副露を除く)のときだけ。途中の枚数(10枚・11枚など)はエンジンが `not-applicable` を返すので出さない
6. 設計書 §3.1 が「壊れる」と見込んだ既存テスト(e4-shanten・f1-1-tile-tap)は、props 未指定時に HTML を変えない実装にしたため、変更なしで通る。更新したのは AppState の形が変わった `app-state.test.ts` のみ
