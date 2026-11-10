import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
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
