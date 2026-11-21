import { useEffect, useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { MdSlider } from '@material/web/slider/slider.js';
import { setRef } from './ref-utils';

const REGISTERED = [MdSlider] as const;

export const __registered = REGISTERED;

export interface SliderProps {
  ref?: React.Ref<HTMLElement> | undefined;
  value: number;
  min: number;
  max: number;
  step?: number | undefined;
  /** つまみを操作中に値のラベルを出す */
  labeled?: boolean | undefined;
  disabled?: boolean | undefined;
  label?: string | undefined;
  /** つまみの操作中(ドラッグ中も)に呼ばれる */
  onValueChange?: ((value: number) => void) | undefined;
  className?: string | undefined;
}

export function Slider(props: SliderProps): React.JSX.Element {
  const {
    ref,
    value,
    min,
    max,
    step = 1,
    labeled,
    disabled,
    label,
    onValueChange,
    className
  } = props;
  const innerRef = useRef<MdSlider | null>(null);

  const handleRef = (el: MdSlider | null) => {
    innerRef.current = el;
    setRef(ref, el);
  };

  useLayoutEffect(() => {
    if (innerRef.current) {
      innerRef.current.value = value;
    }
  });

  useEffect(() => {
    const el = innerRef.current;
    if (!el || !onValueChange) {
      return;
    }
    const handleInput = () => {
      onValueChange(Number(el.value));
    };
    el.addEventListener('input', handleInput);
    return () => {
      el.removeEventListener('input', handleInput);
    };
  }, [onValueChange]);

  return (
    <md-slider
      ref={handleRef}
      min={min}
      max={max}
      step={step}
      value={value}
      labeled={labeled}
      disabled={disabled}
      aria-label={label}
      className={className}
    />
  );
}
