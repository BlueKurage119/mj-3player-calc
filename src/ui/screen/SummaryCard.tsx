import type React from 'react';
import { useAppState } from '../state';
import { Tile } from '../tile';

export interface SummaryCardProps {
  visible: boolean;
  sheetOpen: boolean;
}

export function SummaryCard(props: SummaryCardProps): React.JSX.Element {
  const { visible, sheetOpen } = props;
  const { input } = useAppState();

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
