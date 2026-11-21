import {
  calc_shanten_sanma,
  policy_discard,
  sanma_tile_limits,
  search,
  solve
} from 'engine';
import { describe, expect, it } from 'vitest';
import {
  BENCH_HANDS,
  BENCH_HANDS_14,
  type BenchHandSpec,
  parseTiles
} from '../../bench/engine/hands';
import { instantiateMeld } from '../core/input';
import { RULE_PRESETS } from '../core/rule-preset';
import type { Rule } from '../core/rule';
import type { Table } from '../core/table';
import {
  type Tile,
  type TileCountsIndex,
  isSanmaIndex,
  tilesToCounts
} from '../core/tile';
import { redBaselineOf } from './compute';
import { buildValuesTable } from './evaluate';
import { DEFAULT_REMAINING_DRAWS, type EngineOptions } from './types';

const NORTH_INDEX = 30;
const NORTH_TILE: Tile = { type: 'z', n: 4 };
const N_TRIALS = 200_000;

const createRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const TARGET_HAND_IDS = [
  'S1-01',
  'S1-02',
  'S2-01',
  'S2-02',
  'S3-01',
  'S3-02'
] as const;

const table: Table = { round: 'east', seat: 'south', continue: 0, deposit: 0 };
const rule: Rule = (() => {
  const r = RULE_PRESETS[0]?.rule;
  if (!r) throw new Error('RULE_PRESETS[0] not found');
  return r;
})();
const T18 = DEFAULT_REMAINING_DRAWS;

interface Solved {
  discard: string | null;
  shanten: number;
  tenpai: number;
  win: number;
  ev: number;
  start: Uint8Array;
  group: Group;
}
interface Group {
  sr: ReturnType<typeof search>;
  values: Float64Array;
  waitCounts: Uint32Array;
  tempaiMap: Map<string, Map<number, number>>;
  eMax: number;
  free: () => void;
}
interface Setup {
  h0: number[];
  u0: Uint8Array;
  nukiMode: boolean;
  T: number;
  solved: Solved[];
  searches: { stateCount: number; sRef: number }[];
  free: () => void;
}

/**
 * computeEngine と同じ手順(候補の列挙・s_ref・探索・V 表・solve)を、探索の生ハンドルを残して行う。
 * diffSlack は検証をかけずに search へ渡す(制限なしモデル=99 の比較用)。
 */
