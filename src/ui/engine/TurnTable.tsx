import type React from 'react';
import type { CandidateStat } from '../../engine/types';
import { formatEv, formatPercent } from './chart-series';
import './engine.css';

export interface TurnTableProps {
  candidate: CandidateStat;
  displayTurn: number;
}

/** 巡目別の表(巡目・聴牌率・和了率・期待値)。表示巡目の行を強調する */
export function TurnTable({
  candidate,
  displayTurn
}: TurnTableProps): React.JSX.Element {
  return (
    <div className="turn-table__scroll">
      <table className="turn-table">
        <thead>
          <tr>
            <th scope="col">巡目</th>
            <th scope="col">聴牌率</th>
            <th scope="col">和了率</th>
            <th scope="col">期待値</th>
          </tr>
        </thead>
        <tbody>
          {candidate.perTurn.map(t => (
            <tr
              key={t.draw}
              className="turn-table__row"
              data-current={t.draw === displayTurn ? 'true' : undefined}
            >
              <th scope="row" className="tabular-nums">
                {t.draw}
              </th>
              <td className="tabular-nums">{formatPercent(t.tenpai)}</td>
              <td className="tabular-nums">{formatPercent(t.win)}</td>
              <td className="tabular-nums">{formatEv(t.ev)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
