// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CircularProgress } from './CircularProgress';

afterEach(() => {
  cleanup();
});

describe('md-circular-progress ラッパー (Issue #159)', () => {
  it('159-W1: label 指定時は aria-label と indeterminate を持ち、省略時は aria-hidden="true" になる', async () => {
    const withLabel = render(<CircularProgress label="計算中" />);
    const elWithLabel = withLabel.container.querySelector(
      'md-circular-progress'
    );
    expect(elWithLabel).not.toBeNull();
    expect(elWithLabel?.indeterminate).toBe(true);
    expect(elWithLabel?.getAttribute('aria-label')).toBe('計算中');
    expect(elWithLabel?.getAttribute('aria-hidden')).toBeNull();
    await waitFor(() => {
      const progress = elWithLabel?.shadowRoot?.querySelector('.progress');
      expect(progress?.classList.contains('indeterminate')).toBe(true);
      expect(progress?.getAttribute('role')).toBe('progressbar');
    });

    const withoutLabel = render(<CircularProgress />);
    const elWithoutLabel = withoutLabel.container.querySelector(
      'md-circular-progress'
    );
    expect(elWithoutLabel).not.toBeNull();
    expect(elWithoutLabel?.indeterminate).toBe(true);
    expect(elWithoutLabel?.getAttribute('aria-hidden')).toBe('true');
    expect(elWithoutLabel?.getAttribute('aria-label')).toBeNull();
  });

  it('159-W2: マウント後に shadowRoot へトラック色と reduced-motion の style が注入される', async () => {
    const view = render(<CircularProgress label="計算中" />);
    const el = view.container.querySelector('md-circular-progress');
    expect(el).not.toBeNull();

    await waitFor(() => {
      const style = el?.shadowRoot?.querySelector(
        'style[data-md-circular-progress-patch]'
      );
      expect(style).not.toBeNull();
      const css = style?.textContent ?? '';
      // 意図的アサーション: 注入した style 内にトラック色指定と reduced-motion 指定が含まれることを検証
      expect(css).toContain('.track');
      expect(css).toContain('var(--md-sys-color-secondary-container)');
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
      expect(css).toContain('animation: none');
    });
  });

  it('159-W3: バレル(index)から export されている', async () => {
    const barrel = await import('./index');
    expect(barrel.CircularProgress).toBe(CircularProgress);
  });
});
