import type { JSX } from 'react';
import type { TileOrBack } from '../../core/tile';
import { tileImageOf, tileLabelOf } from './tile-image';
import './tile.css';

export interface TileProps {
  tile: TileOrBack;
  selected?: boolean; // 既定 false
  onClick?: () => void; // 指定時のみ button として振る舞う
  'aria-label'?: string; // 既定は牌名
}

export function Tile(props: TileProps): JSX.Element {
  const { tile, selected = false, onClick, 'aria-label': customLabel } = props;
  const label = customLabel ?? tileLabelOf(tile);
  const { base, face } = tileImageOf(tile);

  const className = selected ? 'tile tile--selected' : 'tile';

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-label={label}
        aria-pressed={selected}
      >
        <img src={base} alt="" className="tile__base" />
        {face && <img src={face} alt="" className="tile__face" />}
      </button>
    );
  }

  return (
    <span role="img" className={className} aria-label={label}>
      <img src={base} alt="" className="tile__base" />
      {face && <img src={face} alt="" className="tile__face" />}
    </span>
  );
}
