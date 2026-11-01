import { describe, expect, it, vi } from 'vitest';
import {
  type ThemeMediaQuery,
  type ThemeRoot,
  createThemeController
} from './apply-theme';
import { createThemeStore } from './use-theme';

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

describe('C2: useTheme のストア (createThemeStore)', () => {
  it('C2-T02a: 同じ状態で getSnapshot() を2回呼ぶと同一参照を返す', () => {
    const root = createMockRoot();
    const mockMql = new MockMediaQuery(false);
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });
    const store = createThemeStore(controller);

    const snapshot1 = store.getSnapshot();
    const snapshot2 = store.getSnapshot();

    expect(snapshot1).toBe(snapshot2);
    expect(snapshot1).toEqual({ preference: 'auto', resolved: 'light' });
  });

  it('C2-T02b: 解決値が変わらない preference 変更でもストア経由の setter ならリスナーが呼ばれ snapshot の preference が更新される', () => {
    const root = createMockRoot();
    // システムライト
    const mockMql = new MockMediaQuery(false);
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });
    const store = createThemeStore(controller);

    const listener = vi.fn();
    store.subscribe(listener);

    // auto -> light (システムがライトなので resolved は light のまま変化しない)
    expect(controller.getResolved()).toBe('light');
    store.setPreference('light');

    expect(listener).toHaveBeenCalledTimes(1);
    const snapshot = store.getSnapshot();
    expect(snapshot.preference).toBe('light');
    expect(snapshot.resolved).toBe('light');
  });

  it('C2-T02c: controller 側の解決値変化(メディア変化)でもリスナーが呼ばれる', () => {
    const root = createMockRoot();
    // 初期は light
    const mockMql = new MockMediaQuery(false);
    const { storage } = createMockStorage();

    const controller = createThemeController({
      storage,
      matchMedia: () => mockMql,
      root
    });
    const store = createThemeStore(controller);

    const listener = vi.fn();
    store.subscribe(listener);

    // OS が light -> dark に変化 (preference=auto のため resolved が light -> dark に変化)
    mockMql.setMatches(true);

    expect(listener).toHaveBeenCalledTimes(1);
    const snapshot = store.getSnapshot();
    expect(snapshot.preference).toBe('auto');
    expect(snapshot.resolved).toBe('dark');
  });
});
