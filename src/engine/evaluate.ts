import { calculateHoraScore } from '../core/hora-score';
import { type HandOptions, type Input, instantiateMeld } from '../core/input';
import { isNoYaku } from '../core/no-yaku';
import { type ScoredHora, generateResult } from '../core/result';
import { type Rule, redCountOf } from '../core/rule';
import type { Table } from '../core/table';
import {
  type Tile,
  type TileCounts,
  type TileCountsIndex,
  countsIndexToTile,
  tileToCountsIndex,
  tilesToCounts
} from '../core/tile';
import { countBy } from '../core/util';
import type { Yaku } from '../core/yaku';
import { redJointDistribution } from './red';
import type { EvaluatedWin } from './types';
import { uradoraDistribution } from './ura';

export interface EvalContext {
  table: Table;
  rule: Rule;
  melds: Input['melds'];
  dora: Tile[];
  nuki0: number;
  /** 抜きドラ設定で山に北が1枚以上残り、rinshan: true の評価も行うか */
  includeRinshan: boolean;
}

/** 門前の定義: 副露なし、または暗槓のみ (hora.ts 206行目と同じ) */
export const isMenzen = (melds: Input['melds']): boolean =>
  melds.every(m => m.type === 'kan' && m.closed);

/** TileCounts から赤指定を反映した Tile[] を組み立てる */
const countsToHandTiles = (
  counts: TileCounts,
  redP: number,
  redS: number
): Tile[] => {
  const tiles: Tile[] = [];
  let remP = redP;
  let remS = redS;
  for (let i = 0; i < 34; i++) {
    const c = counts[i] ?? 0;
    for (let k = 0; k < c; k++) {
      const base = countsIndexToTile(i as TileCountsIndex);
      if (base.type === 'p' && base.n === 5 && remP > 0) {
        tiles.push({ type: 'p', n: 5, red: true });
        remP--;
      } else if (base.type === 's' && base.n === 5 && remS > 0) {
        tiles.push({ type: 's', n: 5, red: true });
        remS--;
      } else {
        tiles.push(base);
      }
    }
  }
  return tiles;
};

/** 副露に含まれる五p・五sの(非赤, 赤)枚数を数える */
const countMeldFives = (melds: Input['melds'], redRule: Rule['red']) => {
  const meldTiles = melds.flatMap(m => instantiateMeld(m, redRule));
  let nonRedP = 0;
  let redP = 0;
  let nonRedS = 0;
  let redS = 0;
  for (const t of meldTiles) {
    if (t.type === 'p' && t.n === 5) {
      if (t.red) redP++;
      else nonRedP++;
    } else if (t.type === 's' && t.n === 5) {
      if (t.red) redS++;
      else nonRedS++;
    }
  }
  return { nonRedP, redP, nonRedS, redS };
};

const pickBestNonNoYaku = (candidates: ScoredHora[]): ScoredHora | null => {
  let best: ScoredHora | null = null;
  for (const c of candidates) {
    if (isNoYaku(c)) continue;
    if (best === null || c.score.payment.total > best.score.payment.total) {
      best = c;
    }
  }
  return best;
};

/**
 * 13枚(副露除く)の聴牌形1つについて、全待ち・合法な赤の付き方・嶺上有無を
 * `generateResult` で評価する (§3.5・§5.2)。
 */
