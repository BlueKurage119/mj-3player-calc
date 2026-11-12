// 和了結果の本体部品
import type React from 'react';
import type { ScoredHora } from '../../../core/result';
import type { Rule } from '../../../core/rule';
import type { Table } from '../../../core/table';
import { HoraItem } from './HoraItem';
import './hora.css';

export interface ResultContext {
  table: Table;
  rule: Pick<Rule, 'roundedMangan' | 'accumlatedYakuman'>;
}

export interface HoraDetailProps {
  hora: ScoredHora[];
  context?: ResultContext | undefined;
}

export default function HoraDetail(props: HoraDetailProps): React.JSX.Element {
  const { hora, context } = props;

  return (
    <div className="hora-detail">
      {hora.map((h, index) => {
        const tile = h.horaTile;
        const key = `${tile.type}${tile.n}${
          tile.type !== 'z' && tile.n === 5 && tile.red ? 'r' : ''
        }-${h.by}-${index}`;
        return <HoraItem key={key} hora={h} context={context} />;
      })}
    </div>
  );
}
