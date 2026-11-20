# Issue #85 十三不搭のチャンス・成立メッセージ(天地和オフ時) 設計書

- ブランチ: `claude/issue-85-jyusan-message-c89620`(起点 main `46f0feb`)
- 状態: 第5版(UI監修を反映。§9。第4版で設計承認済み)
- 設計担当のモデル: Claude Opus 5.5(`claude-opus-5-5`)

## 1. 参照資料と設計判断の根拠

### 1.1 参照資料

- Issue #85 本文(`gh issue view 85`)
- [docs/mahjong-rules.md](../mahjong-rules.md) §4.2.1(十三不搭の成立条件)・§4.2.2(十三不搭は天和・地和の入力がオンのとき和了として計算。国士無双の形は国士無双とする)
- [issue-14-local-yaku.md](issue-14-local-yaku.md) §4.5(十三不搭の実装)
- [issue-78-shanten-result.md](issue-78-shanten-result.md)・[issue-76-hora-result.md](issue-76-hora-result.md)・[issue-77-tempai-result.md](issue-77-tempai-result.md)・[issue-88-discard-list.md](issue-88-discard-list.md)(結果表示のスロット構造)
- `src/core/local-yaku.ts`(`isShisanputa`・`generateShisanputaHora`)、`src/core/result.ts`(`generateResult`)
- `src/ui/result/`(`classify.ts`・`ResultBody.tsx`・`slots.tsx`・`discard.tsx`・`result.css`)、`src/ui/screen/`(`MainScreen.tsx`・`ResultPanel.tsx`・`ResultBanner.tsx`・`main-screen.css`)、`src/ui/state/`(`app-state.ts`・`situation-rules.ts`)
- [docs/rules/06-ui-md3-protocol.md](../rules/06-ui-md3-protocol.md)・[docs/rules/07-mahjong-rule-protocol.md](../rules/07-mahjong-rule-protocol.md)

### 1.2 ヒアリングで確定した事項(統括担当経由)

| No | 確定事項 | 本書での反映 |
| --- | --- | --- |
| H1 | チャンス(13枚)= 1枚足すと十三不搭になる牌が1種以上ある状態(聴牌と同じ意味)。`generateShisanputaHora` と同じ走査を、天地和の入力を問わない形判定として使う。**定義は【設計案】**(mahjong-rules.md に定義がない) | §2.1 `shisanputaNotice` の `'chance'` |
| H2 | 表示は `rule.localYaku` オン かつ `options.tenho` オフのときだけ。国士の形は対象外 | §2.1 の前提条件 |
| H3 | 13枚: 向聴カードの上に別カードで文言のみ。要約バナー(`ResultGlance`)には出さない(14枚も同様、改訂1)。タップ操作なし | §2.3 |
| H4 | 14枚: 十三不搭が成立しているときだけ、何切るの上にバナー「十三不搭の形です」。タップで天地和オン→和了表示。オン後は出ない | §2.3・§2.4 |
| H5 | 形の事実だけを示す。長い案内文は付けない。チャンスの文言は設計案 | §2.3 |
| H6 | 判定は `src/core/` に関数を追加。`generateResult` の戻り値型は変えず UI から別関数を呼ぶ。単体テスト十数ケース | §2.1・§6 |
| H7 | ルール根拠は mahjong-rules.md の十三不搭の定義 | §1.3 |

### 1.3 ルール根拠(07号)

- 十三不搭の形: mahjong-rules.md §4.2.1「第一ツモ時(鳴きなし)に、面子・搭子がなく、対子が1つだけの形」。既存 `isShisanputa` が実装(対子1・孤立牌12、同色の数字の差が3以上、国士形を除外)。本Issueは**形の判定ロジックを新設しない**。既存関数を呼ぶだけなので、新規のルール解釈は「チャンス」の定義(H1・【設計案】)のみ。
- 天地和オンで和了: §4.2.2【確定】。14枚の成立判定は、天地和をオンにしたときに実際に和了として出ることと一致させる(§2.1 の定義)。

### 1.4 調査で判明した事実(コード読解)

