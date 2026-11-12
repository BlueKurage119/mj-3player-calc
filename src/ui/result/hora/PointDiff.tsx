import type React from 'react';
import type { Payment } from '../../../core/payment';
import { Disclosure } from '../../expressive';
import { formatNumber } from '../hora-summary';
import { pointDiffRows } from './format';

export interface PointDiffProps {
  payment: Payment;
}

/** 点差(折りたたみ。既定は閉じる)。出典: livewing/mahjong-calc (src/components/PointDiff.tsx) を参考に三麻向けに作成 */
export function PointDiff({ payment }: PointDiffProps): React.JSX.Element {
  const rows = pointDiffRows(payment);
  return (
    <div className="point-diff">
      <Disclosure summary={<span className="point-diff__summary">点差</span>}>
        <ul className="point-diff__list">
          {rows.map(row => (
            <li key={row.label} className="point-diff__row">
              <span>{row.label}</span>
              <span className="tabular-nums">{formatNumber(row.points)}点</span>
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}
