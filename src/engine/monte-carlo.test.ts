import {
  calc_shanten_sanma,
  policy_discard,
  sanma_tile_limits,
  search,
  solve
} from 'engine';
import { describe, expect, it } from 'vitest';
import { BENCH_HANDS, parseTiles } from '../../bench/engine/hands';
import { instantiateMeld } from '../core/input';
import { RULE_PRESETS } from '../core/rule-preset';
import { redCountOf } from '../core/rule';
import type { Table } from '../core/table';
import {
  type Tile,
  type TileCountsIndex,
  isSanmaIndex,
  tilesToCounts
} from '../core/tile';
import { countBy } from '../core/util';
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

describe.skipIf(!process.env.ENGINE_MC)(
  'F31-A5c: モンテカルロ統計的突き合わせ (n=200,000, T=18)',
  () => {
    const table: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };
    const rule = RULE_PRESETS[0]?.rule;
    if (!rule) throw new Error('RULE_PRESETS[0] not found');
    const T = DEFAULT_REMAINING_DRAWS;

    const runMcForConfig = (opts: EngineOptions, seedBase: number) => {
      for (let hi = 0; hi < TARGET_HAND_IDS.length; hi++) {
        const id = TARGET_HAND_IDS[hi];
        if (!id) throw new Error(`missing target hand index ${hi}`);
        const spec = BENCH_HANDS.find(h => h.id === id);
        if (!spec) throw new Error(`missing bench hand ${id}`);
        const hand = parseTiles(spec.handStr);
        const dora = spec.doraStr.flatMap(d => parseTiles(d));
        const input = { hand, melds: spec.melds, dora, nuki: spec.nuki };
        const meldsM = 4 - input.melds.length;

        const h0 = tilesToCounts(hand);
        const h0Bytes = Uint8Array.from(h0);
        const s0 = calc_shanten_sanma(h0Bytes, meldsM);
        const meldTiles = input.melds.flatMap(m =>
          instantiateMeld(m, rule.red)
        );
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
        const sr = search(
          h0Bytes,
          h0Bytes,
          meldsM,
          u0,
          sanma_tile_limits(),
          nukiMode,
          T,
          opts.tegawari,
          opts.backtrack,
          opts.diffSlack,
          s0
        );

        try {
          const tempaiHandsFlat = sr.tempai_hands();
          const waitCounts = sr.tempai_wait_counts();
          const waitTiles = sr.tempai_wait_tiles();
          const eMax = sr.max_extra_nuki;
          const eCount = eMax + 1;

          const countRed = (ts: readonly Tile[], suit: 'p' | 's') =>
            countBy([...ts], t => t.type === suit && t.n === 5 && t.red);

          const values = buildValuesTable(
            tempaiHandsFlat,
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
              h0Counts: h0
            },
            {
              k0: { p: h0[13] ?? 0, s: h0[22] ?? 0 },
              a0: { p: countRed(hand, 'p'), s: countRed(hand, 's') },
              availableTotal: { p: u0[13] ?? 0, s: u0[22] ?? 0 },
              availableRed: {
                p: Math.max(
                  0,
                  redCountOf(rule.red, 'p') - countRed(visible, 'p')
                ),
                s: Math.max(
                  0,
                  redCountOf(rule.red, 's') - countRed(visible, 's')
                )
              }
            }
          );

          const solved = solve(sr, values);
          const dpTenpai = solved[0] ?? 0;
          const dpWin = solved[1] ?? 0;
          const dpEv = solved[2] ?? 0;

          // 聴牌形の待ち・V 引き当てマップを構築
          const tempaiMap = new Map<string, Map<number, number>>();
          let wCursor = 0;
          for (let ti = 0; ti < waitCounts.length; ti++) {
            const sub = tempaiHandsFlat.subarray(ti * 34, (ti + 1) * 34);
            const key = sub.join(',');
            const wMap = new Map<number, number>();
            const wc = waitCounts[ti] ?? 0;
            for (let wi = 0; wi < wc; wi++) {
              const wpIdx = wCursor + wi;
              const wt = waitTiles[wpIdx];
              if (wt === undefined)
                throw new Error(`missing waitTile ${wpIdx}`);
              wMap.set(wt, wpIdx);
            }
            wCursor += wc;
            tempaiMap.set(key, wMap);
          }

          const rand = createRng(seedBase + hi * 1009);
          let mcTenpaiCount = 0;
          let mcWinCount = 0;
          let mcEvSum = 0;
          let mcEvSqSum = 0;

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

          for (let trial = 0; trial < N_TRIALS; trial++) {
            curH.set(h0);
            let e = 0;
            let reachedTenpai = false;
            let won = false;
            let winVal = 0;
            let waitMap = tempaiMap.get(curH.join(','));
            if (waitMap) reachedTenpai = true;

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
                  break; // ツモ切りで次の巡へ
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
                  if (waitMap) reachedTenpai = true;
                }
                break;
              }
              if (won) break;
            }

            if (reachedTenpai) mcTenpaiCount++;
            if (won) {
              mcWinCount++;
              mcEvSum += winVal;
              mcEvSqSum += winVal * winVal;
            }
          }

          const mcTenpai = mcTenpaiCount / N_TRIALS;
          const mcWin = mcWinCount / N_TRIALS;
          const mcEv = mcEvSum / N_TRIALS;
          const evVar = Math.max(0, mcEvSqSum / N_TRIALS - mcEv * mcEv);
          const evSe = Math.sqrt(evVar / N_TRIALS);

          const tpSe = Math.sqrt((dpTenpai * (1 - dpTenpai)) / N_TRIALS);
          const winSe = Math.sqrt((dpWin * (1 - dpWin)) / N_TRIALS);

          expect(Math.abs(mcTenpai - dpTenpai)).toBeLessThanOrEqual(
            Math.max(4 * tpSe, 1e-6)
          );
          expect(Math.abs(mcWin - dpWin)).toBeLessThanOrEqual(
            Math.max(4 * winSe, 1e-6)
          );
          expect(Math.abs(mcEv - dpEv)).toBeLessThanOrEqual(
            Math.max(4 * evSe, 1e-6)
          );
        } finally {
          sr.free();
        }
      }
    };

    it('F31-A5c: 構成A (T=18, n=200,000, 6手) で DP とモンテカルロが 4σ 以内で一致する', () => {
      runMcForConfig(
        { tegawari: false, backtrack: false, diffSlack: 0 },
        20261121
      );
    }, 180_000);

    // 設計書 §6 に基づき、T=18 における B′・B′+戻し(K=2) は状態爆発により実行不可能なため停止
    it.skip('F31-A5c: 構成B′・B′+戻し(K=2) (T=18, n=200,000) — §3.6維持無制限の状態爆発により停止(要仕様改訂)', () => {});
  }
);
