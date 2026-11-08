import { type RefObject, useEffect, useState } from 'react';

export interface UseInViewOptions {
  rootMargin?: string;
}

export function useInView(
  targetRef: RefObject<Element | null>,
  options?: UseInViewOptions,
  defaultInView = true
): boolean {
  const rootMargin = options?.rootMargin ?? '0px';
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
          setInView(entry.isIntersecting);
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [targetRef, rootMargin]);

  return inView;
}
