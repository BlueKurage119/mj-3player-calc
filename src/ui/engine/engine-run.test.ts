import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type EngineClient, createEngineClient } from '../../engine/client';
import type {
  CandidateStat,
  EngineRequest,
  EngineResponse
} from '../../engine/types';
import {
  type EngineRunState,
  createEngineCache,
  createEngineRunner,
  visibleRunState
} from './engine-run';

const cand = (win: number): CandidateStat => ({
  discard: null,
  shanten: 1,
  tenpai: 0.5,
  win,
  ev: 1000,
  perTurn: []
});

/** 手で resolve できるフェイク client。dispose は実物と同じく未完了の要求を cancelled で解決する */
const fakeClient = () => {
  const calls: {
    req: EngineRequest;
    resolve: (r: EngineResponse) => void;
  }[] = [];
  let disposed = 0;
  const client: EngineClient = {
    requestEngine: req =>
      new Promise<EngineResponse>(resolve => {
        calls.push({ req, resolve });
      }),
    dispose: () => {
      disposed++;
      for (const c of calls.splice(0)) {
        c.resolve({ id: c.req.id, type: 'error', message: 'cancelled' });
      }
    }
  };
  return { client, calls, disposedCount: () => disposed };
};

const req = (id: number): EngineRequest => ({
  id,
  table: { round: 'east', seat: 'east', continue: 0, deposit: 0 },
  input: { hand: [], melds: [], dora: [], nuki: 0 },
  rule: {} as EngineRequest['rule'],
  remainingDraws: 18,
  options: {
    tegawari: true,
    backtrack: true,
    diffSlack: 0,
    oneShantenSlack: true
  }
});

const flush = () => new Promise<void>(r => setTimeout(r, 0));

