import type React from 'react';
import type { Discard, ScoredHora } from '../../core/result';
import type { Tile as CoreTile, TileAvailability } from '../../core/tile';
import { Tile } from '../tile';

export interface GlanceTilesProps {
  tiles: CoreTile[];
  onTileClick?: ((tile: CoreTile) => void) | undefined;
}

export function GlanceTiles({
  tiles,
  onTileClick
}: GlanceTilesProps): React.JSX.Element {
  return (
    <div className="glance-tiles">
      {tiles.map((tile, i) => {
        const key = `${tile.type}${tile.n}${
          tile.type !== 'z' && tile.n === 5 && tile.red ? 'r' : ''
        }-${i}`;
        return (
          <Tile
            key={key}
            tile={tile}
            onClick={onTileClick ? () => onTileClick(tile) : undefined}
          />
        );
      })}
    </div>
  );
}

/* ================= 本体部品 (ResultBody) ================= */

export function JustHoraBody(): React.JSX.Element {
  return (
    <div
      data-result-kind="just-hora"
      className="result-body result-body--just-hora"
    >
      <p className="result-body__text">
        和了です。牌をすべて入力して点数を計算します。
      </p>
    </div>
  );
}

export interface HoraBodyProps {
  hora: ScoredHora[];
}

export function HoraBody({ hora }: HoraBodyProps): React.JSX.Element {
  return (
    <div data-result-kind="hora" className="result-body result-body--hora">
      <h2 className="result-body__title">和了</h2>
      <div className="result-body__hora-list">
        {hora.map((h, i) => {
          const t = h.horaTile;
          const key = `${t.type}${t.n}${
            t.type !== 'z' && t.n === 5 && t.red ? 'r' : ''
          }-${i}`;
          return (
            <div key={key} className="result-body__hora-item">
              <Tile tile={t} />
              <span>{h.options.tsumo ? 'ツモ' : 'ロン'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface TempaiBodyProps {
  tileAvailabilities: TileAvailability[];
}

export function TempaiBody({
  tileAvailabilities
}: TempaiBodyProps): React.JSX.Element {
  return (
    <div data-result-kind="tempai" className="result-body result-body--tempai">
      <h2 className="result-body__title">聴牌</h2>
      <div className="result-body__tiles">
        {tileAvailabilities.map((a, i) => {
          const t = a.tile;
          const key = `${t.type}${t.n}${
            t.type !== 'z' && t.n === 5 && t.red ? 'r' : ''
          }-${i}`;
          return <Tile key={key} tile={t} />;
        })}
      </div>
    </div>
  );
}

export interface ShantenBodyProps {
  shanten: number;
  tileAvailabilities: TileAvailability[];
}

export function ShantenBody({
  shanten,
  tileAvailabilities
}: ShantenBodyProps): React.JSX.Element {
  return (
    <div
      data-result-kind="shanten"
      className="result-body result-body--shanten"
    >
      <h2 className="result-body__title">{shanten}向聴</h2>
      <div className="result-body__tiles">
        {tileAvailabilities.map((a, i) => {
          const t = a.tile;
          const key = `${t.type}${t.n}${
            t.type !== 'z' && t.n === 5 && t.red ? 'r' : ''
          }-${i}`;
          return <Tile key={key} tile={t} />;
        })}
      </div>
    </div>
  );
}

export interface DiscardBodyProps {
  discards: Discard[];
}

export function DiscardBody({
  discards: _discards
}: DiscardBodyProps): React.JSX.Element {
  return (
    <div
      data-result-kind="discard"
      className="result-body result-body--discard"
    >
      <h2 className="result-body__title">何切る</h2>
    </div>
  );
}

/* ================= バナー部品 (ResultGlance) ================= */

export function JustHoraGlance(): React.JSX.Element {
  return (
    <div
      data-result-kind="just-hora"
      className="result-glance result-glance--just-hora"
    >
      <span className="result-glance__text">
        和了です。牌をすべて入力して点数を計算します。
      </span>
    </div>
  );
}

export interface HoraGlanceProps {
  hora: ScoredHora[];
}

export function HoraGlance({ hora }: HoraGlanceProps): React.JSX.Element {
  const tiles = hora.map(h => h.horaTile);
  return (
    <div data-result-kind="hora" className="result-glance result-glance--hora">
      <span className="result-glance__label">和了</span>
      <GlanceTiles tiles={tiles} />
    </div>
  );
}

export interface TempaiGlanceProps {
  tileAvailabilities: TileAvailability[];
}

export function TempaiGlance({
  tileAvailabilities
}: TempaiGlanceProps): React.JSX.Element {
  const available = tileAvailabilities.filter(a => a.count > 0);
  return (
    <div
      data-result-kind="tempai"
      className="result-glance result-glance--tempai"
    >
      {available.length > 0 ? (
        <>
          <span className="result-glance__label">聴牌 待ち</span>
          <GlanceTiles tiles={available.map(a => a.tile)} />
        </>
      ) : (
        <span className="result-glance__text">和了牌なし</span>
      )}
    </div>
  );
}

export interface ShantenGlanceProps {
  shanten: number;
  tileAvailabilities: TileAvailability[];
}

export function ShantenGlance({
  shanten,
  tileAvailabilities
}: ShantenGlanceProps): React.JSX.Element {
  const tiles = tileAvailabilities.map(a => a.tile);
  return (
    <div
      data-result-kind="shanten"
      className="result-glance result-glance--shanten"
    >
      <span className="result-glance__label">{shanten}向聴 受け入れ</span>
      <GlanceTiles tiles={tiles} />
    </div>
  );
}

export interface DiscardGlanceProps {
  discards: Discard[];
}

export function DiscardGlance({
  discards: _discards
}: DiscardGlanceProps): React.JSX.Element {
  return (
    <div
      data-result-kind="discard"
      className="result-glance result-glance--discard"
    >
      <span className="result-glance__label">何切る</span>
    </div>
  );
}
