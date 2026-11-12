import { useId, useState } from 'react';
import type React from 'react';
import { SYMBOL_EXPAND_MORE, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';
import './disclosure.css';

export interface DisclosureProps {
  /** 開閉ボタンの中身 */
  summary: React.ReactNode;
  /** 開いたときの中身 */
  children: React.ReactNode;
  /** 既定の開閉状態 (既定 false) */
  defaultOpen?: boolean | undefined;
  className?: string | undefined;
}

/** MD3 Expressive に合わせた開閉(disclosure)部品 */
export function Disclosure(props: DisclosureProps): React.JSX.Element {
  const { summary, children, defaultOpen = false, className } = props;
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  const rootClass = className ? `disclosure ${className}` : 'disclosure';

  return (
    <div className={rootClass}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        className="disclosure__summary"
        onClick={() => setOpen(prev => !prev)}
      >
        <Ripple />
        <FocusRing />
        <span className="disclosure__summary-text">{summary}</span>
        <span
          className={`disclosure__icon ${open ? 'disclosure__icon--open' : ''}`}
          aria-hidden="true"
        >
          <SymbolIcon d={SYMBOL_EXPAND_MORE} />
        </span>
      </button>
      <div id={contentId} hidden={!open} className="disclosure__content">
        {children}
      </div>
    </div>
  );
}
