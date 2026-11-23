import { useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { MdCircularProgress } from '@material/web/progress/circular-progress.js';

const REGISTERED = [MdCircularProgress] as const;

export const __registered = REGISTERED;

const SHADOW_PATCH_ATTR = 'data-md-circular-progress-patch';

/**
 * md-circular-progress の shadowRoot に注入する補正スタイル。
 * - 外径を 2.5rem(仕様図 flat 40相当)、線幅を 4 相当(32px 相当に対して 12.5%)に合わせる
 * - 既定で透明のトラックに色を付ける(確定型 .track と不確定型 .progress.indeterminate::before)
 * - prefers-reduced-motion: reduce でアニメーションを止め、約30%(108deg)の円弧を静止表示する
 */
const SHADOW_PATCH_CSS = `
:host {
  --md-circular-progress-size: 2.5rem;
  --md-circular-progress-active-indicator-width: 12.5;
}
.track {
  stroke: var(--md-sys-color-secondary-container);
}
.progress.indeterminate::before {
  content: '';
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border-radius: 50%;
  border: calc(var(--_active-indicator-width) / 100 * (var(--_size) - 0.5rem))
    solid var(--md-sys-color-secondary-container);
}
@media (prefers-reduced-motion: reduce) {
  *,
  .progress.indeterminate,
  .spinner,
  .circle {
    animation: none;
  }
  .left .circle {
    transform: rotate(270deg);
  }
  .right .circle {
    transform: rotate(233deg);
  }
}
`;

export interface CircularProgressProps {
  /** 指定時は aria-label を付与。省略時は aria-hidden="true" */
  label?: string | undefined;
  className?: string | undefined;
}

function applyShadowPatch(el: MdCircularProgress): void {
  const root = el.shadowRoot;
  if (!root) {
    return;
  }
  if (root.querySelector(`style[${SHADOW_PATCH_ATTR}]`)) {
    return;
  }
  const style = document.createElement('style');
  style.setAttribute(SHADOW_PATCH_ATTR, '');
  style.textContent = SHADOW_PATCH_CSS;
  root.appendChild(style);
}

/** Material Web の md-circular-progress ラッパー(比較用・不確定型) */
export function CircularProgress(
  props: CircularProgressProps
): React.JSX.Element {
  const { label, className } = props;
  const innerRef = useRef<MdCircularProgress | null>(null);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) {
      return;
    }
    if (el.shadowRoot) {
      applyShadowPatch(el);
      return;
    }
    let cancelled = false;
    void customElements.whenDefined('md-circular-progress').then(() => {
      if (!cancelled && innerRef.current) {
        applyShadowPatch(innerRef.current);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <md-circular-progress
      ref={innerRef}
      indeterminate
      className={className}
      {...(label ? { 'aria-label': label } : { 'aria-hidden': 'true' })}
    />
  );
}
