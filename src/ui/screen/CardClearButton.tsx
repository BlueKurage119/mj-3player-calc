import type React from 'react';
import { SYMBOL_CLOSE, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';

export interface CardClearButtonProps {
  'aria-label': string;
  disabled?: boolean | undefined;
  variant?: 'hand' | 'compact';
  onClear: () => void;
}

export function CardClearButton(
  props: CardClearButtonProps
): React.JSX.Element {
  const {
    'aria-label': ariaLabel,
    disabled = false,
    variant = 'compact',
    onClear
  } = props;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!disabled) {
      onClear();
    }
  };

  return (
    <div className={`card-clear-zone card-clear-zone--${variant}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        className="card-clear-button"
        onClick={handleClick}
      >
        <Ripple disabled={disabled} />
        <FocusRing />
        <SymbolIcon d={SYMBOL_CLOSE} size="1.25rem" />
      </button>
    </div>
  );
}
