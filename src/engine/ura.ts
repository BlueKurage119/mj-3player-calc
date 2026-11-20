import {
  type TileCounts,
  type TileCountsIndex,
  isSanmaIndex,
  nextIndex
} from '../core/tile';

export interface UraHanProb {
  han: number;
  prob: number;
}

const NORTH_INDEX = 30;

/**
 * 裏ドラ加算飜数の確率分布 P_ura(j | H+w, nukiTotal) (§3.5)。
 * - menzen: 門前か (false なら j=0 が確率 1)
 * - indicatorCount: ドラ表示牌の枚数 (= 裏ドラ表示牌の枚数)
 * - finalHandCounts: 最終14枚(H+w) の枚数配列
 * - meldsCounts: 副露牌(暗槓を含む) の枚数配列
 * - doraCounts: 表ドラ表示牌の枚数配列
 * - nukiTotal: 合計の抜き北枚数 (nuki0 + e)。共通役牌設定では 0
 */
export function uradoraDistribution(
  menzen: boolean,
  indicatorCount: number,
  finalHandCounts: TileCounts,
  meldsCounts: TileCounts,
  doraCounts: TileCounts,
  nukiTotal: number
): UraHanProb[] {
  if (!menzen || indicatorCount === 0) {
    return [{ han: 0, prob: 1 }];
  }

  // 見えていない牌の枚数 c_i と、表示牌 i が選ばれたときの加算飜数
  let totalRemaining = 0;
  const remaining = new Array<number>(34).fill(0);
  for (let i = 0; i < 34; i++) {
    if (!isSanmaIndex(i as TileCountsIndex)) continue;
    const used =
      (finalHandCounts[i] ?? 0) +
      (meldsCounts[i] ?? 0) +
      (doraCounts[i] ?? 0) +
      (i === NORTH_INDEX ? nukiTotal : 0);
    const c = Math.max(0, 4 - used);
    remaining[i] = c;
    totalRemaining += c;
  }

  if (totalRemaining === 0) {
    return [{ han: 0, prob: 1 }];
  }

  // 表示牌1枚あたりの飜数分布
  const singleDist = new Map<number, number>();
  for (let i = 0; i < 34; i++) {
    const c = remaining[i] ?? 0;
    if (c === 0) continue;
    const doraIdx = nextIndex(i as TileCountsIndex);
    const han =
      (finalHandCounts[doraIdx] ?? 0) +
      (meldsCounts[doraIdx] ?? 0) +
      (doraIdx === NORTH_INDEX ? nukiTotal : 0);
    singleDist.set(han, (singleDist.get(han) ?? 0) + c / totalRemaining);
  }

  // indicatorCount 枚分の独立同分布の畳み込み(復元抽出近似 §3.5 確定 Q12)
  let dist = new Map<number, number>([[0, 1]]);
  for (let d = 0; d < indicatorCount; d++) {
    const next = new Map<number, number>();
    for (const [h1, p1] of dist) {
      for (const [h2, p2] of singleDist) {
        const h = h1 + h2;
        next.set(h, (next.get(h) ?? 0) + p1 * p2);
      }
    }
    dist = next;
  }

  return Array.from(dist.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([han, prob]) => ({ han, prob }));
}
