import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CircularProgress } from './index';

const css = readFileSync(
  new URL('./circular-progress.css', import.meta.url),
  'utf8'
);

describe('自作 CircularProgress (Issue #159)', () => {
  it('159-E1: label 指定時は role="progressbar" と aria-label を持ち、省略時は aria-hidden="true" になる', () => {
    const withLabel = renderToStaticMarkup(<CircularProgress label="計算中" />);
    // 意図的アサーション: SSR 出力 HTML に必要な属性・クラス・幾何属性が含まれることを個別に検証
    expect(withLabel).toContain('class="circular-progress"');
    expect(withLabel).toContain('role="progressbar"');
    expect(withLabel).toContain('aria-label="計算中"');
    expect(withLabel).toContain('class="circular-progress__svg"');
    expect(withLabel).toContain('viewBox="0 0 48 48"');
    expect(withLabel).toContain('class="circular-progress__track"');
    expect(withLabel).toContain('class="circular-progress__arc"');
    expect(withLabel).toContain('r="18"');

    const withClass = renderToStaticMarkup(
      <CircularProgress label="計算中" className="custom-class" />
    );
    // 意図的アサーション: className がルートクラスに連結されることを検証
    expect(withClass).toContain('class="circular-progress custom-class"');

    const withoutLabel = renderToStaticMarkup(<CircularProgress />);
    // 意図的アサーション: label 省略時は装飾要素として aria-hidden="true" のみ付与されることを検証
    expect(withoutLabel).toContain('aria-hidden="true"');
    expect(withoutLabel).not.toContain('role="progressbar"');
    expect(withoutLabel).not.toContain('aria-label');
  });

  it('159-E2: circular-progress.css は MD3 トークンのみを使用し、HEX・px・ms・cubic-bezier・rgb( 直書きがなく、reduced-motion に対応する', () => {
    // 意図的アサーション: CSS ソース内のトークン参照・静止基準スタイル・reduced-motion 規則を検証
    expect(css).toContain('--md-sys-color-primary');
    expect(css).toContain('--md-sys-color-secondary-container');
    // コンテナ背景は付けない(監修で削除を決定)
    expect(css).not.toContain('background-color');
    expect(css).toContain('--md-sys-motion-duration-extra-long4');
    expect(css).toContain('--md-sys-motion-easing-linear');
    expect(css).toContain('--md-sys-motion-easing-standard');
    expect(css).toContain('stroke-width: 4;');
    expect(css).toMatch(
      /\.circular-progress__arc\s*\{[^}]*stroke-dasharray:\s*33\.9 113\.1/
    );
    expect(css).toMatch(
      /\.circular-progress__track\s*\{[^}]*stroke-dasharray:\s*63\.2 113\.1/
    );
    expect(css).toContain('@keyframes circular-progress-rotate');
    expect(css).toContain('@keyframes circular-progress-arc');
    expect(css).toContain('@keyframes circular-progress-track');
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*animation:\s*none/
    );
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgb\(/);
    expect(css).not.toMatch(/[0-9]px/);
    expect(css).not.toMatch(/[0-9]ms/);
    expect(css).not.toContain('cubic-bezier');
  });
});
