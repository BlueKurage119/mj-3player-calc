# Issue #159 LoadingIndicator を円形プログレスインジケーターへ置換(iOS Safari 対応)

> **確定版(監修終了後)**。第1段階で①`md-circular-progress` ラップと②SVG+CSS 自作の2方式を実装し、オーナーが実機 iOS Safari で見比べた。その結果、**②自作を採用**した(オーナー決定)。第2段階で①と監修用の切替を削除する(5.2)。

- 親Issue: #157 の項目2
- ブランチ: `feature/issue-159-circular-progress`(起点 `develop/v2.0`、PR base も `develop/v2.0`)
- 設計担当: `mj3calc-designer`(Claude Opus 5.5)

## 1. 参照資料と確定事項

### 1.1 確定事項(オーナー決定)

- **置換の方針**: モーフィング修正ではなく、円形プログレスへ置き換える。iOS Safari(WebKit)で CSS `d: path()` の補間が動かないため。
- **利用箇所**: `src/ui/engine/EngineView.tsx` の「計算中」1か所のみ。
- **型**: 不確定(回転)型とする。確定型は別Issue(2.1)。
- **方式【確定】**: ②自作を採用する。①ラップは採用しない。
  - 不採用の理由(監修結果): ①は標準実装のままではトラックが透明で、gap(円弧とトラックの間隔)の仕組みも無い(2.3)。M3 仕様図の見た目は、②でしか再現できない。オーナーは実機 iOS Safari で②を確認し、問題なしと判断した。
  - Expressive 風 wavy、太いバリアント、Compose/Flutter からの移植は対象外。
- **見た目【確定】**:
  - コンテナ背景(円)は付けない(05cb251)。
  - ボックスは 3rem(48)。その中に外径40(r=18、線幅4)を描く。
  - 円弧とトラックの間隔は、常に見かけ 4 に保つ(04b0cd6、3.2)。
  - 円弧長は最小 約10%・最大 約75%とする。伸縮周期は `extra-long4 × 1.4`、トラック色は `secondary-container` とする。いずれも監修で承認された現値。
- **旧部品**: 旧 `LoadingIndicator`(tsx・css・test)は削除する(第1段階で完了)。
- **reduced-motion**: `prefers-reduced-motion: reduce` では、円弧とトラックを静止表示する(円弧 約30%)。
- **アクセシビリティ**: `role="progressbar"` と `aria-label="計算中"` を維持する。
- **実機確認**: オーナーが `--host` 付き開発サーバーへ実機 iOS Safari から接続し、監修を済ませた。インジケーターは問題なし。PWA(ホーム画面追加)での確認は**実施しない**。
- **UI規則**: `docs/rules/06-ui-md3-protocol.md` に従う。トークンのみを使い、自作部品は `src/ui/expressive/` に置く。副作用目的の bare import は書かない。
- **WebKit 互換**: CSS のみで動かす。`d: path()` 等の WebKit 非対応機能は使わない。

### 1.2 参照した資料

- Issue:
  - `gh issue view 159`
  - `gh issue view 157 --comments`
- 旧部品(削除済み): `LoadingIndicator.tsx`・`loading-indicator.css`・`LoadingIndicator.test.tsx`。テストは 153-L1(role/aria)、153-L2(トークン使用・HEX/cubic-bezier 不在・reduced-motion)、153-L3(モーフィング用パス)。
- 計算の状態と画面:
  - `src/ui/engine/engine-run.ts:9`
  - `src/engine/worker.ts`
  - `src/ui/screen/EngineScreen.tsx:81`(`isSlowRun` が真なら「時間がかかります」を表示)
- 監修結果の実装: `git show 05cb251`(背景削除)、`git show 04b0cd6`(dash の回転配置)、`src/ui/expressive/circular-progress.css`
- 業務標準:
  - `docs/rules/01-dev-workflow-protocol.md`(devサーバーの禁止事項)
  - `docs/rules/06-ui-md3-protocol.md`
  - `docs/rules/09-bundle-budget-protocol.md`
