import { THEME_PREFERENCES, type ThemePreference } from './theme';

/** ギャラリーが有効かどうかを判定する (DEV 時のみ true) */
export function isGalleryEnabled(isDev: boolean): boolean {
  return isDev;
}

/** URL クエリ文字列から牌ギャラリーモード (?gallery=tiles) かどうかを判定する */
export function isTileGalleryMode(search: string): boolean {
  return new URLSearchParams(search).get('gallery') === 'tiles';
}

/** URL クエリ文字列から md ギャラリーモード (?gallery=md) かどうかを判定する */
/** URL クエリ文字列から md ギャラリーモード (?gallery=md) かどうかを判定する */
export function isMdGalleryMode(search: string): boolean {
  return new URLSearchParams(search).get('gallery') === 'md';
}

/** URL クエリ文字列からテーマの上書き値 (?theme=light|dark|auto) を読み取る */
export function readThemeOverride(search: string): ThemePreference | null {
  const themeParam = new URLSearchParams(search).get('theme');
  if (
    themeParam !== null &&
    (THEME_PREFERENCES as readonly string[]).includes(themeParam)
  ) {
    return themeParam as ThemePreference;
  }
  return null;
}
