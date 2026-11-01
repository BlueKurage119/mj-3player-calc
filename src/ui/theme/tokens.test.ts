import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const TOKENS_CSS_PATH = path.resolve(__dirname, 'tokens.css');
const STATIC_TOKENS_CSS_PATH = path.resolve(__dirname, 'static-tokens.css');

// 設計書 2.2 の固定リスト (49 役割・kebab-case)
const EXPECTED_COLOR_ROLES = [
  'primary',
  'on-primary',
  'primary-container',
  'on-primary-container',
  'inverse-primary',
  'secondary',
  'on-secondary',
  'secondary-container',
  'on-secondary-container',
  'tertiary',
  'on-tertiary',
  'tertiary-container',
  'on-tertiary-container',
  'error',
  'on-error',
  'error-container',
  'on-error-container',
  'primary-fixed',
  'primary-fixed-dim',
  'on-primary-fixed',
  'on-primary-fixed-variant',
  'secondary-fixed',
  'secondary-fixed-dim',
  'on-secondary-fixed',
  'on-secondary-fixed-variant',
  'tertiary-fixed',
  'tertiary-fixed-dim',
  'on-tertiary-fixed',
  'on-tertiary-fixed-variant',
  'background',
  'on-background',
  'surface',
  'surface-dim',
  'surface-bright',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'on-surface',
  'surface-variant',
  'on-surface-variant',
  'inverse-surface',
  'inverse-on-surface',
  'outline',
  'outline-variant',
  'shadow',
  'scrim',
  'surface-tint'
] as const;

