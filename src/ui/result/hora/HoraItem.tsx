// 出典: livewing/mahjong-calc (src/components/HoraItem.tsx) および mj-mighty-calc (src/ui/ResultPanel.tsx) を参考に作成
import type React from 'react';
import type { ScoredHora } from '../../../core/result';
import type { Table } from '../../../core/table';
import { Divider } from '../../md';
import { formatPoints, isNoYaku } from '../hora-summary';
import { FuBreakdown } from './FuBreakdown';
import {
  formatBasePointText,
  formatHonbaText,
  formatTotalText,
  limitName,
  yakuHanText,
  yakuLabel
} from './format';

export interface HoraItemProps {
  hora: ScoredHora;
  table?: Table | undefined;
}

export function HoraItem({ hora, table }: HoraItemProps): React.JSX.Element {
  const noYaku = isNoYaku(hora);
  const byLabel = hora.by === 'ron' ? 'ロン' : 'ツモ';

  if (noYaku) {
    return (
      <article className="hora-item" data-hora-by={hora.by} data-no-yaku="">
        <div className="hora-item__header">
          <div className="hora-item__header-top">
            <span className="hora-item__badge">{byLabel}</span>
            <span className="hora-item__no-yaku-text">役なし</span>
          </div>
        </div>
      </article>
    );
  }

  const { score } = hora;
  const limit = limitName(score);
  const showFuBreakdown =
    score.yakumanPoint === 0 &&
    (hora.type === 'mentsu' || hora.type === 'chitoitsu');

  const honbaText = formatHonbaText(score.payment);
  const totalText = formatTotalText(score.payment);
  const basePointText = formatBasePointText(score.basePoint);

  return (
    <article className="hora-item" data-hora-by={hora.by}>
      {/* 2.6.1 見出し行 */}
      <div className="hora-item__header">
        <div className="hora-item__header-top">
          <span className="hora-item__badge">{byLabel}</span>
          <span className="hora-item__points tabular-nums">
            {formatPoints(score.payment)}
          </span>
        </div>
        <div className="hora-item__header-sub">
          {score.yakumanPoint === 0 ? (
            <span>
              {score.han}飜{score.fu !== null ? ` ${score.fu}符` : ''}
            </span>
          ) : null}
          {limit ? (
            <span className="hora-item__limit-badge">{limit}</span>
          ) : null}
        </div>
      </div>

      <Divider />

      {/* 2.6.2 役一覧 */}
      <ul className="hora-item__yaku-list">
        {hora.yaku.map((y, i) => (
          <li key={`${y.name}-${i}`} className="hora-item__yaku-row">
            <span>{yakuLabel(y.name)}</span>
            <span className="hora-item__yaku-han tabular-nums">
              {yakuHanText(y)}
            </span>
          </li>
        ))}
      </ul>

      {/* 2.6.3 符の内訳 */}
      {showFuBreakdown ? (
        <>
          <Divider />
          <FuBreakdown
            fu={hora.type === 'mentsu' ? hora.fu : undefined}
            score={score}
            horaType={hora.type}
            table={table}
          />
        </>
      ) : null}

      <Divider />

      {/* 2.6.4 点数と支払いの内訳 */}
      <div className="hora-item__payment-section">
        {honbaText ? (
          <div className="hora-item__payment-row">{honbaText}</div>
        ) : null}
        {totalText ? (
          <div className="hora-item__payment-row">{totalText}</div>
        ) : null}
        <div className="hora-item__payment-row">{basePointText}</div>
      </div>
    </article>
  );
}
