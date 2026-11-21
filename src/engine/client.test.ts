import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEngineClient } from './client';
import { DEFAULT_ENGINE_OPTIONS, type EngineRequest } from './types';

type Behavior = 'ok' | 'onerror' | 'fatal' | 'error' | 'hold';

/** 生成順に振る舞いを決める模擬 Worker */
const installMockWorker = (behaviors: Behavior[]) => {
  const instances: MockWorker[] = [];
  class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: ErrorEvent) => void) | null = null;
    terminated = false;
    readonly behavior: Behavior;
    constructor() {
      this.behavior = behaviors[instances.length] ?? 'ok';
      instances.push(this);
    }
    /** 'hold' の Worker に、テストが任意のタイミングで応答・エラーを届ける */
    emit(data: unknown) {
      this.onmessage?.({ data } as MessageEvent);
    }
    fail(message: string) {
      this.onerror?.({ message } as ErrorEvent);
    }
    postMessage(req: EngineRequest) {
      if (this.behavior === 'hold') return;
      queueMicrotask(() => {
        if (this.behavior === 'onerror') {
          this.onerror?.({ message: 'boom' } as ErrorEvent);
        } else if (this.behavior === 'fatal') {
          this.onmessage?.({
            data: { id: req.id, type: 'error', message: 'init', fatal: true }
          } as MessageEvent);
        } else if (this.behavior === 'error') {
          this.onmessage?.({
            data: { id: req.id, type: 'error', message: 'invalid-options' }
          } as MessageEvent);
        } else {
          this.onmessage?.({
            data: { id: req.id, type: 'out-of-range' }
          } as MessageEvent);
        }
      });
    }
    terminate() {
      this.terminated = true;
    }
  }
  vi.stubGlobal('Worker', MockWorker);
  return instances;
};

const req = (id: number): EngineRequest => ({
  id,
  table: { round: 'east', seat: 'south', continue: 0, deposit: 0 },
  input: { hand: [], melds: [], dora: [], nuki: 0 },
  rule: {} as EngineRequest['rule'],
  remainingDraws: 1,
  options: { ...DEFAULT_ENGINE_OPTIONS }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('F3-1 client の Worker 復旧 (Issue #138)', () => {
  it('F31-C6a: 起動失敗(onerror)後、2回目の要求が新しい Worker で成功する', async () => {
    const workers = installMockWorker(['onerror', 'ok']);
    const client = createEngineClient();
    const r1 = await client.requestEngine(req(1));
    expect(r1).toMatchObject({ type: 'error', message: 'boom' });
    expect(workers[0]?.terminated).toBe(true);
    const r2 = await client.requestEngine(req(2));
    expect(r2.type).toBe('out-of-range');
    expect(workers).toHaveLength(2);
  });

  it('F31-C6b: 初期化失敗(fatal:true の error 応答)後、2回目の要求が新しい Worker で成功する', async () => {
    const workers = installMockWorker(['fatal', 'ok']);
    const client = createEngineClient();
    const r1 = await client.requestEngine(req(1));
    expect(r1).toMatchObject({ type: 'error', message: 'init' });
    expect(workers[0]?.terminated).toBe(true);
    const r2 = await client.requestEngine(req(2));
    expect(r2.type).toBe('out-of-range');
    expect(workers).toHaveLength(2);
  });

  it('F31-C6c: 通常の error 応答(fatal なし)では Worker を再生成しない', async () => {
    const workers = installMockWorker(['error']);
    const client = createEngineClient();
    const r1 = await client.requestEngine(req(1));
    expect(r1).toMatchObject({ type: 'error', message: 'invalid-options' });
    expect(workers[0]?.terminated).toBe(false);
    // 同じ Worker が次の要求も受ける(振る舞いは 'error' のまま)
    const r2 = await client.requestEngine(req(2));
    expect(r2).toMatchObject({ type: 'error' });
    expect(workers).toHaveLength(1);
  });

  /** 要求を出し、解決済みかどうかを追跡する */
  const track = (p: Promise<unknown>) => {
    const state: { done: boolean; value?: unknown } = { done: false };
    p.then(v => {
      state.done = true;
      state.value = v;
    });
    return state;
  };
  const flush = () => new Promise(r => setTimeout(r, 0));

  it('F31-C6d: 取り消し後に旧 Worker から onerror が遅着しても、新しい要求は新 Worker の応答で解決される', async () => {
    const workers = installMockWorker(['hold', 'hold']);
    const client = createEngineClient();
    const r1 = client.requestEngine(req(1));
    const r2 = track(client.requestEngine(req(2)));
    expect(await r1).toMatchObject({ type: 'error', message: 'cancelled' });
    workers[0]?.fail('late');
    await flush();
    expect(r2.done).toBe(false);
    workers[1]?.emit({ id: 2, type: 'out-of-range' });
    await flush();
    expect(r2.value).toEqual({ id: 2, type: 'out-of-range' });
    expect(workers).toHaveLength(2);
  });

  it('F31-C6e: 取り消し後に旧 Worker から同じ id の応答が遅着しても、新しい要求は新 Worker の応答で解決される', async () => {
    const workers = installMockWorker(['hold', 'hold']);
    const client = createEngineClient();
    const r1 = client.requestEngine(req(1));
    const r2 = track(client.requestEngine(req(2)));
    await r1;
    workers[0]?.emit({ id: 2, type: 'error', message: 'late-old' });
    await flush();
    expect(r2.done).toBe(false);
    workers[1]?.emit({ id: 2, type: 'out-of-range' });
    await flush();
    expect(r2.value).toEqual({ id: 2, type: 'out-of-range' });
  });

  it('F31-C6f: dispose() 後に新しい要求を始め、旧 Worker のイベントが遅着しても新 Worker の応答で解決される', async () => {
    const workers = installMockWorker(['hold', 'hold']);
    const client = createEngineClient();
    const r1 = client.requestEngine(req(1));
    client.dispose();
    expect(await r1).toMatchObject({ type: 'error', message: 'cancelled' });
    const r2 = track(client.requestEngine(req(2)));
    workers[0]?.fail('late');
    workers[0]?.emit({ id: 2, type: 'error', message: 'late-old' });
    await flush();
    expect(r2.done).toBe(false);
    workers[1]?.emit({ id: 2, type: 'out-of-range' });
    await flush();
    expect(r2.value).toEqual({ id: 2, type: 'out-of-range' });
    expect(workers).toHaveLength(2);
  });
});
