import {
  type AppSettingsStorage,
  type ResolvedTheme,
  type ThemePreference,
  loadAppSettings,
  saveAppSettings
} from './theme-config';

export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function resolveTheme(
  pref: ThemePreference,
  systemDark: boolean
): ResolvedTheme {
  if (pref === 'light') {
    return 'light';
  }
  if (pref === 'dark') {
    return 'dark';
  }
  return systemDark ? 'dark' : 'light';
}

export type ThemeMediaQuery = Pick<
  MediaQueryList,
  'matches' | 'addEventListener' | 'removeEventListener'
>;

export type ThemeRoot = Pick<HTMLElement, 'dataset'>;

export function applyResolvedTheme(
  theme: ResolvedTheme,
  root?: ThemeRoot
): void {
  const target =
    root ??
    (typeof document !== 'undefined' && document.documentElement
      ? (document.documentElement as unknown as ThemeRoot)
      : undefined);
  if (target?.dataset) {
    target.dataset.theme = theme;
  }
}

export interface SetPreferenceOptions {
  persist?: boolean;
}

export interface ThemeController {
  getPreference(): ThemePreference;
  getResolved(): ResolvedTheme;
  setPreference(pref: ThemePreference, options?: SetPreferenceOptions): void;
  subscribe(listener: (resolved: ResolvedTheme) => void): () => void;
  dispose(): void;
}

export interface ThemeControllerDeps {
  storage?: AppSettingsStorage | null;
  matchMedia?: ((q: string) => ThemeMediaQuery) | null;
  root?: ThemeRoot;
}

export function createThemeController(
  deps?: ThemeControllerDeps
): ThemeController {
  const storage = deps?.storage;
  const root = deps?.root;

  let matchMediaFn: ((q: string) => ThemeMediaQuery) | null = null;
  if (deps && 'matchMedia' in deps) {
    matchMediaFn = deps.matchMedia ?? null;
  } else if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.matchMedia === 'function'
  ) {
    matchMediaFn = (q: string) => globalThis.matchMedia(q);
  }

  const mediaQuery: ThemeMediaQuery | null = matchMediaFn
    ? matchMediaFn(DARK_MEDIA_QUERY)
    : null;

  const initialSettings = loadAppSettings(storage);
  let preference: ThemePreference = initialSettings.theme;
  let systemDark = mediaQuery ? mediaQuery.matches : false;
  let resolved: ResolvedTheme = resolveTheme(preference, systemDark);

  applyResolvedTheme(resolved, root);

  const listeners = new Set<(resolved: ResolvedTheme) => void>();

  const onMediaChange = (
    e: MediaQueryListEvent | { matches: boolean }
  ): void => {
    systemDark = e.matches;
    if (preference === 'auto') {
      const nextResolved = resolveTheme('auto', systemDark);
      if (nextResolved !== resolved) {
        resolved = nextResolved;
        applyResolvedTheme(resolved, root);
        for (const listener of listeners) {
          listener(resolved);
        }
      }
    }
  };

  const changeListener = onMediaChange as EventListener;
  if (mediaQuery) {
    mediaQuery.addEventListener('change', changeListener);
  }

  return {
    getPreference(): ThemePreference {
      return preference;
    },
    getResolved(): ResolvedTheme {
      return resolved;
    },
    setPreference(
      newPref: ThemePreference,
      options?: SetPreferenceOptions
    ): void {
      preference = newPref;
      if (options?.persist !== false) {
        saveAppSettings({ theme: newPref }, storage);
      }

      if (mediaQuery) {
        systemDark = mediaQuery.matches;
      }
      const nextResolved = resolveTheme(newPref, systemDark);
      const changed = nextResolved !== resolved;
      resolved = nextResolved;
      applyResolvedTheme(resolved, root);

      if (changed) {
        for (const listener of listeners) {
          listener(resolved);
        }
      }
    },
    subscribe(listener: (resolved: ResolvedTheme) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', changeListener);
      }
      listeners.clear();
    }
  };
}

let singletonInstance: ThemeController | null = null;

export function initTheme(): ThemeController {
  if (!singletonInstance) {
    singletonInstance = createThemeController();
  }
  return singletonInstance;
}
