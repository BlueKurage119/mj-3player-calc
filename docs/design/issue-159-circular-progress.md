# Issue #159 LoadingIndicator を円形プログレスインジケーターへ置換(iOS Safari 対応)

> 方式は、①`md-circular-progress` ラップと②SVG+CSS 自作(円弧回転)の2方式を実装し、オーナーが監修時に見比べて1つに決める(ユーザー決定)。製造は2段階で行う(5章)。【設計案】と書いた箇所はユーザー判断待ち。

- 親Issue: #157 の項目2
- ブランチ: `feature/issue-159-circular-progress`(起点 `develop/v2.0`、PR base も `develop/v2.0`)
- 設計担当: `mj3calc-designer`(Claude Opus 5.5)

## 1. 参照資料と確定事項

### 1.1 確定事項(オーナー決定・統括より受領)

- **置換の方針**: モーフィング修正ではなく、円形プログレスへ置き換える。iOS Safari(WebKit)で CSS `d: path()` の補間が動かないため。
- **利用箇所**: `src/ui/engine/EngineView.tsx` の「計算中」1か所のみ。
- **型**: 不確定(回転)型とする。確定型は別Issue(2.1)。
- **方式**: ①ラップと②自作の2方式を実装し、監修で1つに決める。Expressive 風 wavy、太いバリアント、Compose/Flutter からの移植は対象外。
- **見た目**:
  - ②にコンテナ背景を付ける(primary-container の円)。
  - ①は標準M3の見た目を基準とした比較用として扱う(3.1)。
  - 寸法は M3 仕様図(1.3)に合わせる。
- **旧部品**: 旧 `LoadingIndicator`(tsx・css・test)は削除する。
- **reduced-motion**: `prefers-reduced-motion: reduce` では静止円弧にする。①は内部CSSの上書きで静止させる。
- **アクセシビリティ**: `role="progressbar"` と `aria-label="計算中"` を維持する。
- **監修用の切替**: 手間のかからない最小の方式とし、監修後に削除する(3.4)。
- **実機確認**: オーナーが `--host` 付き開発サーバーへ実機 iOS Safari から接続し、監修時に確認する。PWA(ホーム画面追加)での確認は**実施しない**。
- **UI規則**: `docs/rules/06-ui-md3-protocol.md` に従う。トークンのみを使い、`@material/web` は `src/ui/md/` のラッパー経由、自作部品は `src/ui/expressive/` に置き、副作用目的の bare import は書かない。
- **WebKit 互換**: CSS のみで動かす。`d: path()` 等の WebKit 非対応機能は使わない。

### 1.2 参照した資料

- Issue:
  - `gh issue view 159`
  - `gh issue view 157 --comments`
- 旧部品:
  - `src/ui/expressive/LoadingIndicator.tsx`
  - `loading-indicator.css`
  - `LoadingIndicator.test.tsx`。テストは 153-L1(role/aria)、153-L2(トークン使用・HEX/cubic-bezier 不在・reduced-motion)、153-L3(モーフィング用パス)。
- 計算の状態と画面:
  - `src/ui/engine/engine-run.ts:9`
  - `src/engine/worker.ts`
  - `src/ui/screen/EngineScreen.tsx:81`(`isSlowRun` が真なら「時間がかかります」を表示)
- ラッパーの書式: `src/ui/md/Switch.tsx`。`REGISTERED`/`__registered` で要素の登録を保持している。
- 業務標準:
  - `docs/rules/01-dev-workflow-protocol.md`(devサーバーの禁止事項)
  - `docs/rules/06-ui-md3-protocol.md` 29行(bare import 禁止、`"sideEffects": ["*.css"]`)
  - `docs/rules/09-bundle-budget-protocol.md`
