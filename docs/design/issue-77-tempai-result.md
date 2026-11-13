# Issue #77 E3. 聴牌の結果 設計書

- 親: Epic E(#6)
- 依存: **E2(#76)のマージ後の main(`de9afd5`)を起点とする。** E1(#75)の `classify.ts`・`slots.tsx`・`ResultBody`・`ResultPanel`、E2 の `src/ui/result/hora/`(`HoraDetail`・`HoraItem`)・`hora-summary.ts` を前提にする
- ブランチ: `feature/issue-77-tempai-result`
- 版: 第4版(2026-11-13)

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- `gh issue view 77`(範囲: 待ち牌の一覧〔牌・残り枚数〕、待ち牌ごとの役・翻・符・点数、振聴の扱い)
- [issue-75-result-switch.md](issue-75-result-switch.md)(E1)、[issue-76-hora-result.md](issue-76-hora-result.md)(E2。2.5 本体の構成、2.11 要約カードの表示遅れの調査)
- 実装: `src/ui/result/classify.ts`・`slots.tsx`・`hora-summary.ts`・`ResultGlance.test.tsx`・`hora/HoraDetail.tsx`
- core: `src/core/result.ts`(`generateResultInner`)、`src/core/tile/shanten.ts`(`waitingTiles`)
- 参考実装(読み取り専用): `../ref-repo/mahjong-calc`(livewing)の `src/components/Result.tsx`・`ResultGlance.tsx`・`Tempai.tsx`・`HoraItem.tsx`・`HoraItemSummary.tsx`、`locales/ja.yml`
- 業務標準 01・02・06・07・09、指導文書 C-01・C-02・G-08・G-09・G-11

### 1.2 確定事項(ユーザー決定。再検討しない)

1. 見た目は mj-mighty-calc 準拠(E2 の `HoraItem` のカード意匠)、ロジックと表示内容は livewing 準拠(基本方針)。
2. **残り枚数は livewing に合わせる**: 部分入力(`tempai` 型。13枚未満の聴牌)のときだけ「×N」で表示し、完全入力(13枚の聴牌・14枚の和了。`kind: 'hora'` の打点つきの一覧 `hora[]`)では出さない。
3. 打点つきの一覧は E2 の現状(`hora[]` を `HoraItem` で平らに全件並べる)のまま。
4. **`tempai` 型の待ち牌は livewing どおり `count > 0` のものだけを「牌+×N」で出す。** 全て0枚、または待ち牌0件のときは「和了牌なし」を出す。本体(`TempaiBody`)・バナー(`TempaiGlance`)ともこの規則にそろえる(第3版 Q1 の対案を採用。第3版の確定事項4・5〔0枚も「×0」で出す〕は取り下げ)。
5. `hora[]` 0件のときバナーが「役なし」と出る既存の不具合を、バナー・本体とも「和了牌なし」に直す。
6. 空聴(待ちが全て0枚)は「和了牌なし」と表示するだけで、聴牌かどうかの判定は持たない(`docs/mahjong-rules.md` に記述が無いため)。**この表示は livewing 準拠である**(1.3 (c)(d))。
7. 振聴・牌タップ(打牌・自摸。`onTileClick?` は塞がない)は範囲外(後続)。
8. 要約カードの表示タイミングの遅れは範囲外(4章に引き継ぎ)。

### 1.3 livewing の実物と main の現状の照合(2026-11-13 再確認)

| 論点 | livewing(`../ref-repo/mahjong-calc/src/components/`) | main(`de9afd5`)の `src/ui/result/slots.tsx` | E3 |
| --- | --- | --- | --- |
| (a) 完全入力の一覧に残り枚数 | `Result.tsx` 32〜46行: `hora.map` で `HoraItem` を並べるだけ。`HoraItem.tsx`・`HoraItemSummary.tsx` に枚数の参照なし | `HoraBody`(57〜65行)→ `HoraDetail`。枚数なし | 変更なし |
| (b) `tempai` 型の本体 | `Tempai.tsx` 14行 `tileAvailabilities.filter(a => a.count > 0)`、16〜43行で見出し「聴牌」の下に `flex-wrap` で「牌ボタン+`&times; {a.count}`」を並べる | `TempaiBody`(67〜88行): 見出し「聴牌」の下に**全待ち牌を `Tile` で並べるだけ。0枚を除かず、枚数も出さない** | livewing どおりに改修(2.3) |
| (c) `tempai` 型のバナー | `ResultGlance.tsx` 32〜38行: `count > 0` で絞る | `TempaiGlance`(197〜216行): 200行 `filter(a => a.count > 0)`、0件なら「和了牌なし」 | **変更なし**(既に一致) |
| (d) 全0枚・0件の本体 | `Result.tsx` 56〜59行: `every(a => a.count === 0)` なら `Tempai` を出さず `Message` で「和了牌無し」(`locales/ja.yml` 64行)のみ。`[]` も `every` が真で同じ | `TempaiBody` に分岐なし(見出しのみ+空、または0枚の牌が並ぶ) | livewing どおり「和了牌なし」のみ(見出しも出さない) |
| (e) `hora[]` 0件 | `Result.tsx` 34〜36行: 「和了牌無し」 | `HoraGlance`(154〜167行)は `points` が無いと一律「役なし」。`HoraBody` は空の `.hora-detail` | 「和了牌なし」に直す(2.2) |

- 文言は E1 の既存「和了牌なし」(`TempaiGlance` 212行)を使う。livewing の表記「× N」(空白あり)に対し、本体の表記は「×N」(空白なし。375px で幅を詰める。見た目の差のみ)。

### 1.4 実行して確かめた事実

使い捨てテスト(`generateResult` → `classifyResult`。`DEFAULT_RULE`〔赤 5p・5s 各1〕、場東・自風南、状況なし)で実測した値。T01〜T09 は第2版・第3版作成時、T10・T11 は第4版作成時に実行した。

| ID | 牌姿・条件 | `kind` | 結果 | E3 の表示(本体/バナー) |
| --- | --- | --- | --- | --- |
| T01 | 13枚 `1111p456p789s111z` | **hora・0件** | 1p 単騎だが手牌で4枚使い切り | 和了牌なし / 和了牌なし(現行はバナー「役なし」・本体は空の `.hora-detail`) |
| T02 | 7枚 `123456p1z` | tempai | `[1z:3]` | 東×3 / 聴牌 待ち 東 |
| T03 | T02・ドラ表示 `111z` | tempai | `[1z:0]`(全て0枚) | 和了牌なし / 和了牌なし |
| T04 | 7枚 `123456p4z`・抜き北3 | tempai | `[4z:0]`(全て0枚) | 和了牌なし / 和了牌なし |
| T05 | 7枚 `34s567p11z` | tempai | `[2s:4, 5s:3, 赤5s:1]`(赤5は別要素) | 3組 ×4・×3・×1 / 牌3枚 |
| T06 | 7枚 `1111p234p` | tempai | `[4p:3]`(1p は4枚使い切りで出ない) | 4p×3 |
| T07 | 7枚 `1111p456p` / 4枚 `1111p` | tempai | `[]`(待ち牌0件) | 和了牌なし / 和了牌なし |
| T08 | 10枚 `234p567p34s99p`+明槓 `5s` | hora・2件 | 和了牌は 2s だけ | E2 のまま |
| T09 | 13枚 `234p567p34s678s99p`(E2 の R28) | hora・6件 | 2s・5s・赤5s × ロン/ツモ | E2 のまま(枚数なし) |
| T10 | 4枚 `1144z`・抜き北2 | tempai | `[1z:2, 4z:0]`(一部だけ0枚) | 東×2 の1組のみ / 聴牌 待ち 東(北は出ない) |
| T11 | 4枚 `1144z`・ドラ表示 `11z` | tempai | `[1z:0, 4z:2]`(一部だけ0枚) | 北×2 の1組のみ / 聴牌 待ち 北 |

- `waitingTiles` は手牌+副露で4枚使い切った牌を待ちに入れない(T06・T07。`hora[]` も同じ: T01・T08)。ドラ表示牌・抜き北で減った牌は待ちに残り `count` が 0 になる(T03・T04・T10・T11)。
- `hora[]` 0件のバナーの不具合の原因(コード確認): `horaGlanceParts`(`hora-summary.ts` 74〜86行)は空配列にロン・ツモとも `kind: 'none'` を返し、`HoraGlance` は `points` が無いと一律「役なし」を出す。`HoraDetail`(19〜34行)は空の `<div class="hora-detail">` を出すだけ。

### 1.5 ルール解釈(07号)

- 新たな麻雀ルールの解釈を組み込まない。残り枚数は core が返す `tileAvailabilities[].count` をそのまま使う(UI で計算しない)。空聴は判定せず、表示を livewing に合わせるだけ(確定事項6)。振聴は扱わない。

## 2. 設計

### 2.1 モジュール構成

| ファイル | 変更 | 内容 |
| --- | --- | --- |
| `src/ui/result/slots.tsx` | 改修 | `TempaiBody`(2.3)、`HoraGlance`・`HoraBody` の0件分岐(2.2) |
| `src/ui/result/result.css` | 改修 | `TempaiBody` の「牌+×N」の組の書式(必要なら `result-body__text` の書式) |
| `src/ui/result/*.test.tsx`(新規または既存に追記) | 改修 | 2.5 の E3 テスト |

変更しないもの: `TempaiGlance`(既に livewing と一致)、`ResultGlance.test.tsx` の既存テスト(`E1-6`〔全0枚で「和了牌なし」〕は維持)、`src/core/`、`classify.ts`、`hora-summary.ts`、`hora/` 配下すべて(`HoraDetail`・`HoraItem`・`hora.css`)、`MainScreen.tsx`・`ResultContext`。`src/ui/result/` から core への import は従来どおり `import type` のみ。

### 2.2 `hora[]` 0件(T01)

- `HoraGlance`: 先頭で `hora.length === 0` なら `<span className="result-glance__text">和了牌なし</span>`(外枠 `data-result-kind="hora"` は保つ)。1件以上は現状どおり(全件役なしなら「役なし」)。
- `HoraBody`: `hora.length === 0` なら `HoraDetail` を読み込まず `<p className="result-body__text">和了牌なし</p>`(外枠 `data-result-kind="hora"` は保つ)。

### 2.3 `TempaiBody`(`tempai` 型)

- 冒頭で `const available = tileAvailabilities.filter(a => a.count > 0)`(`TempaiGlance` と同じ規則)。
- `available.length === 0`(全0枚 T03・T04、0件 T07)のとき: 見出しを出さず `<p className="result-body__text">和了牌なし</p>` のみ(外枠 `data-result-kind="tempai"` は保つ。livewing `Result.tsx` 56〜59行)。
- それ以外: 見出し「聴牌」の下に、`available` の各待ち牌を「牌画像+×N」の組で横に並べ折り返す(livewing `Tempai.tsx`)。
  - 各組は `<span className="result-body__wait" data-tile-count={count}>` で包み、中に `Tile` と `<span className="result-body__wait-count tabular-nums">×{count}</span>`。
  - 並び順は core の返す順のまま。key は現行どおり牌+添字。
  - 色はトークンのみ(枚数は `--md-sys-color-on-surface-variant`)。HEX を書かない。
- `TempaiGlance` は変更しない。バナーに枚数は出さない。

### 2.4 初回 JS(09号)

- 基準値(main `de9afd5`、統括実測): 初回 JS(`dist/index.html` の `<script type="module" src>` が指すファイル)を `gzip -9 -c | wc -c` で **125,485 B**。
- 変更はすべて初回 JS の `slots.tsx` 内。小さいため遅延チャンクは使わない。`HoraDetail-*.js` は変わらない。
- 増分の積算(見積り): `TempaiBody` の `count > 0` 絞り込み・0件分岐・組の要素・「×」表示 +80〜130 B、`HoraGlance`・`HoraBody` の0件分岐(「和了牌なし」の文字列は既存と gzip 上で重複)+40〜80 B。合計 +120〜210 B。
- **目標値**: 初回 JS **125,750 B 以下**(+265 B)。`HoraDetail-*.js` は基準(gzip 4.65 kB)から変化なし。超過は不合格にしない(09号)。実測値を PR に残す。

### 2.5 テスト(命名は `E3-<番号>: …`)

| ID | 対象 | 内容 |
| --- | --- | --- |
| E3-01 | `HoraGlance` | 空の `hora[]` で「和了牌なし」を含み「役なし」を含まない |
| E3-02 | `HoraBody` | 空の `hora[]` で「和了牌なし」、`.hora-detail` を含まない、`data-result-kind="hora"` |
| E3-03 | `TempaiBody` | T05 で `.result-body__wait` が3組、`data-tile-count` が順に 4,3,1、「×4」「×3」「×1」、見出し「聴牌」 |
| E3-04 | `TempaiBody` | 全0枚(T03 `[1z:0]`、T04 `[4z:0]`)と0件(`[]`)で「和了牌なし」、`.result-body__wait` が0個、見出し「聴牌」なし、「×0」を含まない |
| E3-05 | `TempaiBody`・`TempaiGlance` | 一部だけ0枚(T10 `[1z:2, 4z:0]`)で本体の `.result-body__wait` が1組(`data-tile-count="2"`・「×2」)、「×0」を含まない。バナーは「聴牌 待ち」で牌1枚 |
| E3-06 | 結合 | `generateResult` → `classifyResult` で T01 が `kind: 'hora'`・0件、T03 が `kind: 'tempai'`・`[1z:0]`、T07 が `[]`、T10 が `[1z:2, 4z:0]` |

## 3. 範囲外

- 打点つきの一覧(`kind: 'hora'`)への残り枚数の表示。
- 振聴の判定・表示、待ち牌のタップによる打牌・自摸。
- 空聴・枯れの判定(表示は「和了牌なし」のみ)。
- 何切る(E4)・向聴の受け入れ枚数表示(`ShantenBody` は変えない)。
- 要約カードの表示タイミングの遅れ。`src/core/` の変更。

## 4. 後続への引き継ぎ

- 牌タップ: `GlanceTiles` の `onTileClick?` と `TempaiBody` の `result-body__wait` 要素をボタン化する。
- 振聴: 一覧の各 `HoraItem`(`data-hora-by="ron"`)にロン不可の印を足す形を想定。
- 要約カードの表示遅れ: `src/ui/screen/use-in-view.ts` と [E2 設計書 2.11](issue-76-hora-result.md#211-e1-持ち越し-b-要約カードの表示遅れの調査タスク修正しない) を参照。

## 5. 実挙動未確認

- 画面表示(`TempaiBody` の組の並び・375px での折り返し)は実装前のため未確認。受け入れ条件は DOM 構造と文字で判定する。
- 初回 JS の増分(2.4 は見積り)。実機(iOS Safari・PWA)の見え方(7章)。

## 6. 受け入れ条件

検収担当は上から順に実行する。期待値は 1.4 による。

1. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラーなし。
2. `git diff --stat main...HEAD -- src/core src/ui/result/hora src/ui/result/hora-summary.ts src/ui/result/classify.ts src/ui/result/ResultGlance.test.tsx` が空。`git diff main...HEAD -- src/ui/result/slots.tsx` で `TempaiGlance` 関数の中身に変更が無い。
3. import 規律: `grep -rnE "^import [^t].*from '(\.\./)+core/" src/ui/result --include='*.ts' --include='*.tsx' | grep -v '\.test\.'` が **0件**。`import { type …` だけの行がヒットした場合は目視で除く。
4. テスト名: `npx vitest run src/ui/result` の出力に `E3-01`〜`E3-06` がすべて現れ通過し、`E1-6` も改変されずに通過している。
5. 初回 JS: `npm run build` 後、`dist/index.html` の `<script type="module" src>` が指すファイルを `gzip -9 -c <file> | wc -c` で測り記録。目標 125,750 B 以下。`HoraDetail-*.js` のビルド出力 gzip を記録(基準 4.65 kB)。超過は不合格にせず PR に記録する。
6. 画面(dev。`npm run dev` を Browser pane で表示し、ペインを**表示した状態**で行う〔C-01〕。既定ルール・南家):
   - (a) 手牌 `1111p456p789s111z` でバナー・本体とも「和了牌なし」(「役なし」が出ない)。
   - (b) 手牌 `123456p1z` でバナー「聴牌 待ち」+東、本体に見出し「聴牌」と東「×3」の1組。
   - (c) (b) にドラ表示 東3枚を足す: バナー・本体とも「和了牌なし」で、牌も「×0」も出ない(本体に見出し「聴牌」も無い)。
   - (d) 手牌 `123456p4z`・抜き北3: バナー・本体とも「和了牌なし」。
   - (e) 手牌 `1111p456p`: バナー・本体とも「和了牌なし」。
   - (f) 手牌 `1144z`・抜き北2: 本体は東「×2」の1組だけ(北と「×0」が出ない)、バナーは「聴牌 待ち」+東1枚。
   - (g) 手牌 `34s567p11z` で本体に 2s「×4」・5s「×3」・赤5s「×1」の3組。
   - (h) 手牌 `234p567p34s678s99p` で本体の `.hora-item` が6件、「×」の枚数表示が無い(E2 から変化なし)。
   - 本体は 375×812 で `read_page`/`get_page_text`/`find`(`data-tile-count`)で判定してよい。
   - **バナー(a)〜(f)**: `resize_window` で **375×500** にし、**シートを閉じてから `scrollTo(0,0)`**(結果パネルが画面外)した状態で、`button[aria-label="計算結果へ移動"]` が visible になってから文字・牌を確認する。Browser pane が表示されている状態で行う(E1 条件9・E2 条件11 と同じ)。代わりに `javascript_tool` で `.result-glance` の `textContent`・牌要素の数を直接読んでもよい。
7. 本番ビルド: `npm run build && npx vite preview` で 6(a)(c)(f)(g) を再確認(バナーは 6 の補足どおり)し、`TempaiBody` の組の書式(CSS)が dev と同じに効いている(G-11)。
8. ダークテーマ: 6(g) をダークで表示し「×N」が背景に溶けない。`git diff main...HEAD -- src | grep -E '#[0-9a-fA-F]{3,8}\b'` で新規の HEX が無い。
9. ホームディレクトリ名: `git diff main...HEAD | grep -n "$(basename "$HOME")"` が空(docs も対象)。
10. 起動した dev/preview サーバーは自分で止める(01号)。

## 7. 実機確認(検収後にユーザーが行う。合否に含めない。C-02)

- iPhone の PWA で 6章 6(f)(g) を表示し、待ち牌の「牌+×N」の組が読みやすく折り返されること。

## 9. 未決事項(要ヒアリング)

- なし(第3版 Q1 は対案〔livewing どおり〕で確定し、1.2 確定事項4・6に移した)。

## 10. 改訂履歴


- 第1版(2026-11-13): 新規作成。
- 第2版(2026-11-13): 独立レビューの指摘4件を反映。裏ドラ表示牌の結合、和了済み判定を `hand.length % 3 === 2` に統一、バナーの確認方法、import 規律の例外を `remaining.ts` 1ファイルに限る判断、バンドル積算・既存テスト `E1-6` の特定を修正。
- 第3版(2026-11-13): ユーザー回答「すべて livewing 合わせ」を反映。残り枚数は `tempai` 型のみ「×N」とし、案A(打点つき一覧への残り枚数)とそれに伴う `remaining.ts`・`ResultContext.input`・`MainScreen` の裏ドラ結合・import 規律の例外・旧 T19〜T21・旧 E3-12/13・関連の受け入れ条件・旧 Q1〜Q3 を削除。livewing の実物確認(1.3)を追加し、食い違い1点を Q1 に挙げた。実測値・テスト・受け入れ条件・バンドル目標(125,800 B)を残る範囲に整理。
- 第4版(2026-11-13): 第3版 Q1 への回答「livewing 合わせ(対案)」を反映。`tempai` 型は `count > 0` の待ち牌だけを「牌+×N」で出し、全0枚・0件は本体・バナーとも「和了牌なし」(本体は見出しも出さない。livewing `Result.tsx` 56〜59行)。「×0」表示・`TempaiGlance` の改修・`E1-6` の改訂を削除。main の `TempaiBody` の現状と livewing の照合(1.3)を表にし、一部だけ0枚の実測 T10・T11 を追加。テストを E3-01〜06 に振り直し、受け入れ条件・バンドル目標(125,750 B)を残る変更に整理。未決事項なし。
- 2026-11-13 UI 監修による変更(ユーザー指示): (1) 和了0件(`hora[]` が空)のとき `ResultPanel` は `result-panel--flat` を付けず、「和了牌なし」を聴牌と同じくカードの中に出す。(2) 手牌が13枚形(`input.hand.length % 3 === 1`)のとき、和了形のバナーは点数でなく「聴牌 待ち」+待ち牌(重複なし)を出す(`MainScreen` → `ResultBanner`・`ResultGlance`・`HoraGlance` の `waitInput`)。14枚形は従来どおり点数。本体のカード一覧は変えない。テスト E3-07・E3-08 と `ResultPanel.test.tsx` の1件を追加。
- 2026-11-13 UI 監修による変更(ユーザー指示): 結果パネルの最小高さ(16rem)をやめて高さを中身に合わせ、角丸を他のカードと同じ `--md-sys-shape-corner-large`(16px)にする。
- 2026-11-13 UI 監修による変更(撤回): 要約カードを出す判定の上端にカードの高さを足す案は、50% の閾値と合わせると、ページ先頭で風の行が半分も「見えている」ことにならず、カードが消えなくなるため取り下げた。
- 2026-11-13 UI 監修による変更(ユーザー指示): 要約カードの「見えている」の割合を 10% 以上から 50% 以上にする(`MainScreen` の `viewOptions.minRatio`)。1行目の対象は風の行だけ、3行目の対象は門前の手牌のカードだけ(副露の領域を含まない)で、いずれも現状の ref の付け方のまま(変更なし)。
- 2026-11-13 UI 監修による変更(ユーザー指示・A案): 要約カードを出すときだけ、判定の上端をヘッダーの下に 20px 足す(`MainScreen` の `SUMMARY_SHOW_EXTRA_PX`。カードの最小の高さの約半分。全高を足すとページ先頭で出てしまうため半分にとどめる)。カードが出ている間は足さず、出す・隠すでしきい値を分けてちらつきを抑える。先の「撤回」(高さの全量を足す案)の代わりの方式。
- 2026-11-13 UI 監修による変更(ユーザー指示): 要約カードのドラの行・手牌の行を出す判定で、カードの上の行が覆う高さを足す。ドラは状況の行だけのカードの高さ(初期値 36px)、手牌は状況+ドラ(同 68px。ドラの行が出ていないときは状況の行だけ)で、表示中に実測して更新する(`MainScreen`)。カードの陰に隠れた手牌が、半分見えている扱いで要約に出ない件の修正。手牌の判定の対象は手牌カードだけで副露を含まないことを確認した(`handRef` は `HandCard` だけを囲む)。
