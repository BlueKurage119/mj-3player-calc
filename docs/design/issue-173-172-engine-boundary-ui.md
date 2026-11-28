# Issue #173・#172 設計書: 計算エンジン・Worker の境界条件修正と、計算画面・画面遷移の UI/状態改善

- 対象Issue: #173(計算エンジン・Worker の境界条件修正と境界自動テストの強化)、#172(計算画面・画面遷移の UI/状態改善)
- **2 Issue を設計書1本・PR 1本にまとめるのはオーナー判断(2026-11-28)。[02号](../rules/02-design-protocol.md)「成果物の制約」の「1 Issue 1本」の例外である。** 受け入れ条件・テスト記号は Issue ごとに分ける(#173 は `173-`、#172 は `172-` で始める)。コミットも Issue ごとに分ける(§7)
- テスト記号の例外: `src/engine/engine.test.ts` に追加する4ケースだけは、既存の境界群の連番(`F31-C1`〜`F31-C5`)に合わせて `F31-C7`〜`F31-C10` とする(`F31-C6` は `client.test.ts` の `F31-C6a`〜`e` で使用済み)。設計書上は 173-T7 として #173 に属する
- base ブランチ: `main`(基準コミット `ef445b7`)。作業ブランチ: `fix/issue-173-172-engine-boundary-ui`
- 設計担当モデル: Claude Opus 5.5(`claude-opus-5-5`)
- 状態: 独立レビュー(AGY Neon)の指摘 R1〜R7・P3 と、首席判断 H9〜H12 を反映済み。要ヒアリング事項なし
- 設計承認: 首席統括(オーナー委任)、2026-11-28。製造は AGY スキル式(Gemini 4 Hydrogen)。承認スコープは PR 作成と Codex 自動レビュー対応まで
- 並行作業の制約: `wasm/decomposer/src/counts.rs` と `.github/workflows/*` は別 Issue(#174)が触る。**本 Issue では変更しない**

## 1. 参照資料と設計判断の根拠

### 1.1 確定事項(再検討・上書きしない)

| # | 出典 | 確定事項 | 反映先 |
| --- | --- | --- | --- |
| H1 | オーナー回答 2026-11-28 | #173-1: `new Worker` の同期例外を `{type:'error'}` 応答に変換し、画面は既存の計算エラー表示に流す。文言は追加しない。コンストラクター例外の単体テストを追加する | §3.1 |
| H2 | 同上 | #173-2: 13枚 `hora` で和了候補がすべて十三不搭(`shisanputa`)なら入口を出さない(`engineStartShanten` が null)。十三不搭以外の和了を含む場合は従来どおり 0 | §3.2 |
| H3 | 同上 | #173-3: `wasm/engine/src/dp.rs` の前進計算で `total_c == 0` のとき、`next_mass` へ `m0 + m1` を加算してから `continue` する | §3.3 |
| H4 | 同上 | #173-4: `src/engine/engine.test.ts` の境界群に Issue 記載の4パターンを追加する | §3.4 |
| H5 | 同上 | #172-1: 未実行(表示上 idle)の状態でキーが変わったら `defaultEngineCache` を参照し、一致すれば復元する。「詳しく」の選択自体をヘルプ往復で保持する改修はしない | §4.1 |
| H6 | 同上 | #172-2: `failed` に `key` を持たせ、`visibleRunState` で key が一致しなければ idle 扱いにする。`running` には key を持たせない(計算中は計算方法の切替が `EngineView.tsx:178` で無効化済み) | §4.2 |
| H7 | 同上 | #172-3: `src/ui/App.tsx` で `screen` が変わったら `useLayoutEffect` で `window.scrollTo(0, 0)` する。全画面遷移で先頭へ戻す(メインへ戻るときも先頭。位置は復元しない)。順序の検証テスト(遅延チャンク読込済みの2回目の遷移を含む)を受け入れ条件に含める | §4.3 |
| H8 | 同上 | #172-4: `axis.kind === 'point'` のとき、縦軸上端の下限を 100 にする(`chart-series.ts` の `niceMax` 呼び出し側) | §4.4 |
| H9 | 首席判断(オーナー委任)2026-11-28 | #172-3: 初回マウント(アプリ起動・再読み込み)では `scrollTo(0,0)` を呼ばない。前回の `screen` と異なるときだけ呼ぶ | §4.3 |
| H10 | 同上 | #172-2: 概算で失敗 →「手替わりを詳しく」に切り替えると失敗表示は消える。概算に戻すと、同じ失敗表示が再び出る(`done` と同じ扱い。切替で失敗状態を破棄しない) | §4.2 |
| H11 | 同上 | #173-3: 修正は前進計算の聴牌分岐だけ。非聴牌分岐(`dp.rs` 358–360 行)の同形の `continue` は変更しない | §3.3 |
| H12 | 首席判断(オーナー委任)2026-11-28(設計承認時。旧 Q4 の (A)) | #173-2: 14枚の打牌候補の経路でも、打牌後が十三不搭だけの `hora` になる候補を入口判定から外す。`src/core/result.ts` は変更しない | §3.2.2 |

### 1.2 参照した資料

- `AGENTS.md`、[01号](../rules/01-dev-workflow-protocol.md)(dev/preview サーバーの禁止事項)、[02号](../rules/02-design-protocol.md)、[06号](../rules/06-ui-md3-protocol.md)、[07号](../rules/07-mahjong-rule-protocol.md)、[09号](../rules/09-bundle-budget-protocol.md)
- ルールの出典: [docs/mahjong-rules.md](../mahjong-rules.md) §4.2.1(十三不搭の成立条件: 第一ツモ時・鳴きなし・面子と搭子がなく対子が1つだけ)、§4.2.2(天和・地和の入力。国士無双の形も満たす手は国士無双とし、十三不搭は付けない)
- Issue #173・#172 本文(`gh issue view 173` / `gh issue view 172`)
- 既存コード:
  - エンジン: `src/engine/client.ts`・`client.test.ts`・`compute.ts`(`sRefCommon` と `oneShantenSlack` の実効 diffSlack。255–308 行)・`engine.test.ts`
  - 計算画面: `src/ui/engine/engine-run.ts`・`engine-run.test.ts`・`use-engine-run.ts`・`engine-request.ts`(`engineOptionsOf`。14–20 行)・`chart-series.ts`・`chart-series.test.ts`・`TurnChart.tsx`・`EngineView.tsx`・`EngineResult.tsx`・`engine-view.test.tsx`、`src/ui/screen/EngineScreen.tsx`・`EngineScreen.test.tsx`(30–51 行の `attachInternals` シム)・`HelpScreen.tsx`、`src/ui/App.tsx`
  - 入口判定・ルール: `src/ui/result/engine-entry.ts`・`engine-entry.test.tsx`・`classify.ts`、`src/core/result.ts`(13枚 `hora` の生成と 14枚の `minsBy`。350–354 行)・`local-yaku.ts`・`rule-items.ts`(設定のラベル)
  - WASM: `wasm/engine/src/dp.rs`・`lib.rs`・`wall.rs`
- 既存設計書: `issue-138-engine.md`・`issue-139-ui.md`・`issue-150-151-engine-screen-tests.md`(計算画面のキャッシュ・dispose の前提)

### 1.3 実測・実物調査の記録(設計担当が実行したもの)

実測の環境: 作業ツリーに、本体チェックアウト(`ef445b7`。クリーン)の `node_modules` へのシンボリックリンクを一時的に張った。終了後にリンクを削除した。一時テストファイル(`src/zz-probe-tmp.test.*`)、scratchpad の Rust プローブ、`dist/` も削除済み。一時テストは `npx vitest run src/zz-probe-tmp.test.ts(x)` で実行した。

| # | 実行したこと | 結果 | 使った箇所 |
| --- | --- | --- | --- |
| M1 | scratchpad に `engine` クレートへの path 依存を持つ Rust バイナリを作り、`cargo run --release -q` で `calc_shanten_sanma(…, 4)` を実行 | `19m147p258s12345z` → **5**。`19m149p19s123456z` → **1**。`119m19p19s123456z` → **0** | §3.2 |
| M2 | 一時 vitest で `generateResult`(東家・`tenho: true`・`localYaku: true`)→`classifyResult`→`engineStartShanten(view, 13, 0)` | `19m147p258s12345z`: `hora`・型は `shisanputa` のみ・**0**。`19m149p19s123456z`: `hora`・`shisanputa` のみ・**0**。`119m19p19s123456z`: `hora`・`kokushi` のみ・0 | §3.2 |
| M3 | M1 のバイナリで、既存テスト `tempai_closed_exact_win_prob` と同じ聴牌形 `h0` を使い、(a) `nuki_mode=false`・`u0` 全 0 (b) `nuki_mode=true`・`u0` は北(index 30)だけ 1。どちらも `max_draws=2` で `search`→`solve`(`values` の長さは `total_waits × 2 × e_count`。(b) は `e_count = 2` で 8) | (a)(b) とも `out=[1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]`。根の tenpai は 1.0 なのに、perTurn の1巡目・2巡目の tenpai が **0.0** になる | §3.3 |
| M4 | 一時 vitest で `computeEngine`(南家・北=共通役牌・赤0・`DEFAULT_ENGINE_OPTIONS`・18巡)を4パターンに実行 | §3.4 の表のとおり。全パターンが `ok`・perTurn 18行・tenpai 単調非減少 | §3.4 |
| M5 | 一時 vitest(happy-dom)で、親の `useLayoutEffect`・親の `useEffect`・`lazy` の子の `useEffect` の実行順を記録 | 初回(チャンク未読込): `parent-layout > parent-passive > child-passive`。**2回目(読込済み): `parent-layout > child-passive > parent-passive`** | §4.3 |
| M6 | 一時 vitest で、**実際の UI と同じ `engineOptionsOf({detailed:false, draws:18})`**(=`{tegawari:true, backtrack:true, diffSlack:0, oneShantenSlack:true}`。実行時に出力して確認)を使い、`computeEngine`(南家・`rule = {...DEFAULT_RULE, north:'yakuhai', red:0}`)で全候補・全巡の ev(`c.ev` と `c.perTurn[*].ev`)の最大を測った | ポン1m+`999p123s78s555s` → **861.6**(旧案。不適)。ポン1m・9m・1p+`123s47s` → 544.6。同+`234s58s` → 373.7。同+`234s45s` → 675.8。**ポン1m+`24p68p24s68s3p7s9p`(14枚・11候補)→ 0.00**(採用)。13枚のポン1m+`24p68p24s68s35p` → 0.00 | §4.4・172-AC8 |
| M7 | `npm run build` → `dist/index.html` の `<script type="module" src>` が指す JS を `gzip -9 -c … \| wc -c`(2回) | `assets/index-CdyEr68T.js` **131,293 B**(2回同値。`modulepreload` なし)。遅延チャンク `EngineScreen-BgtUVAYQ.js` 11,646 B、`HelpScreen-Y4tca8WQ.js` 4,223 B | §6 |
| M8 | 一時 vitest で、14枚 `19m147p258s12345z3p`・`19m149p19s123456z3p`(東家・`tenho: true`・`localYaku: true`)を `generateResult`→`classifyResult`→`engineStartShanten(view, 14, 0)`、および `computeEngine`(`engineOptionsOf` 概算) | 両方とも `kind: 'discard'`。`discards` は **打 3p の1件だけで、`next` は `shisanputa` だけの `hora`**。開始向聴は **0**(入口が出る)。エンジンは前者が `out-of-range`、後者が `ok`(14候補。国士の1向聴として計算) | §3.2.2 |

M3 の (a) は `m0` の取りこぼし、(b) は `m1`(`rinshan_mass`)の取りこぼしを示す。(b) では、1巡目 e=0 で北を引いて `rinshan_mass[e=1]` に移った質量が、e=1 で `total_c = 1 − 1 = 0` になって捨てられている。

M5 は、確定事項 H7 の理由を実測で裏付ける。App の `useEffect` では、2回目以降の遷移で HelpView の `scrollIntoView` を後から打ち消してしまう。`useLayoutEffect` なら阻害しない。

M6 の旧案が不適だった理由: `compute.ts` は全候補の最大向聴を `sRefCommon` とする。`oneShantenSlack && sRef === 1` のとき、実効 diffSlack を `max(diffSlack, 1)` にする。ポン1m+`999p123s78s555s` は打9pで聴牌、打1sで1向聴になるため `sRef = 1` となり、概算でも実効 diffSlack が 1 になる。初版の M6 は `diffSlack:0` を直接渡しており、UI の条件と違っていた。採用した手の `sRefCommon` の確認方法は、`calc_shanten_sanma` の14枚換算の値(1)と ev の最大(0)だけである。候補ごとの向聴は測っていない。採用の根拠は、UI と同じオプションで ev が 0 になったことに限る。

### 1.4 外部事実の確認記録

本設計は新しい外部依存(パッケージ・Actions・イメージ)を導入しない。前提にした外部ツールと、その振る舞いを次に記録する。

| 対象 | 実行したコマンド | 結果 |
| --- | --- | --- |
| React のバージョン | `package-lock.json` の `"node_modules/react": {` の次行を grep | `19.3.1`(`react-dom` も `19.3.1`) |
| vitest・happy-dom・vite のバージョン | 同様に `package-lock.json` を grep | vitest `3.2.7`、happy-dom `21.0.4`、vite `6.4.4` |
| React の効果の実行順(M5) | 一時ファイル `src/zz-probe-tmp.test.tsx`(`// @vitest-environment happy-dom`)を作り、`npx vitest run src/zz-probe-tmp.test.tsx` を実行 | M5 の順序を出力。jsdom はこの環境に入っていない(`@vitest-environment jsdom` は `Cannot find package 'jsdom'` で失敗)。既存のテストと同じ happy-dom を使う |
| cargo | `cargo --version`、および M1・M3 の `cargo run --release -q` | `cargo 1.99.1`。`engine` クレートはネイティブでビルド・実行できた |
| `cargo test` | **未実行** | 未確認。製造・検収で 173-AC6 として実行する |
| wasm-pack | `wasm-pack --version` | `0.15.0`。`npm run build:wasm` は**未実行**(本体チェックアウトの `wasm/*/pkg` を使った)。未確認 |
| vite build | `npm run build`(M7) | 成功。`dist/sw.js` 等が生成された |
| vite preview | **未実行** | 未確認。検収で 172-AC7・AC8 として実行する |

## 2. 変更対象ファイル一覧

| Issue | ファイル | 変更 |
| --- | --- | --- |
| #173 | `src/engine/client.ts` | Worker 生成の同期例外を error 応答に変換する |
| #173 | `src/engine/client.test.ts` | コンストラクター例外のテストを追加する |
| #173 | `src/ui/engine/engine-run.test.ts` | 実クライアントと例外を投げる Worker で、状態遷移のテストを追加する |
| #173 | `src/ui/result/engine-entry.ts` | 十三不搭だけの `hora` を除外する(13枚・14枚とも。H2・H12) |
| #173 | `src/ui/result/engine-entry.test.tsx` | 回帰テストを追加する |
| #173 | `wasm/engine/src/dp.rs` | 前進計算で `total_c == 0` のとき質量を保存する |
| #173 | `wasm/engine/src/lib.rs` | Rust 単体テストを追加する(`mod tests`) |
| #173 | `src/engine/engine.test.ts` | 境界群 C に4パターンを追加する |
| #172 | `src/ui/engine/engine-run.ts` | `failed.key`・`visibleRunState`・`EngineRunner.restore` |
| #172 | `src/ui/engine/use-engine-run.ts` | キーが変わったときに復元する |
| #172 | `src/ui/engine/engine-run.test.ts` | `visibleRunState`・`restore` のテストを更新・追加する |
| #172 | `src/ui/engine/engine-view.test.tsx` | `failed` の型変更に合わせて `key` を付ける(期待値は変えない) |
| #172 | `src/ui/screen/EngineScreen.test.tsx` | キャッシュ復元・失敗表示の回帰テストを追加する |
| #172 | `src/ui/App.tsx` | `AppContent` に `useLayoutEffect` を追加し、`AppContent` を名前付き export にする |
| #172 | `src/ui/app-scroll.test.tsx`(新規) | 遷移時スクロールの順序テスト |
| #172 | `src/ui/engine/chart-series.ts` | 点の軸の上端の下限を 100 にする |
| #172 | `src/ui/engine/chart-series.test.ts`・`turn-chart.test.tsx` | テストを追加する |

上記以外は変更しない(特に `wasm/decomposer/src/counts.rs`・`.github/workflows/*`・`src/core/`)。

## 3. Issue #173 の設計

### 3.1 #173-1 Worker 生成の同期例外(`src/engine/client.ts`)

現状の問題:

- `requestEngine` 内の `worker = spawnWorker()` は `new Promise` の外にある。`new Worker(...)` が同期例外を投げると、`requestEngine` 自体が例外を投げる
- `engine-run.ts` の `run` は、`emit(running)`・`setIntervalFn` の後に `client.requestEngine(req).then(...)` を呼ぶ。このため例外は `.then/.catch` に届かず、`running` とタイマーが残る

変更(シグネチャは変えない):

```ts
// requestEngine 内。取り消し処理の後
if (!worker) {
  try {
    worker = spawnWorker();
  } catch (e) {
    return Promise.resolve({
      id: req.id,
      type: 'error',
      message: `worker-spawn-failed: ${e instanceof Error ? e.message : String(e)}`
    });
  }
}
```

- `message` は `'cancelled'` にしてはならない。`'cancelled'` だと engine-run が idle 扱いにして、失敗表示が出なくなる
- 上記の接頭辞付き文字列は内部用で、画面には出ない。engine-run は `'cancelled'` 以外の error を `{status:'failed', reason:'error'}` にし、既存の `FAIL_MESSAGES.error` を表示する。文言は追加しない(H1)
- 例外のときは `worker` も `pending` も未設定のまま残る。次の要求で生成を再試行する(「失敗した Worker は次の要求で作り直す」という既存の方針と同じ)
- `postMessage` の同期例外(Promise executor 内)は本 Issue の範囲外とする(§9 残留リスク)

### 3.2 #173-2 十三不搭だけの `hora` の入口判定(`src/ui/result/engine-entry.ts`)

ルールの前提は [mahjong-rules.md](../mahjong-rules.md) §4.2.1・§4.2.2 のとおりで、本 Issue は解釈を変えない。十三不搭は、第一ツモ時・鳴きなし・天和/地和の入力時に成立する。国士無双の形を満たす手には付かない。

#### 3.2.1 13枚の `hora`(確定 H2)

根拠:

- `src/core/result.ts` は、13枚で `rule.localYaku && options.tenho && 副露なし` のとき、`generateShisanputaHora` の結果を `hora` に混ぜる。十三不搭の和了が1つでもあれば `hora-shanten`/`hora` を返す
- 一方、エンジン(`compute.ts`)は `calc_shanten_sanma` だけで開始向聴を決め、十三不搭を知らない

M1・M2 で次の食い違いを確認した。

- `19m147p258s12345z`: UI は開始向聴 0 として入口を出すが、エンジンは向聴 5 で `out-of-range` を返す
- `19m149p19s123456z`: UI は 0 だが、エンジンは向聴 1 として**計算してしまう**。入口(聴牌)と結果(1向聴)が食い違う

変更:

```ts
/** 和了候補がすべて十三不搭か(シミュレーターの聴牌と同一視しない) */
const isShisanputaOnly = (hora: readonly { type: string }[]): boolean =>
  hora.length > 0 && hora.every(h => h.type === 'shisanputa');

case 'hora':
  return size === 13 && view.hora.length > 0 && !isShisanputaOnly(view.hora)
    ? 0
    : null;
```

- 十三不搭以外の和了(`mentsu`・`chitoitsu`・`kokushi`)を1つでも含めば、従来どおり 0 を返す(H2)
- 実物調査の補足: 実例は見つからなかった。理由は次のとおりで、混在時の分岐は合成した `ResultView` で検証する(173-T4)
  - `generateShisanputaHora` は国士聴牌形では空を返す
  - `isShisanputa` は、対子が1つで塔子がない形を要求する
  - このため、通常の聴牌形・七対子聴牌形と十三不搭が同じ13枚で同時に成立する手はない(M2 の `119m19p19s123456z` は国士のみ)
- この変更は、`engineStartShanten` を使う2か所に効く。結果画面の入口(`EngineButton`)と、計算画面の `available`(`EngineScreen.tsx`)である。入口が出なければ計算画面の `available` も false になり、既存の「計算できません」を表示する(既存の挙動のまま)

#### 3.2.2 14枚の打牌候補の経路(H12)

同じ原因の問題が 14枚の打牌候補にもある(独立レビュー R5。M8 で実測)。

- `discardShanten`(`engine-entry.ts` 9–14 行)は、`d.next.info.type === 'hora'` なら無条件に 0 を返す
- `src/core/result.ts`(350–354 行)の `minsBy` も同じ基準で best を選ぶ。そのため `19m147p258s12345z3p` では、打 3p(十三不搭だけの `hora`)だけが `discards` に残り、入口が出る
- エンジンは同じ手で `out-of-range` を返す

設計(H12):

```ts
/** 打牌候補1件の打牌後の向聴数(聴牌・和了は 0)。十三不搭だけの和了は null(入口判定から除外) */
const discardShanten = (d): number | null => {
  if (d.next.type === 'tempai') return 0;
  if (d.next.info.type === 'hora') return isShisanputaOnly(d.next.info.hora) ? null : 0;
  return d.next.info.shanten;
};

case 'discard': {
  if (size !== 14) return null;
  const values = view.discards.map(discardShanten).filter((s): s is number => s !== null);
  if (values.length === 0) return null;
  const min = Math.min(...values);
  return min <= ENGINE_MAX_SHANTEN ? min : null;
}
```

- `src/core/result.ts` は変更しない(統括方針)
- トレードオフ: `core` の `minsBy` は best(最小向聴)の候補だけを `discards` に残す。十三不搭だけの候補が best を占めると、他の候補(例: 国士の1向聴)があっても入口判定には現れない。このため、`19m149p19s123456z3p` は入口が出なくなる。エンジン単体ならこの手を1向聴として計算できる(M8)が、その経路は失われる。これを防ぐには `core/result.ts` の `minsBy` の基準を変える必要があり、H12 により採らない

### 3.3 #173-3 前進計算の未見牌 0 枚の境界(`wasm/engine/src/dp.rs`)

- 後退 DP(`dp.rs` 147–151 行)は、聴牌状態で `total_c == 0` のとき `dp = 1.0`(聴牌のまま)とする
- 前進計算(313–315 行)は、同じ条件で質量を捨てて `continue` している。このため `perTurn.tenpai` が根の tenpai(1.0)より小さくなる(M3: 1.0 → 0.0)

変更(聴牌状態の分岐だけ。H3・H11):

```rust
if total_c == 0 {
    next_mass[sid * e_count + e] += m0 + m1;
    continue;
}
```

- 非聴牌状態の分岐(358–360 行)の同形の `continue` は変更しない(H11)。非聴牌の質量は perTurn の tenpai(`tempai_states` の質量の和)・win・ev のいずれにも寄与しないため、出力は変わらない
- 修正後は、M3 の (a)(b) とも `out` が `[1, 0, 0, 1, 0, 0, 1, 0, 0]`(perTurn の tenpai がすべて 1)になる見込み。**修正後の実挙動は未確認**で、製造が 173-T6 で確認する
- UI からは到達できない(三麻の山が尽きる入力を作れない)。画面の挙動は変わらない

Rust 単体テスト(`wasm/engine/src/lib.rs` の `mod tests` に2件追加する。テスト名は製造が決めてよい):

1. 例 `forward_keeps_tempai_mass_when_wall_empty`(`m0` の検知)
   - 入力: 既存の `tempai_closed_exact_win_prob` と同じ `h0`・`limits`。`u0 = [0; 34]`。`search(&h0, &h0, 4, &u0, &limits, false, 2, true, true, 2, s0)`。`values` は 1000.0 を `total_waits() * 2` 個(`e_count = 1`)
   - 判定: `out.len() == 9`。`out[0]`・`out[3]`・`out[6]` が 1.0(誤差 1e-12)。win・ev(`out[1]`・`out[2]`・`out[4]`・`out[5]`・`out[7]`・`out[8]`)が 0
2. 例 `forward_keeps_rinshan_tempai_mass_when_wall_empty`(`m1` の検知)
   - 入力: 同じ `h0`。`u0` は北(index 30)だけ 1、他は 0。`nuki_mode = true`。`search(&h0, &h0, 4, &u0, &limits, true, 2, true, true, 2, s0)`。`values` は 1000.0 を `total_waits() * 2 * e_count` 個(M3 の実測では `e_count = 2` で 8 個)
   - 判定: 1 と同じ(perTurn の tenpai `out[3]`・`out[6]` が 1.0)
   - 修正で `m1` の加算を落とすと、このテストが失敗する(M3 (b) で、修正前は 0.0)

### 3.4 #173-4 境界入力の自動テスト(`src/engine/engine.test.ts` の `describe('C. 境界・範囲')`)

- 既存のヘルパー(`parseHand`・`southTable`・`yakuhaiRule`・`OPTS_DEFAULT`・`assertPerTurnValid`・`must`)を使う。`remainingDraws` は 18
- 期待値は修正前のコードでの実測(M4)。これらの入力は `total_c == 0` に到達しないため、修正後も同じ値になる見込み
- テスト記号は既存の連番に合わせる(ヘッダー参照)

| ID | 入力 | 期待(実測 M4) |
| --- | --- | --- |
| F31-C7(4副露) | (a) 13枚: `hand: '1z'`、`melds` はポン 1m・9m・1p・9p (b) 14枚: `hand: '1z2z'`、同じ4副露 | (a) `ok`・候補1件・`tenpai` 1・`win` > 0(実測 0.4388)・`ev` > 0 (b) `ok`・候補2件(打 1z・打 2z)・各 `tenpai` 1・`win` > 0(実測 0.4422) |
| F31-C8(暗槓を含む門前手) | (a) 13枚: `hand: '999m123456p1z'`、`melds: [{type:'kan', tile:1m, closed:true}]` (b) 14枚: `hand: '999m123456p1z2z'`、同じ暗槓 | (a) `ok`・候補1件・`tenpai` 1・`perTurn[0].ev` > 0(門前扱いで立直・ツモが付く。実測 111.70) (b) `ok`・候補9件・打 1z と打 2z の `tenpai` が 1 |
| F31-C9(抜き北4枚。`e_max = 0`) | `rule: {...DEFAULT_RULE, north:'nukidora', red:0}`、`hand: '111999m123456p1z'`、`nuki: 4` | `ok`・候補1件・`tenpai` 1・`win` > 0(実測 0.4531) |
| F31-C10(待ちがすべて見えている14枚の聴牌候補) | `hand: '111999m123456p1z2z'`、`dora: '1z1z1z'`(表示牌で 1z の残りが 0 枚) | `ok`・候補10件。打 2z の候補(1z 単騎で残り 0 枚)は `tenpai` 1・`win` 0・`ev` 0、全 perTurn の `tenpai` ≈ 1(`toBeCloseTo(1, 12)`。実測 0.9999999999999996) |

- 全パターンで `assertPerTurnValid(res, 18)` を通す(perTurn 18行・tenpai 単調非減少等の既存の検査)
- 浮動小数は `toBeCloseTo` で比べる。`toBe(1)` は使わない(実測で 1 − 4e-16 程度の誤差がある)
- `melds` の書式は既存の F31-B2 にならう

## 4. Issue #172 の設計

### 4.1 #172-1 詳細計算キャッシュの復元(`engine-run.ts`・`use-engine-run.ts`)

`EngineRunner` にメソッドを1つ追加する。

```ts
export interface EngineRunner {
  // 既存: getState / subscribe / run / cancel / dispose
  /**
   * 表示上 idle(visibleRunState が idle)で、cache に key と一致する結果があれば復元する。
   * running 中は何もしない
   */
  restore: (key: string) => void;
}
```

実装:

1. `state.status === 'running'` なら何もしない
2. `visibleRunState(state, key).status !== 'idle'` なら何もしない
3. `cache.get(key)` が null でなければ、その値を `emit` する

`useEngineRun` に次を追加する。`useLayoutEffect` を使うのは、key が変わった描画のペイント前に復元し、idle が一瞬表示されるのを防ぐためである。

```ts
useLayoutEffect(() => {
  runner.restore(key);
}, [runner, key]);
```

- 初回マウントの `initial: defaultEngineCache.get(key)` は残す(初回の描画から結果を出すため)
- 「詳しく」の選択自体はヘルプ往復で保持しない(H5)。再訪後は概算が選ばれた状態になり、利用者が「手替わりを詳しく」を選び直したときに復元される
- キャッシュは直近1件だけ(既存仕様)。直近1件と一致しない key は復元されない

### 4.2 #172-2 失敗表示の残留(`engine-run.ts`)

```ts
| { status: 'failed'; reason: EngineFailReason; key: string };

export const visibleRunState = (state: EngineRunState, key: string): EngineRunState =>
  (state.status === 'done' || state.status === 'failed') && state.key !== key
    ? IDLE_STATE
    : state;
```

- `run(req, key)` の `.then`/`.catch` で作る `failed` には、すべてその実行の `key` を入れる(`reason: 'error'`・`out-of-range`・`not-applicable`、`.catch` の分も)
- `running` には key を持たせない(H6)
- `failed` はキャッシュしない(既存どおり、`cache.set` するのは `done` だけ)
- 挙動(H10): 概算で失敗 →「手替わりを詳しく」に切り替えると idle(「計算する」ボタン)になる。概算に戻すと、runner の状態は失敗のままなので、失敗表示が再び出る
- 型の変更に伴い、`failed` を直接組み立てている箇所に `key` を加える。`engine-view.test.tsx`(127・133・136・139 行)と、`engine-run.test.ts`(132 行の期待値)である。表示の期待値は変えない

### 4.3 #172-3 画面遷移時のスクロール位置(`src/ui/App.tsx`)

`AppContent` に次を追加する。テストのため、`AppContent` は名前付き export にする。

```ts
export function AppContent(): React.JSX.Element {
  const { screen } = useAppState();
  const prevScreen = useRef(screen);
  useLayoutEffect(() => {
    if (prevScreen.current === screen) return;
    prevScreen.current = screen;
    window.scrollTo(0, 0);
  }, [screen]);
  // 以降は既存の分岐のまま
}
```

- 全画面遷移(メインへ戻る場合を含む)で先頭へ戻す。位置は復元しない(H7)
- 初回マウント(アプリ起動・再読み込み)では呼ばない(H9)。前回値と比べる実装にしているのは、開発時の `StrictMode` で効果が2回走っても初回に呼ばないためである
- 順序の根拠(M5): `useLayoutEffect` は、同じコミットの受動効果より先に走る。HelpView の `#help-engine` への `scrollIntoView` は受動効果(`HelpScreen.tsx` 46–52 行)である。したがって、どちらの遷移でも `scrollTo(0,0)` → `scrollIntoView` の順になる
  - 初回: Suspense の fallback を経て、後から HelpScreen がマウントされる
  - 2回目: 遅延チャンクが読込済みで、同じコミットに HelpScreen がマウントされる
- `useEffect` にすると、2回目で `scrollIntoView` → `scrollTo(0,0)` の順になり、ヘルプの節への移動を打ち消してしまう

### 4.4 #172-4 低期待値グラフの縦軸目盛り(`src/ui/engine/chart-series.ts`)

```ts
/** 点の軸の上端の下限(1・2・5×10^k で 100 以上はすべて 4 で割り切れ、目盛り 5 本が整数になる) */
export const POINT_AXIS_MIN_MAX = 100;
// toCandidateSeries 末尾
return { series, axis: { kind: 'point', max: niceMax(Math.max(max, POINT_AXIS_MIN_MAX)) } };
```

- `niceMax` 自体は変えない(既存テストの `niceMax(0) === 1` 等を維持する)
- `TurnChart.tsx` の `Y_TICKS`(0・0.25・0.5・0.75・1)と `Math.round` も変えない。上端が 100 以上なら `t * axis.max` は常に整数になり、重複・不揃いがなくなる
  - 上端 1: `0,0,1,1,1` → `0,25,50,75,100`
  - 上端 50: `0,13,25,38,50` → `0,25,50,75,100`
- 率の軸(`PERCENT_AXIS`)は変えない
- 色・トークンは変更しない(06号)
- 本番での再現手(M6。UI と同じ概算のオプションで実測): ポン1m+手牌 `24p68p24s68s3p7s9p`(14枚)、設定は「北の扱い: 共通役牌」「赤ドラ: 赤なし」。全候補・全巡の期待値の最大が 0 になる。修正前は上端 1(目盛り `0,0,1,1,1`)、修正後は上端 100 になる見込み

## 5. テスト一覧(Issue ごと)

| 記号 | Issue | ファイル | 内容 |
| --- | --- | --- | --- |
| 173-T1 | #173-1 | `client.test.ts` | `installMockWorker` に振る舞い `'throw'` を追加する(コンストラクターで `throw new Error('spawn')`)。`['throw', 'ok']` で次を確認する。(1) 1回目の `requestEngine(req(1))` が例外を投げず、`{id:1, type:'error'}` で解決し、`message` が `'cancelled'` でない (2) 2回目の `requestEngine(req(2))` が新しい Worker で `{id:2, type:'out-of-range'}` に解決する。**注意**: 既存の `MockWorker` は `behaviors[instances.length]` で振る舞いを決める。`instances.push` より前に throw すると生成回数が増えず、2回目も `'throw'` を引いてしまう。生成回数のカウンタは `instances` とは別に持ち、throw の前に進める |
| 173-T2 | #173-1 | `engine-run.test.ts` | 常に例外を投げる模擬 `Worker` を `vi.stubGlobal` で差し替える。`createEngineRunner({ createClient: createEngineClient, setIntervalFn/clearIntervalFn は記録用 })` で `run` し、マイクロタスクを消化した後に次を確認する。状態が `{status:'failed', reason:'error', key}` になり、登録したタイマーが `clearIntervalFn` で解除されている。`afterEach` で `vi.unstubAllGlobals()` を呼ぶ |
| 173-T3 | #173-2 | `engine-entry.test.tsx` | 東家・`tenho: true`・`localYaku: true` で、`19m147p258s12345z`・`19m149p19s123456z` を `generateResult`→`classifyResult` する。`kind: 'hora'` かつ全候補が `shisanputa` で、`engineStartShanten(view, 13, 0)` が null になる。`ResultPanel`(engineEntry あり)の HTML に `result-body__engine-button` が出ない |
| 173-T4 | #173-2 | `engine-entry.test.tsx` | (1) 合成した `ResultView`(`{kind:'hora', hora:[mentsu の要素, shisanputa の要素]}`。既存の hora 結果から要素を流用してよい)で `engineStartShanten(…, 13, 0) === 0` (2) 既存の `1199m123456p789s`(13枚聴牌)を `tenho: true`・`localYaku: true` で評価しても 0 |
| 173-T5 | #173-2 | 既存 | `engine-entry.test.tsx` の既存テストがすべて通る(十三不搭以外の 13枚 `hora` は 0 のまま) |
| 173-T8 | #173-2(H12) | `engine-entry.test.tsx` | (1) 東家・`tenho: true`・`localYaku: true` で `19m147p258s12345z3p` → `kind: 'discard'`、`engineStartShanten(view, 14, 0)` が null (2) 同条件で `19m149p19s123456z3p` も null(§3.2.2 のトレードオフ) (3) 合成した discard ビューで「十三不搭だけの hora の候補」と「1向聴の候補」が並ぶとき、1 を返す (4) 既存の 14枚(`1199m123456p789s5z` 等)の結果は変わらない |
| 173-T6 | #173-3 | `wasm/engine/src/lib.rs` | §3.3 の Rust 単体テスト2件(`m0` と `m1` の検知) |
| 173-T7 | #173-4 | `engine.test.ts` | §3.4 の F31-C7〜C10 |
| 172-T1 | #172-1 | `engine-run.test.ts` | `restore` の5ケース。(a) idle で cache が一致 → done に復元し、購読者に通知する (b) cache が不一致 → idle のまま (c) running 中 → 変化なし (d) 同じ key の done/failed を表示中 → 変化なし (e) key が不一致の failed を表示中で cache が一致 → done に復元する |
| 172-T2 | #172-1 | `EngineScreen.test.tsx` | 14枚の1向聴(`HAND_14_1SHANTEN`)で行う。「手替わりを詳しく」→「計算する」(`.engine-screen__run`)→ ok 応答(打牌ありの候補。既存テストの 14枚用モックにならい、`discard` が null でない `CandidateStat` を使う)で結果を表示 → ヘルプへ遷移(`open-help`)→ `navigate` で計算画面へ戻る。戻った時点で概算が選ばれ、`.engine-result` がない(idle)。「手替わりを詳しく」を選ぶと、**再計算せずに** `.engine-result`(14枚では `.engine-candidates` も)が表示され、`harness.requests()` の件数が 1 のまま。13枚用の `.engine-summary` は使わない(14枚では描画されない。`EngineResult.tsx` 191 行で分岐) |
| 172-T3 | #172-2 | `engine-run.test.ts` | `visibleRunState` の確認。key が一致する failed はそのまま、不一致の failed は idle、running は key に関係なくそのまま。`run` で得た failed には実行時の key が入る |
| 172-T4 | #172-2 | `EngineScreen.test.tsx` | 14枚の1向聴で、概算 →「計算する」→ `{type:'error', message:'x'}` の応答で `.engine-screen__error` が表示される →「手替わりを詳しく」に切り替える。切替後は次のすべてを満たす: `.engine-screen__error` がない、`.engine-screen__running` がない、`.engine-result` がない、`.engine-screen__run` がある。`isSlowRun` が真の条件なら `.engine-screen__note`(「時間がかかります」。idle のときだけ描画される)もある。`.engine-screen__run` は failed でも描画されるため、それだけでは idle と判定しない。さらに概算へ戻すと、`.engine-screen__error` が再び表示される(H10) |
| 172-T5 | #172-3 | `src/ui/app-scroll.test.tsx`(新規。`// @vitest-environment happy-dom`) | 下の「172-T5 の手順」を参照 |
| 172-T6 | #172-4 | `chart-series.test.ts` | 全候補・全巡の ev が 0 の候補群で、`toCandidateSeries(…, 'ev').axis` が `{kind:'point', max:100}`。最大 30 → 100、最大 150 → 200。既存の最大 10000 → 10000(既存テストを維持) |
| 172-T7 | #172-4 | `turn-chart.test.tsx` | `axis={{kind:'point', max:100}}` で描画した目盛りのラベルが `0,25,50,75,100` の5つで、重複しない |

172-T5 の手順:

- 描画するもの: `<AppStateProvider><AppContent/><dispatch を取り出す小部品/></AppStateProvider>`
- 準備: `window.scrollTo` と `Element.prototype.scrollIntoView` を記録用の関数に差し替え、呼び出し順を1つの配列に記録する
- happy-dom には `attachInternals` がない。HelpScreen・EngineScreen が Material Web の form-associated 要素を描画するため、`EngineScreen.test.tsx` 30–51 行と同じ `attachInternals` のシムが必要になる可能性が高い(必要ならファイル先頭に同じシムを置く)
- 手順と判定:
  1. 初回の描画だけでは `scrollTo` が呼ばれない(H9)
  2. `navigate` で engine へ遷移 → `scrollTo` が記録される
  3. `open-help`(focus engine・returnTo engine)→ HelpScreen の描画を待つ → 記録の末尾が `scrollTo` → `scrollIntoView` の順になる。この時点が遅延チャンクの初回読込
  4. `navigate` で engine へ戻る
  5. 再び `open-help` → 新たな記録が `scrollTo` → `scrollIntoView` の順になり、`scrollIntoView` の後に `scrollTo` がない(チャンク読込済みの2回目)
- 注意: HelpScreen を先に描画する別のテストを同じファイルに置かない(初回読込の条件が崩れるため)

## 6. バンドル予算(09号)

- 基準値: **131,293 B**(M7。`main` `ef445b7`、`assets/index-CdyEr68T.js`、gzip -9、2回同値。09号の現在の基準値と一致)
- 増分の積算:
  - `src/ui/App.tsx`(初回 JS): `useLayoutEffect`・`useRef` の import、効果1つ、`window.scrollTo` の呼び出し — 約 +60 B
  - `src/ui/result/engine-entry.ts`(初回 JS): `isShisanputaOnly` と、discard 経路の除外(H12)— 約 +60 B
  - 初回 JS に含めないもの: `client.ts`・`engine-run.ts`・`use-engine-run.ts`・`chart-series.ts` は、遅延チャンク(`EngineScreen-*.js`)か Worker 側に入る。`EngineScreen-*.js`(基準 11,646 B)は約 +100 B の見込み(参考記録)。WASM(`dp.rs`)も初回 JS に含めない
- 目標値: **131,420 B**(基準値 + 約 120 B)。超過しても不合格にしない。新規依存はない

## 7. 受け入れ条件

前提: Rust の変更を含むため、`npm run build:wasm` を実行してから行う。コミットは Issue ごとに分ける(#173 のコミット群 → #172 のコミット群。1つのコミットに両 Issue の変更を混ぜない)。

### 7.1 Issue #173

- [ ] **173-AC1** `git diff main --stat` に、`wasm/decomposer/src/counts.rs`・`.github/workflows/`・`src/core/` が含まれない
- [ ] **173-AC2** `npx vitest run src/engine/client.test.ts` で、173-T1 を含む全テストが通る。173-T1 で、1回目の要求が reject されず `type: 'error'`(`message !== 'cancelled'`)で解決すること、2回目が新しい Worker で成功することを、テストコードで確認する
- [ ] **173-AC3** `npx vitest run src/ui/engine/engine-run.test.ts` で 173-T2 が通る。例外のとき状態が `failed`(reason `error`)になり、タイマーが解除されている
- [ ] **173-AC4** `client.ts` の差分を読み、次の2点を確認する。Worker 生成の例外時に返す `message` が `'cancelled'` と一致し得ない。UI 文言(`FAIL_MESSAGES` 等)に追加・変更がない
- [ ] **173-AC5** `npx vitest run src/ui/result/engine-entry.test.tsx` で、173-T3・173-T4・既存テストが通る
- [ ] **173-AC5b** 同じコマンドで 173-T8 が通る。`engine-entry.ts` の差分で、14枚 discard 経路の除外が `discardShanten` と `discard` 分岐だけに収まっている
- [ ] **173-AC6** `cd wasm/engine && cargo test` で、173-T6 の2件を含む全テストが通る。製造は、修正前のコード(テストだけを入れた一時コミット等。`git stash` は使わない)で 173-T6 の2件が両方とも失敗することを確認し、最終報告に書く。さらに `m1` の加算を外した場合に 2件目が失敗することも確認して報告する。検収は、修正後に通過することだけを確認すればよい
- [ ] **173-AC7** `dp.rs` の差分が次の変更だけである: 前進計算の聴牌分岐の `total_c == 0` で、`continue` の前に `next_mass[sid * e_count + e] += m0 + m1;` を加える。非聴牌分岐(358–360 行)と後退 DP は変えない(H11)
- [ ] **173-AC8** `npx vitest run src/engine/engine.test.ts` で、F31-C7〜C10 を含む全テストが通る。C10 の打 2z の候補で `win === 0`・`ev === 0`、全 perTurn の tenpai が 1 に近い(`toBeCloseTo(1, 12)`)ことを、テストコードで確認する
- [ ] **173-AC9** `npm run test:engine-mc` が通る(エンジンの精度検証。前進計算の変更による回帰がない)

### 7.2 Issue #172

- [ ] **172-AC1** `npx vitest run src/ui/engine/engine-run.test.ts` で、172-T1・172-T3 が通る
- [ ] **172-AC2** `npx vitest run src/ui/screen/EngineScreen.test.tsx` で、172-T2・172-T4・既存テスト(F32-U4a〜U4d・U10a〜U10e・153-S1)が通る。テストコードで次の2点を確認する。172-T2: 戻った後に「手替わりを詳しく」を選んでも要求件数が増えず、`.engine-result` が表示される。172-T4: 切替後の idle 判定が `.engine-screen__error` の不在を含む
- [ ] **172-AC3** `npx vitest run src/ui/engine/engine-view.test.tsx` が通り、差分は `failed` への `key` の付与だけである(表示の期待値は変えない)
- [ ] **172-AC4** `npx vitest run src/ui/app-scroll.test.tsx` で 172-T5 が通る。テストコードで次を確認する。手順3・5で `scrollTo` の後に `scrollIntoView` が記録され、その後に `scrollTo` がない。手順1(初回の描画)で `scrollTo` がない
- [ ] **172-AC5** `App.tsx` の差分を読み、次の2点を確認する。`useEffect` ではなく `useLayoutEffect` を使っている。`HelpScreen.tsx` の `scrollIntoView` の効果を変更していない
- [ ] **172-AC6** `npx vitest run src/ui/engine/chart-series.test.ts src/ui/engine/turn-chart.test.tsx` で、172-T6・172-T7・既存テスト(`niceMax` の既存の期待値を含む)が通る
- [ ] **172-AC7(本番ビルド・スクロール)**
  - 準備: `npm run build` → `npx vite preview --port <空きポート>`(自分で起動したサーバーだけを、ポートを指定して停止する。01号)。ブラウザで `http://localhost:<port>/mj-3player-calc/` を **375×667**(幅×高さ)で開く。13枚の2向聴(例 `19m22p345p678s468s`)を入力して「計算」を押し、計算画面へ進む。計算画面で「計算する」を押し、結果を表示しておく
  - (a) 計算画面の「ヘルプ」でヘルプを開く。次のどちらかを満たせば合格: `document.getElementById('help-engine').getBoundingClientRect().top` が 0 以上で、ヘッダー(`.app-header` 等。実物のヘッダー要素の `getBoundingClientRect().bottom`)+ 8px 以下。または、`window.scrollY` が `document.documentElement.scrollHeight − window.innerHeight` との差 1px 以内(文書の下端でスクロールが止まった)で、かつ `window.scrollY > 0` で `#help-engine` が画面内にある
  - (b) 前提として、計算結果を表示した計算画面で `document.documentElement.scrollHeight > window.innerHeight` を確かめる(スクロールできる)。成り立たない場合は、より縦に長い結果の手(14枚入力等)で確認し、記録する。そのうえでヘルプを最下部までスクロールし(`window.scrollY > 0` を確認)、「戻る」で計算画面へ戻る。戻った計算画面で結果が表示されていて(キャッシュ復元)、`window.scrollY === 0` なら合格
  - (c) 計算画面で「ヘルプ」→「戻る」→ もう一度「ヘルプ」と進む(チャンク読込済みの2回目)。(a) と同じ判定で合格すること
  - (d) メイン画面で `scrollHeight > innerHeight` を確かめてから下へスクロールし(`scrollY > 0`)、設定画面を開くと `window.scrollY === 0`。設定画面をスクロールしてから戻ると、メイン画面も `window.scrollY === 0`。メイン画面がスクロールできない状態なら、手牌の入力などで結果を表示してスクロールできる状態にしてから確認する
- [ ] **172-AC8(本番ビルド・目盛り)**
  - 172-AC7 と同じプレビューで、設定の「北の扱い」を「共通役牌」、「赤ドラ」を「赤なし」にする
  - ポン 1m と手牌 `24p68p24s68s3p7s9p` の14枚を入力して「計算」を押し、計算画面で概算のまま「計算する」を押す(M6 で、UI と同じオプションで全候補・全巡の期待値 0 を実測済み)
  - 合格条件: 指標が期待値のグラフで、縦軸の目盛り(`.turn-chart__tick` のうち縦軸の5つ)が `0`・`25`・`50`・`75`・`100` で重複しない
  - 続けて、設定を既定に戻し、通常の14枚(例 `1199m123456p789s5z`)で計算する。期待値グラフの縦軸の目盛りが、等間隔で重複しない5つの整数になること
- [ ] **172-AC9** 172-AC7・AC8 のスクリーンショット(375×667)を検収記録に残す

### 7.3 共通

- [ ] **AC-C1** `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` がすべてエラーなし
- [ ] **AC-C2** 初回 JS を 09号の方法で実測し、PR 本文に記録する(基準値 131,293 B、実測値、増分、積算(約 +120 B)との差)。超過しても不合格にしないが、超過したときは意図しない取り込みがないかを先に調べる。`EngineScreen-*.js` の gzip サイズも参考に記録する
- [ ] **AC-C3** `git log main..HEAD` で、各コミットが #173 か #172 のどちらか一方の変更だけを含む
- [ ] **AC-C4** コード・ドキュメントの差分に、ホームディレクトリ名を含む文字列がない(docs も対象)

## 8. 要ヒアリング事項

なし。Q1〜Q3 は §1.1 の H9〜H11 に、Q4 は設計承認時に (A) で確定し H12 に移した(首席判断・オーナー委任、2026-11-28)。

## 9. 残留リスク・後続への引き継ぎ

- `client.ts` の `postMessage` の同期例外(構造化複製の失敗等)は、Promise executor 内で reject になる。engine-run の `.catch` で失敗表示になるが、`pending` が残る。次の要求で `cancelled` として解決されるため実害はない。本 Issue では扱わない
- #172-1 の復元は、直近1件のキャッシュに依存する。「詳しく」で計算した後に別の key で計算すると、以前の「詳しく」の結果は復元されない(既存仕様)
- 172-T5 は遅延チャンクの初回読込を前提にする。同じテストファイルで HelpScreen を先に描画するテストを追加すると、初回の条件が崩れる。テストファイルは分けたまま保つ
- F31-C7〜C10 の数値(§3.4)は修正前のコードでの実測で、**修正後の実挙動は未確認**。#173-3 の修正後も変わらない見込みだが、異なった場合は、製造が期待値を変える前に統括担当へ報告する
- 172-AC8 の牌姿は、M6(修正前のコード、`engineOptionsOf` の概算)で ev 0 を確認した。本番画面での縦軸上端 1(修正前)/100(修正後)は**実挙動未確認**
- 173-T2 は Worker をグローバルに差し替える。`afterEach` で必ず `vi.unstubAllGlobals()` を呼ぶ
