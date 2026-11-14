# Issue #101 H1. 点数計算表 設計書

- 親: Epic H(参照・共有)
- 依存: なし(main `74841d5` を起点とする。D1 の `navigate`・`Screen`、D5/D6 の設定画面の lazy 方式、A3 の `calculatePayment` を前提にする)
- ブランチ: 統括担当の指定に従う
- 版: 第4版(2026-11-15)。状態: 承認済み(2026-11-15 オーナー承認。ユーザー判断事項はすべて確定済み。8章)

## 1. 参照資料と設計判断の根拠

### 1.1 参照した資料

- `docs/issues-draft.md` の H1、`docs/mahjong-rules.md` §3.1〜§3.3・§4(連風牌の雀頭)・テスト期待値の出典規定(188行付近)
- 実装: `src/core/score.ts`(`calculateBasePoint`・`ceil100`)、`src/core/payment.ts`(`calculatePayment`・`PaymentDetail`)、`src/core/table.ts`(`Table`・`isDealer`)、`src/core/rule.ts`(`tsumoLoss`・`honbaPoint`・`depositPoint`・`roundedMangan`・`accumlatedYakuman`・`doubleWindFu`)、`src/ui/state/app-state.ts`(`Screen = 'main' | 'settings'`、`navigate`)、`src/ui/App.tsx`(`SettingsScreen` の `lazy`+`Suspense`)、`src/ui/screen/AppHeader.tsx`(`HEADER_MENU_ENTRIES`・`HEADER_MENU_ACTIONS`)、`src/ui/screen/SettingsScreen.tsx`(戻るボタン)
- 参考実装(読み取り専用): livewing の ScoringTable.tsx(成立しない欄の判定、満貫以上の色分け、本場込み・点差のタブ)
- 業務標準 01・02・06・07・09、指導文書 G-04・G-08・G-10

### 1.2 確定事項(オーナー決定。再検討しない)

| # | 内容 |
| --- | --- |
| Q1 | ヘッダーメニューに「点数計算表」を追加し、全画面で開く。設定画面と同じ `lazy` + `navigate`(`Screen` に追加)方式 |
| Q2 | ~~本場・供託を反映した本場込み表示は実装する~~ → **オーナー追加判断で本場・供託は v2 以降に先送り**(3章)。**点差表示は範囲外・後日実装**(3章) |
| Q3 | 卓との連動は 自風(親/子)、ルールの `tsumoLoss` と J1・J2 で連動と確定したもの(`roundedMangan`・`accumlatedYakuman`)まで(オーナー追加判断で本場・供託・`honbaPoint`・`depositPoint` を外した)。画面内に親/子の切替を付ける。その他のルール連動は本書で整理し、曖昧なものはユーザー判断事項にする |
| Q4 | livewing に倣い、成立しない欄は「-」。1〜4飜 × 符の表と、満貫以上の別表(5飜/6〜7/8〜10/11〜12/13以上〔数え役満の設定による〕)に分ける |
| Q5 | 現在の和了結果の強調はしない |
| Q6 | 遅延チャンクにする |
| 追加1 | 符の範囲は livewing 同等の 20〜110 の全行 |
| 追加2 | 縦軸は符(行=符、列=1〜4飜、満貫以上は別表)。オーナー確定 |

### 1.3 参考実装の照合(livewing の ScoringTable.tsx を読んだ結果)

- 欄全体を出さない: `fu < 30 && han === 1`、および `fu === 110 && han === 1 && doubleWindFu === 2`。
- ロンだけ「-」: `fu === 20`。ツモだけ「-」: `fu === 25 && han === 2`、`fu === 110 && han === 1`。
- 基本点は `calculateBasePoint(fu, han, roundedMangan, true)`(数え役満を常に true で呼ぶ)。
- 点差タブは四麻(3人払い・ツモ損なし)前提の式。三麻(2人払い・ツモ損3方式)には流用できない(3章)。
- 満貫以上を tailwind の固定色で塗り分けている。本アプリでは HEX/固定色を使わず MD3 トークンに置き換える(06号)。

### 1.4 ルール解釈(07号)と成立しない欄の判定