- **M3 仕様図**(オーナーが m3.material.io「Progress indicators」から提供した画像2枚。設計担当が目視)
  - 図1(寸法、単位 dp):
    | 種類 | 外径 | 線幅 | 円弧とトラックの間隔(gap) | 波の振幅・波長 |
    | --- | --- | --- | --- | --- |
    | flat | 40 | 4 | 4 | — |
    | flat 太 | 44 | 8 | 4 | — |
    | wavy | 48 | 4 | 4 | 1.6・15 |
    | wavy 太 | 52 | 8 | 4 | 1.6・15 |
  - 図2(解剖図): 1 = アクティブインジケーター、2 = トラック。

### 1.3 外部事実の確認記録

| 事実 | 実行コマンド | 結果 |
| --- | --- | --- |
| `md-circular-progress` のトラックと gap | `grep -o "\.track{[^}]*}"`(`node_modules/@material/web/progress/` 配下、v2.5.0) | `.track{stroke:rgba(0,0,0,0)}` でトラックは透明。トラック色のトークンも gap の仕組みも無い。①不採用の根拠の一つ |
| `package.json` の sideEffects | `grep -A2 sideEffects package.json` | `["*.css"]` |
| 基準値(初回JS、`develop/v2.0` = `4e0ea37`) | `npm run build` 後、`dist/index.html` の module script・modulepreload を `gzip -9 -c \| wc -c` | **130,183 B**(`registerSW.js` は module でないため除外) |

## 2. 調査結果(事実)

### 2.1 確定型の実現コスト

- running 状態も Worker も進捗率を持たない。
- 確定型には次の3つが要るため、スコープ外とする。コアでの総探索量の見積もり、Worker からの途中経過 postMessage、`EngineRunState` への `progress` 追加。

### 2.2 WebKit 互換性と回転

- 使う機能は、SVG の `stroke-dasharray` と CSS `transform: rotate()` だけ。`d: path()` は使わない。実機 iOS Safari での動作は、監修で確認済み。
- `<circle>` の `transform-origin: 50% 50%` は、`transform-box` の既定値 `view-box` に対して解決される。そのため、回転の中心は viewBox の中心 (24,24) になる。`viewBox="0 0 48 48"` を変える場合は、この前提が崩れる。

### 2.3 ①標準実装と M3 仕様図の差(不採用の根拠)

| 項目 | 仕様図(flat) | `md-circular-progress` 既定 |
| --- | --- | --- |
| 外径 | 40 | 48px |
| トラック | あり | 透明。色トークンが無く、shadowRoot への style 注入が必要 |
| gap 4 | あり | 仕組みなし |
| reduced-motion | 静止が必要 | 未対応(`@media` は `forced-colors` のみ) |

## 3. 部品設計(②自作: `src/ui/expressive/CircularProgress.tsx` + `circular-progress.css`)

### 3.1 寸法【確定】

- ボックスは `--circular-progress-size`(既定 3rem)とする。背景と border-radius は持たない。
- `viewBox="0 0 48 48"`、中心 (24,24)、`r=18`、`stroke-width: 4` とする。円周は 2π×18 ≈ 113.1。
- 線端は `stroke-linecap: round`、`fill: none`。

### 3.2 要素と配置方式【確定・04b0cd6】

- **アクティブインジケーター**: `<circle class="circular-progress__arc">`、`stroke: var(--md-sys-color-primary)`。
- **トラック**: `<circle class="circular-progress__track">`、`stroke: var(--md-sys-color-secondary-container)`。
- **配置方式**:
  - 円弧とトラックは、どちらも「パス始点(3時方向)から始まる単一の dash」とする。`stroke-dasharray: <長さ> 113.1` の形で、`stroke-dashoffset` は使わない。
  - 位置は、各 `<circle>` に掛ける `transform: rotate()` で決める(`transform-origin: 50% 50%`)。
  - こうすると dash が始点の継ぎ目をまたがないので、間隔が一定に保たれる。