const setup = (
  spec: BenchHandSpec,
  opts: EngineOptions,
  T: number,
  perCandidateRef = false
): Setup => {
  const hand = parseTiles(spec.handStr);
  const dora = spec.doraStr.flatMap(d => parseTiles(d));
  const input = { hand, melds: spec.melds, dora, nuki: spec.nuki };
  const meldsM = 4 - input.melds.length;
  const handLen = meldsM * 3 + 1;
  const h0 = tilesToCounts(hand);
  const h0Bytes = Uint8Array.from(h0);
  const meldTiles = input.melds.flatMap(m => instantiateMeld(m, rule.red));
  const visible = [
    ...hand,
    ...meldTiles,
    ...dora,
    ...Array<Tile>(input.nuki).fill(NORTH_TILE)
  ];
  const visCounts = tilesToCounts(visible);
  const u0 = new Uint8Array(34);
  for (let i = 0; i < 34; i++) {
    if (isSanmaIndex(i as TileCountsIndex)) {
      u0[i] = Math.max(0, 4 - (visCounts[i] ?? 0));
    }
  }
  const nukiMode = rule.north === 'nukidora';
  const redBase = redBaselineOf(hand, visible, u0, rule);

  const cands: {
    counts: number[];
    discard: string | null;
    shanten: number;
  }[] = [];
  if (hand.length === handLen) {
    cands.push({
      counts: [...h0],
      discard: null,
      shanten: calc_shanten_sanma(h0Bytes, meldsM)
    });
  } else {
    for (let i = 0; i < 34; i++) {
      if ((h0[i] ?? 0) === 0) continue;
      const c: number[] = [...h0];
      c[i] = (c[i] ?? 0) - 1;
      const sh = calc_shanten_sanma(Uint8Array.from(c), meldsM);
      if (sh > 3) continue;
      cands.push({ counts: c, discard: String(i), shanten: sh });
    }
  }
  const sRefCommon = Math.max(...cands.map(c => c.shanten));
  const byRef = new Map<number, typeof cands>();
  for (const c of cands) {
    const key = perCandidateRef ? c.shanten : sRefCommon;
    byRef.set(key, [...(byRef.get(key) ?? []), c]);
  }

  const evalCache = new Map<string, never>() as never;
  const solved: Solved[] = [];
  const searches: Setup['searches'] = [];
  const frees: (() => void)[] = [];
  const stride = 3 + T * 3;
  for (const [sRef, group] of byRef) {
    const flat = new Uint8Array(group.length * 34);
    group.forEach((c, i) => {
      flat.set(c.counts, i * 34);
    });
    const slack =
      opts.oneShantenSlack && sRef === 1
        ? Math.max(opts.diffSlack, 1)
        : opts.diffSlack;
    const sr = search(
      h0Bytes,
      flat,
      meldsM,
      u0,
      sanma_tile_limits(),
      nukiMode,
      T,
      opts.tegawari,
      opts.backtrack,
      slack,
      sRef
    );
    searches.push({ stateCount: sr.state_count, sRef });
    const tempaiHands = sr.tempai_hands();
    const waitCounts = sr.tempai_wait_counts();
    const waitTiles = sr.tempai_wait_tiles();
    const eMax = sr.max_extra_nuki;
    const values = buildValuesTable(
      tempaiHands,
      waitCounts,
      waitTiles,
      eMax,
      {
        table,
        rule,
        melds: input.melds,
        dora,
        nuki0: input.nuki,
        includeRinshan: nukiMode && eMax > 0,
        u0,
        h0Counts: h0 as never
      },
      redBase,
      evalCache
    );
    const out = solve(sr, values);
    const tempaiMap = new Map<string, Map<number, number>>();
    let wCursor = 0;
    for (let ti = 0; ti < waitCounts.length; ti++) {
      const key = tempaiHands.subarray(ti * 34, (ti + 1) * 34).join(',');
      const wMap = new Map<number, number>();
      for (let wi = 0; wi < (waitCounts[ti] ?? 0); wi++) {
        wMap.set(waitTiles[wCursor + wi] ?? 0, wCursor + wi);
      }
      wCursor += waitCounts[ti] ?? 0;
      tempaiMap.set(key, wMap);
    }
    const g: Group = {
      sr,
      values,
      waitCounts,
      tempaiMap,
      eMax,
      free: () => sr.free()
    };
    frees.push(g.free);
    group.forEach((c, i) => {
      solved.push({
        discard: c.discard,
        shanten: c.shanten,
        tenpai: out[i * stride] ?? 0,
        win: out[i * stride + 1] ?? 0,
        ev: out[i * stride + 2] ?? 0,
        start: Uint8Array.from(c.counts),
        group: g
      });
    });
  }
  solved.sort((a, b) => b.ev - a.ev);
  return {
    h0,
    u0,
    nukiMode,
    T,
    solved,
    searches,
    free: () => {
      for (const f of frees) f();
    }
  };
};

