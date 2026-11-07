# Issue #51 D1. 画面の骨格 設計書

- 対象 Issue: [#51 D1. 画面の骨格](https://github.com/BlueKurage119/mj-3player-calc/issues/51)(Epic D)
- 状態: 設計承認済み。5A の9件は推奨どおりで一旦確定(ユーザーの UI 監修で修正する場合がある)
- 本書で決めるもの: 入力状態と計算の呼び出し口、1ページ縦スクロールの骨格、要約カード、結果側の枠(2状態)、非モーダル底部シートの機構、ステッパー部品、ヘッダーと3点リーダーメニュー(`Menu` ラッパー)、手牌カード(シートを開くタップ領域とバケツ)、ギャラリーの DEV 限定化、バンドル予算と牌 SVG の確認
- 本書で決めないもの: 各入力欄の中身(D2〜D5)、結果の中身(Epic E)、設定画面の中身(D6)。7章の線引きを参照

## 1. 参照資料と判断の根拠

### 1.1 参照資料

- `AGENTS.md`、`docs/rules/02`・`05`・`06`・`07`、advisory `G-01`・`G-08`・`G-09`・`G-10`・`C-01`・`C-02`
- Issue #51 のヒアリング(確定記録。確定事項 1〜13 と設計への申し送り)
- `docs/requirements.md` §3.1〜3.3・§4、`docs/issues-draft.md` Epic D、`docs/mahjong-rules.md`
- 既存設計書: `issue-12`(北・抜き北)、`issue-14`(ローカル役)、`issue-29`・`issue-30`(ルール項目・保存)、`issue-32`(結果の支払い)、`issue-39`(テーマ・ちらつき)、`issue-40`(md ラッパー・予算 2.7)、`issue-41`(牌画像・ギャラリー)
- 現状コード: `src/ui/App.tsx`・`app-mode.ts`・`md/`・`expressive/`・`tile/`・`theme/`、`src/core/input.ts`・`result.ts`・`table.ts`・`rule.ts`・`rule-storage.ts`、`src/main.tsx`、`vite.config.ts`、`package.json`
- 参照実装(読むだけ): `../ref-repo/mahjong-calc/src`(store・Calculator・AppContent の lazy。MIT)、`../ref-repo/mj-mighty-calc/src`(App.tsx の手牌カード・バケツ・Tenkey。ライセンスは `docs/license-policy.md` に従い、本 Issue ではコードを取り込まず配置の発想だけを参考にする)

### 1.2 確定事項(Issue #51 のヒアリング。再検討しない)

| # | 確定事項 | 本書での反映 |
| --- | --- | --- |
| 1 | 和了牌=手牌の最後の牌 / タップ領域 48dp 以上 / 入力後 100ms 以内に表示(F3 は対象外)。入力部は底部シート | 2.9・2.6・5章 |
| 2 | `useReducer` + Context。状態 `{ screen, rule, table, input, inputFocus, handOptions }`。計算は `useMemo` で1か所、例外は結果側のエラー状態。`rule` は起動時 `loadRule`(try で囲む)。保存の接続は D6 | 2.2・2.3 |
| 3 | ギャラリー2種は `import.meta.env.DEV` のときだけ有効。既存ファイルは削除しない | 2.10 |
| 4 | 要約カードで `Tile` を使うため牌 SVG 30 件の出力・precache を D1 で確認 | 5章 条件 13 |
| 5 | 結果側は枠のみ(中身は Epic E) | 2.7 |
| 6 | 1ページ縦スクロール、入力側の下に結果側。要約カードは sticky 固定。結果側はバナー⇄展開の2状態(IntersectionObserver、M3 Expressive モーション、連続拡大なし)。シートは非モーダル。シート中は要約カードに結果1行の枠。広い画面は中央寄せ最大幅。画面遷移は main/settings の2値でルータなし | 2.4〜2.7 |
| 7 | ツモ・ロンは入力なし。結果側に併記(コアが `by` 別に返す) | 2.7(枠のみ) |
| 8 | ステッパー: ±1、積み棒・供託 0〜99、抜き北 0〜4、北が役牌のルールで抜き北は無効 | 2.8 |
| 9 | 牌タップでの削除は不採用。手牌カード全体がシートを開く 48dp 以上のタップ領域 | 2.9 |
| 10 | 手牌カード内にバケツ(手牌クリア、確認なし) | 2.9 |
| 11 | ヘッダーはタイトル+3点リーダーメニュー(設定→区切り線→オールクリア)。オールクリアは確認なし・Undo なし、対象は手牌・副露・ドラ・裏ドラ・抜き北・状況役。風・積み棒・供託は残す。`md-menu` ラッパーを `src/ui/md` に追加 | 2.3・2.5 |
| 12 | バンドル予算 102,000 B 維持。計算部を `lazy` 分離。超過時は G-09 | 2.11・5章 条件 12 |
| 13 | 底部シート機構(開閉・フォーカス・Esc/戻る・safe-area・下余白・中身スロット)は D1 | 2.6 |

### 1.3 設計担当の判断と根拠

- **計算部の遅延読み込みは「モジュールを動的 import し、関数が届いたら `useMemo` で同期計算」とする。** `generateResult` は WASM の分解器(`src/core/tile/shanten.ts` が `decomposer` を import)に依存し、初回 JS に入れると予算を圧迫する。`useMemo` は同期でしか使えないため、起動時に `import('../calc/compute')` を1回だけ実行し、得た関数を state 外の ref ではなく `useState` に保持して `useMemo` の依存に入れる。届くまでは結果側を「読み込み中」状態にする。mahjong-calc の AppContent が計算部を lazy にしている構成に倣う。
- **裏ドラは状態として `dora` と分けて持つ(`uradora: Tile[]`)。** 計算コアの `Input` は表裏をまとめて `dora` で受ける(issues-draft D4)。D1 の状態は D4 のカード2枚に対応させるため `AppInput = Input & { uradora: Tile[] }` とし、計算呼び出し時に `dora: [...dora, ...uradora]` で結合する。オールクリアの対象に裏ドラが明示されているため、状態で区別しておく必要がある。
- **`inputFocus` は core の `InputFocus` を拡張せず UI 側で定義する。** core の型(`hand`・`dora`・`meld`)には裏ドラと状況役が無い。シートの中身の切替は UI の関心なので `src/ui/state` に `SheetTarget` を置き、`inputFocus: SheetTarget | null`(null=シート閉)とする。core の `InputFocus` は変更しない。
- **底部シートとステッパーは `src/ui/expressive/` に自作する。** Material Web 2.5.0 に bottom sheet とステッパーは無い(06号4項)。メニューは `md-menu` があるため `src/ui/md/Menu.tsx` でラップする(06号3項)。
- **ステッパーの境界はコンポーネントでなく reducer で守る。** 表示側は `min`・`max` でボタンを無効化するが、値のクランプは reducer で行い単体テストで確かめる(二重防御、表示の不具合で範囲外の値が core に渡らない)。

## 2. 設計

### 2.1 モジュール構成

| パス | 新規/変更 | 内容 |
| --- | --- | --- |
| `src/ui/state/app-state.ts` | 新規 | 状態型・アクション型・`appReducer`・`createInitialState` |
| `src/ui/state/app-state.test.ts` | 新規 | reducer の単体テスト(5章 条件 6〜9) |
| `src/ui/state/AppStateProvider.tsx` | 新規 | `useReducer` + Context、`useAppState()`・`useAppDispatch()` |
| `src/ui/state/index.ts` | 新規 | バレル |
| `src/ui/calc/compute.ts` | 新規 | 計算部(動的 import 先)。`computeResult` |
| `src/ui/calc/use-result.ts` | 新規 | 動的 import と `useMemo` の1か所 |
| `src/ui/calc/result-state.ts`・`*.test.ts` | 新規 | `evaluateResult`(純関数)と、`computeResult`・`evaluateResult` のテスト |
| `src/ui/expressive/Stepper.tsx`・`stepper.css` | 新規 | ステッパー部品 |
| `src/ui/expressive/BottomSheet.tsx`・`bottom-sheet.css` | 新規 | 非モーダル底部シート |
| `src/ui/expressive/index.ts` | 変更 | 上記2つを export |
| `src/ui/md/Menu.tsx` | 新規 | `md-menu`・`md-menu-item` のラッパー(`Menu`・`MenuItem`) |
| `src/ui/md/index.ts` | 変更 | `Menu`・`MenuItem` を export |
| `src/ui/md/MdGallery.tsx` | 変更 | `Menu` の見本を追記(既存の見本は消さない) |
| `src/ui/screen/MainScreen.tsx`・`main-screen.css` | 新規 | 1ページ骨格(入力側・結果側・シート配置) |
| `src/ui/screen/AppHeader.tsx` | 新規 | タイトル+3点リーダーメニュー |
| `src/ui/screen/SummaryCard.tsx` | 新規 | 要約カード(sticky) |
| `src/ui/screen/HandCard.tsx` | 新規 | 手牌カード(タップ領域+バケツ) |
| `src/ui/screen/ResultPanel.tsx` | 新規 | 結果側の枠(バナー⇄展開) |
| `src/ui/screen/SettingsScreen.tsx` | 新規 | D6 用の置き場(戻るボタンのみ) |
| `src/ui/screen/use-in-view.ts` | 新規 | IntersectionObserver の小フック |
| `src/ui/App.tsx` | 変更 | ギャラリー分岐を DEV 限定にし、`AppStateProvider` で `MainScreen`/`SettingsScreen` を出し分け |
| `src/ui/app-mode.ts`・テスト | 変更 | `isGalleryEnabled(isDev: boolean)` を追加(判定関数を純粋に保つため `import.meta.env.DEV` は `App.tsx` 側で渡す) |

ファイル名・内部分割は製造担当が整えてよい(本表の責務分担は守る)。生の `<md-*>` は `src/ui/md/` 配下だけに書く。

### 2.2 状態型(`src/ui/state/app-state.ts`)

```ts
export type Screen = 'main' | 'settings';
export type SheetTarget =
  | { type: 'hand' }
  | { type: 'dora' }
  | { type: 'uradora' }
  | { type: 'meld'; i: number }
  | { type: 'situation' };
export type AppInput = Input & { uradora: Tile[] };
export interface AppState {
  screen: Screen;
  rule: Rule;
  table: Table;
  input: AppInput;
  inputFocus: SheetTarget | null; // null = シートを閉じている
  handOptions: HandOptions;
}
export type AppAction =
  | { type: 'navigate'; screen: Screen }
  | { type: 'open-sheet'; target: SheetTarget }
  | { type: 'close-sheet' }
  | { type: 'step'; field: 'continue' | 'deposit' | 'nuki'; delta: 1 | -1 }
  | { type: 'clear-hand' }
  | { type: 'clear-all' }
  | { type: 'set-rule'; rule: Rule }; // D6 が使う。D1 では reducer とテストのみ
export const STEPPER_BOUNDS = { continue: [0, 99], deposit: [0, 99], nuki: [0, 4] } as const;
export const createInitialState = (rule: Rule): AppState;
export const appReducer: (state: AppState, action: AppAction) => AppState;
export const isNukiEnabled = (rule: Rule): boolean; // rule.north !== 'yakuhai'
```

- 積み棒・供託の上限 99 は UI 側の制約(出典: Issue #51 のヒアリング 確定事項8)。コアの `Table` は「0以上の整数」しか要求しない(`src/core/table.ts`)。
- 初期値: `table = { round: 'east', seat: 'east', continue: 0, deposit: 0 }`、`input = { hand: [], melds: [], dora: [], uradora: [], nuki: 0 }`、`handOptions` は全 false・`riichi: 'none'`、`screen: 'main'`、`inputFocus: null`。
- `rule` の初期化: `AppStateProvider` で `loadRule(safeLocalStorage())` を1回だけ呼ぶ(`useReducer` の初期化関数)。`safeLocalStorage()` は `window.localStorage` の参照自体を try で囲み、例外時は `null` を返す(`loadRule(null)` は既定ルール)。`loadRule` の戻り値は `LoadedRule`(`{ rule, issues, reset, resetReason, found }`)で、状態には `.rule` だけを入れる。`issues`・`reset`・`resetReason` は D1 では表示に使わず破棄する(利用者への通知は D6 の範囲。D6 は自分で `loadRule` を呼び直すか、Provider に `loaded` を保持させる形を D6 で決める)。`saveRule` は呼ばない(D6)。
- `step`: 範囲外になる操作は状態を変えない(同じ参照を返す)。`nuki` は `isNukiEnabled(state.rule)` が false のとき状態を変えない。
- `clear-hand`: `input.hand` だけを `[]` にする。
- `clear-all`: `input` を初期値に、`handOptions` を初期値にする。`table`(風・積み棒・供託)・`rule`・`screen` は残す。`inputFocus` は `null` にする(シートを閉じる)【確定】。
- `set-rule`: 新ルールで `isNukiEnabled` が false になったら `input.nuki` を 0 にする【確定】。
- D2〜D5 が手牌・副露・ドラ・状況役を書き換えるアクションは各 Issue で追加する(本書では定義しない)。

### 2.3 計算の呼び出し口

```ts
// src/ui/calc/compute.ts
export const computeResult = (s: Pick<AppState, 'table' | 'input' | 'handOptions' | 'rule'>): Result =>
  generateResult(s.table, { ...s.input, dora: [...s.input.dora, ...s.input.uradora] }, s.handOptions, s.rule);
// uradora キーは generateResult に渡す前に取り除く

// src/ui/calc/use-result.ts
export type ResultState =
  | { status: 'loading' }
  | { status: 'ok'; result: Result }
  | { status: 'error'; error: unknown };
export const useResult = (): ResultState;

// src/ui/calc/result-state.ts(純関数。useResult の判定部)
export type ComputeFn = typeof computeResult;
export const evaluateResult = (
  compute: ComputeFn | null,      // null = 計算部の読み込み前
  loadError: unknown | null,      // 動的 import の失敗
  s: Pick<AppState, 'table' | 'input' | 'handOptions' | 'rule'>
): ResultState;
// loadError があれば error、compute が null なら loading、
// compute が例外を投げたら error、それ以外は ok(result は null もあり得る)
```

- `useResult` は `useMemo(() => evaluateResult(compute, loadError, s), [...])` を呼ぶだけにし、判定は `evaluateResult` に集める。React のテスト基盤(`@testing-library/*`・`jsdom`・`happy-dom`)は `package.json` に無いため、フックではなく `evaluateResult` を単体テストする。
- `useResult` は `useEffect` で `import('./compute')` を1回だけ実行し、`computeResult` を `useState` に入れる。`useMemo` の依存は `[compute, table, input, handOptions, rule]`。`try/catch` で `RuleValidationError` を含む全例外を `{ status: 'error' }` にする。
- `useResult` を呼ぶのは `MainScreen` の1か所だけで、結果は props で `ResultPanel`・`SummaryCard` に渡す(計算の重複を防ぐ)。
- 動的 import の失敗(オフライン初回等)も `error` にする。

### 2.4 画面骨格とスクロール

```
<AppHeader/>                          … 通常フロー(固定しない)
<main class="main-screen">            … max-width で中央寄せ
  <section 入力側>
    [風セグメントの枠] [ステッパー3つ] [ドラ・裏ドラの枠] <HandCard/> [副露の枠] [状況役の枠]
  </section>
  <SummaryCard/>                       … sticky top:0
  <ResultPanel/>
  <div 下余白 height=var(--sheet-height)/>
</main>
<BottomSheet/>                         … position: fixed
```

- 「枠」は D4・D5 が中身を入れる置き場(空の `div` に `data-slot` を付けるだけ。見ればわかるラベルは書かない)。ステッパー3つは D1 で実際に動く状態で置く(積み棒・供託・抜き北)。
- 要約カードの固定: `SummaryCard` を入力側と結果側の間に置き `position: sticky; top: 0`。入力側の先頭に番兵要素を置き、`use-in-view` で番兵が画面外になったときだけ要約カードを表示する(表示中でない間は `display: none` ではなく高さ 0 にして、レイアウトの跳ねを避ける)。sticky と IntersectionObserver の組み合わせは**実挙動未確認**。
- 最大幅: `main-screen` に `max-width: 600px; margin-inline: auto`【確定】(MD3 の compact〜medium 境界 600dp に合わせる。長さはトークンが無いので CSS 変数 `--app-max-width` に1回だけ定義)。
- 下余白: `BottomSheet` が `ResizeObserver` で自分の高さを測り、`document.documentElement` に `--sheet-height` を設定する。閉じているときは `0px`。これで入力側下部・結果側をスクロールで見られる。
- `screen === 'settings'` のときは `SettingsScreen` だけを出す(`MainScreen` はアンマウント。状態は Context にあるので失われない)。画面の切替は履歴に積まない(`history.pushState` を使わない)。メインに戻る手段は `SettingsScreen` 内の戻るボタンだけ(Issue #51 のヒアリングで確定: 履歴には介入しない)。

### 2.5 ヘッダーとメニュー

- `AppHeader`: 左にタイトル「三麻点数計算機」、右に `IconButton`(3点リーダー、`aria-label="メニュー"`)。押すと `Menu` を開く。
- メニュー項目の並び: 「設定」→ `Divider` → 「オールクリア」。
  - 設定: `dispatch({ type: 'navigate', screen: 'settings' })`
  - オールクリア: `dispatch({ type: 'clear-all' })`。確認・Undo・スナックバーなし。
- `src/ui/md/Menu.tsx`:
  ```ts
  export interface MenuProps { open: boolean; anchor: RefObject<HTMLElement | null>; onClose: () => void; children: ReactNode; }
  export interface MenuItemProps { onSelect: () => void; disabled?: boolean; children: ReactNode; }
  ```
  - `MdMenu`・`MdMenuItem` をクラス参照で登録(bare import 禁止、issue-40 の方式)。`open`・`anchorElement` は `useLayoutEffect` で代入。閉じた通知は **`closing` イベント**で `onClose` を呼ぶ(C-01: `closed` は Browser pane で発火しない事例があるため、完了イベントに依存しない)。
  - `md-menu` の `positioning` は `'popover'`(設計担当の判断。実装の細部のためヒアリング対象外。sticky や overflow の親に切られないため)。2.5.0 での挙動は**実挙動未確認**。製造担当は MdGallery に置いた見本で開閉・Esc・項目選択で閉じることを確認する。

### 2.6 非モーダル底部シート(`src/ui/expressive/BottomSheet.tsx`)

```ts
export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  'aria-label': string;
  children: ReactNode; // 中身スロット(D2・D3・D5)
}
```

- スクリムなし・背面操作可(`role="region"` 相当、`aria-modal` を付けない)。`position: fixed; inset-inline: 0; bottom: 0`、幅は `--app-max-width` で中央寄せ。
- 高さ上限: `max-height: 50dvh`【確定】、中身は内部スクロール。下端に `padding-bottom: env(safe-area-inset-bottom)`。
- 上端にドラッグハンドル風の閉じるボタン(48dp 以上、`aria-label="閉じる"`)。ドラッグでの開閉は D1 では実装しない【確定】。
- フォーカス: 開いたらシート先頭にフォーカスを移し、閉じたら開いた元の要素(手牌カード等)へ戻す。フォーカストラップはしない(非モーダルのため)。
- Esc: シートが開いているとき `keydown` の `Escape` で `onClose`。
- 履歴には介入しない(確定): 開くときに `history.pushState` しない。`popstate` を購読しない。Android の戻る・ブラウザの戻るでシートは閉じない(通常のページ遷移になる)。
- シート外操作【確定】: シート外のタップ・スクロールではシートを閉じない。理由: 非モーダル(確定事項6・13)の目的は、シートを開いたままステッパー等の背面を操作する連続入力であり、シート外タップで閉じると背面操作のたびにシートが消えてその目的に反する。閉じる手段は閉じるボタンと Esc の2つに限る。
- 開閉モーション: `transform: translateY` を `--md-sys-motion-spring-*` で遷移。`prefers-reduced-motion` は MD3 のテーマ側方針に従い遷移を無くす。
- シートの中身切替は `inputFocus.type` で `MainScreen` が決める。D1 では中身として空の枠(`data-slot="sheet-hand"` 等)を出す。
- シートが開いている間、`SummaryCard` に結果1行の枠(`data-slot="summary-result"`)を表示する。中身は Epic E。

### 2.7 結果側の枠(`ResultPanel`)

- 2状態: `banner`(バナー程度の小カード) / `expanded`(展開)。結果側の上端の番兵が画面に入ったら `expanded`、出たら `banner`。しきい値は `rootMargin: '0px 0px -30% 0px'`【確定】。連続拡大はしない。
- 状態の切替時に高さ・角丸を M3 Expressive のモーショントークン(`--md-sys-motion-spring-*`、形状は `--md-sys-shape-*`)で遷移させる。
- 表示する中身(D1 の範囲): `ResultState` に応じて次の4通り。ツモ・ロン併記などの中身は Epic E。
  - `loading`: 読み込み中の表示(進捗インジケータ相当、文言なし)
  - `error`: 「計算できません」の1行
  - `ok` かつ `result === null`: 何も結果を出さない空の枠(`data-state="empty"`)。`Result` は `null` を取り得る(`src/core/result.ts` の `Result` 型。手牌が空=初期状態はここに該当)
  - `ok` かつ `result !== null`: `result.type` を表示するだけの仮表示
- 段階5の時点では計算部が未接続のため、`ResultPanel` には `{ status: 'loading' }` 固定の仮値を渡す。段階6で `useResult` に置き換える。
- `banner` 状態のタップで結果側までスクロールする【確定】。

### 2.12 計測用の仕組み(100ms)

- `MainScreen` に DEV 限定の計測を製造段階6で入れる: `if (import.meta.env.DEV)` の内側で、dispatch 直前に `performance.now()` を記録し、結果を描画した `ResultPanel` の `useLayoutEffect` で差を `console.debug('[d1-latency]', ms)` に出す。本番ビルドからは静的に除去される。
- 理由: 検収担当はコードを修正しない(AGENTS.md §4.2)ため、計測コードは製造で入れておく必要がある。rAF・アニメーション完了に依存しないので Browser pane が hidden でも測れる(C-01)。

### 2.8 ステッパー(`src/ui/expressive/Stepper.tsx`)

```ts
export interface StepperProps {
  value: number;
  min: number;
  max: number;
  onStep: (delta: 1 | -1) => void;
  disabled?: boolean;
  'aria-label': string; // 「積み棒」「供託」「抜き北」
}
```

- 構成: −ボタン・値・+ボタン。各ボタンは `IconButton` で 48dp 以上。値は `tabular-nums`。`value <= min` で −、`value >= max` で + を無効化。`disabled` のとき両方無効。
- 値の要素は `aria-live="polite"`。
- 抜き北のステッパーは `disabled={!isNukiEnabled(rule)}`。

### 2.9 手牌カード(`HandCard`)

- カード全体が1つのボタン(`role="button"`、`tabIndex=0`、Enter/Space で開く)。押すと `open-sheet { type: 'hand' }`。高さ 48dp 以上。
- 牌列: `input.hand` を `Tile`(`onClick` なし=非ボタン)で並べる。牌のタップで削除しない。和了牌は手牌の最後の牌(D2 が見せ方を決める)。
- バケツの配置【確定、A 案(UI 監修で修正する場合がある)】:

| 案 | 配置 | 牌幅(328dp・14枚) | カード高さ | 備考 |
| --- | --- | --- | --- | --- |
| A | カード右上の別段(上段にバケツ、下段に牌列全幅) | 約23dp | 上段 48dp ぶん高くなる | 牌の視認性を優先 |
| B | 牌列の右に並べる | 約19dp | 低い | 牌が小さく、バケツと牌列が隣接 |

- バケツ: `IconButton`(48dp 以上、`aria-label="手牌をクリア"`)。`onClick` で `event.stopPropagation()` してから `clear-hand`。手牌が空のとき `disabled`。カード本体のタップ領域との間に 8dp 以上の余白(デッドゾーン)を置き、その余白はカードのタップに反応しない(バケツの段はカードのボタン要素の外に置く構造にする)。
- 入れ子のボタン(button 内 button)は作らない。カードの外枠 `div` の中に「牌列ボタン」と「バケツ段」を兄弟で置く。

### 2.10 ギャラリーの DEV 限定化

- `App.tsx` で `isGalleryEnabled(import.meta.env.DEV)` が true のときだけ `?gallery=tiles`・`?gallery=md` を評価する。lazy import は `if (import.meta.env.DEV)` の分岐の内側で定義し、本番ビルドで静的に除去されるようにする。
- `TileGallery.tsx`・`MdGallery.tsx`・`isTileGalleryMode`・`isMdGalleryMode` は削除しない。

### 2.11 バンドル予算

- 初回 JS(`dist/index.html` の `<script type="module" src>` と `<link rel="modulepreload" href>` が指す JS の gzip 合計) ≤ 102,000 B(issue-40 §2.7 の測り方)。
- 初回 JS に計算部(`generateResult`・`decomposer` の glue)を含めない。WASM ファイルと計算部チャンクは別ファイルで出力され、precache に入る。
- 本設計時点で D1 構成の実測はできていない(作業ツリーに `wasm/decomposer/pkg` が無くビルド不可)。**実挙動未確認**。製造段階6で実測し、超過したら G-09 に従い意図しない取り込み(`@material/web` の全量、`Tile` の SVG URL 群、core の静的 import)を先に調べ、結果を統括担当に報告する(予算の変更は本書の範囲外)。

## 3. 製造の段階化(コミット単位)

各段階のコミット前に `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` を通す。段階6のみ `npm run build:wasm` と `npm run build` も実行する。

| 段階 | コミット内容 | 依存 | 確認方法 |
| --- | --- | --- | --- |
| 1 | `src/ui/state/`(型・reducer・Provider・テスト) | なし | `npx vitest run src/ui/state` |
| 2 | `Stepper`(expressive に追加、export) | 1 不要 | 4コマンド。MdGallery 等への見本追加は任意 |
| 3 | `Menu`・`MenuItem` ラッパー、バレル、MdGallery に見本 | なし | 4コマンド。`?gallery=md` で開閉を目視 |
| 4 | `BottomSheet`(expressive) | なし | 4コマンド |
| 5 | `src/ui/screen/` 一式、`App.tsx` の差し替え、ギャラリー DEV 限定化、`app-mode.ts` の追加関数とテスト。`ResultPanel` には `{ status: 'loading' }` 固定の仮値 | 1〜4 | 4コマンド。dev で画面骨格を目視 |
| 6 | `src/ui/calc/`(lazy 分離・`evaluateResult` とテスト)、`MainScreen` から接続、2.12 の計測 | 5 | 4コマンド+`build:wasm`・`build`。5章 条件 10・11(a)・12・13・14 を製造担当が実測して最終報告に書く |

`build:wasm` には Rust と wasm-pack が必要(段階6・5章 条件1・5・12〜14の前提)。

規模の見込み: 新規 約18ファイル、変更 約5ファイル、合計 1,000〜1,400 行(テスト含む)。

## 4. 実挙動未確認の一覧

- `md-menu`(2.5.0)の `positioning: 'popover'`・`closing` イベント・アンカー指定の挙動
- `position: sticky` と IntersectionObserver の組み合わせ(要約カードの出し入れ、結果側の2状態切替)のちらつき・誤判定
- 計算部の lazy 分離後の実バンドル(初回 JS の gzip、WASM 初期化のタイミング、チャンク分割)
- 底部シートの `dvh`・`safe-area-inset-bottom`(iOS Safari・Android Chrome)
- 初回描画のちらつき(issue-39)が D1 の画面で目立つか
- 100ms の実機での達成(Browser pane は hidden のため rAF・アニメーションが進まない。C-01)

## 5. 受け入れ条件

各項目「手順 → 合格の見え方」。Browser pane での確認は `npm run dev` を G-02 に従い起動し、終了後に停止する。

前提: 条件1・5・12〜14 は `npm run build:wasm` を要し、Rust と wasm-pack が必要。

1. **静的検査**: `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test`・`npm run build`(事前に `npm run build:wasm`)がすべてエラーなしで終わる。
2. **生タグの位置**: `grep -rn "<md-" src --include=*.tsx | grep -v "^src/ui/md/"` の出力が空。
3. **HEX 直書きなし**: `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/ui/screen src/ui/state src/ui/calc src/ui/expressive/Stepper.tsx src/ui/expressive/BottomSheet.tsx src/ui/expressive/*.css src/ui/screen/*.css src/ui/md/Menu.tsx` の出力が空。
4. **bare import なし**: `grep -rnE "^import '[^']+'" src/ui src/main.tsx | grep -v "\.css'"` の出力が空(設計時に現行コードで実行し、空であることを確認済み)。
5. **ギャラリーが本番に含まれない**: `npm run build` 後 `grep -lE "TileGallery|MdGallery|isTileGalleryMode|isMdGalleryMode|tile-gallery|md-gallery" dist/assets/*.js` の出力が空。加えて `ls dist/assets | grep -iE "TileGallery|MdGallery"` も空。(製造担当は、ギャラリーのコンポーネントに上記いずれかの識別子が残る形にしておく。minify で関数名が消える場合に備え、ルート要素のクラス名 `tile-gallery`・`md-gallery` を付ける。)dev で `?gallery=tiles`・`?gallery=md` を開くと従来どおり表示される。
6. **reducer: ステッパー境界**(単体テスト): `continue`・`deposit` が 0 で −1 しても 0 のまま(同じ参照)、99 で +1 しても 99。`nuki` が 0 で −1 は 0、4 で +1 は 4。`rule.north === 'yakuhai'` のとき `nuki` の +1 は状態不変。各境界の内側(1→0、98→99、3→4)は変化する。`npx vitest run src/ui/state` で全件通過。
7. **reducer: オールクリア**(単体テスト): 手牌・副露・ドラ・裏ドラ・抜き北・状況役に値を入れ、`table` を `{ round: 'south', seat: 'west', continue: 3, deposit: 2 }` にした状態で `clear-all` → `input` と `handOptions` が初期値、`table` は元のまま、`rule`・`screen` は不変。
8. **reducer: 手牌クリア**: `clear-hand` で `input.hand` だけが `[]` になり、他は不変。
9. **reducer: 画面遷移・シート**: `navigate` で `screen` が切り替わる。`open-sheet`/`close-sheet` で `inputFocus` が対象/`null` になる。`createInitialState` の各初期値が 2.2 のとおり。
10. **計算の呼び出し口**(単体テスト。React のテスト基盤は `package.json` に無いのでフックは直接テストしない): (a) `computeResult` で、`dora: [A]`・`uradora: [B]` の状態から `generateResult` に `dora: [A, B]` が渡り、`uradora` キーが渡らない(`vi.mock` で確認)。(b) `evaluateResult` が、`loadError` ありで `error`、`compute === null` で `loading`、例外を投げる `compute` で `error`、`null` を返す `compute` で `{ status: 'ok', result: null }`、値を返す `compute` で `ok` を返す。`npx vitest run src/ui/calc` で全件通過。
11. **100ms**: (a) `src/ui/calc` のテストで、代表牌姿(和了形1・聴牌形1・一向聴以上1、各14枚)の `computeResult` を各10回実行し最大値 ≤ 100ms(Node 上、WASM 初期化後)。(b) dev の Browser pane で、ステッパーの + を5回押し、console の `[d1-latency]`(2.12 の DEV 限定計測)の値がすべて ≤ 100。rAF・アニメーション完了に依存しない。実機での体感は C-02 の逆発注項目とする。
11a. **空の手牌で落ちない**: dev で初期状態(手牌が空)のまま画面を開き、console にエラーが無く、結果側が `data-state="empty"` の枠を表示する。
12. **バンドル予算**: `npm run build` 後、`dist/index.html` が参照する初回 JS(`<script type="module" src>`・`<link rel="modulepreload" href>`)をそれぞれ `gzip -9 -c <file> | wc -c` で測り合計 ≤ 102,000。初回 JS に `generateResult` 由来のチャンクと `.wasm` の参照が含まれない(計算部が別チャンクで存在し、そのサイズを記録)。
13. **牌 SVG**: `ls dist/assets/*.svg | wc -l` が 30 以上で、牌 SVG 30 種(`src/ui/tile/assets` のファイル名に対応)が出力されている。`dist/sw.js`(または生成された precache マニフェスト)に 30 種すべての URL が含まれる。
14. **計算部と WASM の precache**: `dist/sw.js` に計算部チャンクと `.wasm` の URL が含まれる。
15. **画面骨格の並び**(dev、Browser pane、幅 360px): 上からヘッダー → 入力側(ステッパー3つ、手牌カード等の枠)→ 結果側。幅 1024px でメイン領域の幅が `--app-max-width` 以下で左右中央にある(`getBoundingClientRect` で左右の余白差 ≤ 1px)。
16. **タップ領域**: 手牌カード・バケツ・ステッパーの±・メニューボタン・シートの閉じるボタン・メニュー項目の `getBoundingClientRect` の幅・高さがいずれも ≥ 48。
17. **メニュー**: 3点リーダーを押すとメニューが開き、項目が上から「設定」・区切り線・「オールクリア」の順。「設定」で設定画面に切り替わり、戻るボタンでメイン画面に戻る。「オールクリア」は確認ダイアログを出さずに実行される。D1 の画面で値を入れられるのはステッパー(積み棒・供託・抜き北)だけなので、画面での確認範囲は「積み棒2・供託1・抜き北3 にしてオールクリア → 抜き北が 0、積み棒2・供託1 のまま、場風・自風の初期値も不変」に限る。手牌・副露・ドラ・裏ドラ・状況役のリセットは reducer テスト(条件7)で担保する。
18. **ステッパー表示**: 積み棒を 0 にすると − が無効、99 で + が無効(dev で 99 回押す代わりに reducer テスト 6 で担保し、画面では 0 の無効と 1 回の増減を確認)。北を役牌にしたルール: Browser pane の console で `localStorage.setItem('mj3calc.rule', JSON.stringify({ version: 1, rule: { north: 'yakuhai' } }))` を実行してリロードすると、抜き北のステッパーの −・+ がどちらも無効(他の項目は `loadRule` が既定値で補完する。`src/core/rule-storage.ts` の `RULE_STORAGE_KEY`・`RULE_STORAGE_VERSION`・`restoreRule` の形式)。確認後 `localStorage.removeItem('mj3calc.rule')` で戻す。
19. **手牌カードとバケツ**: 手牌カードを押すと底部シートが開く。手牌が空のときバケツは無効(`disabled`)。バケツの押下でシートが開かない(テストまたは dev で、手牌を reducer 経由で入れられない D1 時点では「無効時に押してもシートが開かない」ことと、`stopPropagation` の実装をコードで確認)。バケツとカードのボタン領域の間に 8px 以上の隙間がある(矩形の差で確認)。
20. **底部シート**: 開くとスクリムが無く、背面のステッパーが押せる。シートの高さ ≤ `innerHeight × 0.5`(1px 誤差)。開いている間、ページ末尾の下余白がシート高と等しく、結果側を最後までスクロールで見られる。Esc で閉じ、フォーカスが手牌カードに戻る。閉じるボタンで閉じる。シートを開いたまま背面のステッパーを押してもシートは閉じない。シートを開いた後の `history.length` が開く前と同じ(履歴に積まない)。
21. **要約カード**: 入力側の先頭がスクロールで画面外に出ると要約カードが上端(`top` = 0±1px)に固定表示され、戻すと隠れる。シートを開いている間、要約カードに結果1行の枠(`data-slot="summary-result"`)が存在する。
22. **結果側の2状態**: 結果側が画面外のときバナー状態、スクロールして結果側の上端が画面の 70% より上に来ると展開状態になる(クラスまたは `data-state` で確認)。モーションの見た目は C-02 の逆発注項目。
23. **実機逆発注(C-02)**: 次をユーザーに逆発注する手順を最終報告に書く — iOS Safari / Android Chrome でのシートの safe-area・高さ、要約カード固定時のちらつき、結果側の切替モーション、初回描画のちらつき、入力から表示までの体感速度。

## 5A. 一旦確定した設計判断の一覧(UI 監修で修正する場合がある)

| # | 論点 | 確定した案 | 別案 | 得失 |
| --- | --- | --- | --- | --- |
| 1 | バケツの配置(2.9) | A: カード右上の別段 | B: 牌列の右 | A は牌約23dpを保つがカードが約48dp高い。B は低いが牌約19dp |
| 2 | 最大幅(2.4) | 600px | 840px 等 | 600 は片手幅に近く読みやすい。広くすると横の余白が減る |
| 3 | シート高の上限(2.6) | 50dvh | 40%・60% | 低いほど背面が見え、高いほど中身が収まる |
| 4 | 結果側の展開しきい値(2.7) | `rootMargin: 0px 0px -30% 0px` | 別の位置 | 早すぎると入力中に展開して視線が散る |
| 5 | シート外操作(2.6) | シート外タップで閉じない | 閉じる | 閉じないと背面の連続入力ができる。閉じると操作は一般的だが連続入力が途切れる |
| 6 | オールクリア時にシートを閉じる(2.2) | 閉じる | 開いたまま | 閉じると全体を見直せる。開いたままだと続けて入力できる |
| 7 | 北=役牌への変更で抜き北を0に戻す(2.2) | 戻す | 残す | 戻すと無効な値が残らない。残すと再変更で復元できる |
| 8 | バナーのタップで結果側へスクロール(2.7) | する | しない | するとバナーが入口になる。しないと誤タップの移動が無い |
| 9 | シートのドラッグ開閉(2.6) | D1 に含めない | 含める | 含めると規模が増え、実機確認も増える |

確定(一覧から除外): シート・設定画面の切替は履歴に介入しない(Issue #51 のヒアリング)。

## 6. 後続 Issue への引き継ぎ

- **D2**: シート中身(`data-slot="sheet-hand"`)にパレット。手牌の1行表示・並べ替え、シート内 AC(`clear-hand` を再利用)。**牌を1枚ずつ消す手段が別に必要**(牌タップ削除は不採用、バケツは全消し)。手牌・副露・ドラを書き換えるアクションを `AppAction` に追加。
- **D3**: 同じシートにテンキー。AC・バックスペース。物理キーボードはシートの Esc 処理と衝突しないよう調整。
- **D4**: ドラ・裏ドラのカード(`open-sheet { type: 'dora' | 'uradora' }`)、副露の追加ボタン(`{ type: 'meld', i }`)。抜き北は D1 の `Stepper` と `isNukiEnabled` を使う。計算コアへは `computeResult` が表裏をまとめる。
- **D5**: 風セグメント(`ConnectedButtonGroup`)と `table.round`・`seat` のアクション、積み棒・供託のステッパーの配置・文言、状況役シート(`{ type: 'situation' }`)、要約カード1行目の文言。
- **D6**: 設定画面の中身。`set-rule` アクションと `saveRule` の接続。`SettingsScreen` を置き換える。
- **Epic E**: `ResultPanel` の中身(ツモ・ロン併記、F3)、要約カードの結果1行。`useResult` の `ResultState` を受け取る。

## 7. D1 に含めない範囲

各入力欄の中身(パレット・テンキー・ドラ/副露/状況役の入力)、風の切替、結果の中身、設定画面の中身、ルールの保存、シートのドラッグ操作、予算値の変更。
