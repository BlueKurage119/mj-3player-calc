// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrolled } from './use-scrolled';

function setScrollY(value: number): void {
  Object.defineProperty(window, 'scrollY', {
    value,
    configurable: true
  });
}

describe('useScrolled (Issue #142)', () => {
  beforeEach(() => {
    setScrollY(0);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setScrollY(0);
  });

  it('Issue142-S1: 初期 window.scrollY === 0 で false を返す', () => {
    const { result } = renderHook(() => useScrolled());
    expect(result.current).toBe(false);
  });

  it('Issue142-S2: window.scrollY を正の値に変更して scroll イベントを発火すると true に変わる', () => {
    const { result } = renderHook(() => useScrolled());
    expect(result.current).toBe(false);

    act(() => {
      setScrollY(1);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(true);

    act(() => {
      setScrollY(120);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(true);
  });

  it('Issue142-S3: window.scrollY を 0 に戻して scroll イベントを発火すると false に戻る', () => {
    const { result } = renderHook(() => useScrolled());

    act(() => {
      setScrollY(120);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(true);

    act(() => {
      setScrollY(0);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(false);
  });

  it('Issue142-S4: window.scrollY が負の値(オーバースクロール想定)のとき false のままである', () => {
    const { result } = renderHook(() => useScrolled());

    act(() => {
      setScrollY(-20);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(false);
  });

  it('Issue142-S5: マウント時点で既に window.scrollY > 0 のとき初期値から true である', () => {
    setScrollY(80);
    const { result } = renderHook(() => useScrolled());
    expect(result.current).toBe(true);
  });

  it('Issue142-S6: passive: true で scroll リスナーを登録し、アンマウント時に解除する', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useScrolled());

    const scrollAddCall = addSpy.mock.calls.find(call => call[0] === 'scroll');
    expect(scrollAddCall).toBeDefined();
    expect(scrollAddCall?.[2]).toEqual({ passive: true });

    const handler = scrollAddCall?.[1];
    unmount();

    const scrollRemoveCall = removeSpy.mock.calls.find(
      call => call[0] === 'scroll' && call[1] === handler
    );
    expect(scrollRemoveCall).toBeDefined();
  });
});
