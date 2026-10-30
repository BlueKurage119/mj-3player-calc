import type { Rule } from './rule';
import type { Tile } from './tile';

export interface Pon {
  type: 'pon';
  tile: Tile | null;
}

export interface Kan {
  type: 'kan';
  tile: Tile | null;
  closed: boolean;
}

export type Meld = Pon | Kan;

export interface Input {
  hand: Tile[];
  melds: Meld[];
  dora: Tile[];
  /** 抜き北の枚数(0〜4の整数)。副露ではない。手牌の枚数に数えない */
  nuki: number;
}

export const instantiateMeld = (meld: Meld, red: Rule['red']): Tile[] => {
  const { type, tile } = meld;
  if (tile === null) return [];

  switch (type) {
    case 'pon':
      if (tile.type !== 'z' && tile.n === 5) {
        const r = red[tile.type];
        return [
          ...[
            ...Array(tile.red ? Math.max(0, 4 - r - 1) : Math.min(3, 4 - r))
          ].map(() => ({ ...tile, red: false })),
          ...[...Array(tile.red ? Math.min(3, r) : Math.max(0, r - 1))].map(
            () => ({ ...tile, red: true })
          )
        ];
      }
      return [...Array(3)].map(() => tile);
    case 'kan':
      if (tile.type !== 'z' && tile.n === 5) {
        const r = red[tile.type];
        return [
          ...[...Array(4 - r)].map(() => ({ ...tile, red: false })),
          ...[...Array(r)].map(() => ({ ...tile, red: true }))
        ];
      }
      return [...Array(4)].map(() => tile);
  }
};

export type InputFocus =
  | { type: 'hand' }
  | { type: 'dora' }
  | { type: 'meld'; i: number };

export interface HandOptions {
  riichi:
    | 'none'
    | 'riichi'
    | 'double-riichi'
    | 'open-riichi'
    | 'open-double-riichi';
  ippatsu: boolean;
  rinshan: boolean;
  chankan: boolean;
  haitei: boolean;
  tenho: boolean;
  /** 燕返し: 他家の立直宣言牌でロン(ローカル役) */
  tsubameGaeshi: boolean;
  /** 槓振り: 他家の槓・北抜き直後の打牌でロン(ローカル役) */
  kanFuri: boolean;
}
