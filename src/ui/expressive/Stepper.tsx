import type React from 'react';
import { SHAPE_MORPH_CLASS } from './shape-morph';
import { SYMBOL_ADD, SYMBOL_REMOVE, SymbolIcon } from '../icons';
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
        <button
          type="button"
          aria-label={`${ariaLabel}を減らす`}
          disabled={isMinusDisabled}
          className={`stepper__button ${SHAPE_MORPH_CLASS}`}
          onClick={() => {
            if (!isMinusDisabled) {
              onStep(-1);
            }
          }}
        >
          <SymbolIcon d={SYMBOL_REMOVE} size="1.25rem" />
        </button>
        <output className="stepper__value tabular-nums" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          aria-label={`${ariaLabel}を増やす`}
          disabled={isPlusDisabled}
          className={`stepper__button ${SHAPE_MORPH_CLASS}`}
          onClick={() => {
            if (!isPlusDisabled) {
              onStep(1);
            }
          }}
        >
          <SymbolIcon d={SYMBOL_ADD} size="1.25rem" />
        </button>
      </div>
    </fieldset>
  );
}