1. `generateResult` の13枚(副露なし)分岐は、`rule.localYaku && options.tenho && melds.length === 0` のときだけ `generateShisanputaHora` を呼ぶ(`result.ts` 172行付近)。天地和オフでは十三不搭は結果に一切現れない。
2. 13枚でチャンスの手は、面子・搭子がないので通常形の向聴は大きく、七対子の向聴は対子ありで 5・対子なしで 6(C-01 は 6)、国士の聴牌(13枚の国士向聴0)は `generateShisanputaHora` 冒頭で除外済み。よって**チャンスの13枚は必ず `hora-shanten`/`shanten`(=`view.kind === 'shanten'`)になり、聴牌・和了表示には落ちない**(論理的帰結。§6.1 C-01・C-02 の結果を `generateResult` に通した分類でも確認する。U-01 の前提)。
   - 国士の境界: `isShisanputa` は14枚の国士向聴が0の形を除外する。例: `1m 9m 1p 5p 9p 1s 9s 1z 1z 2z 3z 4z 5z 6z`(対子は東のみ、同色差3以上、国士完成形ではないが国士向聴0)は、既存コアでは十三不搭にならない。本Issueはこの除外に合わせて通知しない(§2.1・C-18)。
3. 14枚の手は末尾1枚を除いた13枚で再計算し、和了牌が末尾と一致する和了があれば和了表示、なければ打牌候補(`discard-shanten`=`view.kind === 'discard'`)。十三不搭成立の14枚は天地和オフでは13枚側が向聴なので**必ず `discard`** になる。天地和オンでは13枚側の十三不搭和了のうち末尾牌と一致するものが残り、和了表示になる。
4. `isShisanputa` は `countKokushiShanten(counts) === 0` だけを除外する。14枚で国士無双完成形(向聴 -1)は除外されず `true` を返す(対子1・孤立12・間隔条件を満たすため)。実害は今のところない(13枚側で国士聴牌として `generateShisanputaHora` が除外する)。本Issueでは `isShisanputa` を単独で14枚判定に使わず、§2.1 の定義を使うことで回避する。
5. 天地和の状態は `handOptions.tenho`。更新は `dispatch({ type: 'set-situation', key: 'tenho', value: true })`(`app-state.ts`)。`isSituationKeyEnabled('tenho', …)` は常に `true`(可視・有効条件なし)、`normalizeHandOptions` は天地和を他の入力と排他・連動させない。よって**天地和オンにしても立直・一発・海底/河底・嶺上・槍槓・燕返し・槓振りの値は変わらない**。状況入力では、状況シート(`situationSheetModel`)のチップに `tenhoLabel`(親=「天和」、子=ローカル役オンで「地和/人和」)として出る。
6. 結果カードは `ResultPanel`(`.result-panel`、`surface-container` 背景、`corner-large`)。`MainScreen` で入力セクションの直後に置かれ、`input`・`handOptions`・`rule`・`table` は `MainScreen` が持つ。`ResultPanel` は持たない。
7. `ResultBanner`(画面下の要約バナー)は `ResultGlance` を出す。本Issueでは触らない。

## 2. 設計

### 2.1 core: 判定関数(`src/core/local-yaku.ts` に追加)

```ts
// 第5版で戻り値型を変更(§9.2)。下は第4版までの型
export type ShisanputaNotice = 'chance' | 'formed' | null;

/**
 * 天地和オフのときに出す十三不搭のメッセージ種別を返す(Issue #85)
 * - 'chance': 13枚で、1枚足すと十三不搭になる牌がある【設計案】
 * - 'formed': 14枚で、天地和をオンにすると十三不搭の和了になる
 */
export const shisanputaNotice = (
  table: Table,
  input: Input,
  options: HandOptions,
  rule: Rule
): ShisanputaNotice;
```

判定(上から順に評価):

1. `!rule.localYaku || options.tenho || input.melds.length > 0` → `null`
2. `input.hand.length === 13`: `generateShisanputaHora(table, input.hand, { ...options, tenho: true }, rule).length > 0` なら `'chance'`、それ以外 `null`
3. `input.hand.length === 14`: 末尾牌 `last` と残り13枚 `rest` に分け、`generateShisanputaHora(table, rest, { ...options, tenho: true }, rule)` に `compareTiles(h.horaTile, last) === 0` のものがあれば `'formed'`、それ以外 `null`
4. 上記以外の枚数 → `null`

- 国士の境界(§1.4-2): 既存コアの除外条件に合わせて通知しない。core の除外条件は変更しない。この除外が mahjong-rules.md §4.2.2「国士無双の形も満たす手は国士無双とし、十三不搭は付けない」の「国士無双の形」に国士聴牌形まで含むかは**【未確定】**(オーナーは「国士聴牌は十三不搭に当たらないらしい」との認識だが出典未照合)。除外条件を見直す場合は別Issueとする。
- 「形判定」は既存の和了生成に `tenho: true` を差し込むことで実現する(H1「同じ走査」)。これにより、`'formed'` のときに天地和をオンにすると必ず和了表示になる(§1.4-3 と同じ末尾牌の照合)。国士形の除外・赤5・4枚使いの牌(`>= 4` は走査から除く)は既存実装の挙動をそのまま継承する。
- `isShisanputa`・`generateShisanputaHora`・`generateResult` の挙動とシグネチャは変更しない。
- 抜き北(`input.nuki`)は手牌に含まれないので判定に影響しない。

