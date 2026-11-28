import { describe, expect, it } from 'vitest';
import type { CandidateStat, TurnStat } from '../../engine/types';
import {
  CHART_TURNS,
  formatElapsed,
  formatEv,
  formatPercent,
  isShantenBack,
  rankCandidates,
  niceMax,
  statAt,
  toCandidateSeries,
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
  it('U-7: 巡目 i は残りツモ 18−i 回の累積 = perTurn[17−i](境界 i=1・17、範囲外は端に丸める)', () => {
    // draw=k+1 回の累積値 = (k+1)/100 を持つ候補
    const c = cand(1, d => ({ win: d / 100, tenpai: d / 50, ev: d * 10 }));
    // i=1 → 残り17回 → perTurn[16](draw=17)
    expect(statAt(c, 1)).toMatchObject({ remaining: 17, win: 0.17, ev: 170 });
    expect(c.perTurn[16]?.win).toBe(0.17);
    // i=3 → 残り15回 → perTurn[14]
    expect(statAt(c, 3).win).toBe(0.15);
    // i=17 → 残り1回 → perTurn[0](draw=1)
    expect(statAt(c, 17)).toMatchObject({ remaining: 1, win: 0.01, ev: 10 });
    expect(c.perTurn[0]?.win).toBe(0.01);
    // 範囲外は端に丸める
    expect(statAt(c, 0).win).toBe(0.17);
    expect(statAt(c, 99).win).toBe(0);
  });

  it('U-7: i=18(残り0回)は画面側で補う。和了率0・期待値0、聴牌率はその候補の打牌後の向聴が0なら1、そうでなければ0', () => {
    const base = cand(1, d => ({ win: d / 100, tenpai: 0.5, ev: d * 10 }));
    expect(statAt({ ...base, shanten: 0 }, 18)).toMatchObject({
      remaining: 0,
      win: 0,
      ev: 0,
      tenpai: 1
    });
    for (const sh of [1, 2, 3]) {
      expect(statAt({ ...base, shanten: sh }, 18)).toMatchObject({
        win: 0,
        ev: 0,
        tenpai: 0
      });
    }
  });

  it('U-7: 1巡目が最大で巡目が進むと下がる(累積が増える候補でも、巡目の向きは逆)', () => {
    const c = cand(1, d => ({ win: d / 100, ev: d * 10 }));
    const vs = toRateSeries(c)[0]?.values ?? [];
    expect(vs[0]).toBe(0.17);
    expect(vs[16]).toBe(0.01);
    expect(vs[17]).toBe(0);
    for (let i = 1; i < vs.length; i++) {
      expect(vs[i] as number).toBeLessThanOrEqual(vs[i - 1] as number);
    }
  });

  it('toRateSeries は和了率・聴牌率の2系列(長さ18、色はトークン名)', () => {
    const c = cand(1, d => ({ win: d / 100, tenpai: d / 50 }));
    const s = toRateSeries(c);
    expect(s.map(x => x.id)).toEqual(['win', 'tenpai']);
    expect(s.every(x => x.values.length === 18)).toBe(true);
    expect(s.every(x => x.colorToken.startsWith('--md-sys-color-'))).toBe(true);
    expect(s[0]?.values[2]).toBe(0.15);
  });

  it('U-6: rankCandidates は既定で期待値の降順。同値は和了率降順、さらに同値は元の並び。列を指定するとその列の降順', () => {
    // 3巡目 = draw 15、18巡目 = 補った 0(全員同値)
    const a = cand(1, d => ({
      ev: d === 15 ? 100 : 500,
      win: 0.1,
      tenpai: 0.9
    }));
    const b = cand(2, d => ({
      ev: d === 15 ? 300 : 100,
      win: 0.1,
      tenpai: 0.5
    }));
    const c = cand(3, d => ({
      ev: d === 15 ? 300 : 100,
      win: 0.2,
      tenpai: 0.7
    }));
    const d = cand(4, () => ({ ev: 300, win: 0.2, tenpai: 0.7 }));
    expect(rankCandidates([a, b, c], 3).map(r => r.index)).toEqual([2, 1, 0]);
    // 1巡目 = draw 17 では ev は a=500 が最大
    expect(rankCandidates([a, b, c], 1).map(r => r.index)).toEqual([0, 2, 1]);
    // 18巡目は全員 ev 0・win 0 なので元の並び
    expect(rankCandidates([a, b, c], 18).map(r => r.index)).toEqual([0, 1, 2]);
    // 完全な同値は元の並び
    expect(rankCandidates([c, d], 3).map(r => r.index)).toEqual([0, 1]);
    // 列の指定: 聴牌率(a 0.9 > c 0.7 > b 0.5)、和了率(c 0.2 > a=b 0.1 → ev で b が先)
    expect(rankCandidates([a, b, c], 3, 'tenpai').map(r => r.index)).toEqual([
      0, 2, 1
    ]);
    expect(rankCandidates([a, b, c], 3, 'win').map(r => r.index)).toEqual([
      2, 1, 0
    ]);
  });

  it('isShantenBack: 打牌後の向聴が候補の最小より大きい候補だけ true。13枚入力は false', () => {
    const mk = (shanten: number): CandidateStat => ({
      ...cand(1, () => ({})),
      shanten
    });
    const cs = [mk(1), mk(1), mk(2), mk(3)];
    expect(cs.map(c => isShantenBack(c, cs))).toEqual([
      false,
      false,
      true,
      true
    ]);
    const c13: CandidateStat = { ...mk(2), discard: null };
    expect(isShantenBack(c13, [c13])).toBe(false);
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

describe('toCandidateSeries(b案)', () => {
  const cs = [1, 2, 3].map(t =>
    cand(t, d => ({ ev: d * t * 100, win: t / 10 }))
  );
  it('上位 limit 件を指標の降順で、順位どおりの色で返す。値は18点', () => {
    const { series, axis } = toCandidateSeries(cs, 3, 'ev', 2);
    expect(series.map(s => s.id)).toEqual(['cand-2', 'cand-1']);
    expect(series[0]?.values.length).toBe(CHART_TURNS);
    expect(series[0]?.colorToken).not.toBe(series[1]?.colorToken);
    expect(axis).toEqual({ kind: 'point', max: 10000 });
  });
  it('率の指標は縦軸 0〜1', () => {
    expect(toCandidateSeries(cs, 3, 'win').axis).toEqual({
      kind: 'percent',
      max: 1
    });
  });
  it('niceMax は 1・2・5×10^k に切り上げる', () => {
    expect([0, 1, 1213, 2000, 2001, 10500].map(niceMax)).toEqual([
      1, 1, 2000, 2000, 5000, 20000
    ]);
  });

  it('172-T6: 期待値の縦軸上端の下限は 100 で、最大 0・30 は 100、最大 150 は 200 になる', () => {
    const zeroCs = [1, 2].map(t => cand(t, () => ({ ev: 0 })));
    expect(toCandidateSeries(zeroCs, 3, 'ev').axis).toEqual({
      kind: 'point',
      max: 100
    });
    const max30Cs = [1, 2].map(t => cand(t, () => ({ ev: t === 1 ? 30 : 0 })));
    expect(toCandidateSeries(max30Cs, 3, 'ev').axis).toEqual({
      kind: 'point',
      max: 100
    });
    const max150Cs = [1, 2].map(t =>
      cand(t, () => ({ ev: t === 1 ? 150 : 0 }))
    );
    expect(toCandidateSeries(max150Cs, 3, 'ev').axis).toEqual({
      kind: 'point',
      max: 200
    });
  });
});
