import type React from 'react';
import type { Fu } from '../../../core/fu';
import type { HoraScore } from '../../../core/hora-score';
import type { Table } from '../../../core/table';
import type { Tile as CoreTile } from '../../../core/tile';
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
  /** 和了牌(待ちのブロックの和了牌の背景に色を付ける) */
  horaTile?: CoreTile | undefined;
  /** 基本点を出さない(役なしのカード) */
  omitBasePoint?: boolean | undefined;
}

export function FuBreakdown(props: FuBreakdownProps): React.JSX.Element | null {
  const {
    fu = [],
    score,
    displayFu,
    horaType,
    table,
    horaTile,
    omitBasePoint = false
  } = props;

  // 符の概念がない国士無双・十三不塔では出さない(役満でも、面子手・七対子では出す)
  if (horaType !== 'mentsu' && horaType !== 'chitoitsu') {
    return null;
  }

  const rawFu = sumRawFu(fu);
  const summaryText = formatFuSummary(rawFu, displayFu, horaType);
  const rows = fuRows(fu, table, horaType, horaTile);
  const formula = baseFormula(score, displayFu);
  // 牌の行が1つもないとき(七対子)は、牌の列を詰めて名称を左端に寄せる
  const hasTiles = rows.some(r => (r.tiles?.length ?? 0) > 0);

  return (
    <div className="fu-breakdown">
      <Disclosure
        summary={
          <span className="fu-breakdown__summary">
            {omitBasePoint
              ? summaryText
              : `${summaryText}・${formatBasePointText(score.basePoint)}`}
          </span>
        }
      >
        <ul
          className={
            hasTiles
              ? 'fu-breakdown__list'
              : 'fu-breakdown__list fu-breakdown__list--no-tiles'
          }
        >
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
                  return ti === row.winTileIndex ? (
                    <span key={tileKey} className="fu-breakdown__win-tile">
                      <Tile tile={t} />
                    </span>
                  ) : (
                    <Tile key={tileKey} tile={t} />
                  );
                })}
              </span>
              <span className="fu-breakdown__name">{row.name}</span>
              <span className="fu-breakdown__fu tabular-nums">{row.fu}符</span>
            </li>
          ))}
        </ul>
        {omitBasePoint ? null : (
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
        )}
      </Disclosure>
    </div>
  );
}
