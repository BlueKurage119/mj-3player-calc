import { MdRadio } from '@material/web/radio/radio.js';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { setRef } from './ref-utils';

const REGISTERED = [MdRadio] as const;

export const __registered = REGISTERED;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'md-radio': {
        ref?: React.Ref<MdRadio> | undefined;
        className?: string | undefined;
        id?: string | undefined;
        name?: string | undefined;
        value?: string | undefined;
        checked?: boolean | undefined;
        disabled?: boolean | undefined;
        'aria-label'?: string | undefined;
        'aria-describedby'?: string | undefined;
      };
    }
  }
}

export interface RadioProps {
  ref?: React.Ref<HTMLElement> | undefined;
  id?: string | undefined;
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean | undefined;
  label?: string | undefined;
  describedBy?: string | undefined;
  onCheckedChange?: (() => void) | undefined;
  className?: string | undefined;
}

export function Radio(props: RadioProps): React.JSX.Element {
  const {
    ref,
    id,
    name,
    value,
    checked,
    disabled,
    label,
    describedBy,
    onCheckedChange,
    className
  } = props;
  const innerRef = useRef<MdRadio | null>(null);

  const handleRef = (el: MdRadio | null) => {
    innerRef.current = el;
    setRef(ref, el);
  };

  useLayoutEffect(() => {
    if (innerRef.current) {
      innerRef.current.checked = checked;
    }
  });

  useEffect(() => {
    const el = innerRef.current;
    if (!el || !onCheckedChange) {
      return;
    }

    // 選択済みの項目を再度押した場合は change が発火しないため、click でも通知する
    const handleChange = () => {
      if (el.checked) {
        onCheckedChange();
      }
    };
    const handleClick = () => {
      onCheckedChange();
    };

    el.addEventListener('change', handleChange);
    el.addEventListener('click', handleClick);
    return () => {
      el.removeEventListener('change', handleChange);
      el.removeEventListener('click', handleClick);
    };
  }, [onCheckedChange]);

  return (
    <md-radio
      ref={handleRef}
      id={id}
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      aria-describedby={describedBy}
      className={className}
    />
  );
}
