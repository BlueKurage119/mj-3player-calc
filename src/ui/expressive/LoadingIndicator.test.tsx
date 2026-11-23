import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LoadingIndicator } from './index';

const css = readFileSync(
  new URL('./loading-indicator.css', import.meta.url),
  'utf8'
);

/** SVG パス文字列からコマンド文字の並び(例: "MCCCCCCCCZ")を抽出する */
function extractPathCommands(d: string): string {
  return (d.match(/[A-Za-z]/g) ?? []).join('');
}

describe('LoadingIndicator (Issue #153)', () => {
  it('153-L1: label 指定時は role="progressbar" と aria-label を持ち、省略時は aria-hidden="true" になる', () => {
    const withLabel = renderToStaticMarkup(<LoadingIndicator label="計算中" />);
    expect(withLabel).toContain('class="loading-indicator"');
    expect(withLabel).toContain('role="progressbar"');
    expect(withLabel).toContain('aria-label="計算中"');
    expect(withLabel).toContain('class="loading-indicator__svg"');
    expect(withLabel).toContain('viewBox="0 0 48 48"');
    expect(withLabel).toContain('class="loading-indicator__shape"');

    const withoutLabel = renderToStaticMarkup(<LoadingIndicator />);
    expect(withoutLabel).toContain('aria-hidden="true"');
    expect(withoutLabel).not.toContain('role="progressbar"');
  });

  it('153-L2: loading-indicator.css は MD3 トークンのみを使用し、HEX・cubic-bezier 直書きがなく、reduced-motion に対応する', () => {
    expect(css).toContain('--md-sys-color-primary-container');
    expect(css).toContain('--md-sys-color-on-primary-container');
    expect(css).toContain('--md-sys-shape-corner-full');
    expect(css).toContain('@keyframes loading-indicator-rotate');
    expect(css).toContain('@keyframes loading-indicator-morph');
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*animation:\s*none/
    );
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toContain('cubic-bezier');
  });

  it('153-L3: モーフィング用の全シェイプパスが同一のコマンド列(M + C×8 + Z)である', () => {
    const html = renderToStaticMarkup(<LoadingIndicator />);
    const defaultD = html.match(
      /class="loading-indicator__shape"[^>]*d="([^"]+)"/
    )?.[1];
    expect(defaultD).toBeDefined();

    const keyframePaths = [
      ...css.matchAll(/d:\s*path\(\s*"([^"]+)"\s*\)/g)
    ].map(m => m[1]);
    expect(keyframePaths.length).toBe(4);

    const expectedCommands = 'MCCCCCCCCZ';
    expect(extractPathCommands(defaultD ?? '')).toBe(expectedCommands);
    for (const d of keyframePaths) {
      expect(extractPathCommands(d ?? '')).toBe(expectedCommands);
    }
    // 初期フォールバックの d と 0%/100% キーフレームが一致すること
    expect(keyframePaths[0]).toBe(defaultD);
  });
});
