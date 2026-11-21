import type React from 'react';
import type { Tile as CoreTile } from '../../core/tile';
import type { CandidateStat } from '../../engine/types';
import { Slider } from '../md';
import { Tile, tileLabelOf } from '../tile';
import { TurnChart } from './TurnChart';
import {
  CHART_TURNS,
  RANK_METRICS,
  type RankMetric,
  formatEv,
  formatPercent,
  isShantenBack,
  rankCandidates,
  CANDIDATE_LINE_STYLES,
  statAt,
  toCandidateSeries,
  toRateSeries
} from './chart-series';
import './engine.css';

export interface EngineResultProps {
  candidates: CandidateStat[];
  displayTurn: number;
  /** 表示する巡目の変更(1〜18)。再計算はしない */
  onTurnChange: (turn: number) => void;
  /** 表示中の候補の元の位置。null は先頭行(期待値の最大)に追従する */
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  /** 14枚入力の候補行の並びに使う列 */
  rankMetric: RankMetric;
  onRankMetricChange: (metric: RankMetric) => void;
}

export function EngineSummary({
  candidate,
  displayTurn
}: {
  candidate: CandidateStat;
  displayTurn: number;
}): React.JSX.Element {
  const s = statAt(candidate, displayTurn);
  return (
    <dl className="engine-summary">
      <div className="engine-summary__item">
        <dt>和了率</dt>
        <dd className="tabular-nums">{formatPercent(s.win)}</dd>
      </div>
      <div className="engine-summary__item">
        <dt>聴牌率</dt>
        <dd className="tabular-nums">{formatPercent(s.tenpai)}</dd>
      </div>
      <div className="engine-summary__item">
        <dt>期待値</dt>
        <dd className="tabular-nums">{formatEv(s.ev)}</dd>
      </div>
    </dl>
  );
}

/** 14枚入力: 打牌候補ごとの行。列ヘッダー(和了率・聴牌率・期待値)のタップで、その列の降順に並べ替える */
export function EngineCandidates({
  candidates,
  displayTurn,
  selectedIndex,
  onSelect,
  rankMetric,
  onRankMetricChange
}: Pick<
  EngineResultProps,
  | 'candidates'
  | 'displayTurn'
  | 'selectedIndex'
  | 'onSelect'
  | 'rankMetric'
  | 'onRankMetricChange'
>): React.JSX.Element {
  const ranked = rankCandidates(candidates, displayTurn, rankMetric);
  const current = selectedIndex ?? ranked[0]?.index ?? 0;
  return (
    <div className="engine-candidates">
      <div className="engine-candidates__header">
        <span aria-hidden="true" />
        {RANK_METRICS.map(m => (
          <button
            key={m.value}
            type="button"
            className="engine-candidates__sort"
            aria-pressed={m.value === rankMetric}
            onClick={() => onRankMetricChange(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <ul className="engine-candidates__list">
        {ranked.map(({ index, candidate }, rank) => {
          const line = CANDIDATE_LINE_STYLES[rank];
          const s = statAt(candidate, displayTurn);
          const discard: CoreTile | null = candidate.discard;
          return (
            <li key={index}>
              <button
                type="button"
                className="engine-candidates__row"
                aria-pressed={index === current}
                aria-label={
                  discard ? `${tileLabelOf(discard)}を切る場合` : undefined
                }
                onClick={() => onSelect(index)}
              >
                <span className="engine-candidates__tile">
                  {line ? (
                    <span
                      className="engine-candidates__mark"
                      aria-hidden="true"
                      style={{ backgroundColor: `var(${line.colorToken})` }}
                    />
                  ) : null}
                  {discard ? <Tile tile={discard} /> : null}
                  {isShantenBack(candidate, candidates) ? (
                    <span className="engine-candidates__chip">向聴戻し</span>
                  ) : null}
                </span>
                <span className="engine-candidates__value tabular-nums">
                  {formatPercent(s.win)}
                </span>
                <span className="engine-candidates__value tabular-nums">
                  {formatPercent(s.tenpai)}
                </span>
                <span className="engine-candidates__value tabular-nums">
                  {formatEv(s.ev)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 14枚入力のグラフ: 候補行の並びの上位5候補の折れ線(指標は列ヘッダーの選択に従う) */
function CandidateChart({
  candidates,
  displayTurn,
  rankMetric
}: Pick<
  EngineResultProps,
  'candidates' | 'displayTurn' | 'rankMetric'
>): React.JSX.Element {
  const { series, axis } = toCandidateSeries(
    candidates,
    displayTurn,
    rankMetric
  );
  const label = RANK_METRICS.find(m => m.value === rankMetric)?.label ?? '';
  return (
    <TurnChart
      series={series}
      displayTurn={displayTurn}
      axis={axis}
      caption={axis.kind === 'point' ? `${label}(点)` : label}
    />
  );
}

/** 計算結果の表示(要約・候補行・グラフ・巡目別の表)。表示巡目の変更では再計算しない */
export function EngineResult(props: EngineResultProps): React.JSX.Element {
  const {
    candidates,
    displayTurn,
    onTurnChange,
    selectedIndex,
    onSelect,
    rankMetric,
    onRankMetricChange
  } = props;
  const is14 = candidates.some(c => c.discard !== null);
  const ranked = rankCandidates(candidates, displayTurn, rankMetric);
  const current =
    (selectedIndex !== null ? candidates[selectedIndex] : undefined) ??
    ranked[0]?.candidate;
  return (
    <div className="engine-result">
      {current ? (
        <div className="engine-result__chart">
          {is14 ? (
            <CandidateChart
              candidates={candidates}
              displayTurn={displayTurn}
              rankMetric={rankMetric}
            />
          ) : (
            <TurnChart
              series={toRateSeries(current)}
              displayTurn={displayTurn}
            />
          )}
          <div className="engine-result__slider-row">
            <output className="engine-result__turn-label tabular-nums">
              {displayTurn}順目
            </output>
            <Slider
              className="engine-result__slider"
              label="巡目"
              min={1}
              max={CHART_TURNS}
              step={1}
              value={displayTurn}
              labeled
              onValueChange={onTurnChange}
            />
          </div>
        </div>
      ) : null}
      {is14 ? (
        <EngineCandidates
          candidates={candidates}
          displayTurn={displayTurn}
          selectedIndex={selectedIndex}
          onSelect={onSelect}
          rankMetric={rankMetric}
          onRankMetricChange={onRankMetricChange}
        />
      ) : current ? (
        <EngineSummary candidate={current} displayTurn={displayTurn} />
      ) : null}
    </div>
  );
}
