import type React from 'react';
import type { Fu } from '../../../core/fu';
import type { HoraScore } from '../../../core/hora-score';
import type { Table } from '../../../core/table';
import { Disclosure } from '../../expressive';
import { Tile } from '../../tile';
import { formatBasePointText, formatFuSummary } from './format';
import { fuRows, sumRawFu } from './fu-rows';

export interface FuBreakdownProps {
  fu?: Fu[] | undefined;
  score: HoraScore;
  horaType: 'mentsu' | 'chitoitsu' | 'kokushi' | 'shisanputa';
  table?: Table | undefined;
}

export function FuBreakdown(props: FuBreakdownProps): React.JSX.Element | null {
  const { fu = [], score, horaType, table } = props;

  // 役満、国士無双、十三不搭では出さない
  if (
    score.yakumanPoint > 0 ||
    (horaType !== 'mentsu' && horaType !== 'chitoitsu')
  ) {
    return null;
  }

  const rawFu = sumRawFu(fu);
  const summaryText = formatFuSummary(rawFu, score.fu, horaType);
  const rows = fuRows(fu, table, horaType);

  return (
    <div className="fu-breakdown">
      <Disclosure
        summary={
          <span className="fu-breakdown__summary">
            <span>{summaryText}</span>
            <span className="fu-breakdown__summary-base tabular-nums">
              {formatBasePointText(score.basePoint)}
            </span>
          </span>
        }
      >
        <ul className="fu-breakdown__list">
          {rows.map((row, i) => (
            <li
              key={`${row.name}-${row.fu}-${i}`}
              className="fu-breakdown__row"
            >
              <span className="fu-breakdown__tiles">
                {row.tiles?.map((t, ti) => {
                  const tileKey =
                    t.type === 'back'
                      ? `back-${ti}`
                      : `${t.type}${t.n}${t.type !== 'z' && t.n === 5 && t.red ? 'r' : ''}-${ti}`;
                  return <Tile key={tileKey} tile={t} />;
                })}
              </span>
              <span className="fu-breakdown__name">{row.name}</span>
              <span className="fu-breakdown__fu tabular-nums">{row.fu}符</span>
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}
