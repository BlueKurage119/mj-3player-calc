import type React from 'react';
import { CHART_TURNS, type ChartSeries } from './chart-series';
import './engine.css';

export interface TurnChartProps {
  series: ChartSeries[];
  displayTurn: number;
}

const W = 320;
const H = 160;
const PAD_L = 34;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 22;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

export const xOf = (turn: number): number =>
  PAD_L + ((turn - 1) / (CHART_TURNS - 1)) * PLOT_W;
export const yOf = (rate: number): number =>
  PAD_T + (1 - Math.min(1, Math.max(0, rate))) * PLOT_H;

export const linePath = (values: readonly number[]): string =>
  values
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'}${xOf(i + 1).toFixed(1)} ${yOf(v).toFixed(1)}`
    )
    .join(' ');

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const X_TICKS = [1, 3, 6, 9, 12, 15, 18];

/** 巡目ごとの折れ線グラフ(自作SVG。縦軸 0〜100%、横軸 1〜18 巡目。系列数に依存しない) */
export function TurnChart({
  series,
  displayTurn
}: TurnChartProps): React.JSX.Element {
  return (
    <div className="turn-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="turn-chart__svg"
        role="img"
        aria-label="巡目ごとの推移"
      >
        {Y_TICKS.map(t => (
          <g key={t}>
            <line
              className="turn-chart__grid"
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yOf(t)}
              y2={yOf(t)}
            />
            <text
              className="turn-chart__tick"
              x={PAD_L - 4}
              y={yOf(t)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {t * 100}%
            </text>
          </g>
        ))}
        {X_TICKS.map(t => (
          <text
            key={t}
            className="turn-chart__tick"
            x={xOf(t)}
            y={H - 6}
            textAnchor="middle"
          >
            {t}
          </text>
        ))}
        <line
          className="turn-chart__current"
          x1={xOf(displayTurn)}
          x2={xOf(displayTurn)}
          y1={PAD_T}
          y2={PAD_T + PLOT_H}
        />
        {series.map((s, i) => (
          <path
            key={s.id}
            className="turn-chart__line"
            d={linePath(s.values)}
            data-series={s.id}
            style={{ stroke: `var(${s.colorToken})` }}
            strokeDasharray={i % 2 === 1 ? '5 3' : undefined}
          />
        ))}
      </svg>
      <ul className="turn-chart__legend">
        {series.map((s, i) => (
          <li key={s.id} className="turn-chart__legend-item">
            <svg
              viewBox="0 0 20 4"
              className="turn-chart__legend-swatch"
              aria-hidden="true"
            >
              <line
                x1="0"
                x2="20"
                y1="2"
                y2="2"
                style={{ stroke: `var(${s.colorToken})` }}
                strokeWidth="2"
                strokeDasharray={i % 2 === 1 ? '5 3' : undefined}
              />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
