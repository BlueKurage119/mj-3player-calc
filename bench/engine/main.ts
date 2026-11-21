import type { Rule } from '../../src/core/rule';
import { RULE_PRESETS } from '../../src/core/rule-preset';
import type { Table } from '../../src/core/table';
import type { Tile } from '../../src/core/tile';
import { createEngineClient } from '../../src/engine/client';
import {
  DEFAULT_REMAINING_DRAWS,
  type EngineOptions,
  type EngineRequest,
  type EngineResponse
} from '../../src/engine/types';
import type { EngineWorkerMessage } from '../../src/engine/worker';
import {
  BENCH_HANDS,
  BENCH_HANDS_14,
  type BenchHandSpec,
  parseTiles
} from './hands';

/** 打牌候補1件の要約(14枚入力のとき) */
export interface CandidateSummary {
  discard: string | null;
  shanten: number;
  tenpai: number;
  win: number;
  ev: number;
}

export interface HandRunResult {
  handId: string;
  shanten: 1 | 2 | 3;
  configName: string;
  /** 全探索の状態数・聴牌形数の合計 */
  stateCount: number;
  tempaiCount: number;
  /** 探索表の数・solve の回数・密な DP テーブルの要素数(状態数×T) */
  searchCount: number;
  solveCount: number;
  denseCells: number;
  /** 探索ごとの内訳 */
  searches: { stateCount: number; tempaiCount: number; sRef: number }[];
  /** 各回の Worker 内の計算時間(ms。Worker 作成・WASM 初期化は含まない) */
  runsMs: number[];
  /** 各回の要求から応答までの壁時計時間(ms。冷=Worker 作成を含む) */
  wallMs: number[];
  medianMs: number;
  minMs: number;
  maxMs: number;
  /** 先頭候補の値(13枚入力は唯一の候補) */
  top?: CandidateSummary;
  /** 14枚入力の全候補(ev 降順) */
  candidates?: CandidateSummary[];
  error?: string;
}

interface BenchWindow extends Window {
  __bench?: {
    runOneHand: (
      handId: string,
      configName: string,
      options: EngineOptions,
      runs: number,
      remainingDraws?: number,
      perCandidateRef?: boolean,
      handBudgetMs?: number,
      runTimeoutMs?: number
    ) => Promise<HandRunResult>;
    listHands: () => { id: string; shanten: 1 | 2 | 3; is14: boolean }[];
  };
}

const ALL_HANDS: readonly BenchHandSpec[] = [...BENCH_HANDS, ...BENCH_HANDS_14];

const tileStr = (t: Tile | null): string | null =>
  t === null
    ? null
    : `${t.type !== 'z' && t.n === 5 && t.red ? 0 : t.n}${t.type}`;

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
  remainingDraws = DEFAULT_REMAINING_DRAWS,
  perCandidateRef = false,
  handBudgetMs = Number.POSITIVE_INFINITY,
  runTimeoutMs = Number.POSITIVE_INFINITY
): Promise<HandRunResult> {
  const spec = ALL_HANDS.find(h => h.id === handId);
  if (!spec) {
    throw new Error(`Unknown handId: ${handId}`);
  }
  const input = {
    hand: parseTiles(spec.handStr),
    melds: spec.melds,
    dora: spec.doraStr.flatMap(d => parseTiles(d)),
    nuki: spec.nuki
  };

  const result: HandRunResult = {
    handId,
    shanten: spec.shanten,
    configName,
    stateCount: 0,
    tempaiCount: 0,
    searchCount: 0,
    solveCount: 0,
    denseCells: 0,
    searches: [],
    runsMs: [],
    wallMs: [],
    medianMs: 0,
    minMs: 0,
    maxMs: 0
  };
  const baseReq: EngineRequest = {
    id: 0,
    table,
    input,
    rule,
    remainingDraws,
    options,
    ...(perCandidateRef ? { __experimentalPerCandidateRef: true } : {})
  };

  // 毎回 Worker を作り直す(冷)。最初の1回は WASM・モジュールの読み込みで遅くなるので、
  // 計測前に小さい要求(T=0)で Worker を温めるのではなく、各回とも冷のまま測る
  let cumulativeMs = 0;
  for (let i = 0; i < runs; i++) {
    const client = createEngineClient();
    const t0 = performance.now();
    // 1回の上限時間を超えたら Worker を terminate して打ち切る(測定不能として記録する)
    let timer: ReturnType<typeof setTimeout> | undefined;
    const res = (await Promise.race([
      client.requestEngine({ ...baseReq, id: i + 1 }),
      new Promise<EngineWorkerMessage>(resolve => {
        timer = setTimeout(
          () => resolve({ id: i + 1, type: 'error', message: 'timeout' }),
          runTimeoutMs
        );
      })
    ])) as EngineWorkerMessage;
    clearTimeout(timer);
    const dt = performance.now() - t0;
    client.dispose();
    if (res.type !== 'ok') {
      result.error = `run ${i} failed: ${res.type} ${res.type === 'error' ? res.message : ''}`;
      break;
    }
    result.runsMs.push(res.elapsedMs > 0 ? res.elapsedMs : dt);
    result.wallMs.push(dt);
    if (i === 0) {
      const meta = res.meta;
      if (meta) {
        result.stateCount = meta.stateCount;
        result.tempaiCount = meta.tempaiCount;
        result.searchCount = meta.searchCount;
        result.solveCount = meta.solveCount;
        result.denseCells = meta.denseCells;
        result.searches = meta.searches;
      }
      const sum = (
        c: Extract<EngineResponse, { type: 'ok' }>['candidates'][number]
      ) => ({
        discard: tileStr(c.discard),
        shanten: c.shanten,
        tenpai: c.tenpai,
        win: c.win,
        ev: c.ev
      });
      result.candidates = res.candidates.map(sum);
      const top = result.candidates[0];
      if (top) result.top = top;
    }
    // 1手・1構成あたりの累積時間の上限(遅い構成で測定が終わらなくなるのを避ける。最低1回は測る)
    cumulativeMs += dt;
    if (cumulativeMs > handBudgetMs) break;
  }

  const sorted = [...result.runsMs].sort((a, b) => a - b);
  result.medianMs = median(sorted);
  result.minMs = sorted[0] ?? 0;
  result.maxMs = sorted[sorted.length - 1] ?? 0;
  return result;
}

const bw = window as BenchWindow;
bw.__bench = {
  runOneHand,
  listHands: () =>
    ALL_HANDS.map(h => ({
      id: h.id,
      shanten: h.shanten,
      is14: BENCH_HANDS_14.includes(h)
    }))
};

const outEl = document.getElementById('output');
if (outEl) {
  outEl.textContent = 'bench ready';
}
