import {
  calc_shanten_sanma,
  sanma_tile_limits,
  search,
  solve,
  solve_for_candidates
} from 'engine';
import { type Input, instantiateMeld } from '../core/input';
import { validateRule } from '../core/rule';
import { redCountOf } from '../core/rule';
import {
  type Tile,
  type TileCounts,
  type TileCountsIndex,
  countsIndexToTile,
  isAvailableTiles,
  isSanmaIndex,
  isSanmaTile,
  tileToCountsIndex,
  tilesToCounts
} from '../core/tile';
import {
  type EvalContext,
  type RedBaseline,
  buildValuesTable
} from './evaluate';
import type {
  CandidateStat,
  EngineRequest,
  EngineResponse,
  EvaluatedWin,
  TurnStat
} from './types';

const NORTH_TILE: Tile = { type: 'z', n: 4 };

const countRedInTiles = (tiles: readonly Tile[], suit: 'p' | 's'): number => {
  let c = 0;
  for (const t of tiles) {
    if (t.type === suit && t.n === 5 && t.red) c++;
  }
  return c;
};

const isValidInput = (input: Input, rule: EngineRequest['rule']): boolean => {
  if (!Number.isInteger(input.nuki) || input.nuki < 0 || input.nuki > 4) {
    return false;
  }
  if (rule.north === 'yakuhai' && input.nuki > 0) {
    return false;
  }
  if (input.melds.length > 4) {
    return false;
  }
  for (const m of input.melds) {
    if (m.tile === null || !isSanmaTile(m.tile)) return false;
  }
  if (
    input.hand.some(t => !isSanmaTile(t)) ||
    input.dora.some(t => !isSanmaTile(t)) ||
    (input.uradora ?? []).some(t => !isSanmaTile(t))
  ) {
    return false;
  }
  const expected13 = 13 - input.melds.length * 3;
  if (
    input.hand.length !== expected13 &&
    input.hand.length !== expected13 + 1
  ) {
    return false;
  }
  const meldTiles = input.melds.flatMap(m => instantiateMeld(m, rule.red));
  const allVisible: Tile[] = [
    ...input.hand,
    ...meldTiles,
    ...input.dora,
    ...(input.uradora ?? []),
    ...Array<Tile>(input.nuki).fill(NORTH_TILE)
  ];
  return isAvailableTiles(rule.red, [], allVisible);
};

interface CandidateInfo {
  index: number;
  discard: Tile | null;
  counts: TileCounts;
  shanten: number;
  k0: { p: number; s: number };
  a0: { p: number; s: number };
}

export interface EngineComputeMeta {
  stateCount: number;
  tempaiCount: number;
}

/**
 * 計算エンジンの同期本体(テストや Worker から呼び出す)。
 */
