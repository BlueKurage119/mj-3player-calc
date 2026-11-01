import { useEffect, useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { MdOutlinedSelect } from '@material/web/select/outlined-select.js';
import { MdSelectOption } from '@material/web/select/select-option.js';
import { setRef } from './ref-utils';

const REGISTERED = [MdOutlinedSelect, MdSelectOption] as const;

export const __registered = REGISTERED;

export interface SelectProps {
  ref?: React.Ref<HTMLElement> | undefined;
  label: string;
  value: string;
  disabled?: boolean | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

export function Select(props: SelectProps): React.JSX.Element {
  const { ref, label, value, disabled, onValueChange, children, className } =
    props;
  const innerRef = useRef<MdOutlinedSelect | null>(null);

  const handleRef = (el: MdOutlinedSelect | null) => {
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

    const handleChange = () => {
      onValueChange(el.value);
    };

    el.addEventListener('change', handleChange);
    return () => {
      el.removeEventListener('change', handleChange);
    };
  }, [onValueChange]);

  return (
    <md-outlined-select
      ref={handleRef}
      label={label}
      value={value}
      disabled={disabled}
      className={className}
    >
      {children}
    </md-outlined-select>
  );
}

export function SelectOption(props: {
  ref?: React.Ref<HTMLElement> | undefined;
  value: string;
  children: React.ReactNode;
  className?: string | undefined;
}): React.JSX.Element {
  const { ref, value, children, className } = props;
  const handleRef = (el: HTMLElement | null) => {
    setRef(ref, el);
  };

  return (
    <md-select-option ref={handleRef} value={value} className={className}>
      <div slot="headline">{children}</div>
    </md-select-option>
  );
}
