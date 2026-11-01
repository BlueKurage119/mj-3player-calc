import { useRef } from 'react';
import type React from 'react';
import { FocusRing, Ripple } from '../md';
import { type SegmentedOption, nextIndex } from './segmented-logic';
import { SHAPE_MORPH_CLASS } from './shape-morph';
import './segmented-button-group.css';

export interface SegmentedButtonGroupProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string | undefined;
}

export function SegmentedButtonGroup<T extends string>(
  props: SegmentedButtonGroupProps<T>
): React.JSX.Element {
  const { label, options, value, onValueChange, className } = props;
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const containerClassName = className
    ? `segmented-button-group ${className}`
    : 'segmented-button-group';

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
            tabIndex={isSelected ? 0 : -1}
            disabled={opt.disabled}
            className={`segmented-button ${SHAPE_MORPH_CLASS}`}
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
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
