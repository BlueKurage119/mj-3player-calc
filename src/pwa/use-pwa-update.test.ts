// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegisterSWOptions } from 'virtual:pwa-register/react';
import {
  ACTIVATION_WAIT_TIMEOUT_MS,
  UPDATE_CHECK_MIN_INTERVAL_MS,
  attachVisibilityUpdateCheck,
  usePwaUpdate
} from './use-pwa-update';

const { mockUseRegisterSW } = vi.hoisted(() => ({
  mockUseRegisterSW: vi.fn()
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: mockUseRegisterSW
}));

function createMockDocument(
  initialVisibility: DocumentVisibilityState = 'hidden'
) {
  const target = new EventTarget();
  let state: DocumentVisibilityState = initialVisibility;
  return {
    get visibilityState() {
      return state;
    },
    setVisibilityState(next: DocumentVisibilityState) {
      state = next;
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchVisibilityChange(next: DocumentVisibilityState) {
      state = next;
      target.dispatchEvent(new Event('visibilitychange'));
    }
  };
}

describe('SW 登録・更新検知フック (Issue #166)', () => {
  const originalLocation = window.location;
  const originalServiceWorker = navigator.serviceWorker;

  beforeEach(() => {
    mockUseRegisterSW.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true
    });
  });

  it('166-T6: attachVisibilityUpdateCheck は装着後 60,000 ms 以上経過後の visible 復帰時のみ update() を呼び、最小間隔内・hidden・オフライン時は呼ばず、reject を握り潰し、解除関数で外れる', async () => {
    expect(UPDATE_CHECK_MIN_INTERVAL_MS).toBe(60_000);

    const doc = createMockDocument('hidden');
    const mockReg = {} as ServiceWorkerRegistration;
    const update = vi.fn(() => Promise.resolve(mockReg));
    let currentNow = 100_000;
    let online = true;

    const detach = attachVisibilityUpdateCheck({
      registration: { update },
      doc,
      isOnline: () => online,
      now: () => currentNow
    });

    // 装着直後（60,000 ms 未満）の visible 復帰では呼ばれない
    currentNow = 159_999;
    doc.dispatchVisibilityChange('visible');
    expect(update).not.toHaveBeenCalled();

    // 60,000 ms 経過後の visible 復帰で呼ばれる
    currentNow = 160_000;
    doc.dispatchVisibilityChange('visible');
    expect(update).toHaveBeenCalledTimes(1);

    // 最小間隔内の連続復帰では呼ばれない
    currentNow = 219_999;
    doc.dispatchVisibilityChange('hidden');
    doc.dispatchVisibilityChange('visible');
    expect(update).toHaveBeenCalledTimes(1);

    // hidden 遷移では 60,000 ms 以上経過していても呼ばれない
    currentNow = 250_000;
    doc.dispatchVisibilityChange('hidden');
    expect(update).toHaveBeenCalledTimes(1);

    // オフライン時の visible 復帰では呼ばれない
    online = false;
    doc.dispatchVisibilityChange('visible');
    expect(update).toHaveBeenCalledTimes(1);

    // オンライン復帰後、update() が reject しても未処理拒否にならない
    online = true;
    update.mockImplementationOnce(() =>
      Promise.reject(new Error('network error'))
    );
    currentNow = 320_000;
    doc.dispatchVisibilityChange('visible');
    expect(update).toHaveBeenCalledTimes(2);
    await Promise.resolve();

    // 解除後はイベントに反応しない
    detach();
    currentNow = 400_000;
    doc.dispatchVisibilityChange('visible');
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('166-T7: usePwaUpdate が needRefresh・applyUpdate（updating 遷移、失敗時復帰、未制御タブ時リロード）を正しく制御する', async () => {
    let resolveUpdate!: () => void;
    let capturedOptions: RegisterSWOptions | undefined;
    const updateServiceWorker = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveUpdate = resolve;
        })
    );

    mockUseRegisterSW.mockImplementation((options?: RegisterSWOptions) => {
      capturedOptions = options;
      return {
        needRefresh: [true, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker
      };
    });

    // 制御下タブ（controller !== null）の場合はフォールバック reload を呼ばない
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadSpy },
      configurable: true
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: {} },
      configurable: true
    });

    const { result, unmount } = renderHook(() => usePwaUpdate());
    expect(result.current.needRefresh).toBe(true);
    expect(result.current.updating).toBe(false);

    // onRegisteredSW 経由で登録された registration に visibilitychange 監視が付くことを確認
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const regUpdate = vi.fn(() =>
      Promise.resolve({} as ServiceWorkerRegistration)
    );
    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', {
        update: regUpdate
      } as unknown as ServiceWorkerRegistration);
    });
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    });
    nowSpy.mockReturnValue(1_060_000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(regUpdate).toHaveBeenCalledTimes(1);

    let updatePromise!: Promise<void>;
    act(() => {
      updatePromise = result.current.applyUpdate();
    });
    expect(result.current.updating).toBe(true);
    expect(updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);

    // updating 中の二重押下は無視される
    act(() => {
      void result.current.applyUpdate();
    });
    expect(updateServiceWorker).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate();
      await updatePromise;
    });
    expect(reloadSpy).not.toHaveBeenCalled();
    unmount();
    nowSpy.mockReturnValue(1_200_000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(regUpdate).toHaveBeenCalledTimes(1);

    // 失敗時は updating が false に戻る
    const failingUpdate = vi.fn(() =>
      Promise.reject(new Error('skipWaiting failed'))
    );
    mockUseRegisterSW.mockImplementation(() => ({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: failingUpdate
    }));

    const failedHook = renderHook(() => usePwaUpdate());
    await act(async () => {
      await failedHook.result.current.applyUpdate();
    });
    expect(failedHook.result.current.updating).toBe(false);
    failedHook.unmount();

    // 未制御タブ（navigator.serviceWorker.controller === null）ではフォールバック reload が呼ばれる
    const uncontrolledUpdate = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: null },
      configurable: true
    });
    mockUseRegisterSW.mockImplementation(() => ({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: uncontrolledUpdate
    }));

    const uncontrolledHook = renderHook(() => usePwaUpdate());
    await act(async () => {
      await uncontrolledHook.result.current.applyUpdate();
    });
    expect(uncontrolledUpdate).toHaveBeenCalledWith(true);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    uncontrolledHook.unmount();
  });

  it('166-T7b: 未制御タブで waiting 中の SW がある場合、activated 遷移を待ってから reload() を呼ぶ', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadSpy },
      configurable: true
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: null },
      configurable: true
    });

    const workerTarget = new EventTarget();
    let workerState: ServiceWorkerState = 'installed';
    const removeListenerSpy = vi.spyOn(workerTarget, 'removeEventListener');
    const mockWaitingWorker = {
      get state() {
        return workerState;
      },
      addEventListener: workerTarget.addEventListener.bind(workerTarget),
      removeEventListener: workerTarget.removeEventListener.bind(workerTarget)
    } as unknown as ServiceWorker;

    let capturedOptions: RegisterSWOptions | undefined;
    mockUseRegisterSW.mockImplementation((options?: RegisterSWOptions) => {
      capturedOptions = options;
      return {
        needRefresh: [true, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: vi.fn(() => Promise.resolve())
      };
    });

    const { result, unmount } = renderHook(() => usePwaUpdate());
    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', {
        update: vi.fn(() => Promise.resolve({} as ServiceWorkerRegistration)),
        waiting: mockWaitingWorker
      } as unknown as ServiceWorkerRegistration);
    });

    let applyPromise!: Promise<void>;
    await act(async () => {
      applyPromise = result.current.applyUpdate();
      await Promise.resolve();
    });
    expect(reloadSpy).not.toHaveBeenCalled();

    // activating 段階ではまだリロードしない
    act(() => {
      workerState = 'activating';
      workerTarget.dispatchEvent(new Event('statechange'));
    });
    expect(reloadSpy).not.toHaveBeenCalled();

    // activated 遷移でリスナー解除のうえリロードする
    await act(async () => {
      workerState = 'activated';
      workerTarget.dispatchEvent(new Event('statechange'));
      await applyPromise;
    });
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('166-T7c: 未制御タブで waiting 中の SW が有効化しない場合、ACTIVATION_WAIT_TIMEOUT_MS（3,000 ms）経過後に reload() を呼ぶ', async () => {
    expect(ACTIVATION_WAIT_TIMEOUT_MS).toBe(3_000);
    vi.useFakeTimers();

    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadSpy },
      configurable: true
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: null },
      configurable: true
    });

    const workerTarget = new EventTarget();
    const removeListenerSpy = vi.spyOn(workerTarget, 'removeEventListener');
    const mockWaitingWorker = {
      state: 'installed' as ServiceWorkerState,
      addEventListener: workerTarget.addEventListener.bind(workerTarget),
      removeEventListener: workerTarget.removeEventListener.bind(workerTarget)
    } as unknown as ServiceWorker;

    let capturedOptions: RegisterSWOptions | undefined;
    mockUseRegisterSW.mockImplementation((options?: RegisterSWOptions) => {
      capturedOptions = options;
      return {
        needRefresh: [true, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: vi.fn(() => Promise.resolve())
      };
    });

    const { result, unmount } = renderHook(() => usePwaUpdate());
    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', {
        update: vi.fn(() => Promise.resolve({} as ServiceWorkerRegistration)),
        waiting: mockWaitingWorker
      } as unknown as ServiceWorkerRegistration);
    });

    let applyPromise!: Promise<void>;
    await act(async () => {
      applyPromise = result.current.applyUpdate();
      await Promise.resolve();
    });
    expect(reloadSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_999);
    });
    expect(reloadSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await applyPromise;
    });
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
    unmount();
  });
});
