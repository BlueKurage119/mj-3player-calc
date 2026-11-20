import { calc_shanten_sanma } from 'engine';
import { calculateHoraScore } from '../core/hora-score';
import { type Input, instantiateMeld } from '../core/input';
import { isNoYaku } from '../core/no-yaku';
import { type Rule, redCountOf } from '../core/rule';
import type { Table } from '../core/table';
import {
  type Tile,
  type TileCounts,
  type TileCountsIndex,
  isSanmaIndex,
  tileToCountsIndex,
  tilesToCounts
} from '../core/tile';
import { countBy } from '../core/util';
import type { Yaku } from '../core/yaku';
import { evaluateTempaiForm, isMenzen } from './evaluate';
import { redJointDistribution } from './red';
import type { EngineOptions } from './types';
import { uradoraDistribution } from './ura';

const NORTH_INDEX = 30;
const NORTH_TILE: Tile = { type: 'z', n: 4 };

interface RecVal {
  tenpai: number;
  win: number;
  ev: number;
}

const isBetter = (a: RecVal, b: RecVal): boolean => {
  if (a.ev !== b.ev) return a.ev > b.ev;
  if (a.win !== b.win) return a.win > b.win;
  return a.tenpai > b.tenpai;
};

/**
 * §3.2〜3.6 を素直なメモ化再帰で実装した独立参照実装 (A-5 検証用)。
 * 製品コードから import しない。
 */
