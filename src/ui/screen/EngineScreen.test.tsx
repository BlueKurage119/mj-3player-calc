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

const HAND_13_2SHANTEN = parseTiles('19m22p345p678s468s');
const HAND_13_1SHANTEN = parseTiles('19m123789p12379s');
const HAND_13_TEMPAI = parseTiles('11m123789p12379s');
const HAND_14_2SHANTEN = parseTiles('19m22p345p678s468s1z');
const HAND_14_1SHANTEN = parseTiles('19m123789p12379s1z');
const HAND_14_0SHANTEN = parseTiles('11m123789p12379s1z');

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

const mustQuery = (container: ParentNode, selector: string): HTMLElement => {
  const el = container.querySelector<HTMLElement>(selector);
  if (!el) {
    throw new Error(`要素が見つかりません: ${selector}`);
  }
  return el;
};

const mountScreen = async (
  setupActions: readonly AppAction[],
  harness: FakeClientHarness
) => {
  let dispatchRef: Dispatch<AppAction> | null = null;
  const view = render(
    <AppStateProvider>
      <TestEngineHost
        setupActions={setupActions}
        createClient={harness.createClient}
        onReady={ctx => {
          dispatchRef = ctx.dispatch;
        }}
      />
    </AppStateProvider>
  );

  await waitFor(() => {
    expect(view.container.querySelector('.engine-screen__run')).not.toBeNull();
  });

  if (!dispatchRef) {
    throw new Error('dispatch が初期化されていません');
  }

  return {
    view,
    dispatch: dispatchRef as Dispatch<AppAction>
  };
};

beforeEach(() => {
  cleanup();
  defaultEngineCache.clear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  defaultEngineCache.clear();
  window.localStorage.clear();
});

