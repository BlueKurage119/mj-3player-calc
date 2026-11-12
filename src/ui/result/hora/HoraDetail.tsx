// 和了結果の本体部品
import type React from 'react';
import type { ScoredHora } from '../../../core/result';
import type { Table } from '../../../core/table';
import type { Tile as CoreTile } from '../../../core/tile';
import { Tile } from '../../tile';
import { HoraItem } from './HoraItem';
import './hora.css';

export interface ResultContext {
  table: Table;
}

export interface HoraDetailProps {
  hora: ScoredHora[];
  context?: ResultContext | undefined;
}

const tileKey = (tile: CoreTile): string =>
  `${tile.type}${tile.n}${tile.type !== 'z' && tile.n === 5 && tile.red ? 'r' : ''}`;

interface TileHoraGroup {
  tile: CoreTile;
  horas: ScoredHora[];
}

export default function HoraDetail(props: HoraDetailProps): React.JSX.Element {
  const { hora, context } = props;

  // 和了牌(赤を区別)で出現順にグループ化
  const groups: TileHoraGroup[] = [];
  for (const h of hora) {
    const k = tileKey(h.horaTile);
    const existing = groups.find(g => tileKey(g.tile) === k);
    if (existing) {
      existing.horas.push(h);
    } else {
      groups.push({ tile: h.horaTile, horas: [h] });
    }
  }

  // 各グループ内で ロン → ツモ の順に整列
  for (const g of groups) {
    g.horas.sort((a, b) =>
      a.by === 'ron' && b.by === 'tsumo'
        ? -1
        : a.by === 'tsumo' && b.by === 'ron'
          ? 1
          : 0
    );
  }

  return (
    <div className="hora-detail">
      {groups.map(group => {
        const key = tileKey(group.tile);
        return (
          <section key={key} className="hora-group" aria-label="和了候補">
            <div className="hora-group__tile">
              <Tile tile={group.tile} />
            </div>
            <div className="hora-group__items">
              {group.horas.map(h => (
                <HoraItem
                  key={`${key}-${h.by}`}
                  hora={h}
                  table={context?.table}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