成立しない欄の規則を、出典との照合状況つきで整理する。

| # | 規則 | 根拠 | 本書での扱い |
| --- | --- | --- | --- |
| N1 | 20符はロン不可(門前ロンは加符10で30符以上。三麻はチーが無く、副露は必ずポン・カンなので刻子・槓子で最低2符が付き、20符にならない) | 一般的な符計算(Wikipedia「麻雀の得点計算」の符の規則)と既存コアの符計算 | 下の注記のとおり |
| N2 | 20符1飜・25符1飜は存在しない(20符は平和ツモで門前ツモ+平和の2飜以上、25符は七対子で2飜以上) | 同上 | 同上 |
| N3 | 25符2飜はツモ不可(七対子のツモは門前ツモが付き3飜以上) | 同上 | 同上 |
| N4 | 110符1飜はツモ不可、ロンは連風牌の雀頭4符のときだけ成立(livewing の規則) | livewing の実装と、独立レビューが示した成立例(8章 J4)。コアでの確認は H1-13 | 【確定】オーナー確定 J4=A(H1-13 で成立例を確かめられなければ110符1飜は常に空欄にする条件つき) |

- 注記(N1〜N3): オーナー決定 Q4(livewing に倣う)と既存コアの符計算からの帰結であり、mahjong-rules.md には未記載。確定後に mahjong-rules.md へ反映が必要(07号)。
| N5 | 三麻固有で追加の不成立欄は無い(萬子 2〜8 が無いことは符の上限・下限を変えない) | 設計担当の推論 | 【設計案】。検収で否定されない限りこのまま |

- 成立判定はルール(`doubleWindFu`)以外の卓状況に依存させない。
- 期待値の出典(07号・mahjong-rules.md のテスト規定): 
  - ツモ損3方式の確定例: mahjong-rules.md §3.1(満貫ツモ、子30符2飜の北家分折半 800・1300、子30符4飜のロン打点折半 3900オール)
  - 1〜4飜のロン・ツモ損ありのツモ: 四麻の点数早見表(Wikipedia「麻雀の得点計算」の点数表)。三麻のツモ損ありは四麻ツモの北家分を払わないだけなので、各人の額は四麻表と同じ
  - livewing の表は検算に使わない(mahjong-rules.md の規定)

## 2. 設計

### 2.1 モジュール構成

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `src/ui/scoring-table/scoring-table.ts` | 新規・純関数(React なし) | 表の各欄の値の生成。網羅テストの対象 |
| `src/ui/scoring-table/scoring-table.test.ts` | 新規 | 純関数のテスト |
| `src/ui/screen/ScoringTableScreen.tsx` | 新規・遅延チャンク | 画面本体(`export default`。`useAppState` から読んで `ScoringTableView` に渡す薄い外側)と、表示用の内側コンポーネント `ScoringTableView`(named export。props だけで描画) |
| `src/ui/screen/ScoringTableScreen.test.tsx` | 新規 | `renderToStaticMarkup` のテスト |
| `src/ui/screen/scoring-table.css` | 新規 | 画面の CSS(`ScoringTableScreen.tsx` から import。遅延チャンクに入る) |
| `src/ui/state/app-state.ts` | 変更 | `Screen = 'main' \| 'settings' \| 'scoring-table'` のみ |
| `src/ui/screen/AppHeader.tsx` | 変更 | `HeaderMenuItemId` 型に `'scoring-table'` を追加し、メニュー項目(「点数計算表」)を「設定」の直後に、`HEADER_MENU_ACTIONS` に対応を追加 |
| `src/ui/App.tsx` | 変更 | `ScoringTableScreen` の `lazy` と `AppContent` の分岐 |
| `AppHeader.test.tsx`・`app-state.test.ts` | 変更 | メニュー項目数・navigate の期待値の追従 |

- `src/core/` は変更しない。純関数は `calculateBasePoint`・`calculatePayment` を呼ぶだけ(計算を再実装しない)。
- メニュー位置は「設定」の直後、同じ区画(オーナー確定 J7=A)。

### 2.2 純関数(`scoring-table.ts`)

