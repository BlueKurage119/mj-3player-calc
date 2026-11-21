import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TurnChart } from './TurnChart';
import { CHART_TURNS } from './chart-series';

// Codex 指摘(PR #149 P2)の検証: 期待値(点)の縦軸で、目盛りのラベルと線の高さが一致する
describe('TurnChart 縦軸の目盛り位置', () => {
  it('点の軸(上端 5000)で、ラベル 2500 のグリッド線と値 2500 の点の高さが一致する', () => {
    const html = renderToStaticMarkup(
      <TurnChart
        series={[
          {
            id: 's',
            label: 's',
            colorToken: '--md-sys-color-chart-primary',
            dash: undefined,
            values: Array.from({ length: CHART_TURNS }, () => 2500)
          }
        ]}
        displayTurn={3}
        axis={{ kind: 'point', max: 5000 }}
        legend={false}
      />
    );
    const gridYs = [
      ...html.matchAll(/class="turn-chart__grid"[^>]*y1="([\d.]+)"/g)
    ].map(m => m[1]);
    const tickAt2500 = html.match(
      /class="turn-chart__tick"[^>]*y="([\d.]+)"[^>]*>2500</
    );
    const dotY = html.match(/class="turn-chart__dot"[^>]*cy="([\d.]+)"/);
    expect(gridYs).toHaveLength(5);
    expect(tickAt2500?.[1]).toBeDefined();
    expect(dotY?.[1]).toBe(tickAt2500?.[1]);
    expect(gridYs).toContain(tickAt2500?.[1]);
  });
});
