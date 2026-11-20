import type React from 'react';
import { SYMBOL_CHEVRON_RIGHT, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';
import './result.css';

export interface ShisanputaFormedBannerProps {
  onEnableTenho?: (() => void) | undefined;
}

export function ShisanputaChanceCard(): React.JSX.Element {
  return <div className="shisanputa-notice">十三不搭チャンス</div>;
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