### 2.2 UI: 呼び出し位置と初回JS

判定は既存の遅延計算経路(`src/ui/calc/use-result.ts` が `import('./compute')` で読み込む `compute` チャンク)で求める。

| 案 | 内容 | 初回JS | 採否 |
| --- | --- | --- | --- |
| A | `MainScreen` から `shisanputaNotice` を同期 import して呼ぶ | `local-yaku.ts` とその依存(`tile/shanten` 等)が初回チャンクに入り得る。増分は未実測(数KB規模の可能性) | 不採用 |
| B | `compute.ts` に `computeShisanputaNotice` を追加し、`use-result.ts` で `computeResult` と同じモジュールから受け取る | 増えるのは型・数行の呼び出しのみ(+数十〜200 B 程度と見積もり) | **採用** |

案Bの具体:

- `compute.ts`: `export const computeShisanputaNotice = (s: Pick<AppState,'table'|'input'|'handOptions'|'rule'>): ShisanputaNotice => shisanputaNotice(s.table, s.input, s.handOptions, s.rule);`(`computeResult` は変えない)
- `result-state.ts`: `ResultState` の `ok` に任意の `shisanputa?: ShisanputaNotice`(型 import のみ)。`evaluateResult` に任意の第4引数(通知関数)を足し、値が `null` 以外のときだけキーを付ける(既存テストの `toEqual` を壊さない)
- `use-result.ts`: 読み込み時に `mod.computeShisanputaNotice` も保持して `evaluateResult` に渡す
- 走査は最大27種(1m・9m・1〜9p・1〜9s・1〜7z。`generateShisanputaHora` の `validIndices` を数えた値)×`isShisanputa` で軽量

表示の判定は、結果の分類と組にする(古い結果との食い違い防止):

- `resultState.shisanputa === 'chance'` かつ `view.kind === 'shanten'` → チャンスカード(第5版で `resultState.shisanputa?.kind === 'chance'` に変更。§9)
- `resultState.shisanputa === 'formed'` かつ `view.kind === 'discard'` → 成立バナー
- それ以外は出さない

`ResultPanel` は既に `resultState` を受け取るので、通知値は `resultState` から読む。追加するプロップは `onEnableTenho?: () => void` だけ。`MainScreen` は `onEnableTenho={() => trackedDispatch({ type: 'set-situation', key: 'tenho', value: true })}` を渡す。

初回JS(09号):

- 基準値: **128,937 B**(設計担当が main `46f0feb` を本 worktree で `npm run build` し、`dist/index.html` の `<script type="module" src>` が指す `assets/index-BVvUesAx.js` を `gzip -9 -c | wc -c` で測定。`modulepreload` なし。09号記載の確定値 128,883 B との差 +54 B は v1.0.1 の版番号更新等と推定、内訳未調査)
- 増分の積算(見積もり): `ShisanputaNotice.tsx`+CSS は初回チャンクに入る(+約400 B)、`ResultPanel`/`use-result`/`result-state` の変更(+約150 B)。`local-yaku.ts` は `compute` チャンク側(初回JSに含めない)
- 目標値: **約 129,500 B**(基準値+約550 B。第5版で約 129,650 B に更新、§9.3)。超過しても不合格にしない
- 参考: `compute` チャンク(遅延)は 9,175 B(gzip -9。同じビルドで測定)

### 2.3 UI: 部品と配置

新規 `src/ui/result/ShisanputaNotice.tsx`(1ファイル2部品)。リップル・フォーカスリングは既存の型付きラッパー `Ripple`・`FocusRing`(`src/ui/md/Ripple.tsx`・`src/ui/md/FocusRing.tsx`)を使い、`@material/web` を直接 import しない。

| 部品 | 出す条件 | 文言 | 操作 |
| --- | --- | --- | --- |
| `ShisanputaChanceCard` | §2.2 のチャンス条件 | 「十三不搭チャンス」(オーナー確定) | なし(`<div>`、`role` 付与なし。オーナー確定) |
| `ShisanputaFormedBanner` | §2.2 の成立条件 | 「十三不搭の形です」(H4で確定) | 要素全体が `<button type="button">`。クリック・タップ・Enter/Space で `onEnableTenho()` |

配置(`ResultPanel` の返す JSX):

