import type { EngineRequest, EngineResponse } from './types';
import type { EngineWorkerMessage } from './worker';

interface PendingRequest {
  id: number;
  resolve: (res: EngineResponse) => void;
}

export interface EngineClient {
  requestEngine: (req: EngineRequest) => Promise<EngineResponse>;
  dispose: () => void;
}

/**
 * 計算エンジン Worker を管理するクライアントを生成する (§5.2)。
 * 新しい要求が来たら古い未完了の要求は `{type:'error', message:'cancelled'}` で解決し、
 * Worker を terminate して作り直す。
 */
export function createEngineClient(): EngineClient {
  let worker: Worker | null = null;
  let pending: PendingRequest | null = null;

  const spawnWorker = (): Worker => {
    const w = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module'
    });
    // 失敗した Worker は破棄し、次の要求で作り直す(ES モジュールの評価エラーは同じ Worker 内で復旧しない)
    const discard = () => {
      if (worker === w) worker = null;
      w.terminate();
    };
    w.onmessage = (e: MessageEvent<EngineWorkerMessage>) => {
      const res = e.data;
      if (pending && res.id === pending.id) {
        const p = pending;
        pending = null;
        p.resolve(res);
      }
      if (res.fatal === true) discard();
    };
    w.onerror = (e: ErrorEvent) => {
      if (pending) {
        const p = pending;
        pending = null;
        p.resolve({
          id: p.id,
          type: 'error',
          message: e.message || 'worker error'
        });
      }
      discard();
    };
    return w;
  };

  const requestEngine = (req: EngineRequest): Promise<EngineResponse> => {
    if (pending) {
      const prev = pending;
      pending = null;
      if (worker) {
        worker.terminate();
        worker = null;
      }
      prev.resolve({ id: prev.id, type: 'error', message: 'cancelled' });
    }

    if (!worker) {
      worker = spawnWorker();
    }

    return new Promise<EngineResponse>(resolve => {
      pending = { id: req.id, resolve };
      worker?.postMessage(req);
    });
  };

  const dispose = () => {
    if (pending) {
      const prev = pending;
      pending = null;
      prev.resolve({ id: prev.id, type: 'error', message: 'cancelled' });
    }
    if (worker) {
      worker.terminate();
      worker = null;
    }
  };

  return { requestEngine, dispose };
}

const defaultClient = createEngineClient();

export const requestEngine = (req: EngineRequest): Promise<EngineResponse> =>
  defaultClient.requestEngine(req);

export const disposeEngineClient = (): void => {
  defaultClient.dispose();
};