- **gap**:
  - dash 上の間隔は 8 とする。round キャップが両端に 2 ずつはみ出すため、見かけは 4 になる。
  - 円弧の長さを L、回転を θ とすると、トラックは次のとおり。
    - 長さ: `113.1 − L − 16`
    - 回転: `θ + (L + 8) × 3.1831deg`(円周 1 単位 = 360/113.1 deg)

### 3.3 動き【確定】

- `<svg>` には、`extra-long4 × 2` の周期で linear の無限回転を掛ける。
- 円弧(`circular-progress-arc`)とトラック(`circular-progress-track`)は、同じ周期 `extra-long4 × 1.4` と standard イージングで動く。円弧は 1 周期で 1 周分を送りながら、長さを 11.3(約10%)→ 84.8(約75%)→ 11.3 と伸縮させる。トラックは、各キーフレームで 3.2 の式を満たす値にする。
  - 現値: 0% は円弧 11.3/0deg、トラック 85.8/61.43deg。50% は円弧 84.8/44.88deg、トラック 12.3/340.27deg。100% は円弧 11.3/360deg、トラック 85.8/421.43deg。
- 時間とイージングは `--md-sys-motion-*` トークンを使う。`calc()` で倍率を掛けるのは可。

### 3.4 静止時(基準スタイル)と reduced-motion

- `@keyframes` の外にある基準スタイルに、静止時の値を固定で持たせる。キーフレームだけで dasharray を指定すると、`animation: none` のときに全周表示や消失になるため。
  - 円弧: `stroke-dasharray: 33.9 113.1`(約30%)、回転なし
  - トラック: `stroke-dasharray: 63.2 113.1`、`transform: rotate(133.37deg)`
- `@media (prefers-reduced-motion: reduce)` では、svg・円弧・トラックの3つとも `animation: none` にする。

### 3.5 単位の方針

- `px`・`ms`・`cubic-bezier`・HEX・`rgb(` を直書きしない。
- SVG ユーザー単位の数値(単位なし)と `deg`、サイズの `rem` は可。

### 3.6 API

```ts
export interface CircularProgressProps {
  /** 指定時は role="progressbar" と aria-label を付与。省略時は aria-hidden="true" */
  label?: string | undefined;
  className?: string | undefined;
}
export function CircularProgress(props: CircularProgressProps): React.JSX.Element;
```

## 4. 監修(完了)

- 統括が `--host` 付きで起動した dev サーバーに、オーナーが実機 iOS Safari で接続した。①・②を見比べ、ライト/ダークの両方を確認した。
- 結果は 1.1 のとおり。②を採用し、背景を削除し、gap を常に 4 に保つ修正を入れた。インジケーターは問題なし。
- PWA での確認は行わない(オーナー決定)。

## 5. 製造の段階と変更ファイル

### 5.1 第1段階(完了済み)

- ①(`src/ui/md/CircularProgress*`)と②を実装し、`md/index.ts`・`jsx.d.ts` に①を追加した。
- 旧 `LoadingIndicator` 一式を削除した。
- `EngineView.tsx` に監修用の切替(`?progress=wrap`)を置いた。
- 依存テスト2ファイルのセレクタを②に合わせた。
- 監修の反映として、05cb251(背景削除)と 04b0cd6(回転配置)をコミットした。

### 5.2 第2段階: ①と切替の削除

| ファイル | 変更 |
| --- | --- |
| `src/ui/md/CircularProgress.tsx`・`CircularProgress.test.tsx` | 削除 |
| `src/ui/md/index.ts`・`jsx.d.ts` | 第1段階で追加した①関連の行(export・`md-circular-progress` の型)を削除。`md-static.test.ts` に関連する記述があれば除く |
| `src/ui/engine/EngineView.tsx` | 切替(`useWrap` と `?progress=wrap` 分岐、`MdCircularProgressView` の import)を削除し、`<CircularProgress label="計算中" />` を直接描画 |
| `src/ui/engine/engine-view.test.tsx`・`src/ui/screen/EngineScreen.test.tsx` | 切替や①に触れる記述があれば除く。②のセレクタと表示順の検査は維持 |

