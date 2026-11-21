import fs from 'node:fs';
import path from 'node:path';
import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  TonalPalette,
  Variant,
  argbFromHex,
  hexFromArgb
} from '@material/material-color-utilities';

import { SEED } from './theme-seed.ts';

export { SEED };
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

const EXTRA_PALETTE_CHROMA = 24.0;
const QUATERNARY_HUE_OFFSET = -60;
const QUINARY_HUE_OFFSET = -120;
const SENARY_HUE_OFFSET = -180;

const EXTRA_PALETTES = [
  {
    hueOffset: QUATERNARY_HUE_OFFSET,
    roles: [
      { role: 'quaternary', source: 'tertiary' },
      { role: 'onQuaternary', source: 'onTertiary' },
      { role: 'quaternaryContainer', source: 'tertiaryContainer' },
      { role: 'onQuaternaryContainer', source: 'onTertiaryContainer' }
    ]
  },
  {
    hueOffset: QUINARY_HUE_OFFSET,
    roles: [
      { role: 'quinary', source: 'tertiary' },
      { role: 'onQuinary', source: 'onTertiary' },
      { role: 'quinaryContainer', source: 'tertiaryContainer' },
      { role: 'onQuinaryContainer', source: 'onTertiaryContainer' }
    ]
  },
  {
    hueOffset: SENARY_HUE_OFFSET,
    roles: [
      { role: 'senary', source: 'tertiary' },
      { role: 'onSenary', source: 'onTertiary' },
      { role: 'senaryContainer', source: 'tertiaryContainer' },
      { role: 'onSenaryContainer', source: 'onTertiaryContainer' }
    ]
  }
] as const;

/**
 * グラフ線用の色(Issue #139)。ロールの本体色(ライト T40・ダーク T80)ではライトの背景で細い線が弱いため、
 * ライトは T50、ダークは T80(本体色と同値)の同じトーンパレットから取る
 */
const CHART_LIGHT_TONE = 50;
const CHART_DARK_TONE = 80;

const CHART_ROLES = [
  'chartPrimary',
  'chartTertiary',
  'chartSenary',
  'chartQuinary',
  'chartQuaternary'
] as const;

function appendChartLines(
  lines: string[],
  isDark: boolean,
  palettes: Record<(typeof CHART_ROLES)[number], TonalPalette>
): void {
  const tone = isDark ? CHART_DARK_TONE : CHART_LIGHT_TONE;
  for (const role of CHART_ROLES) {
    const hex = hexFromArgb(palettes[role].tone(tone)).toLowerCase();
    lines.push(`  --md-sys-color-${camelToKebab(role)}: ${hex};`);
  }
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}

function createExtraScheme(
  hct: Hct,
  hueOffset: number,
  isDark: boolean
): DynamicScheme {
  const hue = (hct.hue + hueOffset + 360) % 360;
  return new DynamicScheme({
    sourceColorHct: hct,
    variant: Variant.TONAL_SPOT,
    contrastLevel: CONTRAST_LEVEL,
    isDark,
    specVersion: SPEC_VERSION,
    tertiaryPalette: TonalPalette.fromHueAndChroma(hue, EXTRA_PALETTE_CHROMA)
  });
}

function appendColorRoleLines(
  lines: string[],
  scheme: DynamicScheme,
  extraSchemes: readonly {
    roles: (typeof EXTRA_PALETTES)[number]['roles'];
    scheme: DynamicScheme;
  }[]
): void {
  for (const role of COLOR_ROLES) {
    const dynamicColor = MaterialDynamicColors[role];
    const argb = dynamicColor.getArgb(scheme);
    const hex = hexFromArgb(argb).toLowerCase();
    const varName = `--md-sys-color-${camelToKebab(role)}`;
    lines.push(`  ${varName}: ${hex};`);

    if (role === 'onTertiaryContainer') {
      for (const extra of extraSchemes) {
        for (const entry of extra.roles) {
          const extraColor = MaterialDynamicColors[entry.source];
          const extraArgb = extraColor.getArgb(extra.scheme);
          const extraHex = hexFromArgb(extraArgb).toLowerCase();
          const extraVarName = `--md-sys-color-${camelToKebab(entry.role)}`;
          lines.push(`  ${extraVarName}: ${extraHex};`);
        }
      }
    }
  }
}

function chartPalettes(
  hct: Hct,
  scheme: DynamicScheme
): Record<(typeof CHART_ROLES)[number], TonalPalette> {
  const extra = (offset: number): TonalPalette =>
    TonalPalette.fromHueAndChroma(
      (hct.hue + offset + 360) % 360,
      EXTRA_PALETTE_CHROMA
    );
  return {
    chartPrimary: scheme.primaryPalette,
    chartTertiary: scheme.tertiaryPalette,
    chartSenary: extra(SENARY_HUE_OFFSET),
    chartQuinary: extra(QUINARY_HUE_OFFSET),
    chartQuaternary: extra(QUATERNARY_HUE_OFFSET)
  };
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
  const extraLightSchemes = EXTRA_PALETTES.map(palette => ({
    roles: palette.roles,
    scheme: createExtraScheme(hct, palette.hueOffset, false)
  }));
  const extraDarkSchemes = EXTRA_PALETTES.map(palette => ({
    roles: palette.roles,
    scheme: createExtraScheme(hct, palette.hueOffset, true)
  }));

  const lines: string[] = [
    '/* 生成物。編集禁止。scripts/gen-theme-tokens.ts で再生成する(npm run gen:theme) */',
    `/* seed ${SEED} / ${SCHEME_NAME} / contrast ${CONTRAST_LEVEL} / spec ${SPEC_VERSION} / @material/material-color-utilities ${LIBRARY_VERSION} */`,
    ':root {',
    '  color-scheme: light;'
  ];

  appendColorRoleLines(lines, lightScheme, extraLightSchemes);
  appendChartLines(lines, false, chartPalettes(hct, lightScheme));

  lines.push('}');
  lines.push('');
  lines.push(':root[data-theme="dark"] {');
  lines.push('  color-scheme: dark;');

  appendColorRoleLines(lines, darkScheme, extraDarkSchemes);
  appendChartLines(lines, true, chartPalettes(hct, darkScheme));

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

// Vitest からの SEED 再 export 検証時に副作用(ファイル書き込み)が走らないようにする
const VITEST_ENV = 'VITEST';
if (!process.env[VITEST_ENV]) {
  run();
}
