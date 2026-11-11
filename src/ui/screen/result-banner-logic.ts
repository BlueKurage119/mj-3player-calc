import type { ResultState } from '../calc/result-state';
import { classifyResult } from '../result/classify';

export const MIN_INPUT_VISIBLE = 160;

export interface BannerVisibilityInput {
  resultState: ResultState;
  panelInView: boolean;
  viewportHeight: number;
  headerHeight: number;
  sheetHeight: number;
  bannerHeight: number;
}

export const shouldShowBanner = (input: BannerVisibilityInput): boolean => {
  const {
    resultState,
    panelInView,
    viewportHeight,
    headerHeight,
    sheetHeight,
    bannerHeight
  } = input;

  if (resultState.status !== 'ok') {
    return false;
  }

  const view = classifyResult(resultState.result);
  if (view.kind === 'none') {
    return false;
  }

  if (panelInView) {
    return false;
  }

  const remainingHeight =
    viewportHeight - headerHeight - sheetHeight - bannerHeight;
  if (remainingHeight < MIN_INPUT_VISIBLE) {
    return false;
  }

  return true;
};

export const scrollToResultPanel = (
  panel: Pick<HTMLElement, 'scrollIntoView'> | null,
  behavior: ScrollBehavior
): void => {
  if (!panel) return;
  panel.scrollIntoView({ behavior, block: 'start' });
};

export const getScrollBehavior = (): ScrollBehavior => {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 'auto';
  }
  return 'smooth';
};
