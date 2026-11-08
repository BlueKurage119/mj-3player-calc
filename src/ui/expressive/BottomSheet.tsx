import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { SYMBOL_CLOSE, SymbolIcon } from '../icons';
import { IconButton } from '../md';
import './bottom-sheet.css';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  'aria-label': string;
  header?: ReactNode | undefined; // ヘッダー行の左側(D3)。中身は呼び出し側が決める
  children: ReactNode; // 中身スロット(D2・D3・D5)
  className?: string | undefined;
}

const getDeepActiveElement = (): HTMLElement | null => {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) {
    el = el.shadowRoot.activeElement;
  }
  return el instanceof HTMLElement ? el : null;
};

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  const {
    open,
    onClose,
    'aria-label': ariaLabel,
    header,
    children,
    className
  } = props;

  const sheetRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef<boolean>(false);

  // 開閉時のフォーカス移動と元の要素への復元
  useLayoutEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (open && !wasOpen) {
      openerRef.current = getDeepActiveElement();
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else {
        sheetRef.current?.focus();
      }
    } else if (!open && wasOpen) {
      const target = openerRef.current;
      openerRef.current = null;
      if (target?.isConnected) {
        target.focus();
      }
    }
  }, [open]);

  // Escape キーでの閉動作
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // ResizeObserver でシート高さを測り --sheet-height に反映
  useLayoutEffect(() => {
    const root = document.documentElement;
    const sheetEl = sheetRef.current;

    if (!open || !sheetEl) {
      root.style.setProperty('--sheet-height', '0px');
      return;
    }

    const updateHeight = () => {
      const rect = sheetEl.getBoundingClientRect();
      root.style.setProperty('--sheet-height', `${Math.round(rect.height)}px`);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        root.style.setProperty('--sheet-height', '0px');
      };
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(sheetEl);

    return () => {
      observer.disconnect();
      root.style.setProperty('--sheet-height', '0px');
    };
  }, [open]);

  const rootClassName = [
    'bottom-sheet',
    open ? 'bottom-sheet--open' : '',
    className ?? ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      ref={sheetRef}
      aria-label={ariaLabel}
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      data-open={open ? 'true' : 'false'}
      className={rootClassName}
    >
      <div className="bottom-sheet__header">
        <div className="bottom-sheet__header-slot">{open ? header : null}</div>
        <IconButton
          ref={closeButtonRef}
          variant="standard"
          label="閉じる"
          onClick={onClose}
          className="bottom-sheet__close-button"
        >
          <SymbolIcon d={SYMBOL_CLOSE} />
        </IconButton>
      </div>
      <div className="bottom-sheet__content">{open ? children : null}</div>
    </section>
  );
}