```
<>  ← ResultPanel の戻り値をフラグメントにする
  {通知があれば <ShisanputaChanceCard/> または <ShisanputaFormedBanner/>}
  <section className="result-panel" …>(既存のまま)</section>
</>
```

- 通知は `.result-panel` の**外・直前の兄弟要素**として、別カードにする(H3「別カード」)。`ResultPanel` の `ref`・`id="result-panel"`・`scrollMarginTop` は `<section>` に残す(要約バナーからのスクロール先を変えない)。
- 親 `<main>` の縦並びの間隔に従う。間隔が既存カード間と揃わない場合は、通知側に `margin` を足して揃える(既存カード間の値を実測して合わせる。値は製造で決めてよい)。
- `ResultBanner`/`ResultGlance`・`ShantenBody`・`DiscardBody`・`slots.tsx` は変更しない。
- 成立バナーの `aria-label` は付けない(ボタンのテキストがそのままアクセシブルネームになる)。

スタイル(`result.css` に追加。HEX 禁止・トークンのみ、06号):

| クラス | 指定 |
| --- | --- |
| `.shisanputa-notice` | `background-color: var(--md-sys-color-surface-container)`、`color: var(--md-sys-color-on-surface)`、`border-radius: var(--md-sys-shape-corner-large)`、`padding: 0.75rem 1rem`、`box-sizing: border-box`、`width: 100%`、本文は `title-small` のタイポトークン一式 |
| `.shisanputa-notice--formed` | ボタンの既定スタイルを打ち消す(`border: none`、`font: inherit`、`text-align: start`、`cursor: pointer`)。押下フィードバックは `Ripple`・`FocusRing` ラッパー(描画結果は `md-ripple`・`md-focus-ring`)を内包し、`position: relative`。タップ可能の手がかり【確定】: 文言の後ろ(行末)に `chevron_right` 相当のアイコン(既存のインラインSVGアイコン方式に従う、`color: var(--md-sys-color-on-surface-variant)`、`aria-hidden`)を置く |

- 色は結果カードと同じ `surface-container`(オーナー確定)。14枚バナーは色で区別できないため、`<button>`・カーソル・リップル・フォーカスリング・行末のシェブロンでタップ可能と示す(シェブロンはオーナー確定)。13枚カードはこれらを一切持たない。

### 2.4 タップ後の遷移

1. 成立バナーをタップ → `set-situation(tenho, true)` → `handOptions.tenho === true`
2. `shisanputaNotice` は前提条件1で `null` → バナーは消える
3. 再計算で14枚の結果が十三不搭(役満)の和了表示になる(§1.4-3)
4. 状況カードの表示(`situationLabels`)に天和/地和/人和のラベルが加わる。他の状況入力は変わらない(§1.4-5)
5. 子でロン扱いにはならない(十三不搭和了は `by: 'tsumo'` のみ)。十三不搭は天和・地和と複合しない(mahjong-rules.md §4.2.2【確定】。既存実装も十三不搭のみを返す)。子の状況チップ「地和/人和」は入力のラベルであって成立役ではない。親子とも成立役は十三不搭(役満1)のみ

## 3. 範囲外

- 十三不搭の向聴数・有効牌の計算
- 要約バナー(`ResultBanner`/`ResultGlance`)への表示
- 天地和オン時の表示変更(既存の和了表示のまま)
- `isShisanputa` の国士完成形(向聴 -1)を除外しない件の修正(§1.4-4。本Issueの経路では顕在化しない)

## 4. 後続への引き継ぎ

- 「チャンス」の定義は【設計案】のまま本書にのみ記録する。mahjong-rules.md への追記は本Issueの範囲外(オーナー確定)。
- `isShisanputa` 単体を14枚判定に使う新規コードを書く場合、国士完成形を誤って `true` とする点に注意(§1.4-4)。

## 5. 実挙動未確認

- 通知カードと既存カードの縦間隔の実測値(製造で実測し揃える)
- `md-ripple`/`md-focus-ring` を `<button>` 内に置いたときの見た目(既存の `Tile` 等での使い方に合わせる。製造・検収で目視)
- 本設計はコード読解とビルド計測のみで、devサーバー・ブラウザでの実測はしていない
- 案Bの初回JS増分は見積もり(実測は S-06)

### 5.1 外部事実の確認記録(02号 項目6)

