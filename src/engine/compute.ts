import { calc_shanten_sanma, sanma_tile_limits, search, solve } from 'engine';
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
  type ValuesContext,
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

/**
 * 赤の分布の基準(確定 Q20 案a): 起点 (k0, a0) は全候補で共通に、入力の手 H0(打牌前の手)の
 * 五p・五s の枚数と赤の枚数に取る。N・R は見えていない牌(u0)から求める。
 */
export const redBaselineOf = (
  h0Hand: readonly Tile[],
  visible: readonly Tile[],
  u0: ArrayLike<number>,
  rule: EngineRequest['rule']
): RedBaseline => {
  const countFives = (suit: 'p' | 's') =>
    h0Hand.filter(t => t.type === suit && t.n === 5).length;
  return {
    k0: { p: countFives('p'), s: countFives('s') },
    a0: {
      p: countRedInTiles(h0Hand, 'p'),
      s: countRedInTiles(h0Hand, 's')
    },
    availableTotal: { p: u0[13] ?? 0, s: u0[22] ?? 0 },
    availableRed: {
      p: Math.max(0, redCountOf(rule.red, 'p') - countRedInTiles(visible, 'p')),
      s: Math.max(0, redCountOf(rule.red, 's') - countRedInTiles(visible, 's'))
    }
  };
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
}

export interface EngineComputeMeta {
  /** 全探索の状態数の合計 */
  stateCount: number;
  /** 全探索の聴牌形数の合計 */
  tempaiCount: number;
  /** 探索表の数(共通 s_ref は 1、対案S は 14枚入力で最大 2) */
  searchCount: number;
  /** `solve` の呼び出し回数 */
  solveCount: number;
  /** 密な DP テーブルの要素数の合計(状態数 × T) */
  denseCells: number;
  /** 探索ごとの内訳 */
  searches: { stateCount: number; tempaiCount: number; sRef: number }[];
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
      typeof options.diffSlack !== 'number' ||
      !Number.isInteger(options.diffSlack) ||
      options.diffSlack < 0 ||
      options.diffSlack > 2
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
        shanten: s0
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
        // 赤と非赤の五があれば非赤を捨てる候補として表す (§5.2)
        if (discard.type === 'p' && discard.n === 5) {
          if (h0NonRedP > 0) {
            discard = { type: 'p', n: 5, red: false };
          } else {
            discard = { type: 'p', n: 5, red: true };
          }
        } else if (discard.type === 's' && discard.n === 5) {
          if (h0NonRedS > 0) {
            discard = { type: 's', n: 5, red: false };
          } else {
            discard = { type: 's', n: 5, red: true };
          }
        }

        candidates.push({
          index: candidates.length,
          discard,
          counts: candCounts,
          shanten: candShanten
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

    // 差の上限の基準 s_ref: 計算対象の候補の13枚の向聴の最大値 (確定 Q18。全候補共通の1つの値)
    const sRefCommon = Math.max(...candidates.map(c => c.shanten));

    // 探索のグループ: 共通 s_ref は1グループ。対案S(測定用の内部フラグ)は候補自身の向聴ごと
    const searchGroups = new Map<number, CandidateInfo[]>();
    for (const c of candidates) {
      const key = req.__experimentalPerCandidateRef ? c.shanten : sRefCommon;
      const list = searchGroups.get(key);
      if (list) list.push(c);
      else searchGroups.set(key, [c]);
    }

    const tileLimits = sanma_tile_limits();
    const nukiMode = rule.north === 'nukidora';

    const redBase = redBaselineOf(input.hand, visibleWithoutUradora, u0, rule);

    // 聴牌形の評価キャッシュは手牌キーで探索間に共有する
    const evalCache = new Map<string, EvaluatedWin[]>();
    const stride = 3 + remainingDraws * 3;
    const statsByCandIdx = new Array<CandidateStat>(candidates.length);
    const meta: EngineComputeMeta = {
      stateCount: 0,
      tempaiCount: 0,
      searchCount: 0,
      solveCount: 0,
      denseCells: 0,
      searches: []
    };

    for (const [sRef, group] of searchGroups) {
      const handsFlat = new Uint8Array(group.length * 34);
      for (let gi = 0; gi < group.length; gi++) {
        const c = group[gi];
        if (c) handsFlat.set(c.counts, gi * 34);
      }
      const searchRes = search(
        h0Bytes,
        handsFlat,
        meldsM,
        u0,
        tileLimits,
        nukiMode,
        remainingDraws,
        options.tegawari,
        options.backtrack,
        options.diffSlack,
        sRef
      );

      try {
        meta.searchCount++;
        meta.stateCount += searchRes.state_count;
        meta.tempaiCount += searchRes.tempai_count;
        meta.denseCells += searchRes.state_count * Math.max(1, remainingDraws);
        meta.searches.push({
          stateCount: searchRes.state_count,
          tempaiCount: searchRes.tempai_count,
          sRef
        });

        const tempaiHandsFlat = searchRes.tempai_hands();
        const waitCounts = searchRes.tempai_wait_counts();
        const waitTiles = searchRes.tempai_wait_tiles();
        const eMax = searchRes.max_extra_nuki;

        const evalCtx: ValuesContext = {
          table,
          rule,
          melds: input.melds,
          dora: input.dora,
          nuki0: input.nuki,
          u0,
          h0Counts,
          includeRinshan: nukiMode && eMax > 0
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
        const solvedFlat = solve(searchRes, values);
        meta.solveCount++;

        for (let gi = 0; gi < group.length; gi++) {
          const cand = group[gi] as CandidateInfo;
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
          statsByCandIdx[cand.index] = {
            discard: cand.discard,
            shanten: cand.shanten,
            tenpai: solvedFlat[base] ?? 0,
            win: solvedFlat[base + 1] ?? 0,
            ev: solvedFlat[base + 2] ?? 0,
            perTurn
          };
        }
      } finally {
        searchRes.free();
      }
    }
    onMeta?.(meta);

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
  } catch (err) {
    return {
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err)
    };
  }
}