- **M3 仕様図**(オーナーが m3.material.io「Progress indicators」から提供した画像2枚。設計担当が画像を目視)
  - 図1(寸法、単位 dp)は4種類。
    | 種類 | 外径 | 線幅 | 円弧とトラックの間隔(gap) | 波の振幅・波長 |
    | --- | --- | --- | --- | --- |
    | flat | 40 | 4 | 4 | — |
    | flat 太 | 44 | 8 | 4 | — |
    | wavy | 48 | 4 | 4 | 1.6・15 |
    | wavy 太 | 52 | 8 | 4 | 1.6・15 |
  - 図1ではどの種類も、薄い色のトラック円弧が見える。
  - 図2(解剖図、ライト/ダーク): 1 = アクティブインジケーター、2 = トラック。トラックはライトで淡い紫、ダークで暗い灰紫。
- 概要動画(ユーザー提供)は未閲覧。

### 1.3 外部事実の確認記録

| 事実 | 実行コマンド | 結果 |
| --- | --- | --- |
| `@material/web` のバージョン | `grep version node_modules/@material/web/package.json` | `2.5.0` |
| `md-circular-progress` の gzip サイズ | `gzip -9 -c <file> \| wc -c`(`node_modules/@material/web/progress/` 配下) | 計 約3.5 KB。lit 本体は既存バンドルと共有する前提で除外した。共有分の実挙動は未確認 |
| `md-circular-progress` のアニメーションと reduced-motion | `grep -o "animation:[^;]*"` / `grep -o "@media[^{]*"` | アニメーションは `linear-rotate`・`rotate-arc`・`expand-arc`。`@media` は `forced-colors` のみで、**reduced-motion には対応していない** |
| `md-circular-progress` の shadow DOM 構造 | `grep -o 'part="[^"]*"\|class="[^"]*"'` | `part` 属性は無い。class は `track`・`active-track`・`spinner`・`left`・`right`・`circle` |
| `md-circular-progress` のサイズ・線幅・トラック | `grep -o "\-\-_[a-z-]*: var([^;]*"`、`grep -o "\.track{[^}]*}"` | サイズは `--md-circular-progress-size` で既定 `48px`。線幅は `--md-circular-progress-active-indicator-width` で既定 10。**`.track{stroke:rgba(0,0,0,0)}` でトラックは透明**。トラックの色を指定するトークンは無く、gap の仕組みも無い |
| `package.json` の sideEffects | `grep -A2 sideEffects package.json` | `["*.css"]` |
| 基準値(初回JS、`develop/v2.0` = `4e0ea37`) | `npm run build` 後、`dist/index.html` の module script・modulepreload を `gzip -9 -c \| wc -c` | **130,183 B**(`registerSW.js` は module でないため除外) |

## 2. 調査結果(事実)

### 2.1 確定型の実現コスト

- running 状態も Worker も進捗率を持たない。
- 確定型にするには次の3つが要るため、スコープ外とする。
  - コアでの総探索量の見積もり
  - Worker からの途中経過 postMessage
  - `EngineRunState` への `progress` 追加

### 2.2 WebKit 互換性と回転の注意

- 両方式とも、SVG の stroke(`dasharray`/`dashoffset`)と `transform: rotate()` で動く。`d: path()` は使わない。iOS Safari での実挙動は、監修時の実機確認で確かめる。
- ②では**回転を `<svg>` 要素に掛ける**。`<circle>` 側を回す場合は、**`transform-box: fill-box` と `transform-origin: center` を必ず指定する**。

### 2.3 ①標準実装と M3 仕様図の差

| 項目 | 仕様図(flat) | `md-circular-progress` 既定 | ①で必要な合わせ込み |
| --- | --- | --- | --- |
| 外径 | 40 | 48px | `--md-circular-progress-size: 2.5rem` を指定する(px の直書きは避ける) |
| 線幅 | 4 | 10(内部単位) | `--md-circular-progress-active-indicator-width` を調整する。外径40で見た目4になる値は実物で決める(実挙動未確認) |
| トラック | あり | 透明(`.track{stroke:rgba(0,0,0,0)}`) | トークンが無いため、shadowRoot に注入する style で `.track` の stroke を上書きする |
| gap 4 | あり | 仕組みなし | 再現しない(比較用として許容)。再現が必要なら②を採る理由になる |

