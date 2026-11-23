import { describe, expect, it, vi } from 'vitest';
import {
  PRELOAD_RELOAD_COOLDOWN_MS,
  PRELOAD_RELOAD_STORAGE_KEY,
  handlePreloadError,
  installPreloadErrorRecovery,
  shouldReloadOnPreloadError
} from './preload-recovery';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => map.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      map.set(key, value);
    })
  };
}

describe('vite:preloadError 自動リロード復旧 (Issue #166)', () => {
  it('166-T1: 初回 vite:preloadError で sessionStorage へ現在時刻を保存し、preventDefault と reload が 1 回ずつ呼ばれる', () => {
    const storage = createMemoryStorage();
    const reload = vi.fn();
    const event = new Event('vite:preloadError', { cancelable: true });

    const handled = handlePreloadError(event, {
      storage,
      now: () => 1_000_000,
      reload
    });

    expect(handled).toBe(true);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(
      PRELOAD_RELOAD_STORAGE_KEY,
      '1000000'
    );
    expect(event.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('166-T2: クールダウン時間（10,000 ms）未満の再発時は reload も preventDefault も呼ばれず抑止される', () => {
    expect(PRELOAD_RELOAD_COOLDOWN_MS).toBe(10_000);
    const storage = createMemoryStorage({
      [PRELOAD_RELOAD_STORAGE_KEY]: '1000000'
    });
    const reload = vi.fn();
    const event = new Event('vite:preloadError', { cancelable: true });

    const handled = handlePreloadError(event, {
      storage,
      now: () => 1_009_999,
      reload
    });

    expect(handled).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('166-T3: クールダウン時間（10,000 ms）経過後の再発時は再度 reload される', () => {
    const storage = createMemoryStorage({
      [PRELOAD_RELOAD_STORAGE_KEY]: '1000000'
    });
    const reload = vi.fn();
    const event = new Event('vite:preloadError', { cancelable: true });

    const handled = handlePreloadError(event, {
      storage,
      now: () => 1_010_000,
      reload
    });

    expect(handled).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      PRELOAD_RELOAD_STORAGE_KEY,
      '1010000'
    );
    expect(event.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('166-T4: storage が null、または getItem / setItem が例外を送出する場合、安全側として reload しない', () => {
    const reload = vi.fn();

    expect(shouldReloadOnPreloadError({ storage: null })).toBe(false);
    const nullEvent = new Event('vite:preloadError', { cancelable: true });
    expect(
      handlePreloadError(nullEvent, {
        storage: null,
        now: () => 1_000,
        reload
      })
    ).toBe(false);
    expect(nullEvent.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();

    const getThrowStorage = {
      getItem: vi.fn(() => {
        throw new Error('SecurityError');
      }),
      setItem: vi.fn()
    };
    const getThrowEvent = new Event('vite:preloadError', { cancelable: true });
    expect(
      handlePreloadError(getThrowEvent, {
        storage: getThrowStorage,
        now: () => 1_000,
        reload
      })
    ).toBe(false);
    expect(getThrowEvent.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();

    const setThrowStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      })
    };
    const setThrowEvent = new Event('vite:preloadError', { cancelable: true });
    expect(
      handlePreloadError(setThrowEvent, {
        storage: setThrowStorage,
        now: () => 1_000,
        reload
      })
    ).toBe(false);
    expect(setThrowEvent.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('166-T5: installPreloadErrorRecovery がリスナーを登録し、返却された解除関数を呼ぶと以後のイベントに反応しない', () => {
    const target = new EventTarget();
    const storage = createMemoryStorage();
    const reload = vi.fn();
    let currentTime = 1_000;

    const uninstall = installPreloadErrorRecovery(target, {
      storage,
      now: () => currentTime,
      reload
    });

    const firstEvent = new Event('vite:preloadError', { cancelable: true });
    target.dispatchEvent(firstEvent);
    expect(firstEvent.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    uninstall();
    currentTime = 20_000;

    const secondEvent = new Event('vite:preloadError', { cancelable: true });
    target.dispatchEvent(secondEvent);
    expect(secondEvent.defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
