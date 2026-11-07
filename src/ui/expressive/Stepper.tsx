import type React from 'react';
import { IconButton } from '../md';
import './stepper.css';

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  onStep: (delta: 1 | -1) => void;
  disabled?: boolean | undefined;
  'aria-label': string; // 「積み棒」「供託」「抜き北」
  className?: string | undefined;
}

export function Stepper(props: StepperProps): React.JSX.Element {
  const {
    value,
    min,
    max,
    onStep,
    disabled = false,
    'aria-label': ariaLabel,
    className
  } = props;

  const isMinusDisabled = disabled || value <= min;
  const isPlusDisabled = disabled || value >= max;

  const rootClassName = className ? `stepper ${className}` : 'stepper';

  return (
    <fieldset
      aria-label={ariaLabel}
      className={rootClassName}
      data-disabled={disabled ? 'true' : undefined}
    >
      <span className="stepper__label" aria-hidden="true">
        {ariaLabel}
      </span>
      <div className="stepper__controls">
        <IconButton
          variant="outlined"
          label={`${ariaLabel}を減らす`}
          disabled={isMinusDisabled}
          className="stepper__button"
          onClick={() => {
            if (!isMinusDisabled) {
              onStep(-1);
            }
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="1.25rem"
            height="1.25rem"
            aria-hidden="true"
          >
            <path d="M19 13H5v-2h14v2z" fill="currentColor" />
          </svg>
        </IconButton>
        <output className="stepper__value tabular-nums" aria-live="polite">
          {value}
        </output>
        <IconButton
          variant="outlined"
          label={`${ariaLabel}を増やす`}
          disabled={isPlusDisabled}
          className="stepper__button"
          onClick={() => {
            if (!isPlusDisabled) {
              onStep(1);
            }
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="1.25rem"
            height="1.25rem"
            aria-hidden="true"
          >
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
          </svg>
        </IconButton>
      </div>
    </fieldset>
  );
}
