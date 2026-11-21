// 赤ドラの付き方(超幾何分布)の計算 (§3.5)

export interface RedOutcome {
  count: number;
  prob: number;
}

const comb = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let res = 1;
  const kk = Math.min(k, n - k);
  for (let i = 1; i <= kk; i++) {
    res = (res * (n - kk + i)) / i;
  }
  return res;
};

/**
 * 単一スート(5p または 5s)における最終形の赤ドラ枚数分布 (§3.5)。
 * - kFinal: 最終14枚形の五の枚数
 * - k0: 起点の手の五の枚数
 * - a0: 起点の手の赤五の枚数
 * - visibleTotal: 見えていない五の枚数 N
 * - visibleRed: 見えていない赤五の枚数 R
 */
export function redDistributionForSuit(
  kFinal: number,
  k0: number,
  a0: number,
  visibleTotal: number,
  visibleRed: number
): RedOutcome[] {
  const a0Kept = Math.min(a0, kFinal);
  const drawn = Math.max(0, kFinal - k0);

  if (drawn === 0) {
    return [{ count: Math.min(kFinal, a0Kept), prob: 1 }];
  }

  const denom = comb(visibleTotal, drawn);
  if (denom === 0) {
    // 到達し得ない組み合わせ(例: 見えていない五より多く引く場合)
    return [];
  }

  const minRed = Math.max(0, drawn - (visibleTotal - visibleRed));
  const maxRed = Math.min(drawn, visibleRed);
  const byCount = new Map<number, number>();

  for (let x = minRed; x <= maxRed; x++) {
    const p =
      (comb(visibleRed, x) * comb(visibleTotal - visibleRed, drawn - x)) /
      denom;
    if (p <= 0) continue;
    const totalRed = Math.min(kFinal, a0Kept + x);
    byCount.set(totalRed, (byCount.get(totalRed) ?? 0) + p);
  }

  return Array.from(byCount.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([count, prob]) => ({ count, prob }));
}

export interface RedJointOutcome {
  p: number;
  s: number;
  prob: number;
}

/** 5p と 5s の同時分布 */
export function redJointDistribution(
  pParams: { kFinal: number; k0: number; a0: number; N: number; R: number },
  sParams: { kFinal: number; k0: number; a0: number; N: number; R: number }
): RedJointOutcome[] {
  const distP = redDistributionForSuit(
    pParams.kFinal,
    pParams.k0,
    pParams.a0,
    pParams.N,
    pParams.R
  );
  const distS = redDistributionForSuit(
    sParams.kFinal,
    sParams.k0,
    sParams.a0,
    sParams.N,
    sParams.R
  );
  const out: RedJointOutcome[] = [];
  for (const op of distP) {
    for (const os of distS) {
      out.push({ p: op.count, s: os.count, prob: op.prob * os.prob });
    }
  }
  return out;
}