| 事実 | 実行したコマンドと結果 |
| --- | --- |
| React Testing Library は依存に無い | `grep -n "testing-library" package.json` → ヒットなし。よって UI テストは既存の `renderToStaticMarkup` 方式 |
| 基準値 | main `46f0feb` で `npm run build` → `dist/index.html` の script は `assets/index-BVvUesAx.js`、`gzip -9 -c dist/assets/index-BVvUesAx.js \| wc -c` → 128937。`compute-C_2v_kSc.js` → 9175。計測後に `dist/` を削除 |
| 十三不搭判定の所在 | `grep -l "kokushi\|shisanputa" dist/assets/*.js` → `compute`・`index`・`HoraDetail`・`SettingsScreen`・`rule-items` にヒット(`index` 側は役名ラベル等の文字列と推定、判定本体の所在は未確認) |
| Material Web のラッパー | `ls src/ui/md` → `Ripple.tsx`・`FocusRing.tsx` が存在。`<button>` 内での見た目は未確認 |


## 6. 受け入れ条件

共通: 牌の表記は `m`/`p`/`s`/`z`(1z=東…7z=中)、`0p` は赤5p。ルールは既定値に `localYaku: true` を上書きしたもの、天地和オフ・副露なし・場風東・自風東を基準とする(ケースごとに差分を記す)。

### 6.1 core 単体テスト(`src/core/local-yaku.test.ts` に追加。テスト名の接頭辞 `I85-`)

| ID | 入力 | 期待値 |
| --- | --- | --- |
| C-01 | 13枚 `1m 9m 1p 4p 7p 1s 4s 7s 1z 2z 3z 4z 5z`(十三面待ち相当) | `'chance'` |
| C-02 | 13枚 `1m 9m 1p 4p 7p 1s 4s 7s 1z 2z 3z 4z 4z`(対子あり。孤立1種追加で成立) | `'chance'` |
| C-03 | 13枚 で搭子あり `1m 9m 1p 3p 7p 1s 4s 7s 1z 2z 3z 4z 5z` | `null` |
| C-04 | 13枚 で対子2つ `1m 9m 1p 4p 7p 1s 4s 1z 1z 2z 2z 3z 4z` | `null` |
| C-05 | 13枚 で国士聴牌の形 `1m 9m 1p 9p 1s 9s 1z 2z 3z 4z 5z 6z 7z` | `null` |
| C-06 | C-01 で赤 `0p` を使う形 `1m 9m 1p 0p 9p 1s 4s 7s 1z 2z 3z 4z 5z`(赤ありルール) | `'chance'` |
| C-07 | C-01 に `localYaku: false` | `null` |
| C-08 | C-01 に `tenho: true` | `null` |
| C-09 | C-01 の手牌に副露1つ(手牌10枚+ポン) | `null` |
| C-10 | 14枚 `1m 9m 1p 4p 7p 1s 4s 7s 1z 2z 3z 4z 5z 5z`(成立) | `'formed'` |
| C-11 | C-10 の牌を並べ替え、末尾を `1m` にしたもの | `'formed'` |
| C-12 | 14枚 国士無双完成形 `1m 9m 1p 9p 1s 9s 1z 2z 3z 4z 5z 6z 7z 7z` | `null` |
| C-13 | 14枚 で搭子あり(C-10 の `4p` を `2p` に) | `null` |
| C-14 | C-10 に `tenho: true` | `null` |
| C-15 | C-10 に `localYaku: false` | `null` |
| C-16 | 同一牌3枚(刻子)を含む13枚 `1m 9m 1p 4p 7p 1s 4s 7s 1z 1z 1z 2z 3z`(4枚目を足しても不成立) | `null` |
| C-17 | 12枚・11枚・1枚 | `null` |
| C-18 | 14枚 国士聴牌形 `1m 9m 1p 5p 9p 1s 9s 1z 1z 2z 3z 4z 5z 6z`(境界固定。§1.4-2) | `null` |
| C-19 | C-02(`4z` 対子)、赤なしルール(第5版) | `kind: 'chance'`。`tileAvailabilities` は成立牌 `5z`・`6z`・`7z` の3件で各 `count: 4`(`compareTiles` 昇順)。`9m` 等の不成立牌を含まない |
| C-20 | C-19 の入力にドラ表示牌 `6z` を1枚追加 | `6z` の `count: 3`、他は 4 |
| C-21 | C-01 に抜き北1(`nuki: 1`)を追加 | 成立牌 `4z`(北)の `count` が `4 - 1(手牌) - 1(抜き)= 2` |
| C-22 | 赤ありルール(p に赤1枚)、13枚 `1m 9m 1p 9p 1s 4s 7s 1z 2z 3z 4z 4z 5z`(5p で成立) | 5p が赤なし(`count: 3`)と赤(`count: 1`)の2件(`tileAvailableCount` の規則)。赤なしルールでは 5p は赤なし1件(`count: 4`) |
| C-23 | C-22 のルールで、ドラ表示牌に赤5p(`0p`)を1枚 | 5p 赤の `count: 0`(配列には残る)、赤なし `count: 3` |
| C-24 | C-01 の `tileAvailabilities` の `count` 合計 | 各成立牌について `4 - 手牌枚数` を足した値と一致 |

