import { type RefObject, useEffect, useState } from 'react';

export interface UseInViewOptions {
  rootMargin?: string;
  /** 見えている割合がこの値以上のとき「見えている」とみなす(既定: 交差していれば見えている) */
  minRatio?: number;
}

export function useInView(
  targetRef: RefObject<Element | null>,
  options?: UseInViewOptions,
  defaultInView = true
): boolean {
  const rootMargin = options?.rootMargin ?? '0px';
  const minRatio = options?.minRatio;
  const [inView, setInView] = useState<boolean>(defaultInView);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry) {
          setInView(
            minRatio === undefined
              ? entry.isIntersecting
              : entry.isIntersecting && entry.intersectionRatio >= minRatio
          );
        }
      },
      { rootMargin, threshold: minRatio === undefined ? 0 : [0, minRatio] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [targetRef, rootMargin, minRatio]);

  return inView;
}
