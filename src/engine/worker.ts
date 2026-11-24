import type { EngineComputeMeta } from './compute';
import type { EngineRequest, EngineResponse } from './types';

/** 計測用に、応答へ探索の統計(状態数など)を添える。UI は無視してよい */
export type EngineWorkerMessage = EngineResponse & {
  meta?: EngineComputeMeta;
  /** 初期化失敗など、この Worker では復旧できない error 応答。クライアントは Worker ごと作り直す */
  fatal?: boolean;
};

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
  let computeEngine: typeof import('./compute').computeEngine;
  try {
    ({ computeEngine } = await computePromise);
  } catch (err) {
    // モジュール評価(WASM 初期化)の失敗は同じ Worker 内でキャッシュされ復旧しないので fatal を付ける
    workerSelf.postMessage({
      id: req.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
      fatal: true
    });
    return;
  }
  try {
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
