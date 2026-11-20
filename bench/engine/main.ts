import type { Rule } from '../../src/core/rule';
import { RULE_PRESETS } from '../../src/core/rule-preset';
import type { Table } from '../../src/core/table';
import { createEngineClient } from '../../src/engine/client';
import { computeEngine } from '../../src/engine/compute';
import {
  DEFAULT_REMAINING_DRAWS,
  type EngineOptions,
  type EngineRequest
} from '../../src/engine/types';
import { BENCH_HANDS, parseTiles } from './hands';

export interface HandRunResult {
  handId: string;
  shanten: 1 | 2 | 3;
  configName: string;
  stateCount: number;
  tempaiCount: number;
  runsMs: number[];
  medianMs: number;
  minMs: number;
  maxMs: number;
  error?: string;
}

interface BenchWindow extends Window {
  __bench?: {
    runOneHand: (
      handId: string,
      configName: string,
      options: EngineOptions,
      runs: number,
      remainingDraws?: number
    ) => Promise<HandRunResult>;
    listHands: () => { id: string; shanten: 1 | 2 | 3 }[];
  };
}

const table: Table = {
  round: 'east',
  seat: 'south',
  continue: 0,
  deposit: 0
};

const rule: Rule = (() => {
  const r = RULE_PRESETS[0]?.rule;
  if (!r) {
    throw new Error('RULE_PRESETS[0] not found');
  }
  return r;
})();

const median = (sorted: number[]): number => {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

async function runOneHand(
  handId: string,
  configName: string,
  options: EngineOptions,
  runs: number,
  remainingDraws = DEFAULT_REMAINING_DRAWS
): Promise<HandRunResult> {
  const spec = BENCH_HANDS.find(h => h.id === handId);
  if (!spec) {
    throw new Error(`Unknown handId: ${handId}`);
  }
  const input = {
    hand: parseTiles(spec.handStr),
    melds: spec.melds,
    dora: spec.doraStr.flatMap(d => parseTiles(d)),
    nuki: spec.nuki
  };

  let stateCount = 0;
  let tempaiCount = 0;
  const warmupReq: EngineRequest = {
    id: 0,
    table,
    input,
    rule,
    remainingDraws,
    options
  };

  // 到達状態数・聴牌形数を取得 + ウォームアップ1回 (冷計測前にキャッシュ温め)
  const metaCheck = computeEngine(warmupReq, meta => {
    stateCount = meta.stateCount;
    tempaiCount = meta.tempaiCount;
  });
  if (metaCheck.type !== 'ok') {
    return {
      handId,
      shanten: spec.shanten,
      configName,
      stateCount,
      tempaiCount,
      runsMs: [],
      medianMs: 0,
      minMs: 0,
      maxMs: 0,
      error: `warmup failed: ${metaCheck.type}`
    };
  }

  // Worker 冷ウォームアップ 1回
  {
    const client = createEngineClient();
    await client.requestEngine({ ...warmupReq, id: 1 });
    client.dispose();
  }

  const runsMs: number[] = [];
  for (let i = 0; i < runs; i++) {
    const client = createEngineClient();
    const t0 = performance.now();
    const res = await client.requestEngine({ ...warmupReq, id: i + 2 });
    const dt = performance.now() - t0;
    client.dispose();
    if (res.type !== 'ok') {
      return {
        handId,
        shanten: spec.shanten,
        configName,
        stateCount,
        tempaiCount,
        runsMs,
        medianMs: 0,
        minMs: 0,
        maxMs: 0,
        error: `run ${i} failed: ${res.type} ${res.type === 'error' ? res.message : ''}`
      };
    }
    runsMs.push(res.elapsedMs > 0 ? res.elapsedMs : dt);
  }

  const sorted = [...runsMs].sort((a, b) => a - b);
  return {
    handId,
    shanten: spec.shanten,
    configName,
    stateCount,
    tempaiCount,
    runsMs,
    medianMs: median(sorted),
    minMs: sorted[0] ?? 0,
    maxMs: sorted[sorted.length - 1] ?? 0
  };
}

const bw = window as BenchWindow;
bw.__bench = {
  runOneHand,
  listHands: () => BENCH_HANDS.map(h => ({ id: h.id, shanten: h.shanten }))
};

const outEl = document.getElementById('output');
if (outEl) {
  outEl.textContent = 'bench ready';
}
