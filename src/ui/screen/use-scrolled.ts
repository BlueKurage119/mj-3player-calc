import { useEffect, useState } from 'react';

/** ドキュメントが最上部から下にスクロールされているか(window.scrollY > 0)を返す */
export function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.scrollY > 0 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      setScrolled(window.scrollY > 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
    };
  }, []);

  return scrolled;
}
