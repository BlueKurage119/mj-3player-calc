import { useEffect, useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { MdAssistChip } from '@material/web/chips/assist-chip.js';
import { MdChipSet } from '@material/web/chips/chip-set.js';
import { MdFilterChip } from '@material/web/chips/filter-chip.js';
import { setRef } from './ref-utils';

const REGISTERED = [MdChipSet, MdFilterChip, MdAssistChip] as const;

export const __registered = REGISTERED;

export function ChipSet(props: {
  ref?: React.Ref<HTMLElement> | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}): React.JSX.Element {
  const { ref, children, className } = props;
  const handleRef = (el: HTMLElement | null) => {
    setRef(ref, el);
  };
  return (
    <md-chip-set ref={handleRef} className={className}>
      {children}
    </md-chip-set>
  );
}

export interface FilterChipProps {
  ref?: React.Ref<HTMLElement> | undefined;
  label: string;
  selected: boolean;
  disabled?: boolean | undefined;
  onSelectedChange?: ((selected: boolean) => void) | undefined;
  className?: string | undefined;
}

export function FilterChip(props: FilterChipProps): React.JSX.Element {
  const { ref, label, selected, disabled, onSelectedChange, className } = props;
  const innerRef = useRef<MdFilterChip | null>(null);

  const handleRef = (el: MdFilterChip | null) => {
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

    const handleClick = () => {
      // md-filter-chip は click で自ら selected を反転するため、反転後の値を通知する
      onSelectedChange(el.selected);
    };

    el.addEventListener('click', handleClick);
    return () => {
      el.removeEventListener('click', handleClick);
    };
  }, [onSelectedChange]);

  return (
    <md-filter-chip
      ref={handleRef}
      selected={selected}
      disabled={disabled}
      className={className}
    >
      {label}
    </md-filter-chip>
  );
}

export interface AssistChipProps {
  ref?: React.Ref<HTMLElement> | undefined;
  label: string;
  disabled?: boolean | undefined;
  onClick?: React.MouseEventHandler<HTMLElement> | undefined;
  icon?: React.ReactNode | undefined;
  className?: string | undefined;
}

export function AssistChip(props: AssistChipProps): React.JSX.Element {
  const { ref, label, disabled, onClick, icon, className } = props;

  const handleRef = (el: HTMLElement | null) => {
    setRef(ref, el);
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: カスタム要素自身がキーボードによる click 発火を処理するため
    <md-assist-chip
      ref={handleRef}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {icon ? <span slot="icon">{icon}</span> : null}
      {label}
    </md-assist-chip>
  );
}
