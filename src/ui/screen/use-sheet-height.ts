import { useEffect, useState } from 'react';

const parseSheetHeight = (value: string): number => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (match && typeof match[1] === 'string') {
    const parsed = Number.parseFloat(match[1]);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const getSheetHeight = (): number => {
  if (typeof document === 'undefined') return 0;
  return parseSheetHeight(
    document.documentElement.style.getPropertyValue('--sheet-height')
  );
};

export function useSheetHeight(): number {
  const [sheetHeight, setSheetHeight] = useState<number>(() =>
    getSheetHeight()
  );

  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const current = getSheetHeight();
      setSheetHeight(prev => (prev !== current ? current : prev));
    };

    update();

    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(() => {
      update();
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return sheetHeight;
}