export function computeReference(
  table: Table,
  input: Input,
  rule: Rule,
  remainingDraws: number,
  options: EngineOptions
): RecVal {
  const meldsM = 4 - input.melds.length;
  const handLen = meldsM * 3 + 1;
  const h0 = tilesToCounts(input.hand);
  const s0 = calc_shanten_sanma(Uint8Array.from(h0), meldsM);
  const nukiMode = rule.north === 'nukidora';
  const menzen = isMenzen(input.melds);

  const meldTiles = input.melds.flatMap(m => instantiateMeld(m, rule.red));
  const meldsCounts = tilesToCounts(meldTiles);
  const doraCounts = tilesToCounts(input.dora);
  const visible: Tile[] = [
    ...input.hand,
    ...meldTiles,
    ...input.dora,
    ...Array<Tile>(input.nuki).fill(NORTH_TILE)
  ];
  const visibleCounts = tilesToCounts(visible);
  const u0 = new Array<number>(34).fill(0);
  for (let i = 0; i < 34; i++) {
    if (isSanmaIndex(i as TileCountsIndex)) {
      u0[i] = Math.max(0, 4 - (visibleCounts[i] ?? 0));
    }
  }

  const countRed = (tiles: readonly Tile[], suit: 'p' | 's') =>
    countBy([...tiles], t => t.type === suit && t.n === 5 && t.red);

  const k0P = h0[13] ?? 0;
  const k0S = h0[22] ?? 0;
  const a0P = countRed(input.hand, 'p');
  const a0S = countRed(input.hand, 's');
  const availTotalP = u0[13] ?? 0;
  const availTotalS = u0[22] ?? 0;
  const availRedP = Math.max(
    0,
    redCountOf(rule.red, 'p') - countRed(visible, 'p')
  );
  const availRedS = Math.max(
    0,
    redCountOf(rule.red, 's') - countRed(visible, 's')
  );

  const tableZero: Table = { ...table, continue: 0, deposit: 0 };
  const westDoraCount = countBy(input.dora, t => t.type === 'z' && t.n === 3);

  const shantenMemo = new Map<string, number>();
  const getShanten = (h: number[]): number => {
    const k = h.join(',');
    const cached = shantenMemo.get(k);
    if (cached !== undefined) return cached;
    const s = calc_shanten_sanma(Uint8Array.from(h), meldsM);
    shantenMemo.set(k, s);
    return s;
  };

  // 聴牌形の V 表を遅延計算してキャッシュ
  const vMemo = new Map<string, number>();
  const waitSetMemo = new Map<string, Set<number>>();

  const ensureTempaiEvaluated = (h: number[]): Set<number> => {
    const hKey = h.join(',');
    const existing = waitSetMemo.get(hKey);
    if (existing) return existing;

    const evaluated = evaluateTempaiForm(h as TileCounts, {
      table,
      rule,
      melds: input.melds,
      dora: input.dora,
      nuki0: input.nuki,
      includeRinshan: nukiMode && (u0[NORTH_INDEX] ?? 0) > 0
    });

    const waits = new Set<number>();
    const byKey = new Map<string, (typeof evaluated)[number]>();
    for (const ew of evaluated) {
      const wIdx = tileToCountsIndex(ew.winTile);
      waits.add(wIdx);
      byKey.set(`${wIdx}:${ew.red.p}:${ew.red.s}:${ew.rinshan ? 1 : 0}`, ew);
    }

    const eMax = nukiMode ? Math.min(4, u0[NORTH_INDEX] ?? 0) : 0;
    for (const w of waits) {
      const finalCounts = [...h] as TileCounts;
      finalCounts[w] = ((finalCounts[w] ?? 0) + 1) as TileCounts[number];

      const redDist = redJointDistribution(
        {
          kFinal: finalCounts[13] ?? 0,
          k0: k0P,
          a0: a0P,
          N: availTotalP,
          R: availRedP
        },
        {
          kFinal: finalCounts[22] ?? 0,
          k0: k0S,
          a0: a0S,
          N: availTotalS,
          R: availRedS
        }
      );

      for (let e = 0; e <= eMax; e++) {
        const uraDist = uradoraDistribution(
          menzen,
          input.dora.length,
          finalCounts,
          meldsCounts,
          doraCounts,
          nukiMode ? input.nuki + e : 0
        );
        const rMax = nukiMode && e > 0 ? 1 : 0;
        for (let r = 0; r <= rMax; r++) {
          const extraHand = r === 1 ? e - 1 : e;
          let val = 0;
          for (const rho of redDist) {
            if (rho.prob <= 0) continue;
            const ew = byKey.get(`${w}:${rho.p}:${rho.s}:${r}`);
            if (!ew || !ew.best) continue;
            const valid = ew.candidates.filter(c => !isNoYaku(c));
            for (const { han: uHan, prob: uProb } of uraDist) {
              if (uProb <= 0) continue;
              const extraYaku: Yaku[] = [];
              if (extraHand > 0) {
                extraYaku.push({
                  type: 'yaku',
                  name: 'nuki-dora',
                  han: extraHand
                });
                if (westDoraCount > 0) {
                  extraYaku.push({
                    type: 'yaku',
                    name: 'dora',
                    han: extraHand * westDoraCount
                  });
                }
              }
              if (uHan > 0) {
                extraYaku.push({ type: 'yaku', name: 'ura-dora', han: uHan });
              }
              let bestTotal = 0;
              for (const c of valid) {
                if (c.score.yakumanPoint > 0 || extraYaku.length === 0) {
                  bestTotal = Math.max(bestTotal, c.score.payment.total);
                } else {
                  const sc = calculateHoraScore(
                    { ...c, yaku: [...c.yaku, ...extraYaku] },
                    tableZero,
                    rule
                  );
                  bestTotal = Math.max(bestTotal, sc.payment.total);
                }
              }
              val += rho.prob * uProb * bestTotal;
            }
          }
          vMemo.set(`${hKey}|${w}|${e}|${r}`, val);
        }
      }
    }

    waitSetMemo.set(hKey, waits);
    return waits;
  };

  const dpMemo = new Map<string, RecVal>();

  const solveRec = (h: number[], t: number, e: number, r: number): RecVal => {
    const s = getShanten(h);
    if (t === 0) {
      return s === 0
        ? { tenpai: 1, win: 0, ev: 0 }
        : { tenpai: 0, win: 0, ev: 0 };
    }
    const hKey = h.join(',');
    const memoKey = `${hKey}|${t}|${e}|${r}`;
    const cached = dpMemo.get(memoKey);
    if (cached) return cached;

    const counts = new Array<number>(34).fill(0);
    let totalC = 0;
    for (let k = 0; k < 34; k++) {
      if (!isSanmaIndex(k as TileCountsIndex)) continue;
      let c = Math.max(
        0,
        (u0[k] ?? 0) - Math.max(0, (h[k] ?? 0) - (h0[k] ?? 0))
      );
      if (nukiMode && k === NORTH_INDEX) c = Math.max(0, c - e);
      counts[k] = c;
      totalC += c;
    }

    if (totalC === 0) {
      const z =
        s === 0 ? { tenpai: 1, win: 0, ev: 0 } : { tenpai: 0, win: 0, ev: 0 };
      dpMemo.set(memoKey, z);
      return z;
    }

    let res: RecVal;
    if (s === 0) {
      const waits = ensureTempaiEvaluated(h);
      let sumWin = 0;
      let sumEv = 0;
      for (let k = 0; k < 34; k++) {
        const ck = counts[k] ?? 0;
        if (ck === 0) continue;
        const pk = ck / totalC;
        if (waits.has(k)) {
          const v = vMemo.get(`${hKey}|${k}|${e}|${r}`) ?? 0;
          if (v > 0) {
            sumWin += pk;
            sumEv += pk * v;
            continue;
          }
        }
        if (nukiMode && k === NORTH_INDEX && !waits.has(NORTH_INDEX)) {
          const nxt = solveRec(h, t, e + 1, 1);
          sumWin += pk * nxt.win;
          sumEv += pk * nxt.ev;
          continue;
        }
        const nxt = solveRec(h, t - 1, e, 0);
        sumWin += pk * nxt.win;
        sumEv += pk * nxt.ev;
      }
      res = { tenpai: 1, win: sumWin, ev: sumEv };
    } else {
      let sumTp = 0;
      let sumWin = 0;
      let sumEv = 0;
      for (let k = 0; k < 34; k++) {
        const ck = counts[k] ?? 0;
        if (ck === 0) continue;
        const pk = ck / totalC;
        if (nukiMode && k === NORTH_INDEX) {
          const nxt = solveRec(h, t, e + 1, 0);
          sumTp += pk * nxt.tenpai;
          sumWin += pk * nxt.win;
          sumEv += pk * nxt.ev;
          continue;
        }
        const h14 = [...h];
        h14[k] = (h14[k] ?? 0) + 1;

        // 14枚からすべての合法な打牌候補を列挙する
        const cands: number[] = [];
        let hasAdvance = false;
        const nextShantens = new Map<number, number>();
        for (let d = 0; d < 34; d++) {
          if ((h14[d] ?? 0) === 0) continue;
          const hNext = [...h14];
          hNext[d] = (hNext[d] ?? 0) - 1;
          const sNext = getShanten(hNext);
          nextShantens.set(d, sNext);
          if (sNext < s) hasAdvance = true;
        }

        for (let d = 0; d < 34; d++) {
          const sNext = nextShantens.get(d);
          if (sNext === undefined) continue;
          if (!options.tegawari) {
            if (hasAdvance) {
              if (sNext < s) cands.push(d);
            } else {
              if (d === k) cands.push(d);
            }
          } else {
            if (sNext <= s) {
              cands.push(d);
            } else if (options.backtrack && sNext === s + 1 && sNext <= 3) {
              const hNext = [...h14];
              hNext[d] = (hNext[d] ?? 0) - 1;
              let common = 0;
              for (let j = 0; j < 34; j++) {
                common += Math.min(hNext[j] ?? 0, h0[j] ?? 0);
              }
              const diff = handLen - common;
              if (diff <= s0 + options.backtrackDiffMargin) {
                cands.push(d);
              }
            }
          }
        }

        let best: RecVal | null = null;
        for (const d of cands) {
          const hNext = [...h14];
          hNext[d] = (hNext[d] ?? 0) - 1;
          const val = solveRec(hNext, t - 1, e, 0);
          if (best === null || isBetter(val, best)) {
            best = val;
          }
        }
        if (best) {
          sumTp += pk * best.tenpai;
          sumWin += pk * best.win;
          sumEv += pk * best.ev;
        }
      }
      res = { tenpai: sumTp, win: sumWin, ev: sumEv };
    }

    dpMemo.set(memoKey, res);
    return res;
  };

  return solveRec(h0, remainingDraws, 0, 0);
}
