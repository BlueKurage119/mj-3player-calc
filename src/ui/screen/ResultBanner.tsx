import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import type React from 'react';
import type { ResultState } from '../calc/result-state';
import { ResultGlance } from '../result/ResultGlance';
import { classifyResult } from '../result/classify';
import {
  getScrollBehavior,
  scrollToResultPanel,
  shouldShowBanner
} from './result-banner-logic';
import { useInView } from './use-in-view';
import { useSheetHeight } from './use-sheet-height';

export interface ResultBannerProps {
  resultState: ResultState;
  panelRef: RefObject<HTMLElement | null>;
  headerHeight: number;
}

export function ResultBanner(props: ResultBannerProps): React.JSX.Element {
  const { resultState, panelRef, headerHeight } = props;
  const bannerRef = useRef<HTMLButtonElement | null>(null);

  const sheetHeight = useSheetHeight();
  const panelInView = useInView(
    panelRef,
    { rootMargin: `0px 0px -${sheetHeight}px 0px` },
    true
  );

  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [bannerHeight, setBannerHeight] = useState<number>(0);

  useLayoutEffect(() => {
    const el = bannerRef.current;
    if (!el) return;

    const updateHeight = () => {
      const rect = el.getBoundingClientRect();
      setBannerHeight(Math.round(rect.height));
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const visible = shouldShowBanner({
    resultState,
    panelInView,
    viewportHeight,
    headerHeight,
    sheetHeight,
    bannerHeight
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (visible && bannerHeight > 0) {
      root.style.setProperty(
        '--result-banner-height',
        `calc(${bannerHeight}px + var(--result-banner-gap))`
      );
    } else {
      root.style.setProperty('--result-banner-height', '0px');
    }
    return () => {
      root.style.setProperty('--result-banner-height', '0px');
    };
  }, [visible, bannerHeight]);

  const view = classifyResult(
    resultState.status === 'ok' ? resultState.result : null
  );

  const isAttached = sheetHeight > 0;
  const bannerClassName = [
    'result-banner',
    isAttached ? 'result-banner--attached' : 'result-banner--bottom',
    visible ? 'result-banner--visible' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    scrollToResultPanel(panelRef.current, getScrollBehavior());
  };

  return (
    <button
      type="button"
      ref={bannerRef}
      aria-label="計算結果へ移動"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={bannerClassName}
      onClick={handleClick}
    >
      <ResultGlance view={view} />
    </button>
  );
}