合格: 上記を `npm test -- src/core/local-yaku.test.ts` で実行し全件 pass。C-01〜C-17 の各期待値は、検収担当が手牌の並びを見て mahjong-rules.md §4.2.1 の条件(面子・搭子なし、対子1つ、同色の数字の差3以上、国士形除外)と照合できること(照合結果を検収報告に1行ずつ記す)。

### 6.2 UI テスト(`src/ui/result/i85-shisanputa.test.tsx` を新設。既存の `e4-shanten.test.tsx`・`f1-discard.test.tsx` と同じ `renderToStaticMarkup` による静的HTML検査。依存は追加しない)

| ID | 描画 | 合格条件(HTML文字列・DOMParser 等での検査) |
| --- | --- | --- |
| U-01 | `ResultPanel` に、C-01 を `generateResult` に通した結果(`classifyResult` が `shanten`)と `shisanputa`(第5版では `shisanputaNotice` の戻り値)の `resultState` | 「十三不搭チャンス」を含む `div` が `<section id="result-panel"` より前にある。その要素は `button` でなく、`md-ripple`・`md-focus-ring` を含まない |
| U-01b | U-01 の HTML(第5版。§9) | 通知内に `result-body__title` の「十三不搭チャンス」と `result-body__summary` の「M種 N枚」(C-01・赤なしで M=成立牌の種類数、N=C-24 の合計)。牌は `result-body__wait` の組で並び各組に「×{count}」。C-23 を与えたとき「×0」を含まない。牌は `button` でなく、`aria-label` に「ツモ」を含まない |
| U-02 | `shisanputa` が chance で view が `discard` | 通知の文言・クラスが出ない |
| U-03 | C-10 の結果(`discard`)と `shisanputa: 'formed'` | `<button type="button"` で文言「十三不搭の形です」、`md-ripple`・`md-focus-ring` を内包し、`<section id="result-panel"` より前 |
| U-04 | `shisanputa: 'formed'` で view が `shanten` | 通知が出ない |
| U-05 | `shisanputa` なし | 通知が出ず、`<section id="result-panel"` の属性は従来どおり |
| U-06 | `ResultGlance`(要約バナーの部品)を C-01・C-10 の結果で描画 | 「十三不搭」を含まない |
| U-07 | `evaluateResult` に C-10 相当の入力と通知関数を渡す / 渡さない | 渡すと `shisanputa: 'formed'`、渡さないと従来どおり `shisanputa` キーなし |
| U-08 | `generateResult` に C-10 の14枚・`tenho: true`・親(`seat: 'east'`)と子(`seat: 'south'`)で計算 | 親子とも `hora` の和了で、役は `shisanputa`(役満1)のみ。`tenho`・地和系の役が付かない |

合格: `npm test` 全件 pass。

### 6.3 静的検査

| ID | 実行 | 合格条件 |
| --- | --- | --- |
| S-01 | `npm run lint`・`npm run typecheck`・`npm run format:check` | エラーなし |
| S-02 | `git diff main --stat` | 変更が `src/core/local-yaku.ts`・`src/core/local-yaku.test.ts`・`src/ui/calc/compute.ts`・`src/ui/calc/result-state.ts`・`src/ui/calc/use-result.ts`・`src/ui/result/ShisanputaNotice.tsx`・`src/ui/result/result.css`・`src/ui/result/i85-shisanputa.test.tsx`・`src/ui/screen/ResultPanel.tsx`・`src/ui/screen/MainScreen.tsx`・本設計書 に限られる(`package.json`・`package-lock.json` の変更なし=依存追加なし) |
| S-03 | `git diff main -- src/core/result.ts src/ui/result/discard.tsx src/ui/screen/ResultBanner.tsx` | 差分なし(戻り値型・既存部品を変えていない) |
| S-03b | `git diff main -- src/ui/result/slots.tsx` | 差分は `renderWaitTiles` 宣言への `export` 付与のみ(第5版。§9.3) |
| S-04 | 追加 CSS を `grep -nE '#[0-9a-fA-F]{3,8}\b'` | ヒットなし |
| S-06 | `npm run build` 後、09号の計測方法で初回JSを実測 | 基準値 128,937 B・実測値・増分・目標値(約 129,500 B)との差を検収報告と PR 本文に記録する(超過は不合格条件でない)。`dist/assets/` の初回チャンクに `shisanputa` 判定本体(`isShisanputa` 相当)が入っていないことを、`compute` チャンク側にあることで確認 |
| S-05 | 変更ファイルを `grep -n` でホームディレクトリ名・絶対パス検索 | ヒットなし |

