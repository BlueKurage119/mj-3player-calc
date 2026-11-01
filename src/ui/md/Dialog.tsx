import { useEffect, useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { MdDialog } from '@material/web/dialog/dialog.js';
import { setRef } from './ref-utils';

const REGISTERED = [MdDialog] as const;

export const __registered = REGISTERED;

export interface DialogProps {
  ref?: React.Ref<HTMLElement> | undefined;
  open: boolean;
  headline?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
  children?: React.ReactNode | undefined;
  onClose?: ((returnValue: string) => void) | undefined;
  className?: string | undefined;
}

export function Dialog(props: DialogProps): React.JSX.Element {
  const { ref, open, headline, actions, children, onClose, className } = props;
  const innerRef = useRef<MdDialog | null>(null);

  const handleRef = (el: MdDialog | null) => {
    innerRef.current = el;
    setRef(ref, el);
  };

  useLayoutEffect(() => {
    if (innerRef.current) {
      innerRef.current.open = open;
    }
  });

  useEffect(() => {
    const el = innerRef.current;
    if (!el || !onClose) {
      return;
    }

    const handleClose = () => {
      onClose(el.returnValue);
    };

    el.addEventListener('close', handleClose);
    return () => {
      el.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  return (
    <md-dialog ref={handleRef} open={open} className={className}>
      {headline ? <div slot="headline">{headline}</div> : null}
      {children ? <div slot="content">{children}</div> : null}
      {actions ? <div slot="actions">{actions}</div> : null}
    </md-dialog>
  );
}
