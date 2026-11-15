import type { ShareColors } from './share-data';

export interface StyleRuleLike {
  selectorText?: string | undefined;
  style?: { getPropertyValue(name: string): string } | undefined;
}

export interface StyleSheetLike {
  cssRules?: ArrayLike<StyleRuleLike> | undefined;
}

const COLOR_TOKENS: Record<keyof ShareColors, string> = {
  surface: '--md-sys-color-surface',
  onSurface: '--md-sys-color-on-surface',
  onSurfaceVariant: '--md-sys-color-on-surface-variant',
  surfaceContainerHighest: '--md-sys-color-surface-container-highest',
  primaryContainer: '--md-sys-color-primary-container',
  onPrimaryContainer: '--md-sys-color-on-primary-container',
  tertiaryContainer: '--md-sys-color-tertiary-container',
  onTertiaryContainer: '--md-sys-color-on-tertiary-container',
  primary: '--md-sys-color-primary',
  onPrimary: '--md-sys-color-on-primary',
  tertiary: '--md-sys-color-tertiary',
  onTertiary: '--md-sys-color-on-tertiary',
  error: '--md-sys-color-error'
};

function readFromStyle(getValue: (name: string) => string): ShareColors {
  return {
    surface: getValue(COLOR_TOKENS.surface).trim(),
    onSurface: getValue(COLOR_TOKENS.onSurface).trim(),
    onSurfaceVariant: getValue(COLOR_TOKENS.onSurfaceVariant).trim(),
    surfaceContainerHighest: getValue(
      COLOR_TOKENS.surfaceContainerHighest
    ).trim(),
    primaryContainer: getValue(COLOR_TOKENS.primaryContainer).trim(),
    onPrimaryContainer: getValue(COLOR_TOKENS.onPrimaryContainer).trim(),
    tertiaryContainer: getValue(COLOR_TOKENS.tertiaryContainer).trim(),
    onTertiaryContainer: getValue(COLOR_TOKENS.onTertiaryContainer).trim(),
    primary: getValue(COLOR_TOKENS.primary).trim(),
    onPrimary: getValue(COLOR_TOKENS.onPrimary).trim(),
    tertiary: getValue(COLOR_TOKENS.tertiary).trim(),
    onTertiary: getValue(COLOR_TOKENS.onTertiary).trim(),
    error: getValue(COLOR_TOKENS.error).trim()
  };
}

/** ライトテーマ(:root)の色トークン実値を CSSOM から取得する。見つからなければ computedStyle で代替 */
export function readLightColors(
  sheets?: ArrayLike<StyleSheetLike>
): ShareColors {
  const sheetList =
    sheets ??
    (typeof document !== 'undefined'
      ? (document.styleSheets as unknown as ArrayLike<StyleSheetLike>)
      : []);

  for (let i = 0; i < sheetList.length; i++) {
    const sheet = sheetList[i];
    if (!sheet) continue;
    let rules: ArrayLike<StyleRuleLike> | undefined;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    if (!rules) continue;
    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j];
      if (!rule || rule.selectorText !== ':root' || !rule.style) continue;
      if (rule.style.getPropertyValue(COLOR_TOKENS.surface).trim() !== '') {
        const style = rule.style;
        return readFromStyle(name => style.getPropertyValue(name));
      }
    }
  }

  const computed = getComputedStyle(document.documentElement);
  return readFromStyle(name => computed.getPropertyValue(name));
}