### 6.4 画面確認(検収担当が `vite preview` で実施。G-08 参照)

| ID | 操作 | 合格条件 |
| --- | --- | --- |
| V-01 | 設定でローカル役オン、C-01 の13枚を入力(第5版で表示内容は V-06 に従う) | 結果カードの上に別カードでチャンス文言、結果カードは「N向聴」 |
| V-02 | C-10 の14枚を入力 | 何切るカードの上に「十三不搭の形です」 |
| V-03 | V-02 のバナーをクリック | バナーが消え、和了表示に切り替わる。役は十三不搭のみ。状況カードに「天和」(親)が表示。他の状況入力(事前に立直・海底をオンにしておく)は変わらない |
| V-03b | 自風を南(子)にして V-03 | 状況カードに「地和/人和」が表示され、和了の役は十三不搭のみ(地和は付かない) |
| V-03c | V-02 の状態でバナーに Tab でフォーカスし Enter | フォーカスリングが見え、V-03 と同じ切り替えが起きる |
| V-04 | ライト/ダーク両テーマで V-01・V-02 を表示 | 文字が背景に埋もれない。V-02 のバナーにカーソルを載せるとポインタになる。行末にシェブロンが見える。V-01 のカードはどちらもない(スクリーンショットを検収報告に添付) |
| V-05 | 幅 360px で V-02 | 横スクロールが出ない |
| V-06 | ローカル役オン、C-02 の13枚を入力(第5版) | 向聴カードの上の別カードに、見出し「十三不搭チャンス」と右に「3種 12枚」、その下に白・發・中の牌画像と各「×4」。向聴カードの待ち牌と同じ大きさ・間隔。牌をタップしても何も起きない |
| V-07 | 幅 360px・ライト/ダークで C-01 | 成立牌が折り返して横スクロールが出ない。「M種 N枚」が見出しの右(狭いときは次行)に出る |

## 7. 実機確認(検収後にユーザーが行う。合否に含めない。C-02)

- スマホ実機で V-02・V-03 のタップ感(リップル・反応)を確認

## 8. 未決事項(要ヒアリング)

### 8.1 オーナー回答で確定(改訂1)

1. チャンスの文言は「十三不搭チャンス」
2. 通知カードの色は `surface-container`(結果カードと同じ)
3. 13枚のチャンスカードはタップ不可
4. 14枚の成立バナーも要約バナー(`ResultGlance`)には出さない
5. チャンスの定義は本書に【設計案】として残すのみ。mahjong-rules.md への追記は範囲外
6. 14枚バナーの行末にシェブロンアイコンを置く(オーナー確定)

### 8.2 残る【未確定】

1. 【未確定】国士聴牌形(14枚の国士向聴0。例 `1m 9m 1p 5p 9p 1s 9s 1z 1z 2z 3z 4z 5z 6z`)が十三不搭に当たらないことのルール上の根拠。本Issueは既存コアに合わせ通知しない(オーナー回答)が、出典との照合は未了。見直す場合は別Issue
2. 【未確定】UI監修の指示「M種N牌」の「牌」は、既存の「M種 N枚」に揃える誤記と解釈した。「枚」でよいか

## 9. UI 監修による変更

### 9.1 指示(製造後。製造コミット 069611c・f59be16 の後)

オーナー: 十三不搭チャンスを、向聴の待ちカードの様式で、見出し「十三不搭チャンス M種N牌」と、牌×枚数の並びで表示する。

解釈: `ShantenBody`(`slots.tsx`)と同じ様式。見出し行に「十三不搭チャンス」、右に「M種 N枚」(M=成立牌の種類数。赤五と通常の五は同一視、N=残り枚数の合計。`summarizeAcceptance` と同じ)。下に成立牌を牌画像+「×残り枚数」で並べ、残り0枚は出さない(E4-04 と同じ)。表記は既存に合わせ「枚」(指示の「牌」は誤記と解釈。§8.2-2 で確認)。13枚チャンスはタップ不可のまま。14枚の成立バナーは変更なし。

### 9.2 core の変更(`src/core/local-yaku.ts`)

```ts
export type ShisanputaNotice =
  | { kind: 'chance'; tileAvailabilities: TileAvailability[] }
  | { kind: 'formed' }
  | null;
```

