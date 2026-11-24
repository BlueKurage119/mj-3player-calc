# Issue #150・#151 計算画面の条件送信(#139 U-4)・画面離脱時 dispose(#139 U-10)の画面単位テスト追加 設計書

- 対象 Issue:
  - [#150](https://github.com/BlueKurage119/mj-3player-calc/issues/150) 計算画面の条件が client へ送られるところまでのテスト追加(#139 U-4)
  - [#151](https://github.com/BlueKurage119/mj-3player-calc/issues/151) 計算画面を離れたときの dispose を画面単位で検査するテスト追加(#139 U-10)
- 親・関連 Issue: Epic F3([#111](https://github.com/BlueKurage119/mj-3player-calc/issues/111) 聴牌確率・和了確率・期待値)、[#139](https://github.com/BlueKurage119/mj-3player-calc/issues/139) F3-2. UI統合(PR #149)
- 起点・PR base ブランチ: `origin/develop/v2.0`(起点コミット `871784569567d4d0534fa2dab8d3aebb815b8717`、統合ブランチ運用)
- 予定ブランチ名: `test/issue-150-151-engine-screen-tests`
- 版: 第3版(2026-11-23。第2版独立再レビュー指摘7件〔`FakeClientHarness.resolveLatest` 導入による `calls.splice(0)` との整合、2回目 `run()` での `dispose` 前提注記、`setupActions` の具体的アクション列挙、§6 #7 表と出力の完全一致化、`Slider` 配線・Vitest `happy-dom` 環境差異の §5 明記、WASM 読込失敗時の差し戻し方針追記〕を反映)
- 状態: **設計承認済み**(オーナー承認。製造方式: Swarm式)
- 設計担当のモデル: `Antigravity (Gemini 4 Argon)`
- 対象外: 製品コード(`src/**` の非テストファイル、`wasm/**`、`vite.config.ts` 等)の挙動・実装変更

---

## 1. 参照した資料と設計判断の根拠

### 1.1 参照した資料

| 資料 | 参照内容と導いた設計判断 |
| --- | --- |
| `gh issue view 150`・`gh issue view 151` | Issue #139(PR #149)検収で見つかったテストの穴(U-4 の画面操作→`EngineClient.requestEngine` 配線、U-10 の画面離脱操作→`EngineClient.dispose` 配線)を、製品コードの挙動を変えずに画面単位のテストで埋める |
| [docs/design/issue-139-ui.md](issue-139-ui.md) §4.1〜§4.5・§5.1・§9.1(U-4, U-7, U-9, U-10)・§9.2・§13.1〜§13.2 | 計算画面の条件仕様(「概算」M=0 / 「手替わりを詳しく」M=1、`oneShantenSlack: true` 固定、`remainingDraws: 18` 固定、13枚の聴牌・1向聴は計算方法の2択を出さず M=0 固定、14枚は開始向聴によらず2択を出す、表示巡目スライダーは1〜18・既定3で変更しても再計算しない、画面離脱時の `dispose` と再訪時のキャッシュ保持・破棄) |
| `src/ui/screen/EngineScreen.tsx` | `EngineScreenProps.createClient?: () => EngineClient` によるモック注入経路、`useAppState`・`useAppDispatch`・`useResult` との接続、`methodChoice`・`effectiveDetailed`・`conditions`・`key` の算出、`onRun`・`onBack`・`onOpenHelp`・`onDetailedChange`・`result.onTurnChange` の配線 |
| `src/ui/engine/EngineView.tsx`・`EngineResult.tsx`・`engine-view.test.tsx` | DOM 構造とクラス名・属性(実行・中止ボタン `.engine-screen__run`、戻るボタン `.engine-screen__back-button`、ヘルプボタン `.engine-screen__help-button`、計算方法ラジオグループ `role="radiogroup" aria-label="計算方法"`、巡目スライダー `.engine-result__slider`)および 3巡目(`draw: 15`)の表示フィクスチャ |
| `src/ui/engine/use-engine-run.ts`・`engine-run.ts`・`engine-request.ts`・`engine-estimate.ts` | `useEngineRun(key, createClient)` のアンマウント時クリーンアップ `useEffect(() => () => runner.dispose(), [runner])`、初回 `run` までの `createClient` 遅延呼び出し、2回目以降の `run` 冒頭での `cancelRun()` → `client?.dispose()` 呼び出し、モジュール内キャッシュ `defaultEngineCache` の保持と `clear()`、`isSlowRun` の判定表 |
| `src/ui/result/engine-entry.ts`・`engine-entry.test.tsx`・`bench/engine/hands.ts` | `parseTiles`(`../../../bench/engine/hands` から export)、`engineHandSize`・`engineStartShanten` の向聴数判定ロジックと既存テスト牌姿(`19m22p345p678s468s` 等) |
| `src/ui/App.tsx`・`src/ui/state/app-state.ts`・`AppStateProvider.tsx` | `AppContent` における `screen === 'engine'` 分岐による `<EngineScreen />` のマウント・アンマウント、`navigate`・`open-help`・`add-hand-tiles`・`remove-last-hand-tile`・`set-wind`・`add-indicator-tile`・`step` 等の `appReducer` アクション |
| `src/ui/calc/use-result.ts`・`result-state.ts`・`compute.ts` | `useResult()` が初回マウント後の `useEffect` で `import('./compute')` を非同期読込し、完了後に `resultState.status === 'ok'` となって `EngineScreen` の `available` が `true` に遷移するライフサイクル |
| `src/ui/expressive/ConnectedButtonGroup.tsx`・`src/ui/md/Button.tsx`・`IconButton.tsx`・`Slider.tsx` | ネイティブ `<button role="radio">` と Material Web カスタム要素(`<md-filled-button>`・`<md-outlined-button>`・`<md-icon-button>`・`<md-slider>`)のイベント発火と `happy-dom` 上での挙動(§1.3・§6 で実測) |
| 業務標準 [01](../rules/01-dev-workflow-protocol.md)・[02](../rules/02-design-protocol.md)・[05](../rules/05-verification-protocol.md)・[07](../rules/07-mahjong-rule-protocol.md)、指導文書 [G-05](../rules/advisory/G-05-test-effectiveness-verification.md)・[G-10](../rules/advisory/G-10-design-consistency-pitfalls.md) | テスト命名規約(`<Issue記号>-<記号と番号>: <説明>` → `F32-U4a` 等)、完全一致アサーションの原則、期待値のリテラル記述、red 先行確認と対照実験付きミューテーション判定手順 |

### 1.2 ヒアリング済みの確定事項(再検討・上書き禁止)

| # | 項目 | 確定内容 | 本書での反映先 |
| --- | --- | --- | --- |
| 1 | DOM テスト基盤(案B採用) | `happy-dom` と `@testing-library/react` を `devDependencies` に追加する。既存テストは既定の `node` 環境のまま維持し、対象テストファイル先頭の `@vitest-environment happy-dom` で環境を指定する | §1.3・§2.1・§2.2・§3・§6 |
| 2 | 起点・base ブランチ | `origin/develop/v2.0`(統合ブランチ運用) | ヘッダー・§3 |
| 3 | Issue のまとめ方(案C採用) | DOM テスト基盤導入・#150・#151 を 1 本の設計書・1 本のブランチ・1 本の PR にまとめる | 全体・§2・§3 |
| 4 | #151「実行中でない場合に余計な中止が呼ばれない」の解釈(案A採用) | 未実行(`idle`)のまま画面を離れたときに `createClient` / `client.dispose` が呼ばれないことを検査対象とする。計算完了後(`done` / `failed`)の離脱では Worker 解放のため `client.dispose` が呼ばれる現行挙動を維持する(製品コードの挙動は変更しない) | §2.3(`F32-U10d`・`F32-U10e`)・§3 |

### 1.3 実コードと `happy-dom` 実測から確認した設計上の要点

1. **Material Web カスタム要素と `happy-dom` の `HTMLElement.prototype.attachInternals`**:
   - `EngineView`・`EngineResult` が使用する Material Web 要素(`<md-filled-button>`・`<md-outlined-button>`・`<md-icon-button>`・`<md-slider>`)は、`@material/web` 内部で `mixinFormAssociated(mixinElementInternals(LitElement))` を継承しており、要素生成(`document.createElement`)およびプロパティ更新時の `requestUpdate()` 内で `this.attachInternals()` を呼び出す。
   - 一方、`happy-dom@21.0.4` の `HTMLElement.prototype` には `attachInternals` が未実装である(`typeof HTMLElement.prototype.attachInternals === 'undefined'`。§6 #6・#7 で実測)。
   - そのため、製品コードを変更せずに `happy-dom` 上で `EngineScreen` をマウントするには、テストファイル(`src/ui/screen/EngineScreen.test.tsx`)のモジュールトップレベルで `HTMLElement.prototype.attachInternals` の最小シム(`setFormValue`・`setValidity`・`checkValidity`・`reportValidity`・`form: null` 等を返す関数)を定義する必要がある。同シムにより Material Web 要素の生成・属性更新・`fireEvent.click`・`fireEvent.input` がすべて正常に動作することを §6 #7 で実測確認した。
2. **Material Web 要素の DOM 取得とイベント発火**:
   - `<md-filled-button class="engine-screen__run">計算する</md-filled-button>`(実行中は `<md-outlined-button class="engine-screen__run">中止</md-outlined-button>`)、`<md-icon-button label="戻る" class="engine-screen__back-button">`、`<md-icon-button label="ヘルプ" class="engine-screen__help-button">` は、Shadow DOM 内部に `<button>` を持つカスタム要素である。
   - `@material/web` の `mixinDelegatesAria` はブラウザ条件(`isServer === false`)で動作するとホスト要素の `aria-label` 属性を `data-aria-label` 属性へ移し替えるため、CSS セレクタ `[aria-label="戻る"]` は一致しない(§6 #7 で実測)。一方、専用クラス名(`.engine-screen__run`・`.engine-screen__back-button`・`.engine-screen__help-button`・`.engine-result__slider`)は常にホスト要素に付与されており(`isServer` の真偽にかかわらず有効)、ホスト要素に対する `fireEvent.click(el)` で React 19 の `onClick` ハンドラが確実に 1 回発火する(§6 #7 で実測)。
   - `ConnectedButtonGroup`(`src/ui/expressive/ConnectedButtonGroup.tsx`)は Light DOM のネイティブ `<div role="radiogroup" aria-label="計算方法">` と `<button type="button" role="radio" aria-checked={isSelected}><span>{opt.label}</span></button>` で描画されるため、`getByRole('radio', { name: '概算' })` / `getByRole('radio', { name: '手替わりを詳しく' })` で取得し `fireEvent.click` で選択状態を切り替えられる。
   - `<md-slider class="engine-result__slider">` ホスト要素に対して `slider.value = 10; fireEvent.input(slider);` を実行すると、ホスト要素の `input` イベントリスナーが発火して `Number(slider.value)` から `10` を読み取れることを §6 #7 で実測した。`Slider` ラッパー(`src/ui/md/Slider.tsx` 51〜63行)は `useEffect` で同ホスト要素に `el.addEventListener('input', () => onValueChange(Number(el.value)))` を登録する実装であるため、同操作で `EngineResult` → `EngineScreen` の `onTurnChange(10)` が呼ばれる設計となる(`Slider` ラッパーおよび `EngineScreen` を通した結合動作は §5 に実挙動未確認として記載し、製造時に確認する)。
3. **`useResult()` の非同期読み込みと初期状態の投入順序**:
   - `EngineScreen` は内部で `useResult()`(`src/ui/calc/use-result.ts`)を呼び、`useEffect` 内の動的 `import('./compute')` が解決するまで `resultState.status === 'loading'`(`available === false`)となる。テストでは `waitFor` で `.engine-screen__run` の出現を待ってから画面操作を行う設計とする(Vitest の `happy-dom` 環境上での `EngineScreen` 全体の描画と `useResult()` の動的 import 解決は §5 に実挙動未確認として記載し、製造時に確認する)。
   - また、`useEngineRun(key, createClient)`(`src/ui/engine/use-engine-run.ts` 26〜30行)は `EngineScreen` の初回マウント時の `useState` 初期化関数で `defaultEngineCache.get(key)` を参照する。そのため、テストハーネス(`TestEngineHost`)では `AppStateProvider` の初期状態(`screen: 'main'`)のうちに手牌・卓・ルール等のセットアップ用アクションを `dispatch` し、続けて `{ type: 'navigate', screen: 'engine' }` を `dispatch` して `state.screen === 'engine'` になった時点で初めて `<EngineScreen />` をマウントする(`App.tsx` の `AppContent` と同一の画面遷移構造)。また、マウント後にテスト側から直接 `dispatch` を呼ぶ際は `@testing-library/react` の `act(() => { dispatch(...); })` で包む。
4. **Vitest の `globals: false` 設定とクリーンアップ**:
   - 本リポジトリの Vitest は既定の `globals: false`(`vite.config.ts` で `test.globals` 未設定)で動作するため、テストファイルの `beforeEach` / `afterEach` で明示的に `cleanup()`・`defaultEngineCache.clear()`・`window.localStorage.clear()` を呼び、DOM とモジュール内キャッシュのテスト間リークを防ぐ。

---

## 2. モジュール構成・型定義・テスト仕様

### 2.1 変更・新規作成するファイルと変更禁止ファイル

#### 変更・新規作成対象ファイル

| ファイル | 種別 | 変更内容 |
| --- | --- | --- |
| `package.json` | 変更 | `devDependencies` に `"@testing-library/react": "^16.3.3"` と `"happy-dom": "^21.0.4"` を追加 |
| `package-lock.json` | 変更 | `npm install` によるロックファイル更新(`@testing-library/dom` 等の peer/推移的依存を含む) |
| `src/ui/screen/EngineScreen.test.tsx` | 新規 | `@vitest-environment happy-dom` 指定による `EngineScreen` の画面単位テスト(#150: `F32-U4a`〜`F32-U4d`、#151: `F32-U10a`〜`F32-U10e`) |

#### 変更禁止ファイル

- `src/ui/screen/EngineScreen.tsx`・`src/ui/engine/**`・`src/ui/state/**`・`src/ui/App.tsx`・`src/core/**`・`src/engine/**`・`wasm/**` を含む**すべての製品コード**
- `vite.config.ts`・`tsconfig*.json`・`biome.json`(既存の `node` 環境テストおよびビルド設定を変更しない)
- 既存のテストファイル(`src/ui/engine/engine-request.test.ts`・`engine-run.test.ts`・`engine-view.test.tsx` 等)

### 2.2 テストハーネスとヘルパーの構成(`src/ui/screen/EngineScreen.test.tsx`)

ファイル先頭の第1行に `// @vitest-environment happy-dom` を記載し、対象ファイルのみ `happy-dom` 環境で実行する。`parseTiles` は `src/ui/result/engine-entry.test.tsx` 3行と同じく `../../../bench/engine/hands` から import する(`tsconfig.app.json` の `include: ["./src", "./bench"]` に含まれている)。

```tsx
// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';
import { type Dispatch, useEffect, useRef } from 'react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseTiles } from '../../../bench/engine/hands';
import { createDefaultRule } from '../../core/rule';
import type { EngineClient } from '../../engine/client';
import type {
  CandidateStat,
  EngineRequest,
  EngineResponse
} from '../../engine/types';
import { defaultEngineCache } from '../engine/engine-run';
import {
  type AppAction,
  type AppState,
  AppStateProvider,
  useAppDispatch,
  useAppState
} from '../state';
import { EngineScreen } from './EngineScreen';
```

#### 1. `HTMLElement.prototype.attachInternals` シム

```tsx
// happy-dom 21.x は HTMLElement.prototype.attachInternals 未実装のため、
// Material Web (@material/web) の form-associated 要素がマウント時に呼ぶ最小シムを定義する
if (
  typeof HTMLElement !== 'undefined' &&
  typeof HTMLElement.prototype.attachInternals !== 'function'
) {
  HTMLElement.prototype.attachInternals = function (): ElementInternals {
    return {
      form: null,
      labels: [] as unknown as NodeList,
      shadowRoot: this.shadowRoot,
      states: new Set() as unknown as CustomStateSet,
      validationMessage: '',
      validity: {} as ValidityState,
      willValidate: true,
      checkValidity: () => true,
      reportValidity: () => true,
      setFormValue: () => {},
      setValidity: () => {}
    } as unknown as ElementInternals;
  };
}
```

#### 2. フェイク `EngineClient` ファクトリ(`createFakeClientHarness`)と結果フィクスチャ(`sampleCandidate`)

`src/ui/engine/engine-run.test.ts` の `fakeClient` と同じ契約を持ち、`createClient` の呼び出し回数・`requestEngine` に渡された全 `EngineRequest` 履歴(`requests()`)・未解決の要求一覧(`calls`)と直近要求を解決する `resolveLatest(res)`・`dispose` の呼び出し回数(`disposedCount()`)を提供する。

- `src/ui/engine/engine-run.ts` 116行の `run()` は冒頭で `cancelRun()` → `client?.dispose()` を呼ぶため、同一ランナー上で 2 回目以降の `run()` が呼ばれると `dispose()` 内の `calls.splice(0)` により `calls` 配列が一度空になってから新しい要求が `calls` に push される(常に最新要求は `calls` の末尾 1 件になる)。
- そのため、テスト側で `calls[0]` / `calls[1]` のような添字アクセスを行わず、`resolveLatest(res)` メソッド(`calls.pop()` で直近の未解決要求を取り出して `resolve(res)` を呼ぶ。未解決要求が無い場合は例外を投げる)に統一する。また、送信された全リクエストの検査には `dispose()` で消去されない `requests()`(`allRequests`)を使う。

結果フィクスチャ `sampleCandidate` は `src/ui/engine/engine-view.test.tsx` 118〜125行と同じく `draw = 1..18` に対して `win = draw / 100`・`tenpai = draw / 50`・`ev = draw * 100` を持つ 13枚用候補(`discard: null`)とする。`docs/design/issue-139-ui.md` §13.2 のとおり、既定の表示巡目 3巡目(`displayTurn = 3`)は残り15回(`draw = 18 - 3 = 15`、`perTurn[14]`)を参照するため、要約には和了率 `15.0%`・聴牌率 `30.0%`・期待値 `1,500` が表示される。

```tsx
const sampleCandidate: CandidateStat = {
  discard: null,
  shanten: 2,
  tenpai: 0.36,
  win: 0.18,
  ev: 1800,
  perTurn: Array.from({ length: 18 }, (_, i) => {
    const draw = i + 1;
    return {
      draw,
      tenpai: draw / 50,
      win: draw / 100,
      ev: draw * 100
    };
  })
};

interface PendingCall {
  req: EngineRequest;
  resolve: (res: EngineResponse) => void;
}

interface FakeClientHarness {
  createClient: () => EngineClient;
  createdCount: () => number;
  disposedCount: () => number;
  calls: PendingCall[];
  requests: () => EngineRequest[];
  resolveLatest: (res: EngineResponse) => void;
}

const createFakeClientHarness = (): FakeClientHarness => {
  const calls: PendingCall[] = [];
  const allRequests: EngineRequest[] = [];
  let created = 0;
  let disposed = 0;

  const client: EngineClient = {
    requestEngine: req => {
      allRequests.push(req);
      return new Promise<EngineResponse>(resolve => {
        calls.push({ req, resolve });
      });
    },
    dispose: () => {
      disposed += 1;
      for (const c of calls.splice(0)) {
        c.resolve({ id: c.req.id, type: 'error', message: 'cancelled' });
      }
    }
  };

  const createClient = vi.fn(() => {
    created += 1;
    return client;
  });

  return {
    createClient,
    createdCount: () => created,
    disposedCount: () => disposed,
    calls,
    requests: () => allRequests,
    resolveLatest: res => {
      const latest = calls.pop();
      if (!latest) {
        throw new Error('未解決の要求が存在しません');
      }
      latest.resolve(res);
    }
  };
};
```

#### 3. 画面遷移ホスト(`TestEngineHost`)

`src/ui/App.tsx` の `AppContent` と同様に `AppStateProvider` の内側で `state.screen === 'engine'` のときだけ `<EngineScreen createClient={createClient} />` を描画し、それ以外の画面(`'main'`・`'help'` 等)に遷移したときは `<EngineScreen />` をアンマウントして遷移先の画面状態を表示する。Biome の `useExhaustiveDependencies` に適合するよう、初回マウント時の `setupActions` と `onReady` は `useRef` 経由で参照する。

```tsx
interface TestEngineHostProps {
  setupActions: readonly AppAction[];
  createClient: () => EngineClient;
  onReady?: (ctx: {
    getState: () => AppState;
    dispatch: Dispatch<AppAction>;
  }) => void;
}

function TestEngineHost(props: TestEngineHostProps): React.JSX.Element {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const stateRef = useRef(state);
  stateRef.current = state;
  const setupActionsRef = useRef(props.setupActions);
  const onReadyRef = useRef(props.onReady);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      for (const action of setupActionsRef.current) {
        dispatch(action);
      }
      dispatch({ type: 'navigate', screen: 'engine' });
      onReadyRef.current?.({
        getState: () => stateRef.current,
        dispatch
      });
    }
  }, [dispatch]);

  if (state.screen === 'engine') {
    return <EngineScreen createClient={props.createClient} />;
  }
  return (
    <div
      data-testid="other-screen"
      data-screen={state.screen}
      data-help-focus={state.helpFocus ?? ''}
      data-help-return={state.helpReturn}
    />
  );
}
```

### 2.3 テストケース一覧と検証内容

テスト名は業務標準05「テスト名の命名規約」に従い、`F32-<記号>: <説明>` とする。`beforeEach` と `afterEach` で `cleanup()`・`defaultEngineCache.clear()`・`window.localStorage.clear()` を実行する。

#### テスト用牌姿(実コード `generateResult` / `classifyResult` / `engineHandSize` / `engineStartShanten` / `isSlowRun` で検証済み。§6 #8 参照)

| 定数名 | 牌姿文字列(`parseTiles` 引数) | 枚数 (`size`) | `classifyResult.kind` | `startShanten` | `methodChoice` | `isSlowRun` (概算 / 詳しく) | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `HAND_13_2SHANTEN` | `'19m22p345p678s468s'` | 13 | `'shanten'` | `2` | `true` | `false` / `false` | `engine-entry.test.tsx` L51 と同じ 13枚2向聴(22p 雀頭 + 345p・678s の2面子 + 468s 搭子 + 1m・9m 孤立牌) |
| `HAND_13_1SHANTEN` | `'19m123789p12379s'` | 13 | `'shanten'` | `1` | `false` | `false` / `false` | 13枚1向聴(123p・789p・123s の3面子 + 79s 搭子 + 1m・9m 孤立牌) |
| `HAND_13_TEMPAI` | `'11m123789p12379s'` | 13 | `'hora'` | `0` | `false` | `false` / `false` | 13枚聴牌(11m 雀頭 + 123p・789p・123s の3面子 + 79s 嵌8s待ち) |
| `HAND_14_2SHANTEN` | `'19m22p345p678s468s1z'` | 14 | `'discard'` | `2` | `true` | `true` / `true` | `HAND_13_2SHANTEN` + 東(`1z`)。打 `1z` で最小2向聴 |
| `HAND_14_1SHANTEN` | `'19m123789p12379s1z'` | 14 | `'discard'` | `1` | `true` | `false` / `true` | `HAND_13_1SHANTEN` + 東(`1z`)。末尾1枚削除(`remove-last-hand-tile`)で `HAND_13_1SHANTEN` になる |
| `HAND_14_0SHANTEN` | `'11m123789p12379s1z'` | 14 | `'discard'` | `0` | `true` | `false` / `false` | `HAND_13_TEMPAI` + 東(`1z`)。末尾1枚削除(`remove-last-hand-tile`)で `HAND_13_TEMPAI` になる |

#### Issue #150: 計算画面の条件が client へ送られるところまでのテスト(`describe('F3-2 計算画面の条件送信 (Issue #150 / #139 U-4)')`)

| テスト記号 | テスト名 | 操作手順と完全一致アサーション |
| --- | --- | --- |
| `F32-U4a` | `F32-U4a: 13枚2向聴で概算(既定)と手替わりを詳しくを切り替えて計算すると、diffSlack(0/1)・oneShantenSlack(true)・remainingDraws(18)と入力一式が client に送られる` | 1. `setupActions` として以下の 6 アクション(`src/ui/state/app-state.ts` 64〜93行の `AppAction` 型に準拠)を渡して `EngineScreen` を描画し、`waitFor` で `.engine-screen__run` の出現を待つ:<br>`[{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }, { type: 'set-wind', field: 'round', wind: 'south' }, { type: 'set-wind', field: 'seat', wind: 'west' }, { type: 'add-indicator-tile', target: 'dora', tile: { type: 'p', n: 1 } }, { type: 'step', field: 'nuki', delta: 1 }, { type: 'step', field: 'nuki', delta: 1 }]`<br>2. 初期状態で `getByRole('radio', { name: '概算' })` の `getAttribute('aria-checked')` が `'true'`、`getByRole('radio', { name: '手替わりを詳しく' })` が `'false'` であることを確認し、`.engine-screen__run`(「計算する」)をクリックする。<br>3. `harness.requests()` の長さが `1` であり、`requests()[0]` が `{ id: 1, table: { round: 'south', seat: 'west', continue: 0, deposit: 0 }, input: { hand: HAND_13_2SHANTEN, melds: [], dora: [{ type: 'p', n: 1 }], uradora: [], nuki: 2 }, rule: createDefaultRule(), remainingDraws: 18, options: { tegawari: true, backtrack: true, diffSlack: 0, oneShantenSlack: true } }` と `toEqual` で完全一致することを検証する。<br>4. 1件目の応答を `await act(async () => { harness.resolveLatest({ id: 1, type: 'ok', candidates: [sampleCandidate], elapsedMs: 10 }); })` で解決して結果表示にした後、`getByRole('radio', { name: '手替わりを詳しく' })` をクリック(`aria-checked` が `'true'` に遷移)し、再度 `.engine-screen__run`(「計算する」)をクリックする。<br>5. `harness.requests()` の長さが `2` になり、`requests()[1]` が `{ id: 2, table: { round: 'south', seat: 'west', continue: 0, deposit: 0 }, input: { hand: HAND_13_2SHANTEN, melds: [], dora: [{ type: 'p', n: 1 }], uradora: [], nuki: 2 }, rule: createDefaultRule(), remainingDraws: 18, options: { tegawari: true, backtrack: true, diffSlack: 1, oneShantenSlack: true } }` と `toEqual` で完全一致することを検証する。<br>6. 2件目の応答を `await act(async () => { harness.resolveLatest({ id: 2, type: 'ok', candidates: [sampleCandidate], elapsedMs: 10 }); })` で解決後、`getByRole('radio', { name: '概算' })` をクリックして再度「計算する」をクリックすると、`requests()[2]?.options.diffSlack` が `0` に戻ることを検証する。 |
| `F32-U4b` | `F32-U4b: 14枚入力(1向聴・2向聴)では計算方法の2択が表示され、概算(diffSlack:0)と手替わりを詳しく(diffSlack:1)が14枚の手牌とともに client に送られる` | 1. `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_14_1SHANTEN }]` で `EngineScreen` を描画し、`waitFor` で `.engine-screen__run` の出現を待つ。<br>2. 14枚では開始向聴1でも計算方法の2択(`概算`・`手替わりを詳しく`)が表示され、概算時は `.engine-screen__note` が存在しない(`querySelector('.engine-screen__note') === null`)ことを確認し、初期状態(概算)で `.engine-screen__run` をクリックする。<br>3. `harness.requests()[0]` が `{ id: 1, table: { round: 'east', seat: 'east', continue: 0, deposit: 0 }, input: { hand: HAND_14_1SHANTEN, melds: [], dora: [], uradora: [], nuki: 0 }, rule: createDefaultRule(), remainingDraws: 18, options: { tegawari: true, backtrack: true, diffSlack: 0, oneShantenSlack: true } }` と `toEqual` で完全一致することを検証する。<br>4. 1件目の応答を `await act(async () => { harness.resolveLatest({ id: 1, type: 'ok', candidates: [sampleCandidate], elapsedMs: 10 }); })` で解決後、`getByRole('radio', { name: '手替わりを詳しく' })` をクリックすると `.engine-screen__note` の `textContent` が `'時間がかかります'` になることを確認し、`.engine-screen__run` をクリックする。<br>5. `harness.requests()[1]` が `{ id: 2, table: { round: 'east', seat: 'east', continue: 0, deposit: 0 }, input: { hand: HAND_14_1SHANTEN, melds: [], dora: [], uradora: [], nuki: 0 }, rule: createDefaultRule(), remainingDraws: 18, options: { tegawari: true, backtrack: true, diffSlack: 1, oneShantenSlack: true } }` と `toEqual` で完全一致することを検証する。<br>6. 続いて `cleanup()` の後、新しいハーネス `harness2` で `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_14_2SHANTEN }]` を `render` し、`.engine-screen__run` の出現を待つ。<br>7. 14枚2向聴では概算の時点から `.engine-screen__note` の `textContent` が `'時間がかかります'` であることを確認し、概算で「計算する」をクリックして `harness2.requests()[0]?.options.diffSlack` が `0`・`remainingDraws` が `18`・`input.hand` が `HAND_14_2SHANTEN` と `toEqual` で一致することを検証する。<br>8. 1件目の応答を `await act(async () => { harness2.resolveLatest({ id: 1, type: 'ok', candidates: [sampleCandidate], elapsedMs: 10 }); })` で解決後、`getByRole('radio', { name: '手替わりを詳しく' })` をクリックして「計算する」をクリックし、`harness2.requests()[1]?.options.diffSlack` が `1`・`remainingDraws` が `18`・`input.hand` が `HAND_14_2SHANTEN` と `toEqual` で一致することを検証する。 |
| `F32-U4c` | `F32-U4c: 13枚の聴牌・1向聴では計算方法の2択が表示されず、前に手替わりを詳しくを選んでいても diffSlack:0・oneShantenSlack:true・remainingDraws:18 で送られる` | 1. まず `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_14_1SHANTEN }]` で `EngineScreen` を描画し、`.engine-screen__run` の出現を待ってから `getByRole('radio', { name: '手替わりを詳しく' })` をクリックして内部状態 `detailed` を `true` にする。<br>2. `act(() => { dispatch({ type: 'remove-last-hand-tile' }); })` で末尾の `1z` を削除して `HAND_13_1SHANTEN`(13枚1向聴)に変え、`waitFor` で計算方法のラジオグループ(`[role="radiogroup"]`)が DOM から消える(`querySelector('[role="radiogroup"]') === null`)ことを確認する。<br>3. `.engine-screen__run`(「計算する」)をクリックすると、`effectiveDetailed = methodChoice && detailed` により `harness.requests()[0]` が `{ id: 1, table: { round: 'east', seat: 'east', continue: 0, deposit: 0 }, input: { hand: HAND_13_1SHANTEN, melds: [], dora: [], uradora: [], nuki: 0 }, rule: createDefaultRule(), remainingDraws: 18, options: { tegawari: true, backtrack: true, diffSlack: 0, oneShantenSlack: true } }` と `toEqual` で完全一致することを検証する。<br>4. 続いて `cleanup()` の後、新しいハーネス `harness2` で `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_14_0SHANTEN }]` を `render` し、`.engine-screen__run` の出現を待ってから `getByRole('radio', { name: '手替わりを詳しく' })` をクリックして内部状態 `detailed` を `true` にする。<br>5. `act(() => { dispatch2({ type: 'remove-last-hand-tile' }); })` で末尾の `1z` を削除して `HAND_13_TEMPAI`(13枚聴牌)に変え、`waitFor` で `[role="radiogroup"]` が DOM から消えることを確認する。<br>6. `.engine-screen__run`(「計算する」)をクリックすると、`harness2.requests()[0]` が `{ id: 1, table: { round: 'east', seat: 'east', continue: 0, deposit: 0 }, input: { hand: HAND_13_TEMPAI, melds: [], dora: [], uradora: [], nuki: 0 }, rule: createDefaultRule(), remainingDraws: 18, options: { tegawari: true, backtrack: true, diffSlack: 0, oneShantenSlack: true } }` と `toEqual` で完全一致することを検証する。 |
| `F32-U4d` | `F32-U4d: 結果表示後に巡目スライダーを操作しても再計算は走らず、その後に再計算したときも remainingDraws は 18 のまま送られる` | 1. `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }]` で「計算する」をクリックし、`await act(async () => { harness.resolveLatest({ id: 1, type: 'ok', candidates: [sampleCandidate], elapsedMs: 20 }); })` を呼んで結果(`.engine-result`)と巡目スライダー(`.engine-result__slider`)が表示されるのを待つ。<br>2. `.engine-result__turn-label` の `textContent` が `'3順目'` であることを確認した後、スライダー要素に `(slider as unknown as { value: number }).value = 10` を設定して `fireEvent.input(slider)` を発火する。<br>3. `.engine-result__turn-label` の `textContent` が `'10順目'` に更新される一方、`harness.requests()` の長さは `1` のまま(再計算が走らない)であることを検証する。<br>4. 続けて `getByRole('radio', { name: '手替わりを詳しく' })` をクリックして「計算する」をクリックすると、`harness.requests()` の長さが `2` になり、`requests()[1]?.remainingDraws` が表示巡目の `10` ではなくリテラル `18` であり、`requests()[1]?.options.diffSlack` が `1` であることを検証する。 |

#### Issue #151: 計算画面を離れたときの dispose を画面単位で検査するテスト(`describe('F3-2 計算画面離脱時の dispose (Issue #151 / #139 U-10)')`)

> **注記(`disposedCount` の前提)**: `src/ui/engine/engine-run.ts` 116行の仕様上、`run()` は冒頭で `cancelRun()` → `client?.dispose()` を呼ぶ。初回 `run()` 時点では `client` がまだ `null`(119行の `client ??= opts.createClient()` で生成)のため `disposedCount()` は `0` のままであるが、同一ランナー内で 2 回目以降の `run()` を呼ぶと `disposedCount()` が加算される。したがって、`F32-U10a`・`F32-U10b`・`F32-U10c`・`F32-U10e` ではいずれも画面離脱前に `run`(「計算する」クリック)を **1 回だけ** 行い、離脱直前の `harness.disposedCount() === 0` を確認したうえで、画面離脱(`runner.dispose()`)によって `harness.disposedCount() === 1` になることを検査する。

| テスト記号 | テスト名 | 操作手順と完全一致アサーション |
| --- | --- | --- |
| `F32-U10a` | `F32-U10a: 計算の実行中に「戻る」ボタンを押して画面を離れると、main 画面へ遷移し client.dispose が 1 回呼ばれる` | 1. `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }]` で `EngineScreen` を描画し、`.engine-screen__run`(「計算する」)を 1 回クリックする。<br>2. 実行中表示(`.engine-spinner` の `getAttribute('aria-label')` が `'計算中'`、`.engine-screen__run` の `textContent` が `'中止'`)が出ており、`harness.calls.length === 1`・`harness.disposedCount() === 0` であることを確認する。<br>3. ヘッダーの戻るボタン(`.engine-screen__back-button`)をクリックする。<br>4. `[data-testid="other-screen"]` が描画されて `getAttribute('data-screen')` が `'main'` になり(`EngineScreen` がアンマウントされ)、`harness.disposedCount()` が `1` になることを検証する。 |
| `F32-U10b` | `F32-U10b: 計算の実行中に「ヘルプ」ボタンを押してヘルプ画面へ遷移すると、client.dispose が 1 回呼ばれる` | 1. `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }]` で `EngineScreen` を描画し、`.engine-screen__run`(「計算する」)を 1 回クリックして実行中(`harness.calls.length === 1`・`harness.disposedCount() === 0`)にする。<br>2. ヘッダーのヘルプボタン(`.engine-screen__help-button`)をクリックする。<br>3. `[data-testid="other-screen"]` が描画されて `getAttribute('data-screen')` が `'help'`、`getAttribute('data-help-focus')` が `'engine'`、`getAttribute('data-help-return')` が `'engine'` になり、`harness.disposedCount()` が `1` になることを検証する。 |
| `F32-U10c` | `F32-U10c: 計算の実行中にコンポーネントがアンマウントされると、client.dispose が 1 回呼ばれる` | 1. `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }]` で `EngineScreen` を描画し、`.engine-screen__run`(「計算する」)を 1 回クリックして実行中(`harness.calls.length === 1`・`harness.disposedCount() === 0`)にする。<br>2. `view.unmount()` を呼び出す。<br>3. `harness.disposedCount()` が `1` になることを検証する。 |
| `F32-U10d` | `F32-U10d: 未実行(idle)のまま戻る・ヘルプ遷移・アンマウントで画面を離れても、createClient と client.dispose は一度も呼ばれない` | 1. `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }]` で `EngineScreen` を描画し、`.engine-screen__run`(「計算する」)が出現するまで待つ(クリックはしない)。<br>2. `.engine-screen__back-button`(「戻る」)をクリックして `[data-testid="other-screen"]` の `data-screen` が `'main'` に遷移したことを確認し、`harness.createdCount()` が `0`、`harness.disposedCount()` が `0` であることを検証する。<br>3. `act(() => { dispatch({ type: 'navigate', screen: 'engine' }); })` で再表示させ `.engine-screen__run` の出現を待った後、未実行のまま `.engine-screen__help-button`(「ヘルプ」)をクリックして `data-screen` が `'help'` に遷移したことを確認し、`harness.createdCount()` が `0`、`harness.disposedCount()` が `0` であることを検証する。<br>4. 再び `act(() => { dispatch({ type: 'navigate', screen: 'engine' }); })` で再表示させ `.engine-screen__run` の出現を待った後、未実行のまま `view.unmount()` を呼んだときも、`harness.createdCount()` が `0`、`harness.disposedCount()` が `0` であることを検証する。 |
| `F32-U10e` | `F32-U10e: 計算完了後に画面を離れると client.dispose で Worker を解放し、同じ入力での再訪時は再計算せず結果を表示し、入力変更後の再訪時は未計算(idle)に戻る` | 1. `setupActions: [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }]` で「計算する」を 1 回クリックし、`await act(async () => { harness.resolveLatest({ id: 1, type: 'ok', candidates: [sampleCandidate], elapsedMs: 10 }); })` で解決して `.engine-summary` が表示され、3巡目の期待値 `<dd>` を含む要約に `'1,500'` が表示されることを確認する(`harness.createdCount() === 1`、`harness.disposedCount() === 0`)。<br>2. `.engine-screen__back-button`(「戻る」)をクリックして `'main'` に離脱すると、Worker 解放のため `harness.disposedCount()` が `1` になることを検証する。<br>3. 入力を変えずに `act(() => { dispatch({ type: 'navigate', screen: 'engine' }); })` で計算画面へ再訪し `.engine-screen__run` の出現を待つと、`harness.requests().length` は `1` のまま(`harness.createdCount()` も `1` のまま)で `.engine-summary` に直前の期待値 `'1,500'` が即座に表示されることを検証する。<br>4. 再び `.engine-screen__back-button`(「戻る」)で `'main'` に戻り(再訪中は `run` を呼んでおらず `client` は未生成のため `harness.disposedCount()` は `1` のまま)、`act(() => { dispatch({ type: 'step', field: 'nuki', delta: 1 }); dispatch({ type: 'navigate', screen: 'engine' }); })` で抜き北を 0→1 に変更して再訪し `.engine-screen__run` の出現を待つと、key 不一致により `.engine-summary` は表示されず(`querySelector('.engine-summary') === null`)、未計算状態(`.engine-screen__run` の `textContent` が `'計算する'`)に戻ることを検証する。 |

---

## 3. 受け入れ条件のチェックリスト

検収担当がそのまま1項目ずつ実行し、合否を判定できるチェックリストとする。

- [ ] **AC-1 (依存パッケージと環境指定)**:
  - `package.json` の `devDependencies` に `@testing-library/react` と `happy-dom` が追加されており、既存の `dependencies` に追加されていないこと(`git diff origin/develop/v2.0 -- package.json` で確認)。
  - `vite.config.ts` の既定テスト環境は変更されておらず(`git diff origin/develop/v2.0 -- vite.config.ts` が空)、`src/ui/screen/EngineScreen.test.tsx` の先頭行に `// @vitest-environment happy-dom` が指定されていること。
- [ ] **AC-2 (製品コード不変の確認)**:
  - `git diff --name-only origin/develop/v2.0` の出力が、以下の 4 ファイルのみであること(製品コード `src/ui/screen/EngineScreen.tsx`・`src/ui/engine/**`・`src/ui/state/**` 等が 1 行も変更されていないこと):
    - `docs/design/issue-150-151-engine-screen-tests.md`
    - `package.json`
    - `package-lock.json`
    - `src/ui/screen/EngineScreen.test.tsx`
- [ ] **AC-3 (新規テスト9件の個別実行と通過)**:
  - 以下の各コマンドを実行し、それぞれ対象の 1 件が PASS すること:
    - `npx vitest run src/ui/screen/EngineScreen.test.tsx -t 'F32-U4a:'`
    - `npx vitest run src/ui/screen/EngineScreen.test.tsx -t 'F32-U4b:'`
    - `npx vitest run src/ui/screen/EngineScreen.test.tsx -t 'F32-U4c:'`
    - `npx vitest run src/ui/screen/EngineScreen.test.tsx -t 'F32-U4d:'`
    - `npx vitest run src/ui/screen/EngineScreen.test.tsx -t 'F32-U10a:'`
    - `npx vitest run src/ui/screen/EngineScreen.test.tsx -t 'F32-U10b:'`
    - `npx vitest run src/ui/screen/EngineScreen.test.tsx -t 'F32-U10c:'`
    - `npx vitest run src/ui/screen/EngineScreen.test.tsx -t 'F32-U10d:'`
    - `npx vitest run src/ui/screen/EngineScreen.test.tsx -t 'F32-U10e:'`
- [ ] **AC-4 (アサーション規約の遵守 — 業務標準05)**:
  - `src/ui/screen/EngineScreen.test.tsx` 内で部分一致(`toContain`・`includes`・`toMatchObject` 等)を使用する場合は直前に日本語コメントで理由が明記されており、不使用または理由コメント付きであること。`EngineRequest` の検証は `toEqual` による完全一致で行われ、`remainingDraws` の期待値は実装の定数(`ENGINE_DRAWS`)ではなくリテラル `18` で書かれていること。
- [ ] **AC-5 (Issue #150 ミューテーション検証 — 業務標準05)**:
  1. **対照実験**: `src/ui/screen/EngineScreen.tsx` 51行付近に意味を変えないコメント `// mutation-control-150` を挿入し、`npx vitest run src/ui/screen/EngineScreen.test.tsx` を実行して全件 PASS(**SURVIVED**)することを確認する。
  2. **本番変異 M1 (条件 `detailed` の配線破壊)**: `src/ui/screen/EngineScreen.tsx` 51行の `const effectiveDetailed = methodChoice && detailed;` を `const effectiveDetailed = false;` に改変して `npx vitest run src/ui/screen/EngineScreen.test.tsx` を実行し、`F32-U4a`・`F32-U4b`・`F32-U4d` が FAIL(**KILLED**)することを確認する。
  3. **本番変異 M2 (`methodChoice` ガードの配線破壊)**: `src/ui/screen/EngineScreen.tsx` 51行の `const effectiveDetailed = methodChoice && detailed;` を `const effectiveDetailed = detailed;` に改変して `npx vitest run src/ui/screen/EngineScreen.test.tsx` を実行し、`F32-U4c` が FAIL(**KILLED**)することを確認する。
  4. **本番変異 M5 (`remainingDraws` の配線破壊)**: `src/ui/screen/EngineScreen.tsx` 52行の `const conditions = { detailed: effectiveDetailed, draws: ENGINE_DRAWS };` を `const conditions = { detailed: effectiveDetailed, draws: displayTurn };` に改変して `npx vitest run src/ui/screen/EngineScreen.test.tsx` を実行し、`F32-U4d`(および初期状態 `displayTurn = 3` で計算する `F32-U4a`〜`F32-U4c`)が FAIL(**KILLED**)することを確認する。
  5. **復元確認**: `git checkout -- src/ui/screen/EngineScreen.tsx` で即座に復元し、`git diff src/ui/screen/EngineScreen.tsx` が空であることを確認する。
- [ ] **AC-6 (Issue #151 ミューテーション検証 — 業務標準05)**:
  1. **対照実験**: `src/ui/engine/use-engine-run.ts` 33行付近に意味を変えないコメント `// mutation-control-151` を挿入し、`npx vitest run src/ui/screen/EngineScreen.test.tsx` を実行して全件 PASS(**SURVIVED**)することを確認する。
  2. **本番変異 M3 (アンマウント時の `dispose` 呼び出し削除)**: `src/ui/engine/use-engine-run.ts` 33行の `useEffect(() => () => runner.dispose(), [runner]);` を `useEffect(() => undefined, [runner]);` に改変して `npx vitest run src/ui/screen/EngineScreen.test.tsx` を実行し、`F32-U10a`・`F32-U10b`・`F32-U10c`・`F32-U10e` が FAIL(**KILLED**)することを確認する。
  3. **本番変異 M4 (戻る遷移の配線破壊)**: `src/ui/engine/use-engine-run.ts` を復元したうえで、`src/ui/screen/EngineScreen.tsx` 65行の `onBack={() => dispatch({ type: 'navigate', screen: 'main' })}` を `onBack={() => {}}` に改変して `npx vitest run src/ui/screen/EngineScreen.test.tsx` を実行し、`F32-U10a`・`F32-U10d`・`F32-U10e` が FAIL(**KILLED**)することを確認する。
  4. **復元確認**: `git checkout -- src/ui/engine/use-engine-run.ts src/ui/screen/EngineScreen.tsx` で即座に復元し、`git diff src/ui/engine/use-engine-run.ts src/ui/screen/EngineScreen.tsx` が空であることを確認する。
- [ ] **AC-7 (全テスト・静的検査の通過)**:
  - `npm run lint`・`npm run typecheck`・`npm run format:check`・`npm test` を実行し、すべてエラー 0 件で通過すること。

---

## 4. 後続 Issue への引き継ぎ事項

- 本設計で `devDependencies` に導入する `happy-dom` + `@testing-library/react` と、テストファイル先頭の `// @vitest-environment happy-dom` + `HTMLElement.prototype.attachInternals` シムのパターンは、今後他の画面コンポーネントで DOM 操作・ライフサイクルを伴うテストを追加する際にも同じ流儀で利用できる(既存の `renderToStaticMarkup` による高速な SSR テストは `node` 環境のまま維持する)。
- PR は `develop/v2.0` を base として作成し、PR 本文に `Closes #150` と `Closes #151` を記載する(業務標準01「統合ブランチ(`develop/*`)運用」のとおり、統合ブランチへのマージ時点では GitHub の自動クローズは発火しないため、マージ後の Issue クローズ扱いはオーナー・統括運用に従う)。

---

## 5. 実挙動未確認の箇所

- **Vitest の `happy-dom` 環境上での `EngineScreen` 全体の描画と `useResult()` の動的 import + `decomposer` WASM 読込**:
  - 設計フェーズでは `package.json`・`node_modules` を変更しない制約のため、Vitest の `// @vitest-environment happy-dom` 上で `EngineScreen` を描画し、`useResult()` 内部の動的 `import('./compute')` および `decomposer` WASM の読み込みが解決して `waitFor` で `.engine-screen__run` が出現するまでの一連の実行は**実挙動未確認**(製造時に `npm test` で確認する)。
  - **万一製造時に Vitest `happy-dom` 環境上で `decomposer` WASM の読み込みが失敗した場合のエスカレーション方針**: 製造担当は製品コードや共通テスト設定(`vite.config.ts` 等)を独断で変更せず、直ちに作業を止めてエラー内容を統括担当へ報告し差し戻すこと。
- **`Slider` ラッパー(`src/ui/md/Slider.tsx`)から `EngineResult` → `EngineScreen` の `onTurnChange` への結合動作**:
  - §6 #7 で実測したのは素の `<md-slider>` ホスト要素に対する `slider.value = 10; fireEvent.input(slider);` による `input` イベント発火までであり、`Slider.tsx` の `useEffect` リスナー経由で `EngineScreen` の `displayTurn` が更新され `.engine-result__turn-label` が `'10順目'` に切り替わる結合動作は**実挙動未確認**(製造時に `F32-U4d` で確認する)。
- **Vitest の `happy-dom` 環境と `node --conditions=browser` 手動実行の条件解決の差異**:
  - §6 #7 は `node --conditions=browser` による手動実行で確認したものであるため、Vitest の `// @vitest-environment happy-dom` 実行時における `@material/web`(Lit の `isServer` 条件解決や `mixinDelegatesAria` の挙動等)は**実挙動未確認**(製造時に確認する。なお `.engine-screen__run`・`.engine-screen__back-button`・`.engine-screen__help-button`・`.engine-result__slider` のクラスセレクタによる要素取得は `isServer` の真偽にかかわらず成立する)。
- **`EngineScreen.test.tsx` の最終実装に対する静的検査**:
  - `src/ui/screen/EngineScreen.test.tsx` の最終実装コードに対する `npm run lint`・`npm run typecheck`・`npm run format:check` の通過は、設計フェーズではテストファイルを作成しない制約のため**実挙動未確認**(製造時に確認する)。

---

## 6. 外部事実の確認記録

業務標準02「外部事実の確認記録(項目6)」に基づき、本設計が前提とするすべての外部事実について設計担当が実行したコマンドと結果を記録する。

| # | 確認した外部事実 | 実行したコマンド | 実行結果 |
| --- | --- | --- | --- |
| 1 | 起点ブランチ `origin/develop/v2.0` のコミットと作業ツリー状態 | `git status --porcelain && git branch --show-current && git rev-parse HEAD origin/develop/v2.0` | `develop/v2.0`、`HEAD`・`origin/develop/v2.0` ともに `871784569567d4d0534fa2dab8d3aebb815b8717`、未コミット差分なし |
| 2 | Node.js / npm の実行環境バージョン | `node -v && npm -v` | Node.js `v24.20.0`、npm `11.19.0` |
| 3 | `happy-dom` の公開最新版・Node 要件・peerDependencies | `npm view happy-dom version peerDependencies engines` | `version = '21.0.4'`、`engines = { node: '>=20.0.0' }`、`peerDependencies` なし |
| 4 | `@testing-library/react` の公開最新版と React 19 互換性(peerDependencies) | `npm view @testing-library/react version peerDependencies dependencies engines && npm view @testing-library/dom version peerDependencies` | `@testing-library/react`: `version = '16.3.3'`、`peerDependencies = { react: '^18.0.0 \|\| ^19.0.0', 'react-dom': '^18.0.0 \|\| ^19.0.0', '@types/react': '^18.0.0 \|\| ^19.0.0', '@types/react-dom': '^18.0.0 \|\| ^19.0.0', '@testing-library/dom': '^10.0.0' }`、`engines = { node: '>=18' }`。`@testing-library/dom`: `10.4.2` |
| 5 | インストール済み `vitest` のバージョンと `happy-dom` peerDependency 定義 | `node -e "const pkg = require('./node_modules/vitest/package.json'); console.log({ version: pkg.version, peerDeps: pkg.peerDependencies });"` | `version: '3.2.7'`、`peerDeps` に `'happy-dom': '*'` を含む |
| 6 | `happy-dom@21.0.4` における `HTMLElement.prototype.attachInternals` の有無 | `curl -s "$(npm view happy-dom@21.0.4 dist.tarball)" \| tar -xzf - -O \| grep -i "attachInternals" \|\| echo "NO_ATTACH_INTERNALS_ANYWHERE_IN_HAPPY_DOM"` | `NO_ATTACH_INTERNALS_ANYWHERE_IN_HAPPY_DOM`(`happy-dom@21.0.4` は `attachInternals` 未実装) |
| 7 | `happy-dom@21.0.4` + `@testing-library/react@16.3.3` + `@material/web@2.5.0` における `attachInternals` シム有無での動作とイベント発火の実測(リポジトリルートから実行し、既存の `./node_modules/@material/web`・`react` と `/tmp/happy-dom-probe` を組み合わせた後 `/tmp/happy-dom-probe` を削除) | 下記「確認 #7 の実行コマンドと結果」を参照 | `Without shim threw: TypeError this.attachInternals is not a function`、`querySelector [aria-label=戻る]: false`、`querySelector [data-aria-label=戻る]: true`、`counts: { clicked: 1, backClicked: 1, sliderVal: 10 }` |
| 8 | §2.3 のテスト用6牌姿に対する実コード(`parseTiles`・`generateResult`・`classifyResult`・`engineHandSize`・`engineStartShanten`・`isSlowRun`)での向聴数・`methodChoice`・`isSlowRun` 検証 | 下記「確認 #8 の実行コマンドと結果」を参照 | 6牌姿すべての `size`・`startShanten`・`methodChoice`・`slowRough`・`slowDetailed` が §2.3 の表と完全一致することを確認 |

#### 確認 #7 の実行コマンドと結果

```bash
npm install --prefix /tmp/happy-dom-probe happy-dom@21.0.4 @testing-library/react@16.3.3 --no-audit --no-fund && node --conditions=browser --input-type=module -e '
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import { Window } from "/tmp/happy-dom-probe/node_modules/happy-dom/lib/index.js";
const win = new Window();
for (const k of Object.getOwnPropertyNames(win)) {
  if (!(k in globalThis)) { try { globalThis[k] = win[k]; } catch {} }
}
Object.assign(globalThis, {
  window: win, document: win.document, HTMLElement: win.HTMLElement,
  Element: win.Element, Node: win.Node, CustomEvent: win.CustomEvent,
  Event: win.Event, MouseEvent: win.MouseEvent, EventTarget: win.EventTarget,
  customElements: win.customElements, MutationObserver: win.MutationObserver,
  CSSStyleSheet: win.CSSStyleSheet, ShadowRoot: win.ShadowRoot,
  getComputedStyle: win.getComputedStyle.bind(win)
});
await import("./node_modules/@material/web/button/filled-button.js");
await import("./node_modules/@material/web/iconbutton/icon-button.js");
await import("./node_modules/@material/web/slider/slider.js");
try {
  document.createElement("md-filled-button");
} catch (e) {
  console.log("Without shim threw:", e.name, e.message);
}
HTMLElement.prototype.attachInternals = function () {
  return {
    form: null, labels: [], shadowRoot: this.shadowRoot, states: new Set(),
    validationMessage: "", validity: {}, willValidate: true,
    checkValidity: () => true, reportValidity: () => true,
    setFormValue: () => {}, setValidity: () => {}
  };
};
const React = await import("react");
const rtlPath = require.resolve("@testing-library/react", { paths: ["/tmp/happy-dom-probe"] });
const { render, fireEvent, cleanup } = await import(rtlPath);
let clicked = 0, backClicked = 0, sliderVal = 0;
const view = render(
  React.createElement("div", null,
    React.createElement("md-filled-button", { type: "button", className: "engine-screen__run", onClick: () => { clicked++; } }, "計算する"),
    React.createElement("md-icon-button", { "aria-label": "戻る", className: "engine-screen__back-button", onClick: () => { backClicked++; } }),
    React.createElement("md-slider", { min: 1, max: 18, value: 3, className: "engine-result__slider" })
  )
);
const runBtn = view.container.querySelector(".engine-screen__run");
const backBtn = view.container.querySelector(".engine-screen__back-button");
const slider = view.container.querySelector(".engine-result__slider");
slider.addEventListener("input", () => { sliderVal = Number(slider.value); });
console.log("querySelector [aria-label=戻る]:", Boolean(view.container.querySelector("[aria-label=\"戻る\"]")));
console.log("querySelector [data-aria-label=戻る]:", Boolean(view.container.querySelector("[data-aria-label=\"戻る\"]")));
fireEvent.click(runBtn);
fireEvent.click(backBtn);
slider.value = 10;
fireEvent.input(slider);
console.log("counts:", { clicked, backClicked, sliderVal });
cleanup();
' && rm -rf /tmp/happy-dom-probe
```

出力:

```text
Without shim threw: TypeError this.attachInternals is not a function
querySelector [aria-label=戻る]: false
querySelector [data-aria-label=戻る]: true
counts: { clicked: 1, backClicked: 1, sliderVal: 10 }
```

#### 確認 #8 の実行コマンドと結果

```bash
mkdir -p node_modules/.cache && cat << 'EOF' > node_modules/.cache/probe-hands.ts
import { parseTiles } from '../../bench/engine/hands';
import { generateResult } from '../../src/core/result';
import { DEFAULT_RULE } from '../../src/core/rule';
import { classifyResult } from '../../src/ui/result/classify';
import { engineHandSize, engineStartShanten } from '../../src/ui/result/engine-entry';
import { isSlowRun } from '../../src/ui/engine/engine-estimate';

const table = { round: 'east', seat: 'east', continue: 0, deposit: 0 } as const;
const handOptions = {
  riichi: 'none', ippatsu: false, rinshan: false, chankan: false,
  haitei: false, tenho: false, tsubameGaeshi: false, kanFuri: false
} as const;
const hands = {
  HAND_13_2SHANTEN: '19m22p345p678s468s',
  HAND_13_1SHANTEN: '19m123789p12379s',
  HAND_13_TEMPAI: '11m123789p12379s',
  HAND_14_2SHANTEN: '19m22p345p678s468s1z',
  HAND_14_1SHANTEN: '19m123789p12379s1z',
  HAND_14_0SHANTEN: '11m123789p12379s1z'
};
for (const [name, str] of Object.entries(hands)) {
  const hand = parseTiles(str);
  const res = generateResult(table, { hand, melds: [], dora: [], nuki: 0 }, handOptions, DEFAULT_RULE);
  const view = classifyResult(res);
  const size = engineHandSize(hand.length, 0);
  const startShanten = engineStartShanten(view, hand.length, 0);
  const available = size !== null && startShanten !== null;
  const methodChoice = available && (size === 14 || (startShanten !== null && startShanten >= 2));
  const slowRough = available && size !== null && startShanten !== null && isSlowRun({ detailed: false, size, startShanten });
  const slowDetailed = available && size !== null && startShanten !== null && isSlowRun({ detailed: true, size, startShanten });
  console.log(name, str, JSON.stringify({ len: hand.length, kind: view.kind, size, startShanten, methodChoice, slowRough, slowDetailed }));
}
EOF
npx vite-node --options.transformMode.ssr=".*" node_modules/.cache/probe-hands.ts && rm -f node_modules/.cache/probe-hands.ts
```

出力:

```text
HAND_13_2SHANTEN 19m22p345p678s468s {"len":13,"kind":"shanten","size":13,"startShanten":2,"methodChoice":true,"slowRough":false,"slowDetailed":false}
HAND_13_1SHANTEN 19m123789p12379s {"len":13,"kind":"shanten","size":13,"startShanten":1,"methodChoice":false,"slowRough":false,"slowDetailed":false}
HAND_13_TEMPAI 11m123789p12379s {"len":13,"kind":"hora","size":13,"startShanten":0,"methodChoice":false,"slowRough":false,"slowDetailed":false}
HAND_14_2SHANTEN 19m22p345p678s468s1z {"len":14,"kind":"discard","size":14,"startShanten":2,"methodChoice":true,"slowRough":true,"slowDetailed":true}
HAND_14_1SHANTEN 19m123789p12379s1z {"len":14,"kind":"discard","size":14,"startShanten":1,"methodChoice":true,"slowRough":false,"slowDetailed":true}
HAND_14_0SHANTEN 11m123789p12379s1z {"len":14,"kind":"discard","size":14,"startShanten":0,"methodChoice":true,"slowRough":false,"slowDetailed":false}
```

---

## 7. 要ヒアリング事項

なし(ヒアリング済みの確定事項 1〜4 により未決論点なし)。