```ts
export const FU_LIST = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110] as const;
export const HAN_LIST = [1, 2, 3, 4] as const;

/** 表が読むルール(J1・J2・J3 で連動と確定) */
export type ScoringRule = Pick<Rule,
  'tsumoLoss' | 'roundedMangan' | 'accumlatedYakuman' | 'doubleWindFu'>;

export interface ScoringContext {
  dealer: boolean;   // 画面内の親/子(2.4)
}

export type Cell =
  | { kind: 'absent' }               // 欄ごと存在しない(N2・N4)。空欄
  | { kind: 'na' }                   // その和了方法が成立しない(N1・N3・N4)。「-」
  | { kind: 'value'; payment: Payment; text: string }; // text は formatPoints(payment) の結果

export interface TableCell { fu: number; han: number; ron: Cell; tsumo: Cell; limit: LimitKind | null }
export type LimitKind = 'mangan' | 'haneman' | 'baiman' | 'sanbaiman' | 'yakuman';

export function buildFuHanTable(rule: ScoringRule, ctx: ScoringContext): TableCell[][]; // [fu][han]
export interface LimitRow { label: string; kind: LimitKind; ron: Cell; tsumo: Cell }
export function buildLimitTable(rule: ScoringRule, ctx: ScoringContext): LimitRow[];
export function cellExists(fu: number, han: number, by: 'ron' | 'tsumo', doubleWindFu: 2 | 4): 'absent' | 'na' | 'ok';
```

- 各欄は `calculateBasePoint(fu, han, rule.roundedMangan, rule.accumlatedYakuman)` → `calculatePayment(basePoint, table, by, rule)`。`table` は `{ round: 'east', seat: dealer ? 'east' : 'south', continue: 0, deposit: 0 }` を純関数内で組み立てる(場風は計算に影響しない。本場・供託は範囲外のため常に 0)。`calculatePayment` の rule 引数には `{ tsumoLoss: rule.tsumoLoss, honbaPoint: 0, depositPoint: 0 }` を渡す(本場0なので値は結果に影響せず、例外も起きない)。
- `limit`: 1〜4飜の欄でも基本点が 2000 になれば `'mangan'`(切り上げ満貫・70符3飜等)。それ以外 `null`。
- 満貫以上の別表の行ラベル(本書全体でこの表記に統一): 「5飜」「6〜7飜」「8〜10飜」「11〜12飜」「13飜以上」。`accumlatedYakuman === false` のときは「11飜以上」(三倍満)の1行にまとめて4行にする(オーナー確定 J2=A)。基本点は代表飜数(5・6・8・11・13)で `calculateBasePoint(30, han, …)` から得る。
- 支払いの表記: 既存の `formatPoints(payment)`(`withHonba` は既定の false のまま)(`src/ui/result/hora-summary.ts`)を再利用する。子ツモで親・子の額が同じとき(ロン打点折半、ロン打点折半の満貫 4,000オール 等)は「○○オール」と表記する(`formatPoints` が既にそう処理する)。再利用できない形なら同じ規則を純関数に切り出し、テストで確認する。
- 数値の表記(`1,000`)は既存の `formatNumber`(`src/ui/result/hora-summary.ts`)を import してよい(初回チャンクとの共有になる)。

### 2.3 画面構成【設計案。UI 監修で変更可】

上から順に:

