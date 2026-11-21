// 計算の実行状態を管理する(React に依存しない。フックは use-engine-run.ts)
import type { EngineClient } from '../../engine/client';
import type { CandidateStat, EngineRequest } from '../../engine/types';

export type EngineFailReason = 'out-of-range' | 'not-applicable' | 'error';

export type EngineRunState =
  | { status: 'idle' }
  | { status: 'running'; startedAt: number; elapsedMs: number }
  | {
      status: 'done';
      candidates: CandidateStat[];
      elapsedMs: number;
      key: string;
    }
  | { status: 'failed'; reason: EngineFailReason };

export const IDLE_STATE: EngineRunState = { status: 'idle' };

/** 現在の key と一致しない結果は捨てて未計算として扱う */
export const visibleRunState = (
  state: EngineRunState,
  key: string
): EngineRunState =>
  state.status === 'done' && state.key !== key ? IDLE_STATE : state;

/* ---- 直近1件の結果(画面を離れて戻ったとき、同じ入力・条件なら再表示する) ---- */

export interface EngineCache {
  get: (key: string) => Extract<EngineRunState, { status: 'done' }> | null;
  set: (state: Extract<EngineRunState, { status: 'done' }>) => void;
  clear: () => void;
}

export const createEngineCache = (): EngineCache => {
  let last: Extract<EngineRunState, { status: 'done' }> | null = null;
  return {
    get: key => (last !== null && last.key === key ? last : null),
    set: state => {
      last = state;
    },
    clear: () => {
      last = null;
    }
  };
};

/** 画面を離れても保持する直近1件(モジュール内変数) */
export const defaultEngineCache: EngineCache = createEngineCache();

/* ---- 実行の制御 ---- */

export interface EngineRunnerOptions {
  /** client は初回の実行時に生成する(画面を開いただけでは Worker を作らない) */
  createClient: () => EngineClient;
  cache?: EngineCache;
  /** 初期状態(再訪時に直近の結果を表示するとき)。既定は idle */
  initial?: EngineRunState | undefined;
  now?: () => number;
  setIntervalFn?: (fn: () => void, ms: number) => unknown;
  clearIntervalFn?: (handle: unknown) => void;
}

export interface EngineRunner {
  getState: () => EngineRunState;
  subscribe: (listener: () => void) => () => void;
  run: (req: EngineRequest, key: string) => void;
  /** 実行中の要求を取り消して idle に戻す */
  cancel: () => void;
  /** 取り消して Worker を破棄する(画面を離れるとき)。破棄後も run で再開できる */
  dispose: () => void;
}

const TICK_MS = 1000;

export const createEngineRunner = (opts: EngineRunnerOptions): EngineRunner => {
  const cache = opts.cache ?? defaultEngineCache;
  const now = opts.now ?? (() => Date.now());
  const setIntervalFn = opts.setIntervalFn ?? ((fn, ms) => setInterval(fn, ms));
  const clearIntervalFn =
    opts.clearIntervalFn ??
    (h => clearInterval(h as ReturnType<typeof setInterval>));

  let client: EngineClient | null = null;
  let state: EngineRunState = opts.initial ?? IDLE_STATE;
  let token = 0;
  let timer: unknown = null;
  const listeners = new Set<() => void>();

  const emit = (next: EngineRunState) => {
    state = next;
    for (const l of [...listeners]) l();
  };
  const stopTimer = () => {
    if (timer !== null) {
      clearIntervalFn(timer);
      timer = null;
    }
  };

  const cancelRun = () => {
    token++;
    stopTimer();
    client?.dispose();
  };

  return {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    run: (req, key) => {
      cancelRun();
      const mine = token;
      const startedAt = now();
      client ??= opts.createClient();
      emit({ status: 'running', startedAt, elapsedMs: 0 });
      timer = setIntervalFn(() => {
        if (token !== mine || state.status !== 'running') return;
        emit({ ...state, elapsedMs: now() - startedAt });
      }, TICK_MS);
      client
        .requestEngine(req)
        .then(res => {
          if (token !== mine) return;
          stopTimer();
          if (res.type === 'ok') {
            const done = {
              status: 'done' as const,
              candidates: res.candidates,
              elapsedMs: res.elapsedMs,
              key
            };
            cache.set(done);
            emit(done);
          } else if (res.type === 'error') {
            // 'cancelled' は取り消しの結果なのでエラーとして表示しない(未実行に戻す)
            emit(
              res.message === 'cancelled'
                ? IDLE_STATE
                : { status: 'failed', reason: 'error' }
            );
          } else {
            emit({ status: 'failed', reason: res.type });
          }
        })
        .catch(() => {
          if (token !== mine) return;
          stopTimer();
          emit({ status: 'failed', reason: 'error' });
        });
    },
    cancel: () => {
      if (state.status !== 'running') return;
      cancelRun();
      emit(IDLE_STATE);
    },
    dispose: () => {
      cancelRun();
      client = null;
      if (state.status === 'running') state = IDLE_STATE;
    }
  };
};