describe('F3-2 計算画面の条件送信 (Issue #150 / #139 U-4)', () => {
  it('F32-U4a: 13枚2向聴で概算(既定)と手替わりを詳しくを切り替えて計算すると、diffSlack(0/1)・oneShantenSlack(true)・remainingDraws(18)と入力一式が client に送られる', async () => {
    const harness = createFakeClientHarness();
    const { view } = await mountScreen(
      [
        { type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN },
        { type: 'set-wind', field: 'round', wind: 'south' },
        { type: 'set-wind', field: 'seat', wind: 'west' },
        {
          type: 'add-indicator-tile',
          target: 'dora',
          tile: { type: 'p', n: 1 }
        },
        { type: 'step', field: 'nuki', delta: 1 },
        { type: 'step', field: 'nuki', delta: 1 }
      ],
      harness
    );

    const roughRadio = view.getByRole('radio', { name: '概算' });
    const detailedRadio = view.getByRole('radio', {
      name: '手替わりを詳しく'
    });
    expect(roughRadio.getAttribute('aria-checked')).toBe('true');
    expect(detailedRadio.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(harness.requests().length).toBe(1);
    expect(harness.requests()[0]).toEqual({
      id: 1,
      table: { round: 'south', seat: 'west', continue: 0, deposit: 0 },
      input: {
        hand: HAND_13_2SHANTEN,
        melds: [],
        dora: [{ type: 'p', n: 1 }],
        uradora: [],
        nuki: 2
      },
      rule: createDefaultRule(),
      remainingDraws: 18,
      options: {
        tegawari: true,
        backtrack: true,
        diffSlack: 0,
        oneShantenSlack: true
      }
    });

    await act(async () => {
      harness.resolveLatest({
        id: 1,
        type: 'ok',
        candidates: [sampleCandidate],
        elapsedMs: 10
      });
    });

    fireEvent.click(detailedRadio);
    expect(detailedRadio.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(harness.requests().length).toBe(2);
    expect(harness.requests()[1]).toEqual({
      id: 2,
      table: { round: 'south', seat: 'west', continue: 0, deposit: 0 },
      input: {
        hand: HAND_13_2SHANTEN,
        melds: [],
        dora: [{ type: 'p', n: 1 }],
        uradora: [],
        nuki: 2
      },
      rule: createDefaultRule(),
      remainingDraws: 18,
      options: {
        tegawari: true,
        backtrack: true,
        diffSlack: 1,
        oneShantenSlack: true
      }
    });

    await act(async () => {
      harness.resolveLatest({
        id: 2,
        type: 'ok',
        candidates: [sampleCandidate],
        elapsedMs: 10
      });
    });

    fireEvent.click(roughRadio);
    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(harness.requests().length).toBe(3);
    expect(harness.requests()[2]?.options.diffSlack).toBe(0);
  });

  it('F32-U4b: 14枚入力(1向聴・2向聴)では計算方法の2択が表示され、概算(diffSlack:0)と手替わりを詳しく(diffSlack:1)が14枚の手牌とともに client に送られる', async () => {
    const harness = createFakeClientHarness();
    const { view } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_14_1SHANTEN }],
      harness
    );

    const roughRadio = view.getByRole('radio', { name: '概算' });
    const detailedRadio = view.getByRole('radio', {
      name: '手替わりを詳しく'
    });
    expect(roughRadio.getAttribute('aria-checked')).toBe('true');
    expect(view.container.querySelector('.engine-screen__note')).toBeNull();

    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(harness.requests()[0]).toEqual({
      id: 1,
      table: { round: 'east', seat: 'east', continue: 0, deposit: 0 },
      input: {
        hand: HAND_14_1SHANTEN,
        melds: [],
        dora: [],
        uradora: [],
        nuki: 0
      },
      rule: createDefaultRule(),
      remainingDraws: 18,
      options: {
        tegawari: true,
        backtrack: true,
        diffSlack: 0,
        oneShantenSlack: true
      }
    });

    await act(async () => {
      harness.resolveLatest({
        id: 1,
        type: 'ok',
        candidates: [sampleCandidate],
        elapsedMs: 10
      });
    });

    fireEvent.click(detailedRadio);
    expect(mustQuery(view.container, '.engine-screen__note').textContent).toBe(
      '時間がかかります'
    );
    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(harness.requests()[1]).toEqual({
      id: 2,
      table: { round: 'east', seat: 'east', continue: 0, deposit: 0 },
      input: {
        hand: HAND_14_1SHANTEN,
        melds: [],
        dora: [],
        uradora: [],
        nuki: 0
      },
      rule: createDefaultRule(),
      remainingDraws: 18,
      options: {
        tegawari: true,
        backtrack: true,
        diffSlack: 1,
        oneShantenSlack: true
      }
    });

    cleanup();
    defaultEngineCache.clear();

    const harness2 = createFakeClientHarness();
    const { view: view2 } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_14_2SHANTEN }],
      harness2
    );

    expect(mustQuery(view2.container, '.engine-screen__note').textContent).toBe(
      '時間がかかります'
    );
    fireEvent.click(mustQuery(view2.container, '.engine-screen__run'));

    expect(harness2.requests()[0]).toEqual({
      id: 1,
      table: { round: 'east', seat: 'east', continue: 0, deposit: 0 },
      input: {
        hand: HAND_14_2SHANTEN,
        melds: [],
        dora: [],
        uradora: [],
        nuki: 0
      },
      rule: createDefaultRule(),
      remainingDraws: 18,
      options: {
        tegawari: true,
        backtrack: true,
        diffSlack: 0,
        oneShantenSlack: true
      }
    });

    await act(async () => {
      harness2.resolveLatest({
        id: 1,
        type: 'ok',
        candidates: [sampleCandidate],
        elapsedMs: 10
      });
    });

    fireEvent.click(view2.getByRole('radio', { name: '手替わりを詳しく' }));
    fireEvent.click(mustQuery(view2.container, '.engine-screen__run'));

    expect(harness2.requests()[1]).toEqual({
      id: 2,
      table: { round: 'east', seat: 'east', continue: 0, deposit: 0 },
      input: {
        hand: HAND_14_2SHANTEN,
        melds: [],
        dora: [],
        uradora: [],
        nuki: 0
      },
      rule: createDefaultRule(),
      remainingDraws: 18,
      options: {
        tegawari: true,
        backtrack: true,
        diffSlack: 1,
        oneShantenSlack: true
      }
    });
  });

  it('F32-U4c: 13枚の聴牌・1向聴では計算方法の2択が表示されず、前に手替わりを詳しくを選んでいても diffSlack:0・oneShantenSlack:true・remainingDraws:18 で送られる', async () => {
    const harness = createFakeClientHarness();
    const { view, dispatch } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_14_1SHANTEN }],
      harness
    );

    const detailedRadio = view.getByRole('radio', {
      name: '手替わりを詳しく'
    });
    fireEvent.click(detailedRadio);
    expect(detailedRadio.getAttribute('aria-checked')).toBe('true');

    act(() => {
      dispatch({ type: 'remove-last-hand-tile' });
    });

    await waitFor(() => {
      expect(view.container.querySelector('[role="radiogroup"]')).toBeNull();
    });

    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(harness.requests()[0]).toEqual({
      id: 1,
      table: { round: 'east', seat: 'east', continue: 0, deposit: 0 },
      input: {
        hand: HAND_13_1SHANTEN,
        melds: [],
        dora: [],
        uradora: [],
        nuki: 0
      },
      rule: createDefaultRule(),
      remainingDraws: 18,
      options: {
        tegawari: true,
        backtrack: true,
        diffSlack: 0,
        oneShantenSlack: true
      }
    });

    cleanup();
    defaultEngineCache.clear();

    const harness2 = createFakeClientHarness();
    const { view: view2, dispatch: dispatch2 } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_14_0SHANTEN }],
      harness2
    );

    const detailedRadio2 = view2.getByRole('radio', {
      name: '手替わりを詳しく'
    });
    fireEvent.click(detailedRadio2);
    expect(detailedRadio2.getAttribute('aria-checked')).toBe('true');

    act(() => {
      dispatch2({ type: 'remove-last-hand-tile' });
    });

    await waitFor(() => {
      expect(view2.container.querySelector('[role="radiogroup"]')).toBeNull();
    });

    fireEvent.click(mustQuery(view2.container, '.engine-screen__run'));

    expect(harness2.requests()[0]).toEqual({
      id: 1,
      table: { round: 'east', seat: 'east', continue: 0, deposit: 0 },
      input: {
        hand: HAND_13_TEMPAI,
        melds: [],
        dora: [],
        uradora: [],
        nuki: 0
      },
      rule: createDefaultRule(),
      remainingDraws: 18,
      options: {
        tegawari: true,
        backtrack: true,
        diffSlack: 0,
        oneShantenSlack: true
      }
    });
  });

  it('F32-U4d: 結果表示後に巡目スライダーを操作しても再計算は走らず、その後に再計算したときも remainingDraws は 18 のまま送られる', async () => {
    const harness = createFakeClientHarness();
    const { view } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }],
      harness
    );

    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    await act(async () => {
      harness.resolveLatest({
        id: 1,
        type: 'ok',
        candidates: [sampleCandidate],
        elapsedMs: 20
      });
    });

    await waitFor(() => {
      expect(view.container.querySelector('.engine-result')).not.toBeNull();
      expect(
        view.container.querySelector('.engine-result__slider')
      ).not.toBeNull();
    });

    expect(
      mustQuery(view.container, '.engine-result__turn-label').textContent
    ).toBe('3巡目');

    const slider = mustQuery(view.container, '.engine-result__slider');
    (slider as unknown as { value: number }).value = 10;
    fireEvent.input(slider);

    expect(
      mustQuery(view.container, '.engine-result__turn-label').textContent
    ).toBe('10巡目');
    expect(harness.requests().length).toBe(1);

    fireEvent.click(view.getByRole('radio', { name: '手替わりを詳しく' }));
    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(harness.requests().length).toBe(2);
    expect(harness.requests()[1]?.remainingDraws).toBe(18);
    expect(harness.requests()[1]?.options.diffSlack).toBe(1);
  });
});

