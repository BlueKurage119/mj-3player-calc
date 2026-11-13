# Issue #78 E4. 和了形・聴牌形以外の結果 設計書

- 親: Epic E(#6)
- 依存: **E3(#77)のマージ後の main(`93e0388`)を起点とする。** E1(#75)の `classify.ts`・`slots.tsx`・`ResultBody`・`ResultGlance`、E3 の `TempaiBody`(「牌+×N」の組と `result.css` の `.result-body__wait` 系)を前提にする
- ブランチ: `feature/issue-78-shanten-result`
- 版: 第4版(2026-11-14)

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
| 9 | (オーナー回答・第2版 Q1=A)本体の全0枚は livewing どおり、見出し「N向聴」+「0種 0枚」、有効牌の一覧は空(「×0」は出さない) |
| 10 | (オーナー回答・第2版 Q2=A)バナーの全0枚はラベル「N向聴 受け入れ」のまま、牌は0枚 |

- 注記(第4版): 確定事項3・10のラベル「N向聴 受け入れ」は、UI 監修(9章 UI-1)によりバッジ「N向聴」に文言を変更した。確定事項の意図(3: バナーは牌のみで `count > 0` で絞る、10: 全0枚でもバナーを出し牌は出さない)は変わらない。

### 1.3 livewing の実物と main の現状の照合(2026-11-13)

| 論点 | livewing | main(`93e0388`)の `slots.tsx` | E4 |
| --- | --- | --- | --- |
| (a) 見出し | `Shanten.tsx`: `text-xl font-bold` で「{{count}} 向聴」(`ja.yml` 106行) | `ShantenBody`: `<h2 class="result-body__title">{shanten}向聴</h2>` | 見出しは維持し、横に「N種 M枚」を足す(2.3) |
| (b) 種類・枚数 | 「{{count}} 種」「{{count}} 枚」(`ja.yml` 107・108行)。種類 = `countBy(tilesToCounts(count>0 の牌), c => c > 0)`(**赤五と通常の五は同じ1種**)、枚数 = **全要素の `count` の合計** | なし | livewing どおり(2.2) |
| (c) 有効牌の並び | `filter(a => a.count > 0)` を `flex-wrap` で「牌ボタン+`&times; {a.count}`」 | `tileAvailabilities` を全件 `Tile` で並べるだけ(0枚も出る・枚数なし) | E3 `TempaiBody` と同じ組(`.result-body__wait`)で `count > 0` のみ |
| (d) 全0枚 | `Result.tsx` 47〜53行: `tempai` と違い**分岐なし**。`Shanten` をそのまま出すので「N 向聴」「0 種 0 枚」+空の一覧になる | 見出し+0枚の牌が並ぶ | livewing どおり(確定事項9。2.3) |
| (e) バナー | `ResultGlance.tsx` 78〜92行: `hora-shanten` かつ `info.type === 'shanten'` で「N 向聴」(太字)+「受け入れ」+有効牌の**全件**(`count > 0` の絞り込みも全0枚の分岐も無い) | `ShantenGlance`: ラベル「N向聴 受け入れ」+全有効牌(0枚も出る)。livewing のバナーの移植 | 確定事項3により `count > 0` で絞る(livewing との差分)。全0枚は確定事項10(2.4) |

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

変更しないもの: `src/core/`、`classify.ts`、`TempaiBody`・`TempaiGlance`・`Hora*`・`DiscardBody`・`DiscardGlance`・`GlanceTiles`、`hora/` 配下、既存テスト(`ResultGlance.test.tsx`・`e3-tempai.test.tsx` ほか)。**第4版 UI-1 により `TempaiGlance`・`HoraGlance` の13枚形の分岐・`ResultGlance.test.tsx`・`e3-tempai.test.tsx` は 9.1.5 の箇所に限り変更する。**`src/ui/result/` から core への import は従来どおり `import type` のみ(種類数は core の `tilesToCounts` を使わず UI で数える)。

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
- **全0枚(S4。確定事項9)**: livewing どおり、見出し「1向聴」と「0種 0枚」を出し、`.result-body__tiles` は空(子なし)で出す。「×0」は出さない。
- 375px 幅での折り返し: 見出し行は「13向聴」相当でも1行に収まる長さ(最長は国士 S3 の「1向聴」「13種 40枚」)。有効牌は `flex-wrap` で折り返す(S3 の13組は複数行になる)。実挙動未確認(5章)。

### 2.4 `ShantenGlance`(バナー)

- `const available = tileAvailabilities.filter(a => a.count > 0)`。先頭はバッジ `<span class="result-glance__badge">{shanten}向聴</span>`(第4版 UI-1。旧ラベル「N向聴 受け入れ」)、続けて `<GlanceTiles tiles={available.map(a => a.tile)} />`。枚数は出さない。
- **全0枚(確定事項10)**: バッジ「N向聴」だけを出し、`GlanceTiles` は空(子なし)で出す。
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
| E4-02 | `ShantenBody` | S1 で見出し「1向聴」、`data-kinds="3"`・`data-total="8"`・文字「3種 8枚」、`.result-body__wait` が3組で `aria-label` が順に 東・西・北、`data-tile-count` が順に 2,3,3、「×2」「×3」「×3」、外枠 `data-result-kind="shanten"` |
| E4-03 | `ShantenBody` | S5 で `.result-body__wait` が5組(牌の `aria-label` が順に 2索・5索・赤5索・東・白。表記は `src/ui/tile/tile-image.ts` の `tileLabelOf`)、「4種 14枚」 |
| E4-04 | `ShantenBody`・`ShantenGlance` | 一部だけ0枚(手で与える `[1z:2, 4z:0, 5z:3]`)で本体の組が2つ(北が無い)、「×0」を含まない、「2種 5枚」。バナーの牌が2枚(東・白) |
| E4-05 | `ShantenBody`・`ShantenGlance` | 全0枚(S4)で本体に見出し「1向聴」・「0種 0枚」・`.result-body__wait` 0個・「×0」なし。バナーはバッジ「1向聴」・牌0枚(確定事項9・10。第4版 UI-1 の表記) |
| E4-06 | `ShantenGlance` | S1 でバッジ「1向聴」・牌3枚・「×」と「枚」を含まない(第4版 UI-1 の表記) |
| E4-07 | 結合 | `generateResult` → `classifyResult` で S1〜S5 が 1.4 の `shanten`・`tileAvailabilities` と一致 |
| E4-08 | バナー3種 | 第4版 UI-1(9章 9.1.5)。バッジの文字は「聴牌」「N向聴」だけで、「待ち」「受け入れ」を含まない |

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
2. `git diff --stat main...HEAD -- src/core src/ui/result/classify.ts src/ui/result/hora src/ui/result/hora-summary.ts` が空。`git diff main...HEAD -- src/ui/result/slots.tsx` で、変更が `summarizeAcceptance`(新規)・`ShantenBody`・`ShantenGlance`・`TempaiGlance` と `HoraGlance` の13枚形の分岐(第4版 UI-1)の中だけ(`TempaiBody`・`HoraBody`・`HoraGlance` の14枚形の分岐・`Discard*`・`GlanceTiles` に差分なし)。`ResultGlance.test.tsx`・`e3-tempai.test.tsx` の差分は 9.1.5 に挙げた期待値の行だけ。
3. import 規律: `grep -rnE "^import [^t].*from '(\.\./)+core/" src/ui/result --include='*.ts' --include='*.tsx' | grep -v '\.test\.'` が 0件(`import { type …` だけの行は目視で除く)。
4. `npx vitest run src/ui/result` の出力に `E4-01`〜`E4-08` がすべて現れ通過し、`E3-01`〜`E3-08`・`E2-` 系・`E1-` 系も通過している。
5. 初回 JS: `npm run build` 後、`dist/index.html` の `<script type="module" src>` が指すファイルを `gzip -9 -c <file> | wc -c` で測り記録。目標 126,070 B 以下(基準 125,827 B。第4版 UI-1 の増分は 9.1.6)。超過は不合格にせず PR に記録する。
6. 画面(dev。`npm run dev` を Browser pane で表示し、ペインを**表示した状態**で行う〔C-01〕。既定ルール・南家):
   - (a) 手牌 `123p456p789s11z34z`: 本体に見出し「1向聴」と「3種 8枚」、東「×2」・西「×3」・北「×3」の3組。バナーはバッジ「1向聴」+牌3枚で枚数なし、「受け入れ」の文字が無い。
   - (b) 手牌 `1199p1199s12345z`: 本体「2向聴」「5種 15枚」で、「七対子」の文字が出ない。
   - (c) 手牌 `1m19p19s1234567z5p`: 本体「1向聴」「13種 40枚」、13組が折り返して並び、2m〜8m が無い。「国士」の文字が出ない。
   - (d) 手牌 `123p456p789p34s15z`: 本体「4種 14枚」で 5索「×3」と赤5索「×1」が別の組。
   - (e) 手牌 `1145z`・ドラ表示 `11555z`・抜き北3: 本体「1向聴」「0種 0枚」で牌の組が無く「×0」も無い。バナーはバッジ「1向聴」のみで牌0枚。
   - 本体は 375×812 で `read_page`/`get_page_text`/`find`(`data-tile-count`・`data-kinds`)で判定してよい。375px で横スクロールが出ない(`document.documentElement.scrollWidth <= 375`)。
   - バナー: E3 受け入れ条件6の補足と同じ手順(375×500、シートを閉じて `scrollTo(0,0)`、`button[aria-label="計算結果へ移動"]` が visible になってから確認。または `javascript_tool` で `.result-glance` の `textContent` と牌要素の数を読む)。
7. 本番ビルド: `npm run build && npx vite preview` で 6(a)(c)(e) を再確認し、見出し行と組の書式(CSS)が dev と同じに効いている(G-11)。
8. ダークテーマ: 6(a) をダークで表示し「3種 8枚」「×N」が背景に溶けない。`git diff main...HEAD -- src | grep -E '#[0-9a-fA-F]{3,8}\b'` で新規の HEX が無い。
9. ホームディレクトリ名: `git diff main...HEAD | grep -n "$(basename "$HOME")"` が空(docs も対象)。
10. 起動した dev/preview サーバーは自分で止める(01号)。
11. UI 監修(9章)の各項目の受け入れ条件(9.1.7 ほか)をすべて満たす。

## 7. 実機確認(検収後にユーザーが行う。合否に含めない。C-02)

- iPhone の PWA で 6(a)(c) を表示し、見出し行と有効牌の組が読みやすく折り返されること。

## 8. 未決事項(要ヒアリング)

- なし(第2版の Q1・Q2 はオーナー回答により案Aで確定し、1.2 確定事項9・10に移した)。

## 9. UI 監修による変更

UI 監修のたびに「9.N」として項目を追記する。各項目は「指示・変更内容・根拠・対象・意匠・テスト・バンドル・受け入れ条件」の順に書く。既存章の記述と食い違う場合は、この章を優先し、既存章の該当箇所に「第N版 UI-N」と注記する。

### 9.1 UI-1(第4版): バナーのラベルのバッジ化と、牌の並びだけの折り返し

#### 9.1.1 指示(オーナー。引用)

「まず、要約バナーで、「聴牌」「X向聴」をバッジ化して「受け入れ」「待ち」を削除します。また、livewingのように有効牌・和了牌部分だけで折り返すようにしてください。」

#### 9.1.2 変更内容と livewing の根拠

- バナーの「聴牌」「N向聴」をバッジ(ラベルの見た目の部品)にし、「待ち」「受け入れ」の文字を削除する。
- バッジは縮まず折り返さない。牌の並び `.glance-tiles` はバッジの右の領域の中だけで `flex-wrap` により折り返す(バッジの下に牌が回り込まない)。
- 根拠(`../ref-repo/mahjong-calc/src/components/ResultGlance.tsx`、2026-11-14 に実物を確認):
  - tempai(32〜46行)・hora-shanten の hora(93〜109行)・discard-shanten(47〜77行)・hora-shanten の shanten(78〜92行)の4ブロックとも、外枠は `flex items-center gap-2`(折り返さない)、ラベル(「聴牌」「N 向聴」)は `shrink-0 font-bold`、補助語(「待ち」「受け入れ」「打」)は `shrink-0 text-sm`、牌の並びは `flex flex-wrap gap-px`。
  - livewing の牌の並びは `flex-1`・`min-w-0` を持たないが、外枠が折り返さないため、牌の並びが残りの幅で縮み、その中で折り返す。本機は外枠 `.result-glance` が `flex-wrap: wrap`(他のバナーと共用)のため、外枠を変えずに同じ効果を得る方法として、牌の並びに `flex: 1 1 0; min-width: 0` を与える(基準幅0なのでバッジと同じ行に必ず収まり、残りの幅に伸びてその中で折り返す)。
  - 補助語の削除は livewing との差分(オーナー指示)。

#### 9.1.3 対象

| 箇所(`src/ui/result/slots.tsx`、ef2063c 時点の行) | 現在 | 変更後 |
| --- | --- | --- |
| `HoraGlance` の13枚形の分岐(`waitInput`。238行) | `<span class="result-glance__label">聴牌 待ち</span>` | `<span class="result-glance__badge">聴牌</span>` |
| `TempaiGlance`(308行。E3 でマージ済み) | 同上 | 同上 |
| `ShantenGlance`(333行) | `<span class="result-glance__label">{shanten}向聴 受け入れ</span>` | `<span class="result-glance__badge">{shanten}向聴</span>` |

- バッジの DOM は `<span class="result-glance__badge">…</span>`(確定案。data 属性なし)。直後の `GlanceTiles` は変えない。
- 変えないバナー: `HoraGlance` の14枚形(点数。`result-glance__side` 系)・0件の「和了牌なし」・全件役なしの「役なし」、`TempaiGlance` の「和了牌なし」、`DiscardGlance`(「何切る」。F1 の領分)、`ResultGlance` の just-hora など他の分岐。十三不搭のバナーは本機に無い(#85)。`.result-glance__label` のクラスは `DiscardGlance` が使い続けるため残す。
- `src/ui` 全体の grep(`grep -rn "待ち\|受け入れ" src/ui`。テストを除く)で残る箇所と、対象外の理由:

| 箇所 | 内容 | 対象外の理由 |
| --- | --- | --- |
| `src/ui/result/ResultGlance.tsx` 14行 | コメント「待ちで出す」 | コメント。表示文字ではない |
| `src/ui/screen/ResultBanner.tsx` 24行 | コメント「待ちを出す」 | 同上 |
| `src/ui/result/hora/FuBreakdown.tsx` 18行、`hora/fu-rows.ts` 20・117〜124行 | コメント | 同上 |
| `src/ui/result/hora/labels.ts` 91・95・142〜146行 | 役名「国士無双十三面待ち」、符の待ちの名「両面待ち」「単騎待ち」等 | 役・符の名称。バナーのラベルではない |

#### 9.1.4 バッジの意匠

- 既存部品の調査結論: **再利用できる部品は無い。**
  - `src/ui/md/Chip.tsx`: `md-chip-set`・`FilterChip`(Material Web の操作用チップ)。押せる部品で、表示だけのバッジには重く、初回 JS にも響く。
  - `src/ui/expressive/`: BottomSheet・ConnectedButtonGroup・Disclosure・Stepper・shape-morph のみ。バッジ相当なし。
  - `src/ui/result/hora/hora.css` の `.hora-item__badge`: 書式はバッジそのものだが、色がロン/ツモ専用の変数 `--by-badge-bg`/`--by-badge-fg`(`[data-hora-by]` で primary/tertiary を切り替え)に依存し、遅延チャンク側の CSS(`HoraDetail`)に属する。クラスを流用すると色と読み込みの両方で依存が生じる。
- 自作(06号): `result.css` に `.result-glance__badge` を追加する。
  - 書式は `.hora-item__badge` に揃える: `display:inline-flex; align-items:center; justify-content:center; border-radius: var(--md-sys-shape-corner-small); padding: 0.125rem 0.5rem;` label-medium のタイポトークン5種(font・size・line-height・weight・tracking)。
  - 加えて `flex-shrink: 0; white-space: nowrap;`。
  - 色は MD3 ロールのトークンのみ。HEX を書かない。背景と文字は対のロール(`X-container` と `on-X-container`)で、ライト・ダークの両方で溶けない。
  - **色ロールの案(未確定。UI 監修で確認)**: 案1 聴牌・向聴とも `--md-sys-color-secondary-container` / `--md-sys-color-on-secondary-container`(本機で使用実績が多い組)。案2 聴牌を `primary-container` / `on-primary-container`、向聴を `secondary-container` / `on-secondary-container` に分け、聴牌を目立たせる(分ける場合は `.result-glance--tempai .result-glance__badge` 等で上書きし、`HoraGlance` 13枚形は聴牌側に入れる)。製造は案1で実装し、監修で案2に替える場合は CSS のみの変更とする。
- 牌の並び: `.result-glance > .glance-tiles { flex: 1 1 0; min-width: 0; }` を追加する(9.1.2)。`.glance-tiles` 自体の `flex-wrap: wrap; gap: 2px` は変えない。

#### 9.1.5 変更するファイルとテストの期待値

従来「変更しない」としていた `TempaiGlance`・`HoraGlance`(13枚形の分岐)・`ResultGlance.test.tsx`・`e3-tempai.test.tsx` は、この指示でバナーの文言が変わるため、下表の箇所に限り変更を解除する(2.1 の「変更しないもの」・6章 条件2はこの範囲で読み替える)。行番号は ef2063c 時点。

| ファイル | 箇所 | 変更 |
| --- | --- | --- |
| `src/ui/result/slots.tsx` | 238・308・333行 | 9.1.3 の表のとおり |
| `src/ui/result/result.css` | 追記 | `.result-glance__badge`・`.result-glance > .glance-tiles`(9.1.4) |
| `ResultGlance.test.tsx` | 23行 `it('E1-6: shanten のとき「N向聴」「受け入れ」と牌が表示される'` | 名前を「「N向聴」のバッジと牌が表示される」に。37行 `toContain('1向聴 受け入れ')` → `toContain('<span class="result-glance__badge">1向聴</span>')` と `not.toContain('受け入れ')` |
| 同 | 42行 `it('E1-6: tempai で残りが1枚以上あるとき「聴牌 待ち」…'` | 名前を「「聴牌」のバッジと牌…」に。54行 `toContain('聴牌 待ち')` → `toContain('<span class="result-glance__badge">聴牌</span>')` と `not.toContain('待ち')` |
| 同 | 73行 `not.toContain('聴牌 待ち')`(全0枚) | `not.toContain('result-glance__badge')` |
| `e3-tempai.test.tsx` | 138行 E3-05 の名前「バナーに「聴牌 待ち」と牌1枚」 | 「バナーに「聴牌」のバッジと牌1枚」 |
| 同 | 173〜175行 `/<span class="result-glance__label">([^<]*)<\/span>/` → `'聴牌 待ち'` | 正規表現のクラスを `result-glance__badge` に、期待値を `'聴牌'` に |
| 同 | 271行 E3-07 の名前「「聴牌 待ち」+ 2s・5s・赤5s」 | 「「聴牌」のバッジ + 2s・5s・赤5s」 |
| 同 | 289行 `toContain('聴牌 待ち')` | `toContain('<span class="result-glance__badge">聴牌</span>')` と `not.toContain('待ち')` |
| `e4-shanten.test.tsx` | E4-04 の 208〜212行(`result-glance__label` → `'1向聴 受け入れ'`) | クラスを `result-glance__badge`、期待値を `'1向聴'` |
| 同 | E4-05 の 234行(全文一致) | `'<div data-result-kind="shanten" class="result-glance result-glance--shanten"><span class="result-glance__badge">1向聴</span><div class="glance-tiles"></div></div>'` |
| 同 | E4-05 の `it` の名前「バナーにラベルのみ表示する」 | 「バナーにバッジのみ表示する」 |
| 同 | E4-06 の名前と 253〜255行 | 名前「バッジ「1向聴」と牌3枚」。正規表現のクラスを `result-glance__badge`、期待値 `'1向聴'` |
| 同 | 新設 E4-08 | 下記 |

- **E4-08**(`e4-shanten.test.tsx` に追加): `ShantenGlance`(S1。shanten 1 と 2 の2通り)・`TempaiGlance`(T10 相当 `[1z:2]`)・`HoraGlance`(13枚 `234p567p34s678s99p` の `waitInput`。E3-07 と同じ組み立て)の各マークアップで、(i) `/<span class="result-glance__badge">([^<]*)<\/span>/g` の一致が各1件で、文字がそれぞれ「1向聴」「2向聴」「聴牌」「聴牌」、(ii) マークアップ全体に「待ち」「受け入れ」を含まない、(iii) `result-glance__label` を含まない。

#### 9.1.6 バンドル(09号)

- 増分の積算: クラス名の差し替えと文字の削除のみで JS はほぼ増えない(「 待ち」「 受け入れ」の削除で減り、`result-glance__badge` の文字列で増える。−20〜+20 B)。CSS は計測対象外。
- 目標値は 2.5 のまま(126,070 B 以下)。超過は不合格にしない。

#### 9.1.7 受け入れ条件

1. `npx vitest run src/ui/result` で E4-08 と、9.1.5 で期待値を変えた E1-6・E3-05・E3-07・E4-04〜E4-06 が通過する。
2. `grep -n "待ち\|受け入れ" src/ui/result/slots.tsx` が 0件。
3. 画面(dev。6章の手順):
   - (a) 6章 6(a) の手牌で、バナーがバッジ「1向聴」+牌3枚。手牌 `123456p1z` でバッジ「聴牌」+東。13枚 `234p567p34s678s99p` でバッジ「聴牌」+牌3枚。いずれも「待ち」「受け入れ」が無い。
   - (b) 折り返し: 375×500 で 6章 6(c) の手牌(有効牌13種)のバナーを表示し、`javascript_tool` で `.result-glance__badge` と `.result-glance .glance-tiles` の `getBoundingClientRect()` を読む。牌の並びの `left` がバッジの `right` 以上で、牌の並びの `top` がバッジの `top` 以下(バッジの下に回り込まない)。牌の並びが2行以上なら、その中で折り返している(高さが牌1枚分より大きい)。バッジの `height` が1行分(折り返していない)。
   - (c) ダークテーマで (a) のバッジの文字が背景に溶けない(目視)。`git diff main...HEAD -- src | grep -E '#[0-9a-fA-F]{3,8}\b'` で新規の HEX が無い。
4. 本番ビルド(`npx vite preview`)で (b) を再確認する(G-11)。

### 9.2 UI-2(第5版): バッジの色をバナーの背景と区別する

- オーナーの UI 監修指摘: 「バッジの色が、カードの色と同化しています。」
- 原因: バナー(`.result-banner`)の背景が `--md-sys-color-secondary-container` で、9.1.4 の案1のバッジ(secondary-container)と同じ色だった。
- 変更: `.result-glance__badge` の色を `--md-sys-color-primary`(背景)/`--md-sys-color-on-primary`(文字)に替える(聴牌・向聴とも同色。9.1.4 の案2の分け方は採らない)。ライト・ダークとも、バナーの背景(secondary-container)と文字の対比が出る塗りのバッジになる。
- 変更ファイル: `src/ui/result/result.css` のみ(テストは色を検証していないため変更なし)。バンドルへの影響なし(CSS は計測対象外)。

### 9.3 UI-3(第6版): バッジの色分けと、和了の打点バナーのバッジ化

- オーナーの UI 監修指示(引用):
  - 「シャンテンではセカンダリカラー、聴牌はプライマリカラーとするのはどうでしょうか。」
  - 「ロン=プライマリ・ツモ＝ターシャリのバッジ、ロンとツモの間のスラッシュ省略。」「(「和了」のバッジは)つけない」
- 色の確定(9.1.4・9.2 の案を更新):

| バッジ | 背景 / 文字 | 設定箇所 |
| --- | --- | --- |
| 聴牌(`TempaiGlance`・13枚形の `HoraGlance`) | `--md-sys-color-primary` / `--md-sys-color-on-primary` | `.result-glance__badge` の既定 |
| N向聴(`ShantenGlance`) | `--md-sys-color-secondary` / `--md-sys-color-on-secondary`(塗り。バナーの背景 secondary-container とは別の色になる) | `.result-glance--shanten .result-glance__badge` |
| ロン | primary / on-primary(既定) | `.result-glance__badge` |
| ツモ | `--md-sys-color-tertiary` / `--md-sys-color-on-tertiary` | `.result-glance__side[data-glance-by="tsumo"] .result-glance__badge` |

- 和了の打点バナー(`HoraGlance` の点数の分岐。E2 の部品、マージ済み): 「ロン」「ツモ」の文字を `<span class="result-glance__badge">ロン</span>` 等のバッジにし、`result-glance__sep`(` / `)を削除する。`.result-glance__side` を `inline-flex; gap: 0.375rem` にし、隣り合う `__side` の間に `margin-inline-start: 0.5rem` を置く。「和了」のバッジは付けない。ロンとツモの色は本体カード(`HoraItem`)と同じ組。
- 変更ファイル: `slots.tsx`(`HoraGlance` の点数の分岐)、`result.css`、`ResultGlance.test.tsx`(E2-11 に、バッジの文字・「/」と `result-glance__sep` が無いことの検証を追加し、名前を更新)。他のテストの期待値は変わらない。
- 実測(375×812、ダーク): R02 のバナーで「ロン」(rgb(161,211,153))と「ツモ」(rgb(160,207,212))のバッジ、「/」なし。向聴のバッジは rgb(186,204,179)(バナーの背景 rgb(59,75,56))。ライトテーマは未確認。

### 9.4 UI-4(第7版): バナーの高さの固定と、向聴バッジの淡色化

- オーナーの UI 監修指示(引用): 「牌が表示されている時と、文字のみの時で高さが変わるのが気になります。」「シャンテンの場合は入力側要約カードの北抜きカウンターのような色合いにできないでしょうか。淡色地に濃い色の文字です。」
- 高さ: `.result-glance` に `min-height: calc(var(--tile-width) * 4 / 3)`(牌1段の高さ)を加える。牌が出るバナーと、文字・バッジだけのバナー(点数・「和了牌なし」「役なし」など)で、高さが同じになる。実測(375×812): 向聴(牌あり)26.7px、和了の打点(文字のみ)26.7px。
- 向聴バッジの色: 要約カードの抜き北の丸(`.summary-card__pill`)と同じ組にする。背景は `color-mix(in srgb, var(--md-sys-color-on-secondary-container) 16%, transparent)`、文字は `--md-sys-color-on-secondary-container`。バナーの背景(secondary-container)の上で、同系色の薄い淡色地+濃い(ダークテーマでは明るい)文字になる。聴牌(primary)との区別は、塗りと淡色地の違いで付ける。9.3 の向聴の色(secondary の塗り)を置き換える。
- 変更ファイル: `src/ui/result/result.css` のみ(テストは色・高さを検証していないため変更なし)。
- 実測: ダークテーマで確認。**ライトテーマは未確認**(淡色地が secondary-container の背景に対して薄すぎないかは、UI 監修で確認)。

### 9.5 UI-5(第8版): 結果が空のときカードを出さない / 「和了です」をバナーに出さない

- オーナーの UI 監修指示(引用): 「最後に、結果表示欄に何もないとき、カードを非表示にしてください。」「「和了です。牌をすべて入力して点数を計算します。」はバナーには出さないようにしてください。」
- 空のカード: `ResultPanel` の `data-state="empty"`(`result === null`)のとき、`.result-panel[data-state="empty"] { display: none; }`(`main-screen.css`)でカードごと非表示にする。要素は残す(`ref`・バナーの表示判定の購読先のため)。読み込み中・エラーは従来どおり表示する。
- 和了の案内: `shouldShowBanner`(`result-banner-logic.ts`)は `just-hora` のとき false を返す。`ResultGlance` は `just-hora` で `null` を返し、`JustHoraGlance` を削除する。本体(`JustHoraBody`)の案内文は従来どおり。
- 変更ファイル: `main-screen.css`、`result-banner-logic.ts`、`ResultGlance.tsx`、`slots.tsx`(`JustHoraGlance` の削除と、不要になった `React` の値の import を型の import に変更)。
- テスト: `ResultGlance.test.tsx` の E1-6(just-hora)を「バナーに何も出さない」に変更。`result-banner-logic.test.ts` は、表示条件のテストの基準の牌姿を just-hora から聴牌に替え、E4-09(just-hora で false)を新設。`ResultPanel.test.tsx` に E4-10(empty のカードを非表示にする CSS)を新設。
- 実測(375×812): 手牌が空のとき `#result-panel` は `display: none`(高さ 0)。手牌 `1筒1筒`(just-hora)で本体に案内文が出て、バナーは出ない。

### 9.6 UI-6(第9版): 符のない和了(国士無双・十三不搭)の役一覧と基本点の間の仕切り線

- オーナーの UI 監修指示(引用): 「符の概念のない、十三不搭・国士無双ですが、役名と基本点表示の間に区切り線がないので直してください。」
- 原因: `HoraItem`(E2、マージ済み)は、役一覧と符の内訳の間の仕切り線を `showFuBreakdown` のときだけ出していた。符のない和了(国士無双・十三不搭)は、役一覧の直後に基本点が続いた。
- 変更: 役一覧の下の仕切り線を常に出す(`<Divider />`)。符のある和了は従来どおり「役一覧 → 仕切り線 → 符の内訳」、符のない和了は「役一覧 → 仕切り線 → 基本点」になる。役なし(`noYaku`)の分岐は変更しない。
- 変更ファイル: `src/ui/result/hora/HoraItem.tsx`、`src/ui/result/hora/HoraDetail.test.tsx`(E2-19 の国士無双の分岐に、`</ul>` `<md-divider>` `<div class="hora-item__base-point">` の順であることの検証を追加。仕切り線がない状態では失敗することを確認済み)。
- 実測(375×812、dev): 国士無双 `1m9m1p9p1s9s1234567z`+東 で、`hora-item` の子要素が「見出し → 副行 → 仕切り線 → 役一覧 → 仕切り線 → 基本点 → 仕切り線 → 点差」の順。

## 10. 改訂履歴

- 第1版(2026-11-13): 新規作成。
- 第2版(2026-11-13): 独立レビュー4点を反映。(1) 3z の表記を「西」に訂正し、E4-02・E4-03・6(a) の牌の表記を `tileLabelOf` で確定(留保を削除)。(2) livewing の `ResultGlance.tsx` 78〜92行に向聴のバナーがあることを 1.3(e)・Q2 に反映し、本機 `ShantenGlance` はその移植で `count > 0` の絞り込みが確定事項3による差分と整理。(3) 受け入れ条件4に `E2-` 系を追加。(4) 章番号の欠番を詰めた(未決事項 8章・改訂履歴 9章)。
- 第3版(2026-11-13): オーナー回答「Q1・Q2 とも A」を反映。確定事項9(本体の全0枚は見出し+「0種 0枚」+空の一覧)・10(バナーの全0枚はラベルのまま牌0枚)を追加し、1.3(d)(e)・2.3・2.4・E4-05・6(e) の設計案表記と Q1・Q2 への参照を確定の記述に改めた。未決事項はなし。
- 第4版(2026-11-14): UI 監修(9章 UI-1)を反映。バナーの「聴牌」「N向聴」をバッジ化し「待ち」「受け入れ」を削除、牌の並びだけで折り返す。9章「UI 監修による変更」を新設(改訂履歴は10章へ)。確定事項3・10に文言変更の注記、2.4・E4-05・E4-06・6章 6(a)(e)・条件2・4・11 を新表記に更新、E4-08 を追加。
- 第5版(2026-11-14): UI 監修(UI-2)でバッジの色を primary / on-primary に変更(9.2)。
- 第6版(2026-11-14): UI 監修(UI-3)で向聴を secondary、聴牌を primary に分け、和了の打点バナーのロン・ツモをバッジ(primary / tertiary)にして「/」を省略(9.3)。
- 第7版(2026-11-14): UI 監修(UI-4)でバナーの最小高さを牌1段に固定し、向聴バッジを要約カードの抜き北の丸と同じ淡色地+濃い文字に変更(9.4)。
- 第8版(2026-11-14): UI 監修(UI-5)で、結果が空のときカードを非表示にし、just-hora の案内をバナーから外した(9.5)。
- 第9版(2026-11-14): UI 監修(UI-6)で、符のない和了(国士無双・十三不搭)の役一覧と基本点の間に仕切り線を出すようにした(9.6)。
