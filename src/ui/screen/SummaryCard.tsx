import { useRef } from 'react';
import type React from 'react';
import type { Table } from '../../core/table';
import type { Tile as TileType } from '../../core/tile';
import { CUSTOM_DEPOSIT_STICK, CUSTOM_HONBA_STICK, SymbolIcon } from '../icons';
import {
  formatWinds,
  isNukiEnabled,
  splitWinningTile,
  maxHandLength,
  useAppState
} from '../state';
import { Tile } from '../tile';
import { meldTiles } from './MeldArea';
import { useFitTiles } from './use-fit-tiles';

export interface SummaryStatusRowProps {
  table: Table;
  /** 抜き北の枚数。undefined のとき(抜き北なしのルール)は表示しない */
  nuki?: number | undefined;
  /** false のとき積み棒・供託のピルを出さない(既定 true) */
  showCounters?: boolean | undefined;
}

export function SummaryStatusRow({
  table,
  nuki,
  showCounters = true
}: SummaryStatusRowProps): React.JSX.Element {
  return (
    <div
      className="summary-card__row summary-card__status"
      data-slot="summary-status"
    >
      <span className="summary-card__winds">{formatWinds(table)}</span>
      <div className="summary-card__counters">
        {showCounters ? (
          <>
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
          </>
        ) : null}
        {nuki === undefined ? null : (
          <span
            className="summary-card__pill"
            role="img"
            aria-label={`抜き北 ${nuki}`}
          >
            <span className="summary-card__pill-inner" aria-hidden="true">
              <span className="summary-card__count">北 {nuki}</span>
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export interface SummaryDoraRowViewProps {
  dora: readonly TileType[];
  /** undefined のとき、裏ドラの列は出さない */
  uradora?: readonly TileType[] | undefined;
  rowRef?: React.Ref<HTMLDivElement> | undefined;
}

/** ドラ(と裏ドラ)の行の描画本体 */
export function SummaryDoraRowView({
  dora,
  uradora,
  rowRef
}: SummaryDoraRowViewProps): React.JSX.Element {
  return (
    <div
      ref={rowRef}
      className="summary-card__row summary-card__dora"
      data-slot="summary-dora"
    >
      <div className="summary-card__tiles">
        <span className="summary-card__label">ドラ</span>
        {dora.map((tile, idx) => (
          <Tile key={`d${tile.type}${tile.n}-${idx}`} tile={tile} />
        ))}
      </div>
      {uradora ? (
        <div className="summary-card__tiles">
          <span className="summary-card__label">裏</span>
          {uradora.map((tile, idx) => (
            <Tile key={`u${tile.type}${tile.n}-${idx}`} tile={tile} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SummaryDoraRow(): React.JSX.Element {
  const { input } = useAppState();
  const ref = useRef<HTMLDivElement | null>(null);
  useFitTiles(ref);

  return (
    <SummaryDoraRowView
      rowRef={ref}
      dora={input.dora}
      uradora={input.uradora}
    />
  );
}

function SummaryHandRow(): React.JSX.Element {
  const { input, rule } = useAppState();
  const ref = useRef<HTMLDivElement | null>(null);
  const max = maxHandLength(input.melds);
  const { body, winning } = splitWinningTile(input.hand, max);
  useFitTiles(ref);

  return (
    <div className="summary-card__row" data-slot="summary-input">
      <div ref={ref} className="summary-card__tiles">
        {body.map(item => (
          <Tile key={`h${item.index}`} tile={item.tile} />
        ))}
        {input.melds.map((meld, mi) => (
          <span key={`m${mi}`} className="summary-card__meld">
            {meldTiles(meld, rule.red).map((t, ti) => (
              <Tile key={ti} tile={t} />
            ))}
          </span>
        ))}
        {winning ? (
          <span className="summary-card__winning-tile">
            <Tile tile={winning.tile} />
          </span>
        ) : null}
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
  /** 要約カード本体の要素(覆う高さの計測用) */
  innerRef?: React.Ref<HTMLDivElement>;
}

export function SummaryCard(props: SummaryCardProps): React.JSX.Element {
  const { rows, innerRef } = props;
  const { input, table, rule } = useAppState();

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
      <div ref={innerRef} className="summary-card__inner">
        {rows.status ? (
          <SummaryStatusRow
            table={table}
            nuki={isNukiEnabled(rule) ? input.nuki : undefined}
          />
        ) : null}
        {rows.dora ? <SummaryDoraRow /> : null}
        {rows.hand ? <SummaryHandRow /> : null}
      </div>
    </aside>
  );
}