1. ヘッダー: 戻るボタン(設定画面と同じ部品・`aria-label="戻る"`)と題「点数計算表」。
2. 親/子の切替: 2択のセグメントボタン(既存 `WindSegment` 等と同系の MD3 部品)。「親」「子」。
3. 1〜4飜 × 符の表: 行=符(20〜110)、列=1〜4飜。各欄は2段で 上=ロン、下=ツモ。ツモの表記は 子: `子・親`(例 `300・500`)、親: `500オール`、子ツモで親子同額なら `4,000オール`(2.2 の `formatPoints`)。
4. 満貫以上の表: 行=5飜/6〜7飜/8〜10飜/11〜12飜/13飜以上(数え役満なしなら 5飜/6〜7飜/8〜10飜/11飜以上 の4行)、列=ロン・ツモ。
- 本場・供託は表示しない(範囲外。3章)。卓に本場・供託があっても表は本場0の申告額。
- 成立しない欄: `na` は「-」を `--md-sys-color-on-surface-variant` で薄く、`absent` は空欄。
- 満貫以上の色分け: `limit` 種別ごとに `--md-sys-color-tertiary-container` 等の既存トークンで背景を付ける(HEX 禁止)。種別とトークンの対応は製造担当が既存 CSS のトークンから選び、UI 監修で調整する。
- 375px 幅で表が横にはみ出す場合は表だけ横スクロール(`overflow-x: auto`)。ページ全体は横スクロールさせない。
- 見ればわかる説明書きは置かない(例「ロンは上、ツモは下」の注記は置かず、表の列見出し・行内の位置で示す。必要なら UI 監修で判断)。

### 2.4 状態と遷移

- `Screen` に `'scoring-table'` を追加。メニュー選択で `{ type: 'navigate', screen: 'scoring-table' }`。戻るボタンで `{ type: 'navigate', screen: 'main' }`。reducer の変更は不要(既存の navigate が汎用)。
- 端末の「戻る」(履歴)には対応しない(設定画面と同じ。既存の流儀)。
- 親/子: 画面のローカル `useState`。初期値は `isDealer(state.table)`。画面を開くたびに卓から再初期化し、切替結果は保存しない・卓へ書き戻さない(Q3 の範囲内で設計担当が決定)。
- 卓から読むのは自風(親/子の初期値)だけ。ルールは `useAppState()` から読むだけ。
- テスト可能にするための分割: `AppStateProvider` の Context は非 export で状態を注入できないため(変更しない)、既存の `RuleSection` 等の流儀に合わせ、`ScoringTableView` を named export する。props は `{ seat: Wind; rule: ScoringRule; initialDealer?: boolean; onBack: () => void }`(卓は自風だけ渡す)。親/子の `useState` は `ScoringTableView` 内に置き、初期値は `initialDealer ?? seat === 'east'`(`isDealer` と同じ判定)。default export の外側は `useAppState`・`useAppDispatch` から読んで渡すだけ。

### 2.5 卓・ルールとの連動の整理

| 項目 | 本 Issue | 状態 |
| --- | --- | --- |
| 自風(親/子) | 連動(初期値のみ) | 【確定】Q3 |
| `tsumoLoss` | 連動 | 【確定】Q3 |
| 本場・供託・`honbaPoint`・`depositPoint` | 連動しない(v2 以降に先送り。3章) | 【確定】オーナー追加判断(Q2・Q3 を改める) |
| `roundedMangan` | 連動 | 【確定】J1=A |
| `accumlatedYakuman` | 連動(なしなら4行) | 【確定】J2=A |
| `doubleWindFu` | N4(110符1飜)の判定にだけ使う | 【確定】J3・J4=A |
| 場風・その他の状況・ドラ等 | 連動しない(点数表に影響しない) | 設計担当が決定 |

### 2.6 例外

- 本場・供託を常に 0 で渡すため、`calculateTableBonus` の例外(ツモ本場の折半が100点単位にならない設定)は起きない。try/catch・エラー表示は置かない。本場を扱う後日の Issue で再検討する(4章)。

### 2.7 テスト(命名 `H1-<番号>: …`。jsdom 不要)

純関数(`scoring-table.test.ts`)。期待値は 1.4 の出典による。

