import type { JSX } from 'react';
import type { TileOrBack } from '../../core/tile';
import { tileImageOf, tileLabelOf } from './tile-image';
import './tile.css';

export interface TileProps {
  tile: TileOrBack;
  selected?: boolean; // 指定時のみ aria-pressed を出す(トグル状態を持つ牌用)。未指定は選択なし
  onClick?: () => void; // 指定時のみ button として振る舞う
  'aria-label'?: string; // 既定は牌名
}

export function Tile(props: TileProps): JSX.Element {
  const { tile, selected, onClick, 'aria-label': customLabel } = props;
  const label = customLabel ?? tileLabelOf(tile);
  const { base, face } = tileImageOf(tile);

  const className = selected === true ? 'tile tile--selected' : 'tile';

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