## 3. 部品設計

### 3.1 ①ラップ: `src/ui/md/CircularProgress.tsx`

- 登録:
  - `import { MdCircularProgress } from '@material/web/progress/circular-progress.js';` とする。
  - `Switch.tsx` と同じ `REGISTERED`/`__registered` 方式で登録を保持する(bare import 禁止)。
  - `jsx.d.ts` に `md-circular-progress` を追加する。
- 描画:
  - `<md-circular-progress indeterminate aria-label={label}>` を描画する。
  - `label` を省略したときは `aria-hidden="true"` にする。
  - `role="progressbar"` は要素の内部が持つ。jsdom で shadow DOM 内の role を検証できるかは実挙動未確認。できなければ、ホストの `aria-label` の検証にとどめる。
- 見た目: 標準M3(コンテナ背景なし)のまま比較用とする。ただし 2.3 のとおり、外径・線幅・トラックだけは合わせ込む。
- shadowRoot への style 注入:
  - ラッパーの `useLayoutEffect` で、`ref.current.shadowRoot` に `<style>` を1つ追加する。`adoptedStyleSheets` は使わない。
  - 未アップグレードで shadowRoot が無い間は、`customElements.whenDefined('md-circular-progress')` を待ってから追加する。
  - 注入する内容は次の2つ。
    - トラック: `.track { stroke: var(--md-sys-color-secondary-container) }`(色は 3.2 と同じ案)
    - reduced-motion: `@media (prefers-reduced-motion: reduce) { * { animation: none } }` に加え、静止時に円弧が約30%見えるよう `.circle`/`.left`/`.right` の回転角を固定する指定。具体値は製造時に実物で決め、6.1-6 の基準で判定する。
- 公開 API は 3.3 と共通。

### 3.2 ②自作: `src/ui/expressive/CircularProgress.tsx` + `circular-progress.css`

**コンテナと仕様寸法の両立【設計案・比率は監修で調整】**

- コンテナは外径 3rem(48)の円。背景は `--md-sys-color-primary-container`、形状は `--md-sys-shape-corner-full`。外径は `--circular-progress-size` で上書きできるようにする。
- コンテナの中に、仕様図 flat の外径40を置く。viewBox 48 の中心 (24,24) で次のとおり描く。
  - 円の半径は `r = (40 − 4) / 2 = 18`、線幅は `stroke-width: 4` とする。
  - 円周は 2π×18 ≈ 113.10 になる。
- コンテナの縁と円弧の外周の余白は 4(各辺)。
- 代替案として、コンテナを 3.5rem(56)にして余白を 8 にする案も監修で比べられるよう、`--circular-progress-size` で変えられるようにしておく。

**要素**

- **アクティブインジケーター**: `<circle class="circular-progress__arc">`。
  - `stroke: var(--md-sys-color-primary)`、`stroke-linecap: round`、`fill: none`。
- **トラック**: `<circle class="circular-progress__track">`。同じ半径・線幅で、円弧の残りを描く。
  - 色【設計案】は `--md-sys-color-secondary-container`。ライト/ダークのテーマトークンで自動的に切り替わり、仕様図2の淡い紫/暗い灰紫に相当する。
  - 代替案は `--md-sys-color-surface-container-highest`。
  - コンテナ背景(primary-container)の上で見分けられるかは監修で確かめる。見分けにくい場合の候補は `--md-sys-color-surface` 系。
- **gap**: 円弧の両端とトラックの両端の間に、見かけの間隔4を空ける。round キャップで線が両端に 2 ずつはみ出すため、dash 上の間隔は 4 + 4 = 8(SVG単位)を目安とする。
  - トラックの dash 長は `円周 − 円弧長 − 2×8` とする。
  - トラックの開始位置は、円弧の終端から 8 先に置く。

**動き**

- `<svg>` に `transform: rotate()` の線形無限回転を掛ける。
- 円弧の伸縮は dasharray/dashoffset で行う。トラックも同じキーフレームの周期で追従させる。
- 時間とイージングは `--md-sys-motion-*` トークンを使う。`calc()` で倍率を掛けるのは可。

