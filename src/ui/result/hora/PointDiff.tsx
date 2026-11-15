import type React from 'react';
import type { Payment } from '../../../core/payment';
import type { ScoredHora } from '../../../core/result';
import { Disclosure } from '../../expressive';
import { formatNumber } from '../hora-summary';
import type { ResultContext } from './HoraDetail';
import { ShareControls } from './ShareControls';
import { pointDiffRows } from './format';

export interface PointDiffProps {
  payment: Payment;
  hora?: ScoredHora | undefined;
  context?: ResultContext | undefined;
}

/** 点差(折りたたみ。既定は閉じる)。出典: livewing/mahjong-calc (src/components/PointDiff.tsx) を参考に三麻向けに作成 */
export function PointDiff({
  payment,
  hora,
  context
}: PointDiffProps): React.JSX.Element {
  const rows = pointDiffRows(payment);
  const shareContext =
    hora !== undefined && context?.share !== undefined
      ? { ...context, share: context.share }
      : undefined;

  return (
    <div className="point-diff">
      <Disclosure
        className="point-diff__toggle"
        summary={<span className="point-diff__summary">点差</span>}
      >
        <ul className="point-diff__list">
          {rows.map(row => (
            <li key={row.label} className="point-diff__row">
              <span>{row.label}</span>
              <span className="tabular-nums">{formatNumber(row.points)}点</span>
            </li>
          ))}
        </ul>
      </Disclosure>
      {shareContext !== undefined && hora !== undefined ? (
        <ShareControls hora={hora} context={shareContext} />
      ) : null}
    </div>
  );
}
