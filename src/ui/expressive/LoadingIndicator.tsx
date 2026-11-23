import type React from 'react';
import './loading-indicator.css';

/**
 * 初期状態(0%：4葉クッキー)の SVG パス。
 * CSS d: path(...) 非対応環境および prefers-reduced-motion: reduce 時のフォールバックとして使用する。
 */
export const DEFAULT_SHAPE_PATH =
  'M 24 12.5 C 27.2 12.5 31.42 6.68 36.37 11.63 C 41.32 16.58 35.5 20.8 35.5 24 C 35.5 27.2 41.32 31.42 36.37 36.37 C 31.42 41.32 27.2 35.5 24 35.5 C 20.8 35.5 16.58 41.32 11.63 36.37 C 6.68 31.42 12.5 27.2 12.5 24 C 12.5 20.8 6.68 16.58 11.63 11.63 C 16.58 6.68 20.8 12.5 24 12.5 Z';

export interface LoadingIndicatorProps {
  /** 指定時は role="progressbar" と aria-label を付与。省略時は aria-hidden="true" */
  label?: string | undefined;
  className?: string | undefined;
}

/** MD3 Expressive の Loading Indicator (円形コンテナ背景あり・回転モーフィング) */
export function LoadingIndicator(
  props: LoadingIndicatorProps
): React.JSX.Element {
  const { label, className } = props;
  const rootClass = className
    ? `loading-indicator ${className}`
    : 'loading-indicator';

  return (
    <span
      className={rootClass}
      {...(label
        ? { role: 'progressbar', 'aria-label': label }
        : { 'aria-hidden': true })}
    >
      <svg
        className="loading-indicator__svg"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
      >
        <path className="loading-indicator__shape" d={DEFAULT_SHAPE_PATH} />
      </svg>
    </span>
  );
}
