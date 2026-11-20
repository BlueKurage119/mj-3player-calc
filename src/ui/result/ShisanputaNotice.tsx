import type React from 'react';
import type { TileAvailability } from '../../core/tile';
import { SYMBOL_CHEVRON_RIGHT, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';
import { renderWaitTiles, summarizeAcceptance } from './slots';
import './result.css';

export interface ShisanputaFormedBannerProps {
  onEnableTenho?: (() => void) | undefined;
}

export interface ShisanputaChanceCardProps {
  tileAvailabilities: TileAvailability[];
}

export function ShisanputaChanceCard({
  tileAvailabilities
}: ShisanputaChanceCardProps): React.JSX.Element {
  const { available, kinds, total } = summarizeAcceptance(tileAvailabilities);
  return (
    <div
      className="shisanputa-notice result-body"
      data-result-kind="shisanputa-chance"
    >
      <div className="result-body__heading">
        <h2 className="result-body__title">十三不搭チャンス</h2>
        <span
          className="result-body__summary tabular-nums"
          data-kinds={kinds}
          data-total={total}
        >
          {kinds}種 {total}枚
        </span>
      </div>
      <div className="result-body__tiles">{renderWaitTiles(available)}</div>
    </div>
  );
}

export function ShisanputaFormedBanner({
  onEnableTenho
}: ShisanputaFormedBannerProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="shisanputa-notice shisanputa-notice--formed"
      onClick={onEnableTenho}
    >
      <Ripple />
      <FocusRing />
      <span>十三不搭の形です</span>
      <span className="shisanputa-notice__chevron" aria-hidden="true">
        <SymbolIcon d={SYMBOL_CHEVRON_RIGHT} />
      </span>
    </button>
  );
}