| ID | 条件 | 期待 |
| --- | --- | --- |
| H1-01 | `cellExists` の全組合せ(11符×4飜×2) | N1〜N3 の欄だけ `na`/`absent`、N4 は J4=A どおり(110符1飜: ツモ `na`、ロンは `doubleWindFu` 4 で `ok`・2 で `absent`。H1-13 不成立時は常に `absent`)、他は `ok` |
| H1-02 | 子・ツモ損あり・本場0 | 30符1飜 ロン1,000 ツモ300・500 / 30符4飜 ロン7,700 ツモ2,000・3,900 / 40符3飜 ロン5,200 ツモ1,300・2,600(四麻表) |
| H1-03 | 親・ツモ損あり・本場0 | 30符1飜 ロン1,500 ツモ500オール / 30符4飜 ロン11,600 ツモ3,900オール(四麻表) |
| H1-04 | 子・北家分折半 | 30符2飜 ツモ 800・1,300(§3.1) |
| H1-05 | 子・ロン打点折半 | 30符4飜 ツモ 3,900オール(§3.1) |
| H1-06 | 満貫表・3方式×親子 | 5飜ツモ: 4,000オール/2,000・4,000、6,000オール/3,000・5,000、6,000オール/4,000オール(§3.1。表記も「オール」で一致すること)。ロンは子8,000・親12,000 |
| H1-10 | `accumlatedYakuman` true/false | 満貫表の行数 5/4、最下行のラベル「13飜以上」/「11飜以上」、最下行のロン(子)32,000/24,000 |
| H1-11 | `roundedMangan` true | 30符4飜・60符3飜が `limit: 'mangan'`、ロン8,000 |
| H1-12 | 20符2飜(子) | ロン `na`、ツモ 400・700 |
| H1-13 | 110符1飜の成立例をコアで確認(J4 の根拠) | `generateResult`(`src/core/result.ts`)等のコアの和了計算に 8章 J4 の手牌(東場東家・暗槓 1111m・9999m、234p、11z 雀頭、55z・5z 双碰で 5z ロン)を渡し、`doubleWindFu: 4` で 110符1飜・ロン 5,300、`doubleWindFu: 2` で 100符(110符にならない)。コアの入力形が合わず確かめられない場合は、テストを置かず本書 5章に「実挙動未確認」と追記して報告する |

画面(`ScoringTableScreen.test.tsx`。`ScoringTableView` に props を渡して `renderToStaticMarkup`。Provider は使わない。既存の `RuleSection` 等の流儀に倣う):

| ID | 内容 |
| --- | --- |
| H1-20 | 題「点数計算表」と戻るボタンが出る |
| H1-21 | `seat` が東で「親」が選択状態、南で「子」。`initialDealer` を渡すとそれが優先される |
| H1-22 | 本場・供託・「本場」「供託」の文字が出ない |
| H1-23 | 文字列に `#` で始まる色指定が無い(CSS は 8 の grep で確認) |

既存テストの更新: `AppHeader.test.tsx` のメニュー項目の並び・アクション対応、`app-state.test.ts` に `navigate` で `'scoring-table'` になるケース1件(H1-30)。

### 2.8 初回 JS(09号)

- 基準値: **127,905 B**(統括担当が最新 origin/main `74841d5` で実測。`dist/assets/index-Bw-4fb70.js`、gzip -9、modulepreload なし。設計担当は再計測していない)。
- 初回 JS の増分の積算(`HeaderMenuItemId` 型への追加は 0 B): メニュー項目の定義(`{type:'item',id:'scoring-table',label:'点数計算表'}`)+40〜60 B、`HEADER_MENU_ACTIONS` の1項目 +30〜40 B、`App.tsx` の `lazy(() => import(...))` 1行と `AppContent` の三分岐化 +80〜150 B(既存の SettingsScreen の lazy 1件と同程度の構造。Vite の動的 import ヘルパーは既存で共有済み)、`Screen` 型は 0 B。合計 **+150〜250 B**。本場・供託の先送り(第3版)は遅延チャンク側だけの縮小で、初回 JS の積算は変わらない。
- **目標値: 初回 JS 128,155 B 以下**(+250 B)。超過は不合格にしない。製造担当の最終報告と PR 本文に 基準値・実測値・増分・積算との差・超過時の量と原因を書く。
- 新規遅延チャンク `ScoringTableScreen-*.js` の見込み: 2〜4 KB(gzip。純関数 +0.6〜1 KB、画面 +1〜1.8 KB、CSS は別ファイル。第3版で本場・供託・例外処理を削ったぶん縮小)。`calculatePayment`・`calculateBasePoint` は `use-result.ts` が compute を遅延 import しているため初回チャンクには無い可能性がある。compute 側の遅延チャンクと共有される見込みだが断定せず、ビルド結果で確認する(6 の 5。共有チャンクの有無とサイズを記録)。`formatPoints`・`formatNumber` も同様に実測で確認する。
- 注意: 純関数を `AppHeader.tsx` 等の初回側から import しないこと(遅延チャンクの外に漏れる)。