describe('F3-2 計算画面離脱時の dispose (Issue #151 / #139 U-10)', () => {
  it('F32-U10a: 計算の実行中に「戻る」ボタンを押して画面を離れると、main 画面へ遷移し client.dispose が 1 回呼ばれる', async () => {
    const harness = createFakeClientHarness();
    const { view } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }],
      harness
    );

    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(
      mustQuery(view.container, '.circular-progress').getAttribute('aria-label')
    ).toBe('計算中');
    expect(mustQuery(view.container, '.engine-screen__run').textContent).toBe(
      '中止'
    );
    expect(harness.calls.length).toBe(1);
    expect(harness.disposedCount()).toBe(0);

    fireEvent.click(mustQuery(view.container, '.engine-screen__back-button'));

    const other = mustQuery(view.container, '[data-testid="other-screen"]');
    expect(other.getAttribute('data-screen')).toBe('main');
    expect(harness.disposedCount()).toBe(1);
  });

  it('F32-U10b: 計算の実行中に「ヘルプ」ボタンを押してヘルプ画面へ遷移すると、client.dispose が 1 回呼ばれる', async () => {
    const harness = createFakeClientHarness();
    const { view } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }],
      harness
    );

    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(harness.calls.length).toBe(1);
    expect(harness.disposedCount()).toBe(0);

    fireEvent.click(mustQuery(view.container, '.engine-screen__help-button'));

    const other = mustQuery(view.container, '[data-testid="other-screen"]');
    expect(other.getAttribute('data-screen')).toBe('help');
    expect(other.getAttribute('data-help-focus')).toBe('engine');
    expect(other.getAttribute('data-help-return')).toBe('engine');
    expect(harness.disposedCount()).toBe(1);
  });

  it('F32-U10c: 計算の実行中にコンポーネントがアンマウントされると、client.dispose が 1 回呼ばれる', async () => {
    const harness = createFakeClientHarness();
    const { view } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }],
      harness
    );

    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    expect(harness.calls.length).toBe(1);
    expect(harness.disposedCount()).toBe(0);

    view.unmount();

    expect(harness.disposedCount()).toBe(1);
  });

  it('F32-U10d: 未実行(idle)のまま戻る・ヘルプ遷移・アンマウントで画面を離れても、createClient と client.dispose は一度も呼ばれない', async () => {
    const harness = createFakeClientHarness();
    const { view, dispatch } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }],
      harness
    );

    fireEvent.click(mustQuery(view.container, '.engine-screen__back-button'));
    expect(
      mustQuery(view.container, '[data-testid="other-screen"]').getAttribute(
        'data-screen'
      )
    ).toBe('main');
    expect(harness.createdCount()).toBe(0);
    expect(harness.disposedCount()).toBe(0);

    act(() => {
      dispatch({ type: 'navigate', screen: 'engine' });
    });
    await waitFor(() => {
      expect(
        view.container.querySelector('.engine-screen__run')
      ).not.toBeNull();
    });

    fireEvent.click(mustQuery(view.container, '.engine-screen__help-button'));
    expect(
      mustQuery(view.container, '[data-testid="other-screen"]').getAttribute(
        'data-screen'
      )
    ).toBe('help');
    expect(harness.createdCount()).toBe(0);
    expect(harness.disposedCount()).toBe(0);

    act(() => {
      dispatch({ type: 'navigate', screen: 'engine' });
    });
    await waitFor(() => {
      expect(
        view.container.querySelector('.engine-screen__run')
      ).not.toBeNull();
    });

    view.unmount();
    expect(harness.createdCount()).toBe(0);
    expect(harness.disposedCount()).toBe(0);
  });

  it('F32-U10e: 計算完了後に画面を離れると client.dispose で Worker を解放し、同じ入力での再訪時は再計算せず結果を表示し、入力変更後の再訪時は未計算(idle)に戻る', async () => {
    const harness = createFakeClientHarness();
    const { view, dispatch } = await mountScreen(
      [{ type: 'add-hand-tiles', tiles: HAND_13_2SHANTEN }],
      harness
    );

    fireEvent.click(mustQuery(view.container, '.engine-screen__run'));

    await act(async () => {
      harness.resolveLatest({
        id: 1,
        type: 'ok',
        candidates: [sampleCandidate],
        elapsedMs: 10
      });
    });

    const summaryValues = () =>
      [...view.container.querySelectorAll('.engine-summary dd')].map(
        el => el.textContent
      );

    expect(view.container.querySelector('.engine-summary')).not.toBeNull();
    expect(summaryValues()).toEqual(['15.0%', '30.0%', '1,500']);
    expect(harness.createdCount()).toBe(1);
    expect(harness.disposedCount()).toBe(0);

    fireEvent.click(mustQuery(view.container, '.engine-screen__back-button'));
    expect(
      mustQuery(view.container, '[data-testid="other-screen"]').getAttribute(
        'data-screen'
      )
    ).toBe('main');
    expect(harness.disposedCount()).toBe(1);

    act(() => {
      dispatch({ type: 'navigate', screen: 'engine' });
    });
    await waitFor(() => {
      expect(
        view.container.querySelector('.engine-screen__run')
      ).not.toBeNull();
    });

    expect(harness.requests().length).toBe(1);
    expect(harness.createdCount()).toBe(1);
    expect(summaryValues()).toEqual(['15.0%', '30.0%', '1,500']);

    fireEvent.click(mustQuery(view.container, '.engine-screen__back-button'));
    expect(harness.disposedCount()).toBe(1);

    act(() => {
      dispatch({ type: 'step', field: 'nuki', delta: 1 });
      dispatch({ type: 'navigate', screen: 'engine' });
    });
    await waitFor(() => {
      expect(
        view.container.querySelector('.engine-screen__run')
      ).not.toBeNull();
    });

    expect(view.container.querySelector('.engine-summary')).toBeNull();
    expect(mustQuery(view.container, '.engine-screen__run').textContent).toBe(
      '計算する'
    );
  });

  it('153-S1: EngineScreen で未理牌の手牌と副露(ポン・暗槓・未入力副露)を描画すると、門前牌は理牌され、入力済み副露のみグループ表示され、暗槓の両端は裏牌になる', async () => {
    const harness = createFakeClientHarness();
    const unsortedHand = parseTiles('9s1m5p1z');
    const setupActions: AppAction[] = [
      { type: 'add-hand-tiles', tiles: unsortedHand },
      { type: 'add-meld' },
      { type: 'set-meld-kind', i: 0, kind: 'pon' },
      { type: 'set-meld-tile', i: 0, tile: { type: 'z', n: 6 } },
      { type: 'add-meld' },
      { type: 'set-meld-kind', i: 1, kind: 'ankan' },
      { type: 'set-meld-tile', i: 1, tile: { type: 'z', n: 7 } },
      // 未入力の副露スロット
      { type: 'add-meld' }
    ];
    const view = render(
      <AppStateProvider>
        <TestEngineHost
          setupActions={setupActions}
          createClient={harness.createClient}
        />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(
        view.container.querySelector('.engine-screen__hand')
      ).not.toBeNull();
    });

    const handSection = mustQuery(view.container, '.engine-screen__hand');
    const meldEls = [...handSection.querySelectorAll('.summary-card__meld')];
    // 未入力副露は除外され2グループのみ出力される
    expect(meldEls.length).toBe(2);

    // 門前牌(副露外の .tile)は compareTiles 順
    const closedTileLabels = [
      ...handSection.querySelectorAll('.summary-card__tiles > .tile')
    ].map(el => el.getAttribute('aria-label'));
    expect(closedTileLabels).toEqual(['1萬', '5筒', '9索', '東']);

    // 暗槓の4枚は両端が「裏」
    const ankanLabels = [...(meldEls[1]?.querySelectorAll('.tile') ?? [])].map(
      el => el.getAttribute('aria-label')
    );
    expect(ankanLabels).toEqual(['裏', '中', '中', '裏']);
  });
});
