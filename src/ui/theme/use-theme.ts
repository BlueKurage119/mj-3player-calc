import { useSyncExternalStore } from 'react';
import {
  type SetPreferenceOptions,
  type ThemeController,
  initTheme
} from './apply-theme';
import type { ResolvedTheme, ThemePreference } from './theme-config';

export interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
}

export interface ThemeStore {
  subscribe(onStoreChange: () => void): () => void;
  getSnapshot(): ThemeState;
  setPreference(pref: ThemePreference, options?: SetPreferenceOptions): void;
}

export function createThemeStore(controller: ThemeController): ThemeStore {
  let cachedSnapshot: ThemeState = {
    preference: controller.getPreference(),
    resolved: controller.getResolved()
  };

  const listeners = new Set<() => void>();

  const updateSnapshot = (): void => {
    const preference = controller.getPreference();
    const resolved = controller.getResolved();
    if (
      cachedSnapshot.preference !== preference ||
      cachedSnapshot.resolved !== resolved
    ) {
      cachedSnapshot = { preference, resolved };
    }
  };

  controller.subscribe(() => {
    updateSnapshot();
    for (const listener of listeners) {
      listener();
    }
  });

  return {
    subscribe(onStoreChange: () => void): () => void {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    getSnapshot(): ThemeState {
      updateSnapshot();
      return cachedSnapshot;
    },
    setPreference(pref: ThemePreference, options?: SetPreferenceOptions): void {
      controller.setPreference(pref, options);
      updateSnapshot();
      for (const listener of listeners) {
        listener();
      }
    }
  };
}

let defaultStore: ThemeStore | null = null;

function getDefaultStore(): ThemeStore {
  if (!defaultStore) {
    defaultStore = createThemeStore(initTheme());
  }
  return defaultStore;
}

export function useTheme(): ThemeState & {
  setPreference: (
    pref: ThemePreference,
    options?: SetPreferenceOptions
  ) => void;
} {
  const store = getDefaultStore();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return {
    preference: state.preference,
    resolved: state.resolved,
    setPreference: store.setPreference
  };
}