## 3. 範囲外

- **点差表示(後日実装)**。livewing の点差は四麻(3人払い・ツモ損なし)前提の式であり、三麻の2人払い・ツモ損3方式・北家分の扱いでは「点差」の定義(直撃とツモで誰との差を指すか、ツモ損分をどう数えるか)が未確定。後日の Issue で定義をヒアリングしてから設計する。
- 現在の和了結果の強調(Q5)。
- **本場・供託の反映(v2 以降に先送り。オーナー追加判断)**。表の値は本場0・供託0の申告額だけを出す。供託は表の値に影響しないため、本場込みの表示と一緒に後日扱う。
- 画面内でのルールの編集。親/子の切替の保存。
- 端末の戻る操作(履歴)への対応。

## 4. 後続への引き継ぎ

- 点差表示を足すときは `Cell` に派生値を足す形にし、`buildFuHanTable` の戻り値を拡張する。
- 本場・供託を足すとき(後日)の論点:
  - 表示案: 申告額を主・本場込みを従の2段表示(例: ロン 1,000→1,200、子ツモ 300・500→400・600)。三麻の既定は1本場あたりロン +200・ツモ各 +100(mahjong-rules.md §3.2)。
  - 375px 幅では各欄が ロン/ツモ×主/従 の4段になり窮屈になる懸念。切替タブ・本場込みのみ表示 等と比較してヒアリングする。
  - 供託は全欄同額なので、欄ではなく見出し部に1回だけ出す案。
  - `calculatePayment` に本場数と `honbaPoint`・`depositPoint` を渡せば `withHonba` が得られる。`calculateTableBonus` の例外(ツモ折半が100点単位にならない設定)は設定経由では到達しない防御だが、純関数で受け止める備えを再検討する。
- H2 以降で画面が増える場合、`AppContent` の分岐が3つを超えたら画面の対応表(`Record<Screen, …>`)化を検討する。

## 5. 実挙動未確認

- N4(110符1飜)の成立例は独立レビューの手計算のみ。コアでの確認は H1-13 で行う。
- 遅延チャンクのサイズ・初回 JS の増分は見積りで、実測していない。
- 375px で表が横スクロールなしに収まるか(11行×4列×2段)は未計測。

## 6. 受け入れ条件

検収担当は上から順に実行する。

