import type React from 'react';
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
        <svg
          viewBox="0 0 24 24"
          width="1.5rem"
          height="1.5rem"
          aria-hidden="true"
        >
          <path
            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
