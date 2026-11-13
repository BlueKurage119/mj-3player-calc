import React, { Suspense, lazy } from 'react';
import type { Discard, ScoredHora } from '../../core/result';
import type { Tile as CoreTile, TileAvailability } from '../../core/tile';
import { Tile } from '../tile';
import { horaGlanceParts } from './hora-summary';
import type { ResultContext } from './hora/HoraDetail';

const HoraDetail = lazy(() => import('./hora/HoraDetail'));
export const preloadHoraDetail = () => import('./hora/HoraDetail');

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
        if (onTileClick) {
          return (
            <Tile key={key} tile={tile} onClick={() => onTileClick(tile)} />
          );
        }
        return <Tile key={key} tile={tile} />;
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
  context?: ResultContext | undefined;
}

export function HoraBody({ hora, context }: HoraBodyProps): React.JSX.Element {
  return (
    <div data-result-kind="hora" className="result-body result-body--hora">
      {hora.length === 0 ? (
        <p className="result-body__text">和了牌なし</p>
      ) : (
        <Suspense fallback={null}>
          <HoraDetail hora={hora} context={context} />
        </Suspense>
      )}
    </div>
  );
}

export interface TempaiBodyProps {
  tileAvailabilities: TileAvailability[];
}

export function TempaiBody({
  tileAvailabilities
}: TempaiBodyProps): React.JSX.Element {
  const available = tileAvailabilities.filter(a => a.count > 0);
  return (
    <div data-result-kind="tempai" className="result-body result-body--tempai">
      {available.length === 0 ? (
        <p className="result-body__text">和了牌なし</p>
      ) : (
        <>
          <h2 className="result-body__title">聴牌</h2>
          <div className="result-body__tiles">
            {available.map((a, i) => {
              const t = a.tile;
              const key = `${t.type}${t.n}${
                t.type !== 'z' && t.n === 5 && t.red ? 'r' : ''
              }-${i}`;
              return (
                <span
                  key={key}
                  className="result-body__wait"
                  data-tile-count={a.count}
                >
                  <Tile tile={t} />
                  <span className="result-body__wait-count tabular-nums">
                    ×{a.count}
                  </span>
                </span>
              );
            })}
          </div>
        </>
      )}
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
  /** 13枚形(和了牌が未入力)のとき true。点数でなく待ち牌を出す */
  waitInput?: boolean;
}

export function HoraGlance({
  hora,
  waitInput = false
}: HoraGlanceProps): React.JSX.Element {
  if (waitInput && hora.length > 0) {
    const seen = new Set<string>();
    const waits: CoreTile[] = [];
    for (const h of hora) {
      const t = h.horaTile;
      const key = `${t.type}${t.n}${t.type !== 'z' && t.n === 5 && t.red ? 'r' : ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      waits.push(t);
    }
    return (
      <div
        data-result-kind="hora"
        className="result-glance result-glance--hora"
      >
        <span className="result-glance__label">聴牌 待ち</span>
        <GlanceTiles tiles={waits} />
      </div>
    );
  }

  if (hora.length === 0) {
    return (
      <div
        data-result-kind="hora"
        className="result-glance result-glance--hora"
      >
        <span className="result-glance__text">和了牌なし</span>
      </div>
    );
  }

  const parts = horaGlanceParts(hora);
  const hasAnyPoints = parts.some(p => p.kind === 'points');

  if (!hasAnyPoints) {
    return (
      <div
        data-result-kind="hora"
        className="result-glance result-glance--hora"
      >
        <span className="result-glance__text">役なし</span>
      </div>
    );
  }

  const validParts = parts.filter(p => p.kind !== 'none');

  return (
    <div data-result-kind="hora" className="result-glance result-glance--hora">
      {validParts.map((part, index) => {
        const label = part.by === 'ron' ? 'ロン' : 'ツモ';
        return (
          <React.Fragment key={part.by}>
            {index > 0 && <span className="result-glance__sep"> / </span>}
            <span className="result-glance__side" data-glance-by={part.by}>
              <span className="result-glance__side-label">{label}</span>{' '}
              {part.kind === 'points' ? (
                <span className="tabular-nums">{part.text}</span>
              ) : (
                <span>役なし</span>
              )}
            </span>
          </React.Fragment>
        );
      })}
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