1. `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラーなし。
2. `git diff --stat origin/main...HEAD -- src/core` が空。`git diff origin/main...HEAD -- src/ui/state/app-state.ts` の変更が `Screen` 型の1行だけ。
3. `npx vitest run src/ui/scoring-table src/ui/screen/ScoringTableScreen.test.tsx src/ui/screen/AppHeader.test.tsx src/ui/state/app-state.test.ts` の出力に `H1-01`〜`H1-06`・`H1-10`〜`H1-13`(H1-13 はコアで確かめられない場合は無しとし、5章の追記を確認する。H1-07〜H1-09 は第3版で欠番)・`H1-20`〜`H1-23`・`H1-30` が現れ通過する。H1-02〜H1-06 の期待値が 2.7 の表と一致することをテストコードで目視確認する。
4. `grep -rn "scoring-table/\|ScoringTableScreen" src --include='*.ts' --include='*.tsx' | grep -v '\.test\.'` で、`ScoringTableScreen` を参照するのが `App.tsx` の `lazy(() => import(...))` だけで、`scoring-table.ts` を import するのが `ScoringTableScreen.tsx` だけ。
5. 初回 JS: `npm run build` 後、`dist/index.html` の `<script type="module" src>` のファイルを `gzip -9 -c <file> | wc -c` で測り記録(目標 128,155 B、基準 127,905 B)。`ls dist/assets` に `ScoringTableScreen-*.js` があり、その gzip サイズを記録。`calculatePayment` 等が compute 側と共有チャンクになったか(新規の共有チャンクの有無とサイズ)を記録。`grep -c "点数計算表" dist/assets/index-*.js` はメニュー項目の1件だけ(画面本体が初回チャンクに無いことの目安。表の見出し等の画面固有の文言は 0)。超過は不合格にしない。
6. 画面(dev。`npm run dev` を Browser pane で表示し、ペインを表示した状態で行う。`resize_window` で 375×812。他者の dev サーバーを止めない。`pkill` 禁止):
   - (a) ヘッダーメニューに「点数計算表」があり、選ぶと点数計算表の画面に切り替わる。戻るボタンで主画面に戻り、手牌・卓の入力が保たれている。
   - (b) 既定ルールで、主画面で自風を南にしてから開く: 「子」が選択状態。30符1飜 に 1,000 と 300・500、20符 の行のロンが「-」、20符1飜・25符1飜 が空欄、25符2飜 のツモが「-」。
   - (c) 「親」に切り替えると 30符1飜 が 1,500 と 500オール。主画面に戻って再度開くと「子」に戻っている(自風は南のまま)。
   - (d) 満貫以上の表に 5飜/6〜7飜/8〜10飜/11〜12飜/13飜以上 の5行、子の5飜が 8,000 と 2,000・4,000。設定で数え役満を「なし」にすると 「11飜以上」までの4行になる。
   - (e) 設定でツモ損を北家分折半にすると子30符2飜ツモが 800・1,300、ロン打点折半にすると子30符4飜ツモが 3,900オール、子5飜ツモが 4,000オール。
   - (f) 卓で本場1・供託1にしても、子30符1飜 は 1,000 と 300・500 のまま(本場・供託は範囲外)。
   - (h) `document.documentElement.scrollWidth <= 375`(ページの横スクロールなし)。
   - 判定は `get_page_text`・`find`・`read_page` でよい。
7. 本番ビルド: `npm run build && npx vite preview` で 6(a)(b)(d) を再確認し、表の罫線・満貫以上の色分け・横スクロール(CSS)が dev と同じに効いている。遅延チャンクが画面を開いた時点で読み込まれる(`read_network_requests` で `ScoringTableScreen-` を確認)。
8. ダークテーマ: 6(b)(d) をダークで表示し、「-」・数値・満貫以上の色分けが背景に溶けない(目視)。`git diff origin/main...HEAD -- src | grep -E '#[0-9a-fA-F]{3,8}\b'` で新規の HEX が無い。
9. ホームディレクトリ名: `git diff origin/main...HEAD | grep -n "$(basename "$HOME")"` が空(docs も対象)。
10. 起動した dev/preview サーバーは自分で止める(01号)。

## 7. 実機確認(検収後にユーザーが行う。合否に含めない)

- iPhone の PWA で表が読みやすく、横スクロールが表の中だけで効くこと。

## 8. ユーザー判断事項(すべて確定済み。オーナー確定 2026-11-15)

| # | 論点 | 確定 | 根拠・補足 |
| --- | --- | --- | --- |
| J1 | 切り上げ満貫(`roundedMangan`)を表に反映するか | A: 連動(30符4飜・60符3飜が満貫表示) | 卓の結果と一致する |
| J2 | 数え役満なしのときの満貫以上の表の行構成 | A: 4行(5飜/6〜7飜/8〜10飜/11飜以上=三倍満) | livewing は「11飜以上」「役満」の5行にするが採らない |
| J3 | 連風牌の雀頭の符(`doubleWindFu`)の連動 | J4 に従い、110符1飜の判定にだけ使う | — |
| J4 | 110符1飜の欄の扱い | A: livewing どおり(ツモ「-」、ロンは連風牌4符のときだけ値・2符なら欄ごと空欄)。**条件: H1-13 で成立例をコアで確かめられなければ、110符1飜は常に空欄にする** | 成立例(独立レビュー): 東場東家、暗槓 1111m・9999m、234p、雀頭 11z、55z の双碰で 5z ロン、役は役牌白のみ。符 = 20+32+32+4(連風牌雀頭)+4(白の明刻扱い)+10(門前ロン)= 102 → 110符1飜(親ロン 5,300)。`doubleWindFu = 2` では最大100符。ツモは門前ツモが付き常に2飜以上 |
| J7 | メニュー項目の位置 | A: 「設定」の直後(同じ区画) | UI 監修で変更可 |
| 縦軸 | 表の向き | 符が縦(行=符 20〜110、列=1〜4飜、満貫以上は別表) | — |

- 決定済み・不要(参考):
  - 旧 J5(本場込みの併記方法): オーナー判断で本場・供託ごと v2 以降に先送り(3章・4章)。
  - 旧 J6(ツモ本場が割り切れない設定の表示): 本場を常に0で渡すため発生しない(2.6)。
- 設計全体の承認(設計承認ゲート)は、2026-11-15 にオーナーが承認済み。

## 9. UI 監修による変更

(UI 監修のたびに「9.N」として追記する)

- 9.1(2026-11-15): 表のセル・見出し・符の行見出しをすべて中央揃えにし、符の列(左端)を横スクロール時に固定した(オーナー指示)。
- 9.2(2026-11-15): 親/子の切替の下に、ツモ損の方式の表示名(設定画面と同じラベル。「ツモ損あり」等)を表示だけで併記した(オーナー指示。2.3 の「見ればわかる説明書きは置かない」の例外。計算方式は設定により値が変わるため)。純関数 `getTsumoLossLabel` を画面ファイルに置き、テスト H1-25 で確認する。
- 9.3(2026-11-15): 計算方式の表示名をヘッダー右端の小さなラベルに移した(9.2 の位置を変更。オーナー指示)。親/子の切替は、単一のトグルボタンを試したが、セグメントボタン(全幅の2択)に戻した(オーナー指示)。テスト H1-25 を追従。本場ステッパーは範囲外のまま(後日の導入時に配置を再検討する)。

## 10. 製造担当(AGY Gemini Flash)への注意

- `src/core/` を変更しない。点数を自前で計算せず、必ず `calculateBasePoint`・`calculatePayment` を呼ぶ。
- 期待値は 2.7 の表の値をそのまま使う。テストの期待値を実装の出力から写さない。
- 色は MD3 トークンのみ。HEX・tailwind 色・livewing の色名を持ち込まない。
- `ScoringTableScreen` は `export default` にし、`App.tsx` から `lazy` で読む。初回側から静的 import しない。
- jsdom・Testing Library を足さない。
- `AppStateProvider` を変更しない。画面テストは `ScoringTableView` に props を渡して行う。
- 本場・供託・`honbaPoint`・`depositPoint`・`formatPoints` の `withHonba` を扱わない(範囲外)。
- 設計承認(8章の確定事項を含む)を受けてから着手する。H1-13 で成立例を確かめられなかった場合は、110符1飜を常に空欄にし(J4 の条件)、H1-01 の期待値もそれに合わせ、最終報告に明記する。

## 11. コミット粒度案

1. `Screen` 追加・純関数と純関数テスト(H1-01〜H1-06、H1-10〜H1-13、H1-30)
2. 画面・CSS・`App.tsx` の lazy・画面テスト(H1-20〜H1-23)
3. ヘッダーメニュー項目と `AppHeader.test.tsx` の更新

## 12. 改訂履歴

- 第1版(2026-11-15): 新規作成
- 第2版(2026-11-15): 独立レビューの指摘を反映(本場の期待値訂正、到達不能な例外の扱い、`ScoringTableView` の分割、オール表記、チャンク共有の記述、J2・J4 の整理、N1〜N3 の注記、行ラベルの統一)
- 第3版(2026-11-15): オーナー追加判断を反映(本場・供託を v2 以降に先送り、符の範囲 20〜110 を確定、縦軸は符で確認待ち、J5・J6 を整理、テスト・受け入れ条件・バンドル見込みを縮小に合わせた)
- 第4版(2026-11-15): オーナーが J1〜J4・J7・縦軸を推奨どおり確定。8章を確定済みに改め、状態を設計承認待ちにした
- 第4版の承認(2026-11-15): オーナーが設計を承認。状態を承認済みに改めた(内容の変更なし)
