import type React from 'react';
import { MdFilledButton } from '@material/web/button/filled-button.js';
import { MdFilledTonalButton } from '@material/web/button/filled-tonal-button.js';
import { MdOutlinedButton } from '@material/web/button/outlined-button.js';
import { MdTextButton } from '@material/web/button/text-button.js';
import { setRef } from './ref-utils';

const REGISTERED = [
  MdFilledButton,
  MdFilledTonalButton,
  MdOutlinedButton,
  MdTextButton
] as const;

export const __registered = REGISTERED;

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';

export interface ButtonProps {
  ref?: React.Ref<HTMLElement> | undefined;
  variant: ButtonVariant;
  disabled?: boolean | undefined;
  type?: 'button' | 'submit' | 'reset' | undefined;
  onClick?: React.MouseEventHandler<HTMLElement> | undefined;
  className?: string | undefined;
  children?: React.ReactNode | undefined;
}

export function Button(props: ButtonProps): React.JSX.Element {
  const {
    ref,
    variant,
    disabled,
    type = 'button',
    onClick,
    className,
    children
  } = props;

  const handleRef = (el: HTMLElement | null) => {
    setRef(ref, el);
  };

  switch (variant) {
    case 'filled':
      return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: カスタム要素自身がキーボードによる click 発火を処理するため
        <md-filled-button
          ref={handleRef}
          disabled={disabled}
          type={type}
          onClick={onClick}
          className={className}
        >
          {children}
        </md-filled-button>
      );
    case 'tonal':
      return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: カスタム要素自身がキーボードによる click 発火を処理するため
        <md-filled-tonal-button
          ref={handleRef}
          disabled={disabled}
          type={type}
          onClick={onClick}
          className={className}
        >
          {children}
        </md-filled-tonal-button>
      );
    case 'outlined':
      return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: カスタム要素自身がキーボードによる click 発火を処理するため
        <md-outlined-button
          ref={handleRef}
          disabled={disabled}
          type={type}
          onClick={onClick}
          className={className}
        >
          {children}
        </md-outlined-button>
      );
    case 'text':
      return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: カスタム要素自身がキーボードによる click 発火を処理するため
        <md-text-button
          ref={handleRef}
          disabled={disabled}
          type={type}
          onClick={onClick}
          className={className}
        >
          {children}
        </md-text-button>
      );
  }
}
