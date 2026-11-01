import type React from 'react';

/**
 * 親から渡された ref と内部 ref を合成するヘルパー
 */
export function setRef<T>(
  ref: React.Ref<T> | undefined,
  value: T | null
): void {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref && 'current' in ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}
