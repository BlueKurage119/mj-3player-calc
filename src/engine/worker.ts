import type { EngineComputeMeta } from './compute';
import type { EngineRequest, EngineResponse } from './types';

/** 計測用に、応答へ探索の統計(状態数など)を添える。UI は無視してよい */
export type EngineWorkerMessage = EngineResponse & { meta?: EngineComputeMeta };

interface WorkerScope {
  onmessage: ((e: MessageEvent<EngineRequest>) => void) | null;
  postMessage: (msg: EngineWorkerMessage) => void;
}

const workerSelf = self as unknown as WorkerScope;

// 動的 import にすることで wasm 初期化(top-level await)より先に onmessage を同期登録し、
// Worker 起動直後の postMessage 取りこぼしを防ぐ
const computePromise = import('./compute');

workerSelf.onmessage = async (e: MessageEvent<EngineRequest>) => {
  const req = e.data;
  try {
    const { computeEngine } = await computePromise;
    let meta: EngineComputeMeta | undefined;
    const res = computeEngine(req, m => {
      meta = m;
    });
    workerSelf.postMessage(meta ? { ...res, meta } : res);
  } catch (err) {
    workerSelf.postMessage({
      id: req.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err)
    });
  }
};
