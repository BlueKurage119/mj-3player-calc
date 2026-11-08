import { useRef } from 'react';
import type React from 'react';
import { FocusRing, Ripple } from '../md';
import {
  type ConnectedOption,
  nextIndex,
  tabStopIndex
} from './connected-logic';
import { SHAPE_MORPH_CLASS } from './shape-morph';
import './connected-button-group.css';

export interface ConnectedButtonGroupProps<T extends string> {
  label: string;
  options: readonly ConnectedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string | undefined;
}

export function ConnectedButtonGroup<T extends string>(
  props: ConnectedButtonGroupProps<T>
): React.JSX.Element {
  const { label, options, value, onValueChange, className } = props;
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const containerClassName = className
    ? `connected-button-group ${className}`
    : 'connected-button-group';

  const tabStop = tabStopIndex(options, value);

  return (
    <div role="radiogroup" aria-label={label} className={containerClassName}>
      {options.map((opt, index) => {
        const isSelected = opt.value === value;
        return (
          <button
            // biome-ignore lint/a11y/useSemanticElements: 設計書で指定された WAI-ARIA radio パターンの button 実装のため
            type="button"
            role="radio"
            key={opt.value}
            ref={el => {
              buttonRefs.current[index] = el;
            }}
            aria-checked={isSelected}
            aria-label={opt.icon ? opt.label : undefined}
            tabIndex={index === tabStop ? 0 : -1}
            disabled={opt.disabled}
            className={`connected-button ${SHAPE_MORPH_CLASS}`}
            onClick={() => {
              if (!opt.disabled) {
                onValueChange(opt.value);
              }
            }}
            onKeyDown={e => {
              const next = nextIndex(options, index, e.key);
              if (next !== index) {
                e.preventDefault();
                const nextOpt = options[next];
                if (nextOpt && !nextOpt.disabled) {
                  onValueChange(nextOpt.value);
                  buttonRefs.current[next]?.focus();
                }
              }
            }}
          >
            <Ripple disabled={opt.disabled} />
            <FocusRing />
            {opt.icon ? (
              <span aria-hidden="true" className="connected-button__icon">
                {opt.icon}
              </span>
            ) : (
              <span>{opt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
