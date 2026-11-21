import { describe, expect, it } from 'vitest';
import type { CandidateStat, TurnStat } from '../../engine/types';
import {
  CHART_TURNS,
  formatElapsed,
  formatEv,
  formatPercent,
  rankCandidates,
  statAt,
  toRateSeries
} from './chart-series';

const perTurn = (f: (draw: number) => Partial<TurnStat>): TurnStat[] =>
  Array.from({ length: CHART_TURNS }, (_, i) => ({
    draw: i + 1,
    tenpai: 0,
    win: 0,
    ev: 0,
    ...f(i + 1)
  }));

const cand = (
  tile: number,
  f: (draw: number) => Partial<TurnStat>
): CandidateStat => {
  const pt = perTurn(f);
  const last = pt[CHART_TURNS - 1] as TurnStat;
  return {
    discard: { type: 'z', n: tile as 1 },
    shanten: 1,
    tenpai: last.tenpai,
    win: last.win,
    ev: last.ev,
    perTurn: pt
  };
};

describe('chart-series', () => {
  it('U-7: statAt は i 巡目 = perTurn[i-1]。範囲外は端に丸める', () => {
    const c = cand(1, d => ({ win: d / 100 }));
    expect(statAt(c, 3).win).toBe(0.03);
    expect(statAt(c, 18).win).toBe(0.18);
    expect(statAt(c, 0).win).toBe(0.01);
    expect(statAt(c, 99).win).toBe(0.18);
  });

  it('toRateSeries は和了率・聴牌率の2系列(長さ18、色はトークン名)', () => {
    const c = cand(1, d => ({ win: d / 100, tenpai: d / 50 }));
    const s = toRateSeries(c);
    expect(s.map(x => x.id)).toEqual(['win', 'tenpai']);
    expect(s.every(x => x.values.length === 18)).toBe(true);
    expect(s.every(x => x.colorToken.startsWith('--md-sys-color-'))).toBe(true);
    expect(s[0]?.values[2]).toBe(0.03);
  });

  it('U-6: rankCandidates は表示巡目の期待値の降順、同値は和了率降順、さらに同値は元の並び', () => {
    const a = cand(1, d => ({ ev: d === 3 ? 100 : 500, win: 0.1 }));
    const b = cand(2, d => ({ ev: d === 3 ? 300 : 100, win: 0.1 }));
    const c = cand(3, d => ({ ev: d === 3 ? 300 : 100, win: 0.2 }));
    const d = cand(4, () => ({ ev: 300, win: 0.2 }));
    expect(rankCandidates([a, b, c], 3).map(r => r.index)).toEqual([2, 1, 0]);
    // 巡目を変えると順位が変わる
    expect(rankCandidates([a, b, c], 18).map(r => r.index)).toEqual([0, 2, 1]);
    // 完全な同値は元の並び
    expect(rankCandidates([c, d], 3).map(r => r.index)).toEqual([0, 1]);
  });

  it('書式: 割合は小数1桁の%、期待値は四捨五入+桁区切り、経過は秒・分秒', () => {
    expect(formatPercent(0.4213)).toBe('42.1%');
    expect(formatEv(2310.4)).toBe('2,310');
    expect(formatEv(12345.6)).toBe('12,346');
    expect(formatElapsed(999)).toBe('0秒');
    expect(formatElapsed(59_000)).toBe('59秒');
    expect(formatElapsed(61_000)).toBe('1分1秒');
  });
});
