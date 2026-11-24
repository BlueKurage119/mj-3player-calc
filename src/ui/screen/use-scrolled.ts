import { useEffect, useState } from 'react';

export const HEADER_SCROLL_RANGE_PX = 32;

/** ドキュメントが最上部から下にスクロールされているか(window.scrollY > 0)を返し、0〜1の進捗を --app-header-scroll に同期する */
export function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.scrollY > 0 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastProgress: number | null = null;
    const update = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 0);
      if (typeof document !== 'undefined') {
        const progress = Math.min(
          1,
          Math.max(0, scrollY / HEADER_SCROLL_RANGE_PX)
        );
        if (progress !== lastProgress) {
          lastProgress = progress;
          document.documentElement.style.setProperty(
            '--app-header-scroll',
            String(progress)
          );
        }
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
    };
  }, []);

  return scrolled;
}
