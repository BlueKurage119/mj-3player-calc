import type React from 'react';
import type { Fu } from '../../../core/fu';
import type { HoraScore } from '../../../core/hora-score';
import type { Table } from '../../../core/table';
import { Disclosure } from '../../expressive';
import { Tile } from '../../tile';
import { baseFormula, formatBasePointText, formatFuSummary } from './format';
import { fuRows, sumRawFu } from './fu-rows';

export interface FuBreakdownProps {
  fu?: Fu[] | undefined;
  score: HoraScore;
  /** 切り上げ後の符(役満でも出す。core の score.fu は役満で null) */
  displayFu: number;
  horaType: 'mentsu' | 'chitoitsu' | 'kokushi' | 'shisanputa';
  table?: Table | undefined;
}

export function FuBreakdown(props: FuBreakdownProps): React.JSX.Element | null {
  const { fu = [], score, displayFu, horaType, table } = props;

  // 符の概念がない国士無双・十三不塔では出さない(役満でも、面子手・七対子では出す)
  if (horaType !== 'mentsu' && horaType !== 'chitoitsu') {
    return null;
  }

  const rawFu = sumRawFu(fu);
  const summaryText = formatFuSummary(rawFu, displayFu, horaType);
  const rows = fuRows(fu, table, horaType);
  const formula = baseFormula(score, displayFu);

  return (
    <div className="fu-breakdown">
      <Disclosure
        summary={
          <span className="fu-breakdown__summary">
            {summaryText}・{formatBasePointText(score.basePoint)}
          </span>
        }
      >
        <ul className="fu-breakdown__list">
          {rows.map((row, i) => (
            <li
              key={`${row.name}-${row.fu}-${i}`}
              className={
                row.muted
                  ? 'fu-breakdown__row fu-breakdown__row--muted'
                  : 'fu-breakdown__row'
              }
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
        <div className="fu-breakdown__formula tabular-nums">
          {formula.kind === 'formula' ? (
            <>
              基本点 = 符 × 2<sup>飜+2</sup> = {formula.fu} × 2
              <sup>{formula.han}+2</sup> = {formula.base}
            </>
          ) : (
            <>
              {formula.name} = {formula.base}
            </>
          )}
        </div>
      </Disclosure>
    </div>
  );
}