**必須要件**

- 基準スタイル(`@keyframes` の外)に、静止時の値を固定で持たせる。
  - 円弧: `stroke-dasharray: 33.9 113.1`(約30%)
  - トラック: 残りから gap を除いた値
- キーフレームだけで dasharray を指定してはならない。`animation: none` のときに全周表示や消失になるため。

**reduced-motion**

- `animation: none` にし、約30%の円弧とトラックを静止表示する。

**単位の方針**

- `px`・`ms`・`cubic-bezier`・HEX・`rgb(` を直書きしない。
- SVG のユーザー単位の数値(単位なし)は可。サイズの `rem` も可。

### 3.3 共通 API(両方式で同名・同形)

```ts
export interface CircularProgressProps {
  /** 指定時は aria-label(②は role="progressbar" も)を付与。省略時は aria-hidden="true" */
  label?: string | undefined;
  className?: string | undefined;
}
export function CircularProgress(props: CircularProgressProps): React.JSX.Element;
```

### 3.4 監修用の切替(第1段階のみ、最小方式)

- `EngineView.tsx` に次の1行を置く。
  ```ts
  const useWrap = import.meta.env.DEV && new URLSearchParams(location.search).get('progress') === 'wrap';
  ```
  - `useWrap` が真なら①、偽なら②を描画する。
  - ①・②は名前付き import で別名にする(例: `CircularProgress as MdCircularProgressView`)。bare import にはしない。
- **本番ビルドは常に②**。`import.meta.env.DEV` は `false` に置き換わり、クエリは効かない。①のコードが本番バンドルに残るかどうかは、製造時に実測して記録する(参考値)。
- ①の本番ビルドでの確認は、①を採用した場合に第2段階で行う。
- ビルド時の環境変数による切替(前版の案)は採らない。最小化のため。
- 第2段階でこの行を削除する。

## 4. 監修手順(実機確認)

1. **統括**が worktree で `npx vite --host --port <空きポート>` を起動する。01号に従い、止めるのは自分が起動したサーバーだけで、ポートを指定して止める。一括終了はしない。
2. 統括が起動ログに出る LAN の URL(`base` 付きのパス)をオーナーに渡す。
3. オーナーが実機 iOS Safari で、その URL のままの表示(②)と、`?progress=wrap` を付けた表示(①)を見比べる。ライト/ダークの各々で確認する。
4. 計算中の再現は 6.1-5 の手順で行う。reduced-motion は、iOS の「視差効果を減らす」(動作を減らす)を ON にして確認する。
5. PWA(ホーム画面追加)での確認は行わない(オーナー決定)。
6. 統括が監修結果(採用方式、比率・色の調整点)を Issue に記録し、第2段階の着手指示とする。

## 5. 製造の段階と変更ファイル

### 5.1 第1段階: 両方式の実装と切替

| ファイル | 変更 |
| --- | --- |
| `src/ui/md/CircularProgress.tsx`・`CircularProgress.test.tsx` | 新規(①)。テストは `aria-label`/`aria-hidden` の切替、`indeterminate`、注入 style(トラックと reduced-motion)が shadowRoot に入ること |
| `src/ui/md/index.ts`・`jsx.d.ts` | export と型を追加。`md-static.test.ts` が新ラッパーを要求すれば追従する |
| `src/ui/expressive/CircularProgress.tsx`・`circular-progress.css`・`CircularProgress.test.tsx` | 新規(②) |
| `src/ui/expressive/index.ts` | `LoadingIndicator` を `CircularProgress` に差し替え |
| `src/ui/expressive/LoadingIndicator.tsx`・`loading-indicator.css`・`LoadingIndicator.test.tsx` | 削除 |
| `src/ui/engine/EngineView.tsx` | 3.4 の切替で①/②を描画 |
| `src/ui/engine/engine-view.test.tsx`(88-103行付近)・`src/ui/screen/EngineScreen.test.tsx`(613行付近) | セレクタを②に合わせる。表示順の検査は維持 |