- ②の CSS・tsx・テストは変更しない(確定値のため)。
- 変更禁止: `src/core/**`、`src/engine/**`、`src/ui/engine/engine-run.ts`、`wasm/**`、トークン定義ファイル、`package.json`、`vite.config.ts`、`src/ui/expressive/circular-progress.css`。

## 6. 受け入れ条件

> 6.1・6.2 の多くは第1段階で検収済み。**第2段階の検収では、6.3 の全項目と、6.3 が参照する項目だけを実行する。**「第1段階で完了済み」と書いた項目は実行不要。

### 6.1 共通(6.3 から参照)

1. `npm run lint` / `npm run typecheck` / `npm run format:check` / `npm test` がすべて成功する。
2. `grep -rn "d: path(" src` が0件。`npm run build` 後の `grep -l "d:path(" dist/assets/*.css` も0件。
3. `grep -rn "LoadingIndicator\|loading-indicator" src` が0件。
4. アクセシビリティ:
   - ②のテストで、`label` を指定したときに `role="progressbar"` と `aria-label="計算中"` が付くことを検証している。省略したときに `aria-hidden="true"` になることも検証している。
   - engine-view.test の表示順(インジケーター→「計算中…」→経過時間)の検査が通る。
5. 計算中の再現と目視:
   - preview を `--port <空きポート>` で自分で起動する(01号)。止めるときはそのポートだけを止める。
   - 何切る/期待値計算の画面で、「時間がかかります」が出る条件にして実行する(`isSlowRun` が真。詳細計算 ON、14枚、2向聴以上の手。例: ランダム入力)。インジケーターが数秒以上回転表示されれば合格。
   - すぐ終わる場合は、DevTools の Performance で CPU を 6x slowdown にする。
   - ライト/ダークの両方で、円弧とトラックが見分けられ、両端に隙間が見えること。
6. reduced-motion(6.1-5 と同じサーバー):
   - DevTools の Rendering で `prefers-reduced-motion: reduce` をエミュレートする。
   - 円弧が見えて動かず、長さが円周の約30%(目視で 1/4〜1/3)であり、トラックが残りを隙間付きで描いていれば合格。全周表示や消失は不合格。

### 6.2 第1段階

1. 両方式の動作(切替): **第1段階で完了済み。実行不要。**
2. ①の合わせ込みの目視: **第1段階で完了済み(①は不採用)。実行不要。**
3. 本番ビルドの preview で②が表示される: 6.3-3 で再確認する。
4. ②の CSS に直書きが無い: `grep -nE "#[0-9a-fA-F]{3,8}\b|rgb\(|[0-9]px|[0-9]ms|cubic-bezier" src/ui/expressive/circular-progress.css` が0件。
5. 旧 153-L2 を引き継ぐテストがあり、通る。テストは②の CSS ソースについて次を検査する。`--md-sys-color-`・`--md-sys-motion-` の参照がある。HEX・`cubic-bezier` が無い。`@media (prefers-reduced-motion: reduce)` と `animation: none` がある。
6. ②の CSS と tsx の構造(目視、04b0cd6 の方式):
   - 円弧とトラックの基準スタイル(`@keyframes` の外)に、`stroke-dasharray` が `<長さ> 113.1` の固定値で指定されている(円弧 `33.9 113.1`、トラック `63.2 113.1`)。
   - トラックの基準スタイルに `transform: rotate(...)` がある(現値 133.37deg)。
   - `.circular-progress__arc`・`.circular-progress__track` に `transform-origin: 50% 50%` がある。
   - `stroke-dashoffset` を使っていない。
   - 両キーフレームが、同じ周期 `extra-long4 × 1.4` で `stroke-dasharray` と `transform: rotate()` を変化させている。`<svg>` は別の無限回転を持つ。
   - tsx が `viewBox="0 0 48 48"`、`r={18}` で、CSS が `stroke-width: 4`。コンテナ背景(`background`・`border-radius`)が無い。
   - 0%・50%・100% のどのキーフレームでも、トラック長が `113.1 − 円弧長 − 16` に、トラック回転が `円弧回転 + (円弧長 + 8) × 3.1831deg` に一致する(±0.1 単位・±0.5deg)。
