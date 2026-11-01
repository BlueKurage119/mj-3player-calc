export type ThemePreference = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export const THEME_PREFERENCES: readonly ThemePreference[] = [
  'auto',
  'light',
  'dark'
] as const;

/** アプリ設定(ルールとは別)。v1 は theme のみ。将来の項目追加を想定した器 */
export interface AppSettings {
  theme: ThemePreference;
}

export const DEFAULT_APP_SETTINGS: Readonly<AppSettings> = Object.freeze({
  theme: 'auto'
});

export const APP_SETTINGS_STORAGE_KEY = 'mj3calc.settings';
export const APP_SETTINGS_STORAGE_VERSION = 1;
export type AppSettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function isThemePreference(v: unknown): v is ThemePreference {
  return (
    typeof v === 'string' &&
    (THEME_PREFERENCES as readonly string[]).includes(v)
  );
}

export function serializeAppSettings(s: AppSettings): string {
  return JSON.stringify({
    version: APP_SETTINGS_STORAGE_VERSION,
    settings: {
      theme: s.theme
    }
  });
}

interface StoredAppSettings {
  version?: unknown;
  settings?: unknown;
}

interface StoredSettingsPayload {
  theme?: unknown;
}

export function restoreAppSettings(raw: string | null): AppSettings {
  if (raw === null) {
    return { ...DEFAULT_APP_SETTINGS };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { ...DEFAULT_APP_SETTINGS };
    }
    const stored = parsed as StoredAppSettings;
    if (stored.version !== APP_SETTINGS_STORAGE_VERSION) {
      return { ...DEFAULT_APP_SETTINGS };
    }
    const settings = stored.settings;
    if (
      typeof settings !== 'object' ||
      settings === null ||
      Array.isArray(settings)
    ) {
      return { ...DEFAULT_APP_SETTINGS };
    }
    const themeRaw = (settings as StoredSettingsPayload).theme;
    const theme = isThemePreference(themeRaw)
      ? themeRaw
      : DEFAULT_APP_SETTINGS.theme;
    return { theme };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

function getEffectiveStorage(
  storage?: AppSettingsStorage | null
): AppSettingsStorage | null {
  if (storage !== undefined) {
    return storage;
  }
  try {
    return typeof globalThis !== 'undefined'
      ? (globalThis.localStorage ?? null)
      : null;
  } catch {
    return null;
  }
}

export function loadAppSettings(
  storage?: AppSettingsStorage | null
): AppSettings {
  try {
    const target = getEffectiveStorage(storage);
    if (!target) {
      return { ...DEFAULT_APP_SETTINGS };
    }
    const raw = target.getItem(APP_SETTINGS_STORAGE_KEY);
    return restoreAppSettings(raw);
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(
  s: AppSettings,
  storage?: AppSettingsStorage | null
): boolean {
  try {
    const target = getEffectiveStorage(storage);
    if (!target) {
      return false;
    }
    target.setItem(APP_SETTINGS_STORAGE_KEY, serializeAppSettings(s));
    return true;
  } catch {
    return false;
  }
}