変更禁止:

- `src/core/**`
- `src/engine/**`
- `src/ui/engine/engine-run.ts`
- `wasm/**`
- トークン定義ファイル
- `package.json`
- `vite.config.ts`

### 5.2 第2段階: 採用方式の確定と不採用側の削除

1. `EngineView.tsx` から 3.4 の切替行を削除し、採用側を直接描画する。
2. **②を採用した場合**:
   - `src/ui/md/CircularProgress.tsx` とそのテストを削除する。
   - `md/index.ts`・`jsx.d.ts`(必要なら `md-static.test.ts`)から関連行を除く。
3. **①を採用した場合**:
   - `src/ui/expressive/CircularProgress.tsx`・`circular-progress.css`・テストを削除する。
   - `expressive/index.ts` から export を除く。
   - 依存テスト2ファイルのセレクタを①に合わせる。
4. 監修で出た比率・色の調整を反映する。
5. `grep -rn "progress=wrap\|'progress'" src` が0件になることを確かめる。
6. 09号の方法でバンドルを実測し、6.3-4 の目標値と比べて記録する。

## 6. 受け入れ条件

### 6.1 両段階共通

1. `npm run lint` / `npm run typecheck` / `npm run format:check` / `npm test` がすべて成功する。
2. `grep -rn "d: path(" src` が0件。`npm run build` 後の `grep -l "d:path(" dist/assets/*.css` も0件。
3. `grep -rn "LoadingIndicator\|loading-indicator" src` が0件。
4. アクセシビリティ:
   - 各方式のテストで、`label` を指定したときに `aria-label="計算中"`(②は `role="progressbar"` も)が付き、省略したときに `aria-hidden="true"` になることを検証している。
   - engine-view.test の表示順(インジケーター→「計算中…」→経過時間)の検査が通る。
5. 計算中の再現と目視:
   - 自分で preview または dev を `--port <空きポート>` で起動する(01号)。
   - 何切る/期待値計算の画面で「時間がかかります」が出る条件(`isSlowRun` が真。詳細計算 ON、14枚、2向聴以上の手。例: ランダム入力)にして実行し、インジケーターが数秒以上回転表示されること。
   - すぐ終わる場合は、DevTools の Performance で CPU を 6x slowdown にする。
   - ライト/ダークの両方で、円弧とトラックが見分けられること。
6. reduced-motion(6.1-5 と同じサーバーで確認する):
   - DevTools の Rendering で `prefers-reduced-motion: reduce` をエミュレートする。
   - 計算中の円弧が見えて動かず、長さが円周の約30%(目視で 1/4〜1/3)であれば合格。全周表示や消失は不合格。

### 6.2 第1段階

1. 両方式が動くこと: dev サーバーで、パラメータなし(②)と `?progress=wrap`(①)のそれぞれが 6.1-5・6.1-6 を満たす。
2. ①の合わせ込み(2.3)の目視: 外径がコンテナを除いた②の円弧と同じ大きさで、トラックが見え、線幅が②と同程度であること。gap が無いことは許容する。
3. 本番ビルド:
   - `npm run build` 後の preview で、②が 6.1-5 を満たす(sideEffects で CSS が落ちていないこと)。
   - `?progress=wrap` を付けても②のままであること。
4. ②の CSS に直書きが無いこと: `grep -nE "#[0-9a-fA-F]{3,8}\b|rgb\(|[0-9]px|[0-9]ms|cubic-bezier" src/ui/expressive/circular-progress.css` が0件。
5. 旧 153-L2 を引き継ぐテストがあり、通ること。テストは②の CSS ソースについて次を検査する。
   - `--md-sys-color-`・`--md-sys-motion-` の参照がある。
   - HEX・`cubic-bezier` が無い。
   - `@media (prefers-reduced-motion: reduce)` と `animation: none` がある。