/** DP と同じモデル(§3.2・policy_discard の方針)を n 回模擬する */
const simulate = (su: Setup, cand: Solved, seed: number, n: number) => {
  const { h0, u0, nukiMode, T } = su;
  const { sr, values, tempaiMap, eMax } = cand.group;
  const eCount = eMax + 1;
  const rand = createRng(seed);
  let tp = 0;
  let wn = 0;
  let evSum = 0;
  let evSq = 0;
  const curH = new Uint8Array(34);
  const remC = new Uint8Array(34);
  const drawOne = (e: number): number => {
    let total = 0;
    for (let k = 0; k < 34; k++) {
      if (!isSanmaIndex(k as TileCountsIndex)) continue;
      const inc = Math.max(0, (curH[k] ?? 0) - (h0[k] ?? 0));
      let c = Math.max(0, (u0[k] ?? 0) - inc);
      if (nukiMode && k === NORTH_INDEX) c = Math.max(0, c - e);
      remC[k] = c;
      total += c;
    }
    if (total === 0) return -1;
    let r = Math.floor(rand() * total);
    for (let k = 0; k < 34; k++) {
      const c = remC[k] ?? 0;
      if (r < c) return k;
      r -= c;
    }
    return -1;
  };
  for (let trial = 0; trial < n; trial++) {
    curH.set(cand.start);
    let e = 0;
    let reached = false;
    let won = false;
    let winVal = 0;
    let waitMap = tempaiMap.get(curH.join(','));
    if (waitMap) reached = true;
    for (let t = T; t >= 1; t--) {
      let rinshan = 0;
      while (true) {
        const k = drawOne(e);
        if (k < 0) break;
        if (waitMap) {
          const wpIdx = waitMap.get(k);
          if (wpIdx !== undefined) {
            const v = values[(wpIdx * eCount + e) * 2 + rinshan] ?? 0;
            if (v > 0) {
              won = true;
              winVal = v;
              break;
            }
          }
          // 確定 Q19 案(ii): 役があって北で和了できるときだけ和了し、それ以外は北を抜く
          if (nukiMode && k === NORTH_INDEX && e < eMax) {
            e++;
            rinshan = 1;
            continue;
          }
          break;
        }
        if (nukiMode && k === NORTH_INDEX && e < eMax) {
          e++;
          continue;
        }
        const d = policy_discard(sr, curH, t, e, k);
        if (d >= 0) {
          curH[k] = (curH[k] ?? 0) + 1;
          curH[d] = (curH[d] ?? 0) - 1;
          waitMap = tempaiMap.get(curH.join(','));
          if (waitMap) reached = true;
        }
        break;
      }
      if (won) break;
    }
    if (reached) tp++;
    if (won) {
      wn++;
      evSum += winVal;
      evSq += winVal * winVal;
    }
  }
  const mcEv = evSum / n;
  return {
    tenpai: tp / n,
    win: wn / n,
    ev: mcEv,
    evSe: Math.sqrt(Math.max(0, evSq / n - mcEv * mcEv) / n)
  };
};

const expectMatch = (
  label: string,
  dp: { tenpai: number; win: number; ev: number },
  mc: ReturnType<typeof simulate>,
  n: number
) => {
  const tpSe = Math.sqrt((dp.tenpai * (1 - dp.tenpai)) / n);
  const winSe = Math.sqrt((dp.win * (1 - dp.win)) / n);
  const zs = [
    Math.abs(mc.tenpai - dp.tenpai) / Math.max(tpSe, 1e-9),
    Math.abs(mc.win - dp.win) / Math.max(winSe, 1e-9),
    Math.abs(mc.ev - dp.ev) / Math.max(mc.evSe, 1e-9)
  ];
  console.log(
    `MC ${label}: DP(tp=${dp.tenpai.toFixed(4)} win=${dp.win.toFixed(4)} ev=${dp.ev.toFixed(1)}) MC(tp=${mc.tenpai.toFixed(4)} win=${mc.win.toFixed(4)} ev=${mc.ev.toFixed(1)}) z=${zs.map(z => z.toFixed(2)).join('/')}`
  );
  expect(Math.abs(mc.tenpai - dp.tenpai)).toBeLessThanOrEqual(
    Math.max(4 * tpSe, 1e-6)
  );
  expect(Math.abs(mc.win - dp.win)).toBeLessThanOrEqual(
    Math.max(4 * winSe, 1e-6)
  );
  expect(Math.abs(mc.ev - dp.ev)).toBeLessThanOrEqual(
    Math.max(4 * mc.evSe, 1e-6)
  );
};

