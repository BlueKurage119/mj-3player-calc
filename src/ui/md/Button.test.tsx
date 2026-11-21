import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Slider } from './Slider';
import type { ButtonVariant } from './Button';

describe('D4: Button の aria-label 伝達 (#48 検収不合格2)', () => {
  const variants: ButtonVariant[] = ['filled', 'tonal', 'outlined', 'text'];
  for (const variant of variants) {
    it(`D4-BTN-${variant}: aria-label がカスタム要素の属性として出力される`, () => {
      const html = renderToStaticMarkup(
        <Button variant={variant} aria-label="手牌をクリア">
          AC
        </Button>
      );
      expect(html.includes('aria-label="手牌をクリア"')).toBe(true);
    });
  }

  it('D4-BTN-none: aria-label 未指定なら属性は出力されない', () => {
    const html = renderToStaticMarkup(<Button variant="tonal">AC</Button>);
    expect(html.includes('aria-label')).toBe(false);
  });
});

describe('Slider ラッパー (Issue 139)', () => {
  it('md-slider として min・max・step・value・aria-label を出力する', () => {
    const html = renderToStaticMarkup(
      <Slider label="巡目" min={1} max={18} step={1} value={3} labeled />
    );
    expect(html).toMatch(/^<md-slider/);
    expect(html).toContain('min="1"');
    expect(html).toContain('max="18"');
    expect(html).toContain('value="3"');
    expect(html).toContain('aria-label="巡目"');
  });

  it('バレル(index)から export されている', async () => {
    const barrel = await import('./index');
    expect(barrel.Slider).toBe(Slider);
  });
});