describe('createEngineRunner', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('U-5: 実行中は running になり、経過時間が1秒ごとに増える。中止で idle に戻り、cancelled はエラー扱いにならない', async () => {
    const f = fakeClient();
    const runner = createEngineRunner({
      createClient: () => f.client,
      cache: createEngineCache()
    });
    runner.run(req(1), 'k');
    expect(runner.getState()).toMatchObject({
      status: 'running',
      elapsedMs: 0
    });

    vi.advanceTimersByTime(1000);
    expect(runner.getState()).toMatchObject({ elapsedMs: 1000 });
    vi.advanceTimersByTime(2000);
    expect(runner.getState()).toMatchObject({ elapsedMs: 3000 });

    runner.cancel();
    expect(runner.getState()).toEqual({ status: 'idle' });
    expect(f.disposedCount()).toBeGreaterThan(0);
    await flush();
    // 旧要求が cancelled で解決されても失敗表示にならない
    expect(runner.getState()).toEqual({ status: 'idle' });
    // 中止後にタイマーが残らない
    vi.advanceTimersByTime(5000);
    expect(runner.getState()).toEqual({ status: 'idle' });
  });

  it('ok 応答で done になり、key と candidates を保持する', async () => {
    const f = fakeClient();
    const runner = createEngineRunner({
      createClient: () => f.client,
      cache: createEngineCache()
    });
    runner.run(req(1), 'k1');
    f.calls[0]?.resolve({
      id: 1,
      type: 'ok',
      candidates: [cand(0.4)],
      elapsedMs: 12
    });
    await flush();
    const st = runner.getState();
    expect(st).toMatchObject({ status: 'done', key: 'k1', elapsedMs: 12 });
    // 完了後にタイマーが残らない
    vi.advanceTimersByTime(3000);
    expect(runner.getState()).toBe(st);
  });

  it.each([
    [{ id: 1, type: 'out-of-range' }, 'out-of-range'],
    [{ id: 1, type: 'not-applicable' }, 'not-applicable'],
    [{ id: 1, type: 'error', message: 'boom' }, 'error']
  ] as const)('U-8: %j で failed(%s)', async (res, reason) => {
    const f = fakeClient();
    const runner = createEngineRunner({
      createClient: () => f.client,
      cache: createEngineCache()
    });
    runner.run(req(1), 'k');
    f.calls[0]?.resolve(res);
    await flush();
    expect(runner.getState()).toEqual({ status: 'failed', reason });
  });

  it('U-5: 応答が cancelled のエラーなら失敗表示にせず idle に戻す', async () => {
    const f = fakeClient();
    const runner = createEngineRunner({
      createClient: () => f.client,
      cache: createEngineCache()
    });
    runner.run(req(1), 'k');
    f.calls[0]?.resolve({ id: 1, type: 'error', message: 'cancelled' });
    await flush();
    expect(runner.getState()).toEqual({ status: 'idle' });
  });

  it('新しい run で前の要求の遅着した応答を無視する', async () => {
    const f = fakeClient();
    const runner = createEngineRunner({
      createClient: () => f.client,
      cache: createEngineCache()
    });
    runner.run(req(1), 'a');
    const first = f.calls[0];
    runner.run(req(2), 'b');
    first?.resolve({ id: 1, type: 'ok', candidates: [], elapsedMs: 1 });
    await flush();
    expect(runner.getState().status).toBe('running');
  });

  it('U-10: dispose で実行中の要求を取り消し(client.dispose)、その後も run で再開できる', async () => {
    const f = fakeClient();
    const runner = createEngineRunner({
      createClient: () => f.client,
      cache: createEngineCache()
    });
    runner.run(req(1), 'k');
    runner.dispose();
    expect(f.disposedCount()).toBeGreaterThan(0);
    await flush();
    expect(runner.getState()).toEqual({ status: 'idle' });
    runner.run(req(2), 'k');
    expect(runner.getState().status).toBe('running');
  });

  it('client は初回の run まで作らない', () => {
    const create = vi.fn(() => fakeClient().client);
    const runner = createEngineRunner({ createClient: create });
    expect(create).not.toHaveBeenCalled();
    runner.dispose();
    expect(create).not.toHaveBeenCalled();
  });

  it('U-10: 直近の結果は cache に残り、同じ key なら再訪時の初期状態にでき、違う key なら取り出せない', async () => {
    const cache = createEngineCache();
    const f = fakeClient();
    const runner = createEngineRunner({
      createClient: () => f.client,
      cache
    });
    runner.run(req(1), 'same');
    f.calls[0]?.resolve({
      id: 1,
      type: 'ok',
      candidates: [cand(0.1)],
      elapsedMs: 3
    });
    await flush();
    runner.dispose();
    const revisit = cache.get('same');
    expect(revisit).not.toBeNull();
    const again = createEngineRunner({
      createClient: () => f.client,
      cache,
      initial: revisit ?? undefined
    });
    expect(again.getState()).toMatchObject({ status: 'done', key: 'same' });
    expect(cache.get('other')).toBeNull();
  });

  it('173-T2: Worker 生成が同期例外を投げると failed(error) になり、登録したタイマーが解除される', async () => {
    class ThrowingWorker {
      constructor() {
        throw new Error('spawn');
      }
    }
    vi.stubGlobal('Worker', ThrowingWorker);
    const registered: number[] = [];
    const cleared: number[] = [];
    let nextTimer = 1;
    const runner = createEngineRunner({
      createClient: createEngineClient,
      cache: createEngineCache(),
      setIntervalFn: () => {
        const h = nextTimer++;
        registered.push(h);
        return h;
      },
      clearIntervalFn: h => {
        cleared.push(h as number);
      }
    });
    runner.run(req(1), 'k');
    await flush();
    expect(runner.getState()).toEqual({ status: 'failed', reason: 'error' });
    expect(registered).toEqual([1]);
    expect(cleared).toEqual([1]);
  });
});

describe('visibleRunState', () => {
  it('key が違う done は idle として扱い、それ以外はそのまま', () => {
    const done: EngineRunState = {
      status: 'done',
      candidates: [],
      elapsedMs: 1,
      key: 'a'
    };
    expect(visibleRunState(done, 'a')).toBe(done);
    expect(visibleRunState(done, 'b')).toEqual({ status: 'idle' });
    const running: EngineRunState = {
      status: 'running',
      startedAt: 0,
      elapsedMs: 0
    };
    expect(visibleRunState(running, 'b')).toBe(running);
  });
});
