import { useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { MdFilledIconButton } from '@material/web/iconbutton/filled-icon-button.js';
import { MdFilledTonalIconButton } from '@material/web/iconbutton/filled-tonal-icon-button.js';
import { MdIconButton } from '@material/web/iconbutton/icon-button.js';
import { MdOutlinedIconButton } from '@material/web/iconbutton/outlined-icon-button.js';
import { setRef } from './ref-utils';

const REGISTERED = [
  MdIconButton,
  MdFilledIconButton,
  MdFilledTonalIconButton,
  MdOutlinedIconButton
] as const;

export const __registered = REGISTERED;

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined';

export interface IconButtonProps {
  ref?: React.Ref<HTMLElement> | undefined;
  variant?: IconButtonVariant | undefined;
  label: string;
  toggle?: boolean | undefined;
  selected?: boolean | undefined;
  disabled?: boolean | undefined;
  onClick?: React.MouseEventHandler<HTMLElement> | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

export function IconButton(props: IconButtonProps): React.JSX.Element {
  const {
    ref,
    variant = 'standard',
    label,
    toggle,
    selected,
    disabled,
    onClick,
    className,
    children
  } = props;

  const innerRef = useRef<HTMLElement | null>(null);

  const handleRef = (el: HTMLElement | null) => {
    innerRef.current = el;
    setRef(ref, el);
  };

  useLayoutEffect(() => {
    if (innerRef.current && selected !== undefined) {
      (innerRef.current as { selected?: boolean }).selected = selected;
    }
  });

  const commonProps = {
    ref: handleRef,
    'aria-label': label,
    toggle,
    selected,
    disabled,
    onClick,
    className,
    children
  };

  switch (variant) {
    case 'standard':
      return <md-icon-button {...commonProps} />;
    case 'filled':
      return <md-filled-icon-button {...commonProps} />;
    case 'tonal':
      return <md-filled-tonal-icon-button {...commonProps} />;
    case 'outlined':
      return <md-outlined-icon-button {...commonProps} />;
  }
}
