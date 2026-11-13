# Issue #78 E4. 和了形・聴牌形以外の結果 設計書

- 親: Epic E(#6)
- 依存: **E3(#77)のマージ後の main(`93e0388`)を起点とする。** E1(#75)の `classify.ts`・`slots.tsx`・`ResultBody`・`ResultGlance`、E3 の `TempaiBody`(「牌+×N」の組と `result.css` の `.result-body__wait` 系)を前提にする
- ブランチ: `feature/issue-78-shanten-result`
- 版: 第1版(2026-11-13)

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- `docs/issues-draft.md` の E4(向聴数、有効牌の種類と枚数。打牌候補の一覧は F1)
- [issue-77-tempai-result.md](issue-77-tempai-result.md)(E3。書式・`TempaiBody` の並べ方)
- 実装: `src/ui/result/classify.ts`(`kind: 'shanten'`)・`slots.tsx`(`ShantenBody`・`ShantenGlance`・`TempaiBody`・`GlanceTiles`)・`result.css`・`e3-tempai.test.tsx`
- core(読むだけ): `src/core/tile/index.ts`(`tileToCountsIndex` は赤を区別しない)
- 参考実装(読み取り専用): `../ref-repo/mahjong-calc`(livewing)の `src/components/Shanten.tsx`・`Result.tsx`・`ResultGlance.tsx`、`locales/ja.yml`
- `docs/mahjong-rules.md`(十三不搭の表記・定義)
- 業務標準 01・02・06・07・09、指導文書 G-04・G-08・G-09・G-10

### 1.2 確定事項(ユーザー決定。再検討しない)

| # | 内容 |
| --- | --- |
| 1 | 範囲は `classifyResult` が `kind: 'shanten'` を返す場合(13枚以下の向聴と有効牌)。改修は `slots.tsx` の `ShantenBody`・`ShantenGlance` と `result.css` のみ。**core は変更しない。** 残り枚数は core が三麻対応で計算済みの `count` をそのまま使う(2m〜8m 除外、手牌・副露・ドラ表示牌・抜き北を引く、赤五は別要素) |
| 2 | 本体は livewing `Shanten.tsx` 準拠: 見出し「N向聴」(太字)の横に「N種 M枚」。有効牌は `count > 0` のみを「牌×N」で並べる(E3 `TempaiBody` と同じ並べ方・意匠・表記「×N」)。見た目は mj-mighty-calc 準拠(GPL 部分は移植しない) |
| 3 | バナー(`ShantenGlance`)は牌のみ(枚数なし)。`count > 0` で絞る。ラベル「N向聴 受け入れ」は現状維持 |
| 4 | 国士・七対子は形の名前を併記しない。向聴数は core の値(通常形・七対子・国士の最小値)のまま |
| 5 | **十三不搭は向聴数・有効牌を計算しない(Issue #85 で扱う)。** チャンス/成立メッセージ、core の変更、`discard` 側(`DiscardBody`・`DiscardGlance`。F1)は含めない |
| 6 | 牌タップ(有効牌を手牌に追加)は範囲外。`onTileClick?` は塞がない |
| 7 | `none` は E1 のまま。`shanten` が 0 になることはない(core が hora/tempai に振り分ける)ので「0向聴」の表示は持たない |
| 8 | 境界: E4=`shanten`、F1=`discard` の一覧 |

### 1.3 livewing の実物と main の現状の照合(2026-11-13)

| 論点 | livewing | main(`93e0388`)の `slots.tsx` | E4 |
| --- | --- | --- | --- |
| (a) 見出し | `Shanten.tsx`: `text-xl font-bold` で「{{count}} 向聴」(`ja.yml` 106行) | `ShantenBody`: `<h2 class="result-body__title">{shanten}向聴</h2>` | 見出しは維持し、横に「N種 M枚」を足す(2.3) |
| (b) 種類・枚数 | 「{{count}} 種」「{{count}} 枚」(`ja.yml` 107・108行)。種類 = `countBy(tilesToCounts(count>0 の牌), c => c > 0)`(**赤五と通常の五は同じ1種**)、枚数 = **全要素の `count` の合計** | なし | livewing どおり(2.2) |
| (c) 有効牌の並び | `filter(a => a.count > 0)` を `flex-wrap` で「牌ボタン+`&times; {a.count}`」 | `tileAvailabilities` を全件 `Tile` で並べるだけ(0枚も出る・枚数なし) | E3 `TempaiBody` と同じ組(`.result-body__wait`)で `count > 0` のみ |
| (d) 全0枚 | `Result.tsx` 47〜53行: `tempai` と違い**分岐なし**。`Shanten` をそのまま出すので「N 向聴」「0 種 0 枚」+空の一覧になる | 見出し+0枚の牌が並ぶ | 【設計案】livewing どおり(2.3。Q1) |
| (e) バナー | `ResultGlance.tsx` に `hora-shanten` の `shanten` の表示は**無い**(和了・聴牌・何切るのみ) | `ShantenGlance`: ラベル+全有効牌(0枚も出る) | 確定事項3。`count > 0` で絞る。全0枚は【設計案】(2.4。Q2) |

- 表記の差: livewing は「1 向聴」「4 種 14 枚」(数字の後に空白)。本機は既存の見出し「1向聴」に合わせ空白なし「4種 14枚」(種と枚の間は空白1つ)。E3 の「×N」と同じく見た目の差のみ。

### 1.4 実行して確かめた事実

使い捨てテスト(`generateResult` → `classifyResult`。`DEFAULT_RULE`〔赤 5p・5s 各1〕、場東・自風南、状況なし。`e3-tempai.test.tsx` の補助関数を流用し、実行後に削除)で 2026-11-13 に実測した。

| ID | 牌姿・条件 | `shanten` | `tileAvailabilities` | 種類・枚数(2.2 の規則) |
| --- | --- | --- | --- | --- |
| S1 | 13枚 `123p456p789s11z34z`(通常形) | 1 | `[1z:2, 3z:3, 4z:3]` | 3種 8枚 |
| S2 | 13枚 `1199p1199s12345z`(七対子が最小) | 2 | `[1z:3, 2z:3, 3z:3, 4z:3, 5z:3]` | 5種 15枚 |
| S3 | 13枚 `1m19p19s1234567z5p`(国士が最小) | 1 | 么九牌13種(1m:3, 9m:4, 1p:3, 9p:3, 1s:3, 9s:3, 1z〜7z:各3) | 13種 40枚 |
| S4 | 4枚 `1145z`・ドラ表示 `11555z`・抜き北3 | 1 | `[1z:0, 4z:0, 5z:0]`(**全て0枚**) | 0種 0枚 |
| S5 | 13枚 `123p456p789p34s15z` | 1 | `[2s:4, 5s:3, 赤5s:1, 1z:3, 5z:3]`(赤5は別要素) | **4種** 14枚(5s と赤5s は1種) |
| S6 | 10枚 `123p456p34s15z`(13枚未満) | 1 | S5 と同じ | 4種 14枚 |

- S2・S3 は形の名前を出さず「2向聴」「1向聴」とだけ表示する(確定事項4)。
- S3 で 2m〜8m は出ない(三麻の除外は core 済み。確定事項1)。
- 一部だけ0枚の向聴形は実測していない(E3 T10・T11 と同じく core はドラ表示・抜き北で減った牌を `count: 0` で残すため起こりうる。テスト E4-04 は値を手で与える)。

### 1.5 ルール解釈(07号)

- 新たな麻雀ルールの解釈を組み込まない。向聴数・有効牌・残り枚数は core の返す値をそのまま使い、UI では種類数と合計だけを数える。
- **十三不搭は本 Issue で扱わない。** 十三不搭の形でも core の通常形・七対子・国士の向聴数をそのまま出す(確定事項5。#85)。

## 2. 設計

### 2.1 モジュール構成

| ファイル | 変更 | 内容 |
| --- | --- | --- |
| `src/ui/result/slots.tsx` | 改修 | 純関数 `summarizeAcceptance`(2.2)を追加、`ShantenBody`(2.3)・`ShantenGlance`(2.4)を改修 |
| `src/ui/result/result.css` | 改修 | 見出し行(`.result-body__heading`)・種類枚数(`.result-body__summary`)の書式。`.result-body--tempai .result-body__tiles` の間隔指定を `--shanten` にも効かせる |
| `src/ui/result/e4-shanten.test.tsx` | 新規 | 2.6 のテスト |

変更しないもの: `src/core/`、`classify.ts`、`TempaiBody`・`TempaiGlance`・`Hora*`・`DiscardBody`・`DiscardGlance`・`GlanceTiles`、`hora/` 配下、既存テスト(`ResultGlance.test.tsx`・`e3-tempai.test.tsx` ほか)。`src/ui/result/` から core への import は従来どおり `import type` のみ(種類数は core の `tilesToCounts` を使わず UI で数える)。

### 2.2 純関数 `summarizeAcceptance`

```ts
export interface AcceptanceSummary {
  available: TileAvailability[]; // count > 0 のみ。core の順のまま
  kinds: number; // available の牌の種類数(赤五と通常の五は同じ1種)
  total: number; // available の count の合計
}
export function summarizeAcceptance(tileAvailabilities: TileAvailability[]): AcceptanceSummary;
```

- 種類のキーは `${type}${n}`(赤を含めない)。`Set` の大きさを `kinds` にする。
- `total` は `count > 0` の合計(0 を足しても同じ。livewing と一致)。

### 2.3 `ShantenBody`(本体)

```html
<div data-result-kind="shanten" class="result-body result-body--shanten">
  <div class="result-body__heading">
    <h2 class="result-body__title">{shanten}向聴</h2>
    <span class="result-body__summary tabular-nums" data-kinds="{kinds}" data-total="{total}">{kinds}種 {total}枚</span>
  </div>
  <div class="result-body__tiles">
    <!-- available の各要素。E3 TempaiBody と同一の構造 -->
    <span class="result-body__wait" data-tile-count="{count}"><Tile/><span class="result-body__wait-count tabular-nums">×{count}</span></span>
  </div>
</div>
```

- key は現行どおり牌+添字。並び順は core の順。
- `.result-body__heading`: `display:flex; flex-wrap:wrap; align-items:baseline; column-gap:1rem; row-gap:0.25rem`(livewing `items-baseline gap-4`)。
- `.result-body__summary`: body-medium のタイポトークン、色 `--md-sys-color-on-surface-variant`。
- 見出しは既存の `.result-body__title`(title-medium。E1 以来の太さ)をそのまま使う。
- 有効牌の組の間隔は E3 と同じ(`gap: 0.5rem 0.75rem`)。セレクタを `.result-body--tempai .result-body__tiles, .result-body--shanten .result-body__tiles` にする。
- **【設計案】全0枚(S4)**: livewing どおり、見出し「1向聴」と「0種 0枚」を出し、`.result-body__tiles` は空(子なし)で出す。「×0」は出さない(Q1)。
- 375px 幅での折り返し: 見出し行は「13向聴」相当でも1行に収まる長さ(最長は国士 S3 の「1向聴」「13種 40枚」)。有効牌は `flex-wrap` で折り返す(S3 の13組は複数行になる)。実挙動未確認(5章)。

### 2.4 `ShantenGlance`(バナー)

- `const available = tileAvailabilities.filter(a => a.count > 0)`。ラベル `<span class="result-glance__label">{shanten}向聴 受け入れ</span>` は現行のまま、`<GlanceTiles tiles={available.map(a => a.tile)} />`。枚数は出さない。
- **【設計案】全0枚**: ラベル「N向聴 受け入れ」はそのまま出し、`GlanceTiles` は空(子なし)で出す(Q2)。
- `onTileClick` は渡さない(現行どおり。`GlanceTiles` の引数は残す)。

### 2.5 初回 JS(09号)

- 基準値(main `93e0388`、設計担当が 2026-11-13 に実測): `npm run build` 後、`dist/index.html` の `<script type="module" src>` が指す `assets/index-*.js`(`modulepreload` なし)を `gzip -9 -c | wc -c` で **125,827 B**。
- 変更はすべて初回 JS の `slots.tsx` と CSS(CSS は計測対象外)。小さいため遅延チャンクは使わない。
- 増分の積算(見積り): `summarizeAcceptance`(Set・filter・reduce)+60〜100 B、`ShantenBody` の見出し行・種類枚数・組の要素(組の構造は `TempaiBody` と gzip 上で重複)+70〜120 B、`ShantenGlance` の絞り込み +10〜20 B。合計 +140〜240 B。
- **目標値**: 初回 JS **126,070 B 以下**(+243 B)。超過は不合格にしない(09号)。実測値を PR に残す。

### 2.6 テスト(`e4-shanten.test.tsx`。命名は `E4-<番号>: …`。`renderToStaticMarkup` と純関数。jsdom 不要)

| ID | 対象 | 内容 |
| --- | --- | --- |
| E4-01 | `summarizeAcceptance` | S5 の値で `kinds: 4`・`total: 14`・`available` が5要素(順序維持)。S4 の値で `0`・`0`・`[]`。空配列で `0`・`0`・`[]` |
| E4-02 | `ShantenBody` | S1 で見出し「1向聴」、`data-kinds="3"`・`data-total="8"`・文字「3種 8枚」、`.result-body__wait` が3組で `data-tile-count` が順に 2,3,3、「×2」「×3」「×3」、外枠 `data-result-kind="shanten"` |
| E4-03 | `ShantenBody` | S5 で `.result-body__wait` が5組(赤5索を含む。牌の `aria-label` が順に 2索・5索・赤5索・東・白〔実装の表記に従う〕)、「4種 14枚」 |
| E4-04 | `ShantenBody`・`ShantenGlance` | 一部だけ0枚(手で与える `[1z:2, 4z:0, 5z:3]`)で本体の組が2つ(北が無い)、「×0」を含まない、「2種 5枚」。バナーの牌が2枚(東・白) |
| E4-05 | `ShantenBody`・`ShantenGlance` | 全0枚(S4)で本体に見出し「1向聴」・「0種 0枚」・`.result-body__wait` 0個・「×0」なし。バナーにラベル「1向聴 受け入れ」・牌0枚(2.3・2.4 の設計案。Q1・Q2 の回答で変わればこの項目を改訂) |
| E4-06 | `ShantenGlance` | S1 でラベル「1向聴 受け入れ」・牌3枚・「×」と「枚」を含まない |
| E4-07 | 結合 | `generateResult` → `classifyResult` で S1〜S5 が 1.4 の `shanten`・`tileAvailabilities` と一致 |

- 補助関数(`southTable`・`defaultOptions`・`parseTiles`)は `e3-tempai.test.tsx` から複製してよい(既存テストを書き換えない)。

## 3. 範囲外

- 十三不搭の向聴数・有効牌・チャンス/成立メッセージ(Issue #85)。
- `discard`(何切るの一覧。`DiscardBody`・`DiscardGlance`)(F1)。
- 有効牌のタップによる手牌への追加。
- 国士・七対子の形の名前の表示。`src/core/` の変更。

## 4. 後続への引き継ぎ

- F1: 打牌候補ごとの受け入れ「N種 M枚」は `summarizeAcceptance` を再利用できる(種類は赤五を1種と数える)。
- #85: 十三不搭を向聴に組み込む場合、`ShantenBody` の見出し行(`.result-body__heading`)にメッセージを足す余地がある。
- 牌タップ: `GlanceTiles` の `onTileClick?` と `.result-body__wait` 要素をボタン化する(E3 と共通)。

## 5. 実挙動未確認

- 画面表示(見出し行の baseline 揃え、375px での有効牌の折り返し、S3 の13組の段数)。実装前のため未確認。受け入れ条件は DOM 構造と文字で判定する。
- 一部だけ0枚になる向聴形の実例(1.4 末尾)。
- 初回 JS の増分(2.5 は見積り)。実機(iOS Safari・PWA)の見え方(7章)。

## 6. 受け入れ条件

検収担当は上から順に実行する。期待値は 1.4 による。

1. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラーなし。
2. `git diff --stat main...HEAD -- src/core src/ui/result/classify.ts src/ui/result/hora src/ui/result/hora-summary.ts src/ui/result/ResultGlance.test.tsx src/ui/result/e3-tempai.test.tsx` が空。`git diff main...HEAD -- src/ui/result/slots.tsx` で、変更が `summarizeAcceptance`(新規)・`ShantenBody`・`ShantenGlance` の中だけ(`TempaiBody`・`TempaiGlance`・`Hora*`・`Discard*`・`GlanceTiles` に差分なし)。
3. import 規律: `grep -rnE "^import [^t].*from '(\.\./)+core/" src/ui/result --include='*.ts' --include='*.tsx' | grep -v '\.test\.'` が 0件(`import { type …` だけの行は目視で除く)。
4. `npx vitest run src/ui/result` の出力に `E4-01`〜`E4-07` がすべて現れ通過し、`E3-01`〜`E3-08`・`E1-` 系も通過している。
5. 初回 JS: `npm run build` 後、`dist/index.html` の `<script type="module" src>` が指すファイルを `gzip -9 -c <file> | wc -c` で測り記録。目標 126,070 B 以下(基準 125,827 B)。超過は不合格にせず PR に記録する。
6. 画面(dev。`npm run dev` を Browser pane で表示し、ペインを**表示した状態**で行う〔C-01〕。既定ルール・南家):
   - (a) 手牌 `123p456p789s11z34z`: 本体に見出し「1向聴」と「3種 8枚」、東「×2」・發〔3z の表示名は実装に従う〕「×3」・北「×3」の3組。バナーは「1向聴 受け入れ」+牌3枚で枚数なし。
   - (b) 手牌 `1199p1199s12345z`: 本体「2向聴」「5種 15枚」で、「七対子」の文字が出ない。
   - (c) 手牌 `1m19p19s1234567z5p`: 本体「1向聴」「13種 40枚」、13組が折り返して並び、2m〜8m が無い。「国士」の文字が出ない。
   - (d) 手牌 `123p456p789p34s15z`: 本体「4種 14枚」で 5索「×3」と赤5索「×1」が別の組。
   - (e) 手牌 `1145z`・ドラ表示 `11555z`・抜き北3: 本体「1向聴」「0種 0枚」で牌の組が無く「×0」も無い。バナーは「1向聴 受け入れ」で牌0枚(設計案。Q1・Q2 の回答で変われば改訂)。
   - 本体は 375×812 で `read_page`/`get_page_text`/`find`(`data-tile-count`・`data-kinds`)で判定してよい。375px で横スクロールが出ない(`document.documentElement.scrollWidth <= 375`)。
   - バナー: E3 受け入れ条件6の補足と同じ手順(375×500、シートを閉じて `scrollTo(0,0)`、`button[aria-label="計算結果へ移動"]` が visible になってから確認。または `javascript_tool` で `.result-glance` の `textContent` と牌要素の数を読む)。
7. 本番ビルド: `npm run build && npx vite preview` で 6(a)(c)(e) を再確認し、見出し行と組の書式(CSS)が dev と同じに効いている(G-11)。
8. ダークテーマ: 6(a) をダークで表示し「3種 8枚」「×N」が背景に溶けない。`git diff main...HEAD -- src | grep -E '#[0-9a-fA-F]{3,8}\b'` で新規の HEX が無い。
9. ホームディレクトリ名: `git diff main...HEAD | grep -n "$(basename "$HOME")"` が空(docs も対象)。
10. 起動した dev/preview サーバーは自分で止める(01号)。

## 7. 実機確認(検収後にユーザーが行う。合否に含めない。C-02)

- iPhone の PWA で 6(a)(c) を表示し、見出し行と有効牌の組が読みやすく折り返されること。

## 9. 未決事項(要ヒアリング)

- **Q1 本体の全0枚(S4)**: 有効牌が全て0枚のとき、本体をどう出すか。
  - 案A【設計案】livewing どおり: 見出し「1向聴」+「0種 0枚」、一覧は空。利点: livewing 準拠、向聴数は見える。欠点: 空の一覧が残る。
  - 案B: 見出し「1向聴」+「0種 0枚」の下に「有効牌なし」の一文。利点: 状態が明確。欠点: livewing に無い文言。
  - 案C: E3 の聴牌と同様に文言だけ(例「有効牌なし」)で見出しも出さない。欠点: 向聴数が見えなくなる。
- **Q2 バナーの全0枚**: 案A【設計案】ラベル「N向聴 受け入れ」のまま牌0枚 / 案B「N向聴 受け入れなし」と文言を変える(livewing はバナーに向聴の表示自体が無いため照合先なし)。

## 10. 改訂履歴

- 第1版(2026-11-13): 新規作成。
