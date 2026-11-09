import type React from 'react';
import { SYMBOL_DISABLED_BY_DEFAULT, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';

export interface CardClearButtonProps {
  'aria-label': string;
  disabled?: boolean | undefined;
  onClear: () => void;
}

export function CardClearButton(
  props: CardClearButtonProps
): React.JSX.Element {
  const { 'aria-label': ariaLabel, disabled = false, onClear } = props;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!disabled) {
      onClear();
    }
  };

  return (
    <div className="card-clear-zone hand-card__clear-zone">
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        className="card-clear-button hand-card__clear-button"
        onClick={handleClick}
      >
        <Ripple disabled={disabled} />
        <FocusRing />
        <SymbolIcon d={SYMBOL_DISABLED_BY_DEFAULT} size="1.25rem" />
      </button>
    </div>
  );
}
