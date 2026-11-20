import type { EngineRequest, EngineResponse } from './types';

interface WorkerScope {
  onmessage: ((e: MessageEvent<EngineRequest>) => void) | null;
  postMessage: (msg: EngineResponse) => void;
}

const workerSelf = self as unknown as WorkerScope;

// 動的 import にすることで wasm 初期化(top-level await)より先に onmessage を同期登録し、
// Worker 起動直後の postMessage 取りこぼしを防ぐ
const computePromise = import('./compute');

workerSelf.onmessage = async (e: MessageEvent<EngineRequest>) => {
  const req = e.data;
  try {
    const { computeEngine } = await computePromise;
    const res = computeEngine(req);
    workerSelf.postMessage(res);
  } catch (err) {
    workerSelf.postMessage({
      id: req.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err)
    });
  }
};