export function evaluateTempaiForm(
  form: TileCounts,
  ctx: EvalContext
): EvaluatedWin[] {
  const tableZero: Table = { ...ctx.table, continue: 0, deposit: 0 };
  const menzen = isMenzen(ctx.melds);
  const handOptionsBase: HandOptions = {
    riichi: menzen ? 'riichi' : 'none',
    ippatsu: false,
    rinshan: false,
    chankan: false,
    haitei: false,
    tenho: false,
    tsubameGaeshi: false,
    kanFuri: false
  };

  const meldFives = countMeldFives(ctx.melds, ctx.rule.red);
  const rP = redCountOf(ctx.rule.red, 'p');
  const rS = redCountOf(ctx.rule.red, 's');
  const form5p = form[13] ?? 0;
  const form5s = form[22] ?? 0;

  const minRedP = Math.max(0, form5p - (4 - rP - meldFives.nonRedP));
  const maxRedP = Math.min(form5p, Math.max(0, rP - meldFives.redP));
  const minRedS = Math.max(0, form5s - (4 - rS - meldFives.nonRedS));
  const maxRedS = Math.min(form5s, Math.max(0, rS - meldFives.redS));

  const rinshanList = ctx.includeRinshan ? [false, true] : [false];
  const resultsByKey = new Map<string, EvaluatedWin>();

  for (let fRedP = minRedP; fRedP <= maxRedP; fRedP++) {
    for (let fRedS = minRedS; fRedS <= maxRedS; fRedS++) {
      const handTiles = countsToHandTiles(form, fRedP, fRedS);

      for (const rinshan of rinshanList) {
        const input: Input = {
          hand: handTiles,
          melds: ctx.melds,
          dora: ctx.dora,
          uradora: [],
          nuki: rinshan ? ctx.nuki0 + 1 : ctx.nuki0
        };
        const res = generateResult(
          tableZero,
          input,
          { ...handOptionsBase, rinshan },
          ctx.rule
        );
        if (
          res === null ||
          res.type !== 'hora-shanten' ||
          res.info.type !== 'hora'
        ) {
          continue;
        }

        // by === 'tsumo' の候補を (和了牌 index, 最終赤P, 最終赤S) でグルーピング
        const grouped = new Map<
          string,
          {
            winTile: Tile;
            redP: number;
            redS: number;
            candidates: ScoredHora[];
          }
        >();

        for (const h of res.info.hora) {
          if (h.by !== 'tsumo') continue;
          const winIdx = tileToCountsIndex(h.horaTile);
          const winRedP =
            h.horaTile.type === 'p' && h.horaTile.n === 5 && h.horaTile.red
              ? 1
              : 0;
          const winRedS =
            h.horaTile.type === 's' && h.horaTile.n === 5 && h.horaTile.red
              ? 1
              : 0;
          const totalRedP = fRedP + winRedP;
          const totalRedS = fRedS + winRedS;
          const gk = `${winIdx}:${totalRedP}:${totalRedS}`;
          const entry = grouped.get(gk);
          if (entry) {
            entry.candidates.push(h);
          } else {
            grouped.set(gk, {
              winTile: h.horaTile,
              redP: totalRedP,
              redS: totalRedS,
              candidates: [h]
            });
          }
        }

        for (const [gk, g] of grouped) {
          const fullKey = `${gk}:${rinshan ? 1 : 0}`;
          if (resultsByKey.has(fullKey)) continue;
          resultsByKey.set(fullKey, {
            winTile: g.winTile,
            red: { p: g.redP, s: g.redS },
            rinshan,
            candidates: g.candidates,
            best: pickBestNonNoYaku(g.candidates)
          });
        }
      }
    }
  }

  return Array.from(resultsByKey.values());
}

/**
 * 1つの候補の組(w, red, rinshan) に対し、追加抜き北 e と裏ドラ分布を畳み込んだ期待和了点数を求める。
 */
function expectedValueForWin(
  evaluated: EvaluatedWin | undefined,
  extraNukiHand: number,
  westDoraCount: number,
  uraDist: readonly { han: number; prob: number }[],
  tableZero: Table,
  rule: Rule
): number {
  if (!evaluated || evaluated.best === null) return 0;

  const validCandidates = evaluated.candidates.filter(c => !isNoYaku(c));
  if (validCandidates.length === 0) return 0;

  // 全候補が役満なら追加飜によらず点数一定
  const allYakuman = validCandidates.every(c => c.score.yakumanPoint > 0);
  if (allYakuman) {
    return evaluated.best.score.payment.total;
  }

  let ev = 0;
  for (const { han: uraHan, prob: uraProb } of uraDist) {
    if (uraProb <= 0) continue;
    if (extraNukiHand === 0 && uraHan === 0) {
      ev += uraProb * evaluated.best.score.payment.total;
      continue;
    }

    const extraYaku: Yaku[] = [];
    if (extraNukiHand > 0) {
      extraYaku.push({ type: 'yaku', name: 'nuki-dora', han: extraNukiHand });
      if (westDoraCount > 0) {
        extraYaku.push({
          type: 'yaku',
          name: 'dora',
          han: extraNukiHand * westDoraCount
        });
      }
    }
    if (uraHan > 0) {
      extraYaku.push({ type: 'yaku', name: 'ura-dora', han: uraHan });
    }

    let bestTotal = 0;
    for (const c of validCandidates) {
      if (c.score.yakumanPoint > 0) {
        if (c.score.payment.total > bestTotal) {
          bestTotal = c.score.payment.total;
        }
        continue;
      }
      const scored = calculateHoraScore(
        { ...c, yaku: [...c.yaku, ...extraYaku] },
        tableZero,
        rule
      );
      if (scored.payment.total > bestTotal) {
        bestTotal = scored.payment.total;
      }
    }
    ev += uraProb * bestTotal;
  }

  return ev;
}

