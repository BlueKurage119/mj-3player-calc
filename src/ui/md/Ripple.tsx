import type React from 'react';
import { MdRipple } from '@material/web/ripple/ripple.js';
import { setRef } from './ref-utils';

const REGISTERED = [MdRipple] as const;

export const __registered = REGISTERED;

export interface RippleProps {
  ref?: React.Ref<HTMLElement> | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

export function Ripple(props: RippleProps): React.JSX.Element {
  const { ref, disabled, className } = props;
  const handleRef = (el: HTMLElement | null) => {
    setRef(ref, el);
  };

  return (
    <md-ripple ref={handleRef} disabled={disabled} className={className} />
  );
}