- 判定条件(§2.1)は変えない。`chance` のとき、`generateShisanputaHora(table, input.hand, { ...options, tenho: true }, rule)` の和了牌から牌種(`type`+`n`)を重複なく取り出し、向聴の有効牌と同じ規則で `TileAvailability` に展開する:
  - 差し引く牌 = 手牌 + 副露の牌(本機能では副露なしで空) + ドラ表示牌 + 裏ドラ表示牌 + 抜き北の枚数分の北(`result.ts` の `allInputTiles` と同じ構成)
  - 数牌の5: `red: false` と `red: true` の2件を `tileAvailableCount(rule.red, existing, t)` で求め、`null` の件は除く。それ以外: 1件
  - `compareTiles` 昇順。`count: 0` の件も残す(表示側で除外)
- 和了牌の赤展開(`horaTileVariants`)は使わず上の規則で展開し直す。向聴の有効牌の表記と揃えるため
- `result.ts` の `tileCountsIndexToTileAvailabilities` は export されていないクロージャなので、同じ規則を `local-yaku.ts` 内の小関数として書く(`result.ts` は変えない。S-03)
- `formed` は `{ kind: 'formed' }`(判定は不変)

### 9.3 UI の変更

| ファイル | 変更 |
| --- | --- |
| `src/ui/result/slots.tsx` | `renderWaitTiles` に `export` を付けるだけ |
| `src/ui/result/ShisanputaNotice.tsx` | `ShisanputaChanceCard({ tileAvailabilities })`。`summarizeAcceptance` で集計し、`<div className="shisanputa-notice result-body" data-result-kind="shisanputa-chance">` に `ShantenBody` と同じ `result-body__heading`(`<h2 className="result-body__title">十三不搭チャンス</h2>`、`<span className="result-body__summary tabular-nums" data-kinds data-total>{kinds}種 {total}枚</span>`)と `<div className="result-body__tiles">{renderWaitTiles(available)}</div>`。`onTsumo` は渡さない |
| `src/ui/screen/ResultPanel.tsx` | 条件を `resultState.shisanputa?.kind === 'chance'` / `'formed'` に変え、chance で `tileAvailabilities` を渡す |
| `src/ui/result/result.css` | 既存の `.result-body--shanten .result-body__tiles` 等の群に `.shisanputa-notice .result-body__tiles` を加える。新色・HEXなし |
| `compute.ts`・`result-state.ts`・`use-result.ts` | 型参照で追従(コード変更は原則不要)。「`null` ならキーを付けない」互換は維持 |
| テスト | `local-yaku.test.ts`(C-19〜C-24 と既存 C 系の期待値の型変更)、`i85-shisanputa.test.tsx`(U-01b、既存 U 系の型変更) |

- `.result-body` の併用で `--tile-width`・縦並び・間隔が `ShantenBody` と揃う。`.shisanputa-notice` の背景・角丸・padding は維持
- 変更ファイルは S-02 の許可範囲内(`slots.tsx` のみ S-03 の例外。S-03b)
- 初回JS: `ShisanputaNotice.tsx` の増分(+約100〜150 B 見積もり)。core 側は `compute` チャンク。目標値は約 129,650 B に更新(S-06 で記録。超過は不合格でない)
- 既存 C-01〜C-18 の期待値 `'chance'`・`'formed'` は、それぞれ `kind: 'chance'`・`{ kind: 'formed' }` と読み替える

## 10. 改訂履歴

- 初版作成(Issue #85)
- 改訂4(第5版): UI監修を反映(§9)。チャンスに成立牌と残り枚数を持たせる戻り値型、`ShantenBody` 様式の表示、C-19〜C-24・U-01b・S-03b・V-06・V-07 追加、目標値更新
- 改訂3(第4版): シェブロンを確定(§2.3・V-04・§8)。設計承認
- 改訂2(第3版): 独立レビュー指摘を反映(地和との複合の誤記訂正、国士聴牌形の境界と C-18、UIテストを静的HTML方式に変更しクリック操作を V-03 系へ移動、初回JSの比較と基準値・目標値・S-06、`Ripple`・`FocusRing` ラッパー明記、シェブロンの確認を条件付きに、記載修正・モデル名・外部事実記録)
- 改訂1: オーナー回答を反映(チャンス文言「十三不搭チャンス」、通知色 `surface-container`、13枚はタップ不可、14枚も要約バナーに出さない、mahjong-rules.md 追記は範囲外)。タップ可能の手がかり(シェブロン)を設計案として追加
