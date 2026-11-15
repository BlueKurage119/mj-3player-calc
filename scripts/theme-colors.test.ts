import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// @material/material-color-utilities は拡張子省略 ESM のため Vitest 環境では直接解決できない。
// G1-T8 は SEED の再 export 同一性のみを検証するためモックする。
vi.mock('@material/material-color-utilities', () => ({}));

import { SEED as REEXPORTED_SEED } from './gen-theme-tokens.ts';
import { readTokenValues, resolveColorPlaceholders } from './theme-colors.ts';
import { SEED } from './theme-seed.ts';

const TOKENS_CSS_PATH = path.resolve(__dirname, '../src/ui/theme/tokens.css');

describe('テーマ色取得・プレースホルダ解決 (G1-T1, G1-T2, G1-T7, G1-T8)', () => {
  it('G1-T1: readTokenValues が tokens.css 実物からライトの4トークンを取得できる', () => {
    const tokensCss = fs.readFileSync(TOKENS_CSS_PATH, 'utf-8');
    const tokens = readTokenValues(tokensCss, 'light', [
      'surface',
      'primary-container',
      'surface-container-lowest',
      'on-primary-container'
    ]);

    expect({
      surface: tokens.surface,
      'primary-container': tokens['primary-container'],
      'surface-container-lowest': tokens['surface-container-lowest'],
      'on-primary-container': tokens['on-primary-container']
    }).toEqual({
      surface: '#f7fbf1',
      'primary-container': '#bcf0b4',
      'surface-container-lowest': '#ffffff',
      'on-primary-container': '#245023'
    });
  });

  it('G1-T2: readTokenValues が指定トークンの欠落・ブロックの欠落で例外を投げる', () => {
    const missingTokenCss = ':root { --md-sys-color-primary: #3c6939; }';
    expect(() =>
      readTokenValues(missingTokenCss, 'light', ['surface'])
    ).toThrow(/--md-sys-color-surface/);

    const missingLightBlockCss =
      ':root[data-theme="dark"] { --md-sys-color-surface: #10140f; }';
    expect(() => readTokenValues(missingLightBlockCss, 'light')).toThrow(
      /light ブロック/
    );

    const missingDarkBlockCss = ':root { --md-sys-color-surface: #f7fbf1; }';
    expect(() => readTokenValues(missingDarkBlockCss, 'dark')).toThrow(
      /dark ブロック/
    );
  });

  it('G1-T7: resolveColorPlaceholders がライト値へ置換し、未知役割名で例外を投げ、プレースホルダ無しSVGをそのまま返す', () => {
    const tokensCss = fs.readFileSync(TOKENS_CSS_PATH, 'utf-8');
    const lightTokens = readTokenValues(tokensCss, 'light');

    const svgWithPlaceholders =
      '<svg viewBox="0 0 512 512"><rect fill="var(--md-sys-color-primary-container)"/><rect fill="var(--md-sys-color-surface-container-lowest)" stroke="var(--md-sys-color-on-primary-container)"/></svg>';
    expect(resolveColorPlaceholders(svgWithPlaceholders, lightTokens)).toBe(
      '<svg viewBox="0 0 512 512"><rect fill="#bcf0b4"/><rect fill="#ffffff" stroke="#245023"/></svg>'
    );

    const svgWithUnknownRole =
      '<svg><rect fill="var(--md-sys-color-no-such-role)"/></svg>';
    expect(() =>
      resolveColorPlaceholders(svgWithUnknownRole, lightTokens)
    ).toThrow(/no-such-role/);

    const plainSvg = '<svg><rect fill="#123456"/></svg>';
    expect(resolveColorPlaceholders(plainSvg, lightTokens)).toBe(plainSvg);
  });

  it('G1-T8: SEED が # + 16進6桁で gen-theme-tokens.ts の再 export と同一である', () => {
    expect(SEED).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(SEED).toBe('#1B5E20');
    expect(REEXPORTED_SEED).toBe(SEED);
  });
});
