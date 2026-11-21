import { useEffect, useState, useSyncExternalStore } from 'react';
import { type EngineClient, createEngineClient } from '../../engine/client';
import {
  type EngineRunState,
  type EngineRunner,
  createEngineRunner,
  defaultEngineCache
} from './engine-run';

export interface UseEngineRun {
  state: EngineRunState;
  run: EngineRunner['run'];
  cancel: EngineRunner['cancel'];
}

/**
 * 計算の実行状態のフック。`createClient` は初回の実行時に呼ぶ(テストでフェイクを注入する)。
 * アンマウントで取り消して Worker を破棄する。
 * 初期状態は、直近の結果が `key` と一致すればそれ(再訪時の再表示)
 */
export function useEngineRun(
  key: string,
  createClient: () => EngineClient = createEngineClient
): UseEngineRun {
  // 再訪時: 同じ入力・条件の直近の結果があれば初期表示にする
  const [runner] = useState(() =>
    createEngineRunner({
      createClient,
      initial: defaultEngineCache.get(key) ?? undefined
    })
  );
  const state = useSyncExternalStore(runner.subscribe, runner.getState);
  useEffect(() => () => runner.dispose(), [runner]);
  return {
    state,
    run: runner.run,
    cancel: runner.cancel
  };
}
