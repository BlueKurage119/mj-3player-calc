import type React from 'react';
import { MdFocusRing } from '@material/web/focus/md-focus-ring.js';
import { setRef } from './ref-utils';

const REGISTERED = [MdFocusRing] as const;

export const __registered = REGISTERED;

export interface FocusRingProps {
  ref?: React.Ref<HTMLElement> | undefined;
  inward?: boolean | undefined;
  className?: string | undefined;
}

export function FocusRing(props: FocusRingProps): React.JSX.Element {
  const { ref, inward, className } = props;
  const handleRef = (el: HTMLElement | null) => {
    setRef(ref, el);
  };

  return (
    <md-focus-ring ref={handleRef} inward={inward} className={className} />
  );
}
