import { describe, expect, it } from 'vitest';
import {
  APP_SETTINGS_STORAGE_KEY,
  APP_SETTINGS_STORAGE_VERSION,
  DEFAULT_APP_SETTINGS,
  THEME_PREFERENCES,
  isThemePreference,
  loadAppSettings,
  restoreAppSettings,
  saveAppSettings,
  serializeAppSettings
} from './theme-config';

describe('テーマ設定の保存 (C1-S01〜S11)', () => {
  it('C1-S01: restoreAppSettings(null) は既定値(auto)を返す', () => {
    const actual = restoreAppSettings(null);
    expect(actual).toEqual({ theme: 'auto' });
    expect(actual).not.toBe(DEFAULT_APP_SETTINGS);
  });

  it('C1-S02: 壊れた JSON の場合は既定値(auto)を返す', () => {
    const actual = restoreAppSettings('{broken-json');
    expect(actual).toEqual({ theme: 'auto' });
  });

  it('C1-S03: 配列 "[]" の場合は既定値(auto)を返す', () => {
    const actual = restoreAppSettings('[]');
    expect(actual).toEqual({ theme: 'auto' });
  });

  it('C1-S04: バージョンが不一致 (version: 2) の場合は既定値(auto)を返す', () => {
    const raw = JSON.stringify({ version: 2, settings: { theme: 'dark' } });
    const actual = restoreAppSettings(raw);
    expect(actual).toEqual({ theme: 'auto' });
  });

  it('C1-S05: バージョンが文字列 ("1") の場合は既定値(auto)を返す', () => {
    const raw = JSON.stringify({ version: '1', settings: { theme: 'dark' } });
    const actual = restoreAppSettings(raw);
    expect(actual).toEqual({ theme: 'auto' });
  });

  it('C1-S06: 不明なテーマ値 (theme: "sepia") の場合は既定値(auto)を返す', () => {
    const raw = JSON.stringify({ version: 1, settings: { theme: 'sepia' } });
    const actual = restoreAppSettings(raw);
    expect(actual).toEqual({ theme: 'auto' });
  });

  it('C1-S07: 正当なデータ (version: 1, theme: "dark") の場合は dark を返す', () => {
    const raw = JSON.stringify({ version: 1, settings: { theme: 'dark' } });
    const actual = restoreAppSettings(raw);
    expect(actual).toEqual({ theme: 'dark' });
  });

  it('C1-S08: serialize と restore の往復が auto / light / dark すべてで完全一致する', () => {
    for (const pref of THEME_PREFERENCES) {
      expect(isThemePreference(pref)).toBe(true);
      const original = { theme: pref };
      const serialized = serializeAppSettings(original);
      const restored = restoreAppSettings(serialized);
      expect(restored).toEqual(original);
    }
    expect(isThemePreference('invalid')).toBe(false);
  });

  it('C1-S09: storage.getItem が例外を投げる場合、loadAppSettings は既定値(auto)を返す', () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error('Access denied (e.g. private browsing)');
      },
      setItem: () => {}
    };
    const actual = loadAppSettings(throwingStorage);
    expect(actual).toEqual({ theme: 'auto' });
  });

  it('C1-S10: storage.setItem が例外を投げる場合、saveAppSettings は false を返す', () => {
    const throwingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      }
    };
    const actual = saveAppSettings({ theme: 'dark' }, throwingStorage);
    expect(actual).toBe(false);
  });

  it('C1-S11: 保存キーが mj3calc.settings であり mj3calc.rule に触れない', () => {
    const memory = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      }
    };

    // ルール側のキーにあらかじめ値を設定
    memory.set('mj3calc.rule', '{"version":1,"rule":{}}');

    const saveResult = saveAppSettings({ theme: 'light' }, mockStorage);
    expect(saveResult).toBe(true);

    // mj3calc.settings に正しく保存されている
    expect(memory.has(APP_SETTINGS_STORAGE_KEY)).toBe(true);
    expect(APP_SETTINGS_STORAGE_KEY).toBe('mj3calc.settings');
    expect(APP_SETTINGS_STORAGE_VERSION).toBe(1);

    // mj3calc.rule が変更されていない
    expect(memory.get('mj3calc.rule')).toBe('{"version":1,"rule":{}}');

    // 読み込み時も mj3calc.settings から取得される
    const loaded = loadAppSettings(mockStorage);
    expect(loaded).toEqual({ theme: 'light' });
  });
});
