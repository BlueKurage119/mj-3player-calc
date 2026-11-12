import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Disclosure } from './Disclosure';

describe('Disclosure (E2 開閉部品)', () => {
  it('E2-15: 既定で aria-expanded="false" かつ中身の領域に hidden、aria-controls が中身の id と一致する', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary={<span>見出し</span>}>
        <p>本文</p>
      </Disclosure>
    );

    // 意図的アサーション: HTML 文字列から aria 属性と hidden を検証
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('hidden=""');

    // aria-controls と中身の id の一致を検証
    const controlsMatch = html.match(/aria-controls="([^"]+)"/);
    expect(controlsMatch).not.toBeNull();
    const id = controlsMatch?.[1];
    expect(html).toContain(`id="${id}"`);
  });

  it('E2-16: defaultOpen={true} のとき aria-expanded="true" かつ hidden 属性が付かない', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary={<span>見出し</span>} defaultOpen={true}>
        <p>本文</p>
      </Disclosure>
    );

    // 意図的アサーション: 開いた状態の静的マークアップを検証
    expect(html).toContain('aria-expanded="true"');
    expect(html).not.toContain('hidden=""');
  });
});
