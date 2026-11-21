import type React from 'react';
import type { Tile as CoreTile } from '../../core/tile';
import type { CandidateStat } from '../../engine/types';
import { Disclosure } from '../expressive';
import { Slider } from '../md';
import { Tile, tileLabelOf } from '../tile';
import { TurnChart } from './TurnChart';
import { TurnTable } from './TurnTable';
import {
  CHART_TURNS,
  formatEv,
  formatPercent,
  rankCandidates,
  statAt,
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

/** 14枚入力: 打牌候補ごとの行(表示巡目の期待値の降順)。行タップで表示対象を切り替える */
export function EngineCandidates({
  candidates,
  displayTurn,
  selectedIndex,
  onSelect
}: Pick<
  EngineResultProps,
  'candidates' | 'displayTurn' | 'selectedIndex' | 'onSelect'
>): React.JSX.Element {
  const ranked = rankCandidates(candidates, displayTurn);
  const current = selectedIndex ?? ranked[0]?.index ?? 0;
  return (
    <ul className="engine-candidates">
      {ranked.map(({ index, candidate }) => {
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
                {discard ? <Tile tile={discard} /> : null}
              </span>
              <span className="engine-candidates__value tabular-nums">
                {formatPercent(s.win)}
              </span>
              <span className="engine-candidates__value tabular-nums">
                {formatEv(s.ev)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** 計算結果の表示(要約・候補行・グラフ・巡目別の表)。表示巡目の変更では再計算しない */
export function EngineResult(props: EngineResultProps): React.JSX.Element {
  const { candidates, displayTurn, onTurnChange, selectedIndex, onSelect } =
    props;
  const is14 = candidates.some(c => c.discard !== null);
  const ranked = rankCandidates(candidates, displayTurn);
  const current =
    (selectedIndex !== null ? candidates[selectedIndex] : undefined) ??
    ranked[0]?.candidate;
  return (
    <div className="engine-result">
      {current ? (
        <div className="engine-result__chart">
          <TurnChart series={toRateSeries(current)} displayTurn={displayTurn} />
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
      ) : null}
      {is14 ? (
        <EngineCandidates
          candidates={candidates}
          displayTurn={displayTurn}
          selectedIndex={selectedIndex}
          onSelect={onSelect}
        />
      ) : current ? (
        <EngineSummary candidate={current} displayTurn={displayTurn} />
      ) : null}
      {current ? (
        <Disclosure summary="巡目別の表">
          <TurnTable candidate={current} displayTurn={displayTurn} />
        </Disclosure>
      ) : null}
    </div>
  );
}