7. ①の bare import 不在: **第1段階で完了済み(①は削除)。実行不要。**
8. 第1段階のバンドル参考値: **第1段階で完了済み。実行不要。**
9. 実機確認: **監修で完了済み。実行不要。**

### 6.3 第2段階(検収で実行する項目)

1. 6.1-1〜6.1-4 を満たす。
2. ①と切替が残っていない。次のすべてが0件(または不存在)であること。
   - `ls src/ui/md/CircularProgress.tsx src/ui/md/CircularProgress.test.tsx` がどちらも「No such file」
   - `grep -rn "md-circular-progress\|MdCircularProgress\|@material/web/progress" src`
   - `grep -rn "progress=wrap\|'progress'\|useWrap" src`
   - `grep -rn "CircularProgress" src/ui/md`
3. ②だけが使われている。
   - `grep -rn "CircularProgress" src --include=*.tsx --include=*.ts` のヒットが、`src/ui/expressive/`(本体・テスト・index.ts)、`EngineView.tsx`、依存テスト2ファイルに限られる。
   - `EngineView.tsx` の import 元が `'../expressive'` である。
4. 6.2-4・6.2-5・6.2-6 を満たす。
5. reduced-motion のテスト: ②のテストが CSS ソースに `@media (prefers-reduced-motion: reduce)` と `animation: none` があることを検査し、通る(6.2-5 に含まれる)。
6. 本番ビルド: `npm run build` 後の `npx vite preview --port <空きポート>` で、6.1-5・6.1-6 を満たす。`sideEffects` によって CSS が落ちていないことも確かめる。dev での確認だけでは不可。
7. バンドル: 09号の方法で初回JSを実測し、目標値 **131,183 B**(基準 130,183 + 1,000)と比べた実測値と差を PR 本文に記録する。超過しても不合格にはしない。
8. 変更範囲: `git diff --stat develop/v2.0...HEAD` に、5.2 の変更禁止ファイルが含まれない。第2段階のコミットで `src/ui/expressive/circular-progress.css` が変わっていない。
9. 実機・PWA の確認は求めない(監修で完了・PWA は不実施のオーナー決定)。

## 6A. M3 circular 仕様の扱い(確定)

| # | 項目 | 値 | 扱い |
| --- | --- | --- | --- |
| 1 | 外径 | flat 40 | 採用(r=18) |
| 2 | 線幅 | 4 | 採用 |
| 3 | 線端 | round | 採用 |
| 4 | トラック | 表示 | 採用。色は `secondary-container`(監修で承認) |
| 5 | 円弧とトラックの間隔 | 4 | 採用(dash 上 8、回転配置で常に一定) |
| 6 | 円弧長の最小・最大 | 約10%・約75% | 監修で承認 |
| 7 | 周期・イージング | 回転 `extra-long4 × 2` linear、伸縮 `extra-long4 × 1.4` standard | 監修で承認 |
| 8 | コンテナ背景 | なし | 監修で削除を決定 |
| 参考 | flat 太 / wavy / wavy 太 | 1.2 の表 | スコープ外 |

## 7. 後続Issueへの引き継ぎ

- 確定型が必要になったら、Worker/コアの途中経過通知を別Issueで設計する。
- wavy・太いバリアントが必要になったら、6A の参考値を使う。
- 完了時のチェックマーク演出は、別Issueとして首席が起票する(遅い計算のみ。約0.6秒チェックを表示したあと結果を表示する)。

## 8. 実挙動未確認の箇所

- 6.1-5 の入力例で十分な計算時間がかかるか(かからなければ CPU slowdown で代替)
- 第2段階のバンドル実測値(①削除後に目標値内に収まるか)
