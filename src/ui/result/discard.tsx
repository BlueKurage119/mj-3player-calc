import type React from 'react';
import type { Discard } from '../../core/result';
import type { Tile as CoreTile } from '../../core/tile';
import { Tile } from '../tile';
import {
  type DiscardRange,
  discardHeading,
  discardNextKind,
  discardRange,
  discardWaits,
  formatDiscardRange,
  sortDiscards
} from './discard-summary';
import { GlanceTiles, summarizeAcceptance } from './slots';

const tileKey = (t: CoreTile): string =>
  `${t.type}${t.n}${t.type !== 'z' && t.n === 5 && t.red ? 'r' : ''}`;

function ShantenDiscardDetail({
  discard
}: {
  discard: Discard;
}): React.JSX.Element | null {
  if (
    discard.next.type !== 'hora-shanten' ||
    discard.next.info.type !== 'shanten'
  ) {
    return null;
  }
  const { available, kinds, total } = summarizeAcceptance(
    discard.next.info.tileAvailabilities
  );
  return (
    <>
      <div className="discard-item__head">
        <span className="discard-item__label">受け入れ</span>
        <span
          className="result-body__summary tabular-nums"
          data-kinds={kinds}
          data-total={total}
        >
          {kinds}種 {total}枚
        </span>
      </div>
      {available.length > 0 && (
        <div className="result-body__tiles">
          {available.map((a, i) => (
            <Tile key={`${tileKey(a.tile)}-${i}`} tile={a.tile} />
          ))}
        </div>
      )}
    </>
  );
}

function TempaiDiscardDetail({
  discard
}: {
  discard: Discard;
}): React.JSX.Element {
  const waits = discardWaits(discard);
  const range: DiscardRange =
    discard.next.type === 'hora-shanten' && discard.next.info.type === 'hora'
      ? discardRange(discard.next.info.hora)
      : { kind: 'none' };
  const rangeText = formatDiscardRange(range);

  const empty = range.kind === 'none' && waits.length === 0;

  return (
    <>
      <div className="discard-item__head">
        <span className="discard-item__label">待ち</span>
        {rangeText !== null && (
          <span
            className="discard-item__range tabular-nums"
            data-range-kind={range.kind}
          >
            {rangeText}
          </span>
        )}
      </div>
      {empty ? (
        <span className="result-body__text">和了牌なし</span>
      ) : (
        <GlanceTiles tiles={waits} />
      )}
    </>
  );
}

export interface DiscardItemProps {
  discard: Discard;
}

export function DiscardItem({ discard }: DiscardItemProps): React.JSX.Element {
  const nextKind = discardNextKind(discard);
  return (
    <li className="discard-item" data-discard-next={nextKind}>
      <span className="discard-item__tile">
        <span className="discard-item__label">打</span>
        <Tile tile={discard.tile} />
      </span>
      <div className="discard-item__detail">
        {nextKind === 'shanten' ? (
          <ShantenDiscardDetail discard={discard} />
        ) : (
          <TempaiDiscardDetail discard={discard} />
        )}
      </div>
    </li>
  );
}

export interface DiscardBodyProps {
  discards: Discard[];
}

export function DiscardBody({ discards }: DiscardBodyProps): React.JSX.Element {
  if (discards.length === 0) {
    return (
      <div
        data-result-kind="discard"
        className="result-body result-body--discard"
      />
    );
  }
  const sorted = sortDiscards(discards);
  const heading = discardHeading(sorted);
  return (
    <div
      data-result-kind="discard"
      className="result-body result-body--discard"
    >
      <h2 className="result-body__title">{heading}</h2>
      <ul className="discard-list">
        {sorted.map((d, i) => (
          <DiscardItem key={`${tileKey(d.tile)}-${i}`} discard={d} />
        ))}
      </ul>
    </div>
  );
}

export interface DiscardGlanceProps {
  discards: Discard[];
}

export function DiscardGlance({
  discards
}: DiscardGlanceProps): React.JSX.Element {
  if (discards.length === 0) {
    return (
      <div
        data-result-kind="discard"
        className="result-glance result-glance--discard"
      />
    );
  }
  const sorted = sortDiscards(discards);
  const heading = discardHeading(sorted);
  const first = sorted[0];
  const nextKind = first ? discardNextKind(first) : undefined;
  return (
    <div
      data-result-kind="discard"
      data-discard-next={nextKind}
      className="result-glance result-glance--discard"
    >
      <span className="result-glance__badge">{heading}</span>
      <GlanceTiles tiles={sorted.map(d => d.tile)} />
    </div>
  );
}