export interface RedBaseline {
  k0: { p: number; s: number };
  a0: { p: number; s: number };
  availableTotal: { p: number; s: number };
  availableRed: { p: number; s: number };
}

/**
 * 探索で見つかった全 (聴牌形, 待ち) について、評価結果 `EvaluatedWin[]` をキャッシュしつつ
 * 指定した起点赤情報 `redBase` に対する V テーブル (solve 用平坦配列) を構築する。
 */
export function buildValuesTable(
  tempaiHandsFlat: Uint8Array,
  waitCounts: Uint32Array,
  waitTiles: Uint8Array,
  eMax: number,
  ctx: EvalContext,
  redBase: RedBaseline,
  evalCache?: Map<number, EvaluatedWin[]>
): Float64Array {
  const numTempai = waitCounts.length;
  const eCount = eMax + 1;
  const totalWaits = waitTiles.length;
  const values = new Float64Array(totalWaits * eCount * 2);

  const tableZero: Table = { ...ctx.table, continue: 0, deposit: 0 };
  const menzen = isMenzen(ctx.melds);
  const nukiMode = ctx.rule.north === 'nukidora';
  const westDoraCount = countBy(ctx.dora, t => t.type === 'z' && t.n === 3);

  const meldTiles = ctx.melds.flatMap(m => instantiateMeld(m, ctx.rule.red));
  const meldsCounts = tilesToCounts(meldTiles);
  const doraCounts = tilesToCounts(ctx.dora);

  let waitCursor = 0;
  for (let ti = 0; ti < numTempai; ti++) {
    const formArr = tempaiHandsFlat.subarray(ti * 34, (ti + 1) * 34);
    const form = Array.from(formArr) as TileCounts;
    const wc = waitCounts[ti] ?? 0;

    let evaluatedList = evalCache?.get(ti);
    if (!evaluatedList) {
      evaluatedList = evaluateTempaiForm(form, ctx);
      evalCache?.set(ti, evaluatedList);
    }

    // 高速引き当て: `${winIdx}:${redP}:${redS}:${rinshan?1:0}` -> EvaluatedWin
    const lookup = new Map<string, EvaluatedWin>();
    for (const ew of evaluatedList) {
      const wIdx = tileToCountsIndex(ew.winTile);
      lookup.set(`${wIdx}:${ew.red.p}:${ew.red.s}:${ew.rinshan ? 1 : 0}`, ew);
    }

    for (let wi = 0; wi < wc; wi++) {
      const wpIdx = waitCursor + wi;
      const w = waitTiles[wpIdx] as TileCountsIndex;

      // 最終14枚形 (H + w)
      const finalCounts = [...form] as TileCounts;
      finalCounts[w] = ((finalCounts[w] ?? 0) + 1) as TileCounts[number];

      const kFinalP = finalCounts[13] ?? 0;
      const kFinalS = finalCounts[22] ?? 0;
      const redDist = redJointDistribution(
        {
          kFinal: kFinalP,
          k0: redBase.k0.p,
          a0: redBase.a0.p,
          N: redBase.availableTotal.p,
          R: redBase.availableRed.p
        },
        {
          kFinal: kFinalS,
          k0: redBase.k0.s,
          a0: redBase.a0.s,
          N: redBase.availableTotal.s,
          R: redBase.availableRed.s
        }
      );

      for (let e = 0; e <= eMax; e++) {
        const nukiTotal = nukiMode ? ctx.nuki0 + e : 0;
        const uraDist = uradoraDistribution(
          menzen,
          ctx.dora.length,
          finalCounts,
          meldsCounts,
          doraCounts,
          nukiTotal
        );

        const rMax = ctx.includeRinshan && e > 0 ? 1 : 0;
        for (let r = 0; r <= rMax; r++) {
          const isRinshan = r === 1;
          const extraNukiHand = isRinshan ? e - 1 : e;
          let val = 0;

          for (const rho of redDist) {
            if (rho.prob <= 0) continue;
            const ew = lookup.get(`${w}:${rho.p}:${rho.s}:${r}`);
            val +=
              rho.prob *
              expectedValueForWin(
                ew,
                extraNukiHand,
                westDoraCount,
                uraDist,
                tableZero,
                ctx.rule
              );
          }

          values[(wpIdx * eCount + e) * 2 + r] = val;
        }
      }
    }

    waitCursor += wc;
  }

  return values;
}
