import { describe, expect, it, vi } from 'vitest';
import {
  type ThemeMediaQuery,
  type ThemeRoot,
  createThemeController
} from './apply-theme';
import { APP_SETTINGS_STORAGE_KEY } from './theme-config';

class MockMediaQuery implements ThemeMediaQuery {
  matches: boolean;
  private listeners = new Set<(e: { matches: boolean }) => void>();

  constructor(initialMatches: boolean) {
    this.matches = initialMatches;
  }

  addEventListener(
    _type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    if (typeof listener === 'function') {
      this.listeners.add(
        listener as unknown as (e: { matches: boolean }) => void
      );
    }
  }

  removeEventListener(
    _type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    if (typeof listener === 'function') {
      this.listeners.delete(
        listener as unknown as (e: { matches: boolean }) => void
      );
    }
  }

  setMatches(matches: boolean): void {
    this.matches = matches;
    for (const listener of Array.from(this.listeners)) {
      listener({ matches });
    }
  }
}

function createMockRoot(): ThemeRoot & { dataset: { theme?: string } } {
  return { dataset: {} };
}

function createMockStorage(initialData?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(initialData ?? {}));
  return {
    map,
    storage: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, val: string) => {
        map.set(key, val);
      }
    }
  };
}

describe('テーマの適用 (C1-A01〜A08)', () => {
  it('C1-A01: auto + OS light で data-theme が light に設定される', () => {
    const root = createMockRoot();
    const mockMql = new MockMediaQuery(false);
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });

    expect(controller.getPreference()).toBe('auto');
    expect(controller.getResolved()).toBe('light');
    expect(root.dataset.theme).toBe('light');
  });

  it('C1-A02: auto + OS dark で data-theme が dark に設定される', () => {
    const root = createMockRoot();
    const mockMql = new MockMediaQuery(true);
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });

    expect(controller.getPreference()).toBe('auto');
    expect(controller.getResolved()).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
  });

  it('C1-A03: auto 中に OS が dark→light に変化すると light に変わり subscribe の listener が1回呼ばれる', () => {
    const root = createMockRoot();
    const mockMql = new MockMediaQuery(true);
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });

    expect(controller.getResolved()).toBe('dark');

    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    // OS を light に変更
    mockMql.setMatches(false);

    expect(controller.getResolved()).toBe('light');
    expect(root.dataset.theme).toBe('light');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('light');

    unsubscribe();
  });

  it('C1-A04: setPreference("dark") 後に OS 変化しても dark のまま・listener 呼ばれない', () => {
    const root = createMockRoot();
    const mockMql = new MockMediaQuery(false);
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });

    controller.setPreference('dark');
    expect(controller.getResolved()).toBe('dark');
    expect(root.dataset.theme).toBe('dark');

    const listener = vi.fn();
    controller.subscribe(listener);

    // OS を dark に変化させる (すでに fixed dark なので何も起きないはず)
    mockMql.setMatches(true);
    expect(controller.getResolved()).toBe('dark');
    expect(listener).not.toHaveBeenCalled();

    // OS を light に変化させる
    mockMql.setMatches(false);
    expect(controller.getResolved()).toBe('dark');
    expect(listener).not.toHaveBeenCalled();
  });

  it('C1-A05: setPreference("auto") に戻すと現在の OS 値で解決される', () => {
    const root = createMockRoot();
    const mockMql = new MockMediaQuery(true); // OS は dark
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });

    // 明示的に light に固定
    controller.setPreference('light');
    expect(controller.getResolved()).toBe('light');
    expect(root.dataset.theme).toBe('light');

    // auto に戻すと OS (dark) に従って dark に解決される
    controller.setPreference('auto');
    expect(controller.getPreference()).toBe('auto');
    expect(controller.getResolved()).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
  });

  it('C1-A06: setPreference で storage に保存される', () => {
    const root = createMockRoot();
    const mockMql = new MockMediaQuery(false);
    const { storage, map } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });

    controller.setPreference('dark');
    const saved = map.get(APP_SETTINGS_STORAGE_KEY);
    expect(saved).toBeDefined();
    expect(JSON.parse(saved as string)).toEqual({
      version: 1,
      settings: { theme: 'dark' }
    });
  });

  it('C1-A07: dispose 後は OS 変化に反応しない', () => {
    const root = createMockRoot();
    const mockMql = new MockMediaQuery(true);
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });

    const listener = vi.fn();
    controller.subscribe(listener);

    controller.dispose();

    // OS を変化させても反応しない
    mockMql.setMatches(false);
    expect(controller.getResolved()).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(listener).not.toHaveBeenCalled();
  });

  it('C1-A08: matchMedia: null で OS 追従なし(systemDark=false)となり light で初期化される', () => {
    const root = createMockRoot();
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: null,
      root
    });

    expect(controller.getPreference()).toBe('auto');
    expect(controller.getResolved()).toBe('light');
    expect(root.dataset.theme).toBe('light');
  });

  it('C2-T01: setPreference で persist: false を指定すると storage に保存されず、未指定なら保存される', () => {
    const root = createMockRoot();
    const mockMql = new MockMediaQuery(false);
    const { storage, map } = createMockStorage();
    const setItemSpy = vi.spyOn(storage, 'setItem');

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });

    // 初期状態は保存されない
    expect(setItemSpy).toHaveBeenCalledTimes(0);

    // persist: false で変更
    controller.setPreference('dark', { persist: false });
    expect(setItemSpy).toHaveBeenCalledTimes(0);
    expect(controller.getPreference()).toBe('dark');
    expect(controller.getResolved()).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(map.get(APP_SETTINGS_STORAGE_KEY)).toBeUndefined();

    // 通常の呼び出し(persist 未指定)では保存される
    controller.setPreference('light');
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(controller.getPreference()).toBe('light');
    expect(controller.getResolved()).toBe('light');
    expect(root.dataset.theme).toBe('light');
    const saved = map.get(APP_SETTINGS_STORAGE_KEY);
    expect(JSON.parse(saved as string)).toEqual({
      version: 1,
      settings: { theme: 'light' }
    });
  });
});
