import { MdMenuItem } from '@material/web/menu/menu-item.js';
import { MdMenu } from '@material/web/menu/menu.js';
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef
} from 'react';
import type React from 'react';
import { setRef } from './ref-utils';

const REGISTERED = [MdMenu, MdMenuItem] as const;

export const __registered = REGISTERED;

export interface MenuProps {
  ref?: React.Ref<HTMLElement> | undefined;
  open: boolean;
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  className?: string | undefined;
}

export function Menu(props: MenuProps): React.JSX.Element {
  const { ref, open, anchor, onClose, children, className } = props;
  const innerRef = useRef<MdMenu | null>(null);

  const handleRef = (el: MdMenu | null) => {
    innerRef.current = el;
    setRef(ref, el);
  };

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.positioning = 'popover';
    el.anchorElement = anchor.current;
    el.open = open;
  });

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const handleClosing = () => {
      onClose();
    };

    el.addEventListener('closing', handleClosing);
    return () => {
      el.removeEventListener('closing', handleClosing);
    };
  }, [onClose]);

  return (
    <md-menu
      ref={handleRef}
      positioning="popover"
      open={open}
      className={className}
    >
      {children}
    </md-menu>
  );
}

export interface MenuItemProps {
  ref?: React.Ref<HTMLElement> | undefined;
  onSelect: () => void;
  disabled?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}

export function MenuItem(props: MenuItemProps): React.JSX.Element {
  const { ref, onSelect, disabled, children, className } = props;
  const innerRef = useRef<MdMenuItem | null>(null);

  const handleRef = (el: MdMenuItem | null) => {
    innerRef.current = el;
    setRef(ref, el);
  };

  useLayoutEffect(() => {
    if (innerRef.current && disabled !== undefined) {
      innerRef.current.disabled = disabled;
    }
  });

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const handleCloseMenu = (e: Event) => {
      if (disabled) return;
      const detail = (
        e as CustomEvent<{
          reason?: { kind?: string; key?: string };
        }>
      ).detail;
      const reason = detail?.reason;
      if (reason?.kind === 'keydown' && reason.key === 'Escape') {
        return;
      }
      onSelect();
    };

    el.addEventListener('close-menu', handleCloseMenu);
    return () => {
      el.removeEventListener('close-menu', handleCloseMenu);
    };
  }, [disabled, onSelect]);

  return (
    <md-menu-item ref={handleRef} disabled={disabled} className={className}>
      <div slot="headline">{children}</div>
    </md-menu-item>
  );
}
