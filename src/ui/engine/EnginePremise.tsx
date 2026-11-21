import type React from 'react';
import type { Tile as CoreTile } from '../../core/tile';
import type { Wind } from '../../core/table';
import { Tile, tileLabelOf } from '../tile';
import './engine.css';

export interface EnginePremiseProps {
  /** ドラ表示牌 */
  dora: CoreTile[];
  /** 抜き北の枚数 */
  nuki: number;
  round: Wind;
  seat: Wind;
}

const WIND_TILES: Record<Wind, CoreTile> = {
  east: { type: 'z', n: 1 },
  south: { type: 'z', n: 2 },
  west: { type: 'z', n: 3 }
};

const NORTH: CoreTile = { type: 'z', n: 4 };

/**
 * 計算の前提を牌で小さく示す(ドラ表示牌・抜き北・場風と自風)。説明ラベルは付けない。
 * 入力が空の項目は出さない。裏ドラは牌が決まらないので出さない
 */
export function EnginePremise(props: EnginePremiseProps): React.JSX.Element {
  const { dora, nuki, round, seat } = props;
  return (
    <section className="engine-premise" aria-label="計算の前提">
      <fieldset
        className="engine-premise__group"
        data-premise="winds"
        aria-label={`場風 ${tileLabelOf(WIND_TILES[round])}、自風 ${tileLabelOf(WIND_TILES[seat])}`}
      >
        <Tile tile={WIND_TILES[round]} />
        <Tile tile={WIND_TILES[seat]} />
      </fieldset>
      {dora.length > 0 ? (
        <fieldset
          className="engine-premise__group"
          data-premise="dora"
          aria-label="ドラ表示牌"
        >
          {dora.map((t, i) => (
            <Tile key={`${t.type}${t.n}-${i}`} tile={t} />
          ))}
        </fieldset>
      ) : null}
      {nuki > 0 ? (
        <fieldset
          className="engine-premise__group"
          data-premise="nuki"
          aria-label={`抜き北 ${nuki}枚`}
        >
          <Tile tile={NORTH} />
          <span className="engine-premise__count tabular-nums">×{nuki}</span>
        </fieldset>
      ) : null}
    </section>
  );
}
