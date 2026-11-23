import type React from 'react';
import './circular-progress.css';

export interface CircularProgressProps {
  /** 指定時は role="progressbar" と aria-label を付与。省略時は aria-hidden="true" */
  label?: string | undefined;
  className?: string | undefined;
}

/** 円形プログレスインジケーター(コンテナ背景なし・不確定型) */
export function CircularProgress(
  props: CircularProgressProps
): React.JSX.Element {
  const { label, className } = props;
  const rootClass = className
    ? `circular-progress ${className}`
    : 'circular-progress';

  return (
    <span
      className={rootClass}
      {...(label
        ? { role: 'progressbar', 'aria-label': label }
        : { 'aria-hidden': true })}
    >
      <svg
        className="circular-progress__svg"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
      >
        <circle className="circular-progress__track" cx={24} cy={24} r={18} />
        <circle className="circular-progress__arc" cx={24} cy={24} r={18} />
      </svg>
    </span>
  );
}