const spec13 = (id: string): BenchHandSpec => {
  const s = BENCH_HANDS.find(h => h.id === id);
  if (!s) throw new Error(`missing bench hand ${id}`);
  return s;
};
const spec14 = (id: string): BenchHandSpec => {
  const s = BENCH_HANDS_14.find(h => h.id === id);
  if (!s) throw new Error(`missing bench hand ${id}`);
  return s;
};
const mkO = (
  tegawari: boolean,
  backtrack: boolean,
  diffSlack: number,
  oneShantenSlack = false
): EngineOptions => ({ tegawari, backtrack, diffSlack, oneShantenSlack });

describe.skipIf(!process.env.ENGINE_MC)(
  'F31-A5c: モンテカルロ統計的突き合わせ (n=200,000, T=18)',
  () => {
    it('F31-A5c: 構成A・B′(M=0)・B′+戻し(M=0)で DP とモンテカルロが 4σ 以内で一致し、ev が A ≤ B′ ≤ B′+戻し', () => {
      const cfgs: [string, EngineOptions, number][] = [
        ['A', mkO(false, false, 0), 20261121],
        ['B′(M=0)', mkO(true, false, 0), 20261122],
        ['B′+戻し(M=0)', mkO(true, true, 0), 20261123]
      ];
      for (let hi = 0; hi < TARGET_HAND_IDS.length; hi++) {
        const id = TARGET_HAND_IDS[hi] as string;
        const evs: number[] = [];
        for (const [name, opts, seed] of cfgs) {
          const su = setup(spec13(id), opts, T18);
          try {
            const c = su.solved[0] as Solved;
            evs.push(c.ev);
            expectMatch(
              `${id} ${name}`,
              c,
              simulate(su, c, seed + hi * 1009, N_TRIALS),
              N_TRIALS
            );
          } finally {
            su.free();
          }
        }
        expect(evs[1] as number).toBeGreaterThanOrEqual(
          (evs[0] as number) - 1e-9
        );
        expect(evs[2] as number).toBeGreaterThanOrEqual(
          (evs[1] as number) - 1e-9
        );
      }
    }, 1_800_000);

    it('F31-A5c: oneShantenSlack=true(1向聴の手は実効 M=1。S1 の2手)で DP と MC が一致し、2向聴以上では無影響', () => {
      for (const [hi, id] of ['S1-01', 'S1-02'].entries()) {
        const su = setup(spec13(id), mkO(true, true, 0, true), T18);
        const base = setup(spec13(id), mkO(true, true, 1), T18);
        try {
          const c = su.solved[0] as Solved;
          expect(c.ev).toBeCloseTo((base.solved[0] as Solved).ev, 9);
          expectMatch(
            `${id} oneShantenSlack=true`,
            c,
            simulate(su, c, 20261201 + hi, N_TRIALS),
            N_TRIALS
          );
        } finally {
          su.free();
          base.free();
        }
      }
      for (const id of ['S2-01', 'S3-01']) {
        const a = setup(spec13(id), mkO(true, true, 0, true), T18);
        const b = setup(spec13(id), mkO(true, true, 0), T18);
        try {
          expect((a.solved[0] as Solved).ev).toBeCloseTo(
            (b.solved[0] as Solved).ev,
            9
          );
        } finally {
          a.free();
          b.free();
        }
      }
    }, 1_800_000);

    it('F31-A5c(Q18): 14枚入力で 共通 s_ref・対案S それぞれ DP と MC が一致する(各手の DP 上位2候補)', () => {
      for (const [hi, id] of ['C-02', 'C-04', 'C-05', 'C-08'].entries()) {
        for (const per of [false, true]) {
          const su = setup(spec14(id), mkO(true, true, 0), T18, per);
          try {
            console.log(
              `Q18 ${id} ${per ? '対案S' : '共通'}: 探索表=${su.searches.length} 状態=${su.searches.map(x => x.stateCount).join('+')} 推奨=${su.solved[0]?.discard}`
            );
            for (const [ci, c] of su.solved.slice(0, 2).entries()) {
              expectMatch(
                `${id} ${per ? 'S' : '共通'} cand${ci}(${c.discard},s=${c.shanten})`,
                c,
                simulate(su, c, 20261300 + hi * 17 + ci, N_TRIALS),
                N_TRIALS
              );
            }
          } finally {
            su.free();
          }
        }
      }
    }, 3_000_000);

    it('F31-A5c(Q18): T=3 で 制限なしモデル(diffSlack=99)との乖離を 共通 s_ref・対案S で比べる(14枚入力 C-01〜09、報告用)', () => {
      const T = 3;
      const rows: string[] = [];
      let changedShared = 0;
      let changedS = 0;
      let nGap = 0;
      // 制限なしモデルは状態数が大きいので、s0 ごとの代表 4 手(C-02・C-04・C-06・C-08)に限る
      for (const h of BENCH_HANDS_14.filter(x =>
        ['C-02', 'C-04', 'C-06', 'C-08'].includes(x.id)
      )) {
        const t0 = Date.now();
        const un = setup(h, mkO(true, true, 99), T, false);
        console.log(
          `Q18 unrestricted ${h.id}: 状態=${un.searches.map(x => x.stateCount)} ${Date.now() - t0}ms`
        );
        const sh = setup(h, mkO(true, true, 0), T, false);
        const pc = setup(h, mkO(true, true, 0), T, true);
        try {
          const evOf = (su: Setup) =>
            new Map(su.solved.map(c => [c.discard, c]));
          const mu = evOf(un);
          const gap = (su: Setup) => {
            const m = evOf(su);
            let sum = 0;
            let n = 0;
            let rel = 0;
            for (const [d, c] of mu) {
              const x = m.get(d);
              if (!x || c.ev <= 0) continue;
              sum += c.ev - x.ev;
              rel += (c.ev - x.ev) / c.ev;
              n++;
            }
            return { mean: sum / n, rel: (rel / n) * 100 };
          };
          const gs = gap(sh);
          const gp = gap(pc);
          const topU = un.solved[0]?.discard;
          const topS = sh.solved[0]?.discard;
          const topP = pc.solved[0]?.discard;
          if (topS !== topU) changedShared++;
          if (topP !== topU) changedS++;
          nGap++;
          // s0 の候補(向聴が最小)と s0+1 の候補で、候補別の乖離を分ける
          const minS = Math.min(...un.solved.map(c => c.shanten));
          const byGrp = (su: Setup, sel: (s: number) => boolean) => {
            const m = evOf(su);
            let sum = 0;
            let n = 0;
            for (const [d, c] of mu) {
              const x = m.get(d);
              if (!x || !sel(c.shanten)) continue;
              sum += c.ev - x.ev;
              n++;
            }
            return n === 0 ? NaN : sum / n;
          };
          rows.push(
            `| ${h.id} | ${minS} | 状態 無制限=${un.searches.map(x => x.stateCount).join('+')} 共通=${sh.searches.map(x => x.stateCount).join('+')} S=${pc.searches.map(x => x.stateCount).join('+')} | 平均乖離 共通=${gs.mean.toFixed(1)}(${gs.rel.toFixed(1)}%) S=${gp.mean.toFixed(1)}(${gp.rel.toFixed(1)}%) | s0候補の乖離 共通=${byGrp(sh, s => s === minS).toFixed(1)} S=${byGrp(pc, s => s === minS).toFixed(1)} / s0+1候補 共通=${byGrp(sh, s => s > minS).toFixed(1)} S=${byGrp(pc, s => s > minS).toFixed(1)} | 推奨 無制限=${topU} 共通=${topS} S=${topP} |`
          );
        } finally {
          un.free();
          sh.free();
          pc.free();
        }
      }
      console.log(`Q18 T=3 制限なし比較\n${rows.join('\n')}`);
      console.log(
        `Q18 T=3 推奨初打が制限なしと異なる手: 共通=${changedShared}/${nGap} 対案S=${changedS}/${nGap}`
      );
    }, 3_000_000);
  }
);
