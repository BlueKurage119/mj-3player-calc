export type ThemeBlock = 'light' | 'dark';

const COLOR_VAR_PATTERN = /--md-sys-color-([a-z0-9-]+)\s*:\s*([^;]+);/g;
const PLACEHOLDER_PATTERN = /var\(\s*--md-sys-color-([^)]*)\)/g;

/**
 * tokens.css 相当のテキストから指定テーマブロックの --md-sys-color-* 値を抽出する。
 */
export function readTokenValues(
  cssText: string,
  block: ThemeBlock,
  requiredRoles?: readonly string[]
): Record<string, string> {
  const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const blockPattern =
    block === 'light'
      ? /:root\s*\{([^}]*)\}/
      : /:root\[data-theme=["']dark["']\]\s*\{([^}]*)\}/;

  const blockMatch = blockPattern.exec(withoutComments);
  if (!blockMatch || blockMatch[1] === undefined) {
    throw new Error(`tokens.css に ${block} ブロックが見つかりません。`);
  }

  const tokens: Record<string, string> = {};
  for (const match of blockMatch[1].matchAll(COLOR_VAR_PATTERN)) {
    const role = match[1];
    const value = match[2]?.trim();
    if (role && value) {
      tokens[role] = value;
    }
  }

  if (Object.keys(tokens).length === 0) {
    throw new Error(
      `tokens.css の ${block} ブロックにカラートークン定義が見つかりません。`
    );
  }

  if (requiredRoles) {
    for (const rawRole of requiredRoles) {
      const role = rawRole.replace(/^--md-sys-color-/, '');
      if (!Object.hasOwn(tokens, role)) {
        throw new Error(
          `tokens.css の ${block} ブロックに必須トークン --md-sys-color-${role} が見つかりません。`
        );
      }
    }
  }

  return tokens;
}

/**
 * SVG 内の var(--md-sys-color-<役割>) プレースホルダをトークン値に置換する。
 * 未知の役割名が含まれる場合は例外を投げる。
 */
export function resolveColorPlaceholders(
  svgText: string,
  tokens: Readonly<Record<string, string>>
): string {
  return svgText.replace(PLACEHOLDER_PATTERN, (_full, rawRole: string) => {
    const role = rawRole.trim();
    const value = Object.hasOwn(tokens, role) ? tokens[role] : undefined;
    if (value === undefined) {
      throw new Error(
        `未知のカラートークンプレースホルダです: var(--md-sys-color-${role})`
      );
    }
    return value;
  });
}
