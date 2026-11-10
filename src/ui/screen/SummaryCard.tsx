import type React from 'react';
import type { Table } from '../../core/table';
import { CUSTOM_DEPOSIT_STICK, CUSTOM_HONBA_STICK, SymbolIcon } from '../icons';
import { formatWinds, useAppState } from '../state';
import { Tile } from '../tile';

export interface SummaryStatusRowProps {
  table: Table;
}

export function SummaryStatusRow({
  table
}: SummaryStatusRowProps): React.JSX.Element {
  return (
    <div
      className="summary-card__row summary-card__status"
      data-slot="summary-status"
    >
      <span className="summary-card__winds">{formatWinds(table)}</span>
      <div className="summary-card__counters">
        <span
          className="summary-card__pill"
          role="img"
          aria-label={`積み棒 ${table.continue}`}
        >
          <span className="summary-card__pill-inner" aria-hidden="true">
            <SymbolIcon d={CUSTOM_HONBA_STICK} size="1rem" />
            <span className="summary-card__count">{table.continue}</span>
          </span>
        </span>
        <span
          className="summary-card__pill"
          role="img"
          aria-label={`供託 ${table.deposit}`}
        >
          <span className="summary-card__pill-inner" aria-hidden="true">
            <SymbolIcon d={CUSTOM_DEPOSIT_STICK} size="1rem" />
            <span className="summary-card__count">{table.deposit}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

export interface SummaryCardProps {
  visible: boolean;
  sheetOpen: boolean;
}

export function SummaryCard(props: SummaryCardProps): React.JSX.Element {
  const { visible, sheetOpen } = props;
  const { input, table } = useAppState();

  const className = visible
    ? 'summary-card summary-card--visible'
    : 'summary-card';

  return (
    <aside
      aria-label="要約"
      aria-hidden={!visible}
      data-visible={visible ? 'true' : 'false'}
      className={className}
    >
      <div className="summary-card__inner">
        <SummaryStatusRow table={table} />
        <div className="summary-card__row" data-slot="summary-input">
          <div className="summary-card__tiles">
            {input.hand.map((tile, idx) => {
              const key = `${tile.type}${tile.n}${
                tile.type !== 'z' && tile.n === 5 && tile.red ? 'r' : ''
              }-${idx}`;
              return <Tile key={key} tile={tile} />;
            })}
          </div>
        </div>
        {sheetOpen ? (
          <div className="summary-card__result" data-slot="summary-result" />
        ) : null}
      </div>
    </aside>
  );
}
