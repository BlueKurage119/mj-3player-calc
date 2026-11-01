import type React from 'react';
import { MdDivider } from '@material/web/divider/divider.js';
import { setRef } from './ref-utils';

const REGISTERED = [MdDivider] as const;

export const __registered = REGISTERED;

export interface DividerProps {
  ref?: React.Ref<HTMLElement> | undefined;
  inset?: boolean | undefined;
  className?: string | undefined;
}

export function Divider(props: DividerProps): React.JSX.Element {
  const { ref, inset, className } = props;
  const handleRef = (el: HTMLElement | null) => {
    setRef(ref, el);
  };

  return <md-divider ref={handleRef} inset={inset} className={className} />;
}
