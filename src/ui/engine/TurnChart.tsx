import type React from 'react';
import { Tile } from '../tile';
import {
  CHART_TURNS,
  type ChartAxis,
  type ChartSeries,
  PERCENT_AXIS
} from './chart-series';
import './engine.css';

export interface TurnChartProps {
  series: ChartSeries[];
  displayTurn: number;
  /** 縦軸(省略は 0〜100%) */
  axis?: ChartAxis | undefined;
  /** 凡例の前に出す指標名(b案) */
  caption?: string | undefined;
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
export const yOf = (value: number, max = 1): number =>
  PAD_T + (1 - Math.min(1, Math.max(0, value / max))) * PLOT_H;

export const linePath = (values: readonly number[], max = 1): string =>
  values
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'}${xOf(i + 1).toFixed(1)} ${yOf(v, max).toFixed(1)}`
    )
    .join(' ');

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const X_TICKS = [1, 3, 6, 9, 12, 15, 18];

/** 巡目ごとの折れ線グラフ(自作SVG。縦軸 0〜100%、横軸 1〜18 巡目。系列数に依存しない) */
export function TurnChart({
  series,
  displayTurn,
  axis = PERCENT_AXIS,
  caption
}: TurnChartProps): React.JSX.Element {
  return (
    <div className="turn-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="turn-chart__svg"
        role="img"
        aria-label="巡目ごとの推移"
      >
        {Y_TICKS.map(f => {
          const t = f;
          return (
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
                {axis.kind === 'percent'
                  ? `${t * 100}%`
                  : Math.round(t * axis.max)}
              </text>
            </g>
          );
        })}
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
        {series.map(s => (
          <path
            key={s.id}
            className="turn-chart__line"
            d={linePath(s.values, axis.max)}
            data-series={s.id}
            style={{ stroke: `var(${s.colorToken})` }}
            strokeDasharray={s.dash}
          />
        ))}
        {series.map(s => (
          <circle
            key={s.id}
            className="turn-chart__dot"
            cx={xOf(displayTurn)}
            cy={yOf(s.values[displayTurn - 1] ?? 0, axis.max)}
            r={2.5}
            style={{ fill: `var(${s.colorToken})` }}
          />
        ))}
      </svg>
      {caption ? <p className="turn-chart__caption">{caption}</p> : null}
      <ul className="turn-chart__legend">
        {series.map(s => (
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
                strokeDasharray={s.dash}
              />
            </svg>
            {s.tile ? <Tile tile={s.tile} /> : s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
