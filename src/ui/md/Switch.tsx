import { useEffect, useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { MdSwitch } from '@material/web/switch/switch.js';
import { setRef } from './ref-utils';

const REGISTERED = [MdSwitch] as const;

export const __registered = REGISTERED;

export interface SwitchProps {
  ref?: React.Ref<HTMLElement> | undefined;
  selected: boolean;
  disabled?: boolean | undefined;
  label?: string | undefined;
  onSelectedChange?: ((selected: boolean) => void) | undefined;
  className?: string | undefined;
}

export function Switch(props: SwitchProps): React.JSX.Element {
  const { ref, selected, disabled, label, onSelectedChange, className } = props;
  const innerRef = useRef<MdSwitch | null>(null);

  const handleRef = (el: MdSwitch | null) => {
    innerRef.current = el;
    setRef(ref, el);
  };

  useLayoutEffect(() => {
    if (innerRef.current) {
      innerRef.current.selected = selected;
    }
  });

  useEffect(() => {
    const el = innerRef.current;
    if (!el || !onSelectedChange) {
      return;
    }

    const handleChange = () => {
      onSelectedChange(el.selected);
    };

    el.addEventListener('change', handleChange);
    return () => {
      el.removeEventListener('change', handleChange);
    };
  }, [onSelectedChange]);

  return (
    <md-switch
      ref={handleRef}
      selected={selected}
      disabled={disabled}
      aria-label={label}
      className={className}
    />
  );
}
