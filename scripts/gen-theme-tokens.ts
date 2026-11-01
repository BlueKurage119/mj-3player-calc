import fs from 'node:fs';
import path from 'node:path';
import {
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  argbFromHex,
  hexFromArgb
} from '@material/material-color-utilities';

export const SEED = '#1B5E20';
export const SCHEME_NAME = 'SchemeTonalSpot';
export const CONTRAST_LEVEL = 0;
export const SPEC_VERSION = '2021';
export const LIBRARY_VERSION = '0.4.0';

export const COLOR_ROLES = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'primaryFixed',
  'primaryFixedDim',
  'onPrimaryFixed',
  'onPrimaryFixedVariant',
  'secondaryFixed',
  'secondaryFixedDim',
  'onSecondaryFixed',
  'onSecondaryFixedVariant',
  'tertiaryFixed',
  'tertiaryFixedDim',
  'onTertiaryFixed',
  'onTertiaryFixedVariant',
  'background',
  'onBackground',
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'inverseSurface',
  'inverseOnSurface',
  'outline',
  'outlineVariant',
  'shadow',
  'scrim',
  'surfaceTint'
] as const;

export type ColorRole = (typeof COLOR_ROLES)[number];

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}

export function generateTokensCss(): string {
  const hct = Hct.fromInt(argbFromHex(SEED));
  const lightScheme = new SchemeTonalSpot(
    hct,
    false,
    CONTRAST_LEVEL,
    SPEC_VERSION
  );
  const darkScheme = new SchemeTonalSpot(
    hct,
    true,
    CONTRAST_LEVEL,
    SPEC_VERSION
  );

  const lines: string[] = [
    '/* 生成物。編集禁止。scripts/gen-theme-tokens.ts で再生成する(npm run gen:theme) */',
    `/* seed ${SEED} / ${SCHEME_NAME} / contrast ${CONTRAST_LEVEL} / spec ${SPEC_VERSION} / @material/material-color-utilities ${LIBRARY_VERSION} */`,
    ':root {',
    '  color-scheme: light;'
  ];

  for (const role of COLOR_ROLES) {
    const dynamicColor = MaterialDynamicColors[role];
    const argb = dynamicColor.getArgb(lightScheme);
    const hex = hexFromArgb(argb).toLowerCase();
    const varName = `--md-sys-color-${camelToKebab(role)}`;
    lines.push(`  ${varName}: ${hex};`);
  }

  lines.push('}');
  lines.push('');
  lines.push(':root[data-theme="dark"] {');
  lines.push('  color-scheme: dark;');

  for (const role of COLOR_ROLES) {
    const dynamicColor = MaterialDynamicColors[role];
    const argb = dynamicColor.getArgb(darkScheme);
    const hex = hexFromArgb(argb).toLowerCase();
    const varName = `--md-sys-color-${camelToKebab(role)}`;
    lines.push(`  ${varName}: ${hex};`);
  }

  lines.push('}');
  lines.push(''); // 末尾改行

  return lines.join('\n');
}

function run(): void {
  const isCheck = process.argv.includes('--check');
  const outputPath = path.resolve(process.cwd(), 'src/ui/theme/tokens.css');
  const generated = generateTokensCss();

  if (isCheck) {
    if (!fs.existsSync(outputPath)) {
      console.error(`Error: ${outputPath} does not exist.`);
      process.exit(1);
    }
    const current = fs.readFileSync(outputPath, 'utf-8');
    if (current !== generated) {
      const currentLines = current.split('\n');
      const generatedLines = generated.split('\n');
      let diffLine = -1;
      const maxLen = Math.max(currentLines.length, generatedLines.length);
      for (let i = 0; i < maxLen; i++) {
        if (currentLines[i] !== generatedLines[i]) {
          diffLine = i + 1;
          console.error(
            `Difference found at line ${diffLine}:\n  current:   ${JSON.stringify(currentLines[i])}\n  generated: ${JSON.stringify(generatedLines[i])}`
          );
          break;
        }
      }
      process.exit(1);
    }
    console.log('Theme tokens are up to date.');
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, generated, 'utf-8');
  console.log(`Generated ${outputPath}`);
}

run();