6. ②の CSS の構造(目視):
   - 円弧とトラックの基準スタイル(`@keyframes` の外)に、`stroke-dasharray` が固定値で指定されている。
   - 回転は `<svg>` に掛けている。`<circle>` を回す場合は `transform-box: fill-box` と `transform-origin: center` がある。
   - `r=18`、`stroke-width: 4` である。
7. ①が bare import を使っていない: `grep -n "^import '@material" src/ui/md/CircularProgress.tsx` が0件。
8. バンドル: 09号の方法で初回JSを実測し、基準値 130,183 B との差を参考値として記録する。第1段階では目標値の判定をしない。
9. 監修の実機確認(4章)はオーナーが行う。検収時点で未実施なら、PR 本文に「実機未確認」と明記してオーナー確認に回す。これだけを理由に不合格にはしない。

### 6.3 第2段階

1. 採用側だけが残っている: 5.2-5 の grep が0件で、不採用側のファイルが存在しない(`ls` で確認)。
2. 採用方式に応じた条件を再度満たす: ②採用時は 6.2-4〜6、①採用時は 6.2-2・6.2-7。
3. 本番ビルドの preview で、採用方式が 6.1-5・6.1-6 を満たす。①採用時は、要素の登録が本番で落ちていないことも確かめる。
4. バンドル目標値(超過しても不合格にはせず、実測値と差を記録する):
   - ②採用: 130,183 + 1,000 = **131,183 B**
   - ①採用: 130,183 + 3,500 = **133,683 B**
5. 採用方式について、オーナーが実機 iOS Safari で最終確認する。未実施なら 6.2-9 と同じ扱い。

## 6A. オーナー確認事項(m3.material.io circular 仕様)

### 6A.1 仕様図で確認できた事項(確定値として扱う)

| # | 項目 | 値 | 本Issueでの扱い |
| --- | --- | --- | --- |
| 1 | 外径 | flat 40 | 採用。②は r=18、①は 2.5rem |
| 2 | 線幅 | 4 | 採用 |
| 3 | 線端 | round(図で丸い端を確認) | 採用 |
| 4 | トラック | 表示する(図1・図2) | 採用。色は 3.2 の【設計案】 |
| 5 | 円弧とトラックの間隔 | 4 | ②で採用。①は再現しない |
| 参考 | flat 太 | 外径 44・線幅 8・gap 4 | スコープ外 |
| 参考 | wavy / wavy 太 | 外径 48 / 52、線幅 4 / 8、振幅 1.6、波長 15、gap 4 | スコープ外 |

### 6A.2 まだ確認できていない事項(暫定値で製造を進めてよい)

| # | 確認項目 | 暫定値 |
| --- | --- | --- |
| 6 | 不確定型の円弧長の最小・最大(円周比) | 最小 約10%、最大 約75% |
| 7 | 1回転の周期、伸縮1周期の時間とイージング | トークン(`--md-sys-motion-duration-extra-long4` の倍率、standard 系イージング)。製造時に見た目で調整する |
| 8 | 円形コンテナ(背景)付きの表示が circular 仕様にあるか | 仕様図には無い。オーナー決定によりコンテナを付ける。比率(48 の中に外径 40)は監修で調整する |
| 9 | トラックの色トークン | `--md-sys-color-secondary-container`(代替は `--md-sys-color-surface-container-highest`) |

## 7. 後続Issueへの引き継ぎ

- 確定型が必要になったら、Worker/コアの途中経過通知を別Issueで設計する。
- wavy・太いバリアントが必要になったら、6A.1 の参考値を使う。

## 8. 実挙動未確認の箇所

- iOS Safari での SVG stroke アニメーションの描画
- ①: shadowRoot への style 注入でトラックが表示され、reduced-motion で静止して約30%の円弧になるか。線幅の合わせ込みに使う値。jsdom で shadow DOM 内の role を検証できるか
- ②: 円弧の伸縮にトラックと gap を追従させる見た目
- 本番ビルドで `import.meta.env.DEV` 分岐が除去され、①のコードが残らないか
- 6.1-5 の入力例で十分な計算時間がかかるか
- dev サーバーでのパス(`base` が付くか)
