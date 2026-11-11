import { describe, expect, it, vi } from 'vitest';
import type { ResultState } from '../calc/result-state';
import {
  MIN_INPUT_VISIBLE,
  type BannerVisibilityInput,
  scrollToResultPanel,
  shouldShowBanner
} from './result-banner-logic';

describe('result-banner-logic', () => {
  const okState: ResultState = {
    status: 'ok',
    result: { type: 'just-hora' }
  };

  const defaultInput: BannerVisibilityInput = {
    resultState: okState,
    panelInView: false,
    viewportHeight: 812,
    headerHeight: 64,
    sheetHeight: 0,
    bannerHeight: 56
  };

  describe('shouldShowBanner', () => {
    it('E1-6: (a) loading のときは false を返す', () => {
      expect(
        shouldShowBanner({
          ...defaultInput,
          resultState: { status: 'loading' }
        })
      ).toBe(false);
    });

    it('E1-6: (a) error のときは false を返す', () => {
      expect(
        shouldShowBanner({
          ...defaultInput,
          resultState: { status: 'error', error: new Error('fail') }
        })
      ).toBe(false);
    });

    it('E1-6: (a) ok で result が null のときは false を返す', () => {
      expect(
        shouldShowBanner({
          ...defaultInput,
          resultState: { status: 'ok', result: null }
        })
      ).toBe(false);
    });

    it('E1-6: (b) panelInView が true のときは false を返す', () => {
      expect(
        shouldShowBanner({
          ...defaultInput,
          panelInView: true
        })
      ).toBe(false);
    });

    it('E1-6: (c) viewportHeight - headerHeight - sheetHeight - bannerHeight が 159 の境界で false を返す', () => {
      // 159 = 279 - 60 - 0 - 60
      expect(
        shouldShowBanner({
          ...defaultInput,
          viewportHeight: 279,
          headerHeight: 60,
          sheetHeight: 0,
          bannerHeight: 60
        })
      ).toBe(false);
    });

    it('E1-6: (c) viewportHeight - headerHeight - sheetHeight - bannerHeight が 160 の境界で true を返す', () => {
      // 160 = 280 - 60 - 0 - 60
      expect(
        shouldShowBanner({
          ...defaultInput,
          viewportHeight: 280,
          headerHeight: 60,
          sheetHeight: 0,
          bannerHeight: 60
        })
      ).toBe(true);
    });

    it('E1-6: (d) すべての条件を満たすときは true を返す', () => {
      expect(shouldShowBanner(defaultInput)).toBe(true);
    });

    it('E1-6: MIN_INPUT_VISIBLE 定数が 160 である', () => {
      expect(MIN_INPUT_VISIBLE).toBe(160);
    });
  });

  describe('scrollToResultPanel', () => {
    it('E1-6: panel が null のとき例外を投げない', () => {
      expect(() => scrollToResultPanel(null, 'smooth')).not.toThrow();
    });

    it('E1-6: panel が渡されたとき scrollIntoView が { behavior, block: "start" } で1回呼ばれる', () => {
      const scrollIntoView = vi.fn();
      const mockPanel = { scrollIntoView };
      scrollToResultPanel(mockPanel, 'smooth');

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start'
      });
    });
  });
});
