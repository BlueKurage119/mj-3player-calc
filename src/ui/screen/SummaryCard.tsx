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
            <SymbolIcon d={CUSTOM_HONBA_STICK} size="2rem" />
            <span className="summary-card__count">{table.continue}</span>
          </span>
        </span>
        <span
          className="summary-card__pill"
          role="img"
          aria-label={`供託 ${table.deposit}`}
        >
          <span className="summary-card__pill-inner" aria-hidden="true">
            <SymbolIcon d={CUSTOM_DEPOSIT_STICK} size="2rem" />
            <span className="summary-card__count">{table.deposit}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

export interface SummaryRowsVisible {
  status: boolean;
  dora: boolean;
  hand: boolean;
}

export interface SummaryCardProps {
  rows: SummaryRowsVisible;
  sheetOpen: boolean;
}

export function SummaryCard(props: SummaryCardProps): React.JSX.Element {
  const { rows, sheetOpen } = props;
  const { input, table } = useAppState();

  const visible = rows.status || rows.dora || rows.hand;
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
        {rows.status ? <SummaryStatusRow table={table} /> : null}
        {rows.dora ? (
          <div className="summary-card__row" data-slot="summary-dora">
            <div className="summary-card__tiles">
              <span className="summary-card__label">ドラ</span>
              {input.dora.map((tile, idx) => (
                <Tile key={`d${tile.type}${tile.n}-${idx}`} tile={tile} />
              ))}
              {input.uradora.length > 0 ? (
                <span className="summary-card__label">裏</span>
              ) : null}
              {input.uradora.map((tile, idx) => (
                <Tile key={`u${tile.type}${tile.n}-${idx}`} tile={tile} />
              ))}
            </div>
          </div>
        ) : null}
        {rows.hand ? (
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
        ) : null}
        {sheetOpen ? (
          <div className="summary-card__result" data-slot="summary-result" />
        ) : null}
      </div>
    </aside>
  );
}
