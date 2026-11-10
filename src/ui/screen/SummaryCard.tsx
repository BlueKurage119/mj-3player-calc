import { useLayoutEffect, useRef } from 'react';
import type React from 'react';
import type { Table } from '../../core/table';
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

export interface SummaryStatusRowProps {
  table: Table;
  /** 抜き北の枚数。undefined のとき(抜き北なしのルール)は表示しない */
  nuki?: number | undefined;
}

export function SummaryStatusRow({
  table,
  nuki
}: SummaryStatusRowProps): React.JSX.Element {
  return (
    <div
      className="summary-card__row summary-card__status"
      data-slot="summary-status"
    >
      <span className="summary-card__winds">{formatWinds(table)}</span>
      <div className="summary-card__counters">
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

const MIN_TILE_WIDTH_PX = 10;

/** 行が収まらないとき、牌の幅を行全体で一様に縮める(収まるなら既定の大きさ) */
function fitTileRow(el: HTMLElement): void {
  el.style.removeProperty('--tile-width');
  const tile = el.querySelector('.tile');
  if (!tile || el.clientWidth === 0) return;
  let width = tile.getBoundingClientRect().width;
  for (let i = 0; i < 4 && el.scrollWidth > el.clientWidth; i++) {
    width = Math.max(
      MIN_TILE_WIDTH_PX,
      (width * el.clientWidth) / el.scrollWidth - 0.5
    );
    el.style.setProperty('--tile-width', `${width}px`);
    if (width === MIN_TILE_WIDTH_PX) break;
  }
}

function SummaryHandRow(): React.JSX.Element {
  const { input, rule } = useAppState();
  const ref = useRef<HTMLDivElement | null>(null);
  const max = maxHandLength(input.melds);
  const { body, winning } = splitWinningTile(input.hand, max);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 牌が変わるたびに収まりを測り直す
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    fitTileRow(el);
    if (typeof ResizeObserver === 'undefined') return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        fitTileRow(el);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [input.hand, input.melds, rule.red]);

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
}

export function SummaryCard(props: SummaryCardProps): React.JSX.Element {
  const { rows } = props;
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
      <div className="summary-card__inner">
        {rows.status ? (
          <SummaryStatusRow
            table={table}
            nuki={isNukiEnabled(rule) ? input.nuki : undefined}
          />
        ) : null}
        {rows.dora ? (
          <div className="summary-card__row" data-slot="summary-dora">
            <div className="summary-card__tiles">
              <span className="summary-card__label">ドラ</span>
              {input.dora.map((tile, idx) => (
                <Tile key={`d${tile.type}${tile.n}-${idx}`} tile={tile} />
              ))}
            </div>
            {input.uradora.length > 0 ? (
              <div className="summary-card__tiles">
                <span className="summary-card__label">裏</span>
                {input.uradora.map((tile, idx) => (
                  <Tile key={`u${tile.type}${tile.n}-${idx}`} tile={tile} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {rows.hand ? <SummaryHandRow /> : null}
      </div>
    </aside>
  );
}
