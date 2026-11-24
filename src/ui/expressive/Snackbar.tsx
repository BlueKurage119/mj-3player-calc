import type React from 'react';
import './snackbar.css';

export interface SnackbarProps {
  open: boolean;
  message: string;
  actionLabel?: string | undefined;
  actionDisabled?: boolean | undefined;
  onAction?: (() => void) | undefined;
  className?: string | undefined;
}

/** MD3 準拠の画面下部スナックバー部品 */
export function Snackbar(props: SnackbarProps): React.JSX.Element {
  const {
    open,
    message,
    actionLabel,
    actionDisabled = false,
    onAction,
    className
  } = props;

  const hostClassName = className
    ? `snackbar-host ${className}`
    : 'snackbar-host';

  return (
    <div
      className={hostClassName}
      // biome-ignore lint/a11y/useSemanticElements: 設計書 §3.4 で指定された WAI-ARIA status パターンのため
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {open ? (
        <div className="snackbar">
          <span className="snackbar__message">{message}</span>
          {actionLabel ? (
            <button
              type="button"
              className="snackbar__action"
              disabled={actionDisabled}
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