export function computeEngine(
  req: EngineRequest,
  onMeta?: (meta: EngineComputeMeta) => void
): EngineResponse {
  const startMs = performance.now();
  const { id, table, input, rule, remainingDraws, options } = req;

  try {
    if (
      !options ||
      typeof options.tegawari !== 'boolean' ||
      typeof options.backtrack !== 'boolean' ||
      (options.tegawari === false && options.backtrack === true) ||
      typeof options.backtrackDiffMargin !== 'number' ||
      !Number.isInteger(options.backtrackDiffMargin) ||
      options.backtrackDiffMargin < 0 ||
      options.backtrackDiffMargin > 4
    ) {
      return { id, type: 'error', message: 'invalid-options' };
    }

    if (
      typeof remainingDraws !== 'number' ||
      !Number.isInteger(remainingDraws) ||
      remainingDraws < 0 ||
      remainingDraws > 55
    ) {
      return { id, type: 'error', message: 'invalid-remaining-draws' };
    }

    if (validateRule(rule).length > 0) {
      return { id, type: 'error', message: 'invalid-rule' };
    }
    if (
      !Number.isInteger(table.continue) ||
      table.continue < 0 ||
      !Number.isInteger(table.deposit) ||
      table.deposit < 0
    ) {
      return { id, type: 'error', message: 'invalid-table' };
    }

    if (!isValidInput(input, rule)) {
      return { id, type: 'not-applicable' };
    }

    const meldsM = 4 - input.melds.length;
    const expected13 = 13 - input.melds.length * 3;
    const is14 = input.hand.length === expected13 + 1;

    const h0Counts = tilesToCounts(input.hand);
    const h0Bytes = Uint8Array.from(h0Counts);
    const s0 = calc_shanten_sanma(h0Bytes, meldsM);

    // 14枚入力で既に和了形なら対象外 (C-1)
    if (is14 && s0 < 0) {
      return { id, type: 'not-applicable' };
    }

    const h0RedP = countRedInTiles(input.hand, 'p');
    const h0RedS = countRedInTiles(input.hand, 's');
    const h0NonRedP = (h0Counts[13] ?? 0) - h0RedP;
    const h0NonRedS = (h0Counts[22] ?? 0) - h0RedS;

    const candidates: CandidateInfo[] = [];
    if (!is14) {
      if (s0 > 3) {
        return { id, type: 'out-of-range' };
      }
      candidates.push({
        index: 0,
        discard: null,
        counts: h0Counts,
        shanten: s0,
        k0: { p: h0Counts[13] ?? 0, s: h0Counts[22] ?? 0 },
        a0: { p: h0RedP, s: h0RedS }
      });
    } else {
      for (let i = 0; i < 34; i++) {
        if ((h0Counts[i] ?? 0) === 0) continue;
        const candCounts = [...h0Counts] as TileCounts;
        candCounts[i] = ((candCounts[i] ?? 0) - 1) as TileCounts[number];
        const candShanten = calc_shanten_sanma(
          Uint8Array.from(candCounts),
          meldsM
        );
        if (candShanten > 3) continue;

        let discard = countsIndexToTile(i as TileCountsIndex);
        let a0P = h0RedP;
        let a0S = h0RedS;
        // 赤と非赤の五があれば非赤を捨てる候補として表す (§5.2)
        if (discard.type === 'p' && discard.n === 5) {
          if (h0NonRedP > 0) {
            discard = { type: 'p', n: 5, red: false };
          } else {
            discard = { type: 'p', n: 5, red: true };
            a0P = Math.max(0, h0RedP - 1);
          }
        } else if (discard.type === 's' && discard.n === 5) {
          if (h0NonRedS > 0) {
            discard = { type: 's', n: 5, red: false };
          } else {
            discard = { type: 's', n: 5, red: true };
            a0S = Math.max(0, h0RedS - 1);
          }
        }

        candidates.push({
          index: candidates.length,
          discard,
          counts: candCounts,
          shanten: candShanten,
          k0: { p: candCounts[13] ?? 0, s: candCounts[22] ?? 0 },
          a0: { p: a0P, s: a0S }
        });
      }

      if (candidates.length === 0) {
        return { id, type: 'out-of-range' };
      }
    }

    // 見えていない牌の初期枚数 u0 (§3.1・§3.2)
    const meldTiles = input.melds.flatMap(m => instantiateMeld(m, rule.red));
    const visibleWithoutUradora: Tile[] = [
      ...input.hand,
      ...meldTiles,
      ...input.dora,
      ...Array<Tile>(input.nuki).fill(NORTH_TILE)
    ];
    const visibleCounts = tilesToCounts(visibleWithoutUradora);
    const u0 = new Uint8Array(34);
    for (let i = 0; i < 34; i++) {
      if (!isSanmaIndex(i as TileCountsIndex)) continue;
      u0[i] = Math.max(0, 4 - (visibleCounts[i] ?? 0));
    }

    const handsFlat = new Uint8Array(candidates.length * 34);
    for (let ci = 0; ci < candidates.length; ci++) {
      const c = candidates[ci];
      if (c) {
        handsFlat.set(c.counts, ci * 34);
      }
    }

    const tileLimits = sanma_tile_limits();
    const nukiMode = rule.north === 'nukidora';
    const searchRes = search(
      h0Bytes,
      s0,
      handsFlat,
      meldsM,
      u0,
      tileLimits,
      nukiMode,
      remainingDraws,
      options.tegawari,
      options.backtrack,
      options.backtrackDiffMargin
    );

    try {
      onMeta?.({
        stateCount: searchRes.state_count,
        tempaiCount: searchRes.tempai_count
      });

      const tempaiHandsFlat = searchRes.tempai_hands();
      const waitCounts = searchRes.tempai_wait_counts();
      const waitTiles = searchRes.tempai_wait_tiles();
      const eMax = searchRes.max_extra_nuki;

      const evalCtx: EvalContext = {
        table,
        rule,
        melds: input.melds,
        dora: input.dora,
        nuki0: input.nuki,
        includeRinshan: nukiMode && eMax > 0
      };

      const visibleRedP = countRedInTiles(visibleWithoutUradora, 'p');
      const visibleRedS = countRedInTiles(visibleWithoutUradora, 's');
      const availTotal = { p: u0[13] ?? 0, s: u0[22] ?? 0 };
      const availRed = {
        p: Math.max(0, redCountOf(rule.red, 'p') - visibleRedP),
        s: Math.max(0, redCountOf(rule.red, 's') - visibleRedS)
      };

      // (k0.p, a0.p, k0.s, a0.s) で候補をグループ化
      // 13枚入力や五を切らない候補は1つのグループにまとまり、DP 表を共有する
      const groups = new Map<
        string,
        {
          candIndices: number[];
          k0: { p: number; s: number };
          a0: { p: number; s: number };
        }
      >();
      for (const c of candidates) {
        const key = `${c.k0.p}:${c.a0.p}:${c.k0.s}:${c.a0.s}`;
        const existing = groups.get(key);
        if (existing) {
          existing.candIndices.push(c.index);
        } else {
          groups.set(key, { candIndices: [c.index], k0: c.k0, a0: c.a0 });
        }
      }

      const evalCache = new Map<number, EvaluatedWin[]>();
      const stride = 3 + remainingDraws * 3;
      const statsByCandIdx = new Array<CandidateStat>(candidates.length);

      const groupList = Array.from(groups.values());
      const useSingleSolve = groupList.length === 1;

      for (const g of groupList) {
        const redBase: RedBaseline = {
          k0: g.k0,
          a0: g.a0,
          availableTotal: availTotal,
          availableRed: availRed
        };
        const values = buildValuesTable(
          tempaiHandsFlat,
          waitCounts,
          waitTiles,
          eMax,
          evalCtx,
          redBase,
          evalCache
        );
        const solvedFlat = useSingleSolve
          ? solve(searchRes, values)
          : solve_for_candidates(
              searchRes,
              values,
              Uint32Array.from(g.candIndices)
            );

        for (let gi = 0; gi < g.candIndices.length; gi++) {
          const ci = g.candIndices[gi] as number;
          const cand = candidates[ci] as CandidateInfo;
          const base = gi * stride;
          const perTurn: TurnStat[] = [];
          for (let t = 0; t < remainingDraws; t++) {
            const tb = base + 3 + t * 3;
            perTurn.push({
              draw: t + 1,
              tenpai: solvedFlat[tb] ?? 0,
              win: solvedFlat[tb + 1] ?? 0,
              ev: solvedFlat[tb + 2] ?? 0
            });
          }
          statsByCandIdx[ci] = {
            discard: cand.discard,
            shanten: cand.shanten,
            tenpai: solvedFlat[base] ?? 0,
            win: solvedFlat[base + 1] ?? 0,
            ev: solvedFlat[base + 2] ?? 0,
            perTurn
          };
        }
      }

      if (is14) {
        statsByCandIdx.sort((a, b) => {
          if (b.ev !== a.ev) return b.ev - a.ev;
          if (b.win !== a.win) return b.win - a.win;
          if (b.tenpai !== a.tenpai) return b.tenpai - a.tenpai;
          const ia = a.discard ? tileToCountsIndex(a.discard) : 0;
          const ib = b.discard ? tileToCountsIndex(b.discard) : 0;
          return ia - ib;
        });
      }

      return {
        id,
        type: 'ok',
        candidates: statsByCandIdx,
        elapsedMs: performance.now() - startMs
      };
    } finally {
      searchRes.free();
    }
  } catch (err) {
    return {
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err)
    };
  }
}