describe('トークン生成物の静的検査 (C1-K01〜K05)', () => {
  const tokensCss = fs.readFileSync(TOKENS_CSS_PATH, 'utf-8');

  it('C1-K01: tokens.css のセレクタは :root と :root[data-theme="dark"] の2つのみ', () => {
    // コメントを除去
    const withoutComments = tokensCss.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectorMatches = Array.from(
      withoutComments.matchAll(/([^{}]+)\{/g)
    ).map(m => m[1]?.trim());
    expect(selectorMatches).toEqual([':root', ':root[data-theme="dark"]']);
  });

  it('C1-K02: tokens.css の主要な代表値が設計書の確定値と完全一致する', () => {
    // light
    expect(tokensCss).toContain('--md-sys-color-primary: #3c6939;');
    expect(tokensCss).toContain('--md-sys-color-on-primary: #ffffff;');
    expect(tokensCss).toContain('--md-sys-color-primary-container: #bcf0b4;');
    expect(tokensCss).toContain('--md-sys-color-surface: #f7fbf1;');
    expect(tokensCss).toContain('--md-sys-color-outline: #72796f;');

    // dark
    expect(tokensCss).toContain('--md-sys-color-primary: #a1d399;');
    expect(tokensCss).toContain('--md-sys-color-on-primary: #0b390f;');
    expect(tokensCss).toContain('--md-sys-color-primary-container: #245023;');
    expect(tokensCss).toContain('--md-sys-color-surface: #10140f;');
  });

  it('C1-K03: tokens.css の両ブロックで 49 役割の変数が過不足なく順序通り存在する', () => {
    const blocks = tokensCss.split(':root[data-theme="dark"]');
    expect(blocks.length).toBe(2);
    const lightBlock = blocks[0] ?? '';
    const darkBlock = blocks[1] ?? '';

    function extractVars(block: string): string[] {
      const matches = Array.from(
        block.matchAll(/--md-sys-color-[a-z0-9-]+(?=:)/g)
      ).map(m => m[0].trim());
      return matches;
    }

    const lightVars = extractVars(lightBlock);
    const darkVars = extractVars(darkBlock);

    const expectedVars = EXPECTED_COLOR_ROLES.map(
      role => `--md-sys-color-${role}`
    );

    expect(lightVars).toEqual(expectedVars);
    expect(darkVars).toEqual(expectedVars);
    expect(lightVars.length).toBe(49);
    expect(darkVars.length).toBe(49);

    // 不要・2025専用変数が含まれていないこと
    expect(tokensCss).not.toContain('-palette-key-color');
    expect(tokensCss).not.toContain('--md-sys-color-primary-dim');
    expect(tokensCss).not.toContain('--md-sys-color-secondary-dim');
    expect(tokensCss).not.toContain('--md-sys-color-tertiary-dim');
    expect(tokensCss).not.toContain('--md-sys-color-error-dim');

    // 必須変数が含まれていること
    expect(tokensCss).toContain('--md-sys-color-surface-variant');
    expect(tokensCss).toContain('--md-sys-color-shadow');
    expect(tokensCss).toContain('--md-sys-color-scrim');
    expect(tokensCss).toContain('--md-sys-color-surface-tint');
  });

  it('C1-K04: static-tokens.css の変数数・分類・コメント・規約クラスが仕様と一致する', () => {
    const staticCss = fs.readFileSync(STATIC_TOKENS_CSS_PATH, 'utf-8');

    // 照合元のコメントがあること
    expect(staticCss).toContain(
      '/* 手書き静的トークン: 形状・モーション・タイポグラフィ・規約クラス */'
    );
    expect(staticCss).toContain('/* 出典照合元:');

    // コメントを除去した本文で変数をカウント
    const codeOnly = staticCss.replace(/\/\*[\s\S]*?\*\//g, '');

    // 形状 10 変数
    const shapeMatches = Array.from(
      new Set(codeOnly.match(/--md-sys-shape-corner-[a-z0-9-]+(?=:)/g))
    );
    expect(shapeMatches.length).toBe(10);

    // easing 10 変数 (linear 代替含む基本 10)
    const easingMatches = Array.from(
      new Set(codeOnly.match(/--md-sys-motion-easing-[a-z0-9-]+(?=:)/g))
    );
    expect(easingMatches.length).toBe(10);

    // duration 16 変数
    const durationMatches = Array.from(
      new Set(codeOnly.match(/--md-sys-motion-duration-[a-z0-9-]+(?=:)/g))
    );
    expect(durationMatches.length).toBe(16);

    // spring 12 変数 (duration 6 + easing 6)
    const springMatches = Array.from(
      new Set(codeOnly.match(/--md-sys-motion-spring-[a-z0-9-]+(?=:)/g))
    );
    expect(springMatches.length).toBe(12);

    // spring 変数は tokens.css には存在しない
    expect(tokensCss).not.toContain('--md-sys-motion-spring');

    // typeface 2 変数
    expect(codeOnly).toContain('--md-ref-typeface-brand:');
    expect(codeOnly).toContain('--md-ref-typeface-plain:');

    // typescale 80 変数 (15 役割 × 5 + emphasized label-large 5)
    const typescaleMatches = Array.from(
      new Set(codeOnly.match(/--md-sys-typescale-[a-z0-9-]+(?=:)/g))
    );
    expect(typescaleMatches.length).toBe(80);

    // 規約クラス .tabular-nums
    expect(codeOnly).toContain('.tabular-nums {');
    expect(codeOnly).toContain('font-variant-numeric: tabular-nums;');

    // body スタイル
    expect(codeOnly).toContain('body {');
    expect(codeOnly).toContain('background: var(--md-sys-color-background);');
    expect(codeOnly).toContain('color: var(--md-sys-color-on-background);');
    expect(codeOnly).toContain('font-family: var(--md-ref-typeface-plain);');
  });

  it('C1-K05: spring easing 6 変数が @supports 内で linear()、外側で cubic-bezier 代替値を持つ', () => {
    const staticCss = fs.readFileSync(STATIC_TOKENS_CSS_PATH, 'utf-8');

    const supportsBlockMatch = staticCss.match(
      /@supports\s*\(transition-timing-function:\s*linear\(0,\s*1\)\)\s*\{([\s\S]*?)\n\}/
    );
    expect(supportsBlockMatch).not.toBeNull();
    const supportsContent = supportsBlockMatch?.[1] ?? '';

    const outsideSupports = staticCss.replace(
      /@supports\s*\(transition-timing-function:\s*linear\(0,\s*1\)\)\s*\{[\s\S]*?\n\}/,
      ''
    );

    const springEasingNames = [
      '--md-sys-motion-spring-spatial-fast-easing',
      '--md-sys-motion-spring-spatial-default-easing',
      '--md-sys-motion-spring-spatial-slow-easing',
      '--md-sys-motion-spring-effects-fast-easing',
      '--md-sys-motion-spring-effects-default-easing',
      '--md-sys-motion-spring-effects-slow-easing'
    ];

    for (const name of springEasingNames) {
      // @supports 内で linear( を持つ
      expect(supportsContent).toContain(`${name}: linear(`);

      // 外側で cubic-bezier を持つ
      expect(outsideSupports).toContain(`${name}: cubic-bezier(`);
    }

    // 代替値の検証: spatial は cubic-bezier(0.2, 0, 0, 1), effects は cubic-bezier(0, 0, 0, 1)
    expect(outsideSupports).toContain(
      '--md-sys-motion-spring-spatial-fast-easing: cubic-bezier(0.2, 0, 0, 1);'
    );
    expect(outsideSupports).toContain(
      '--md-sys-motion-spring-effects-fast-easing: cubic-bezier(0, 0, 0, 1);'
    );
  });
});
